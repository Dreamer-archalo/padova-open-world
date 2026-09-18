import assert from 'node:assert/strict';
import {roadStructures} from './dist/road-structures.js';
import {vehicleBlocked} from './dist/movement.js';
import {SpatialIndex} from './dist/core.js';

const road={k:'primary',w:8,b:true,crossing:true,surfaceId:17,layer:1};
const points=[[0,0],[10,0],[20,0],[30,0],[40,0]];
const profile={road,points,wet:points.map(()=>false)};
function setup(candidates=()=>[]){
 const terrain={modern:true,prato:()=>null,elevation:()=>0,groundHeight:()=>-2,
  roads:{profiles:new Map([[road,profile]]),sample:()=>6,candidates}};
 return roadStructures(terrain);
}

// The deck must remain at the level of its own road even when another mapped
// carriageway crosses it slightly lower. Old code moved collision/rendered slab
// boxes to the neighbouring road height, creating a visible gap under asphalt.
const adjacent=setup((x,z,margin)=>margin===0?[{road:{k:'residential',w:7},height:4.5}]:[]);
const slabs=adjacent.filter(b=>b.kind==='deck');
assert.equal(slabs.length,4);
for(const deck of slabs){
 assert.equal(deck.road,road);
 assert(Math.abs(deck.driveTopMin-6)<1e-8,'deck must keep its own road level');
 assert(Math.abs(deck.minY-5.53)<1e-8,'slab must not be relocated to an underpass');
 assert.equal(deck.y,deck.minY);
}

const bridge=setup(),piers=bridge.filter(b=>b.kind==='pier');
assert(piers.length>=2,'bridge must have visible supporting pillars');
for(const pier of piers){
 assert(Math.abs(pier.minY+2.2)<1e-8,'pillar bottom must meet the visible river bed');
 assert(Math.abs(pier.minY+pier.h-6)<1e-8,'pillar top must meet its deck');
}

// Bridge slab collision must still block an actor passing through its volume,
// while an actor already on the driving deck is exempt from the slab itself.
const collision=new SpatialIndex(60);
for(const deck of slabs)collision.add(deck,deck.minX,deck.minZ,deck.maxX,deck.maxZ);
const car={width:2,length:4.08,height:1.46};
assert(vehicleBlocked(5,0,Math.PI/2,collision,car,5),'collision below the deck');
assert(!vehicleBlocked(5,0,Math.PI/2,collision,car,6.05),'driving surface clear');
console.log('PASS bridge road-local slabs, ground-anchored piers and vehicle collision separation.');
