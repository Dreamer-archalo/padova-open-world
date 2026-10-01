import * as THREE from './vendor/three.module.js';
import {angleDiff,clamp,dist,collides} from './core.js';
import {curbParkingTarget} from './traffic.js';
import {vehicleBlocked} from './movement.js';
import {actorDetail,qualityFor} from './quality.js';

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

// Padova uses the existing pooled actors and road graph. Tasks describe one
// visible trip; no city-wide path search or permanently simulated population.
export const PADOVA_NPC_LIMIT=Object.freeze({hyper:2,low:5,medium:8,high:12});
const ACTIVE_STATES=new Set(['to-bench','seated','to-bar','enter-bar','to-table','at-bar','exit-bar','return-car','talk','flee','recover','to-crosswalk','crosswalk']);
export class PadovaUrbanDirector {
 constructor(game,{bars=[],benches=PORTELLO_SEATS}={}){
  this.game=game;this.bars=bars.map(b=>({id:b.id,door:{x:b.p.x,z:b.p.z+1.25},inside:{x:b.p.x,z:b.p.z-.62},
   seats:[-1,1].map((side,i)=>({id:`bar:${b.id}:${i}`,x:b.p.x+side*1.35,z:b.p.z-1.25}))}));
  this.benches=benches.map((s,i)=>({...s,id:`bench:${i}`}));this.occupied=new Map();this.drivers=new Map();this.lastAssign=-Infinity;this.lastDrive=-Infinity;this.lastGreeting=-Infinity;
  this.crosswalks=[];for(const j of game.signals?.junctions?.values()||[])for(const a of j.approaches){if(a.road.w>13)continue;const yaw=a.yaw,w=a.road.w/2+1.2,cx=j.x-Math.sin(yaw)*(j.radius-1),cz=j.z-Math.cos(yaw)*(j.radius-1);
   this.crosswalks.push({id:j.id,yaw,a:{x:cx+Math.cos(yaw)*w,z:cz-Math.sin(yaw)*w},b:{x:cx-Math.cos(yaw)*w,z:cz+Math.sin(yaw)*w}});
  }
 }
 limit(){return PADOVA_NPC_LIMIT[this.game.state.quality]??5;}
 clear(p){if(p.citySeat&&this.occupied.get(p.citySeat.id)===p)this.occupied.delete(p.citySeat.id);p.citySeat=null;p.cityTask=null;p.cityThreat=null;p.cityBar=null;p.cityCross=null;p.role=p.dog?'dog-owner':'walker';}
 reserve(p,seats){for(const seat of seats){if(this.occupied.has(seat.id)||this.game.people.some(other=>other!==p&&other.mesh?.visible&&dist(other,seat)<.9))continue;if(!this.safe(seat,p.y))continue;this.occupied.set(seat.id,p);p.citySeat=seat;return seat;}return null;}
 safe(pos,y){const g=this.game;return g.terrain.dry(pos.x,pos.z,.35,y)&&!collides(pos.x,pos.z,.37,g.collision,y);}
 start(p,state,goal,until=0){p.cityTask={state,goal,until,started:this.game.state.elapsed,blocked:0};p.at=Infinity;return p.cityTask;}
 count(){return this.game.people.filter(p=>p.cityTask&&ACTIVE_STATES.has(p.cityTask.state)).length;}
 assign(now=this.game.state.elapsed){const g=this.game;if(g.state.x>=7350||g.state.paused||now<this.lastAssign+.7)return;this.lastAssign=now;
  const cap=this.limit(),active=this.count();if(active>=cap)return;
  const candidates=g.people.filter(p=>p.mesh?.visible&&!p.driverPool&&!p.cityTask&&!p.dog&&dist(p,g.state)<115&&dist(p,g.state)>5).sort((a,b)=>a.seed-b.seed);
  for(const p of candidates){if(this.count()>=cap)break;
   if(p.seed%5===0){const crossing=this.crosswalks.find(w=>{const from=dist(p,w.a)<dist(p,w.b)?w.a:w.b,to=from===w.a?w.b:w.a;return dist(p,from)<20&&this.safe(from,p.y)&&this.safe(to,p.y);});if(crossing){const from=dist(p,crossing.a)<dist(p,crossing.b)?crossing.a:crossing.b;p.cityCross={...crossing,to:from===crossing.a?crossing.b:crossing.a};this.start(p,'to-crosswalk',from);continue;}}
   const bar=this.bars.find(b=>dist(p,b.door)<26&&this.safe(b.door,p.y)&&this.safe(b.inside,p.y));
   if(bar&&p.seed%3!==0){const seat=this.reserve(p,bar.seats);if(seat){p.cityBar=bar;this.start(p,'to-bar',bar.door);continue;}}
   const nearby=this.benches.filter(s=>dist(p,s)<19),seat=this.reserve(p,nearby);
   if(seat){this.start(p,'to-bench',seat);continue;}
   if(p.seed%4===0&&this.count()+2<=cap){const peer=candidates.find(q=>q!==p&&!q.cityTask&&dist(q,p)<5);if(peer){this.start(p,'talk',null,now+3.5);this.start(peer,'talk',null,now+3.5);}}
  }
 }
 alarm(source,radius=30,seconds=3){const g=this.game,now=g.state.elapsed;if(g.state.x>=7350)return;for(const p of g.people){if(!p.mesh?.visible||dist(p,source)>radius||p.cityTask?.state==='flee')continue;
  const old=p.cityTask;if(p.citySeat&&this.occupied.get(p.citySeat.id)===p)this.occupied.delete(p.citySeat.id);p.citySeat=null;
  p.cityThreat={x:source.x,z:source.z,until:now+seconds,previous:old};this.start(p,'flee',null,now+seconds);
 }}
 react(p,near){if(p.cityTask?.state==='flee'||!p.mesh?.visible)return;const threat=near.find(c=>Math.abs(c.speed||0)>3&&dist(c,p)<Math.max(6,Math.abs(c.speed)*1.1));if(threat){this.clear(p);this.alarmOne(p,threat,2.5);}}
 alarmOne(p,source,seconds){const now=this.game.state.elapsed;if(p.citySeat&&this.occupied.get(p.citySeat.id)===p)this.occupied.delete(p.citySeat.id);p.citySeat=null;p.cityThreat={x:source.x,z:source.z,until:now+seconds};this.start(p,'flee',null,now+seconds);}
 greet(){const g=this.game,now=g.state.elapsed;if(g.state.mode!=='foot'||g.state.x>=7350||now<this.lastGreeting+2)return false;
  const p=g.people.find(p=>p.mesh?.visible&&dist(p,g.state)<3.7&&p.cityTask?.state!=='flee');if(!p)return false;
  this.lastGreeting=now;p.cityGreetUntil=now+2;p.yaw=Math.atan2(g.state.x-p.x,g.state.z-p.z);g.toast?.(['Ciao!','Buona giornata!','Tutto bene?'][p.seed%3],2);return true;
 }
 // Called by the existing pedestrian update, before its standard collision and
 // terrain checks. The road crossing still uses the existing pedestrian intent.
 intent(p,base,now,near=[]){const task=p.cityTask;if(!task)return base;
  if(task.state==='talk'||task.state==='seated'||task.state==='at-bar')return {yaw:p.cityGreetUntil>now?Math.atan2(this.game.state.x-p.x,this.game.state.z-p.z):p.yaw,speed:0,crossing:false};
  if(task.state==='flee'){const threat=p.cityThreat||this.game.state,dx=p.x-threat.x,dz=p.z-threat.z;return {yaw:Math.atan2(dx,dz),speed:3.2,crossing:true};}
  if(task.state==='recover')return {...base,speed:Math.min(.8,base.speed)};
  const goal=task.goal;if(!goal)return base;
  if(task.state==='crosswalk'&&(this.game.signals?.allowed(p.cityCross?.id,now,p.cityCross?.yaw)||near.some(c=>c.mesh?.visible&&c.speed>2&&dist(c,p)<9)))return {yaw:p.yaw,speed:0,crossing:false};
  return {yaw:Math.atan2(goal.x-p.x,goal.z-p.z),speed:(task.state==='enter-bar'||task.state==='exit-bar')?.75:1.25,crossing:task.state==='enter-bar'||task.state==='exit-bar'||task.state==='crosswalk'};
}
 afterMove(p,now,blocked=false,step=.08){const t=p.cityTask;if(!t)return;t.blocked=blocked?t.blocked+step:0;
  if(t.blocked>2.3||now-t.started>28){this.clear(p);p.at=now+12;return;}
  if(t.state==='flee'&&now>=t.until){this.start(p,'recover',null,now+1.3);return;}
  if(t.state==='recover'&&now>=t.until){this.clear(p);p.at=now+15;return;}
  if((t.state==='talk'||t.state==='seated'||t.state==='at-bar')&&now>=t.until){
   if(t.state==='at-bar'){this.start(p,'exit-bar',p.cityBar.door);p.role='walker';}
   else if(p.driverCar){if(p.citySeat&&this.occupied.get(p.citySeat.id)===p)this.occupied.delete(p.citySeat.id);p.citySeat=null;this.start(p,'return-car',p.driverExit);p.role='worker';}
   else{this.clear(p);p.at=now+16;}return;
  }
  if(!t.goal||dist(p,t.goal)>(t.state==='return-car'?1.5:.85))return;
  switch(t.state){
   case 'to-bench':p.role='seated';this.start(p,'seated',null,now+5+p.seed%5);break;
   case 'to-crosswalk':this.start(p,'crosswalk',p.cityCross.to);break;
   case 'crosswalk':this.clear(p);p.cityCross=null;p.anchor={x:p.x,z:p.z};p.at=now+16;break;
   case 'to-bar':this.start(p,'enter-bar',p.cityBar.inside);break;
   case 'enter-bar':this.start(p,'to-table',p.citySeat);break;
   case 'to-table':p.role='seated';this.start(p,'at-bar',null,now+5+p.seed%5);break;
   case 'exit-bar':if(p.driverCar){if(p.citySeat&&this.occupied.get(p.citySeat.id)===p)this.occupied.delete(p.citySeat.id);p.citySeat=null;this.start(p,'return-car',p.driverExit);}else{this.clear(p);p.at=now+12;}break;
   case 'return-car':this.board(p);break;
  }
 }
 driverPool(){return this.game.people.filter(p=>p.driverPool&&!p.driverCar).length;}
 maybePark(c,node,actors){const g=this.game,now=g.state.elapsed;if(g.state.x>=7350||g.state.quality==='hyper'||now<this.lastDrive+12||this.drivers.size>=Math.min(2,Math.max(1,Math.floor(this.limit()/4)))||!this.driverPool()||c.parked||c.spec?.length>5.5||c.spec?.width<1.5||c.police||c.missionUnit||c.fixedSpawn||c.regionalTraffic||!g.signals?.allowed(c.target,now,c.yaw)||dist(c,g.state)>150||dist(c,g.state)<28)return;
  const bar=this.bars.find(b=>dist(c,b.door)<105);if(!bar)return;
  const place=curbParkingTarget(c,node,g.terrain,g.collision,actors);if(!place||dist(place,bar.door)>85)return;
  const driver=g.people.find(p=>p.driverPool&&!p.driverCar);if(!driver)return;
  this.lastDrive=now;c.cityCycle={state:'approach',place,bar,driver,started:now};driver.driverCar=c;this.drivers.set(c,driver);
 }
 drive(c,step){const cycle=c.cityCycle;if(!cycle||cycle.state==='parked')return false;
  const g=this.game,now=g.state.elapsed,goal=cycle.state==='depart'?cycle.place.lane:cycle.place;
  if(now-cycle.started>70){this.abandon(c);return false;}
  const distance=dist(c,goal),desiredYaw=Math.atan2(goal.x-c.x,goal.z-c.z);
  c.yaw+=clamp(angleDiff(desiredYaw,c.yaw),-c.spec.steer*step,c.spec.steer*step);c.speed=Math.min(Math.max(0,(distance-.55)*.62),cycle.state==='approach'?5:3.5);
  const nx=c.x+Math.sin(c.yaw)*c.speed*step,nz=c.z+Math.cos(c.yaw)*c.speed*step,y=g.terrain.height(nx,nz,c.y);
  if(!g.terrain.dry(nx,nz,c.spec.width/2,y)||vehicleBlocked(nx,nz,c.yaw,g.collision,c.spec,y)||g.cars.some(o=>o!==c&&o.mesh?.visible&&Math.abs(o.y-y)<3&&dist(o,{x:nx,z:nz})<(o.spec.length+c.spec.length)/2+.7)){
   cycle.blocked=(cycle.blocked||0)+step;c.speed=0;if(cycle.blocked>4)this.abandon(c);return true;
  }
  c.x=nx;c.z=nz;c.y=y;g.pose(c);
  if(distance>1.3)return true;
  if(cycle.state==='depart'){c.cityCycle=null;c.parked=false;c.speed=3;this.drivers.delete(c);return true;}
  c.speed=0;c.parked=true;cycle.state='parked';cycle.started=now;const p=cycle.driver,exit=cycle.place.exit;
  Object.assign(p,{x:exit.x,z:exit.z,y:g.terrain.height(exit.x,exit.z),yaw:c.yaw,driverExit:exit,anchor:{...exit},role:'worker',at:Infinity,health:100,simulatedAt:now,nextThink:now});p.mesh.position.set(p.x,p.y,p.z);p.mesh.visible=true;actorDetail(p,qualityFor(g.state.quality).simple,true);
  const seat=this.reserve(p,cycle.bar.seats);if(seat){p.cityBar=cycle.bar;this.start(p,'to-bar',cycle.bar.door);}else this.start(p,'return-car',exit,now+3);
  return true;
 }
 board(p){const c=p.driverCar;if(!c?.cityCycle)return;this.clear(p);p.mesh.visible=false;p.driverCar=null;p.driverExit=null;c.cityCycle.state='depart';c.cityCycle.started=this.game.state.elapsed;c.parked=false;c.speed=0;}
 abandon(c){const p=this.drivers.get(c);if(p){this.clear(p);p.mesh.visible=false;p.driverCar=null;p.driverExit=null;}this.drivers.delete(c);c.cityCycle=null;c.parked=false;}
 tick(){this.assign();for(const [car,p] of this.drivers){if(!car.mesh?.visible||car===this.game.state.car||dist(car,this.game.state)>520||!p.driverCar){this.abandon(car);continue;}
   if(car.cityCycle?.state==='parked'&&this.game.state.elapsed-car.cityCycle.started>42)this.board(p);
  }}
}
