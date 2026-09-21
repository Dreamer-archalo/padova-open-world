import fs from 'node:fs';
import assert from 'node:assert/strict';

globalThis.window=globalThis;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};
const [{Terrain},{applyCityData},{prepareGameplayMap},{roadStructures}]=await Promise.all([
 import('./dist/terrain.js'),import('./dist/districts.js'),import('./dist/gameplay-areas.js'),import('./dist/road-structures.js'),import('./dist/phase4-terrain-fixes.js')
]);
const read=name=>JSON.parse(fs.readFileSync(new URL('./dist/data/'+name+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);
const terrain=new Terrain(read('terrain'),map,{modern:true});
const structures=roadStructures(terrain);
const report={decks:0,piers:0,portals:0,parapets:0,maxSlabDifference:0,maxPierGroundDifference:0,failures:[]};
for(const box of structures){
 if(box.kind==='deck'){
  report.decks++;
  const top=terrain.roads.sample(box.road,box.x,box.z);
  const difference=Math.abs(box.driveTopMin-top);
  report.maxSlabDifference=Math.max(report.maxSlabDifference,difference);
  if(!Number.isFinite(box.driveTopMin)||difference>.65||Math.abs(box.y-box.minY)>1e-7)
   report.failures.push({kind:'slabMismatch',road:box.road.n||box.road.k,x:box.x,z:box.z,difference});
 }else if(box.kind==='pier'){
  report.piers++;
  const difference=Math.abs(box.minY+.2-terrain.groundHeight(box.x,box.z));
  report.maxPierGroundDifference=Math.max(report.maxPierGroundDifference,difference);
  if(!Number.isFinite(box.minY)||difference>1e-5||box.h<=0)
   report.failures.push({kind:'floatingPier',road:box.road.n||box.road.k,x:box.x,z:box.z,difference});
 }else if(box.kind==='parapet')report.parapets++;
 else if(box.kind==='underpass-pier')report.portals++;
}
assert(report.decks>100,'map-wide bridge coverage missing');
assert(report.piers>10,'map-wide supports missing');
assert.equal(report.failures.length,0,JSON.stringify(report.failures.slice(0,8)));
report.maxSlabDifference=+report.maxSlabDifference.toFixed(4);
report.maxPierGroundDifference=+report.maxPierGroundDifference.toFixed(8);
console.log('PASS citywide bridge slabs remain on their roads and support piers meet rendered ground.');
console.log(JSON.stringify(report));
