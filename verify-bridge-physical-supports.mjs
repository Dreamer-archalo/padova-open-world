import assert from 'node:assert/strict';
import {SpatialIndex} from './dist/core.js';
import {roadStructures} from './dist/road-structures.js';
import {vehicleBlocked} from './dist/movement.js';
const bridges=[-100,0,100].map((x,i)=>({b:true,crossing:false,layer:1,k:'primary',w:8,surfaceId:'bridge'+i}));
const lower={b:false,layer:0,k:'secondary',w:6,surfaceId:'lower'};
const terrain={modern:true,prato:()=>false,elevation:()=>0,roads:{
 profiles:new Map(bridges.map((road,i)=>[i,{road,points:[[[ -100,0,100][i],-16],[[ -100,0,100][i],-8],[[ -100,0,100][i],0],[[ -100,0,100][i],8],[[ -100,0,100][i],16]],wet:[false,false,false,false,false]}])),
 sample:road=>road===lower?0:6,
 candidates:(x,z,r)=>Math.abs(x)<25&&Math.abs(z)<=r?[{road:lower,segment:{a:[-25,0],b:[25,0]},height:0,d:Math.abs(z)}]:[]
}};
const boxes=roadStructures(terrain),epsilon=1e-6;
for(const road of bridges){
 const decks=boxes.filter(b=>b.road===road&&b.kind==='deck'),piers=boxes.filter(b=>b.road===road&&b.kind==='pier');
 assert(decks.length>=3,'continuous solid deck required on every bridge');
 assert(piers.length>=2,'each bridge requires structural columns');
 assert(decks.every(b=>b.h>=.6-epsilon),'underside must have visible physical thickness');
 assert(piers.every(p=>p.minY<=0&&decks.some(d=>Math.hypot(d.x-p.x,d.z-p.z)<15&&p.minY+p.h>=d.minY-.06)),'columns must connect actual ground to underside, not stop arbitrarily');
}
const portals=boxes.filter(b=>b.kind==='underpass-pier');
assert.equal(portals.length,2,'side piers at the single underpass without artificial cross-road arch');
assert(portals.every(b=>Math.abs(b.z)>lower.w/2+1),'side piers outside lower road');
const index=new SpatialIndex();for(const b of boxes)index.add(b,b.minX,b.minZ,b.maxX,b.maxZ);
const car={width:2,length:4.2,height:1.6};
assert.equal(vehicleBlocked(0,0,Math.PI/2,index,car,0),false,'car must travel underneath');
assert.equal(vehicleBlocked(0,0,Math.PI/2,index,car,4),true,'vehicle intersecting underside must collide');
assert.equal(vehicleBlocked(0,0,0,index,car,6.05),false,'vehicle must travel on top');
console.log('PASS three bridges: decks + solid piers touch underside; lower and upper lanes accessible; collision consistent');
