import fs from 'node:fs';
import assert from 'node:assert/strict';

globalThis.window=globalThis;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};
const [{Terrain},{applyCityData},{prepareGameplayMap}]=await Promise.all([import('./dist/terrain.js'),import('./dist/districts.js'),import('./dist/gameplay-areas.js'),import('./dist/phase4-terrain-fixes.js')]);
const read=name=>JSON.parse(fs.readFileSync(new URL('./dist/data/'+name+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);
const terrain=new Terrain(read('terrain'),map,{modern:true});
const pedestrian=/^(pedestrian|footway|path|cycleway|steps)$/;
const excluded=/^(motorway|motorway_link|trunk|trunk_link|track|tram)$/;
const report={pedSegments:0,ordinarySegments:0,sidewalkSamples:0,nonFinite:0,pedSupportMismatch:0,sidewalkSupportMismatch:0,sidewalkAbsent:0,overlapHeightConflict:0,maxPedMismatch:0,maxSidewalkMismatch:0,examples:[]};
const note=(kind,p,x,z,extra)=>{if(report.examples.length<35)report.examples.push({kind,road:p.road.n||p.road.k,x:+x.toFixed(1),z:+z.toFixed(1),...extra});};
for(const p of terrain.roads.profiles.values()){
 const road=p.road,isPed=pedestrian.test(road.k);
 if(excluded.test(road.k))continue;
 for(let i=1;i<p.points.length;i++){
  const a=p.points[i-1],b=p.points[i],mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2,deck=terrain.roads.sample(road,mx,mz),dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.01||terrain.prato(mx,mz))continue;
  if(isPed){
   report.pedSegments++;
   const contact=terrain.height(mx,mz,deck+.05),delta=Math.abs(contact-(deck+.05));
   report.maxPedMismatch=Math.max(report.maxPedMismatch,delta);
   if(!Number.isFinite(contact)||!Number.isFinite(deck)){report.nonFinite++;note('ped-nonfinite',p,mx,mz,{contact,deck});}
   else if(delta>.35){report.pedSupportMismatch++;note('ped-contact',p,mx,mz,{delta:+delta.toFixed(3),deck:+deck.toFixed(3),contact:+contact.toFixed(3)});}
   continue;
  }
  report.ordinarySegments++;
  if(road.crossing||road.tunnel||Number(road.layer)||road.w<2.4)continue;
  const nx=-dz/len,nz=dx/len;
  for(const side of [-1,1]){
   const x=mx+nx*side*(road.w/2+.65),z=mz+nz*side*(road.w/2+.65);
   if(terrain.waterDistance(x,z)<1.25)continue;
   const others=terrain.roads.candidates(x,z,.15).filter(s=>s.road!==road);
   const sameLevel=others.some(s=>Math.abs(s.height-deck)<1.2);
   if(sameLevel)continue; // A junction, not an uninterrupted sidewalk.
   report.sidewalkSamples++;
   const contact=terrain.height(x,z,deck+.05),ground=terrain.groundHeight(x,z),delta=Math.abs(contact-(deck+.05));
   report.maxSidewalkMismatch=Math.max(report.maxSidewalkMismatch,delta);
   if(!Number.isFinite(contact)||!Number.isFinite(ground)){report.nonFinite++;note('sidewalk-nonfinite',p,x,z,{contact,ground});}
   else if(delta>.55){report.sidewalkSupportMismatch++;note('sidewalk-contact',p,x,z,{delta:+delta.toFixed(3),ground:+ground.toFixed(3),deck:+deck.toFixed(3)});}
   const unexpected=others.find(s=>Math.abs(s.height-deck)>2&&Math.abs(s.height-ground)<.5);
   if(unexpected){report.overlapHeightConflict++;note('overlap-ground-ownership',p,x,z,{deck:+deck.toFixed(2),other:+unexpected.height.toFixed(2),ground:+ground.toFixed(2)});}
  }
 }
}
console.log('WALKABILITY_AUDIT '+JSON.stringify(report));
assert(report.pedSegments>1000&&report.sidewalkSamples>1000,'Citywide pedestrian coverage was not sampled');
assert.equal(report.nonFinite,0,'Non-finite pedestrian or sidewalk support');
if(report.pedSupportMismatch||report.sidewalkSupportMismatch||report.overlapHeightConflict)process.exitCode=1;
