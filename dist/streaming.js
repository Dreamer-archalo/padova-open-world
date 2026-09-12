import * as THREE from './vendor/three.module.js';
import {clamp} from './core.js';

const SIZE=320;
const keyAt=(x,z)=>Math.floor(x/SIZE)+','+Math.floor(z/SIZE);
export function streamingPlan(p,radius,has=()=>true){
 const speed=Math.abs(p.speed||0),air=!!p.aircraft||p.altitude>18;
 const look=clamp(speed*(air?6:4)+(air?Math.min(600,(p.altitude||0)*2):0),0,air?1800:1000);
 const direction=p.speed<0?-1:1,dx=Math.sin(p.yaw||0)*direction,dz=Math.cos(p.yaw||0)*direction;
 const keys=new Map(),add=(x,z,r,predictive)=>{const n=Math.ceil(r/SIZE);for(let i=Math.floor(x/SIZE)-n;i<=Math.floor(x/SIZE)+n;i++)for(let j=Math.floor(z/SIZE)-n;j<=Math.floor(z/SIZE)+n;j++){
  const key=i+','+j,cx=(i+.5)*SIZE,cz=(j+.5)*SIZE,d=Math.hypot(cx-x,cz-z);if(!has(key)||d>r+SIZE*.71)continue;
  const score=d+(predictive?radius*.5:0),prev=keys.get(key);if(!prev||score<prev.score)keys.set(key,{key,score,x:cx,z:cz,predictive});
 }};
 add(p.x,p.z,radius,false);
 for(let d=SIZE;d<=look+SIZE/2;d+=SIZE)add(p.x+dx*Math.min(d,look),p.z+dz*Math.min(d,look),Math.min(radius,air?520:340),true);
 return {keys:[...keys.values()].sort((a,b)=>a.score-b.score),look,air,speed};
}

// Send the already solved terrain graph once: the worker never recomputes DEM
// smoothing and cannot diverge from the physics used on the main thread.
export function streamingSnapshot(t){
 const r=t.roads,d=t.districts;
 const nodes=new Float64Array(r.nodes.length*4);
 r.nodes.forEach((n,i)=>nodes.set([n.x,n.z,n.h,n.degree],i*4));
 const profiles=[...r.profiles.values()].map(p=>({id:p.id,road:p.road,ids:Uint32Array.from(p.ids),slopes:p.slopes?Float64Array.from(p.slopes):null,layer:p.layer,tunnel:p.tunnel}));
 const unique=index=>[...new Set([...index.cells.values()].flat())];
 return {grid:t.grid,modern:t.modern,gameplayPatches:t.gameplayPatches,pratoHeight:t.pratoHeight,
  water:unique(t.waterIndex),fountains:t.fountains,roads:{modern:r.modern,nodes,profiles},
  districts:d?{zones:unique(d.index),wild:d.wild}:null};
}

