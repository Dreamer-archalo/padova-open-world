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

// A sloping bridge sidewalk must have visible paving over water at the same
// per-vertex height as its carriageway (not an invisible collision-only ledge).
const bridge={k:'residential',w:6,crossing:true,surfaceId:2},quads=[];
const terrain={roads:{nodes:[],index:{near:()=>[]},sample:(r,x,z)=>10+x*.02+z*.015,candidates:()=>[]},waterDistance:()=>-5};
buildModernRoads({quad:(...args)=>quads.push(args.slice(0,4)),tri:()=>{}},[{a:[0,0],b:[12,0],road:bridge}],terrain);
for(const side of [-1,1]){
 const paving=quads.filter(q=>q.every(p=>Math.sign(p[2])===side)&&q.some(p=>Math.abs(Math.abs(p[2])-4.2)<1e-8));
 assert(paving.length>0,'Bridge sidewalk must be drawn above water');
 for(const quad of paving)for(const p of quad)assert(Math.abs(p[1]-terrain.roads.sample(bridge,p[0],p[2])-.075)<1e-8,'Sidewalk must match visible asphalt and vehicle support');
}
console.log('PASS bridge sidewalks have visible support at the shared carriageway height.');
