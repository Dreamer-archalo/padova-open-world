import assert from 'node:assert/strict';
import {buildModernRoads,junctionFanHeight} from './dist/modern-roads.js';

const road={k:'residential',w:6,surfaceId:1};
const segment={a:[0,0],b:[12,0],road};
function countFans(startDegree,endDegree,sample=()=>10){
 let triangles=0,quads=0,maxRadialRise=0;
 const batch={tri:(centre,outerA,outerB)=>{triangles++;maxRadialRise=Math.max(maxRadialRise,Math.abs(centre[1]-outerA[1]),Math.abs(centre[1]-outerB[1]));},quad:()=>quads++};
 const nodes=[{x:0,z:0,degree:startDegree},{x:12,z:0,degree:endDegree}];
 const terrain={roads:{nodes,index:{near:()=>[{ia:0,ib:1}]},sample,candidates:()=>[]},waterDistance:()=>Infinity};
 buildModernRoads(batch,[segment],terrain);
 assert(quads>0,'The carriageway itself must remain visible');
 return {triangles,maxRadialRise};
}
assert.equal(countFans(2,2).triangles,0,'Straight seams must not generate circular asphalt caps');
assert.equal(countFans(4,2).triangles,12,'A real junction needs one 12-triangle connection fan');
assert.equal(countFans(4,4).triangles,24,'Two distinct junction endpoints need independent connection fans');
assert.equal(junctionFanHeight(10,Infinity,4),10,'Non-finite rim samples cannot create spikes');
assert(Math.abs(junctionFanHeight(10,100,4)-10)<.25,'High rim spike must be grade limited');
assert(Math.abs(junctionFanHeight(10,-100,4)-10)<.25,'Low rim pit must be grade limited');
const steep=countFans(4,2,(r,x,z)=>x===0&&z===0?10:80);
assert(steep.maxRadialRise<.21,'Actual junction geometry still has vertical roof triangles: '+steep.maxRadialRise);
console.log('PASS straight roads have no artificial fans; genuine junction caps remain grade-limited without spikes.');