export class CityStream{
 constructor(world,{workerFactory=typeof Worker==='function'?()=>new Worker(new URL('./streaming-worker.js',import.meta.url),{type:'module'}):null,now=()=>performance.now()}={}){
  this.world=world;this.now=now;this.desired=new Map();this.requested=new Map();this.ready=[];this.pins=[];this.serial=0;this.active=null;this.lastPlan='';this.lastReplan=-Infinity;
  this.metrics={loaded:0,queued:0,coreQueued:0,detailQueued:0,streamMs:0,maxStreamMs:0,workerMs:0,coreLoadMs:0,maxCoreLoadMs:0,pressure:true,prefetch:0,backend:'cooperative',cancelled:0,longFrames:0};
  if(workerFactory)try{
   this.worker=workerFactory();this.metrics.backend='worker';
   this.worker.onmessage=e=>this.receive(e.data);
   this.worker.onerror=()=>{this.worker?.terminate();this.worker=null;this.active=null;this.workerReady=false;this.metrics.backend='cooperative';};
   this.worker.postMessage({type:'init',terrain:streamingSnapshot(world.terrain)});
  }catch{this.worker=null;}
 }
 receive(m){
  if(m.type==='ready'){this.workerReady=true;return;}
  if(m.id!==this.active?.id)return;
  if(m.type==='error'){this.active=null;this.worker?.terminate();this.worker=null;this.metrics.backend='cooperative';return;}
  if(m.type==='stage'){if(this.desired.has(m.key))this.ready.push(m);this.active=null;}
 }
 prefetch(x,z,radius=480){const pin={x,z,radius,until:this.now()+15000};this.pins=[...this.pins.slice(-2),pin];this.lastPlan='';return pin;}
 invalidate(key){const g=this.world.loaded.get(key);if(g){g.userData.coreReady=false;g.userData.detailReady=false;}if(this.active?.key===key)this.cancel();this.ready=this.ready.filter(p=>p.key!==key);this.lastPlan='';}
 coreReady(x,z,radius=160){
  const plan=streamingPlan({x,z,speed:0},radius,k=>this.world.chunks.has(k));
  return plan.keys.length>0&&plan.keys.every(k=>this.world.loaded.get(k.key)?.userData.coreReady);
 }
 cancel(){if(!this.active)return;this.worker?.postMessage({type:'cancel',id:this.active.id});this.active.steps?.return();this.active=null;this.metrics.cancelled++;}
 update(p,force=false){
  const start=this.now(),w=this.world,m=this.metrics;
  this.pins=this.pins.filter(pin=>pin.until>start);
  const signature=keyAt(p.x,p.z)+','+Math.round((p.yaw||0)*6)+','+Math.floor(Math.abs(p.speed||0)/15)+','+Math.floor((p.altitude||0)/80)+','+w.radius;
  if(force||signature!==this.lastPlan||start-this.lastReplan>350){
   this.lastPlan=signature;this.lastReplan=start;
   const plan=streamingPlan(p,w.radius,k=>w.chunks.has(k));m.prefetch=Math.round(plan.look);
   this.desired=new Map(plan.keys.map(v=>[v.key,v]));
   for(const pin of this.pins)for(const v of streamingPlan(pin,pin.radius,k=>w.chunks.has(k)).keys)this.desired.set(v.key,{...v,score:v.score-10000,pinned:true});
   for(const [key,g] of w.loaded){const ch=w.chunks.get(key),d=Math.hypot((ch.i+.5)*SIZE-p.x,(ch.j+.5)*SIZE-p.z);g.visible=this.desired.has(key)||d<w.radius+SIZE;
    if(!this.desired.has(key)&&d>w.radius+SIZE*1.5){w.disposePart(g);w.loaded.delete(key);this.requested.delete(key);}
   }
   if(this.active&&!this.desired.has(this.active.key))this.cancel();
   this.ready=this.ready.filter(v=>this.desired.has(v.key));
  }
  // At most one completed geometry upload per frame. Transfers own their typed
  // arrays; no expensive JSON parse or normal generation occurs during upload.
  const packet=this.ready.shift();if(packet){this.install(packet);m.workerMs=packet.ms;}
  const wanted=[...this.desired.values()].sort((a,b)=>a.score-b.score);
  const core=wanted.filter(v=>!w.loaded.get(v.key)?.userData.coreReady);
  const detail=wanted.filter(v=>!v.predictive&&!v.pinned&&w.loaded.get(v.key)?.userData.coreReady&&!w.loaded.get(v.key)?.userData.detailReady);
  m.pressure=core.some(v=>!v.predictive);m.coreQueued=core.length;m.detailQueued=detail.length;m.queued=core.length+detail.length;m.loaded=w.loaded.size;
  w.queue=[...core,...detail].map(v=>v.key);
  if(core.length&&this.active?.stage==='detail')this.cancel();
  const candidate=core[0]||detail[0];
  if(!this.active&&candidate&&!this.ready.length&&(!this.worker||this.workerReady)){
   const stage=core.length?'core':'detail',id=++this.serial,key=candidate.key;
   if(!this.requested.has(key))this.requested.set(key,start);
   this.active={key,stage,id};
   if(this.worker){const chunk=w.chunks.get(key),trees=stage==='detail'?[...w.collision.near((chunk.i+.5)*SIZE,(chunk.j+.5)*SIZE,SIZE*.75)].map(b=>({p:b.p,minX:b.minX,minZ:b.minZ,maxX:b.maxX,maxZ:b.maxZ})):[];this.worker.postMessage({type:'build',id,key,stage,chunk,treeBuildings:trees,quality:w.quality});}
   else this.active.steps=w.buildStageSteps(key,stage);
  }
  if(!this.worker&&this.active){
   const budget=force?10:m.pressure?6:3,deadline=start+budget;
   do{if(this.active.steps.next().done){this.record(this.active.key,this.active.stage);this.active=null;break;}}while(this.now()<deadline);
  }
  w.pendingBuild=this.active;m.streamMs=this.now()-start;m.maxStreamMs=Math.max(m.maxStreamMs,m.streamMs);
 }
 record(key,stage){if(stage==='core'){const ms=this.now()-(this.requested.get(key)||this.now());this.metrics.coreLoadMs=ms;this.metrics.maxCoreLoadMs=Math.max(this.metrics.maxCoreLoadMs,ms);}}
 install(packet){
  const w=this.world,g=new THREE.Group();this.materials??=new Map();
  for(const p of packet.meshes){
   const geom=new THREE.BufferGeometry();for(const [name,a] of Object.entries(p.attributes))geom.setAttribute(name,new THREE.BufferAttribute(a.array,a.itemSize));
   if(p.index)geom.setIndex(new THREE.BufferAttribute(p.index,1));
   if(p.sphere)geom.boundingSphere=new THREE.Sphere(new THREE.Vector3(...p.sphere.c),p.sphere.r);
   const mat=w.wallMats[p.material]||({roof:w.roofMat,ground:w.groundMat}[p.material])||this.materials.get(p.material)||new THREE.MeshStandardMaterial({color:p.material,roughness:1});
   this.materials.set(p.material,mat);
   const mesh=p.instances?new THREE.InstancedMesh(geom,mat,p.instances.length/16):new THREE.Mesh(geom,mat);
   if(p.instances){mesh.instanceMatrix.array.set(p.instances);mesh.instanceMatrix.needsUpdate=true;mesh.count=p.count;}
   mesh.matrix.fromArray(p.matrix);mesh.matrixAutoUpdate=false;mesh.userData=p.userData;mesh.receiveShadow=true;g.add(mesh);
  }
  g.userData.vegetation=packet.vegetation||[];w.installStage(packet.key,g,packet.stage);this.record(packet.key,packet.stage);
 }
 dispose(){this.cancel();this.worker?.terminate();this.ready.length=0;}
}
