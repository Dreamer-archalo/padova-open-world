// Region streaming runs alongside (not instead of) Padova's original CityWorld.
// Padova keeps its existing meshes/physics/traffic; only its eastern border
// gains access to the OSM corridor and high-detail destination zones.
import * as THREE from './vendor/three.module.js';
import {pointInside} from './core.js';
import {PADOVA_EAST,regionalDetail,activeRegionalPlace} from './unified-regions.js';
import {clipPolygon,coastalBand,harborBand} from './regional-hydro.js';

const CHUNK=320,CELL=160,LAGOON_Y=.1;
const key=(x,z,size)=>Math.floor(x/size)+','+Math.floor(z/size);
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide,...extra});
const green=material('#819675'),roadMat=material('#59666a'),arterialMat=material('#4b595f'),
 canalMat=material('#267da8',{roughness:.35,metalness:.08}),lagoonMat=material('#216c9c',{roughness:.28,metalness:.13}),stone=material('#cdbda1'),
 walls=material('#cfb897'),roofs=material('#a57358');
const energy=new THREE.MeshBasicMaterial({color:'#6dd4d5',transparent:true,opacity:.35,wireframe:true,depthWrite:false});
const energySkin=new THREE.MeshBasicMaterial({color:'#4cb8c2',transparent:true,opacity:.19,side:THREE.DoubleSide,depthWrite:false});
const energyOutline=new THREE.LineBasicMaterial({color:'#8ef7ec',transparent:true,opacity:.76,depthWrite:false});
const ambientCar=material('#80919b'),ambientBus=material('#bc9f61'),ambientPedestrian=material('#577d78');
const cube=new THREE.BoxGeometry(1,1,1);
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
  this.chunks=new Map();this.visible=new Map();this.roads=new Map();this.waters=new Map();this.waterAreas=new Map();this.landAreas=new Map();this.buildingAreas=new Map();this.key='';
  this.actors=[];this.queue=[];this.totalBuilt=0;this.lastUpdate=0;this.dataReady=false;
  this.index();
 }
 contains(x,z){return x>PADOVA_EAST&&x<40500&&z>-13500&&z<10000;}
 raw(x,z){
  const g=this.grid,u=Math.max(0,Math.min(g.width-1,(x-g.x0)/g.step)),v=Math.max(0,Math.min(g.height-1,(z-g.z0)/g.step));
  const i=Math.min(g.width-2,Math.floor(u)),j=Math.min(g.height-2,Math.floor(v)),a=u-i,b=v-j,H=(ix,jz)=>g.heights[jz*g.width+ix];
  const value=H(i,j)*(1-a)*(1-b)+H(i+1,j)*a*(1-b)+H(i,j+1)*(1-a)*b+H(i+1,j+1)*a*b;
  return coast(x,z)?Math.max(-.25,value):value;
 }
 roadY(road,x,z,t){
  const base=coast(x,z)?Math.max(this.raw(x,z)+.14,LAGOON_Y+.24):this.raw(x,z)+.14;
  if(!road.b&&!road.bridge)return base;
  // Continuous deck profile. Both ends join the neighboring street height;
  // raised pedestrian bridges gain a mild arch without a vertical step.
  const rise=/motorway|trunk|primary/.test(road.k)?2.4:/footway|pedestrian|path|steps/.test(road.k)?1.05:1.35;
  const safe=coast(x,z)?Math.max(0,LAGOON_Y+.9-base):0;
  // Cosine lift starts AND ends with zero slope, unlike a sine arch which
  // has an abrupt gradient at the junction to the approaching road.
  const eased=Math.sin(Math.PI*Math.max(0,Math.min(1,t)))**2;
  return base+(rise+safe)*eased;
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
  const steps=Math.max(1,Math.ceil(len/110));
  for(let i=0;i<steps;i++){
   const f=i/steps,g=(i+1)/steps,p=[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f],q=[a[0]+(b[0]-a[0])*g,a[1]+(b[1]-a[1])*g];
   if(max(p[0],q[0])<PADOVA_EAST-180)continue;
   const m=[(p[0]+q[0])/2,(p[1]+q[1])/2],item={a:p,b:q,w:source.w||4,k:source.k||'',bri:!!(source.b||source.bridge),yA:type==='roads'?this.roadY(source,...p,t0+(t1-t0)*f):this.raw(...p),yB:type==='roads'?this.roadY(source,...q,t0+(t1-t0)*g):this.raw(...q)};
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
  for(const r of this.data.roads||[]){
   if(r.p?.length<2)continue;
   const lengths=r.p.slice(1).map((p,i)=>distance(p[0],p[1],r.p[i][0],r.p[i][1])),total=lengths.reduce((a,b)=>a+b,0);let used=0;
   for(let i=1;i<r.p.length;i++){const len=lengths[i-1];this.segment('roads',r,r.p[i-1],r.p[i],total?used/total:0,total?(used+len)/total:1);used+=len;}
  }
  for(const w of this.data.water||[])if(w.p?.length>=2)for(let i=1;i<w.p.length;i++)this.segment('water',w,w.p[i-1],w.p[i]);
  for(const b of this.data.buildings||[]){
   if(!b.p||b.p.length<3)continue;
   const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),x0=Math.min(...xs),z0=Math.min(...zs),x1=Math.max(...xs),z1=Math.max(...zs),x=(x0+x1)/2,z=(z0+z1)/2;
   if(x<PADOVA_EAST-180)continue;
   const obj={...b,minX:x0,maxX:x1,minZ:z0,maxZ:z1,cx:x,cz:z,minY:this.raw(x,z),h:Math.max(2.6,Math.min(75,b.h||7))};
   obj.lod=regionalDetail(x,z);this.bucket(x,z).buildings.push(obj);
   this.collision.add(obj,x0,z0,x1,z1);
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
   if((maxIx-minIx+1)*(maxIz-minIz+1)>380||a.p.length>220)continue;
   for(let ix=minIx;ix<=maxIx;ix++)for(let iz=minIz;iz<=maxIz;iz++){
    const clipped=clipPolygon(a.p,ix*CHUNK,iz*CHUNK,(ix+1)*CHUNK,(iz+1)*CHUNK);
    if(clipped.length>=3)this.bucket((ix+.5)*CHUNK,(iz+.5)*CHUNK).areas.push({...a,p:clipped});
   }
  }
  this.dataReady=true;
 }
 nearestRoad(x,z,maxDist=24){
  let best=null,limit=maxDist;
  for(const r of this.near(this.roads,x,z)){
   const vx=r.b[0]-r.a[0],vz=r.b[1]-r.a[1],den=vx*vx+vz*vz;
   const t=den?Math.max(0,Math.min(1,((x-r.a[0])*vx+(z-r.a[1])*vz)/den)):0;
   const px=r.a[0]+vx*t,pz=r.a[1]+vz*t,d=distance(x,z,px,pz);
   if(d<limit){limit=d;best={road:r,d,x:px,z:pz,y:r.yA+(r.yB-r.yA)*t,yaw:Math.atan2(vx,vz)};}
  }
  return best;
 }
 waterSurface(x,z){
  // Venice/Marghera share a lagoon datum; inland river strips retain the
  // local smoothed DEM until real surveyed channel levels are supplied.
  return harborBand(x)?LAGOON_Y+.08:this.raw(x,z)+.08;
 }
 inPoly(index,x,z){
  for(const a of new Set(this.near(index,x,z)))if(pointInside(x,z,a.p))return true;
  return false;
 }
 mappedWater(x,z){
  if(this.inPoly(this.waterAreas,x,z))return true;
  for(const w of new Set(this.near(this.waters,x,z))){
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
   const vx=w.b[0]-w.a[0],vz=w.b[1]-w.a[1],den=vx*vx+vz*vz,
    t=den?Math.max(0,Math.min(1,((x-w.a[0])*vx+(z-w.a[1])*vz)/den)):0;
   closest=Math.min(closest,distance(x,z,w.a[0]+t*vx,w.a[1]+t*vz)-w.w*.5);
  }
  if(this.lagoonAt(x,z))closest=Math.min(closest,-120);
  return {distance:closest,level:Number.isFinite(closest)?this.waterSurface(x,z):undefined};
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
  if(x<33500&&this.raw(x,z)>LAGOON_Y+.65)return false;
  return true;
 }
 ground(x,z){
  if(this.mappedWater(x,z)||this.lagoonAt(x,z))return Math.min(this.raw(x,z),this.waterSurface(x,z)-.4)+.05;
  // Elevated island/industrial parcels must not disappear beneath the water
  // plane merely because a coarse DEM returned a sea-level sample.
  return coastalBand(x,z)?Math.max(this.raw(x,z),LAGOON_Y+.23)+.05:this.raw(x,z)+.05;
 }
 height(x,z,referenceY=null){
  const support=this.nearestRoad(x,z,25);
  if(support&&support.d<support.road.w*.5+.85&&(referenceY===null||Math.abs(support.y-referenceY)<3.7))return support.y+.065;
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
  const original={raw:terrain.rawElevation.bind(terrain),elevation:terrain.elevation.bind(terrain),ground:terrain.groundHeight.bind(terrain),height:terrain.height.bind(terrain),water:terrain.waterAt.bind(terrain),waterHeight:terrain.waterHeight.bind(terrain),
   waterSample:terrain.waterSample.bind(terrain),waterDistance:terrain.waterDistance.bind(terrain),bridge:terrain.bridge.bind(terrain)};
  const active=(x,z)=>this.contains(x,z);
  terrain.rawElevation=(x,z)=>active(x,z)?this.raw(x,z):original.raw(x,z);
  terrain.elevation=(x,z)=>active(x,z)?this.raw(x,z):original.elevation(x,z);
  terrain.groundHeight=(x,z)=>active(x,z)?this.ground(x,z):original.ground(x,z);
  terrain.height=(x,z,ref=null)=>active(x,z)?this.height(x,z,ref):original.height(x,z,ref);
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
 }
 tile(ix,iz){
  const arr=[],steps=regionalDetail((ix+.5)*CHUNK,(iz+.5)*CHUNK)==='detailed'?24:10,n=CHUNK;
  for(let j=0;j<steps;j++)for(let i=0;i<steps;i++){
   const x=ix*n+i*n/steps,z=iz*n+j*n/steps,x1=x+n/steps,z1=z+n/steps;
   const a=[x,this.ground(x,z),z],b=[x1,this.ground(x1,z),z],c=[x1,this.ground(x1,z1),z1],d=[x,this.ground(x,z1),z1];addQuad(arr,a,b,c,d);
  }
  const tile=new THREE.Mesh(geometry(arr),green);tile.receiveShadow=false;return tile;
 }
 detailedBuilding(b,wall,roof){
  const p=b.p,h=b.h,base=b.minY;const poly=p.map(v=>new THREE.Vector2(v[0],v[1])),tri=THREE.ShapeUtils.triangulateShape(poly,[]);
  for(let i=0;i<p.length;i++){const a=p[i],d=p[(i+1)%p.length],ay=this.raw(...a),dy=this.raw(...d);
   addQuad(wall,[a[0],ay,a[1]],[d[0],dy,d[1]],[d[0],dy+h,d[1]],[a[0],ay+h,a[1]]);
  }
  for(const [a,b,c] of tri){roof.push(poly[a].x,base+h,poly[a].y,poly[b].x,base+h,poly[b].y,poly[c].x,base+h,poly[c].y);}
 }
 ambient(group,chunk){
  const roads=chunk.roads.filter(r=>r.w>=3&&!/motorway|trunk|footway|path|steps|cycleway|pedestrian/.test(r.k));
  if(!roads.length)return;
  const isDetailed=r=>regionalDetail((r.a[0]+r.b[0])/2,(r.a[1]+r.b[1])/2)==='detailed';
  const active=roads.filter(isDetailed);
  // Transit towns remain inhabited, not empty: fewer low-poly cars/buses on
  // real mapped arteries even where the buildings use energy-mode LOD.
  const transit=roads.filter(r=>!isDetailed(r)&&/primary|secondary|tertiary/.test(r.k));
  const candidates=active.length?active:transit;
  if(!candidates.length)return;
  const actors=[];const carMat=ambientCar,busMat=ambientBus,peopleMat=ambientPedestrian;
  const count=Math.min(active.length?3:2,Math.ceil(candidates.length/(active.length?22:35)));
  for(let i=0;i<count;i++){
   const r=candidates[Math.abs((i*97+chunk.roads.length*11)%candidates.length)],bus=i===0&&r.w>=5.5;
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(bus?2.4:1.8,bus?2.25:1.25,bus?9:4),bus?busMat:carMat);
   group.add(mesh);actors.push({mesh,r,t:(i*.33)%1,bus,dir:i%2?1:-1});
  }
  // People only appear on actual town streets/paths; remote transit zones
  // retain their simplified low-poly vehicle traffic.
  const peopleRoads=chunk.roads.filter(r=>isDetailed(r)&&/footway|pedestrian|path|residential|living_street/.test(r.k));
  for(let i=0;i<Math.min(5,Math.ceil(peopleRoads.length/14));i++){
   const r=peopleRoads[(i*13+peopleRoads.length*5)%peopleRoads.length];
   if(!r)continue;const mesh=new THREE.Mesh(new THREE.BoxGeometry(.38,1.55,.35),peopleMat);group.add(mesh);actors.push({mesh,r,t:(i*.29)%1,dir:i%2?1:-1,person:true});
  }
  group.userData.ambient=actors;
 }
 build(k){
  if(this.visible.has(k))return;
  const [ix,iz]=k.split(',').map(Number),src=this.chunks.get(k)||{buildings:[],roads:[],water:[],areas:[]};
  const group=new THREE.Group();group.add(this.tile(ix,iz));
  // Fill open lagoon cells with one contiguous blue surface per chunk, but
  // leave holes for real island streets, industrial parcels and quays.
  const sea=[];
  if((ix+1)*CHUNK>=30000&&ix*CHUNK<40500){
   const steps=regionalDetail((ix+.5)*CHUNK,(iz+.5)*CHUNK)==='detailed'?32:16;
   for(let j=0;j<steps;j++)for(let i=0;i<steps;i++){
    const x=ix*CHUNK+(i+.5)*CHUNK/steps,z=iz*CHUNK+(j+.5)*CHUNK/steps;
    if(!this.lagoonAt(x,z))continue;
    const x0=ix*CHUNK+i*CHUNK/steps,z0=iz*CHUNK+j*CHUNK/steps,
      x1=x0+CHUNK/steps,z1=z0+CHUNK/steps,y=LAGOON_Y+.1;
    addQuad(sea,[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]);
   }
  }
  if(sea.length){const sheet=new THREE.Mesh(geometry(sea),lagoonMat);sheet.renderOrder=1;group.add(sheet);}
  const normal=[],arterial=[],channels=[],balustrade=[],bridgeSupports=[],w=[],r=[],blocks=[],energyFaces=[],energyEdges=[];
  for(const p of src.roads){
   surface(/motorway|trunk|primary|secondary/.test(p.k)?arterial:normal,p.a,p.b,p.w,p.yA+.025,p.yB+.025);
   if(p.bri&&regionalDetail((p.a[0]+p.b[0])/2,(p.a[1]+p.b[1])/2)==='detailed'){
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
    if(p.w>=7&&coast(...mid)){
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
  }
  for(const p of src.water){surface(channels,p.a,p.b,p.w,this.waterSurface(...p.a)+.04,this.waterSurface(...p.b)+.04);}
  for(const a of src.areas){
   if(a.k!=='water'||a.p.length>220)continue;
   const poly=a.p.map(p=>new THREE.Vector2(p[0],p[1])),tris=THREE.ShapeUtils.triangulateShape(poly,[]);
   for(const [i,j,k] of tris){
    const p=a.p[i],q=a.p[j],r=a.p[k];
    const y=this.waterSurface((p[0]+q[0]+r[0])/3,(p[1]+q[1]+r[1])/3)+.045;
    channels.push(p[0],y,p[1],q[0],y,q[1],r[0],y,r[1]);
   }
  }
  for(const b of src.buildings){
   if(b.lod==='detailed'&&b.p.length<=100){this.detailedBuilding(b,w,r);continue;}
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
  }
  if(normal.length)group.add(new THREE.Mesh(geometry(normal),roadMat));
  if(arterial.length)group.add(new THREE.Mesh(geometry(arterial),arterialMat));
  if(channels.length){const waterMesh=new THREE.Mesh(geometry(channels),canalMat);waterMesh.renderOrder=2;group.add(waterMesh);}
  if(balustrade.length)group.add(new THREE.Mesh(geometry(balustrade),stone));
  if(bridgeSupports.length)group.add(new THREE.Mesh(geometry(bridgeSupports),stone));
  if(w.length)group.add(new THREE.Mesh(geometry(w),walls));
  if(r.length)group.add(new THREE.Mesh(geometry(r),roofs));
  if(energyFaces.length)group.add(new THREE.Mesh(geometry(energyFaces),energySkin));
  if(energyEdges.length){const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.Float32BufferAttribute(energyEdges,3));group.add(new THREE.LineSegments(eg,energyOutline));}
  if(blocks.length){
   const mesh=new THREE.InstancedMesh(cube,energy,blocks.length),dummy=new THREE.Object3D();
   for(let i=0;i<blocks.length;i++){
    const b=blocks[i],bw=Math.max(1,b.maxX-b.minX),bd=Math.max(1,b.maxZ-b.minZ);dummy.position.set(b.cx,b.minY+b.h/2,b.cz);dummy.scale.set(bw,b.h,bd);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   }mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  }
  // Cues only for transitional traffic in this first integration phase.
  // Full Padova vehicle/NPC simulation is unchanged and remains local to Padova.
  this.ambient(group,src);
  this.scene.add(group);this.visible.set(k,group);this.totalBuilt++;
 }
 update(state,dt=0){
  if(!this.contains(state.x+550,state.z))return;
  const cx=Math.floor(state.x/CHUNK),cz=Math.floor(state.z/CHUNK),signature=cx+','+cz;
  if(this.key!==signature){
   this.key=signature;const desired=[];
   for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++){
    const d=Math.hypot(dx,dz);if(d>4.4)continue;
    const k=(cx+dx)+','+(cz+dz);if(!this.visible.has(k))desired.push({k,d});
   }
   desired.sort((a,b)=>a.d-b.d);this.queue=desired.map(v=>v.k);
   for(const [k,g] of this.visible){const [x,z]=k.split(',').map(Number);if(Math.hypot(x-cx,z-cz)>6){
    this.scene.remove(g);g.traverse(o=>{if((o.isMesh||o.isLineSegments)&&o.geometry!==cube)o.geometry.dispose();});this.visible.delete(k);
   }}
  }
  // Spread chunk builds over frames to avoid blocking existing city gameplay.
  for(let i=0;i<2&&this.queue.length;i++)this.build(this.queue.shift());
  for(const group of this.visible.values())for(const actor of group.userData.ambient||[]){
   const r=actor.r,roadLength=Math.max(1,distance(...r.a,...r.b));
   actor.t+=actor.dir*Math.min(.05,dt)*(actor.person?1.3:actor.bus?5.5:8.3)/roadLength;
   // Reverse at a segment endpoint rather than visibly teleporting back to
   // its start. Real multi-town A-to-B navigation remains a later phase.
   if(actor.t>1){actor.t=2-actor.t;actor.dir=-1;}
   if(actor.t<0){actor.t=-actor.t;actor.dir=1;}
   const t=actor.t;actor.mesh.position.set(r.a[0]+(r.b[0]-r.a[0])*t,r.yA+(r.yB-r.yA)*t+(actor.person?.85:actor.bus?1.14:.66),r.a[1]+(r.b[1]-r.a[1])*t);
   actor.mesh.rotation.y=Math.atan2((r.b[0]-r.a[0])*actor.dir,(r.b[1]-r.a[1])*actor.dir);
  }
 }
 place(x,z){return activeRegionalPlace(x,z);}
}
