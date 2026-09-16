import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from './dist/vendor/three.module.js';
globalThis.window=globalThis;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};
// Apply exactly the production patch order, not isolated Terrain's prototype.
await import('./dist/phase4-terrain-fixes.js');
await import('./dist/historic-terrain-level.js');
await import('./dist/historic-plaza-alignment.js');
const [{Terrain},{CityWorld},{applyCityData},{prepareGameplayMap,VILLA,HOME}]=await Promise.all([import('./dist/terrain.js'),import('./dist/world.js'),import('./dist/districts.js'),import('./dist/gameplay-areas.js')]);
const load=name=>JSON.parse(fs.readFileSync(new URL('./dist/data/'+name+'.json',import.meta.url)));
const map=load('padova');applyCityData(map,load('city'));prepareGameplayMap(map);
const terrain=new Terrain(load('terrain'),map,{modern:true});
const top=(rows,key,limit=6)=>rows.sort((a,b)=>b[key]-a[key]).slice(0,limit);
const centre={x:HOME.x,z:HOME.z},platform=terrain.platformAt(centre.x,centre.z),homeHeight=terrain.height(centre.x,centre.z),homeGround=terrain.groundHeight(centre.x,centre.z);
console.log('[World contact] spawn datum',JSON.stringify({platform:platform?.height,physics:homeHeight,visibleGround:homeGround,elevation:terrain.elevation(centre.x,centre.z)}));
assert(platform,'Villa authored platform missing');
assert(Math.abs(homeHeight-platform.height)<.20,'Player/motorcycle above or below Villa authored platform');
assert(Math.abs(homeGround-platform.height)<.20,'Visible ground does not coincide with Villa platform');
const x0=VILLA.x,z0=VILLA.z,roads=[],peaks=[],walkways=[],carRoads=[];
let count=0,roadCount=0;
for(let dz=-140;dz<=140;dz+=7)for(let dx=-140;dx<=140;dx+=7){
 const x=x0+dx,z=z0+dz,ground=terrain.groundHeight(x,z),elev=terrain.elevation(x,z),drive=terrain.height(x,z),near=terrain.roads.at(x,z,null,.3),water=terrain.waterDistance(x,z),area=terrain.platformAt(x,z);
 assert([ground,elev,drive].every(Number.isFinite),'Nonfinite terrain contact '+JSON.stringify({dx,dz}));count++;
 if(area){assert(Math.abs(ground-area.height)<.20,'Authored area ground overrides plateau '+JSON.stringify({dx,dz,ground,areaHeight:area.height}));assert(Math.abs(drive-area.height)<.30,'Authored area physics overrides plateau '+JSON.stringify({dx,dz,drive,areaHeight:area.height}));}
 if(near&&!near.road.crossing&&!near.road.tunnel&&!near.road.b&&!Number(near.road.layer)){
  roadCount++;const deck=terrain.roads.sample(near.road,x,z),gap=Math.abs(ground-deck),physicsGap=Math.abs(drive-deck),row={dx,dz,road:near.road.n||near.road.k,kind:near.road.k,gap:+gap.toFixed(2),physicsGap:+physicsGap.toFixed(2),ground:+ground.toFixed(2),roadHeight:+deck.toFixed(2)};
  if(gap>.8||physicsGap>.35)roads.push(row);
  (/^(footway|pedestrian|cycleway|path|steps)$/.test(near.road.k)?walkways:carRoads).push(row);
 }
 if(water>12&&!area)for(const [ddx,ddz] of [[3,0],[0,3]]){const delta=Math.abs(terrain.groundHeight(x+ddx,z+ddz)-ground);if(delta>1)peaks.push({dx,dz,ddx,ddz,delta:+delta.toFixed(2)});}
}
console.log('[World contact] Villa grid',JSON.stringify({sampleCount:count,roadCount,roadGaps:roads.length,steepGround:peaks.length,worstRoads:top(roads,'gap'),worstWalkways:top(walkways,'gap'),worstCarRoads:top(carRoads,'gap'),worstSlopes:top(peaks,'delta')},null,2));
const scene=new THREE.Scene(),started=performance.now(),world=new CityWorld(scene,map,terrain,'hyper');
const key=Math.floor(HOME.x/320)+','+Math.floor(HOME.z/320),chunk=world.chunks.get(key);
assert(chunk,'Spawn chunk missing');
console.log('[World contact] World initialized',Math.round(performance.now()-started),'ms; buildings',world.data.buildings.length,'chunks',world.chunks.size,'spawnChunk',key);
const began=performance.now();for(const _ of world.buildStageSteps(key,'core')){}
const root=world.loaded.get(key);assert(root?.userData.coreReady,'Core chunk missing from scene');
// Hyper-performance mode replaces groundMat with flatMat: match original material
// identity recorded by applyChunkQuality and exclude separate roads/buildings.
const mesh=root.userData.core.children.find(o=>o.isMesh&&!o.userData.streamRoads&&!o.userData.streamBuildings&&(o.material===world.groundMat||o.userData.detailedMaterial===world.groundMat));
assert(mesh,'Core ground mesh missing (including hyper quality mode)');
const positions=mesh.geometry.attributes.position;let triangles=0,nonfinite=0,steep=0,maxGrade=0,maxContactError=0;const steepExamples=[];
for(let i=0;i+2<positions.count;i+=3){
 const vertices=[0,1,2].map(k=>[positions.getX(i+k),positions.getY(i+k),positions.getZ(i+k)]);triangles++;
 if(!vertices.flat().every(Number.isFinite)){nonfinite++;continue;}
 for(const v of vertices){const expected=terrain.groundHeight(v[0],v[2])-.08;maxContactError=Math.max(maxContactError,Math.abs(v[1]-expected));}
 for(const [u,v] of [[vertices[0],vertices[1]],[vertices[1],vertices[2]],[vertices[2],vertices[0]]]){
  const horizontal=Math.hypot(u[0]-v[0],u[2]-v[2]);if(horizontal<.01)continue;
  const grade=Math.abs(u[1]-v[1])/horizontal;maxGrade=Math.max(maxGrade,grade);
  if(grade>.6){steep++;if(steepExamples.length<6)steepExamples.push({x:+u[0].toFixed(1),z:+u[2].toFixed(1),dy:+Math.abs(u[1]-v[1]).toFixed(2),length:+horizontal.toFixed(2),grade:+grade.toFixed(2)});}
 }
}
console.log('[World contact] Generated ground',JSON.stringify({buildTimeMs:Math.round(performance.now()-began),triangles,nonfinite,steep,maxGrade:+maxGrade.toFixed(3),maxContactError:+maxContactError.toFixed(3),steepExamples},null,2));
assert(triangles>0,'No ground triangles');assert.equal(nonfinite,0,'Nonfinite ground vertex');
