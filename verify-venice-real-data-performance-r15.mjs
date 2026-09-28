import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './dist/vendor/three.module.js';
import {SpatialIndex} from './dist/core.js';
import {RegionalWorld} from './dist/regional-world.js';

const map=JSON.parse(fs.readFileSync('dist/data/region-padova-venice.json','utf8')),
 terrain=JSON.parse(fs.readFileSync('dist/data/world-terrain.json','utf8')),
 piazzale=map.places.find(place=>place.name==='Piazzale Roma')||{x:34497.5,z:-3517.7},
 region=new RegionalWorld(new THREE.Scene(),map,terrain,new SpatialIndex(80));
region.quality='low';

let frames=0,maxSliceMs=0;
const started=performance.now();
do{
 const sliceStarted=performance.now();
 region.update({x:piazzale.x,z:piazzale.z,elapsed:frames/60},1/60);
 maxSliceMs=Math.max(maxSliceMs,performance.now()-sliceStarted);
 frames++;
 if(frames>900)throw new Error('Venice streaming did not settle inside the frame budget');
}while(region.queue.length||region.pendingBuild);

let actors=0,triangles=0;
for(const group of region.visible.values()){
 actors+=(group.userData.ambient||[]).length;
 group.traverse(object=>{
  if(!object.isMesh)return;
  const geometry=object.geometry;
  triangles+=(geometry.index?.count||geometry.attributes.position?.count||0)/3;
 });
}
const result={
 cpuMs:Number((performance.now()-started).toFixed(1)),frames,
 maxSliceMs:Number(maxSliceMs.toFixed(1)),sectors:region.visible.size,
 actors,triangles:Math.round(triangles)
};
assert(region.visible.size<=25,'Performance profile loaded too many lagoon sectors: '+region.visible.size);
assert(actors>=10,'Real Venice arrival lost regional street life');
assert(triangles>=20000,'Real Venice arrival lost required geometry');
assert(maxSliceMs<90,'A cooperative build slice blocked too long: '+maxSliceMs.toFixed(1)+' ms');
console.log('PASS R15 real Venice performance:',JSON.stringify(result));
