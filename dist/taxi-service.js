import {project,dist,angleDiff,clamp} from './core.js';
import {vehicleBlocked} from './movement.js';

export function taxiFare(from,to){return Math.min(100,Math.max(10,Math.ceil((8+dist(from,to)/65)/5)*5));}
export function taxiDestinations(places,home,airport){
 const named=name=>places.find(p=>p.name===name);
 return [
  {name:'Albignasego',tag:'Settore sud',...project(45.352,11.867)},
  {name:'Sacro Cuore',tag:'Padova nord',...project(45.44,11.879)},
  {name:'Vigonza',tag:'Settore nord-est',...project(45.434,11.965)},
  {name:'Ponte San Nicolò',tag:'Settore sud-est',...project(45.366,11.923)},
  named('Portello'),named('Prato della Valle'),named('Stazione'),
  {name:'Zona Industriale',tag:'Padova est',...project(45.4105,11.945)},
  {...airport,name:'Aeroporto',tag:'Terminal e hangar'},
  {...home,name:'Villa',tag:'Casa e respawn'}
 ].filter(Boolean);
}
export function advanceTaxi(car,path,index,dt,terrain,collision){
 const target=path[index];if(!target)return {index,arrived:true,blocked:false};const distance=dist(car,target);if(distance<4){index++;if(index>=path.length){car.speed=0;return {index,arrived:true,blocked:false};}}
 const goal=path[index]||target,yaw=Math.atan2(goal.x-car.x,goal.z-car.z),turn=Math.abs(angleDiff(yaw,car.yaw)),desired=Math.min(car.spec.max*.62,5+distance*.22)*(1-clamp(turn/2.2,0,.7));
 car.speed+=clamp(desired-car.speed,-car.spec.brake*dt,car.spec.accel*.65*dt);const nextYaw=car.yaw+clamp(angleDiff(yaw,car.yaw),-car.spec.steer*dt,car.spec.steer*dt),nx=car.x+Math.sin(nextYaw)*car.speed*dt,nz=car.z+Math.cos(nextYaw)*car.speed*dt,ground=terrain.height(nx,nz,car.y);
 if(vehicleBlocked(nx,nz,nextYaw,collision,car.spec,ground)||!terrain.dry(nx,nz,car.spec.width/2,ground)){car.speed=0;return {index,arrived:false,blocked:true};}
 Object.assign(car,{x:nx,z:nz,y:ground,yaw:nextYaw});return {index,arrived:false,blocked:false};
}
