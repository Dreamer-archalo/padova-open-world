import * as THREE from './vendor/three.module.js';
import {Terrain,PRATO} from './terrain.js';
import {RoadSurfaces} from './road-surfaces.js';
import {CityStream} from './streaming.js';
import {ModernGameplay} from './modern-gameplay.js';
import {project,dist} from './core.js';

export const MAX_TERRAIN_GRADE=.12;
export const MIN_ADJACENT_DELTA=.5;
export const ROAD_WATER_CLEARANCE=.55;
const SOUTH_PATCHES=[
 // All points in the sampled playable core lie on the same gentle plane;
 // smoothly fade that plane to the surrounding DEM outside the core.
 {id:'bassanello',name:'Bassanello',p:project(45.3868,11.8722),rx:650,rz:520,core:.42,strength:1,slopeZ:.00018,slopeX:.00005},
 {id:'guizza',name:'Guizza',p:project(45.3788,11.8703),rx:760,rz:620,core:.42,strength:1,slopeZ:.00016,slopeX:.00004},
 {id:'albignasego',name:'Albignasego / capolinea sud',p:project(45.3560,11.8672),rx:1500,rz:1050,core:.42,strength:1,slopeZ:.00014,slopeX:.00003}
];
const CENTRE_PATCHES=[
 {id:'piazza-signori',name:'Piazza dei Signori',p:{x:-282,z:-140},rx:78,rz:55,core:.72,strength:1},
 {id:'piazza-erbe',name:'Piazza delle Erbe',p:{x:-145,z:-48},rx:58,rz:40,core:.72,strength:1},
 {id:'piazza-frutta',name:'Piazza della Frutta',p:{x:-205,z:-67},rx:52,rz:38,core:.7,strength:1},
 {id:'piazza-duomo',name:'Piazza Duomo',p:{x:-346,z:-12},rx:62,rz:44,core:.7,strength:1},
 {id:'prato',name:'Prato della Valle',p:{x:PRATO.x,z:PRATO.z},rx:205,rz:245,core:.8,strength:1,yaw:PRATO.yaw}
];
const LEVEL_PATCHES=[...CENTRE_PATCHES,...SOUTH_PATCHES];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function local(a,x,z){const dx=x-a.p.x,dz=z-a.p.z,c=Math.cos(a.yaw||0),s=Math.sin(a.yaw||0);return {x:c*dx-s*dz,z:s*dx+c*dz};}

// Global Lipschitz projection for the modern terrain. Bilinear interpolation was
// continuous already, but one noisy DEM cell could still create an implausible
// local wall. Project neighbouring native samples onto a maximum physical grade
// while preserving each pair's mean, so both positive spikes and pits are fixed.
const baseRawElevation=Terrain.prototype.rawElevation;
function harmonisedGrid(t){
 if(t.__phase4HarmonisedGrid)return t.__phase4HarmonisedGrid;
 const g=t.grid,h=Float64Array.from(g.heights),limit=Math.max(MIN_ADJACENT_DELTA,g.step*MAX_TERRAIN_GRADE),w=g.width,hh=g.height;
 const pair=(i,j)=>{const d=h[i]-h[j];if(Math.abs(d)<=limit)return 0;const excess=(Math.abs(d)-limit)/2,s=Math.sign(d);h[i]-=s*excess;h[j]+=s*excess;return excess;};
 for(let pass=0;pass<12;pass++){
  let changed=0;for(let y=0;y<hh;y++)for(let x=0;x<w;x++){const i=y*w+x;if(x+1<w)changed=Math.max(changed,pair(i,i+1));if(y+1<hh)changed=Math.max(changed,pair(i,i+w));}
  for(let y=hh-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;if(x)changed=Math.max(changed,pair(i,i-1));if(y)changed=Math.max(changed,pair(i,i-w));}
  if(changed<1e-4)break;
 }
 t.__phase4NativeMaxDelta=limit;return t.__phase4HarmonisedGrid=h;
}
if(!Terrain.prototype.__phase4RawGradientClamp){
 Terrain.prototype.__phase4RawGradientClamp=true;
 Terrain.prototype.rawElevation=function(x,z){
  if(!this.modern)return baseRawElevation.call(this,x,z);
  const g=this.grid,h=harmonisedGrid(this),u=clamp((x-g.x0)/g.step,0,g.width-1),v=clamp((z-g.z0)/g.step,0,g.height-1),i=Math.min(g.width-2,Math.floor(u)),j=Math.min(g.height-2,Math.floor(v)),a=u-i,b=v-j,at=(xx,zz)=>h[zz*g.width+xx];
  return at(i,j)*(1-a)*(1-b)+at(i+1,j)*a*(1-b)+at(i,j+1)*(1-a)*b+at(i+1,j+1)*a*b;
 };
}

