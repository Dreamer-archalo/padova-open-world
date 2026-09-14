import * as THREE from './vendor/three.module.js';
import {Terrain} from './terrain.js';
import {CityStream} from './streaming.js';
import {ModernGameplay} from './modern-gameplay.js';
import {project,dist} from './core.js';

const SOUTH_PATCHES=[
 {id:'bassanello',name:'Bassanello',p:project(45.3868,11.8722),rx:650,rz:520,strength:.78},
 {id:'guizza',name:'Guizza',p:project(45.3788,11.8703),rx:760,rz:620,strength:.82},
 {id:'albignasego',name:'Albignasego / capolinea sud',p:project(45.3560,11.8672),rx:1500,rz:1050,strength:.9}
];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

// The DEM is much noisier than the real south-Padova plain. Keep broad terrain
// character, but remove the artificial metre-scale humps that created huge road
// ramps and hard-to-read sidewalk/water edges around Bassanello, Guizza and the
// south tram terminus.
const baseElevation=Terrain.prototype.elevation;
if(!Terrain.prototype.__phase4SouthPlane){
 Terrain.prototype.__phase4SouthPlane=true;
 Terrain.prototype.elevation=function(x,z){
  let h=baseElevation.call(this,x,z);if(!this.modern)return h;
  this.__phase4SouthBases??=SOUTH_PATCHES.map(a=>baseElevation.call(this,a.p.x,a.p.z));
  for(let i=0;i<SOUTH_PATCHES.length;i++){
   const a=SOUTH_PATCHES[i],dx=(x-a.p.x)/a.rx,dz=(z-a.p.z)/a.rz,d2=dx*dx+dz*dz;if(d2>=1)continue;
   const influence=smooth(1-Math.sqrt(d2))*a.strength,base=this.__phase4SouthBases[i],gentle=base+(z-a.p.z)*.00018+(x-a.p.x)*.00005;
   h=h*(1-influence)+gentle*influence;
  }
  return h;
 };
}

// During the first seconds, stream a tighter neighbourhood so the current street
// reaches detail stage sooner instead of waiting for a wide ring of distant core
// chunks. The normal radius is restored progressively afterwards.
const baseStreamUpdate=CityStream.prototype.update;
if(!CityStream.prototype.__phase4FastStart){
 CityStream.prototype.__phase4FastStart=true;
 CityStream.prototype.update=function(p,force=false){
  const now=this.now(),originalRadius=this.world.radius;this.__phase4FirstAt??=now;
  const age=now-this.__phase4FirstAt;if(age<7500&&originalRadius>520){const t=Math.max(0,Math.min(1,(age-3500)/4000)),cap=520+(originalRadius-520)*t;this.world.radius=Math.min(originalRadius,cap);}
  try{return baseStreamUpdate.call(this,p,force);}finally{this.world.radius=originalRadius;}
 };
}

const cube=new THREE.BoxGeometry(1,1,1),fillMat=new THREE.MeshStandardMaterial({color:'#70716b',roughness:1}),edgeMat=new THREE.MeshStandardMaterial({color:'#a4a096',roughness:1});
function instance(mesh,index,x,y,z,w,h,d,yaw){const m=new THREE.Matrix4(),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),s=new THREE.Vector3(w,h,d);m.compose(new THREE.Vector3(x,y,z),q,s);mesh.setMatrixAt(index,m);}
function buildPatchSeal(game,patch){
 const segments=[],seen=new Set();for(const s of game.graph.index.near(patch.p.x,patch.p.z,Math.max(patch.rx,patch.rz))){const road=s.road;if(!road||road.tunnel||/motorway|trunk|footway|path|cycleway|steps|pedestrian|tram/.test(road.k||'')||road.w<3||road.w>24)continue;const a=game.graph.nodes[s.a],b=game.graph.nodes[s.b];if(!a||!b)continue;const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,dx=(mx-patch.p.x)/patch.rx,dz=(mz-patch.p.z)/patch.rz;if(dx*dx+dz*dz>1)continue;const key=[Math.min(s.a,s.b),Math.max(s.a,s.b),road.n||road.surfaceId||''].join(':');if(seen.has(key))continue;seen.add(key);segments.push({a,b,road,mx,mz});}
 const fills=[],edges=[];for(const s of segments){const len=Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z);if(len<2||len>90)continue;const yaw=Math.atan2(s.b.x-s.a.x,s.b.z-s.a.z),deck=game.terrain.roads.sample(s.road,s.mx,s.mz)+.01,ground=game.terrain.groundHeight(s.mx,s.mz),gap=Math.max(0,deck-ground),nearWater=game.terrain.waterDistance(s.mx,s.mz)<s.road.w/2+7;
  if(!nearWater&&gap>.28)fills.push({x:s.mx,y:ground+gap/2,z:s.mz,w:s.road.w+.7,h:gap+.12,d:len+.5,yaw});
  if(nearWater||gap>.2){const nx=Math.cos(yaw),nz=-Math.sin(yaw),side=s.road.w/2+.12,wallH=Math.max(.55,gap+.65),wallY=deck-wallH/2+.28;for(const sign of [-1,1])edges.push({x:s.mx+nx*side*sign,y:wallY,z:s.mz+nz*side*sign,w:.28,h:wallH,d:len+.6,yaw});for(const sign of [-1,1])edges.push({x:s.mx+nx*(side+.08)*sign,y:deck+.18,z:s.mz+nz*(side+.08)*sign,w:.22,h:.36,d:len+.65,yaw});}
 }
 const root=new THREE.Group();root.name='phase4-terrain-seal-'+patch.id;root.userData.phase4TerrainSeal=true;root.userData.patch=patch.id;
 if(fills.length){const mesh=new THREE.InstancedMesh(cube,fillMat,fills.length);fills.forEach((v,i)=>instance(mesh,i,v.x,v.y,v.z,v.w,v.h,v.d,v.yaw));mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;root.add(mesh);}
 if(edges.length){const mesh=new THREE.InstancedMesh(cube,edgeMat,edges.length);edges.forEach((v,i)=>instance(mesh,i,v.x,v.y,v.z,v.w,v.h,v.d,v.yaw));mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;root.add(mesh);}
 root.visible=false;game.scene.add(root);return {root,patch};
}
let seals=null;
const baseGameplayUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__phase4TerrainSeal){
 ModernGameplay.prototype.__phase4TerrainSeal=true;
 ModernGameplay.prototype.update=function(dt){baseGameplayUpdate.call(this,dt);if(!seals)seals=SOUTH_PATCHES.map(p=>buildPatchSeal(this,p));for(const s of seals)s.root.visible=dist(this.state,s.patch.p)<1450;};
}

export {SOUTH_PATCHES};
