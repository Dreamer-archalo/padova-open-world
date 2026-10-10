import * as THREE from './vendor/three.module.js';
import {SpatialIndex,pointInside,nearestOnSegment,clamp} from './core.js';

const clean=p=>p.length>3&&p[0][0]===p.at(-1)[0]&&p[0][1]===p.at(-1)[1]?p.slice(0,-1):p;
const vertex=(p,y)=>[p[0],y,p[1]];
const quad=(a,b,c,d)=>[[a,b,c],[a,c,d]];
export function flatRoofTriangles(b,y=b.minY+b.h){
 const p=clean(b.p),v=p.map(q=>new THREE.Vector2(...q));
 return THREE.ShapeUtils.triangulateShape(v,[]).map(t=>t.map(i=>vertex(p[i],y)));
}
function gable(p,y,rise){
 let [a,q,c,d]=p;if(Math.hypot(q[0]-a[0],q[1]-a[1])>Math.hypot(c[0]-q[0],c[1]-q[1]))[a,q,c,d]=[q,c,d,a];
 const m=[(a[0]+q[0])/2,y+rise,(a[1]+q[1])/2],n=[(c[0]+d[0])/2,y+rise,(c[1]+d[1])/2];
 return [...quad(vertex(a,y),m,n,vertex(d,y)),...quad(m,vertex(q,y),vertex(c,y),n)];
}
export function upgradedRoofTriangles(b,world){
 const p=clean(b.p),zone=world.terrain?.districts?.at(b.cx,b.cz),central=zone==='historic'||['church','chapel','basilica','historic','civic','museum','theatre'].includes(b.t);
 const area=Math.abs(p.reduce((s,a,i)=>{const q=p[(i+1)%p.length];return s+a[0]*q[1]-q[0]*a[1];},0)/2);
 const quality=world.quality||'low',chance=central?1:quality==='high'?1:quality==='medium'?.82:.58;
 const noise=Math.sin(b.cx*12.9898+b.cz*78.233+(b.c||0)*17.17)*43758.5453;
 if(world.profile?.simple||p.length<3||p.length>8||b.modelActive||b.authoredLandmark||zone==='industrial'||['industrial','warehouse','hangar'].includes(b.t)||area<18||area>4200||b.h<3||noise-Math.floor(noise)>chance)return [];
 const y=b.minY+b.h+.13;
 if(p.length===4){
  const a=Math.hypot(p[1][0]-p[0][0],p[1][1]-p[0][1]),d=Math.hypot(p[2][0]-p[1][0],p[2][1]-p[1][1]),short=Math.min(a,d),rise=clamp(short*(central?.29:.23),central?1.8:1.35,central?5.2:4.1);
  if(Math.max(a,d)/Math.max(short,.1)>=1.18)return gable(p,y,rise);
  return hip(p,y,rise);
 }
 let sign=0;for(let i=0;i<p.length;i++){const a=p[i],q=p[(i+1)%p.length],c=p[(i+2)%p.length],cross=(q[0]-a[0])*(c[1]-q[1])-(q[1]-a[1])*(c[0]-q[0]);if(Math.abs(cross)<.01)continue;if(sign&&Math.sign(cross)!==sign)return [];sign=Math.sign(cross);}
 const xs=p.map(q=>q[0]),zs=p.map(q=>q[1]),span=Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs));
 return hip(p,y,clamp(span*(central?.24:.18),central?1.7:1.15,central?5:3.8));
}
function hip(p,y,rise){const apex=[p.reduce((s,q)=>s+q[0],0)/p.length,y+rise,p.reduce((s,q)=>s+q[1],0)/p.length];return p.map((q,i)=>[vertex(q,y),vertex(p[(i+1)%p.length],y),apex]);}
export function cityRoofTriangles(b,world){
 if(b.dealerSite)return flatRoofTriangles(b,b.minY+Math.max(3.8,b.h));
 const p=clean(b.p),base=b.minY+b.h,triangles=flatRoofTriangles(b,base+.08);
 if(p.length===4&&b.h<18&&b.t!=='industrial'&&b.t!=='warehouse')triangles.push(...gable(p,base,2));
 if(!b.roofUpgrade)Object.defineProperty(b,'roofUpgrade',{value:upgradedRoofTriangles(b,world),writable:true,configurable:true});return triangles.concat(b.roofUpgrade);
}
export function regionalRoofTriangles(b){
 const p=clean(b.p),h=b.h;if(p.length!==4||h<5.7||h>=21||/industrial|warehouse|hangar|shed|roof|commercial/.test(String(b.t||'')))return flatRoofTriangles(b);
 const e=p.map((q,i)=>Math.hypot(q[0]-p[(i+1)%4][0],q[1]-p[(i+1)%4][1])),dot=(p[1][0]-p[0][0])*(p[2][0]-p[1][0])+(p[1][1]-p[0][1])*(p[2][1]-p[1][1]);
 if(Math.abs(dot)/Math.max(.01,e[0]*e[1])>=.24||Math.abs(e[0]-e[2])/Math.max(1,e[0],e[2])>=.20||Math.abs(e[1]-e[3])/Math.max(1,e[1],e[3])>=.20)return flatRoofTriangles(b);
 return gable(p,b.minY+h,clamp(Math.min(e[0],e[1])*.23,.65,2.7));
}

