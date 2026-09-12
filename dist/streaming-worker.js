import * as THREE from './vendor/three.module.js';
import {Terrain} from './terrain.js';
import {RoadSurfaces} from './road-surfaces.js';
import {SpatialIndex} from './core.js';
import {Districts} from './districts.js';
import {CityWorld} from './world.js';
import {qualityFor} from './quality.js';

export function hydrateTerrain(snapshot){
 const t=Object.assign(Object.create(Terrain.prototype),snapshot),r=t.roads,packed=r.nodes;
 Object.setPrototypeOf(r,RoadSurfaces.prototype);r.terrain=t;r.nodes=[];r.index=new SpatialIndex(80);
 for(let i=0;i<packed.length;i+=4)r.nodes.push({x:packed[i],z:packed[i+1],h:packed[i+2],degree:packed[i+3]});
 const profiles=r.profiles;r.profiles=new Map();
 for(const p of profiles){p.points=Array.from(p.ids,id=>[r.nodes[id].x,r.nodes[id].z]);r.profiles.set(p.road,p);
  for(let i=1;i<p.ids.length;i++){const a=p.points[i-1],b=p.points[i],w=p.road.w,s={a,b,ia:p.ids[i-1],ib:p.ids[i],profile:p,i:i-1};r.index.add(s,Math.min(a[0],b[0])-w,Math.min(a[1],b[1])-w,Math.max(a[0],b[0])+w,Math.max(a[1],b[1])+w);}
 }
 const add=(index,item,p,pad)=>{index.add(item,Math.min(...p.map(v=>v[0]))-pad,Math.min(...p.map(v=>v[1]))-pad,Math.max(...p.map(v=>v[0]))+pad,Math.max(...p.map(v=>v[1]))+pad);};
 t.waterIndex=new SpatialIndex(80);for(const water of t.water)add(t.waterIndex,water,water.p||[water.a,water.b],water.p?12:water.w/2+12);delete t.water;
 t.bridgeIndex=new SpatialIndex(80);
 if(t.districts){const d=t.districts;Object.setPrototypeOf(d,Districts.prototype);d.index=new SpatialIndex(200);d.buildings=new SpatialIndex(60);for(const zone of d.zones)add(d.index,zone,zone.p,0);delete d.zones;
  d.nearRoad=(x,z,margin=0)=>{const c=r.candidates(x,z,margin)[0];return c?{road:c.road}:null;};
 }
 return t;
}
export function geometryPacket(world,key,stage){
 const meshes=[],transfer=[];
 world.loaded.get(key).userData[stage].traverse(o=>{if(!o.isMesh)return;
  const attributes={};for(const [name,a] of Object.entries(o.geometry.attributes)){const array=a.array.slice();attributes[name]={array,itemSize:a.itemSize};transfer.push(array.buffer);}
  const index=o.geometry.index?.array.slice();if(index)transfer.push(index.buffer);
  const instances=o.isInstancedMesh?o.instanceMatrix.array.slice():null;if(instances)transfer.push(instances.buffer);
  const material=Object.entries(world.wallMats).find(([,m])=>m===o.material)?.[0]||(o.material===world.groundMat?'ground':o.material===world.roofMat?'roof':'#'+o.material.color.getHexString());
  const b=o.geometry.boundingSphere;
  meshes.push({attributes,index,instances,count:o.count,matrix:o.matrix.toArray(),userData:{...o.userData,detailedMaterial:undefined},material,sphere:b?{c:b.center.toArray(),r:b.radius}:null});
 });return {meshes,transfer};
}
export function createWorkerWorld(snapshot){
 const world=Object.create(CityWorld.prototype);world.terrain=hydrateTerrain(snapshot);world.scene=new THREE.Scene();world.chunks=new Map();world.loaded=new Map();world.collision=new SpatialIndex();
 world.wallMats=Object.fromEntries(['historic','modern','industrial'].map(k=>[k,new THREE.MeshStandardMaterial({vertexColors:true})]));world.roofMat=new THREE.MeshStandardMaterial({vertexColors:true});world.groundMat=new THREE.MeshStandardMaterial({vertexColors:true});world.flatMat=new THREE.MeshBasicMaterial({vertexColors:true});world.detailMats=new Set();world.profile=qualityFor('medium');
 world.applyChunkQuality=()=>{};
 return world;
}
export function installWorkerHandler(port){
 let world,job;const send=(message,transfer=[])=>port.postMessage(message,transfer);
 const run=()=>{const current=job;if(!current)return;try{
  const deadline=performance.now()+7;let next;
  do{next=current.steps.next();}while(!next.done&&performance.now()<deadline);
  if(next.done){const {meshes,transfer}=geometryPacket(world,current.key,current.stage);send({type:'stage',key:current.key,stage:current.stage,id:current.id,ms:performance.now()-current.start,meshes,vegetation:world.loaded.get(current.key).userData.vegetation},transfer);world.disposePart(world.loaded.get(current.key));world.loaded.clear();world.chunks.clear();job=null;}
  else setTimeout(run,0);
 }catch(error){send({type:'error',id:current.id,message:String(error)});job=null;}};
 port.onmessage=e=>{const m=e.data;if(m.type==='init'){world=createWorkerWorld(m.terrain);send({type:'ready'});return;}
  if(m.type==='cancel'){if(job?.id===m.id){job.steps.return();job=null;}return;}
  if(m.type==='build'){
   const roads=world.roadLookup??=new Map([...world.terrain.roads.profiles.values()].map(p=>[p.id,p.road]));
   for(const s of m.chunk.roads)s.road=roads.get(s.road.surfaceId)||s.road;
   if(world.terrain.districts){const index=world.terrain.districts.buildings=new SpatialIndex(60);for(const b of m.treeBuildings||[])index.add(b,b.minX,b.minZ,b.maxX,b.maxZ);}
   world.chunks.set(m.key,m.chunk);world.quality=m.quality;world.profile=qualityFor(m.quality);
   job={...m,start:performance.now(),steps:world.buildStageSteps(m.key,m.stage)};run();
  }
 };
}
if(typeof self!=='undefined'&&typeof document==='undefined')installWorkerHandler(self);
