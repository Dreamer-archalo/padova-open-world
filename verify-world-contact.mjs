import fs from 'node:fs';
import * as THREE from './dist/vendor/three.module.js';

globalThis.window=globalThis;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};

// Load the same terrain prototype patches as phase2-runtime, in production order.
await import('./dist/phase4-terrain-fixes.js');
await import('./dist/historic-terrain-level.js');
await import('./dist/historic-plaza-alignment.js');
const [{Terrain},{CityWorld},{applyCityData},{prepareGameplayMap,VILLA,HOME}]=await Promise.all([
 import('./dist/terrain.js'),import('./dist/world.js'),import('./dist/districts.js'),import('./dist/gameplay-areas.js')
]);
const load=name=>JSON.parse(fs.readFileSync(new URL('./dist/data/'+name+'.json',import.meta.url)));
const map=load('padova');applyCityData(map,load('city'));prepareGameplayMap(map);
console.log('[World contact] source buildings',map.buildings.length,'roads',map.roads.length);
const terrain=new Terrain(load('terrain'),map,{modern:true});
const top=(rows,key,limit=8)=>rows.sort((a,b)=>b[key]-a[key]).slice(0,limit);
const x0=VILLA.x,z0=VILLA.z,samples=[],peaks=[],roads=[],bad=[];
let values=0,closeToRoad=0;
for(let dz=-140;dz<=140;dz+=7)for(let dx=-140;dx<=140;dx+=7){
 const x=x0+dx,z=z0+dz,ground=terrain.groundHeight(x,z),elev=terrain.elevation(x,z),drive=terrain.height(x,z),near=terrain.roads.at(x,z,null,.3),water=terrain.waterDistance(x,z),platform=terrain.platformAt(x,z);
 if(![ground,elev,drive].every(Number.isFinite))throw new Error('Nonfinite world contact '+JSON.stringify({dx,dz,ground,elev,drive}));
 const row={dx,dz,ground:+ground.toFixed(2),elev:+elev.toFixed(2),drive:+drive.toFixed(2),water:+water.toFixed(1),road:near?.road?.n||near?.road?.k||null,bridge:!!near?.road?.crossing,platform:!!platform};samples.push(row);values++;
 if(near&&!near.road.crossing&&!near.road.tunnel&&!near.road.b&&!Number(near.road.layer)){
  closeToRoad++;const deck=terrain.roads.sample(near.road,x,z),gap=Math.abs(ground-deck),physGap=Math.abs(drive-deck);if(gap>.8||physGap>.35)roads.push({...row,gap:+gap.toFixed(2),physGap:+physGap.toFixed(2),deck:+deck.toFixed(2)});
 }
 if(water>12&&!platform){for(const [ddx,ddz] of [[3,0],[0,3]]){const next=terrain.groundHeight(x+ddx,z+ddz),delta=Math.abs(next-ground);if(delta>1)peaks.push({...row,ddx,ddz,delta:+delta.toFixed(2)});}}
}
console.log('[World contact] villa grid',JSON.stringify({sampleCount:values,roads:closeToRoad,roadGaps:roads.length,steepGround:peaks.length,worstRoad:top(roads,'gap'),worstSlopes:top(peaks,'delta')},null,2));
const center={x:HOME.x,z:HOME.z},platform=terrain.platformAt(center.x,center.z),homeHeight=terrain.height(center.x,center.z),homeGround=terrain.groundHeight(center.x,center.z);
console.log('[World contact] villa spawn',JSON.stringify({HOME,platformHeight:platform?.height,homeHeight,homeGround,elevation:terrain.elevation(center.x,center.z)},null,2));
const scene=new THREE.Scene(),started=performance.now(),world=new CityWorld(scene,map,terrain,'hyper');
console.log('[World contact] world initialized in',Math.round(performance.now()-started),'ms; buildings',world.data.buildings.length,'chunks',world.chunks.size);
const key=Math.floor(HOME.x/320)+','+Math.floor(HOME.z/320),chunk=world.chunks.get(key);
console.log('[World contact] spawn chunk',key,JSON.stringify({buildings:chunk?.buildings?.length,roads:chunk?.roads?.length,structures:chunk?.structures?.length}));
if(!chunk)throw new Error('Spawn chunk missing');
const began=performance.now();for(const _ of world.buildStageSteps(key,'core')){};
console.log('[World contact] core built',Math.round(performance.now()-began),'ms');
const root=world.loaded.get(key);if(!root?.userData.coreReady)throw new Error('Core chunk was not installed');
let triangles=0,invalid=0,steep=0,maxGrade=0,maxVertexDiff=0,range=[Infinity,-Infinity],sampleExamples=[];
for(const mesh of root.userData.core.children){
 if(!mesh.isMesh||mesh.material!==world.groundMat)continue;
 const p=mesh.geometry?.attributes?.position;if(!p)continue;
 for(let i=0;i+2<p.count;i+=3){
  const a=[p.getX(i),p.getY(i),p.getZ(i)],b=[p.getX(i+1),p.getY(i+1),p.getZ(i+1)],c=[p.getX(i+2),p.getY(i+2),p.getZ(i+2)];triangles++;
  if(![...a,...b,...c].every(Number.isFinite)){invalid++;continue;}
  for(const v of [a,b,c]){
   range[0]=Math.min(range[0],v[1]);range[1]=Math.max(range[1],v[1]);
   const expected=terrain.groundHeight(v[0],v[2])-.08,delta=Math.abs(v[1]-expected);
   if(delta>maxVertexDiff)maxVertexDiff=delta;
  }
  for(const [u,v] of [[a,b],[b,c],[c,a]]){const flat=Math.hypot(u[0]-v[0],u[2]-v[2]),dy=Math.abs(u[1]-v[1]);if(flat<.01)continue;const grade=dy/flat;maxGrade=Math.max(maxGrade,grade);if(grade>.6){steep++;if(sampleExamples.length<10)sampleExamples.push({x:+u[0].toFixed(1),z:+u[2].toFixed(1),dy:+dy.toFixed(2),flat:+flat.toFixed(2),grade:+grade.toFixed(2)});}}
 }
}
console.log('[World contact] ground meshes',JSON.stringify({triangles,invalid,steep,maxGrade:+maxGrade.toFixed(3),maxVertexDiff:+maxVertexDiff.toFixed(3),range,sampleExamples},null,2));
if(!triangles)throw new Error('No ground triangles generated');
if(invalid)throw new Error('Nonfinite ground mesh');