// Hermite road interpolation is smooth, but unconstrained tangents can in theory
// overshoot the two solved endpoint heights. Clamp every modern segment to its
// endpoint envelope: no hidden hump can exist between two grade-limited nodes.
const baseSegmentHeight=RoadSurfaces.prototype.segmentHeight;
if(!RoadSurfaces.prototype.__phase4MonotoneHeight){
 RoadSurfaces.prototype.__phase4MonotoneHeight=true;
 RoadSurfaces.prototype.segmentHeight=function(s,t){
  const a=this.nodes[s.ia],b=this.nodes[s.ib],linear=a.h+(b.h-a.h)*t,h=baseSegmentHeight.call(this,s,t);
  if(!this.modern||!Number.isFinite(h))return Number.isFinite(h)?h:linear;
  return clamp(h,Math.min(a.h,b.h),Math.max(a.h,b.h));
 };
}

// Padova is extremely flat. The source DEM contains small local bumps that are
// acceptable in the countryside but look wrong in formal piazzas and in the
// Bassanello/Guizza/Albignasego plain. Flatten only those authored zones and
// feather the correction into the surrounding terrain; roads are solved after
// this patch, so carriageways and sidewalks inherit the same reference height.
const baseElevation=Terrain.prototype.elevation;
if(!Terrain.prototype.__phase4LevelPlane){
 Terrain.prototype.__phase4LevelPlane=true;
 Terrain.prototype.elevation=function(x,z){
  let h=baseElevation.call(this,x,z);if(!this.modern)return h;
  this.__phase4LevelBases??=LEVEL_PATCHES.map(a=>baseElevation.call(this,a.p.x,a.p.z));
  for(let i=0;i<LEVEL_PATCHES.length;i++){
   const a=LEVEL_PATCHES[i],p=local(a,x,z),r=Math.hypot(p.x/a.rx,p.z/a.rz);if(r>=1)continue;
   const core=a.core??.55,edge=r<=core?1:smooth((1-r)/(1-core)),influence=edge*(a.strength??1),base=this.__phase4LevelBases[i],gentle=base+p.z*(a.slopeZ??.000025)+p.x*(a.slopeX??.000015);
   h=h*(1-influence)+gentle*influence;
  }
  return h;
 };
}

