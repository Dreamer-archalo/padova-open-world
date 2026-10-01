import * as THREE from './vendor/three.module.js';
import {angleDiff,clamp,dist,SpatialIndex,collides,nearestOnSegment} from './core.js';
import {slideMove,vehicleBlocked} from './movement.js';
import {advanceTrafficSpeed} from './traffic.js';

export const PORTELLO_SEATS=[
 {x:1213.3,z:-423,yaw:.2},{x:1193.3,z:-447,yaw:.2},{x:1260.3,z:-431,yaw:.1},
 {x:1214.7,z:-423,yaw:.2},{x:1194.7,z:-447,yaw:.2},{x:1261.7,z:-431,yaw:.1}
];

// Spawn probability is lowest inside the fast-moving camera cone. It never
// reaches zero at long range, preventing an empty road after a direction change.
export function spawnWeight(viewer,candidate,cameraYaw=viewer.yaw||0){
 const d=dist(viewer,candidate),bearing=Math.atan2(candidate.x-viewer.x,candidate.z-viewer.z),front=Math.abs(angleDiff(bearing,cameraYaw)),speed=Math.abs(viewer.speed||0),noPop=clamp(70+speed*2.4,70,240);
 if(front<.72&&d<noPop)return .035;
 if(front<1.15&&d<noPop*1.25)return .18;
 if(front>2.05)return 1.45;
 return front>1.15?1.12:.65;
}

export function socialProfile(seed,zone){
 if(zone==='university'){
  const roles=['student-group','student-walk','student-seated','student-group','student-wait','skater','musician','student-walk'];
  const role=roles[seed%roles.length];return {role,behavior:role==='student-group'?'group':role==='student-seated'||role==='musician'?'idle':role==='student-wait'?'wait':role==='skater'?'runner':'stroll'};
 }
 const roles=['walker','walker','conversation','waiting','seated','worker','dog-owner','walker','crossing','stroll'];const role=roles[seed%roles.length];
 return {role,behavior:role==='conversation'?'group':role==='waiting'?'wait':role==='seated'?'idle':role==='crossing'?'cross':role==='stroll'?'stroll':'destination'};
}

const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:1});
const cube=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,7,5);
const part=(root,geo,color,x,y,z,sx,sy,sz)=>{const mesh=new THREE.Mesh(geo,material(color));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);root.add(mesh);return mesh;};
export function createDog(seed=0){
 const root=new THREE.Group(),coat=['#765843','#b99a70','#3c3732','#d0b98e'][seed%4];root.position.set(seed%2?.62:-.62,.02,.1);
 part(root,cube,coat,0,.32,0,.34,.30,.58);part(root,sphere,coat,0,.48,.38,.27,.27,.30);part(root,cube,'#282b29',0,.48,.66,.12,.10,.12);
 for(const side of [-1,1]){part(root,cube,coat,side*.2,.14,-.18,.09,.32,.10);part(root,cube,coat,side*.2,.14,.19,.09,.32,.10);}
 const tail=part(root,cube,coat,0,.46,-.43,.08,.08,.42);tail.rotation.x=-.7;root.userData.tail=tail;
 const points=new Float32Array([0,1.08,0,root.position.x,.53,.05]),line=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(points,3)),new THREE.LineBasicMaterial({color:'#4c3d31'}));root.parentLeash=line;return root;
}
export function attachDog(person,seed=0){if(person.dog)return person.dog;const dog=createDog(seed);person.mesh.add(dog,dog.parentLeash);person.dog=dog;person.role='dog-owner';return dog;}
export function animateUrbanActor(person,time){
 if(person.dog){person.dog.position.z=.1+Math.sin(time*4+person.seed)*.12;person.dog.userData.tail.rotation.y=Math.sin(time*7+person.seed)*.7;}
 const hips=person.mesh.userData.hips;if(!hips)return;
 if(person.role==='student-seated'||person.role==='seated'){hips.rotation.x=-.3;hips.position.y=.18;for(const leg of hips.children)leg.rotation.x=-1.18;}
 else{hips.rotation.x=0;hips.position.y=0;}
 if(person.role==='musician'){person.mesh.rotation.z=Math.sin(time*3+person.seed)*.035;}
 if(person.role==='skater'){person.mesh.rotation.z=clamp(Math.sin(time*2+person.seed)*.12,-.12,.12);}
}


