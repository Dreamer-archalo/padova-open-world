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
 canalMat=material('#167bbc',{roughness:.29,metalness:.04,emissive:'#0c3560',emissiveIntensity:.30}),lagoonMat=material('#145ca4',{roughness:.30,metalness:.06,emissive:'#0c3058',emissiveIntensity:.28}),stone=material('#cdbda1'),
 walls=material('#cfb897'),roofs=material('#a57358'),glass=material('#526c78'),mark=material('#dddacf'),sign=material('#dfdfd5'),townWalls=material('#8b9690');
const energy=new THREE.MeshBasicMaterial({color:'#6dd4d5',transparent:true,opacity:.35,wireframe:true,depthWrite:false});
const energySkin=new THREE.MeshBasicMaterial({color:'#4cb8c2',transparent:true,opacity:.19,side:THREE.DoubleSide,depthWrite:false});
const energyOutline=new THREE.LineBasicMaterial({color:'#8ef7ec',transparent:true,opacity:.76,depthWrite:false});
const ambientCar=material('#80919b'),ambientBus=material('#bc9f61'),ambientPedestrian=material('#577d78');
const facadeFrame=material('#c6b7a0'),facadeDoor=material('#746454'),facadeBrick=material('#ad7861'),facadeStucco=material('#dec6a6'),industrialWall=material('#a2afae'),sidewalkMat=material('#aeb4aa');
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
  this.chunks=new Map();this.visible=new Map();this.roads=new Map();this.waters=new Map();this.waterAreas=new Map();this.landAreas=new Map();this.buildingAreas=new Map();this.shorelines=new Map();this.key='';
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
  const steps=Math.max(1,Math.ceil(len/(source.b||source.bridge?28:110)));
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
  const arr=[],steps=regionalDetail((ix+.5)*CHUNK,(iz+.5)*CHUNK)==='detailed'?14:8,n=CHUNK;
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
  const active=roads.filter(r=>isDetailed(r)||this.focus&&distance((r.a[0]+r.b[0])*.5,(r.a[1]+r.b[1])*.5,this.focus.x,this.focus.z)<600);
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
  const peopleRoads=chunk.roads.filter(r=>/footway|pedestrian|path|residential|living_street/.test(r.k));
  for(let i=0;i<Math.min(active.length?6:2,Math.ceil(peopleRoads.length/14));i++){
   const r=peopleRoads[(i*13+peopleRoads.length*5)%peopleRoads.length];
   if(!r)continue;const mesh=new THREE.Mesh(new THREE.BoxGeometry(.38,1.55,.35),peopleMat);group.add(mesh);actors.push({mesh,r,t:(i*.29)%1,dir:i%2?1:-1,person:true});
  }
  group.userData.ambient=actors;
 }
 build(k){
  if(this.visible.has(k))return;
  const [ix,iz]=k.split(',').map(Number),src=this.chunks.get(k)||{buildings:[],roads:[],water:[],areas:[]};
  const group=new THREE.Group();group.add(this.tile(ix,iz));
  const near=Math.hypot((ix+.5)*CHUNK-(this.focus?.x||0),(iz+.5)*CHUNK-(this.focus?.z||0))<700;
  // Fill open lagoon cells with one contiguous blue surface per chunk, but
  // leave holes for real island streets, industrial parcels and quays.
  const sea=[];
  if((ix+1)*CHUNK>=30000&&ix*CHUNK<40500){
   const steps=near?14:7;
   for(let j=0;j<steps;j++)for(let i=0;i<steps;i++){
    const x=ix*CHUNK+(i+.5)*CHUNK/steps,z=iz*CHUNK+(j+.5)*CHUNK/steps;
    if(!this.lagoonAt(x,z))continue;
    const x0=ix*CHUNK+i*CHUNK/steps,z0=iz*CHUNK+j*CHUNK/steps,
      x1=x0+CHUNK/steps,z1=z0+CHUNK/steps,y=LAGOON_Y+.1;
    addQuad(sea,[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]);
   }
  }
  if(sea.length){const sheet=new THREE.Mesh(geometry(sea),lagoonMat);sheet.renderOrder=1;group.add(sheet);}
  const normal=[],arterial=[],channels=[],balustrade=[],bridgeSupports=[],w=[],r=[],blocks=[],energyFaces=[],energyEdges=[],glassFaces=[],roadStripes=[],roadSigns=[],distantWalls=[],facadeFaces=[],brickFaces=[],industrialFaces=[],frameFaces=[],doorFaces=[],pavements=[],crosswalks=[];
  for(const p of src.roads){
   surface(/motorway|trunk|primary|secondary/.test(p.k)?arterial:normal,p.a,p.b,p.w,p.yA+.025,p.yB+.025);
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
   if(near&&p.w>=5&&roadStripes.length<900&&distance(...p.a,...p.b)>2){
    const a=[p.a[0]+(p.b[0]-p.a[0])*.15,p.a[1]+(p.b[1]-p.a[1])*.15],
     b=[p.a[0]+(p.b[0]-p.a[0])*.52,p.a[1]+(p.b[1]-p.a[1])*.52];
    surface(roadStripes,a,b,.13,p.yA+.052,p.yA+(p.yB-p.yA)*.52+.052);
   }
   // Motorway shoulders use the same 3-D road profile as the asphalt.
   if(near&&/motorway|trunk/.test(p.k)&&roadStripes.length<1450){
    const dx=p.b[0]-p.a[0],dz=p.b[1]-p.a[1],len=Math.hypot(dx,dz)||1,
     nx=-dz/len,nz=dx/len,edge=p.w*.5-.36;
    for(const side of [-1,1]){
     const a=[p.a[0]+nx*edge*side,p.a[1]+nz*edge*side],
      b=[p.b[0]+nx*edge*side,p.b[1]+nz*edge*side];
     surface(roadStripes,a,b,.11,p.yA+.058,p.yB+.058);
    }
   }
   if(near&&!coast(...p.a)&&p.w>=5.3&&distance(...p.a,...p.b)>12&&roadSigns.length<250){
    const len=distance(...p.a,...p.b),nx=-(p.b[1]-p.a[1])/len,nz=(p.b[0]-p.a[0])/len,
     x=(p.a[0]+p.b[0])*.5+nx*(p.w*.5+1.2),
     z=(p.a[1]+p.b[1])*.5+nz*(p.w*.5+1.2),y=(p.yA+p.yB)*.5;
    addQuad(roadSigns,[x,y,z],[x+.09,y,z],[x+.09,y+2,z],[x,y+2,z]);
    addQuad(roadSigns,[x-.4,y+1.75,z],[x+.4,y+1.75,z],[x+.4,y+2.34,z],[x-.4,y+2.34,z]);
   }
   if(p.bri&&near){
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
  for(const p of src.water){
   const cx=(p.a[0]+p.b[0])/2,cz=(p.a[1]+p.b[1])/2;
   if(this.inPoly(this.waterAreas,cx,cz))continue;
   surface(channels,p.a,p.b,p.w,this.waterSurface(...p.a)+.055,this.waterSurface(...p.b)+.055);
  }
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
  }
  // Promote all visited municipalities to Padova-like geometry, preserving
  // a stricter detailed-building limit near the lagoon for stable frame times.
  let detailedCount=0;
  const detailCap=coast((ix+.5)*CHUNK,(iz+.5)*CHUNK)?68:122;
  const buildings=near?[...src.buildings].sort((a,b)=>{
   const x=(ix+.5)*CHUNK,z=(iz+.5)*CHUNK;
   return distance(a.cx,a.cz,x,z)-distance(b.cx,b.cz,x,z);
  }):src.buildings;
  for(const b of buildings){
   if(near&&detailedCount<detailCap&&b.p.length<=60){
    detailedCount++;
    this.detailedBuilding(b,w,r);
    // Batched architectural facade generation follows real OSM polygons;
    // no individual window mesh or texture loading per building.
    if(b.h>=4.8&&glassFaces.length<7600){
     const edges=Math.min(coast(b.cx,b.cz)?2:3,b.p.length);
     for(let e=0;e<edges&&glassFaces.length<7600;e++){
      const a=b.p[e],d=b.p[(e+1)%b.p.length],len=distance(...a,...d);
      if(len<3.6||len>120)continue;
      const ux=(d[0]-a[0])/len,uz=(d[1]-a[1])/len,nx=-uz*.095,nz=ux*.095;
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
    continue;
   }
   if(b.p.length>=3&&b.p.length<=28){
    for(let i=0;i<b.p.length;i++){
     const a=b.p[i],d=b.p[(i+1)%b.p.length];
     addQuad(distantWalls,[a[0],b.minY,a[1]],[d[0],b.minY,d[1]],[d[0],b.minY+b.h,d[1]],[a[0],b.minY+b.h,a[1]]);
    }
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
  }
  if(facadeFaces.length)group.add(new THREE.Mesh(geometry(facadeFaces),facadeStucco));
  if(brickFaces.length)group.add(new THREE.Mesh(geometry(brickFaces),facadeBrick));
  if(industrialFaces.length)group.add(new THREE.Mesh(geometry(industrialFaces),industrialWall));
  if(pavements.length)group.add(new THREE.Mesh(geometry(pavements),sidewalkMat));
  if(crosswalks.length)group.add(new THREE.Mesh(geometry(crosswalks),mark));
  if(frameFaces.length)group.add(new THREE.Mesh(geometry(frameFaces),facadeFrame));
  if(doorFaces.length)group.add(new THREE.Mesh(geometry(doorFaces),facadeDoor));
  if(normal.length)group.add(new THREE.Mesh(geometry(normal),roadMat));
  if(arterial.length)group.add(new THREE.Mesh(geometry(arterial),arterialMat));
  if(glassFaces.length)group.add(new THREE.Mesh(geometry(glassFaces),glass));
  if(roadStripes.length)group.add(new THREE.Mesh(geometry(roadStripes),mark));
  if(roadSigns.length)group.add(new THREE.Mesh(geometry(roadSigns),sign));
  if(distantWalls.length)group.add(new THREE.Mesh(geometry(distantWalls),townWalls));
  if(channels.length){const waterMesh=new THREE.Mesh(geometry(channels),canalMat);waterMesh.renderOrder=2;group.add(waterMesh);}
  if(balustrade.length)group.add(new THREE.Mesh(geometry(balustrade),stone));
  if(bridgeSupports.length)group.add(new THREE.Mesh(geometry(bridgeSupports),stone));
  if(w.length)group.add(new THREE.Mesh(geometry(w),walls));
  if(r.length)group.add(new THREE.Mesh(geometry(r),roofs));
  if(energyFaces.length)group.add(new THREE.Mesh(geometry(energyFaces),energySkin));
  if(energyEdges.length){const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.Float32BufferAttribute(energyEdges,3));group.add(new THREE.LineSegments(eg,energyOutline));}
  if(blocks.length){
   const mesh=new THREE.InstancedMesh(cube,near?energy:townWalls,blocks.length),dummy=new THREE.Object3D();
   for(let i=0;i<blocks.length;i++){
    const b=blocks[i],bw=Math.max(1,b.maxX-b.minX),bd=Math.max(1,b.maxZ-b.minZ);dummy.position.set(b.cx,b.minY+b.h/2,b.cz);dummy.scale.set(bw,b.h,bd);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   }mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  }
  // Cues only for transitional traffic in this first integration phase.
  // Full Padova vehicle/NPC simulation is unchanged and remains local to Padova.
  if(near)this.ambient(group,src);
  group.userData.detailed=near;
  this.scene.add(group);this.visible.set(k,group);this.totalBuilt++;
 }
 update(state,dt=0){
  if(!this.contains(state.x+550,state.z))return;
  this.focus={x:state.x,z:state.z};
  const cx=Math.floor(state.x/CHUNK),cz=Math.floor(state.z/CHUNK),signature=cx+','+cz;
  if(this.key!==signature){
   this.key=signature;const desired=[];
   // Promote a previously simplified town sector once the player visits it.
   // Never keep energy-box LOD when the camera reaches an actual commune.
   const centreKey=key(state.x,state.z,CHUNK),centre=this.visible.get(centreKey);
   if(centre&&!centre.userData.detailed){
    this.scene.remove(centre);
    centre.traverse(o=>{if((o.isMesh||o.isLineSegments)&&o.geometry!==cube)o.geometry.dispose();});
    this.visible.delete(centreKey);
   }
   for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){
    const d=Math.hypot(dx,dz);if(d>3.5)continue;
    const k=(cx+dx)+','+(cz+dz);if(!this.visible.has(k))desired.push({k,d});
   }
   desired.sort((a,b)=>a.d-b.d);this.queue=desired.map(v=>v.k);
   for(const [k,g] of this.visible){const [x,z]=k.split(',').map(Number);if(Math.hypot(x-cx,z-cz)>4.7){
    this.scene.remove(g);g.traverse(o=>{if((o.isMesh||o.isLineSegments)&&o.geometry!==cube)o.geometry.dispose();});this.visible.delete(k);
   }}
  }
  // Upgrade neighboring transit blocks dynamically, one per free frame.
  // Previously drawn low-poly villages now acquire windows and street detail
  // as the camera comes within street-level visibility of their town blocks.
  if(!this.queue.length){
   for(const [k,g] of this.visible){
    if(g.userData.detailed)continue;
    const [ix,iz]=k.split(',').map(Number);
    if(distance((ix+.5)*CHUNK,(iz+.5)*CHUNK,state.x,state.z)>=570)continue;
    this.scene.remove(g);
    g.traverse(o=>{if((o.isMesh||o.isLineSegments)&&o.geometry!==cube)o.geometry.dispose();});
    this.visible.delete(k);
    this.build(k);
    break;
   }
  }
  // Spread chunk builds over frames to avoid blocking existing city gameplay.
  for(let i=0;i<1&&this.queue.length;i++)this.build(this.queue.shift());
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
