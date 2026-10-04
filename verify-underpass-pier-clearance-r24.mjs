import assert from 'node:assert/strict';
import {t} from './tools/controller-harness.mjs';
import {vehicleFootprint,polygonsOverlap} from './dist/movement.js';
import {VEHICLES} from './dist/vehicles.js';

const piers=t.world.structures.filter(s=>s.kind==='underpass-pier');
assert(piers.length>100,'real bridge supports remain in the world');
let checked=0;
for(const c of t.terrain.roads.gradeCrossings){
 const road=c.lower,from=road.p[c.lowerSegment-1],to=road.p[c.lowerSegment];
 const yaw=Math.atan2(to[0]-from[0],to[1]-from[1]);
 const y=t.terrain.roads.sample(road,c.x,c.z)+.075;
 for(const heading of [yaw,yaw+Math.PI]){
  const footprint=vehicleFootprint(c.x,c.z,heading,VEHICLES.mito.width,VEHICLES.mito.length);
  const blocking=[...t.world.collision.near(c.x,c.z,4)].filter(b=>
   b.kind==='underpass-pier'&&y+VEHICLES.mito.height>b.minY&&y<b.minY+b.h&&polygonsOverlap(footprint,b.p));
  assert.equal(blocking.length,0,`bridge support blocks ${road.n||road.k} at ${c.x},${c.z}`);
  checked++;
 }
}
console.log(`PASS ${piers.length} underpass supports; ${checked} lower-road driving headings unobstructed.`);
