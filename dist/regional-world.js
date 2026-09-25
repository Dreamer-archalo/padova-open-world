// Region streaming runs alongside (not instead of) Padova's original CityWorld.
// Padova keeps its existing meshes/physics/traffic; only its eastern border
// gains access to the OSM corridor and high-detail destination zones.
import * as THREE from './vendor/three.module.js';
import {pointInside} from './core.js';
import {PADOVA_EAST,regionalDetail,activeRegionalPlace} from './unified-regions.js';

const CHUNK=320,CELL=160,LAGOON_Y=.1;
const key=(x,z,size)=>Math.floor(x/size)+','+Math.floor(z/size);
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide,...extra});
const green=material('#819675'),roadMat=material('#59666a'),arterialMat=material('#4b595f'),
 canalMat=material('#4a939d',{roughness:.46,transparent:true,opacity:.94}),stone=material('#cdbda1'),
 walls=material('#cfb897'),roofs=material('#a57358');
const energy=new THREE.MeshBasicMaterial({color:'#6dd4d5',transparent:true,opacity:.35,wireframe:true,depthWrite:false});
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
  this.chunks=new Map();this.visible=new Map();this.roads=new Map();this.waters=new Map();this.key='';
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
  const base=this.raw(x,z)+.14;
  if(!road.b&&!road.bridge)return base;
  // Continuous deck profile. Both ends join the neighboring street height;
  // raised pedestrian bridges gain a mild arch without a vertical step.
  const rise=/motorway|trunk|primary/.test(road.k)?2.4:1.35;
  const safe=coast(x,z)?Math.max(0,LAGOON_Y+.9-base):0;
  return base+(rise+safe)*Math.sin(Math.PI*t);
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
   if(type==='roads')this.insertSpatial(this.roads,item,p,q,item.w*.5+3);
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
   // A single collision index is shared with existing walking and driving.
   this.collision.add(obj,x0,z0,x1,z1);
  }
  for(const a of this.data.areas||[]){
   if(a.p?.length<3)continue;const x=a.p.reduce((n,p)=>n+p[0],0)/a.p.length,z=a.p.reduce((n,p)=>n+p[1],0)/a.p.length;
   if(x>=PADOVA_EAST-180)this.bucket(x,z).areas.push(a);
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
 ground(x,z){return this.raw(x,z)+.05;}
 height(x,z,referenceY=null){
  const support=this.nearestRoad(x,z,25);
  if(support&&support.d<support.road.w*.5+.85&&(referenceY===null||Math.abs(support.y-referenceY)<3.7))return support.y+.065;
  return this.ground(x,z);
 }
 waterAt(x,z,margin=0,referenceY=null){
  const support=this.nearestRoad(x,z,25);
  if(support&&support.road.bri&&support.d<support.road.w*.5+margin+1)return null;
  if(support&&support.d<support.road.w*.5+margin&&support.y>LAGOON_Y+.25)return null;
  for(const w of this.near(this.waters,x,z)){
   const vx=w.b[0]-w.a[0],vz=w.b[1]-w.a[1],den=vx*vx+vz*vz;
   const t=den?Math.max(0,Math.min(1,((x-w.a[0])*vx+(z-w.a[1])*vz)/den)):0;
   if(distance(x,z,w.a[0]+t*vx,w.a[1]+t*vz)<w.w*.5+margin)return coast(x,z)?LAGOON_Y:this.raw(x,z)-.2;
  }
  return null;
 }
 installTerrainHooks(terrain){
  const original={raw:terrain.rawElevation.bind(terrain),elevation:terrain.elevation.bind(terrain),ground:terrain.groundHeight.bind(terrain),height:terrain.height.bind(terrain),water:terrain.waterAt.bind(terrain)};
  const active=(x,z)=>this.contains(x,z);
  terrain.rawElevation=(x,z)=>active(x,z)?this.raw(x,z):original.raw(x,z);
  terrain.elevation=(x,z)=>active(x,z)?this.raw(x,z):original.elevation(x,z);
  terrain.groundHeight=(x,z)=>active(x,z)?this.ground(x,z):original.ground(x,z);
  terrain.height=(x,z,ref=null)=>active(x,z)?this.height(x,z,ref):original.height(x,z,ref);
  terrain.waterAt=(x,z,margin=0,ref=null)=>active(x,z)?this.waterAt(x,z,margin,ref):original.water(x,z,margin,ref);
 }
 tile(ix,iz){
  const arr=[],steps=8,n=CHUNK;
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
  const roads=chunk.roads.filter(r=>r.w>=3&&!/motorway|trunk|footway|path|steps/.test(r.k));
  if(!roads.length)return;
  const active=roads.filter(r=>regionalDetail((r.a[0]+r.b[0])/2,(r.a[1]+r.b[1])/2)==='detailed');
  if(!active.length)return;
  const actors=[];const carMat=material('#80919b'),busMat=material('#bc9f61'),peopleMat=material('#577d78');
  const count=Math.min(3,Math.ceil(active.length/22));
  for(let i=0;i<count;i++){
   const r=active[Math.abs((i*97+chunk.roads.length*11)%active.length)],bus=i===0&&r.w>5;
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(bus?2.4:1.8,bus?2.25:1.25,bus?9:4),bus?busMat:carMat);
   group.add(mesh);actors.push({mesh,r,t:(i*.33)%1,bus});
  }
  const peopleRoads=chunk.roads.filter(r=>/footway|pedestrian|path|residential/.test(r.k));
  for(let i=0;i<Math.min(5,Math.ceil(peopleRoads.length/14));i++){
   const r=peopleRoads[(i*13+peopleRoads.length*5)%peopleRoads.length];
   if(!r)continue;const mesh=new THREE.Mesh(new THREE.BoxGeometry(.38,1.55,.35),peopleMat);group.add(mesh);actors.push({mesh,r,t:(i*.29)%1,person:true});
  }
  group.userData.ambient=actors;
 }
 build(k){
  if(this.visible.has(k))return;
  const [ix,iz]=k.split(',').map(Number),src=this.chunks.get(k)||{buildings:[],roads:[],water:[],areas:[]};
  const group=new THREE.Group();group.add(this.tile(ix,iz));
  const normal=[],arterial=[],channels=[],balustrade=[],w=[],r=[],blocks=[];
  for(const p of src.roads){
   surface(/motorway|trunk|primary|secondary/.test(p.k)?arterial:normal,p.a,p.b,p.w,p.yA+.025,p.yB+.025);
   if(p.bri&&coast(...p.a)&&/footway|steps|pedestrian|path/.test(p.k)){
    // Visual parapets follow bridge deck, with a gap-free foot surface.
    const dx=p.b[0]-p.a[0],dz=p.b[1]-p.a[1],len=Math.hypot(dx,dz)||1,nx=-dz/len*p.w*.55,nz=dx/len*p.w*.55;
    for(const side of [-1,1])surface(balustrade,[p.a[0]+nx*side,p.a[1]+nz*side],[p.b[0]+nx*side,p.b[1]+nz*side],.17,p.yA+.63,p.yB+.63);
   }
  }
  for(const p of src.water){surface(channels,p.a,p.b,p.w,(coast(...p.a)?LAGOON_Y:this.raw(...p.a))+.075,(coast(...p.b)?LAGOON_Y:this.raw(...p.b))+.075);}
  for(const b of src.buildings)if(b.lod==='detailed'&&b.p.length<=100)this.detailedBuilding(b,w,r);else blocks.push(b);
  if(normal.length)group.add(new THREE.Mesh(geometry(normal),roadMat));
  if(arterial.length)group.add(new THREE.Mesh(geometry(arterial),arterialMat));
  if(channels.length)group.add(new THREE.Mesh(geometry(channels),canalMat));
  if(balustrade.length)group.add(new THREE.Mesh(geometry(balustrade),stone));
  if(w.length)group.add(new THREE.Mesh(geometry(w),walls));
  if(r.length)group.add(new THREE.Mesh(geometry(r),roofs));
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
    this.scene.remove(g);g.traverse(o=>{if(o.isMesh&&o.geometry!==cube)o.geometry.dispose();});this.visible.delete(k);
   }}
  }
  // Spread chunk builds over frames to avoid blocking existing city gameplay.
  for(let i=0;i<2&&this.queue.length;i++)this.build(this.queue.shift());
  for(const group of this.visible.values())for(const actor of group.userData.ambient||[]){
   const r=actor.r;actor.t=(actor.t+Math.min(.05,dt)*(actor.person?.13:actor.bus?.36:.57))%1;
   const t=actor.t;actor.mesh.position.set(r.a[0]+(r.b[0]-r.a[0])*t,r.yA+(r.yB-r.yA)*t+(actor.person?.85:actor.bus?1.14:.66),r.a[1]+(r.b[1]-r.a[1])*t);
   actor.mesh.rotation.y=Math.atan2(r.b[0]-r.a[0],r.b[1]-r.a[1]);
  }
 }
 place(x,z){return activeRegionalPlace(x,z);}
}
