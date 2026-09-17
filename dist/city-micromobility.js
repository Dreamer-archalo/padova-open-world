// Extend the existing Portello micromobility without changing game.js, taxi,
// races, multiplayer or the shared terrain/road geometry. The CityWorld update
// supplies the actual player position and the active streamed road network.
import {CityWorld,CHUNK} from './world.js';
import {PORTELLO_GATE,createMicromobilityActor,stepMicromobility} from './portello.js';
import {collides} from './core.js';

const ROAD_KINDS=new Set(['cycleway','footway','path','pedestrian','living_street','residential','service']);
const DEDICATED=new Set(['cycleway','footway','path','pedestrian']);
const CITY_ZONES=new Set(['university','historic','urban','residential','green']);
const PORTELLO_BUFFER=650;
const POOL=new WeakMap();

export const cityMicromobilityBudget=quality=>({hyper:1,low:3,medium:4,high:6}[quality]??3);
export function cityMicromobilityRoadAllowed(road,zone){
 return !!road&&ROAD_KINDS.has(road.k)&&CITY_ZONES.has(zone)&&
  !['no','private'].includes(road.access)&&!road.tunnel&&!road.b&&!(Number(road.layer)>0)&&
  Number.isFinite(road.w)&&road.w>=1.2;
}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const nearPortello=(x,z)=>Math.hypot(x-PORTELLO_GATE.x,z-PORTELLO_GATE.z)<PORTELLO_BUFFER;

function section(road,x,z){
 const source=road.p;
 if(!Array.isArray(source)||source.length<2)return null;
 let at=0,nearest=Infinity;
 for(let i=0;i<source.length;i++){
  const d=Math.hypot(source[i][0]-x,source[i][1]-z);
  if(d<nearest){nearest=d;at=i;}
 }
 if(nearest>255)return null;
 // Use the real road polyline, not invented coordinates through buildings.
 let lo=at,hi=at;
 while(lo>0&&distance(source[lo],source[lo-1])<110&&distance(source[lo],source[at])<105)lo--;
 while(hi<source.length-1&&distance(source[hi],source[hi+1])<110&&distance(source[hi],source[at])<105)hi++;
 const path=source.slice(lo,hi+1);
 if(path.length<2)return null;
 let length=0;
 for(let i=1;i<path.length;i++)length+=distance(path[i-1],path[i]);
 if(length<32||length>230)return null;
 const shoulder=DEDICATED.has(road.k)?0:road.w/2+.38;
 const side=((Math.round(x*3+z*7)&1)===0?1:-1);
 return path.map((p,i)=>{
  if(!shoulder)return [p[0],p[1]];
  const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)];
  const dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz)||1;
  return [p[0]+dz/d*shoulder*side,p[1]-dx/d*shoulder*side];
 });
}

function safeRoute(world,points){
 const terrain=world.terrain;
 let lastY=null;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],d=distance(a,b);
  if(d<.1)return false;
  for(let j=0,n=Math.max(1,Math.ceil(d/9));j<=n;j++){
   const t=j/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
   if(!Number.isFinite(x)||!Number.isFinite(z)||nearPortello(x,z))return false;
   const y=terrain.height(x,z);
   if(!Number.isFinite(y)||!terrain.dry(x,z,.55,y)||collides(x,z,.36,world.collision,y))return false;
   if(lastY!==null&&Math.abs(y-lastY)>1.1)return false;
   lastY=y;
  }
 }
 return true;
}

// Exported for regression tests: dynamically discovers suitable roads around
// ANY eligible player position, instead of hardcoding three Portello routes.
export function cityMicromobilityRoutes(world,x,z){
 if(!world?.terrain?.districts||!world.chunks||nearPortello(x,z))return [];
 const district=world.terrain.districts;
 if(!CITY_ZONES.has(district.at(x,z)))return [];
 const ix=Math.floor(x/CHUNK),iz=Math.floor(z/CHUNK),seen=new Set(),candidates=[];
 for(let i=ix-1;i<=ix+1;i++)for(let j=iz-1;j<=iz+1;j++){
  const chunk=world.chunks.get(i+','+j);
  for(const segment of chunk?.roads||[]){
   const road=segment.road;
   if(seen.has(road))continue;
   const mx=(segment.a[0]+segment.b[0])/2,mz=(segment.a[1]+segment.b[1])/2;
   if(Math.hypot(mx-x,mz-z)>285)continue;
   seen.add(road);
   if(!cityMicromobilityRoadAllowed(road,district.at(mx,mz,road)))continue;
   const points=section(road,x,z);
   if(!points||!safeRoute(world,points))continue;
   const middle=points[Math.floor(points.length/2)],d=Math.hypot(middle[0]-x,middle[1]-z);
   if(d>260)continue;
   const start=Math.hypot(points[0][0]-x,points[0][1]-z),end=Math.hypot(points.at(-1)[0]-x,points.at(-1)[1]-z);
   if(Math.max(start,end)<45)continue; // never materialize an NPC on top of the player
   candidates.push({points,roadKind:road.k,x:middle[0],z:middle[1],score:Math.abs(d-130)+(DEDICATED.has(road.k)?-24:0)});
  }
 }
 candidates.sort((a,b)=>a.score-b.score);
 return candidates;
}

