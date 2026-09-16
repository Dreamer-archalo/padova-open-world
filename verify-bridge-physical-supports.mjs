import assert from 'node:assert/strict';
import {SpatialIndex} from './dist/core.js';
import {roadStructures} from './dist/road-structures.js';
import {vehicleBlocked} from './dist/movement.js';

// Three independent elevated spans, with a perpendicular live road below the
// central span. The same generated boxes feed the real renderer and collision.
const bridges=[-100,0,100].map((x,i)=>({b:true,crossing:false,layer:1,k:'primary',w:8,surfaceId:'bridge'+i}));
const lower={b:false,layer:0,k:'secondary',w:6,surfaceId:'lower'};
const terrain={
 modern:true,prato:()=>false,elevation:()=>0,
 roads:{
  profiles:new Map(bridges.map((road,i)=>[i,{road,points:[[-100,0,100][i]===undefined?[0,-16]:[[-100,0,100][i],-16],[-100,0,100][i]===undefined?[0,-8]:[[-100,0,100][i],-8],[[ -100,0,100][i],0],[[ -100,0,100][i],8],[[ -100,0,100][i],16]],wet:[false,false,false,false,false]}])),
  sample:(road)=>road===lower?0:6,
  candidates:(x,z,r)=>Math.abs(x)<25&&Math.abs(z)<=r?[{road:lower,segment:{a:[-25,0],b:[25,0]},height:0,d:Math.abs(z)}]:[]
 }
};
const boxes=roadStructures(terrain);
const epsilon=1e-6;
for(const road of bridges){
 const deck=boxes.filter(b=>b.road===road&&b.kind==='deck');
 const piers=boxes.filter(b=>b.road===road&&b.kind==='pier');
 assert(deck.length>=3,'each bridge must have a complete solid deck');
 assert(piers.length>=2,'each bridge needs visible physical columns, not just road texture');
 assert(deck.every(b=>b.h>=.6-epsilon),'elevated deck must have visible thickness from below');
 assert(piers.every(b=>b.minY<=0&&b.minY+b.h>=5.9),'columns must connect ground to elevated roadway');
}
const portals=boxes.filter(b=>b.kind==='underpass-pier');
assert.equal(portals.length,2,'one pair of side piers, not an obstructing fake arch');
assert(portals.every(b=>Math.abs(b.z)>lower.w/2+1),'side piers must lie outside lower road');
const index=new SpatialIndex();for(const box of boxes)index.add(box,box.minX,box.minZ,box.maxX,box.maxZ);
const car={width:2,length:4.2,height:1.6};
assert.equal(vehicleBlocked(0,0,Math.PI/2,index,car,0),false,'lower road vehicle must pass under the bridge');
assert.equal(vehicleBlocked(0,0,Math.PI/2,index,car,4.0),true,'bridge deck must physically block vehicles that intersect its underside');
assert.equal(vehicleBlocked(0,0,0,index,car,6.05),false,'upper road vehicle must cross over the deck');
console.log('PASS three independent bridge spans: solid thick decks, visible load-bearing piers, open lower carriageway and consistent height-aware collision');
