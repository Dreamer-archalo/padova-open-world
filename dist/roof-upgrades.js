import * as THREE from './vendor/three.module.js';
import {CityWorld} from './world.js';

const palette=['#995f48','#b07553','#9c694d','#a58166','#8d5d49','#b17a58','#a2674d'].map(c=>new THREE.Color(c));
class RoofBatch{
 constructor(){this.p=[];this.c=[];}
 tri(a,b,c,color){for(const v of [a,b,c]){this.p.push(v[0],v[1],v[2]);this.c.push(color.r,color.g,color.b);}}
 quad(a,b,c,d,color){this.tri(a,b,c,color);this.tri(a,c,d,color);}
 mesh(material){if(!this.p.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));g.computeVertexNormals();g.computeBoundingSphere();return new THREE.Mesh(g,material);}
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function polygon(p){if(p.length>2&&p[0][0]===p.at(-1)[0]&&p[0][1]===p.at(-1)[1])return p.slice(0,-1);return p;}
function area(p){let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1];}return Math.abs(a*.5);}
function convex(p){let sign=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],c=p[(i+2)%p.length],cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);if(Math.abs(cross)<.01)continue;const s=Math.sign(cross);if(sign&&s!==sign)return false;sign=s;}return true;}
function deterministic(b){const v=Math.sin(b.cx*12.9898+b.cz*78.233+(b.c||0)*17.17)*43758.5453;return v-Math.floor(v);}
function roofColour(b,central){const base=palette[Math.abs(b.c||0)%palette.length].clone();if(central)base.multiplyScalar(.93);return base;}
function gable(batch,p,y,b,central){let [a,q,c,d]=p;const l0=Math.hypot(q[0]-a[0],q[1]-a[1]),l1=Math.hypot(c[0]-q[0],c[1]-q[1]);if(l0>l1)[a,q,c,d]=[q,c,d,a];const short=Math.min(l0,l1),long=Math.max(l0,l1),color=roofColour(b,central),rise=clamp(short*(central?.29:.23),central?1.8:1.35,central?5.2:4.1),square=long/Math.max(short,.1)<1.18;
 if(square){const centre=[p.reduce((s,v)=>s+v[0],0)/4,y+rise,p.reduce((s,v)=>s+v[1],0)/4];for(let i=0;i<4;i++){const n=p[(i+1)%4];batch.tri([p[i][0],y,p[i][1]],[n[0],y,n[1]],centre,color);}return;}
 const m=[(a[0]+q[0])/2,y+rise,(a[1]+q[1])/2],n=[(c[0]+d[0])/2,y+rise,(c[1]+d[1])/2];batch.quad([a[0],y,a[1]],m,n,[d[0],y,d[1]],color);batch.quad(m,[q[0],y,q[1]],[c[0],y,c[1]],n,color);batch.tri([a[0],y,a[1]],[q[0],y,q[1]],m,color);batch.tri([c[0],y,c[1]],[d[0],y,d[1]],n,color);
}
function hipped(batch,p,y,b,central){const color=roofColour(b,central),cx=p.reduce((s,v)=>s+v[0],0)/p.length,cz=p.reduce((s,v)=>s+v[1],0)/p.length,xs=p.map(v=>v[0]),zs=p.map(v=>v[1]),span=Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs)),rise=clamp(span*(central?.24:.18),central?1.7:1.15,central?5:3.8),apex=[cx,y+rise,cz];for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];batch.tri([p[i][0],y,p[i][1]],[q[0],y,q[1]],apex,color);}}
function addRoof(batch,b,world){const p=polygon(b.p||[]);if(p.length<3||p.length>8||b.modelActive||b.authoredLandmark)return;const zone=world.terrain?.districts?.at(b.cx,b.cz),central=zone==='historic'||['church','chapel','basilica','historic','civic','museum','theatre'].includes(b.t),industrial=zone==='industrial'||['industrial','warehouse','hangar'].includes(b.t),a=area(p);if(industrial||a<18||a>4200||b.h<3)return;
 const quality=world.quality||'low',chance=central?1:quality==='high'?1:quality==='medium'?.82:.58;if(deterministic(b)>chance)return;const y=b.minY+b.h+.13;if(p.length===4)gable(batch,p,y,b,central);else if(convex(p))hipped(batch,p,y,b,central);
}
const original=CityWorld.prototype.installStage;
if(!CityWorld.prototype.__phase3RoofUpgrade){
 CityWorld.prototype.__phase3RoofUpgrade=true;
 CityWorld.prototype.installStage=function(key,g,stage){
  if(stage==='detail'&&!this.profile?.simple){const chunk=this.chunks.get(key),batch=new RoofBatch();for(const b of chunk?.buildings||[])addRoof(batch,b,this);const mesh=batch.mesh(this.roofMat);if(mesh){mesh.name='phase3-pitched-roofs';mesh.userData.streamBuildings=true;mesh.userData.phase3RoofUpgrade=true;mesh.receiveShadow=true;g.add(mesh);}}
  return original.call(this,key,g,stage);
 };
}
