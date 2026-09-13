import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHistoricCenter} from './dist/historic-center.js';

const makeBuilding=(n,cx,cz,w,d,h=14)=>({
  n,cx,cz,h,
  minX:cx-w/2,maxX:cx+w/2,minZ:cz-d/2,maxZ:cz+d/2,
  p:[[cx-w/2,cz-d/2],[cx+w/2,cz-d/2],[cx+w/2,cz+d/2],[cx-w/2,cz+d/2]]
});

const data={
  buildings:[
    makeBuilding('Caffè Pedrocchi',90,-165,30,44,12),
    makeBuilding('Palazzo Moroni',-45,-60,34,48,14),
    makeBuilding('Palazzo del Bo',35,-75,36,55,13),
    makeBuilding('Palazzo della Ragione',-123,-96,76,31,35),
    makeBuilding('Palazzo Capitanio',-332,-160,36,55,16)
  ],
  roads:[]
};
const terrain={elevation:()=>0};

const source=fs.readFileSync(new URL('./dist/historic-center.js',import.meta.url),'utf8');
const sourceBytes=Buffer.byteLength(source);

const t0=performance.now();
const historic=createHistoricCenter(data,terrain);
const createMs=performance.now()-t0;

let meshes=0,triangles=0,shadowCasters=0;
historic.root.traverse(o=>{
  if(!o.isMesh)return;
  meshes++;
  if(o.castShadow)shadowCasters++;
  const geom=o.geometry;
  if(!geom)return;
  triangles+=geom.index?geom.index.count/3:(geom.attributes.position?.count||0)/3;
});

const updateIterations=50000;
const u0=performance.now();
for(let i=0;i<updateIterations;i++)historic.update((i%1400)-700,((i*7)%1400)-700);
const updateMs=performance.now()-u0;
const updateUs=(updateMs*1000)/updateIterations;

const budgets={
  sourceBytesMax:12000,
  createMsMax:250,
  meshesMax:240,
  trianglesMax:12000,
  updateUsMax:25
};
const metrics={sourceBytes,createMs:+createMs.toFixed(3),meshes,triangles:Math.round(triangles),shadowCasters,updateIterations,updateMs:+updateMs.toFixed(3),updateUs:+updateUs.toFixed(3)};
const failed=[];
if(sourceBytes>budgets.sourceBytesMax)failed.push(`source ${sourceBytes} > ${budgets.sourceBytesMax}`);
if(createMs>budgets.createMsMax)failed.push(`create ${createMs.toFixed(2)}ms > ${budgets.createMsMax}ms`);
if(meshes>budgets.meshesMax)failed.push(`meshes ${meshes} > ${budgets.meshesMax}`);
if(triangles>budgets.trianglesMax)failed.push(`triangles ${Math.round(triangles)} > ${budgets.trianglesMax}`);
if(updateUs>budgets.updateUsMax)failed.push(`update ${updateUs.toFixed(2)}us > ${budgets.updateUsMax}us`);

if(failed.length)throw new Error('Historic center performance budget failed: '+failed.join('; '));
console.log(JSON.stringify({ok:true,metrics,budgets,note:'CPU/geometry budget test; real GPU FPS still requires browser/hardware validation.'},null,2));
