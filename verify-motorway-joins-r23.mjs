import assert from 'node:assert/strict';
import {t} from './tools/controller-harness.mjs';
import {groundContact,groundVehicleStep} from './dist/vehicle-dynamics.js';
import {VEHICLES} from './dist/vehicles.js';
import {vehicleBlocked} from './dist/movement.js';

for(const [x,z] of [[5948,1954],[-1899,4129]]){
 const lanes=t.terrain.roads.candidates(x,z,5).filter(s=>/^(motorway|trunk)_link$/.test(s.road.k));
 assert(lanes.length>=2,`both merging lanes mapped at ${x},${z}`);
 const heights=lanes.map(s=>s.height);
 assert(Math.max(...heights)-Math.min(...heights)<.4,`overlapping lanes must meet before their common vertex at ${x},${z}`);
 for(const h of heights)assert(Math.abs(t.terrain.height(x,z,h+.075)-(h+.075))<.2,'driveable contact follows the visible lane');
 for(const lane of lanes){
  const s=lane.segment,dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],length=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);
  for(let offset=-6;offset<=6;offset++){
   const px=x+dx/length*offset,pz=z+dz/length*offset,h=t.terrain.roads.sample(lane.road,px,pz);
   assert(Math.abs(t.terrain.height(px,pz,h+.075)-h-.075)<.2,'merge lane keeps its own driving level');
   for(const heading of [yaw,yaw+Math.PI])assert(!vehicleBlocked(px,pz,heading,t.world.collision,VEHICLES.mito,h+.075),
    `clear swept footprint along both merge approaches at ${px},${pz}`);
  }
 }
}

const goals=t.terrain.arcadeRamps.filter(r=>r.target);
assert(goals.length>=2,'roadside launch sites lead to two mapped receiving roads');
for(const ramp of goals){
 const actor={x:ramp.x-Math.sin(ramp.yaw)*(ramp.length/2+7),z:ramp.z-Math.cos(ramp.yaw)*(ramp.length/2+7),y:0,yaw:ramp.yaw,speed:25};
 actor.y=groundContact(t.terrain,actor.x,actor.z).y;
 const car={spec:VEHICLES.mito};let launched=false,landed=false,blocked=false;
 for(let i=0;i<360;i++){
  const motion=groundVehicleStep(actor,car,{turn:0,handbrake:false},1/60,t.terrain,t.world.collision);
  launched ||= motion.launched;
  if(motion.hitSpeed){blocked=true;break;}
  if(motion.landed){landed=true;break;}
 }
 assert.equal(car.lastRampBoost,ramp.name,'the approach pad gives the launch its speed');
 assert(launched&&landed&&!blocked,`${ramp.name} launches and lands without a collision`);
 assert(Math.hypot(actor.x-ramp.target.x,actor.z-ramp.target.z)<5,`${ramp.name} lands through its marked gate`);
 assert(t.terrain.roads.candidates(actor.x,actor.z,2).some(s=>
  (s.road.n||s.road.k)===ramp.target.road&&s.d<s.road.w/2),`${ramp.name} reaches the receiving carriageway`);
}
assert.equal(t.world.structures.filter(s=>s.kind==='jump-gate-sign').length,goals.length,'every receiving road has a visible stunt gate');
console.log(`PASS two motorway merge lanes and ${goals.length} boosted road-to-road jumps with landings.`);
