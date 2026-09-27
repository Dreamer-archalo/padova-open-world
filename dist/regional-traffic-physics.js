// The same traffic/vehicle/impact solvers used in Padova are shared with
// streamed communes. LOD changes entity count, never vehicle identity or physics.
import {clamp,angleDiff,dist} from './core.js';
import {trafficLane,trafficSpeed,advanceTrafficSpeed,laneOffset,laneCount} from './traffic.js';
import {groundVehicleStep,steeringRate,groundContact,resetGroundMotion} from './vehicle-dynamics.js';
import {vehiclePerformanceFactor,updateVehicleDamage} from './vehicle-damage.js';
import {impactResponse} from './incidents.js';
import {vehiclesOverlap} from './vehicles.js';

const alwaysGreen={junctions:new Map(),allowed:()=>true};
export const REGIONAL_NPC_RADIUS=460;

export function regionalTarget(actor){
 const r=actor.r,to=actor.dir===1?r.b:r.a,
  dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],len=Math.hypot(dx,dz)||1,
  yaw=Math.atan2(dx*actor.dir,dz*actor.dir),
  offset=actor.laneOffset??laneOffset(r,actor.lane||0);
 return {x:to[0]+Math.cos(yaw)*offset,z:to[1]-Math.sin(yaw)*offset,yaw};
}
export function regionalRoadEligible(r,car){
 if(r.w<Math.max(3.25,car.spec.width+1.1)||/footway|path|steps|cycleway|pedestrian|construction/.test(r.k||''))return false;
 if(r.oneway===1&&car._candidateDir===-1||r.oneway===-1&&car._candidateDir===1)return false;
 if(/motorway|trunk/.test(r.k||'')&&car.spec.family==='city'&&r.w<5)return false;
 return true;
}
export function regionalNpcStep(car,nearby,player,dt,terrain,collision,time){
 if(!car?.mesh?.visible||car.parked||car.health<=0||!car.r)return null;
 car.road=car.r;
 const target=regionalTarget(car);
 const actors=nearby.filter(a=>a!==car&&a.mesh?.visible&&dist(a,car)<85);
 if(player&&player.mode==='foot'&&dist(player,car)<55)actors.push({
  ...player,mesh:{visible:true},spec:{width:.55,length:.55,height:1.8},speed:player.speed||0
 });
 const nextYaw=car.nextYaw??null;
 trafficLane(car,target,actors,player?.car||player,time,nextYaw);
 // A physical lane offset is computed on each OSM road, as in Padova.
 const approach=regionalTarget(car),
  aim=Math.atan2(approach.x-car.x,approach.z-car.z),
  turnError=angleDiff(aim,car.yaw),endDistance=dist(car,approach);
 let desired=trafficSpeed(car,approach,actors,alwaysGreen,time,{nextYaw});
 desired*=vehiclePerformanceFactor(car.health);
 // Braking for hairpin turns and a hard junction, not instant teleporting.
 if(nextYaw!==null&&endDistance<Math.max(17,car.speed*1.3)){
  const bend=Math.abs(angleDiff(nextYaw,car.yaw));
  desired=Math.min(desired,Math.max(3.5,car.spec.max*(1-bend/Math.PI)*.5));
 }
 if(Math.abs(turnError)>.36)desired=Math.min(desired,Math.max(3.2,car.spec.max/(1+Math.abs(turnError)*3)));
 // At grade-separated motorway interchanges actors may not switch to an
 // overpass: connectivity is resolved by RegionalWorld before this step.
 advanceTrafficSpeed(car,desired,dt);
 const steer=steeringRate(car.spec,Math.max(1,car.speed)),
  turn=clamp(turnError/Math.max(.01,steer*dt),-1,1);
 const hit=groundVehicleStep(car,car,{turn,handbrake:false},dt,terrain,collision);
 if(hit.hitSpeed>3.8){const response=impactResponse(hit.hitSpeed);car.health=Math.max(0,car.health-response.damage*(car.spec.armor||1));car.crashAt=time;}
 if(hit.landed&&hit.landingSpeed>12)car.health=Math.max(0,car.health-(hit.landingSpeed-12)*3*(car.spec.armor||1));
 // Same broad-phase dimensions and overlap test as the playable vehicles.
 if(time>(car.lastCollision||0)+.8)for(const other of actors){
  if(!other.spec||!other.mesh?.visible||Math.abs((other.y||0)-car.y)>Math.max(car.spec.height,other.spec.height))continue;
  if(dist(car,other)>(car.spec.length+other.spec.length)*.58+1)continue;
  if(!vehiclesOverlap(car,other))continue;
  const impact=Math.abs(car.speed-(other.speed||0));
  if(impact<2.5)continue;
  const response=impactResponse(impact);
  car.health=Math.max(0,car.health-response.damage*.65*(car.spec.armor||1));
  if(other.regionalTraffic){other.health=Math.max(0,other.health-response.damage*.48*(other.spec.armor||1));other.speed=Math.max(0,other.speed*.28);other.lastCollision=time;}
  else if(other===player?.car){other.health=Math.max(0,other.health-response.damage*.55*(other.spec.armor||1));player.health=other.health;}
  car.speed=Math.max(0,car.speed*.16);car.lastCollision=time;car.crashAt=time;
  break;
 }
 // The camera and E-to-enter logic read these same coordinates, never
 // unrelated decorative silhouettes.
 const contact=groundContact(terrain,car.x,car.z,car.y);
 if(!car.jump?.airborne)car.y=contact.y;
 car.mesh.position.set(car.x,car.y,car.z);
 car.mesh.rotation.set(car.pitch||0,car.yaw,0,'YXZ');
 updateVehicleDamage(car,car.health,time);
 return hit;
}
export function reviveRegionalCar(car,x,z,yaw,terrain){
 Object.assign(car,{x,z,y:terrain.height(x,z),yaw,speed:0,health:100,parked:false,
  crashAt:0,lastCollision:0,nextYaw:null,longAccel:0,lane:0,desiredLane:0,laneOffset:0});
 resetGroundMotion(car);car.mesh.visible=true;updateVehicleDamage(car,100);
}
