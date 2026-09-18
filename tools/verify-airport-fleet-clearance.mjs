import assert from 'node:assert/strict';
import {t} from './controller-harness.mjs';
import {AIRPORT,areaPoint} from '../dist/gameplay-areas.js';
import {AIRPORT_FLEET} from '../dist/airport-air-traffic.js';
import {VEHICLES} from '../dist/vehicles.js';
import {vehicleBlocked} from '../dist/movement.js';

const dimensions={cargo:{width:33,length:24,height:7},jet:{width:12,length:14,height:4}};
const footprint=a=>dimensions[a.type]||VEHICLES[a.type];
let clear=0;
for(const a of AIRPORT_FLEET){
 const p=areaPoint(AIRPORT,...a.slot),spec=footprint(a),y=t.terrain.height(p.x,p.z);
 assert(Number.isFinite(y)&&t.terrain.dry(p.x,p.z,spec.width/2,y),'wet airport aircraft parking bay: '+a.id);
 assert(!vehicleBlocked(p.x,p.z,AIRPORT.yaw,t.world.collision,spec,y),'aircraft parking bay blocked by authored building/fence: '+a.id);
 for(const offset of [-2,0,2]){
  const next=areaPoint(AIRPORT,a.slot[0]+offset,a.slot[1]),level=t.terrain.height(next.x,next.z);
  assert(!vehicleBlocked(next.x,next.z,AIRPORT.yaw,t.world.collision,spec,level),'aircraft parking clearance blocked: '+a.id+' / '+offset);
  clear++;
 }
}
assert.equal(clear,30,'all ten aircraft bays sampled');
console.log('PASS AIRPORT_FLEET_CLEARANCE '+JSON.stringify({aircraft:AIRPORT_FLEET.length,parkingSamples:clear,cargo:4,jets:2}));
