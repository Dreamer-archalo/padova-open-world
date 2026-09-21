// Mandria-specific scenic population. No source OSM roads/buildings are removed:
// trees follow the authored driveway and optional plots require clear terrain.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint} from './gameplay-areas.js';

const cube=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,8,6);
const cone=new THREE.ConeGeometry(1,1,8),cylinder=new THREE.CylinderGeometry(1,1,1,8);
const colors=new Map();
function material(color){if(!colors.has(color))colors.set(color,new THREE.MeshStandardMaterial({color,roughness:.88}));return colors.get(color);}
function primitive(root,shape,color,x,y,z,w,h,d){const mesh=new THREE.Mesh(shape,material(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);return mesh;}
const block=(g,c,x,y,z,w,h,d)=>primitive(g,cube,c,x,y,z,w,h,d);
const local=(u,v)=>areaPoint(VILLA,u,v);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// Sample the ACTUAL driveway polyline; do not plant a decorative, disconnected road.
export function poplarPositions(points,step=13,offset=8.6){
 if(!Array.isArray(points)||points.length<2)return [];
 const segments=[];let total=0;
 for(let i=1;i<points.length;i++){
  const [ax,az]=points[i-1],[bx,bz]=points[i],length=Math.hypot(bx-ax,bz-az);
  if(length<.01)continue;
  segments.push({ax,az,bx,bz,length,from:total});total+=length;
 }
 const positions=[];
 for(let along=12;along<total-12;along+=step){
  const seg=segments.find(s=>along<=s.from+s.length);if(!seg)continue;
  const t=(along-seg.from)/seg.length,dx=(seg.bx-seg.ax)/seg.length,dz=(seg.bz-seg.az)/seg.length;
  for(const side of [-1,1])positions.push({x:seg.ax+(seg.bx-seg.ax)*t-side*dz*offset,z:seg.az+(seg.bz-seg.az)*t+side*dx*offset,side});
 }
 return positions;
}
function clear(g,x,z,r=1){
 if(!g.terrain?.dry(x,z,Math.min(r,2),g.terrain.height(x,z)))return false;
 // Collision.near returns an iterable spatial-query result, not necessarily an Array.
 const collisions=g.collision?.near?.(x,z,r)||[];
 for(const o of collisions)if(o.solid!==false&&o.kind!=='road')return false;
 return true;
}
function poplar(root,g,x,z,index){
 if(!clear(g,x,z,1.5))return false;
 const tree=new THREE.Group(),height=15+(index%4)*1.2;
 tree.position.set(x,g.terrain.height(x,z),z);
 primitive(tree,cylinder,'#82765b',0,height*.3,0,.27,height*.6,.27);
 for(let k=0;k<3;k++)primitive(tree,cone,k%2?'#385e38':'#406a42',0,height*(.56+k*.125),0,1.6-k*.23,height*.43,1.6-k*.23);
 root.add(tree);return true;
}
function person(root,g,u,v,role){
 const p=local(u,v),obj=new THREE.Group();obj.position.set(p.x,g.terrain.height(p.x,p.z),p.z);
 const tactical=role==='gate',suited=role==='bodyguard',worker=role==='worker';
 const outfit=tactical?'#28373b':suited?'#21242a':worker?'#777e45':'#4d4a42';
 block(obj,outfit,0,1.15,0,.54,.75,.3);block(obj,'#d2b391',0,1.70,0,.32,.33,.3);
 block(obj,outfit,-.16,.37,0,.19,.72,.22);block(obj,outfit,.16,.37,0,.19,.72,.22);
 const left=new THREE.Group(),right=new THREE.Group();left.position.set(-.37,1.40,0);right.position.set(.37,1.40,0);
 block(left,outfit,0,-.32,0,.19,.65,.2);block(right,outfit,0,-.32,0,.19,.65,.2);obj.add(left,right);
 if(suited){block(obj,'#eeeae0',0,1.35,.167,.2,.31,.02);block(obj,'#37302c',0,1.33,.19,.07,.27,.03);}
 if(tactical){block(obj,'#182327',0,1.83,0,.44,.14,.35);block(obj,'#1a2426',0,1.15,.19,.42,.36,.12);}
 obj.name='Mandria · '+role;root.add(obj);
 return {obj,left,right,role,home:{...p},u,v,helloAt:-100,until:0,lastText:'',phase:0};
}
function blackCar(root,g,u,v){
 const p=local(u,v);if(!clear(g,p.x,p.z,2.7))return null;
 const car=new THREE.Group();car.position.set(p.x,g.terrain.height(p.x,p.z)+.08,p.z);car.rotation.y=VILLA.yaw;
 block(car,'#14171b',0,.61,0,2.02,.57,4.75);block(car,'#10171e',0,1.14,-.25,1.72,.81,2.75);
 block(car,'#34454c',0,1.16,1.13,1.49,.49,.09);
 for(const side of [-1,1])for(const z of [-1.55,1.55]){
  const w=primitive(car,cylinder,'#1a2024',side*.93,.36,z,.37,.18,.37);w.rotation.z=Math.PI/2;
 }
 car.name='Mandria · sicurezza privata · auto nera';root.add(car);return car;
}
function animal(root,g,u,v,kind,index){
 const p=local(u,v),a=new THREE.Group();a.position.set(p.x,g.terrain.height(p.x,p.z),p.z);
 const sheep=kind==='sheep',color=sheep?'#ded9bc':'#aa8767';
 primitive(a,sphere,color,0,.90,0,sheep?.80:1.05,.59,sheep?.57:.63);
 primitive(a,sphere,color,0,1.05,.62,.40,.39,.39);
 for(const x of [-.45,.45])for(const z of [-.34,.34])block(a,'#584a3d',x,.32,z,.14,.62,.14);
 a.name='Mandria · '+(sheep?'pecora':'bovino');root.add(a);return {a,index,origin:a.position.clone()};
}
function plotClear(g,u,v,w,d){
 for(const du of [-w/2,0,w/2])for(const dv of [-d/2,0,d/2]){
  const p=local(u+du,v+dv);if(!clear(g,p.x,p.z,3))return false;
 }
 return true;
}
function pasture(root,g,u,v){
 const w=27,d=31;if(!plotClear(g,u,v,w+4,d+4))return null;
 for(const side of [-1,1])for(let j=-d/2;j<=d/2;j+=4){
  const p=local(u+side*w/2,v+j),post=new THREE.Group();post.position.set(p.x,g.terrain.height(p.x,p.z),p.z);
  block(post,'#9b855b',0,.65,0,.13,1.3,.13);root.add(post);
 }
 for(const side of [-1,1])for(let j=-w/2;j<=w/2;j+=4){
  const p=local(u+j,v+side*d/2),post=new THREE.Group();post.position.set(p.x,g.terrain.height(p.x,p.z),p.z);
  block(post,'#9b855b',0,.65,0,.13,1.3,.13);root.add(post);
 }
 const animals=[animal(root,g,u-5,v-5,'cow',0),animal(root,g,u+5,v-3,'sheep',1),animal(root,g,u+1,v+5,'sheep',2)];
 return {animals,worker:person(root,g,u-10,v+10,'worker')};
}
function field(root,g,u,v){
 const w=27,d=32;if(!plotClear(g,u,v,w+4,d+4))return null;
 for(let i=0;i<7;i++)for(let j=0;j<6;j++){
  const p=local(u-12+i*4,v-13+j*5),y=g.terrain.height(p.x,p.z);
  primitive(root,cone,'#698847',p.x,y+.43,p.z,.37,.86,.37);
 }
 return {worker:person(root,g,u-9,v-13,'worker')};
}
function initialize(g){
 const root=new THREE.Group();root.name='Mandria · viale, sicurezza, fattoria e campi';
 const road=g.graph?.segments?.find(s=>s.road?.n==='Accesso Villa della Mandria')?.road;
 const points=road?.p||[];
 let planted=0;
 poplarPositions(points).forEach((p,i)=>{if(poplar(root,g,p.x,p.z,i))planted++;});
 // The boundary remains an OSM-safe scenic perimeter until its geometry is
 // independently cleared; do not enlarge VILLA.minU/maxU and erase real homes.
 const people=[person(root,g,-6,48,'gate'),person(root,g,6,48,'gate'),person(root,g,-23,48,'servant'),person(root,g,-26,2,'servant'),person(root,g,-36,-2,'bodyguard')];
 const cars=[blackCar(root,g,-20,61),blackCar(root,g,20,61)].filter(Boolean);
 const pastures=[[-102,-27],[-100,13],[-89,-62]].map(([u,v])=>plotClear(g,u,v,31,35)?pasture(root,g,u,v):null).filter(Boolean);
 const fields=[[100,-28],[102,15],[88,-65]].map(([u,v])=>plotClear(g,u,v,31,36)?field(root,g,u,v):null).filter(Boolean);
 for(const plot of [...pastures,...fields])people.push(plot.worker);
 g.scene.add(root);
 return {root,people,cars,pastures,fields,planted,lastHello:-100};
}
export function villaLifeUpdate(g,dt){
 if(!g?.state?.started||!g.terrain?.modern||!g.terrain.gameplayPatches?.length||!Number.isFinite(dt)||dt<=0)return;
 const range=distance(g.state,VILLA);
 if(range>550){if(g.villaLife)g.villaLife.root.visible=false;return;}
 if(!g.villaLife){if(range>275)return;g.villaLife=initialize(g);}
 const life=g.villaLife;life.root.visible=true;
 const t=g.state.elapsed;
 for(const p of life.people){
  const d=distance(g.state,p.obj.position);
  if(d<6&&t-p.helloAt>18&&t-life.lastHello>2.5){
   p.helloAt=t;p.until=t+2.3;life.lastHello=t;
   p.lastText=p.role==='servant'?'Hola patron':p.role==='worker'?'Hola patron':'Hola signor';
   g.toast?.(p.lastText,2.4);
  }
  if(t<p.until){
   p.obj.rotation.y=Math.atan2(g.state.x-p.home.x,g.state.z-p.home.z);
   p.obj.rotation.x=Math.sin(Math.PI*Math.min(1,(p.until-t)/2.3))*.28;
   p.left.rotation.x=p.right.rotation.x=0;
  }else{
   p.obj.rotation.x=0;p.obj.rotation.y=VILLA.yaw;
   const working=p.role==='worker';
   p.left.rotation.x=working?Math.sin(t*2+p.u)*.36:Math.sin(t*.65+p.v)*.055;
   p.right.rotation.x=working?-p.left.rotation.x:0;
  }
 }
 for(const pasture of life.pastures)for(const a of pasture.animals){a.a.position.x=a.origin.x+Math.sin(t*.24+a.index)*.42;a.a.rotation.y=Math.sin(t*.2+a.index)*.2;}
}
const populate=ModernGameplay.prototype.populate,update=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaEstateLife){
 ModernGameplay.prototype.__mandriaEstateLife=true;
 ModernGameplay.prototype.populate=function(...args){
  if(this.villaLife){this.scene.remove(this.villaLife.root);this.villaLife=null;}
  return populate.apply(this,args);
 };
 ModernGameplay.prototype.update=function(dt){update.call(this,dt);villaLifeUpdate(this,dt);};
}