function sample(triangle,x,z){
 const [a,b,c]=triangle,den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(den)<1e-8)return null;
 const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den;
 if(u<-.00001||v<-.00001||u+v>1.00001)return null;
 return {y:u*a[1]+v*b[1]+(1-u-v)*c[1],dx:((b[2]-c[2])*(a[1]-c[1])+(c[2]-a[2])*(b[1]-c[1]))/den,dz:((c[0]-b[0])*(a[1]-c[1])+(a[0]-c[0])*(b[1]-c[1]))/den};
}
export class RoofSurfaces{
 constructor(){this.index=new SpatialIndex(60);this.buildings=new Set();}
 remove(b){
  this.buildings.delete(b);for(let x=Math.floor(b.minX/60);x<=Math.floor(b.maxX/60);x++)for(let z=Math.floor(b.minZ/60);z<=Math.floor(b.maxZ/60);z++){
   const key=x+','+z,list=this.index.cells.get(key);if(list)this.index.cells.set(key,list.filter(o=>o!==b));
  }
 }
 clipped(originals,parts,world){
  const groups=new Map(originals.map(b=>[b,{b,parts:[]}]));
  for(const b of parts){const group=groups.get(b)||groups.get(b.roofOriginal);if(group)group.parts.push(b);}
  for(const {b,parts:pieces} of groups.values()){
   if(pieces.length===1&&pieces[0]===b)continue;this.remove(b);
   for(const part of pieces){const xs=part.p.map(p=>p[0]),zs=part.p.map(p=>p[1]);Object.assign(part,{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)});part.cx=(part.minX+part.maxX)/2;part.cz=(part.minZ+part.maxZ)/2;delete part.roofUpgrade;this.add(part,cityRoofTriangles(part,world));}
   b.roofAt=(x,z)=>{let best=null;for(const part of pieces){const s=part.roofAt(x,z);if(s&&(!best||s.y>best.y))best=s;}return best;};
  }
 }
 add(b,triangles){
  if(!this.buildings.has(b)){this.index.add(b,b.minX,b.minZ,b.maxX,b.maxZ);this.buildings.add(b);}
  Object.defineProperty(b,'roofTriangles',{value:triangles,writable:true,configurable:true,enumerable:false});Object.defineProperty(b,'roofAt',{value:(x,z)=>{let best=null;for(const t of b.roofTriangles){const s=sample(t,x,z);if(s&&(!best||s.y>best.y))best=s;}return best;},writable:true,configurable:true});
 }
 mesh(b,root){
  root.updateWorldMatrix(true,true);const triangles=[],v=new THREE.Vector3();
  root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;const p=o.geometry.attributes.position,indices=o.geometry.index?.array;if(!p)return;
   for(let i=0;i<(indices?.length??p.count);i+=3){const t=[];for(let j=0;j<3;j++){v.fromBufferAttribute(p,indices?indices[i+j]:i+j).applyMatrix4(o.matrixWorld);t.push([v.x,v.y,v.z]);}
    if(Math.abs((t[1][0]-t[0][0])*(t[2][2]-t[0][2])-(t[1][2]-t[0][2])*(t[2][0]-t[0][0]))>1e-6)triangles.push(t);
   }
  });this.add(b,triangles);
 }
 at(x,z,reference){
  if(!Number.isFinite(reference))return null;let best=null;
  for(const b of this.index.near(x,z,0)){if(x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ||!pointInside(x,z,b.p))continue;const s=b.roofAt(x,z);
   // Never raise street traffic or a car jumping into a facade onto a roof.
   if(s&&s.y<=reference+.35&&(!best||s.y>best.y))best={...s,y:s.y+.04,building:b};
  }return best;
 }
 onRoof(b,x,z){
  if(!pointInside(x,z,b.p))return null;const s=b.roofAt(x,z);return s?{...s,y:s.y+.04,building:b}:null;
 }
}
export function installRoofSurfaces(terrain){
 terrain.roofs??=new RoofSurfaces();
 if(terrain.height.__roofs)return terrain.roofs;
 const height=terrain.height.bind(terrain),slope=terrain.slope.bind(terrain),water=terrain.waterAt.bind(terrain);
 terrain.height=(x,z,ref=null)=>{const base=height(x,z,ref),roof=terrain.roofs.at(x,z,ref);return roof?Math.max(base,roof.y):base;};terrain.height.__roofs=true;
 terrain.slope=(x,z,yaw,wheelbase,ref=null)=>{const roof=terrain.roofs.at(x,z,ref);return roof?-Math.atan(roof.dx*Math.sin(yaw)+roof.dz*Math.cos(yaw)):slope(x,z,yaw,wheelbase,ref);};
 terrain.waterAt=(x,z,margin=0,ref=null)=>terrain.roofs.at(x,z,ref)?null:water(x,z,margin,ref);
 return terrain.roofs;
}
export function registerRoofMesh(terrain,root){
 if(!terrain.roofs||root.userData.physicalRoof)return;
 root.updateWorldMatrix(true,true);
 const bounds=new THREE.Box3().setFromObject(root),a=bounds.min,c=bounds.max;
 if(!Number.isFinite(a.x+c.y)||c.y-a.y<.1)return;
 const b={p:[[a.x,a.z],[c.x,a.z],[c.x,c.z],[a.x,c.z]],cx:(a.x+c.x)/2,cz:(a.z+c.z)/2,minX:a.x,maxX:c.x,minZ:a.z,maxZ:c.z,minY:a.y,h:c.y-a.y,t:'authored-roof',n:root.name};
 terrain.roofs.mesh(b,root);root.userData.physicalRoof=true;
}