// Map-wide shoulder harmonisation. Road profiles already carry the authoritative
// driving height; this only feathers the surrounding terrain towards ordinary
// surface streets over a wider 7.5 m shoulder. It therefore removes thin holes,
// vertical sidewalk lips and visible undersides without flattening bridges,
// tunnels, tram tracks or pedestrian-only ways.
const baseGroundHeight=Terrain.prototype.groundHeight;
const SHOULDER_FEATHER=7.5;
if(!Terrain.prototype.__phase4HarmonicShoulders){
 Terrain.prototype.__phase4HarmonicShoulders=true;
 Terrain.prototype.groundHeight=function(x,z){
  let h=baseGroundHeight.call(this,x,z);if(!this.modern||!this.roads)return h;
  const candidates=this.roads.candidates(x,z,SHOULDER_FEATHER)
   .filter(s=>!s.road.crossing&&!s.road.tunnel&&!/motorway|trunk|footway|path|cycleway|steps|pedestrian|tram/.test(s.road.k||''))
   .sort((a,b)=>a.d-b.d);
  const road=candidates[0];if(!road)return h;
  const outside=Math.max(0,road.d-road.road.w/2);if(outside>=SHOULDER_FEATHER)return h;
  // Water edges must stay visually explicit instead of being smeared into the
  // carriageway. Bridge/canal structures keep their own retaining geometry.
  if(this.waterDistance(x,z)<1.25)return h;
  const deck=road.height-.05,t=smooth(outside/SHOULDER_FEATHER);
  return deck*(1-t)+h*t;
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

const cube=new THREE.BoxGeometry(1,1,1),fillMat=new THREE.MeshStandardMaterial({color:'#70716b',roughness:1}),edgeMat=new THREE.MeshStandardMaterial({color:'#a4a096',roughness:1}),pratoWallMat=new THREE.MeshStandardMaterial({color:'#b8ac92',roughness:1}),pratoDeckMat=new THREE.MeshStandardMaterial({color:'#bdb39d',roughness:1});
function instance(mesh,index,x,y,z,w,h,d,yaw){const m=new THREE.Matrix4(),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),s=new THREE.Vector3(w,h,d);m.compose(new THREE.Vector3(x,y,z),q,s);mesh.setMatrixAt(index,m);}
function buildPatchSeal(game,patch){
 const segments=[],seen=new Set();for(const s of game.graph.index.near(patch.p.x,patch.p.z,Math.max(patch.rx,patch.rz))){const road=s.road;if(!road||road.tunnel||/motorway|trunk|footway|path|cycleway|steps|pedestrian|tram/.test(road.k||'')||road.w<3||road.w>24)continue;const a=game.graph.nodes[s.a],b=game.graph.nodes[s.b];if(!a||!b)continue;const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,p=local(patch,mx,mz),dx=p.x/patch.rx,dz=p.z/patch.rz;if(dx*dx+dz*dz>1)continue;const key=[Math.min(s.a,s.b),Math.max(s.a,s.b),road.n||road.surfaceId||''].join(':');if(seen.has(key))continue;seen.add(key);segments.push({a,b,road,mx,mz});}
 const fills=[],edges=[];for(const s of segments){const len=Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z);if(len<2||len>90)continue;const yaw=Math.atan2(s.b.x-s.a.x,s.b.z-s.a.z),deck=game.terrain.roads.sample(s.road,s.mx,s.mz)+.01,ground=game.terrain.groundHeight(s.mx,s.mz),gap=Math.max(0,deck-ground),nearWater=game.terrain.waterDistance(s.mx,s.mz)<s.road.w/2+7;
  if(!nearWater&&gap>.28)fills.push({x:s.mx,y:ground+gap/2,z:s.mz,w:s.road.w+.7,h:gap+.12,d:len+.5,yaw});
  if(nearWater||gap>.2){const nx=Math.cos(yaw),nz=-Math.sin(yaw),side=s.road.w/2+.12,wallH=Math.max(.55,gap+.65),wallY=deck-wallH/2+.28;for(const sign of [-1,1])edges.push({x:s.mx+nx*side*sign,y:wallY,z:s.mz+nz*side*sign,w:.28,h:wallH,d:len+.6,yaw});for(const sign of [-1,1])edges.push({x:s.mx+nx*(side+.08)*sign,y:deck+.18,z:s.mz+nz*(side+.08)*sign,w:.22,h:.36,d:len+.65,yaw});}
 }
 const root=new THREE.Group();root.name='phase4-terrain-seal-'+patch.id;root.userData.phase4TerrainSeal=true;root.userData.patch=patch.id;
 if(fills.length){const mesh=new THREE.InstancedMesh(cube,fillMat,fills.length);fills.forEach((v,i)=>instance(mesh,i,v.x,v.y,v.z,v.w,v.h,v.d,v.yaw));mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;root.add(mesh);}
 if(edges.length){const mesh=new THREE.InstancedMesh(cube,edgeMat,edges.length);edges.forEach((v,i)=>instance(mesh,i,v.x,v.y,v.z,v.w,v.h,v.d,v.yaw));mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;root.add(mesh);}
 root.visible=false;game.scene.add(root);return {root,patch};
}
function pratoPoint(lx,lz){const c=Math.cos(PRATO.yaw),s=Math.sin(PRATO.yaw);return {x:PRATO.x+c*lx+s*lz,z:PRATO.z-s*lx+c*lz};}
function buildPratoEdges(game){
 const walls=[],curbs=[],steps=88;
 for(const [rx,rz] of [[90,135],[81,126]])for(let i=0;i<steps;i++){
  const a=i/steps*Math.PI*2,b=(i+1)/steps*Math.PI*2,lx=(Math.cos(a)+Math.cos(b))*.5*rx,lz=(Math.sin(a)+Math.sin(b))*.5*rz;if(Math.abs(lx)<7||Math.abs(lz)<6)continue;
  const p=pratoPoint(Math.cos(a)*rx,Math.sin(a)*rz),q=pratoPoint(Math.cos(b)*rx,Math.sin(b)*rz),m={x:(p.x+q.x)/2,z:(p.z+q.z)/2},len=Math.hypot(q.x-p.x,q.z-p.z),yaw=Math.atan2(q.x-p.x,q.z-p.z),top=game.terrain.pratoHeight+.16;
  walls.push({x:m.x,y:game.terrain.pratoHeight-.58,z:m.z,w:.34,h:1.65,d:len+.18,yaw});curbs.push({x:m.x,y:top,z:m.z,w:.48,h:.28,d:len+.22,yaw});
 }
 const bridges=[{lx:0,lz:130.5,w:11,d:13},{lx:0,lz:-130.5,w:11,d:13},{lx:85.5,lz:0,w:13,d:10},{lx:-85.5,lz:0,w:13,d:10}],decks=[];for(const b of bridges){const p=pratoPoint(b.lx,b.lz);decks.push({x:p.x,y:game.terrain.pratoHeight+.17,z:p.z,w:b.w,h:.24,d:b.d,yaw:PRATO.yaw});}
 const root=new THREE.Group();root.name='phase4-prato-canal-edges';root.userData.phase4PratoEdges=true;
 const wallMesh=new THREE.InstancedMesh(cube,pratoWallMat,walls.length),curbMesh=new THREE.InstancedMesh(cube,pratoWallMat,curbs.length),deckMesh=new THREE.InstancedMesh(cube,pratoDeckMat,decks.length);walls.forEach((v,i)=>instance(wallMesh,i,v.x,v.y,v.z,v.w,v.h,v.d,v.yaw));curbs.forEach((v,i)=>instance(curbMesh,i,v.x,v.y,v.z,v.w,v.h,v.d,v.yaw));decks.forEach((v,i)=>instance(deckMesh,i,v.x,v.y,v.z,v.w,v.h,v.d,b.yaw));for(const m of [wallMesh,curbMesh,deckMesh]){m.instanceMatrix.needsUpdate=true;m.receiveShadow=true;root.add(m);}root.visible=false;game.scene.add(root);return root;
}
let seals=null,pratoEdges=null;
const baseGameplayUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__phase4TerrainSeal){
 ModernGameplay.prototype.__phase4TerrainSeal=true;
 ModernGameplay.prototype.update=function(dt){baseGameplayUpdate.call(this,dt);if(!seals)seals=SOUTH_PATCHES.map(p=>buildPatchSeal(this,p));if(!pratoEdges)pratoEdges=buildPratoEdges(this);for(const s of seals)s.root.visible=dist(this.state,s.patch.p)<1450;pratoEdges.visible=dist(this.state,{x:PRATO.x,z:PRATO.z})<950;};
}

export {SOUTH_PATCHES,CENTRE_PATCHES,LEVEL_PATCHES,SHOULDER_FEATHER};
