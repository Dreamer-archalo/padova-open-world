import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Terrain} from './dist/terrain.js';
import {roadStructures} from './dist/road-structures.js';
import {vehicleFootprint,polygonsOverlap} from './dist/movement.js';
import {SpatialIndex} from './dist/core.js';
import {VEHICLES} from './dist/vehicles.js';
import {surfaceBatch} from './dist/surface-layers.js';

const read=name=>JSON.parse(fs.readFileSync(new URL(`./dist/data/${name}.json`,import.meta.url)));
const map=read('padova'),terrain=new Terrain(read('terrain'),map,{modern:true});
const selected=new Set(['Corso Irlanda','Cavalcavia Charles Darwin','Via Bassette','Nuova Strada del Santo']);
const crossings=terrain.roads.gradeCrossings.filter(c=>c.upper.n==='Autostrada Serenissima'&&c.lower.n==='Corso Irlanda');
assert.equal(crossings.length,4,'both motorway carriageways cross both ring-road carriageways');
for(const c of crossings){
 const upper=terrain.roads.sample(c.upper,c.x,c.z),lower=terrain.roads.sample(c.lower,c.x,c.z);
 assert(upper-lower>=5.2,'Serenissima must pass above Corso Irlanda');
 for(const y of [upper,lower])assert(Math.abs(terrain.height(c.x,c.z,y+.075)-y-.075)<.3,'each crossing keeps its own driving level');
}
const structures=new SpatialIndex(60);
for(const b of roadStructures(terrain))structures.add(b,b.minX,b.minZ,b.maxX,b.maxZ);
const ends=new Map();let samples=0,bassetteSamples=0,seams=0;
for(const p of terrain.roads.profiles.values())if(selected.has(p.road.n)){
 const road=p.road;
 for(const q of [road.p[0],road.p.at(-1)]){
  const key=q.join(','),y=terrain.roads.sample(road,...q);
  if(ends.has(key)){assert(Math.abs(ends.get(key)-y)<.02,'connected corridor ways must have no height step');seams++;}
  ends.set(key,y);
 }
 for(let i=1;i<p.points.length;i++){
  const a=p.points[i-1],b=p.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]),yaw=Math.atan2(b[0]-a[0],b[1]-a[1]);
  assert(Math.abs(terrain.roads.sample(road,...b)-terrain.roads.sample(road,...a))/length<=.061,'driveable corridor approach grade');
  for(const fraction of [0,.5,1])for(const side of [-.45,0,.45]){
   const x=a[0]+(b[0]-a[0])*fraction+Math.cos(yaw)*side*road.w,z=a[1]+(b[1]-a[1])*fraction-Math.sin(yaw)*side*road.w;
   const y=terrain.roads.sample(road,x,z);
   assert(terrain.groundHeight(x,z)-y<.06,`${road.n}: soil must stay below asphalt across the carriageway at ${x},${z}`);samples++;
  }
  if(road.n==='Via Bassette'){
   const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,y=terrain.roads.sample(road,x,z)+.075;
   for(const heading of [yaw,yaw+Math.PI]){
    const fp=vehicleFootprint(x,z,heading,VEHICLES.mito.width,VEHICLES.mito.length);
    const blockers=[...structures.near(x,z,5)].filter(b=>
     !(b.driveTopMin!==undefined&&y>=b.driveTopMin-VEHICLES.mito.length*.045-.15)&&
     y+VEHICLES.mito.height>b.minY&&y<b.minY+b.h&&polygonsOverlap(fp,b.p));
    assert.equal(blockers.length,0,'Via Bassette is free of deck/pier/parapet obstructions');bassetteSamples++;
   }
  }
 }
}
// A land-use polygon callback returning the bridge must still draw its grass
// underneath. Exercise the real renderer wrapper, not just terrain heights.
const bridge=map.roads.find(r=>r.n==='Nuova Strada del Santo'&&r.b),q=bridge.p[0],vertices=[];
const writer=surfaceBatch({tri:(...args)=>vertices.push(...args.slice(0,3))},terrain,{height:(x,z)=>terrain.height(x,z)-.02});
writer.tri([q[0]-.2,0,q[1]-.2],[q[0]+.2,0,q[1]-.2],[q[0],0,q[1]+.2],{});
assert(vertices.length>0);
for(const v of vertices)assert(v[1]<=terrain.groundHeight(v[0],v[2])-.079,'land-use polygon stays at ground level below the bridge');
assert(samples>7000&&bassetteSamples>400&&seams>20,`coverage includes full named road chains and both directions of Bassette: ${samples}, ${bassetteSamples}, ${seams}`);
console.log(`PASS R25: 4 A4 overpasses, ${samples} road-width samples, ${seams} continuous seams, ${bassetteSamples} clear Bassette headings and grass beneath bridges.`);