export const PADOVA_NPC_R17=Object.freeze({version:'padova-intelligent-npc-r17',near:125,medium:300,far:560,maxDrivers:3,maxSegments:64,maxRouteNodes:256,maxRouteSearch:256,maxRouteCaches:12});
export const PEDESTRIAN_STATES=Object.freeze(['walking','waiting-crossing','crossing','conversation','approach-bench','seated','standing','approach-bar','entering-bar','bar-seated','leaving-bar','greeting','yielding','fleeing','recovering','returning-car','boarding','riding']);
export const DRIVER_STATES=Object.freeze(['driving','search-parking','slowing','parking','parked','returning','boarding','departing']);

// Local sidewalk graphs are bounded, cached and built only when a destination
// changes. Cross-road links use the same junction/stripe geometry as signals.
export class PadovaSidewalkRoutes {
 constructor(game){this.game=game;this.cache=new Map();this.builds=0;this.lastExpansions=0;}
 clear(){this.cache.clear();}
 clearLine(a,b,crossing=false){
  const g=this.game,length=dist(a,b),steps=Math.ceil(length/2);
  if(length>190)return false;
  for(let i=0;i<=steps;i++){const t=i/Math.max(1,steps),x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=g.terrain.height(x,z);if(!g.terrain.dry(x,z,.45,y)||collides(x,z,.32,g.collision,y))return false;const r=g.walkRoad?.(x,z);if(!crossing&&r&&r.road.k!=='pedestrian')return false;}
  return true;
 }
 local(origin){
  const key=Math.floor(origin.x/100)+','+Math.floor(origin.z/100);if(this.cache.has(key))return this.cache.get(key);
  const g=this.game,nodes=[],edges=[],junctionEnds=new Map();
  const add=(p)=>{const id=nodes.length;nodes.push(p);edges.push([]);return id;};
  const link=(a,b,crossing=null)=>{if(a===b||!this.clearLine(nodes[a],nodes[b],!!crossing))return;const d=dist(nodes[a],nodes[b]);edges[a].push({id:b,d,crossing});edges[b].push({id:a,d,crossing});};
  const candidates=[...g.graph.index.near(origin.x,origin.z,155)].filter(s=>!/motorway|trunk/.test(s.road.k)&&!s.road.tunnel&&s.road.w<23).sort((a,b)=>dist(g.graph.nodes[a.a],origin)-dist(g.graph.nodes[b.a],origin)).slice(0,PADOVA_NPC_R17.maxSegments);
  for(const seg of candidates){const a=g.graph.nodes[seg.a],b=g.graph.nodes[seg.b],yaw=Math.atan2(b.x-a.x,b.z-a.z),offset=seg.road.k==='pedestrian'?Math.min(1,seg.road.w/3):seg.road.w/2+1.25;
   for(const side of [-1,1]){const ids=[];for(const [id,n] of [[seg.a,a],[seg.b,b]]){const j=g.signals?.junctions?.get(id),back=j?j.radius-1.1:Math.min(2,dist(a,b)/4),towards=n===a?1:-1,p={x:n.x+Math.sin(yaw)*back*towards+Math.cos(yaw)*offset*side,z:n.z+Math.cos(yaw)*back*towards-Math.sin(yaw)*offset*side,road:seg.road,yaw,side,junction:id};if(dist(p,origin)>230||!this.clearLine(p,p))continue;const k=add(p);ids.push(k);if(!junctionEnds.has(id))junctionEnds.set(id,[]);junctionEnds.get(id).push(k);}if(ids.length===2)link(ids[0],ids[1]);}
  }
  for(const [id,ends] of junctionEnds){const j=g.signals?.junctions?.get(id);for(let i=0;i<ends.length;i++)for(let k=i+1;k<ends.length;k++){const a=nodes[ends[i]],b=nodes[ends[k]],across=a.road===b.road&&a.side!==b.side&&a.road.k!=='pedestrian';if(dist(a,b)>28)continue;if(across&&!j)continue;link(ends[i],ends[k],across?{junction:id,yaw:a.yaw}:null);}}
  const result={nodes,edges};this.cache.set(key,result);this.builds++;while(this.cache.size>PADOVA_NPC_R17.maxRouteCaches)this.cache.delete(this.cache.keys().next().value);return result;
 }
 route(from,to){
  this.lastExpansions=0;if(this.clearLine(from,to))return [{...to}];
  const graph=this.local(from),{nodes,edges}=graph;
  const nearest=p=>nodes.map((n,id)=>({id,d:dist(n,p)})).filter(v=>v.d<65&&this.clearLine(p,nodes[v.id])).sort((a,b)=>a.d-b.d)[0]?.id;
  const start=nearest(from),end=nearest(to);if(start===undefined||end===undefined)return null;
  const open=[start],cost=new Map([[start,0]]),prev=new Map(),closed=new Set();
  while(open.length&&this.lastExpansions++<PADOVA_NPC_R17.maxRouteSearch){open.sort((a,b)=>(cost.get(a)+dist(nodes[a],nodes[end]))-(cost.get(b)+dist(nodes[b],nodes[end])));const id=open.shift();if(id===end){const path=[{...to}];let at=end;while(at!==start){const v=prev.get(at);path.unshift({...nodes[at],crossing:v.crossing});at=v.from;}path.unshift({...nodes[start]});return path;}if(closed.has(id))continue;closed.add(id);for(const e of edges[id]){const c=cost.get(id)+e.d;if(c<(cost.get(e.id)??Infinity)){cost.set(e.id,c);prev.set(e.id,{from:id,crossing:e.crossing});open.push(e.id);}}}
  return null;
 }
 destinations(p){return this.local(p).nodes.filter(n=>dist(n,p)>8&&dist(n,p)<100);}
}

