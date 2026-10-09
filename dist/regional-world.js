import {regionalRoofTriangles,installRoofSurfaces} from './roof-surfaces.js?v=roof-driving-r42-2';
import {dealerSurfaceHeight} from './dealer-surfaces.js?v=dealer-handover-r41-2';
import {markVehicleWreck} from './vehicle-damage.js';
import {compactCoachwork} from './car-coachwork.js';
import {pedestrianRoadAllowed} from './npc-spawn-policy.js';
import {DEALER_SITES,reserveDealerBuildings,dealerWallParts} from './dealerships.js?v=dealer-handover-r41-2';
// Region streaming runs alongside (not instead of) Padova's original CityWorld.
// Padova keeps its existing meshes/physics/traffic; only its eastern border
// gains access to the OSM corridor and high-detail destination zones.
import * as THREE from './vendor/three.module.js';
import {pointInside,nearestOnSegment} from './core.js';
import {NPC_VEHICLES,createNPCCar} from './modern-vehicles.js';
import {VEHICLES} from './vehicles.js';
import {installVehicleDamage,updateVehicleDamage} from './vehicle-damage.js';
import {laneCount,laneOffset} from './traffic.js';
import {regionalNpcStep,regionalRoadEligible,regionalOneWay,reviveRegionalCar} from './regional-traffic-physics.js';
import {createSpecialVehicle} from './special-vehicles.js';
import {rareCollectorStyle} from './collector-cars.js';
import {createPerson} from './world.js';
import {PADOVA_EAST,regionalDetail,activeRegionalPlace} from './unified-regions.js';
import {clipPolygon,coastalBand,harborBand} from './regional-hydro.js';
import {smoothRegionalRoadProfile,regionalChunkCuts,regionalRoadClass} from './regional-road-profile.js';

const CHUNK=320,CELL=160,LAGOON_Y=.1;
const key=(x,z,size)=>Math.floor(x/size)+','+Math.floor(z/size);
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide,...extra});
const green=material('#819675'),roadMat=material('#59666a'),arterialMat=material('#4b595f'),
 canalMat=material('#167bbc',{roughness:.29,metalness:.04,emissive:'#0c3560',emissiveIntensity:.30}),lagoonMat=material('#145ca4',{roughness:.30,metalness:.06,emissive:'#0c3058',emissiveIntensity:.28}),stone=material('#cdbda1'),
 walls=material('#cfb897'),roofs=material('#a57358'),glass=material('#526c78'),mark=material('#dddacf'),sign=material('#dfdfd5'),townWalls=material('#8b9690');
const energy=new THREE.MeshBasicMaterial({color:'#6dd4d5',transparent:true,opacity:.35,wireframe:true,depthWrite:false});
const energySkin=new THREE.MeshBasicMaterial({color:'#4cb8c2',transparent:true,opacity:.19,side:THREE.DoubleSide,depthWrite:false});
const energyOutline=new THREE.LineBasicMaterial({color:'#8ef7ec',transparent:true,opacity:.76,depthWrite:false});
const ambientCar=material('#80919b'),ambientBus=material('#bc9f61'),ambientPedestrian=material('#577d78');
const roadShoulderMat=material('#9b9d94'),roadBankMat=material('#7e8b79'),
 guardRailMat=material('#b8c0bd',{metalness:.35,roughness:.62}),junctionMat=material('#566165');
const facadeFrame=material('#c6b7a0'),facadeDoor=material('#746454'),facadeBrick=material('#ad7861'),facadeStucco=material('#dec6a6'),industrialWall=material('#a2afae'),sidewalkMat=material('#aeb4aa'),facadeShutter=material('#647368');
const cube=new THREE.BoxGeometry(1,1,1);
// Nearby regions use the SAME car and human model families as Padova. Caches
// share geometry: streamed sectors must not dispose their reusable templates.
const regionCarTemplates=new Map(),regionPeopleTemplates=new Map();
function regionalCar(style){
 if(!regionCarTemplates.has(style))regionCarTemplates.set(style,
  NPC_VEHICLES[style]?compactCoachwork(createNPCCar(style,
   ['#a92731','#71858c','#e5ddc4','#566e5c'][regionCarTemplates.size%4])):
   createSpecialVehicle(style));
 const mesh=regionCarTemplates.get(style).clone(true);
 mesh.traverse(o=>{if(o.isMesh)o.userData.regionalAmbientShared=true;});
 return mesh;
}
function regionalPerson(variant){
 const i=variant%6;
 if(!regionPeopleTemplates.has(i))regionPeopleTemplates.set(i,
  createPerson(['#719085','#b89575','#71859c','#a37a6c','#aaa57e','#7c8e77'][i],i));
 const mesh=regionPeopleTemplates.get(i).clone(true);
 mesh.traverse(o=>{if(o.isMesh)o.userData.regionalAmbientShared=true;});
 mesh.userData.hips=mesh.children[0];return mesh;
}
const min=(a,b)=>Math.min(a,b),max=(a,b)=>Math.max(a,b);
const distance=(x,z,a,b)=>Math.hypot(x-a,z-b);
function geometry(vertices){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();g.computeBoundingSphere();return g;}
function addQuad(out,a,b,c,d){out.push(...a,...b,...c,...a,...c,...d);}
function surface(out,a,b,w,aY,bY){
 const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.05)return;
 const nx=-dz/length*w*.5,nz=dx/length*w*.5;
 addQuad(out,[a[0]+nx,aY,a[1]+nz],[b[0]+nx,bY,b[1]+nz],[b[0]-nx,bY,b[1]-nz],[a[0]-nx,aY,a[1]-nz]);
}
function coast(x,z){return x>33000&&z>-7800&&z<3000;}

