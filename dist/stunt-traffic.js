import {markVehicleWreck} from './vehicle-damage.js';
import {clamp,dist,angleDiff} from './core.js';

export function updateWheelie(car,held,dt){
 const allowed=(car.spec.bike||car.spec.family==='motorcycle'||['scooter','motorcycle'].includes(car.style))&&
  car.health>0&&!car.jump?.airborne&&car.speed>5&&car.speed<car.spec.max*.9&&Math.abs(car.steerInput||0)<.6;
 const target=held&&allowed?.48:0;
 car.wheelie=(car.wheelie||0)+(target-(car.wheelie||0))*(1-Math.exp(-dt*(target?4:8)));
 if(car.wheelie<.001)car.wheelie=0;
 return car.wheelie;
}
export function wheeliePose(car){
 const a=car.wheelie||0,rear=(car.spec.wheelbase||1.4)/2;
 return {pitch:(car.pitch||0)-a,lift:rear*Math.sin(a)};
}
export function mobileRamp(car){
 if(!car.spec.rampTruck||!car.mesh?.visible||car.health<=0)return null;
 const length=5.2,centre=-1.0,base=car.y||0;
 return {kind:'mobile-ramp',car,x:car.x+Math.sin(car.yaw)*centre,z:car.z+Math.cos(car.yaw)*centre,
  yaw:car.yaw,width:2.24,length,topY:[base+.12,base+.12,base+3.05,base+3.05]};
}
export function onTruckRamp(actor,truck){
 const r=mobileRamp(truck);if(!r)return false;
 const dx=actor.x-r.x,dz=actor.z-r.z,u=dx*Math.cos(r.yaw)-dz*Math.sin(r.yaw),v=dx*Math.sin(r.yaw)+dz*Math.cos(r.yaw);
 return Math.abs(u)<r.width/2-.08&&v>=-r.length/2-.6&&v<=r.length/2+.1&&
  Math.abs(angleDiff(actor.yaw,r.yaw))<.55&&actor.y>=r.topY[0]-.25;
}
export function fuelImpact(a,b){
 if(!a?.spec||!b?.spec||!(a.spec.fuelTank||b.spec.fuelTank)||a.health<=0||b.health<=0)return null;
 const relative=Math.hypot(Math.sin(a.yaw)*(a.speed||0)-Math.sin(b.yaw)*(b.speed||0),
  Math.cos(a.yaw)*(a.speed||0)-Math.cos(b.yaw)*(b.speed||0));
 return relative>=12?(a.spec.fuelTank?a:b):null;
}
export function explodeFuelTruck(truck,{cars,state,time,blast}){
 if(truck.fuelExploded)return false;truck.fuelExploded=true;if(truck.regionalTraffic)truck.exploded=true;truck.health=0;truck.speed=0;
 markVehicleWreck(truck,time,true);truck.destroyedUntil=0;blast?.(truck,time);
 for(const c of cars){if(c===truck||!c.mesh?.visible||!c.spec||Math.abs((c.y||0)-(truck.y||0))>7)continue;
  const d=dist(c,truck);if(d>16)continue;c.health=Math.max(0,c.health-(1-d/16)*180*(c.spec.armor||1));
  if(c.health<=0)markVehicleWreck(c,time,true);if(c===state?.car)state.health=c.health;
 }
 if(state?.mode==='foot'&&Math.abs(state.y-(truck.y||0))<7&&dist(state,truck)<16)
  state.health=Math.max(0,state.health-(1-dist(state,truck)/16)*95);
 return true;
}
export function groupBikeSpeed(car,actors,desired){
 if(!car.bikerGroup)return desired;
 if(car.bikerOrder===0){const friends=actors.filter(c=>c!==car&&c.bikerGroup===car.bikerGroup&&c.mesh?.visible);const separation=Math.max(0,...friends.map(c=>dist(c,car)));return separation>65?0:separation>30?desired*.45:desired;}
 const leader=actors.find(c=>c!==car&&c.bikerGroup===car.bikerGroup&&c.bikerOrder===0&&c.mesh?.visible);
 if(!leader)return desired;
 const dx=leader.x-car.x,dz=leader.z-car.z,ahead=dx*Math.sin(car.yaw)+dz*Math.cos(car.yaw),gap=7*(car.bikerOrder||1);
 if(ahead<0)return desired*.85;
 return clamp((leader.speed||desired)+(ahead-gap)*.3,0,desired*1.15);
}
