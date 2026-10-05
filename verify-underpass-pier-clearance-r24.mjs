import assert from 'node:assert/strict';
import {t} from './tools/controller-harness.mjs';
import {vehicleFootprint,polygonsOverlap} from './dist/movement.js';
import {VEHICLES} from './dist/vehicles.js';

const piers=t.world.structures.filter(s=>s.kind==='underpass-pier');
assert(piers.length>100,'real bridge supports remain in the world');
assert(t.terrain.roads.gradeCrossings.length>=400,'audit the whole mapped expressway network');
let checked=0,medianContacts=0;
for(const c of t.terrain.roads.gradeCrossings){
 for(const [road,segment] of [[c.lower,c.lowerSegment],[c.upper,c.upperSegment]]){
 const from=road.p[segment-1],to=road.p[segment];
 const yaw=Math.atan2(to[0]-from[0],to[1]-from[1]);
 const y=t.terrain.roads.sample(road,c.x,c.z)+.075;
 for(const heading of [yaw,yaw+Math.PI]){
  const footprint=vehicleFootprint(c.x,c.z,heading,VEHICLES.mito.width,VEHICLES.mito.length);
  const blocking=[...t.world.collision.near(c.x,c.z,4)].filter(b=>
   !(b.driveTopMin!==undefined&&y>=b.driveTopMin-VEHICLES.mito.length*.045-.15)&&
   y+VEHICLES.mito.height>b.minY&&y<b.minY+b.h&&polygonsOverlap(footprint,b.p));
  assert(blocking.every(b=>b.kind==='median'),`structure blocks ${road.n||road.k} at ${c.x},${c.z}: ${blocking.map(b=>b.kind)}`);
  medianContacts+=blocking.length;
  checked++;
 }
 }
}
assert(medianContacts>0,'central dividers stay solid');
console.log(`PASS ${piers.length} underpass supports; ${checked} upper/lower driving headings clear of bridge structures; ${medianContacts} intended median contacts.`);
