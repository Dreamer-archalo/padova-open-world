import {project,dist,angleDiff,clamp} from './core.js';
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

function routeLength(path,start=0){let metres=0;for(let i=Math.max(1,start);i<path.length;i++)metres+=dist(path[i-1],path[i]);return metres;}
function approachPoint(path,metres){
 let remaining=metres;
 for(let i=path.length-1;i>0;i--){
  const a=path[i-1],b=path[i],segment=dist(a,b);if(segment<=0)continue;
  if(remaining<=segment){const t=remaining/segment;return {x:b.x+(a.x-b.x)*t,z:b.z+(a.z-b.z)*t,index:i,yaw:Math.atan2(b.x-a.x,b.z-a.z)};}
  remaining-=segment;
 }
 return null;
}
function pullTaxiNearPickup(car,path,index,terrain,collision){
 // Every newly-created route gets one chance to move the taxi close to its
 // pickup point. This avoids 1+ km detours caused by nearby one-way roads or
 // separated carriageways while still keeping the car far enough away that it
 // can drive into view rather than materialising beside the player.
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
