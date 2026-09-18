import assert from 'node:assert/strict';
import {buildModernRoads} from './dist/modern-roads.js';

const road={k:'residential',w:6,surfaceId:1};
const segment={a:[0,0],b:[12,0],road};
function countFans(startDegree,endDegree){
 let triangles=0,quads=0;
 const batch={tri:()=>triangles++,quad:()=>quads++};
 const nodes=[{x:0,z:0,degree:startDegree},{x:12,z:0,degree:endDegree}];
 const terrain={roads:{nodes,index:{near:()=>[{ia:0,ib:1}]},sample:()=>10,candidates:()=>[]},waterDistance:()=>Infinity};
 buildModernRoads(batch,[segment],terrain);
 assert(quads>0,'The carriageway itself must remain visible');
 return triangles;
}
assert.equal(countFans(2,2),0,'Straight seams must not generate circular asphalt caps');
assert.equal(countFans(4,2),12,'A real junction needs one 12-triangle connection fan');
assert.equal(countFans(4,4),24,'Two distinct junction endpoints need independent connection fans');
console.log('PASS straight roads have no artificial fan bumps and genuine junctions retain caps.');