// Owns state on the existing pooled people/cars. No second population or render
// loop. The controller calls these steps in its existing staggered scheduler.
export class PadovaIntelligentNPC {
 constructor(game){this.game=game;this.routes=new PadovaSidewalkRoutes(game);this.sites=[];this.siteIndex=new SpatialIndex(60);this.actors=new SpatialIndex(24);this.events=[];this.drivers=new Set();this.indexAt=-Infinity;this.greetAt=0;this.routeAt=-Infinity;this.metrics={transitions:0,driverCycles:0,routeFailures:0,poolBorrows:0,poolReturns:0,active:0,medium:0,suspended:0};}
 setSites(sites){this.sites=sites;this.siteIndex=new SpatialIndex(60);for(const site of sites)this.siteIndex.add(site,site.door?.x??site.x,site.door?.z??site.z,site.door?.x??site.x,site.door?.z??site.z);}
 emit(type,source,radius=type==='explosion'?65:30){this.events.push({type,x:source.x,z:source.z,y:source.y||0,radius,until:this.game.state.elapsed+(type==='horn'?1.6:4)});if(this.events.length>12)this.events.shift();}
 update(){const g=this.game;if(g.enabled&&!g.enabled())return;const now=g.state.elapsed;if(now<this.indexAt+.25)return;this.indexAt=now;this.events=this.events.filter(e=>e.until>now);this.actors=new SpatialIndex(24);for(const a of [...g.cars,...g.cops,g.state,...g.people])if(a===g.state||a.mesh?.visible)this.actors.add(a,a.x,a.z,a.x,a.z);for(const c of [...this.drivers])if(c===g.state.car||!g.cars.includes(c)||c.health<=0||c.destroyedUntil||c.waterSinking||!c.mesh.visible||dist(c,g.state)>PADOVA_NPC_R17.far||c.budgetSleeping)this.cancelDriver(c);this.metrics.active=0;this.metrics.medium=0;this.metrics.suspended=0;for(const p of g.people){if(!p.aiR17||p.aiR17.state==='riding'||p.budgetSleeping)continue;const d=dist(p,g.state);if(d<=PADOVA_NPC_R17.near)this.metrics.active++;else if(d<=PADOVA_NPC_R17.medium)this.metrics.medium++;else this.metrics.suspended++;}
 }
 release(p){const a=p.aiR17;if(!a)return;if(a.site){for(const seat of a.site.seats||[])if(seat.owner===p)seat.owner=null;}a.site=null;a.seat=null;p.role=p.dog?'dog-owner':'walker';}
 transition(p,state,duration=0){if(!PEDESTRIAN_STATES.includes(state))throw new Error('Unknown pedestrian state '+state);const a=p.aiR17;a.state=state;a.since=this.game.state.elapsed;a.until=a.since+duration;a.blocked=0;p.role=state==='seated'||state==='bar-seated'?'seated':p.dog?'dog-owner':'walker';this.metrics.transitions++;}
 attach(p){if(p.aiR17)return p.aiR17;p.aiR17={state:'walking',since:this.game.state.elapsed,until:0,path:[],pathIndex:0,nextPlan:this.game.state.elapsed+(p.seed%7)*.4,blocked:0,site:null,seat:null,driver:null};p.at=Infinity;return p.aiR17;}
 reset(p){if(p.aiR17?.driver)this.cancelDriver(p.aiR17.driver);this.release(p);delete p.aiR17;p.ridingR17=false;}
 plan(p,to,state='walking',site=null){const now=this.game.state.elapsed;if(now<this.routeAt+.045)return false;this.routeAt=now;const path=this.routes.route(p,to);if(!path){this.metrics.routeFailures++;return false;}const a=this.attach(p);this.release(p);a.path=path;a.pathIndex=0;a.goal={...to};a.site=site;a.nextPlan=now+4;this.transition(p,state);a.goalSince=now;return true;}
 reserve(p,site){const a=p.aiR17,seat=site.seats?.find(s=>!s.owner);if(!seat)return false;seat.owner=p;a.site=site;a.seat=seat;return true;}
 routine(p){const a=p.aiR17,now=this.game.state.elapsed;if(now<a.nextPlan)return;a.nextPlan=now+3+(p.seed%5);if(a.driver){if(this.plan(p,a.driver.aiDriverR17.foot,'returning-car'))a.driver.aiDriverR17.state='returning';return;}
  const sites=[...this.siteIndex.near(p.x,p.z,90)].filter(s=>s.seats.some(q=>!q.owner)&&dist(p,s.door||s)<95),choice=sites[(p.seed+Math.floor(now/18))%Math.max(1,sites.length)];
  if(choice&&this.plan(p,choice.door||choice,choice.kind==='bar'?'approach-bar':'approach-bench',choice)){if(!this.reserve(p,choice)){this.release(p);this.transition(p,'walking');}return;}
  const options=this.routes.destinations(p),goal=options[(p.seed+Math.floor(now/5))%Math.max(1,options.length)];if(goal)this.plan(p,goal);
 }
 hazard(p){for(const e of this.events)if(Math.abs((p.y||0)-e.y)<8&&dist(p,e)<e.radius)return e;for(const c of this.actors.near(p.x,p.z,12)){if(!c.spec||c===p.aiR17?.driver||Math.abs((c.y||0)-(p.y||0))>3)continue;const d=dist(p,c);if(c.health<=0&&d<20||c.phase3Incident&&d<12)return {type:'incident',...c};if(Math.abs(c.speed||0)>4&&d<Math.max(4,Math.min(12,Math.abs(c.speed)*.8)))return {type:'vehicle',...c};}if(this.game.state.wanted>0&&dist(p,this.game.state)<9)return {type:'threat',...this.game.state};return null;}
 move(p,target,speed,dt,crossing=false){const g=this.game,a=p.aiR17,d=dist(p,target);if(d<.38){p.speed=0;return true;}const yaw=Math.atan2(target.x-p.x,target.z-p.z);p.yaw+=angleDiff(yaw,p.yaw)*Math.min(1,dt*8);let nx=p.x+Math.sin(yaw)*Math.min(d,speed*dt),nz=p.z+Math.cos(yaw)*Math.min(d,speed*dt);
  for(const other of this.actors.near(nx,nz,5)){if(other===p||other===a.driver||Math.abs((other.y||0)-(p.y||0))>3)continue;const radius=other.spec?Math.hypot(other.spec.width,other.spec.length)/2+.5:.6;if(dist({x:nx,z:nz},other)<radius&&dist({x:nx,z:nz},other)<=dist(p,other)+.001){p.speed=0;a.blocked+=dt;return false;}}
  const r=g.walkRoad?.(nx,nz),onStreet=r&&r.road.k!=='pedestrian';if(onStreet&&!crossing){p.speed=0;a.blocked+=dt;return false;}const moved=slideMove(p,nx-p.x,nz-p.z,.32,g.collision,p.y);if(!g.terrain.dry(moved.x,moved.z,.4,p.y)){p.speed=0;a.blocked+=dt;return false;}const advance=dist(p,moved);p.x=moved.x;p.z=moved.z;p.y=g.terrain.height(p.x,p.z,p.y);p.speed=advance/Math.max(.001,dt);a.blocked=advance<.01?a.blocked+dt:0;return dist(p,target)<.38;
 }
 crossSafe(p,crossing){const g=this.game;if(g.signals&&!g.signals.allowed(crossing.junction,g.state.elapsed,crossing.yaw+Math.PI/2))return false;return ![...this.actors.near(p.x,p.z,18)].some(c=>c.spec&&Math.abs(c.speed)>1&&Math.abs((c.y||0)-(p.y||0))<3&&dist(c,p)<Math.max(8,Math.abs(c.speed)*1.5));}
 pose(p){if(!p.mesh)return;p.mesh.position.set(p.x,p.y,p.z);p.mesh.rotation.y=p.yaw;const hips=p.mesh.userData.hips;if(hips){const swing=p.speed>.1?Math.sin(this.game.state.elapsed*(p.speed>2?10:5)+p.seed)*.3:0;for(let i=0;i<hips.children.length;i++)hips.children[i].rotation.x=i?-swing:swing;}animateUrbanActor(p,this.game.state.elapsed);}
 personStep(p,dt){const g=this.game;if(g.enabled&&!g.enabled())return false;const now=g.state.elapsed;if(p.budgetSleeping||p.health<=0||p.koUntil>now){this.reset(p);return true;}if(!p.mesh.visible&&!p.ridingR17)return false;const a=this.attach(p);p.at=Infinity;const range=dist(p,g.state);if(a.state==='riding'){p.mesh.visible=false;return true;}if(range>PADOVA_NPC_R17.far){this.release(p);a.path=[];p.mesh.visible=false;delete p.aiR17;p.retryAt=p.driverPoolR17?Infinity:now+2;return true;}if(range>PADOVA_NPC_R17.medium){p.speed=0;return true;}if(range>PADOVA_NPC_R17.near){if(now<(a.mediumAt||0))return true;a.mediumAt=now+.5;dt=Math.min(.5,now-(a.mediumLast??now-.5));a.mediumLast=now;}
  let hazard=this.hazard(p);if(hazard?.type==='horn'){if(now>(a.heardUntil||0)){a.heardUntil=now+3;p.yaw=Math.atan2(hazard.x-p.x,hazard.z-p.z);if(!['seated','bar-seated','fleeing'].includes(a.state))this.transition(p,'yielding',.7);}hazard=null;}if(hazard&&!['fleeing','recovering'].includes(a.state)){this.release(p);a.resumeGoal=a.goal;a.resumeState=a.driver?'returning-car':'walking';a.path=[];a.danger=hazard;this.transition(p,'fleeing',4);}
  if(a.state==='fleeing'){if(hazard){a.danger=hazard;a.until=now+3;}const d=a.danger,dx=p.x-d.x,dz=p.z-d.z,l=Math.hypot(dx,dz)||1;this.move(p,{x:p.x+dx/l*6,z:p.z+dz/l*6},3.6,dt,false);if(now>a.until)this.transition(p,'recovering',1.5);this.pose(p);return true;}
  if(a.state==='recovering'){p.speed=0;if(now>a.until){this.transition(p,'walking');a.nextPlan=now;}this.pose(p);return true;}
  if(['seated','bar-seated','conversation','greeting','yielding','standing'].includes(a.state)){p.speed=0;if(a.state==='greeting')p.yaw=Math.atan2(g.state.x-p.x,g.state.z-p.z);if(now>=a.until){if(a.state==='bar-seated'){a.path=[{...a.site.door}];a.pathIndex=0;this.transition(p,'leaving-bar');}else{this.release(p);this.transition(p,'walking');a.nextPlan=now;}}this.pose(p);return true;}
  if(!a.driver&&g.state.mode==='foot'&&range<3.2&&now>(a.greetUntil||0)){a.greetUntil=now+18;if(range<1.2){const yaw=g.state.yaw+Math.PI/2;this.move(p,{x:p.x+Math.sin(yaw)*2,z:p.z+Math.cos(yaw)*2},1.4,dt);this.transition(p,'yielding',.7);}else{this.transition(p,'greeting',1.2);if(now>this.greetAt){g.toast?.(['Ciao!','Buongiorno!','Tutto bene?'][p.seed%3],1.3);this.greetAt=now+4;}}this.pose(p);return true;}
  if(a.path.length&&now-(a.goalSince??a.since)>90){this.release(p);a.path=[];this.transition(p,'walking');a.nextPlan=now+2;}
  const target=a.path[a.pathIndex];if(target){const crossing=target.crossing;if(crossing){if(!['waiting-crossing','crossing'].includes(a.state)){a.afterCross=a.state;this.transition(p,'crossing');}if(!this.crossSafe(p,crossing)){a.crossWaitSince??=now;if(now-a.crossWaitSince>35){this.release(p);a.path=[];a.pathIndex=0;a.crossWaitSince=null;this.transition(p,'walking');a.nextPlan=now+2;this.pose(p);return true;}this.transition(p,'waiting-crossing');p.speed=0;this.pose(p);return true;}a.crossWaitSince=null;if(a.state==='waiting-crossing')this.transition(p,'crossing');}
   if(this.move(p,target,1.35,dt,!!crossing)){a.pathIndex++;if(crossing){this.transition(p,a.afterCross||'walking');a.afterCross=null;}}
   if(a.blocked>3){this.release(p);a.path=[];this.transition(p,'walking');a.nextPlan=now+2;}this.pose(p);return true;
  }
  if(a.state==='approach-bench'&&a.seat){if(this.move(p,a.seat,1.1,dt)){p.yaw=a.seat.yaw||0;this.transition(p,'seated',8+p.seed%8);}else if(a.blocked>3){this.release(p);this.transition(p,'walking');}this.pose(p);return true;}
  if(a.state==='approach-bar'&&a.site&&dist(p,a.site.door)<.7){a.path=[{...a.seat}];a.pathIndex=0;this.transition(p,'entering-bar');}
  else if(a.state==='entering-bar'){p.yaw=a.seat.yaw||0;this.transition(p,'bar-seated',10+p.seed%9);}
  else if(a.state==='leaving-bar'){this.release(p);this.transition(p,'standing',.7);}
  else if(a.state==='returning-car'&&a.driver){const c=a.driver;if(dist(p,c.aiDriverR17.foot)<.7&&Math.abs(c.speed)<.1){c.aiDriverR17.state='boarding';this.transition(p,'boarding',1.1);}}
  else if(a.state==='boarding'&&a.driver){if(now>=a.until){const c=a.driver;p.mesh.visible=false;p.ridingR17=true;c.aiDriverR17.state='departing';c.aiDriverR17.since=now;this.transition(p,'riding');}}
  else {if(now>a.nextPlan&&(p.seed+Math.floor(now))%7===0){const friend=[...this.actors.near(p.x,p.z,3)].find(q=>q!==p&&!q.spec&&q.aiR17?.state==='walking'&&!q.aiR17.driver);if(friend){p.yaw=Math.atan2(friend.x-p.x,friend.z-p.z);friend.yaw=p.yaw+Math.PI;this.transition(p,'conversation',3.5);this.transition(friend,'conversation',3.5);}}if(a.state==='walking')this.routine(p);}
  this.pose(p);return true;
 }
 parkingCandidate(c){const g=this.game,r=c.road,from=g.graph.nodes[c.prev],to=g.graph.nodes[c.target];if(!from||!to||!r||!['residential','tertiary','unclassified','service','secondary'].includes(r.k)||r.w<6||r.w>14||c.spec.width>2.5)return null;const yaw=Math.atan2(to.x-from.x,to.z-from.z),projection=nearestOnSegment(c.x,c.z,[from.x,from.z],[to.x,to.z]),remaining=dist(projection,to);if(remaining<22)return null;const ahead=Math.min(18,remaining-8),off=-(r.w/2-c.spec.width/2-.25),centre={x:projection.x+Math.sin(yaw)*ahead,z:projection.z+Math.cos(yaw)*ahead};const spot={x:centre.x+Math.cos(yaw)*off,z:centre.z-Math.sin(yaw)*off,yaw},y=g.terrain.height(spot.x,spot.z),foot={x:centre.x-Math.cos(yaw)*(r.w/2+1.25),z:centre.z+Math.sin(yaw)*(r.w/2+1.25)};if(!g.terrain.dry(spot.x,spot.z,c.spec.width/2,y)||vehicleBlocked(spot.x,spot.z,yaw,g.collision,c.spec,y)||!this.routes.clearLine(foot,foot)||[...this.actors.near(spot.x,spot.z,8)].some(o=>o!==c&&o.spec&&dist(o,spot)<7))return null;return {...spot,y,foot,entry:{x:centre.x+Math.cos(yaw)*(c.laneOffset||0),z:centre.z-Math.sin(yaw)*(c.laneOffset||0)}};}
 cancelDriver(c){const a=c.aiDriverR17;if(!a)return;const p=a.person;this.release(p);delete p.aiR17;p.ridingR17=false;if(!p.mesh.visible)p.retryAt=p.driverPoolR17?Infinity:this.game.state.elapsed+.5;else{this.attach(p);p.aiR17.driver=null;p.aiR17.path=[];this.transition(p,'walking');p.aiR17.nextPlan=this.game.state.elapsed+1;}c.parked=c===this.game.state.car?c.parked:false;delete c.aiDriverR17;delete c.npcParkingSpeed;this.drivers.delete(c);this.metrics.poolReturns++;}
 vehicleStep(c,dt){const g=this.game;if(g.enabled&&!g.enabled())return false;const now=g.state.elapsed;if(c.regionalTraffic||c.police||c.hostile||c.missionUnit||c.fixedSpawn||c.dealershipStock||c.spec.aircraft||c.spec.bike||c===g.state.car||c.health<=0)return false;let a=c.aiDriverR17;
  if(!a){if(c.parked||this.drivers.size>=PADOVA_NPC_R17.maxDrivers||dist(c,g.state)>115||now<(c.nextDriverAt||0))return false;c.nextDriverAt=now+6;const spot=this.parkingCandidate(c);if(!spot)return false;const p=g.people.find(p=>!p.dog&&!p.budgetSleeping&&p.health>0&&!p.aiR17?.driver&&!p.mesh.visible);if(!p)return false;this.reset(p);this.attach(p);p.aiR17.driver=c;p.ridingR17=true;p.mesh.visible=false;this.transition(p,'riding');a=c.aiDriverR17={state:'driving',since:now,person:p,spot,foot:spot.foot};this.drivers.add(c);this.metrics.poolBorrows++;return false;}
  if(a.state==='driving'){a.state='search-parking';a.since=now;return false;}
  if(a.state==='search-parking'){a.state='slowing';a.since=now;c.npcParkingSpeed=4;return false;}
  if(a.state==='slowing'){const distance=dist(c,a.spot.entry);c.npcParkingSpeed=Math.min(4,Math.sqrt(Math.max(0,distance)*2));if(distance<1.4&&c.speed<2){a.state='parking';a.since=now;}if(now-a.since>24)this.cancelDriver(c);return false;}
  if(a.state==='parking'||a.state==='departing'){const target=a.state==='parking'?a.spot:a.spot.entry,delta=dist(c,target),limit=Math.min(1.3,delta*1.7);advanceTrafficSpeed(c,limit,dt);const d=Math.min(delta,c.speed*dt),l=delta||1,nx=c.x+(target.x-c.x)/l*d,nz=c.z+(target.z-c.z)/l*d,y=g.terrain.height(nx,nz,c.y);const blocked=vehicleBlocked(nx,nz,c.yaw,g.collision,c.spec,y)||!g.terrain.dry(nx,nz,c.spec.width/2,y)||[...this.actors.near(nx,nz,6)].some(o=>o!==c&&o!==a.person&&Math.abs((o.y||0)-y)<3&&dist({x:nx,z:nz},o)<(o.spec?Math.max(o.spec.width,c.spec.width)+.3:1));if(!blocked){c.x=nx;c.z=nz;}else c.speed=0;g.pose(c);
   if(delta<.2){c.speed=0;c.longAccel=0;delete c.npcParkingSpeed;if(a.state==='departing'){this.metrics.driverCycles++;this.cancelDriver(c);c.nextDriverAt=now+40;c.parked=false;c.jamTime=0;return true;}c.parked=true;a.state='parked';a.since=now;const p=a.person;p.ridingR17=false;p.mesh.visible=true;Object.assign(p,{x:c.x-Math.cos(c.yaw)*(c.spec.width/2+.45),z:c.z+Math.sin(c.yaw)*(c.spec.width/2+.45),y:c.y,yaw:c.yaw,health:100,speed:0});p.aiR17.path=[{...a.foot}];p.aiR17.pathIndex=0;p.aiR17.driver=c;this.transition(p,'walking');p.aiR17.nextPlan=now+5;this.pose(p);a.visitDone=false;p.aiR17.goalSince=now;}
   if(now-a.since>20)this.cancelDriver(c);return true;
  }
  if(a.state==='parked'){const p=a.person;if(now-a.since>150){this.cancelDriver(c);c.parked=true;return true;}if(!a.visitDone&&p.aiR17?.pathIndex>=p.aiR17?.path.length){const sites=[...this.siteIndex.near(p.x,p.z,35)].filter(s=>s.seats.some(q=>!q.owner)&&dist(p,s.door||s)<35);const site=sites[0],goals=this.routes.destinations(p),goal=site?.door||site||goals.find(q=>dist(q,p)>10&&dist(q,p)<40);if(goal&&this.plan(p,goal,site?.kind==='bar'?'approach-bar':site?'approach-bench':'walking',site)){if(site)this.reserve(p,site);a.visitDone=true;p.aiR17.nextPlan=now+12;}}
   if(now-a.since>75){this.release(p);p.aiR17.path=[];p.aiR17.nextPlan=now;this.transition(p,'walking');}return true;
  }
  return a.state==='returning'||a.state==='boarding';
 }
}