export class RegionalWorld{
 constructor(scene,data,regionalTerrain,originalCollision){
  this.scene=scene;this.data=data;this.grid=regionalTerrain;this.collision=originalCollision;
  reserveDealerBuildings(data.buildings||[],DEALER_SITES.filter(s=>!s.city.startsWith('Padova')));
  this.chunks=new Map();this.visible=new Map();this.roadProfiles=new WeakMap();this.roadLengths=new WeakMap();this.junctions=new Map();this.roads=new Map();this.waters=new Map();this.waterAreas=new Map();this.landAreas=new Map();this.buildingAreas=new Map();this.shorelines=new Map();this.key='';
  this.actors=[];this.queue=[];this.pendingBuild=null;this.totalBuilt=0;this.lastUpdate=0;this.dataReady=false;this.sim=null;this.explosions=[];
  this.trafficCells=new Map();this.metrics={loaded:0,queued:0,totalBuilt:0,lastBuildMs:0,maxBuildMs:0,actors:0,cars:0,profile:'low'};
  this.index();
 }
 contains(x,z){return x>PADOVA_EAST&&x<40500&&z>-13500&&z<10000;}
 streamProfile(x,z){
  const profiles={
   hyper:{loadRadius:2.15,keepRadius:3.15,detailRadius:470,actorPhysicsRadius:360,tileDetail:8,tileFar:5,coastBuildings:24,inlandBuildings:52,cars:2,people:2},
   low:{loadRadius:2.75,keepRadius:3.75,detailRadius:590,actorPhysicsRadius:480,tileDetail:10,tileFar:6,coastBuildings:40,inlandBuildings:82,cars:3,people:4},
   medium:{loadRadius:3.2,keepRadius:4.2,detailRadius:690,actorPhysicsRadius:620,tileDetail:12,tileFar:7,coastBuildings:55,inlandBuildings:108,cars:4,people:6},
   high:{loadRadius:3.5,keepRadius:4.7,detailRadius:780,actorPhysicsRadius:760,tileDetail:14,tileFar:8,coastBuildings:68,inlandBuildings:122,cars:5,people:8}
  };
  const profile={...(profiles[this.quality]||profiles.low)};
  if(coast(x,z)&&this.quality!=='high'){
   profile.loadRadius=Math.max(2,profile.loadRadius-.2);
   profile.keepRadius=Math.max(3,profile.keepRadius-.15);
  }
  return profile;
 }
 raw(x,z){
  const g=this.grid,u=Math.max(0,Math.min(g.width-1,(x-g.x0)/g.step)),v=Math.max(0,Math.min(g.height-1,(z-g.z0)/g.step));
  const i=Math.min(g.width-2,Math.floor(u)),j=Math.min(g.height-2,Math.floor(v)),a=u-i,b=v-j,H=(ix,jz)=>g.heights[jz*g.width+ix];
  const value=H(i,j)*(1-a)*(1-b)+H(i+1,j)*a*(1-b)+H(i,j+1)*(1-a)*b+H(i+1,j+1)*a*b;
  return coast(x,z)?Math.max(-.25,value):value;
 }
 roadY(road,x,z,t){
  const base=coast(x,z)?Math.max(this.raw(x,z)+.14,LAGOON_Y+.24):this.raw(x,z)+.14;
  if(!road.b&&!road.bridge)return this.roadProfiles?.get(road)?.sample(t)??base;
  // Continuous deck profile. Both ends join the neighboring street height;
  // raised pedestrian bridges gain a mild arch without a vertical step.
  const rise=/motorway|trunk|primary/.test(road.k)?2.4:/footway|pedestrian|path|steps/.test(road.k)?1.05:1.35;
  const safe=coast(x,z)?Math.max(0,LAGOON_Y+.9-base):0;
  // Cosine lift starts AND ends with zero slope, unlike a sine arch which
  // has an abrupt gradient at the junction to the approaching road.
  const eased=Math.sin(Math.PI*Math.max(0,Math.min(1,t)))**2;
  const arch=coast(x,z)&&road.b?(/motorway|trunk|primary|secondary/.test(road.k)?6.5:4.1):rise;
  return base+(Math.max(rise,arch)+safe)*eased;
 }
 insertSpatial(index,obj,a,b,pad){
  const x0=Math.floor((min(a[0],b[0])-pad)/CELL),x1=Math.floor((max(a[0],b[0])+pad)/CELL),z0=Math.floor((min(a[1],b[1])-pad)/CELL),z1=Math.floor((max(a[1],b[1])+pad)/CELL);
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
   const k=x+','+z;if(!index.has(k))index.set(k,[]);index.get(k).push(obj);
  }
 }
 near(index,x,z){
  const out=[],xx=Math.floor(x/CELL),zz=Math.floor(z/CELL);
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)out.push(...(index.get((xx+dx)+','+(zz+dz))||[]));
  return out;
 }
 bucket(x,z){const k=key(x,z,CHUNK);if(!this.chunks.has(k))this.chunks.set(k,{buildings:[],roads:[],water:[],areas:[]});return this.chunks.get(k);}
 segment(type,source,a,b,t0=0,t1=1){
  const len=distance(a[0],a[1],b[0],b[1]);if(len<.12)return;
  // Long OSM ways are split before chunking: no road disappears between
  // adjacent 320 m sectors when its original way spans several kilometres.
  const major=type==='roads'&&/motorway|trunk|primary|secondary/.test(source.k||'');
  const cuts=type==='roads'?regionalChunkCuts(a,b,CHUNK,
   major?(/motorway|trunk/.test(source.k||'')?24:35):/footway|path|cycleway/.test(source.k||'')?88:68):
   regionalChunkCuts(a,b,CHUNK,108);
  for(let i=1;i<cuts.length;i++){
   const f=cuts[i-1],g=cuts[i],p=[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f],q=[a[0]+(b[0]-a[0])*g,a[1]+(b[1]-a[1])*g];
   if(max(p[0],q[0])<PADOVA_EAST-180)continue;
   const m=[(p[0]+q[0])/2,(p[1]+q[1])/2],item={a:p,b:q,w:source.w||4,k:source.k||'',access:source.access,junction:source.junction,roundabout:source.roundabout,j:source.j,oneway:source.oneway||source.one||false,lanes:Number(source.lanes)||0,chain:(this.roadLengths.get(source)||0)*(t0+(t1-t0)*(f+g)*.5),bri:!!(source.b||source.bridge),tMid:t0+(t1-t0)*(f+g)*.5,yA:type==='roads'?this.roadY(source,...p,t0+(t1-t0)*f):this.raw(...p),yB:type==='roads'?this.roadY(source,...q,t0+(t1-t0)*g):this.raw(...q)};
   this.bucket(...m)[type].push(item);
   if(type==='roads'){
    this.insertSpatial(this.roads,item,p,q,item.w*.5+3);
    // Simple physical parapets match the rendered bridge edges and prevent
    // stepping/driving through a bridge side straight into the water.
    if(item.bri&&regionalDetail(...m)==='detailed'){
     const dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz)||1,
      nx=-dz/len,nz=dx/len,offset=item.w*.5+.18,thickness=.20;
     for(const side of [-1,1]){
      const edge=offset*side,outer=(offset+thickness)*side;
      const poly=[[p[0]+nx*edge,p[1]+nz*edge],[q[0]+nx*edge,q[1]+nz*edge],
       [q[0]+nx*outer,q[1]+nz*outer],[p[0]+nx*outer,p[1]+nz*outer]],
       xs=poly.map(v=>v[0]),zs=poly.map(v=>v[1]);
      const barrier={p:poly,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),
       minY:Math.min(item.yA,item.yB)+.08,h:.82+Math.abs(item.yB-item.yA)};
      this.collision.add(barrier,barrier.minX,barrier.minZ,barrier.maxX,barrier.maxZ);
     }
    }
   }
   if(type==='water')this.insertSpatial(this.waters,item,p,q,item.w*.5+3);
  }
 }
 index(){
  // Shared actual OSM vertices only: roads merely crossing under a bridge
  // must not be asphalt-filled as an at-grade intersection.
  for(const r of this.data.roads||[]){
   if(r.p?.length<2||/footway|path|steps|cycleway/.test(r.k||''))continue;
   const layer=(r.b||r.bridge)?1:Number(r.layer)||0;
   for(const [i,p] of r.p.entries()){
    if(!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
    const code=p[0].toFixed(1)+','+p[1].toFixed(1)+':'+layer;
    if(!this.junctions.has(code))this.junctions.set(code,{p,ways:new Set(),w:0});
    const j=this.junctions.get(code);j.w=Math.max(j.w,r.w||3);j.ways.add(r);
   }
  }
  for(const r of this.data.roads||[]){
   if(r.p?.length<2)continue;
   if(!r.b&&!r.bridge){
    const roadBase=(x,z)=>coast(x,z)?Math.max(this.raw(x,z)+.14,LAGOON_Y+.24):this.raw(x,z)+.14;
    this.roadProfiles.set(r,smoothRegionalRoadProfile(r.p,roadBase,r.k));
   }
   const lengths=r.p.slice(1).map((p,i)=>distance(p[0],p[1],r.p[i][0],r.p[i][1])),total=lengths.reduce((a,b)=>a+b,0);this.roadLengths.set(r,total);let used=0;
   for(let i=1;i<r.p.length;i++){const len=lengths[i-1];this.segment('roads',r,r.p[i-1],r.p[i],total?used/total:0,total?(used+len)/total:1);used+=len;}
  }
  for(const w of this.data.water||[])if(w.p?.length>=2)for(let i=1;i<w.p.length;i++)this.segment('water',w,w.p[i-1],w.p[i]);
  // Preserve the real bank/shore direction. OSM has water on the RIGHT
  // of coastline ways; in our south-positive world coordinates this means
  // positive 2D cross product is water and negative is land.
  for(const shoreline of this.data.shorelines||[]){
   if(!Array.isArray(shoreline.p))continue;
   for(let i=1;i<shoreline.p.length;i++){
    const a=shoreline.p[i-1],b=shoreline.p[i];
    if(Math.max(a[0],b[0])<27000||Math.min(a[0],b[0])>41000)continue;
    if(Math.max(a[1],b[1])<-10500||Math.min(a[1],b[1])>9700)continue;
    const item={a,b},len=distance(...a,...b);
    if(len<.05)continue;
    const steps=Math.max(1,Math.ceil(len/160));
    for(let n=0;n<steps;n++){
     const p=[a[0]+(b[0]-a[0])*n/steps,a[1]+(b[1]-a[1])*n/steps],
      q=[a[0]+(b[0]-a[0])*(n+1)/steps,a[1]+(b[1]-a[1])*(n+1)/steps];
     this.insertSpatial(this.shorelines,{a:p,b:q},p,q,420);
    }
   }
  }
  for(const b of this.data.buildings||[]){
   if(!b.p||b.p.length<3)continue;
   const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),x0=Math.min(...xs),z0=Math.min(...zs),x1=Math.max(...xs),z1=Math.max(...zs),x=(x0+x1)/2,z=(z0+z1)/2;
   if(x<PADOVA_EAST-180)continue;
   const obj={...b,minX:x0,maxX:x1,minZ:z0,maxZ:z1,cx:x,cz:z,minY:this.raw(x,z),h:Math.max(2.6,Math.min(75,b.h||7))};
   if(b.dealerSite)Object.assign(b,{minX:x0,maxX:x1,minZ:z0,maxZ:z1,cx:x,cz:z,minY:obj.minY,h:obj.h});
   obj.roofTriangles=regionalRoofTriangles(obj);obj.lod=regionalDetail(x,z);this.bucket(x,z).buildings.push(obj);
   if(obj.dealerSite)for(const wall of dealerWallParts(obj))this.collision.add(wall,wall.minX,wall.minZ,wall.maxX,wall.maxZ);
   else this.collision.add(obj,x0,z0,x1,z1);
   // The lagoon's island mask must retain full-size quay buildings.
   if(coastalBand(x,z))this.insertSpatial(this.buildingAreas,obj,[x0,z0],[x1,z1],5);
  }
  for(const a of this.data.areas||[]){
   if(a.p?.length<3)continue;
   const xs=a.p.map(p=>p[0]),zs=a.p.map(p=>p[1]),
    x0=Math.min(...xs),z0=Math.min(...zs),x1=Math.max(...xs),z1=Math.max(...zs);
   if(x1<PADOVA_EAST-180)continue;
   const dx=x1-x0,dz=z1-z0;
   if(a.k==='water'&&dx<8500&&dz<8500)this.insertSpatial(this.waterAreas,a,[x0,z0],[x1,z1],2);
   if(a.k==='land'&&dx<6500&&dz<6500)this.insertSpatial(this.landAreas,a,[x0,z0],[x1,z1],1);
   // A coastal basin spanning several chunks must be clipped and streamed in
   // EACH intersecting sector, not only in the sector holding its centroid.
   const minIx=Math.max(Math.floor((PADOVA_EAST-180)/CHUNK),Math.floor(x0/CHUNK)),
    maxIx=Math.floor(x1/CHUNK),minIz=Math.floor(z0/CHUNK),maxIz=Math.floor(z1/CHUNK);
   if((maxIx-minIx+1)*(maxIz-minIz+1)>1100)continue;
   for(let ix=minIx;ix<=maxIx;ix++)for(let iz=minIz;iz<=maxIz;iz++){
    let clipped=clipPolygon(a.p,ix*CHUNK,iz*CHUNK,(ix+1)*CHUNK,(iz+1)*CHUNK);
    if(clipped.length>220){
     const step=Math.ceil(clipped.length/200);
     clipped=clipped.filter((_,n)=>n%step===0);
    }
    if(clipped.length>=3){
     const holes=(a.holes||[]).map(h=>clipPolygon(h,ix*CHUNK,iz*CHUNK,(ix+1)*CHUNK,(iz+1)*CHUNK))
      .filter(h=>h.length>=3);
     this.bucket((ix+.5)*CHUNK,(iz+.5)*CHUNK).areas.push({...a,p:clipped,holes});
    }
   }
  }
  this.dataReady=true;
 }
 nearestRoad(x,z,maxDist=24,referenceY=null,eligible=null){
  let best=null,score=Infinity;
  for(const r of new Set(this.near(this.roads,x,z))){
   if(eligible&&!eligible(r))continue;
   const vx=r.b[0]-r.a[0],vz=r.b[1]-r.a[1],den=vx*vx+vz*vz;
   const t=den?Math.max(0,Math.min(1,((x-r.a[0])*vx+(z-r.a[1])*vz)/den)):0;
   const px=r.a[0]+vx*t,pz=r.a[1]+vz*t,d=distance(x,z,px,pz);
   if(d>=maxDist)continue;
   const y=r.yA+(r.yB-r.yA)*t,delta=referenceY===null?0:Math.abs(y-referenceY),
    // On parallel overpasses, prefer the deck at the player's actual Y.
    // Minor footways must not steal the contact of a car on the adjacent highway.
    penalty=delta>1?Math.min(14,(delta-1)*3):0,
    weight=d+penalty+(/footway|steps|cycleway/.test(r.k)?Math.min(.5,r.w*.07):0);
   if(weight<score){score=weight;best={road:r,d,x:px,z:pz,y,yaw:Math.atan2(vx,vz)};}
  }
  return best;
 }
 waterSurface(x,z){
  // Venice/Marghera share a lagoon datum; inland river strips retain the
  // local smoothed DEM until real surveyed channel levels are supplied.
  return harborBand(x)?LAGOON_Y+.08:this.raw(x,z)+.08;
 }
 inPoly(index,x,z){
  for(const a of new Set(this.near(index,x,z))){
   if(pointInside(x,z,a.p)&&!(a.holes||[]).some(h=>pointInside(x,z,h)))return true;
  }
  return false;
 }
 mappedWater(x,z){
  if(this.inPoly(this.waterAreas,x,z))return true;
  for(const w of new Set(this.near(this.waters,x,z))){
   if(this.inPoly(this.waterAreas,(w.a[0]+w.b[0])/2,(w.a[1]+w.b[1])/2))continue;
   const vx=w.b[0]-w.a[0],vz=w.b[1]-w.a[1],den=vx*vx+vz*vz,
    t=den?Math.max(0,Math.min(1,((x-w.a[0])*vx+(z-w.a[1])*vz)/den)):0;
   if(distance(x,z,w.a[0]+t*vx,w.a[1]+t*vz)<w.w*.5)return true;
  }
  return false;
 }
 waterSample(x,z){
  let closest=Infinity;
  for(const a of new Set(this.near(this.waterAreas,x,z))){
   const inside=pointInside(x,z,a.p);
   let edge=Infinity;
   for(let i=0;i<a.p.length;i++){
    const p=a.p[i],q=a.p[(i+1)%a.p.length],
     vx=q[0]-p[0],vz=q[1]-p[1],den=vx*vx+vz*vz,
     t=den?Math.max(0,Math.min(1,((x-p[0])*vx+(z-p[1])*vz)/den)):0;
    edge=Math.min(edge,distance(x,z,p[0]+t*vx,p[1]+t*vz));
   }
   closest=Math.min(closest,inside?-Math.max(.01,edge):edge);
  }
  for(const w of new Set(this.near(this.waters,x,z))){
   if(this.inPoly(this.waterAreas,(w.a[0]+w.b[0])/2,(w.a[1]+w.b[1])/2))continue;
   const vx=w.b[0]-w.a[0],vz=w.b[1]-w.a[1],den=vx*vx+vz*vz,
    t=den?Math.max(0,Math.min(1,((x-w.a[0])*vx+(z-w.a[1])*vz)/den)):0;
   closest=Math.min(closest,distance(x,z,w.a[0]+t*vx,w.a[1]+t*vz)-w.w*.5);
  }
  if(this.lagoonAt(x,z))closest=Math.min(closest,-120);
  return {distance:closest,level:Number.isFinite(closest)?this.waterSurface(x,z):undefined};
 }
 shoreSide(x,z){
  let nearest=Infinity,sign=null;
  for(const line of new Set(this.near(this.shorelines,x,z))){
   const vx=line.b[0]-line.a[0],vz=line.b[1]-line.a[1],
    den=vx*vx+vz*vz;if(den<1e-6)continue;
   const t=Math.max(0,Math.min(1,((x-line.a[0])*vx+(z-line.a[1])*vz)/den)),
    nx=line.a[0]+vx*t,nz=line.a[1]+vz*t,d=distance(x,z,nx,nz);
   if(d<nearest){nearest=d;sign=(vx*(z-line.a[1])-vz*(x-line.a[0]));}
  }
  // Do not let a remote segment decide land vs sea across another island.
  return nearest<530&&sign!==null?sign>=0?1:-1:0;
 }
 lagoonAt(x,z){
  if(!coastalBand(x,z))return false;
  // True land-use polygons, exposed island building footprints and dry quays
  // carve holes in the broad open-lagoon surface.
  if(this.inPoly(this.landAreas,x,z))return false;
  for(const b of new Set(this.near(this.buildingAreas,x,z)))
   if(x>=b.minX-8&&x<=b.maxX+8&&z>=b.minZ-8&&z<=b.maxZ+8)return false;
  const road=this.nearestRoad(x,z,18);
  if(road&&road.d<road.road.w*.5+7&&!road.road.bri)return false;
  const shore=this.shoreSide(x,z);
  if(shore<0)return false; // inland side of an actually mapped shoreline
  if(shore>0)return true;  // sea side at the real Venetian coast
  if(x<33500&&this.raw(x,z)>LAGOON_Y+.04)return false;
  return true;
 }
 ground(x,z){
  if(this.mappedWater(x,z)||this.lagoonAt(x,z))return Math.min(this.raw(x,z),this.waterSurface(x,z)-.4)+.05;
  // Elevated island/industrial parcels must not disappear beneath the water
  // plane merely because a coarse DEM returned a sea-level sample.
  return coastalBand(x,z)?Math.max(this.raw(x,z),LAGOON_Y+.23)+.05:this.raw(x,z)+.05;
 }
 height(x,z,referenceY=null){
  const support=this.nearestRoad(x,z,25,referenceY);
  if(support&&(referenceY===null||Math.abs(support.y-referenceY)<3.7)){
   const edge=support.road.w*.5+.85;
   if(support.d<edge)return support.y+.065;
   if(!support.road.bri&&support.d<edge+2.3){
    // The broad physical shoulder is the same sloped embankment drawn below.
    // Cars can run across the asphalt edge without hitting an invisible step.
    const ground=this.ground(x,z),t=1-(support.d-edge)/2.3;
    return ground+(support.y+.065-ground)*t;
   }
  }
  return this.ground(x,z);
 }
 waterAt(x,z,margin=0,referenceY=null){
  const support=this.nearestRoad(x,z,25);
  if(support&&support.road.bri&&support.d<support.road.w*.5+margin+1
    &&(referenceY===null||referenceY>=support.y-.8))return null;
  if(support&&support.d<support.road.w*.5+margin
    &&support.y>=this.waterSurface(x,z)-.12
    &&(referenceY===null||referenceY>=support.y-.8))return null;
  if(this.mappedWater(x,z)||this.lagoonAt(x,z))return this.waterSurface(x,z);
  return null;
 }
 installTerrainHooks(terrain){
  const roofs=installRoofSurfaces(terrain);for(const ch of this.chunks.values())for(const b of ch.buildings)roofs.add(b,b.roofTriangles);
  const original={raw:terrain.rawElevation.bind(terrain),elevation:terrain.elevation.bind(terrain),ground:terrain.groundHeight.bind(terrain),height:terrain.height.bind(terrain),water:terrain.waterAt.bind(terrain),waterHeight:terrain.waterHeight.bind(terrain),
   waterSample:terrain.waterSample.bind(terrain),waterDistance:terrain.waterDistance.bind(terrain),bridge:terrain.bridge.bind(terrain)};
  const active=(x,z)=>this.contains(x,z);
  terrain.rawElevation=(x,z)=>active(x,z)?this.raw(x,z):original.raw(x,z);
  terrain.elevation=(x,z)=>active(x,z)?this.raw(x,z):original.elevation(x,z);
  terrain.groundHeight=(x,z)=>active(x,z)?this.ground(x,z):original.ground(x,z);
  terrain.height=(x,z,ref=null)=>dealerSurfaceHeight(terrain,x,z)??(active(x,z)?this.height(x,z,ref):original.height(x,z,ref));
  terrain.waterAt=(x,z,margin=0,ref=null)=>active(x,z)?this.waterAt(x,z,margin,ref):original.water(x,z,margin,ref);
  terrain.waterHeight=(x,z)=>active(x,z)?this.waterSurface(x,z):original.waterHeight(x,z);
  terrain.waterSample=(x,z)=>active(x,z)?this.waterSample(x,z):original.waterSample(x,z);
  terrain.waterDistance=(x,z)=>active(x,z)?this.waterSample(x,z).distance:original.waterDistance(x,z);
  terrain.bridge=(x,z,margin=0,referenceY=null)=>{
   if(!active(x,z))return original.bridge(x,z,margin,referenceY);
   const support=this.nearestRoad(x,z,25);
   if(support?.road.bri&&support.d<support.road.w*.5+margin+1)return {height:support.y,y:support.y,road:support.road};
   return null;
  };
  installRoofSurfaces(terrain);
 }
 *tileSteps(ix,iz){
  const x=(ix+.5)*CHUNK,z=(iz+.5)*CHUNK,profile=this.streamProfile(x,z),arr=[],
   steps=regionalDetail(x,z)==='detailed'?profile.tileDetail:profile.tileFar,n=CHUNK,
   heights=new Float32Array((steps+1)*(steps+1));
  let work=0;
  for(let j=0;j<=steps;j++)for(let i=0;i<=steps;i++){
   const px=ix*n+i*n/steps,pz=iz*n+j*n/steps;
   heights[j*(steps+1)+i]=this.ground(px,pz);
   if(++work%4===0)yield;
  }
  for(let j=0;j<steps;j++)for(let i=0;i<steps;i++){
   const px=ix*n+i*n/steps,pz=iz*n+j*n/steps,px1=px+n/steps,pz1=pz+n/steps,
    a=[px,heights[j*(steps+1)+i],pz],b=[px1,heights[j*(steps+1)+i+1],pz],
    c=[px1,heights[(j+1)*(steps+1)+i+1],pz1],d=[px,heights[(j+1)*(steps+1)+i],pz1];
   addQuad(arr,a,b,c,d);
  }
  const tile=new THREE.Mesh(geometry(arr),green);tile.receiveShadow=false;return tile;
 }
 tile(ix,iz){
  const steps=this.tileSteps(ix,iz);let result;do{result=steps.next();}while(!result.done);return result.value;
 }
 detailedBuilding(b,wall,roof){
  const p=b.p,h=b.h,base=b.minY;const poly=p.map(v=>new THREE.Vector2(v[0],v[1])),tri=THREE.ShapeUtils.triangulateShape(poly,[]);
  for(let i=0;i<p.length;i++){const a=p[i],d=p[(i+1)%p.length],ay=this.raw(...a),dy=this.raw(...d);
   addQuad(wall,[a[0],ay,a[1]],[d[0],dy,d[1]],[d[0],dy+h,d[1]],[a[0],ay+h,a[1]]);
  }
  for(const t of b.roofTriangles||regionalRoofTriangles(b))for(const v of t)roof.push(...v);
 }
 // Regional cars are shared Padova vehicle entities, never scenic-only props.
 attachTraffic({cars,terrain,player,collision}){
  this.sim={cars,terrain,player,collision};
  for(const group of this.visible.values())for(const actor of group.userData.ambient||[])
   if(actor.regionalTraffic&&!actor.registered){cars.push(actor);actor.registered=true;}
 }
 claimCar(car){
  if(!car?.regionalTraffic)return;
  const group=car.chunkGroup;
  if(group){group.userData.ambient=group.userData.ambient.filter(a=>a!==car);
   group.remove(car.mesh);this.scene.add(car.mesh);}
  // The player retains their real car when the original town chunk unloads.
  car.chunkGroup=null;car.regionalTraffic=false;car.regionClaimed=true;
  car.parked=true;car.speed=0;
 }
 removeGroup(group){
  if(!group)return;
  for(const a of group.userData.ambient||[]){
   if(!a.regionalTraffic||!a.registered||!this.sim)continue;
   if(this.sim.player.car===a){this.claimCar(a);continue;}
   const i=this.sim.cars.indexOf(a);if(i!==-1)this.sim.cars.splice(i,1);
   a.registered=false;
  }
 }
 refreshTrafficCells(cars){
  this.trafficCells.clear();
  for(const car of cars||[]){
   if(!car?.mesh?.visible||!Number.isFinite(car.x)||!Number.isFinite(car.z))continue;
   const k=Math.floor(car.x/120)+','+Math.floor(car.z/120);
   if(!this.trafficCells.has(k))this.trafficCells.set(k,[]);
   this.trafficCells.get(k).push(car);
  }
 }
 nearbyTraffic(actor){
  const out=[],cx=Math.floor(actor.x/120),cz=Math.floor(actor.z/120);
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)
   for(const car of this.trafficCells.get((cx+dx)+','+(cz+dz))||[])
    if(car!==actor&&distance(car.x,car.z,actor.x,actor.z)<90)out.push(car);
  return out;
 }
 disableRegionalCar(actor,time){
  if(actor.spec.fuelTank){this.regionalExplosion(actor,time);return;}
  actor.speed=0;actor.parked=true;actor.crashDisabled=true;
  updateVehicleDamage(actor,0,time);
 }
 regionalExplosion(actor,time){
  if(actor.exploded)return;
  actor.exploded=true;actor.parked=true;actor.speed=0;
  actor.destroyedUntil=time+17;
  markVehicleWreck(actor,time,true);
  const mesh=new THREE.InstancedMesh(
   new THREE.SphereGeometry(1,6,4),
   new THREE.MeshBasicMaterial({color:'#ff893c',transparent:true,opacity:.85,depthWrite:false}),12);
  this.scene.add(mesh);
  this.explosions.push({mesh,x:actor.x,y:actor.y,z:actor.z,born:time});
 }
 updateExplosions(time){
  for(let i=this.explosions.length-1;i>=0;i--){
   const e=this.explosions[i],age=time-e.born;
   if(age>1.5){this.scene.remove(e.mesh);e.mesh.geometry.dispose();
    e.mesh.material.dispose();this.explosions.splice(i,1);continue;}
   const o=new THREE.Object3D();
   for(let n=0;n<12;n++){const a=n*2.39996;
    o.position.set(e.x+Math.cos(a)*age*(2+n%3),e.y+1+age*(3+n%4),e.z+Math.sin(a)*age*(2+n%3));
    o.scale.setScalar(Math.max(.02,(1-age/1.5)*(1+n%3*.5)));o.updateMatrix();e.mesh.setMatrixAt(n,o.matrix);}
   e.mesh.instanceMatrix.needsUpdate=true;e.mesh.material.opacity=Math.max(0,1-age/1.5);
  }
 }
 nextTrafficRoad(actor){
  const r=actor.r,forward=actor.dir===1,p=forward?r.b:r.a,
   dx=(r.b[0]-r.a[0])*actor.dir,dz=(r.b[1]-r.a[1])*actor.dir,len=Math.hypot(dx,dz)||1;
  let winner=null,best=-Infinity;
  for(const q of new Set(this.near(this.roads,p[0],p[1]))){
   if(q===r)continue;
   for(const [at,dir] of [[q.a,1],[q.b,-1]]){
    actor._candidateDir=dir;
    if(!regionalRoadEligible(q,actor)||distance(...at,...p)>1.8||
       Math.abs((dir===1?q.yA:q.yB)-(forward?r.yB:r.yA))>2.5)continue;
    const vx=(q.b[0]-q.a[0])*dir,vz=(q.b[1]-q.a[1])*dir,m=Math.hypot(vx,vz)||1,
     score=(dx*vx+dz*vz)/(len*m)-(q===actor.previous?1.1:0);
    if(score>best&&score>-.5){winner={r:q,dir,yaw:Math.atan2(vx,vz)};best=score;}
   }
  }
  delete actor._candidateDir;
  return winner;
 }
 updateRegionalCar(actor,dt,time){
  if(!this.sim)return;
  const {terrain,player,cars,collision}=this.sim;
  if(player.car===actor)return;
  if(actor.destroyedUntil){
   if(time<actor.destroyedUntil||distance(actor.x,actor.z,player.x,player.z)<65)return;
   const r=actor.r,t=actor.dir===1?.23:.77,
    x=r.a[0]+(r.b[0]-r.a[0])*t,z=r.a[1]+(r.b[1]-r.a[1])*t;
   reviveRegionalCar(actor,x,z,Math.atan2((r.b[0]-r.a[0])*actor.dir,(r.b[1]-r.a[1])*actor.dir),terrain);
   actor.destroyedUntil=0;actor.exploded=false;
  }
  if(actor.health<=0){this.disableRegionalCar(actor,time);return;}
  if(actor.parked)return;
  const r=actor.r,vx=r.b[0]-r.a[0],vz=r.b[1]-r.a[1],
   len2=Math.max(.01,vx*vx+vz*vz),
   progress=Math.max(0,Math.min(1,((actor.x-r.a[0])*vx+(actor.z-r.a[1])*vz)/len2)),
   endpoint=actor.dir===1?r.b:r.a,
   terminalDistance=distance(actor.x,actor.z,...endpoint);
  actor.t=progress;
  // Curves and interchanges follow actual connected OSM nodes at the same
  // elevation, not an overlay or a route teleported between chunk borders.
  let next=null;
  if(terminalDistance<Math.max(13,actor.speed*1.1)){
   next=this.nextTrafficRoad(actor);actor.nextYaw=next?.yaw??null;
  }else actor.nextYaw=null;
  if(terminalDistance<Math.max(1.7,actor.speed*dt*1.15)||
     actor.dir===1&&progress>.995||actor.dir===-1&&progress<.005){
   if(next){actor.previous=r;actor.r=next.r;actor.dir=next.dir;actor.road=next.r;
    actor.lane=Math.min(actor.lane||0,laneCount(next.r)-1);
    actor.laneOffset=laneOffset(next.r,actor.lane);
   }else{
    if(regionalOneWay(r)){actor.speed=0;actor.parked=true;return;}
    actor.dir*=-1;actor.speed=Math.min(actor.speed,3);
   }
  }
  const nearby=this.nearbyTraffic(actor);
  regionalNpcStep(actor,nearby,player,Math.max(.001,Math.min(.075,dt)),terrain,collision,time);
  if(actor.health<=0)this.disableRegionalCar(actor,time);
 }
 safeWalk(x,z,y){
  if(this.sim&&(this.sim.terrain.dry?.(x,z,.5,y)===false))return false;
  for(const r of this.near(this.roads,x,z)){
   const q=nearestOnSegment(x,z,r.a,r.b),d=distance(x,z,q.x,q.z);
   if(d>r.w/2+4||Math.abs((r.yA+(r.yB-r.yA)*q.t)-y)>2.3)continue;
   if(!pedestrianRoadAllowed(r))return false;
   if(!/^(footway|path|pedestrian|living_street)$/.test(r.k)&&d<r.w/2+.55)return false;
  }
  if(this.sim?.collision)for(const b of this.sim.collision.near(x,z,.5))if(pointInside(x,z,b.p)&&y<(b.minY||0)+b.h&&y+1.7>(b.minY||0))return false;
  return true;
 }
 ambient(group,chunk){
  // Padova vehicle and pedestrian models at EVERY quality; LOD controls how
  // many are spawned, never swaps them for grey rectangular proxies.
  const roads=chunk.roads.filter(r=>r.w>=2.75&&!/footway|path|steps|cycleway|pedestrian|construction/.test(r.k)&&
   (r.a[0]+r.b[0])*.5>PADOVA_EAST+60);
  const within=roads.filter(r=>this.focus&&distance((r.a[0]+r.b[0])*.5,(r.a[1]+r.b[1])*.5,this.focus.x,this.focus.z)<620);
  const available=within.length?within:roads,actors=[],
   industrial=roads.some(r=>r.a[0]>26500&&r.a[0]<33700),
   townFleet=['nido','rondine','botanica','argine','viaggio','selva','saetta','meridiana','doge','vortice','campo','comitiva','naked','enduro','supersport','touring','cisterna','camionrampa'],
   industryFleet=['corriere','officina','cantiere','tir','cisterna','camionrampa','campo','autotreno','selva','argine'];
  const profile=this.streamProfile(this.focus?.x||0,this.focus?.z||0);
  const count=available.length?Math.min(profile.cars,
   Math.max(1,Math.ceil(available.length/(this.quality==='hyper'?27:17)))):0;
  for(let i=0;i<count;i++){
   const r=available[(i*97+chunk.roads.length*11)%available.length];
   // Stable per-road encounters survive sector unloading/reloading. Independent
   // PRNG draws retain the same rarity and equal availability of all 15 models.
   let rareSeed=(Math.imul(Math.round(r.a[0]*10),73856093)^Math.imul(Math.round(r.a[1]*10),19349663)^Math.imul(i+1,83492791))>>>0;
   const rareRandom=()=>{rareSeed=(Math.imul(rareSeed,1664525)+1013904223)>>>0;return rareSeed/4294967296;};
   const collector=rareCollectorStyle(rareRandom,r),
    heavy=i===0&&r.w>=8&&chunk.roads.length%7===0,
    fleet=industrial?industryFleet:townFleet,
    requested=collector||(heavy?'autotreno':fleet[Math.abs(Math.floor(r.a[0]*.07+r.a[1]*.13)+i*11)%fleet.length]),
    style=VEHICLES[requested]&&VEHICLES[requested].width+1.1<=r.w?requested:
     'nido',
    spec=VEHICLES[style],mesh=regionalCar(style),dir=regionalOneWay(r)|| (i%2?1:-1),
    t=.22+(i%3)*.19,dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],
    yaw=Math.atan2(dx*dir,dz*dir),x=r.a[0]+dx*t,z=r.a[1]+dz*t,
    car={mesh,r,road:r,t,dir,style,spec,name:spec.name,x,z,
     y:this.height(x,z),yaw,speed:2.3,health:100,driver:.82+(i%5)*.05,
     parked:false,regionManaged:true,regionalTraffic:true,chunkGroup:group,
     lane:i%laneCount(r),desiredLane:i%laneCount(r),laneOffset:laneOffset(r,i%laneCount(r)),priority:i,
     longAccel:0,lastCollision:0,nextYaw:null,registered:false,knockX:0,knockZ:0,spin:0};
   installVehicleDamage(car);
   mesh.traverse(o=>{if(o.isMesh||o.isLineSegments)o.userData.regionalAmbientShared=true;});
   car.x+=Math.cos(yaw)*car.laneOffset;car.z-=Math.sin(yaw)*car.laneOffset;mesh.position.set(car.x,car.y,car.z);mesh.rotation.y=yaw;group.add(mesh);actors.push(car);
   if(this.sim){this.sim.cars.push(car);car.registered=true;}
  }
  const walkways=chunk.roads.filter(r=>/^(footway|pedestrian|path|residential|living_street|service)$/.test(r.k)&&pedestrianRoadAllowed(r));
  const peopleCount=Math.min(profile.people,Math.ceil(walkways.length/8));
  for(let i=0;i<peopleCount;i++){
   const r=walkways[(i*13+walkways.length*5)%walkways.length];if(!r)continue;
   const t=(i*.29+.17)%1,side=/residential|living_street|service/.test(r.k)?(i%2?1:-1)*(r.w*.5+1.25):0,
    dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],len=Math.hypot(dx,dz)||1,
    x=r.a[0]+dx*t-dz/len*side,z=r.a[1]+dz*t+dx/len*side,
    mesh=regionalPerson(Math.abs(Math.floor(r.a[0]+r.a[1])+i)%6),
    person={mesh,r,t,dir:i%2?1:-1,person:true,detail:true,priority:i,side,x,z,y:this.height(x,z),speed:1.3,health:100};
   if(!this.safeWalk(x,z,person.y))continue;mesh.position.set(x,person.y+.08,z);group.add(mesh);actors.push(person);
  }
  group.userData.ambient=actors;
 }
 *buildSteps(k){
  if(this.visible.has(k))return;
  const [ix,iz]=k.split(',').map(Number),src=this.chunks.get(k)||{buildings:[],roads:[],water:[],areas:[]};
  const group=new THREE.Group(),tileSteps=this.tileSteps(ix,iz);let tileResult;
  do{tileResult=tileSteps.next();if(!tileResult.done)yield;}while(!tileResult.done);
  group.add(tileResult.value);yield;
  const profile=this.streamProfile(this.focus?.x||0,this.focus?.z||0),
   near=Math.hypot((ix+.5)*CHUNK-(this.focus?.x||0),(iz+.5)*CHUNK-(this.focus?.z||0))<profile.detailRadius;
  // Fill open lagoon cells with one contiguous blue surface per chunk, but
  // leave holes for real island streets, industrial parcels and quays.
  const sea=[];
  if((ix+1)*CHUNK>=30000&&ix*CHUNK<40500){
   const steps=near?profile.tileDetail:profile.tileFar;
   for(let j=0;j<steps;j++)for(let i=0;i<steps;i++){
    const x=ix*CHUNK+(i+.5)*CHUNK/steps,z=iz*CHUNK+(j+.5)*CHUNK/steps;
    if(!this.lagoonAt(x,z))continue;
    const x0=ix*CHUNK+i*CHUNK/steps,z0=iz*CHUNK+j*CHUNK/steps,
      x1=x0+CHUNK/steps,z1=z0+CHUNK/steps,y=LAGOON_Y+.1;
    addQuad(sea,[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]);
   }
  }
  if(sea.length){const sheet=new THREE.Mesh(geometry(sea),lagoonMat);sheet.renderOrder=1;group.add(sheet);}
  yield;
  const normal=[],arterial=[],channels=[],balustrade=[],bridgeSupports=[],bridgeUndersides=[],w=[],r=[],blocks=[],energyFaces=[],energyEdges=[],glassFaces=[],shutterFaces=[],roadStripes=[],roadShoulders=[],roadBanks=[],guardRails=[],junctionCaps=[],roadSigns=[],distantWalls=[],facadeFaces=[],brickFaces=[],industrialFaces=[],frameFaces=[],doorFaces=[],pavements=[],crosswalks=[];
  const cappedJunctions=new Set();
  let roadWork=0;
  for(const p of src.roads){
   const roadClass=regionalRoadClass(p.k),major=roadClass==='express',
    arterialRoad=major||roadClass==='arterial',len=distance(...p.a,...p.b);
   // Asphalt, painted markings, painted verge and collision surface use
   // exactly the same pre-solved longitudinal Y, even at chunk boundaries.
   if(arterialRoad){
    surface(roadShoulders,p.a,p.b,p.w+(major?1.5:.65),p.yA+.008,p.yB+.008);
   }
   surface(arterialRoad?arterial:normal,p.a,p.b,p.w,p.yA+.025,p.yB+.025);
   if(near&&arterialRoad&&!p.bri&&len>1.5){
    // Filled slope down to the rendered local DEM: no floating motorways.
    const dx=p.b[0]-p.a[0],dz=p.b[1]-p.a[1],
     nx=-dz/len,nz=dx/len,inner=p.w*.5+(major?.75:.325),outer=inner+2.3;
    for(const side of [-1,1]){
     const a=[p.a[0]+nx*inner*side,p.a[1]+nz*inner*side],
      b=[p.b[0]+nx*inner*side,p.b[1]+nz*inner*side],
      c=[p.b[0]+nx*outer*side,p.b[1]+nz*outer*side],
      d=[p.a[0]+nx*outer*side,p.a[1]+nz*outer*side];
     addQuad(roadBanks,[a[0],p.yA+.009,a[1]],
      [b[0],p.yB+.009,b[1]],[c[0],this.ground(...c)+.01,c[1]],
      [d[0],this.ground(...d)+.01,d[1]]);
    }
   }
   if(near&&major&&len>5&&guardRails.length<5300){
    const nx=-(p.b[1]-p.a[1])/len,nz=(p.b[0]-p.a[0])/len;
    for(const side of [-1,1]){
     const edge=(p.w*.5+1.18)*side,
      ax=p.a[0]+nx*edge,az=p.a[1]+nz*edge,
      bx=p.b[0]+nx*edge,bz=p.b[1]+nz*edge;
     // Continuous visible metal guardrails, separated from the asphalt.
     addQuad(guardRails,[ax,p.yA+.37,az],[bx,p.yB+.37,bz],
      [bx,p.yB+.63,bz],[ax,p.yA+.63,az]);
     const cadence=17,start=p.chain-len*.5;
     for(let mark=Math.ceil(start/cadence)*cadence;mark<start+len;mark+=cadence){
      const t=Math.max(0,Math.min(1,(mark-start)/len)),
       x=ax+(bx-ax)*t,z=az+(bz-az)*t,y=p.yA+(p.yB-p.yA)*t;
      addQuad(guardRails,[x,y+.08,z],[x+.075,y+.08,z+.075],
       [x+.075,y+.63,z+.075],[x,y+.63,z]);
     }
    }
   }
   if(near&&!major&&!p.bri&&junctionCaps.length<4200){
    // Padova-style junction fans close ONLY actual intersecting OSM ways.
    // Grade-clamp edge heights to avoid triangular spikes at junctions.
    for(const [v,y] of [[p.a,p.yA],[p.b,p.yB]]){
     const jkey=v[0].toFixed(1)+','+v[1].toFixed(1)+':0',
      junction=this.junctions.get(jkey);
     if(!junction||junction.ways.size<2||cappedJunctions.has(jkey)||
       v[0]<ix*CHUNK||v[0]>= (ix+1)*CHUNK||
       v[1]<iz*CHUNK||v[1]>= (iz+1)*CHUNK)continue;
     cappedJunctions.add(jkey);
     const radius=Math.min(8,Math.max(2.8,junction.w*.55)),n=12;
     for(let i=0;i<n;i++){
      const angle=i*2*Math.PI/n,next=(i+1)*2*Math.PI/n,
       ax=v[0]+Math.cos(angle)*radius,az=v[1]+Math.sin(angle)*radius,
       bx=v[0]+Math.cos(next)*radius,bz=v[1]+Math.sin(next)*radius,
       grade=radius*.064,
       ay=Math.max(y-grade,Math.min(y+grade,
        this.nearestRoad(ax,az,radius+1,y)?.y??y))+.042,
       by=Math.max(y-grade,Math.min(y+grade,
        this.nearestRoad(bx,bz,radius+1,y)?.y??y))+.042;
      junctionCaps.push(v[0],y+.042,v[1],ax,ay,az,bx,by,bz);
     }
    }
   }
   // Grounded, level sidewalks only in town blocks; no floating decks.
   if(near&&src.buildings.length>8&&!p.bri&&
      /residential|tertiary|secondary|living_street/.test(p.k)&&pavements.length<5500){
    const dx=p.b[0]-p.a[0],dz=p.b[1]-p.a[1],len=Math.hypot(dx,dz);
    if(len>2){const nx=-dz/len,nz=dx/len;
     for(const side of [-1,1]){
      const offset=(p.w*.5+.65)*side,
       a=[p.a[0]+nx*offset,p.a[1]+nz*offset],
       b=[p.b[0]+nx*offset,p.b[1]+nz*offset];
      surface(pavements,a,b,1.2,p.yA+.018,p.yB+.018);
     }
    }
   }
   if(near&&src.buildings.length>14&&!p.bri&&p.w>5&&
      !/motorway|trunk|footway/.test(p.k)&&crosswalks.length<990&&
      distance(...p.a,...p.b)>8&&
      Math.abs(Math.floor(p.a[0]*.17+p.a[1]*.31))%11===0){
    const dx=p.b[0]-p.a[0],dz=p.b[1]-p.a[1],len=Math.hypot(dx,dz),
     ux=dx/len,uz=dz/len,nx=-uz,nz=ux;
    for(let stripe=0;stripe<5;stripe++){
     const t=1.1+stripe*.58,x=p.a[0]+ux*t,z=p.a[1]+uz*t,
      width=p.w*.43,a=[x-nx*width,z-nz*width],b=[x+nx*width,z+nz*width],
      y=p.yA+(p.yB-p.yA)*t/len+.06;
     surface(crosswalks,a,b,.31,y,y);
    }
   }
   if(near&&p.w>=5&&roadStripes.length<4200&&len>1){
    const dx=p.b[0]-p.a[0],dz=p.b[1]-p.a[1],
     nx=-dz/len,nz=dx/len,first=p.chain-len*.5,last=first+len;
    // Stable absolute way-chain metre marks; painted dashes do not randomly
    // restart every time a road enters another 320-m streamed sector.
    const offsets=major&&p.w>=10?[-p.w*.23,p.w*.23]:[0],cadence=7;
    for(const offset of offsets)
     for(let mark=Math.ceil(first/cadence)*cadence;mark<last;mark+=cadence){
      const start=Math.max(0,(mark-first)/len),
       end=Math.min(1,(mark+3.5-first)/len);
      if(end-start<.003)continue;
      const a=[p.a[0]+dx*start+nx*offset,p.a[1]+dz*start+nz*offset],
       b=[p.a[0]+dx*end+nx*offset,p.a[1]+dz*end+nz*offset];
      surface(roadStripes,a,b,major?.14:.11,
       p.yA+(p.yB-p.yA)*start+.055,p.yA+(p.yB-p.yA)*end+.055);
     }
    if(arterialRoad){
     const edge=p.w*.5-(major?.30:.23);
     for(const side of [-1,1]){
      const a=[p.a[0]+nx*edge*side,p.a[1]+nz*edge*side],
       b=[p.b[0]+nx*edge*side,p.b[1]+nz*edge*side];
      surface(roadStripes,a,b,.11,p.yA+.06,p.yB+.06);
     }
    }
   }
   if(near&&p.w>=5.3&&!/footway|steps|cycleway/.test(p.k)&&
       distance(...p.a,...p.b)>12&&roadSigns.length<250&&
       Math.abs(Math.floor(p.a[0]*.021+p.a[1]*.034))%19===0){
    const len=distance(...p.a,...p.b),nx=-(p.b[1]-p.a[1])/len,nz=(p.b[0]-p.a[0])/len,
     x=(p.a[0]+p.b[0])*.5+nx*(p.w*.5+1.2),
     z=(p.a[1]+p.b[1])*.5+nz*(p.w*.5+1.2),y=(p.yA+p.yB)*.5;
    addQuad(roadSigns,[x,y,z],[x+.09,y,z],[x+.09,y+2,z],[x,y+2,z]);
    addQuad(roadSigns,[x-.4,y+1.75,z],[x+.4,y+1.75,z],[x+.4,y+2.34,z],[x-.4,y+2.34,z]);
   }
   if(p.bri&&near){
     // Physical-looking batched underside, visible to future boat players.
     surface(bridgeUndersides,p.a,p.b,Math.max(2,p.w-.2),p.yA-.23,p.yB-.23);
    const dx=p.b[0]-p.a[0],dz=p.b[1]-p.a[1],len=Math.hypot(dx,dz)||1,
     nx=-dz/len*(p.w*.5+.18),nz=dx/len*(p.w*.5+.18);
    // Real vertical rails, not thin horizontal strips floating above a deck.
    for(const side of [-1,1]){
     const a=[p.a[0]+nx*side,p.a[1]+nz*side],
      b=[p.b[0]+nx*side,p.b[1]+nz*side];
     addQuad(balustrade,[a[0],p.yA+.08,a[1]],[b[0],p.yB+.08,b[1]],
      [b[0],p.yB+.82,b[1]],[a[0],p.yA+.82,a[1]]);
    }
    // Major lagoon bridges get visible supporting pillars, so the Ponte
    // della Libertà is not perceived as a road suspended in empty space.
    const mid=[(p.a[0]+p.b[0])/2,(p.a[1]+p.b[1])/2],top=(p.yA+p.yB)/2-.1;
    if(coast(...mid)&&(p.w>=7||(p.tMid!==undefined&&
       (p.tMid<.07||p.tMid>.93)))){
     const bottom=LAGOON_Y-1.5,half=.42;
     if(top-bottom>.8)for(const side of [-1,1]){
      const cx=mid[0]+nx*side*.54,cz=mid[1]+nz*side*.54;
      addQuad(bridgeSupports,[cx-half,bottom,cz-half],[cx+half,bottom,cz-half],
       [cx+half,top,cz-half],[cx-half,top,cz-half]);
      addQuad(bridgeSupports,[cx+half,bottom,cz-half],[cx+half,bottom,cz+half],
       [cx+half,top,cz+half],[cx+half,top,cz-half]);
     }
    }
   }
   if(++roadWork%8===0)yield;
  }
  let waterWork=0;
  for(const p of src.water){
   const cx=(p.a[0]+p.b[0])/2,cz=(p.a[1]+p.b[1])/2;
   if(this.inPoly(this.waterAreas,cx,cz))continue;
   surface(channels,p.a,p.b,p.w,this.waterSurface(...p.a)+.055,this.waterSurface(...p.b)+.055);
   if(++waterWork%12===0)yield;
  }
  let areaWork=0;
  for(const a of src.areas){
   if(a.k!=='water'||a.p.length>220)continue;
   const holes=(a.holes||[]).filter(h=>h.length>=3),
    contour=a.p.map(p=>new THREE.Vector2(p[0],p[1])),
    inners=holes.map(h=>h.map(p=>new THREE.Vector2(p[0],p[1]))),
    tris=THREE.ShapeUtils.triangulateShape(contour,inners),
    points=[...a.p,...holes.flat()];
   for(const [i,j,k] of tris){
    const p=points[i],q=points[j],r=points[k];if(!p||!q||!r)continue;
    const y=this.waterSurface((p[0]+q[0]+r[0])/3,(p[1]+q[1]+r[1])/3)+.055;
    channels.push(p[0],y,p[1],q[0],y,q[1],r[0],y,r[1]);
   }
   if(++areaWork%3===0)yield;
  }
  // Promote all visited municipalities to Padova-like geometry, preserving
  // a stricter detailed-building limit near the lagoon for stable frame times.
  let detailedCount=0;
  const detailCap=coast((ix+.5)*CHUNK,(iz+.5)*CHUNK)?profile.coastBuildings:profile.inlandBuildings;
  const buildings=near?[...src.buildings].sort((a,b)=>{
   const x=(ix+.5)*CHUNK,z=(iz+.5)*CHUNK;
   return distance(a.cx,a.cz,x,z)-distance(b.cx,b.cz,x,z);
  }):src.buildings;
  let buildingWork=0;
  for(const b of buildings){
   if(b.dealerSite)continue;
   if(near&&detailedCount<detailCap&&b.p.length<=60){
    detailedCount++;
    this.detailedBuilding(b,w,r);
    // Batched architectural facade generation follows real OSM polygons;
    // no individual window mesh or texture loading per building.
    if(b.h>=4.8&&glassFaces.length<7600){
     const edges=Math.min(coast(b.cx,b.cz)?2:3,b.p.length);
     // OSM multipolygon winding is not uniform. Point every window and
     // doorway outward, otherwise half the region's facade details vanish
     // behind their own opaque walls.
     const twiceArea=b.p.reduce((sum,a,i)=>{
      const d=b.p[(i+1)%b.p.length];
      return sum+a[0]*d[1]-d[0]*a[1];
     },0),outward=twiceArea>0?-1:1;
     for(let e=0;e<edges&&glassFaces.length<7600;e++){
      const a=b.p[e],d=b.p[(e+1)%b.p.length],len=distance(...a,...d);
      if(len<3.6||len>120)continue;
      const ux=(d[0]-a[0])/len,uz=(d[1]-a[1])/len,nx=-uz*.095*outward,nz=ux*.095*outward;
      const type=String(b.t||'');
      const palette=/industrial|warehouse|hangar|factory|commercial/.test(type)||
       b.cx>26700&&b.cx<32500?industrialFaces:
       coast(b.cx,b.cz)||b.c%5===0?brickFaces:facadeFaces;
      if(e===0&&palette.length<7200){
       const y=b.minY+.15,top=b.minY+b.h-.18;
       addQuad(palette,[a[0]+nx*.35,y,a[1]+nz*.35],
        [d[0]+nx*.35,y,d[1]+nz*.35],
        [d[0]+nx*.35,top,d[1]+nz*.35],[a[0]+nx*.35,top,a[1]+nz*.35]);
      }
      const count=Math.min(7,Math.floor(len/3.1)),floors=Math.min(5,Math.floor((b.h-1.2)/3));
      for(let level=0;level<floors&&glassFaces.length<7600;level++){
       const y=b.minY+1.1+level*3,top=y+1.15;if(top>b.minY+b.h-.2)break;
       for(let i=0;i<count&&glassFaces.length<7600;i++){
        const t=len*(i+.5)/count,w=Math.min(.46,len/count*.28),
         x=a[0]+ux*(t-w)+nx,z=a[1]+uz*(t-w)+nz,
         x2=x+ux*2*w,z2=z+uz*2*w;
        addQuad(glassFaces,[x,y,z],[x2,y,z2],[x2,top,z2],[x,top,z]);
        // Low-cost regional Venetian shutters, grouped per sector.
        if(b.c%3===1&&level<2&&shutterFaces.length<2800){
         const nx2=nx*1.13,nz2=nz*1.13,sw=.18;
         const lx=x-ux*.26+nx2,lz=z-uz*.26+nz2;
         const rx=x2+ux*.08+nx2,rz=z2+uz*.08+nz2;
         addQuad(shutterFaces,[lx,y,lz],[lx+ux*sw,y,lz+uz*sw],
          [lx+ux*sw,top,lz+uz*sw],[lx,top,lz]);
         addQuad(shutterFaces,[rx,y,rz],[rx+ux*sw,y,rz+uz*sw],
          [rx+ux*sw,top,rz+uz*sw],[rx,top,rz]);
        }
        if(frameFaces.length<12000){
         addQuad(frameFaces,[x-.06*ux,y-.09,z-.06*uz],
          [x2+.06*ux,y-.09,z2+.06*uz],[x2+.06*ux,y,z2+.06*uz],[x-.06*ux,y,z-.06*uz]);
         addQuad(frameFaces,[x-.06*ux,top,z-.06*uz],
          [x2+.06*ux,top,z2+.06*uz],[x2+.06*ux,top+.08,z2+.06*uz],
          [x-.06*ux,top+.08,z-.06*uz]);
        }
       }
      }
      if(e===0&&len>4.8&&doorFaces.length<900){
       const t=len*.5-.61,x=a[0]+ux*t+nx,z=a[1]+uz*t+nz,y=b.minY+.07;
       addQuad(doorFaces,[x,y,z],[x+ux*1.22,y,z+uz*1.22],
        [x+ux*1.22,y+2.08,z+uz*1.22],[x,y+2.08,z]);
      }
     }
    }
    if(++buildingWork%5===0)yield;
    continue;
   }
   for(const t of b.roofTriangles)for(const v of t)r.push(...v);
   if(b.p.length>=3&&b.p.length<=28){
    for(let i=0;i<b.p.length;i++){
     const a=b.p[i],d=b.p[(i+1)%b.p.length];
     addQuad(distantWalls,[a[0],b.minY,a[1]],[d[0],b.minY,d[1]],[d[0],b.minY+b.h,d[1]],[a[0],b.minY+b.h,a[1]]);
    }
    if(++buildingWork%8===0)yield;
    continue;
   }
   // Energy-mode proxies preserve the OSM footprint rather than replacing
   // every building with an arbitrary axis-aligned rectangle. All outlines
   // and translucent walls are batched into just two draw calls per chunk.
   if(b.p.length<3||b.p.length>28){blocks.push(b);continue;}
   const base=b.minY,top=base+b.h,poly=b.p.map(v=>new THREE.Vector2(v[0],v[1]));
   for(let i=0;i<b.p.length;i++){
    const a=b.p[i],d=b.p[(i+1)%b.p.length];
    addQuad(energyFaces,[a[0],base,a[1]],[d[0],base,d[1]],[d[0],top,d[1]],[a[0],top,a[1]]);
    energyEdges.push(a[0],top,a[1],d[0],top,d[1]);
    if(i%2===0)energyEdges.push(a[0],base,a[1],a[0],top,a[1]);
   }
   for(const [a,c,d] of THREE.ShapeUtils.triangulateShape(poly,[]))
    energyFaces.push(poly[a].x,top,poly[a].y,poly[c].x,top,poly[c].y,poly[d].x,top,poly[d].y);
   if(++buildingWork%8===0)yield;
  }
  if(facadeFaces.length)group.add(new THREE.Mesh(geometry(facadeFaces),facadeStucco));
  if(brickFaces.length)group.add(new THREE.Mesh(geometry(brickFaces),facadeBrick));
  if(industrialFaces.length)group.add(new THREE.Mesh(geometry(industrialFaces),industrialWall));
  yield;
  if(pavements.length)group.add(new THREE.Mesh(geometry(pavements),sidewalkMat));
  if(crosswalks.length)group.add(new THREE.Mesh(geometry(crosswalks),mark));
  if(frameFaces.length)group.add(new THREE.Mesh(geometry(frameFaces),facadeFrame));
  if(shutterFaces.length)group.add(new THREE.Mesh(geometry(shutterFaces),facadeShutter));
  if(doorFaces.length)group.add(new THREE.Mesh(geometry(doorFaces),facadeDoor));
  yield;
  if(normal.length)group.add(new THREE.Mesh(geometry(normal),roadMat));
  if(arterial.length)group.add(new THREE.Mesh(geometry(arterial),arterialMat));
  if(glassFaces.length)group.add(new THREE.Mesh(geometry(glassFaces),glass));
  yield;
  if(roadShoulders.length)group.add(new THREE.Mesh(geometry(roadShoulders),roadShoulderMat));
  if(roadBanks.length)group.add(new THREE.Mesh(geometry(roadBanks),roadBankMat));
  if(guardRails.length)group.add(new THREE.Mesh(geometry(guardRails),guardRailMat));
  if(junctionCaps.length)group.add(new THREE.Mesh(geometry(junctionCaps),junctionMat));
  yield;
  if(roadStripes.length)group.add(new THREE.Mesh(geometry(roadStripes),mark));
  if(roadSigns.length)group.add(new THREE.Mesh(geometry(roadSigns),sign));
  if(distantWalls.length)group.add(new THREE.Mesh(geometry(distantWalls),townWalls));
  if(channels.length){const waterMesh=new THREE.Mesh(geometry(channels),canalMat);waterMesh.renderOrder=2;group.add(waterMesh);}
  yield;
  if(balustrade.length)group.add(new THREE.Mesh(geometry(balustrade),stone));
  if(bridgeSupports.length)group.add(new THREE.Mesh(geometry(bridgeSupports),stone));
  if(bridgeUndersides.length)group.add(new THREE.Mesh(geometry(bridgeUndersides),stone));
  if(w.length)group.add(new THREE.Mesh(geometry(w),walls));
  if(r.length)group.add(new THREE.Mesh(geometry(r),roofs));
  if(energyFaces.length)group.add(new THREE.Mesh(geometry(energyFaces),energySkin));
  if(energyEdges.length){const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.Float32BufferAttribute(energyEdges,3));group.add(new THREE.LineSegments(eg,energyOutline));}
  yield;
  if(blocks.length){
   const mesh=new THREE.InstancedMesh(cube,near?energy:townWalls,blocks.length),dummy=new THREE.Object3D();
   for(let i=0;i<blocks.length;i++){
    const b=blocks[i],bw=Math.max(1,b.maxX-b.minX),bd=Math.max(1,b.maxZ-b.minZ);dummy.position.set(b.cx,b.minY+b.h/2,b.cz);dummy.scale.set(bw,b.h,bd);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   }mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  }
  // Stream real physics-driven cars and animated pedestrians, never cubes.
  if(near)this.ambient(group,src);
  yield;
  group.userData.detailed=near;
  this.scene.add(group);this.visible.set(k,group);this.totalBuilt++;
  this.metrics.totalBuilt=this.totalBuilt;
 }
 build(k){
  const started=performance.now(),steps=this.buildSteps(k);while(!steps.next().done){}
  const elapsed=performance.now()-started;
  this.metrics.lastBuildMs=elapsed;this.metrics.maxBuildMs=Math.max(this.metrics.maxBuildMs,elapsed);
 }
 advanceBuildSlice(budgetMs=6){
  if(!this.pendingBuild){
   while(this.queue.length){
    const k=this.queue.shift();if(this.visible.has(k))continue;
    this.pendingBuild={k,steps:this.buildSteps(k)};break;
   }
  }
  if(!this.pendingBuild)return false;
  const started=performance.now(),deadline=started+Math.max(1,budgetMs);let result;
  do{result=this.pendingBuild.steps.next();}while(!result.done&&performance.now()<deadline);
  const elapsed=performance.now()-started;
  this.metrics.lastBuildMs=elapsed;this.metrics.maxBuildMs=Math.max(this.metrics.maxBuildMs,elapsed);
  if(result.done)this.pendingBuild=null;
  return true;
 }
 update(state,dt=0){
  this.updateExplosions(state.elapsed||0);
  if(!this.contains(state.x+550,state.z))return;
  this.focus={x:state.x,z:state.z};this.lastUpdate=(this.lastUpdate||0)+Math.max(0,dt);
  const profile=this.streamProfile(state.x,state.z),cx=Math.floor(state.x/CHUNK),cz=Math.floor(state.z/CHUNK),signature=cx+','+cz;
  if(this.key!==signature){
   this.key=signature;const desired=[];
   // Promote a previously simplified town sector once the player visits it.
   // Never keep energy-box LOD when the camera reaches an actual commune.
   const centreKey=key(state.x,state.z,CHUNK),centre=this.visible.get(centreKey);
   if(centre&&!centre.userData.detailed){
    this.removeGroup(centre);this.scene.remove(centre);
    centre.traverse(o=>{if((o.isMesh||o.isLineSegments)&&o.geometry!==cube&&!o.userData?.regionalAmbientShared)o.geometry.dispose();});
    this.visible.delete(centreKey);
   }
   const cellRadius=Math.ceil(profile.loadRadius);
   for(let dx=-cellRadius;dx<=cellRadius;dx++)for(let dz=-cellRadius;dz<=cellRadius;dz++){
    const d=Math.hypot(dx,dz);if(d>profile.loadRadius)continue;
    const k=(cx+dx)+','+(cz+dz);if(!this.visible.has(k))desired.push({k,d});
   }
   desired.sort((a,b)=>a.d-b.d);this.queue=desired.map(v=>v.k);
   for(const [k,g] of this.visible){const [x,z]=k.split(',').map(Number);if(Math.hypot(x-cx,z-cz)>profile.keepRadius){
    this.removeGroup(g);this.scene.remove(g);g.traverse(o=>{if((o.isMesh||o.isLineSegments)&&o.geometry!==cube&&!o.userData?.regionalAmbientShared)o.geometry.dispose();});this.visible.delete(k);
   }}
  }
  // Upgrade neighboring transit blocks dynamically, one per free frame.
  // Previously drawn low-poly villages now acquire windows and street detail
  // as the camera comes within street-level visibility of their town blocks.
  if(!this.queue.length){
   if(!this.pendingBuild)for(const [k,g] of this.visible){
    if(g.userData.detailed)continue;
    const [ix,iz]=k.split(',').map(Number);
    if(distance((ix+.5)*CHUNK,(iz+.5)*CHUNK,state.x,state.z)>=profile.detailRadius*.86)continue;
    this.removeGroup(g);this.scene.remove(g);
    g.traverse(o=>{if((o.isMesh||o.isLineSegments)&&o.geometry!==cube&&!o.userData?.regionalAmbientShared)o.geometry.dispose();});
    this.visible.delete(k);
    this.queue.unshift(k);
    break;
   }
  }
  // Build geometry cooperatively inside a small frame budget. Large Venetian
  // sectors no longer monopolize a full frame while roads/facades are created.
  this.advanceBuildSlice(this.quality==='hyper'?4:6);
  if(this.sim)this.refreshTrafficCells(this.sim.cars);
  for(const group of this.visible.values())for(const actor of group.userData.ambient||[]){
   const actorDistance=distance(actor.x,actor.z,state.x,state.z),interval=actorDistance>profile.actorPhysicsRadius?.16:0;
   actor._regionalAccum=(actor._regionalAccum||0)+Math.max(0,dt);
   if(interval&&actor._regionalAccum<interval)continue;
   const actorDt=interval?Math.min(.075,actor._regionalAccum):dt;actor._regionalAccum=0;
   if(actor.regionalTraffic){this.updateRegionalCar(actor,actorDt,state.elapsed||0);continue;}
   const r=actor.r,roadLength=Math.max(1,distance(...r.a,...r.b)),before={r,t:actor.t,dir:actor.dir,side:actor.side,previous:actor.previous};
   actor.t+=actor.dir*Math.min(.075,actorDt)*(actor.person?1.3:actor.bus?5.5:8.3)/roadLength;
   // Reverse at a segment endpoint rather than visibly teleporting back to
   // its start. Real multi-town A-to-B navigation remains a later phase.
   // Follow adjoining OSM road segments rather than turn around every
   // 20–100 metres. Fall back to a U-turn only at a genuine dead end.
   if(actor.t>1||actor.t<0){
    const atEnd=actor.t>1,p=atEnd?r.b:r.a,
     dx=(r.b[0]-r.a[0])*(atEnd?1:-1),
     dz=(r.b[1]-r.a[1])*(atEnd?1:-1),len=Math.hypot(dx,dz)||1;
    const eligible=actor.person?
     q=>/^(footway|pedestrian|path|residential|living_street|service)$/.test(q.k)&&pedestrianRoadAllowed(q):
     q=>q.w>=3&&!/footway|path|steps|cycleway|pedestrian/.test(q.k);
    let next=null,best=-Infinity;
    for(const q of new Set(this.near(this.roads,p[0],p[1]))){
     if(q===r||!eligible(q))continue;
     for(const [at,dir] of [[q.a,1],[q.b,-1]]){
      if(distance(...at,...p)>2.0)continue;
      const tx=(q.b[0]-q.a[0])*dir,tz=(q.b[1]-q.a[1])*dir,mag=Math.hypot(tx,tz)||1;
      const score=(dx*tx+dz*tz)/(len*mag)-
       (q===actor.previous?1:0);
      if(score>best&&score>-.45){best=score;next={r:q,dir};}
     }
    }
    if(next){actor.previous=r;actor.r=next.r;actor.side=(actor.side||0)*actor.dir*next.dir;actor.dir=next.dir;actor.t=next.dir===1?0:1;}
    else{actor.t=atEnd?1:0;actor.dir*=-1;}
   }
   if(actor.person)actor.side=/residential|living_street|service/.test(actor.r.k)?Math.sign(actor.side||1)*(actor.r.w/2+1.25):0;
   const current=actor.r,t=actor.t,dx=current.b[0]-current.a[0],
    dz=current.b[1]-current.a[1],len=Math.hypot(dx,dz)||1;
   const walkX=current.a[0]+dx*t-dz/len*(actor.side||0),walkZ=current.a[1]+dz*t+dx/len*(actor.side||0),walkY=this.height(walkX,walkZ,actor.y);
   // Offset sidewalks do not necessarily join at an OSM road node. Retain
   // the last safe segment instead of teleporting across the carriageway.
   if(actor.person&&(!this.safeWalk(walkX,walkZ,walkY)||distance(walkX,walkZ,actor.x,actor.z)>Math.min(.075,actorDt)*1.3+.15)){
    Object.assign(actor,before);actor.dir=-before.dir;continue;
   }
   actor.x=walkX;actor.z=walkZ;actor.y=walkY;
   actor.mesh.position.set(walkX,
    (actor.person?walkY:current.yA+(current.yB-current.yA)*t)+(actor.detail?.07:actor.person?.85:actor.bus?1.14:.66),
    current.a[1]+dz*t+dx/len*(actor.side||0));
   actor.mesh.rotation.y=Math.atan2(dx*actor.dir,dz*actor.dir);
   if(actor.detail&&actor.person&&actor.mesh.userData.hips){
    const legs=actor.mesh.userData.hips.children;
    if(legs.length>1){const walk=Math.sin(this.lastUpdate*5+t*5)*.30;
     legs[0].rotation.x=walk;legs[1].rotation.x=-walk;}
   }
  }
  let actorCount=0,carCount=0;
  for(const group of this.visible.values())for(const actor of group.userData.ambient||[]){actorCount++;if(actor.regionalTraffic)carCount++;}
  Object.assign(this.metrics,{loaded:this.visible.size,queued:this.queue.length+(this.pendingBuild?1:0),actors:actorCount,cars:carCount,profile:this.quality||'low'});
 }
 place(x,z){return activeRegionalPlace(x,z);}
}