function installRoute(world,actor,candidate,x,z){
 const points=candidate.points,startD=Math.hypot(points[0][0]-x,points[0][1]-z),endD=Math.hypot(points.at(-1)[0]-x,points.at(-1)[1]-z);
 const index=startD>=endD?0:points.length-1,from=points[index],next=points[index===0?1:index-1];
 actor.route={kind:actor.kind,points:index===0?points:points.slice().reverse()};
 actor.index=0;actor.x=from[0];actor.z=from[1];actor.y=world.terrain.height(actor.x,actor.z);
 actor.yaw=Math.atan2(next[0]-from[0],next[1]-from[1]);actor.speed=0;
 actor.mesh.position.set(actor.x,actor.y,actor.z);actor.mesh.rotation.y=actor.yaw;
 actor.mesh.userData.cityMicromobility=true;
}

export function updateCityMicromobility(world,x,z,now=globalThis.performance?.now?.()??Date.now()){
 if(!world?.terrain?.modern)return;
 if(typeof document!=='undefined'&&document.getElementById('playingUI')?.hidden)return;
 let pool=POOL.get(world);
 if(!pool){pool={actors:[],scannedAt:-Infinity,x:Infinity,z:Infinity,updatedAt:now};POOL.set(world,pool);}
 const cap=cityMicromobilityBudget(world.quality),pressure=!!world.streaming?.metrics?.pressure;
 while(pool.actors.length<cap){
  const actor=createMicromobilityActor(pool.actors.length,world.terrain);
  actor.mesh.visible=false;world.scene.add(actor.mesh);pool.actors.push(actor);
 }
 const outside=nearPortello(x,z)||!CITY_ZONES.has(world.terrain.districts?.at(x,z));
 if(outside){for(const actor of pool.actors)actor.mesh.visible=false;return;}
 const moved=Math.hypot(x-pool.x,z-pool.z)>90;
 if(now-pool.scannedAt>3200&&(moved||pool.actors.some(a=>!a.route||Math.hypot(a.x-x,a.z-z)>285))){
  const routes=cityMicromobilityRoutes(world,x,z),used=[];
  for(let i=0;i<cap;i++){
   const actor=pool.actors[i];
   if(actor.route&&Math.hypot(actor.x-x,actor.z-z)<245)continue;
   const next=routes.find(r=>used.every(u=>Math.hypot(r.x-u.x,r.z-u.z)>48)&&!pool.actors.some(a=>a!==actor&&a.route&&Math.hypot(r.x-a.x,r.z-a.z)<38));
   if(next){installRoute(world,actor,next,x,z);used.push(next);}else{actor.route=null;actor.mesh.visible=false;}
  }
  pool.scannedAt=now;pool.x=x;pool.z=z;
 }
 const dt=Math.min(.05,Math.max(0,(now-pool.updatedAt)/1000));pool.updatedAt=now;
 for(let i=0;i<pool.actors.length;i++){
  const actor=pool.actors[i],d=Math.hypot(actor.x-x,actor.z-z);
  const visible=i<cap&&!!actor.route&&d<265&&(!pressure||i<Math.max(1,Math.ceil(cap/2)));
  actor.mesh.visible=visible;
  if(!visible||dt<=0)continue;
  const previous={x:actor.x,z:actor.z,y:actor.y,yaw:actor.yaw};
  stepMicromobility(actor,dt,world.terrain);
  if(!world.terrain.dry(actor.x,actor.z,.55,actor.y)||collides(actor.x,actor.z,.36,world.collision,actor.y)){
   Object.assign(actor,previous,{speed:0});actor.mesh.position.set(previous.x,previous.y,previous.z);actor.mesh.rotation.y=previous.yaw;
  }
 }
}

// Isolated city-life extension: no replacement of height, collision, taxi or
// race methods; installing twice is harmless. World.update is the position
// source already called each rendered frame by the canonical game.
if(!CityWorld.prototype.__cityMicromobilityInstalled){
 const original=CityWorld.prototype.update;
 CityWorld.prototype.update=function(x,z,force=false,motion={}){
  const result=original.call(this,x,z,force,motion);
  updateCityMicromobility(this,x,z);
  return result;
 };
 CityWorld.prototype.__cityMicromobilityInstalled=true;
}
