import {project,dist,angleDiff,clamp,nearestOnSegment} from './core.js';
import {vehicleBlocked} from './movement.js';

export function taxiFare(from,to){return Math.min(100,Math.max(10,Math.ceil((8+dist(from,to)/65)/5)*5));}
export function taxiDestinations(places,home,airport){
 const named=name=>places.find(p=>p.name===name),renamed=(name,newName,tag)=>{const p=named(name);return p?{...p,name:newName,tag:tag||p.tag}:null;};
 return [
  named('Prato della Valle'),
  named('Piazza dei Signori'),
  named('Portello'),
  {...airport,name:'Aeroporto',tag:'Terminal e hangar'},
  named('Arcella'),
  {name:'Capolinea tram sud (Albignasego)',tag:'Capolinea sud',...project(45.352,11.867)},
  renamed('Stadio Euganeo','Stadio','Stadio Euganeo'),
  {name:'Ponte San Nicolò',tag:'Settore sud-est',...project(45.366,11.923)},
  {name:'Vigonza',tag:'Settore nord-est',...project(45.434,11.965)},
  {name:'Zona Industriale',tag:'Padova est',...project(45.4105,11.945)}
 ].filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z));
}

// Bounded nearest-road lookup used by taxi destination selection. It never
// falls back to scanning the entire road graph: malformed/out-of-grid map
// coordinates therefore fail quickly instead of blocking the main thread.
export function findTaxiRoad(pos,graph,terrain,{maxRadius=520,maxCandidates=2500,maxMs=18}={}){
 if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.z)||!graph?.index||!graph?.nodes)return null;
 const now=()=>globalThis.performance?.now?.()??Date.now(),started=now(),seen=new Set();
 let best=null,bestDistance=Infinity,visited=0;
 for(const radius of [90,180,320,520]){
  if(radius>maxRadius)break;
  for(const segment of graph.index.near(pos.x,pos.z,radius)){
   if(seen.has(segment))continue;seen.add(segment);visited++;
   if(visited>maxCandidates||now()-started>maxMs)return best;
   const road=segment.road;
   if(!segment.connected||['no','private'].includes(road?.access)||['pedestrian','footway','path','cycleway','steps','track','tram'].includes(road?.k)||Number(road?.w||0)<3.5)continue;
   const a=graph.nodes[segment.a],b=graph.nodes[segment.b];if(!a||!b)continue;
   const point=nearestOnSegment(pos.x,pos.z,[a.x,a.z],[b.x,b.z]);
   if(!Number.isFinite(point.x)||!Number.isFinite(point.z))continue;
   const distance=dist(point,pos);if(distance>=bestDistance)continue;
   const yaw=Math.atan2(b.x-a.x,b.z-a.z)+(road.oneway===-1?Math.PI:0),sample=terrain?.roads?.sample?.(road,point.x,point.z),y=Number.isFinite(sample)?sample+.05:terrain?.height?.(point.x,point.z);
   if(!Number.isFinite(y))continue;
   best={...point,yaw,y,segment};bestDistance=distance;
  }
  if(best)return best;
 }
 return null;
}

function routeLength(path,start=0){let metres=0;for(let i=Math.max(1,start),steps=0;i<path.length&&steps++<5000;i++)metres+=dist(path[i-1],path[i]);return metres;}
function approachPoint(path,metres){
 let remaining=metres,steps=0;
 for(let i=path.length-1;i>0&&steps++<5000;i--){
  const a=path[i-1],b=path[i],segment=dist(a,b);if(segment<=0)continue;
  if(remaining<=segment){const t=remaining/segment;return {x:b.x+(a.x-b.x)*t,z:b.z+(a.z-b.z)*t,index:i,yaw:Math.atan2(b.x-a.x,b.z-a.z)};}
  remaining-=segment;
 }
 return null;
}
function pullTaxiNearPickup(car,path,index,terrain,collision){
 if(car.taxiApproachPath===path)return index;car.taxiApproachPath=path;
 if(path.length<2||routeLength(path,index)<180)return index;
 for(const metres of [65,80,100,125,150]){
  const p=approachPoint(path,metres);if(!p)continue;const y=terrain.height(p.x,p.z,car.y);
  if(!terrain.dry(p.x,p.z,car.spec.width/2,y)||vehicleBlocked(p.x,p.z,p.yaw,collision,car.spec,y))continue;
  Object.assign(car,{x:p.x,z:p.z,y,yaw:p.yaw,speed:0});return p.index;
 }
 return index;
}

export function advanceTaxi(car,path,index,dt,terrain,collision){
 index=pullTaxiNearPickup(car,path,index,terrain,collision);
 const target=path[index];if(!target)return {index,arrived:true,blocked:false};const distance=dist(car,target);if(distance<4){index++;if(index>=path.length){car.speed=0;return {index,arrived:true,blocked:false};}}
 const goal=path[index]||target,yaw=Math.atan2(goal.x-car.x,goal.z-car.z),turn=Math.abs(angleDiff(yaw,car.yaw)),desired=Math.min(car.spec.max*.62,5+distance*.22)*(1-clamp(turn/2.2,0,.7));
 car.speed+=clamp(desired-car.speed,-car.spec.brake*dt,car.spec.accel*.65*dt);const nextYaw=car.yaw+clamp(angleDiff(yaw,car.yaw),-car.spec.steer*dt,car.spec.steer*dt),nx=car.x+Math.sin(nextYaw)*car.speed*dt,nz=car.z+Math.cos(nextYaw)*car.speed*dt,ground=terrain.height(nx,nz,car.y);
 if(vehicleBlocked(nx,nz,nextYaw,collision,car.spec,ground)||!terrain.dry(nx,nz,car.spec.width/2,ground)){car.speed=0;return {index,arrived:false,blocked:true};}
 Object.assign(car,{x:nx,z:nz,y:ground,yaw:nextYaw});return {index,arrived:false,blocked:false};
}
