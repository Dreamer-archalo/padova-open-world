// Optional Mandria expansion layered after villa-mandria-life.js. It does not
// replace source-map buildings, collision data, drivable vehicle registry or roads.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint} from './gameplay-areas.js';

const cube=new THREE.BoxGeometry(1,1,1);
const materialCache=new Map();
function material(color){if(!materialCache.has(color))materialCache.set(color,new THREE.MeshStandardMaterial({color,roughness:.87}));return materialCache.get(color);}
function box(root,color,x,y,z,w,h,d){const mesh=new THREE.Mesh(cube,material(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);return mesh;}
const point=(u,v)=>areaPoint(VILLA,u,v);
function safe(g,u,v,r=2){
 const p=point(u,v),y=g.terrain.height(p.x,p.z);
 if(!Number.isFinite(y)||!g.terrain.dry(p.x,p.z,Math.min(2,r),y))return false;
 for(const obstacle of g.collision?.near?.(p.x,p.z,r)||[]){
  if(obstacle.solid!==false&&obstacle.kind!=='road')return false;
 }
 return true;
}
function safeEdge(g,a,b,width=3){
 const length=Math.hypot(a[0]-b[0],a[1]-b[1]),count=Math.max(1,Math.ceil(length/2.5));
 let previousY=null;
 for(let i=0;i<=count;i++){
  const t=i/count,u=a[0]+(b[0]-a[0])*t,v=a[1]+(b[1]-a[1])*t;
  if(!safe(g,u,v,width*.5+.4))return false;
  const p=point(u,v),y=g.terrain.height(p.x,p.z);
  if(previousY!==null&&Math.abs(y-previousY)>0.48)return false;
  previousY=y;
 }
 return true;
}
function segment(root,g,a,b,width,color,height=.055){
 const p=point(a[0],a[1]),q=point(b[0],b[1]),length=Math.hypot(q.x-p.x,q.z-p.z);
 if(length<.1)return null;
 const mid={x:(p.x+q.x)/2,z:(p.z+q.z)/2};
 const elevation=(g.terrain.height(p.x,p.z)+g.terrain.height(q.x,q.z))/2;
 const mesh=box(root,color,mid.x,elevation+height,mid.z,width,.055,length);
 mesh.rotation.y=Math.atan2(q.x-p.x,q.z-p.z);
 return mesh;
}
// Sections that cross real source-map structures are omitted rather than
// obscuring their geometry. The mansion's existing gateway remains open.
export function safeEstateSegments(g,polyline,width=3.2){
 const segments=[];
 for(let i=1;i<polyline.length;i++){
  const a=polyline[i-1],b=polyline[i],distance=Math.hypot(a[0]-b[0],a[1]-b[1]);
  for(let j=0,n=Math.ceil(distance/5);j<n;j++){
   const start=j/n,end=(j+1)/n,p=[a[0]+(b[0]-a[0])*start,a[1]+(b[1]-a[1])*start],q=[a[0]+(b[0]-a[0])*end,a[1]+(b[1]-a[1])*end];
   if(safeEdge(g,p,q,width))segments.push([p,q]);
  }
 }
 return segments;
}
function addLane(root,g,path){let built=0;for(const [a,b] of safeEstateSegments(g,path))if(segment(root,g,a,b,3.2,'#8c7f69'))built++;return built;}
function post(root,g,u,v){const p=point(u,v),y=g.terrain.height(p.x,p.z);box(root,'#6c6350',p.x,y+.8,p.z,.18,1.6,.18);}
function fence(root,g,a,b){
 if(!safeEdge(g,a,b,1.35))return false;
 const pa=point(...a),pb=point(...b),mid={x:(pa.x+pb.x)/2,z:(pa.z+pb.z)/2};
 const y=(g.terrain.height(pa.x,pa.z)+g.terrain.height(pb.x,pb.z))/2;
 const len=Math.hypot(pb.x-pa.x,pb.z-pa.z),angle=Math.atan2(pb.x-pa.x,pb.z-pa.z);
 for(const level of [.67,1.25]){const rail=box(root,'#665642',mid.x,y+level,mid.z,.1,.1,len);rail.rotation.y=angle;}
 post(root,g,...a);post(root,g,...b);return true;
}
function addPerimeter(root,g){
 // Only farm-side bands: avoid drawing a false fence straight across a public
 // roadway or across the original gate at (u=0,v=49).
 let pieces=0;
 const lines=[[[ -128,-86],[-128,44]],[[128,-86],[128,44]],
  [[-128,-86],[-62,-86]],[[62,-86],[128,-86]],
  [[-128,44],[-65,44]],[[65,44],[128,44]]];
 for(const [a,b] of lines){const d=Math.hypot(a[0]-b[0],a[1]-b[1]),n=Math.ceil(d/7);
  for(let i=0;i<n;i++){
   const p=[a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n],q=[a[0]+(b[0]-a[0])*(i+1)/n,a[1]+(b[1]-a[1])*(i+1)/n];
   if(fence(root,g,p,q))pieces++;
  }
 }
 return pieces;
}
function barn(root,g,u,v){
 const centre=point(u,v);if(!safe(g,u,v,2.4))return false;
 const house=new THREE.Group();house.position.set(centre.x,g.terrain.height(centre.x,centre.z),centre.z);house.rotation.y=VILLA.yaw;
 box(house,'#94724c',0,1.65,0,5.8,3.3,6.5);
 for(const side of [-1,1]){
  const roof=box(house,'#574739',side*1.48,3.67,0,3.65,.28,7.3);roof.rotation.z=side*.37;
 }
 box(house,'#372b22',0,1.18,3.28,2.35,2.34,.1);
 for(const side of [-1,1])box(house,'#c6ad76',side*2.4,2.05,3.32,.24,1.1,.12);
 house.name='Mandria · stalla e fienile';root.add(house);
 // Stable is intentionally inside the already validated paddock; no new
 // solid collider is installed where vehicles could abruptly crash.
 return true;
}
function feeder(root,g,u,v){const p=point(u,v),y=g.terrain.height(p.x,p.z);box(root,'#62523a',p.x,y+.45,p.z,2,.8,.8);box(root,'#bc9f62',p.x,y+.92,p.z,1.85,.16,.68);}
function farmKit(root,g,u,v){const p=point(u,v),y=g.terrain.height(p.x,p.z);
 box(root,'#5a694d',p.x,y+.58,p.z,1.2,.8,2.3);box(root,'#b9a070',p.x,y+1.02,p.z,1.15,.12,2.15);
 for(const offset of [-1.2,1.2])box(root,'#3e4140',p.x+offset*.4,y+.29,p.z+offset*.52,.38,.55,.38);
}
function suit(root){
 box(root,'#1b212a',0,1.14,0,.59,.76,.35);box(root,'#ede7dc',0,1.31,.18,.19,.34,.035);
 box(root,'#292629',0,1.31,.213,.075,.29,.035);box(root,'#c4a78f',0,1.7,0,.31,.34,.32);
 box(root,'#12171c',-.16,.38,0,.18,.72,.23);box(root,'#12171c',.16,.38,0,.18,.72,.23);
 const left=new THREE.Group(),right=new THREE.Group();left.position.set(-.39,1.40,0);right.position.set(.39,1.40,0);
 box(left,'#1b212a',0,-.32,0,.19,.66,.22);box(right,'#1b212a',0,-.32,0,.19,.66,.22);root.add(left,right);
 box(root,'#171b20',0,1.83,.04,.42,.085,.34);
 return {left,right};
}
function newBodyguard(root,g,u,v,route){
 if(!safe(g,u,v,1))return null;
 const pos=point(u,v),obj=new THREE.Group();obj.position.set(pos.x,g.terrain.height(pos.x,pos.z),pos.z);
 const arms=suit(obj);obj.name='Mandria · bodyguard in giacca e cravatta · pattuglia';root.add(obj);
 return {obj,...arms,role:'bodyguard',home:{...pos},u,v,helloAt:-100,until:0,lastText:'',phase:0,patrolRoute:route,patrolIndex:1};
}
function securityDetail(life){
 for(const p of life.people.filter(p=>p.role==='gate'&&!p.obj.userData.armed)){
  // Fictional low-poly rifle held down in a non-hostile guard pose.
  const rifle=box(p.obj,'#151a1c',.33,.99,.25,.12,.83,.13);
  rifle.rotation.z=-.21;
  box(p.obj,'#282d30',.28,1.14,.31,.31,.14,.13);
  p.obj.userData.armed=true;
 }
}
function escortCar(root,g){
 const route=[[2,63],[2,46],[2,30],[2,19],[2,30],[2,46]];
 if(route.some(([u,v])=>!safe(g,u,v,1.9)))return null;
 for(let i=1;i<route.length;i++)if(!safeEdge(g,route[i-1],route[i],2.8))return null;
 const p=point(...route[0]),car=new THREE.Group();car.position.set(p.x,g.terrain.height(p.x,p.z),p.z);
 box(car,'#101215',0,.61,0,2,.56,4.65);box(car,'#191c23',0,1.14,-.24,1.7,.8,2.64);
 box(car,'#3f4d53',0,1.18,1.13,1.5,.5,.06);
 for(const side of [-1,1])for(const z of [-1.48,1.48]){
  const wheel=box(car,'#222629',side*.97,.32,z,.2,.65,.65);
  wheel.rotation.y=0;
 }
 box(car,'#f1e0be',-.7,.65,2.33,.34,.15,.09);box(car,'#f1e0be',.7,.65,2.33,.34,.15,.09);
 car.name='Mandria · scorta privata · pattuglia mobile';root.add(car);
 return {car,route,index:1,speed:3.2};
}
function stepPatrol(g,p,dt){
 const t=g.state.elapsed;if(t<p.until||!p.patrolRoute?.length)return;
 const [u,v]=p.patrolRoute[p.patrolIndex],next=point(u,v),current=p.obj.position;
 const dx=next.x-current.x,dz=next.z-current.z,range=Math.hypot(dx,dz);
 if(range<.35){p.patrolIndex=(p.patrolIndex+1)%p.patrolRoute.length;return;}
 const step=Math.min(range,dt*.9),x=current.x+dx/range*step,z=current.z+dz/range*step;
 if(!safe(g,...localPoint(x,z),.65))return;
 if(Math.hypot(g.state.x-x,g.state.z-z)<2.8)return;
 current.set(x,g.terrain.height(x,z),z);p.home.x=x;p.home.z=z;
 p.obj.rotation.y=Math.atan2(dx,dz);
 p.left.rotation.x=Math.sin(t*5+p.u)*.34;p.right.rotation.x=-p.left.rotation.x;
}
function localPoint(x,z){const dx=x-VILLA.x,dz=z-VILLA.z,c=Math.cos(VILLA.yaw),s=Math.sin(VILLA.yaw);return [dx*c-dz*s,dx*s+dz*c];}
function stepEscort(g,escort,dt){
 if(!escort)return;
 const target=point(...escort.route[escort.index]),car=escort.car;
 const dx=target.x-car.position.x,dz=target.z-car.position.z,range=Math.hypot(dx,dz);
 if(range<.35){escort.index=(escort.index+1)%escort.route.length;return;}
 if(Math.hypot(g.state.x-car.position.x,g.state.z-car.position.z)<8)return;
 const step=Math.min(range,escort.speed*dt),x=car.position.x+dx/range*step,z=car.position.z+dz/range*step;
 if(!safe(g,...localPoint(x,z),1.1))return;
 car.position.set(x,g.terrain.height(x,z)+.08,z);car.rotation.y=Math.atan2(dx,dz);
}
function initialize(g,life){
 const root=new THREE.Group();root.name='Mandria · ampliamento scenografico e pattuglie';life.root.add(root);
 const barns=[],fields=[];
 for(const paddock of life.pastures){
  const u=paddock.worker.u+10,v=paddock.worker.v-10;
  if(barn(root,g,u+8,v+10))barns.push([u+8,v+10]);
  if(safe(g,u+7,v-9,1.2))feeder(root,g,u+7,v-9);
  paddock.worker.patrolRoute=[[u-10,v+10],[u-7,v+10],[u-7,v+3],[u-10,v+3]];paddock.worker.patrolIndex=1;
 }
 for(const field of life.fields){
  const u=field.worker.u+9,v=field.worker.v+13;
  if(safe(g,u+10,v+14,1.1)){farmKit(root,g,u+10,v+14);fields.push([u+10,v+14]);}
  field.worker.patrolRoute=[[u-9,v-13],[u-9,v+10],[u-3,v+10],[u-3,v-13]];field.worker.patrolIndex=1;
 }
 // Short estate-side lanes are decorative only. Existing gameplay graph and
 // original city streets remain authoritative for vehicle physics.
 let lanes=0;
 for(const side of [-1,1]){
  lanes+=addLane(root,g,[[0,69],[side*67,69],[side*67,40],[side*67,-78]]);
 }
 const perimeter=addPerimeter(root,g);
 const recruits=[newBodyguard(root,g,-25,30,[[-25,30],[-25,39],[-19,44],[-25,30]]),
  newBodyguard(root,g,16,61,[[16,61],[23,66],[23,57],[16,61]])].filter(Boolean);
 life.people.push(...recruits);securityDetail(life);
 const escort=escortCar(root,g);
 return {root,barns,fieldTools:fields,lanes,perimeter,recruits,escort};
}
export function estateEnhancementUpdate(g,dt){
 if(!g?.villaLife?.root||!g.state?.started||!Number.isFinite(dt)||dt<=0)return;
 const life=g.villaLife;
 if(!life.expansion)life.expansion=initialize(g,life);
 if(!life.root.visible)return;
 for(const p of life.people)if(p.patrolRoute)stepPatrol(g,p,Math.min(dt,.08));
 stepEscort(g,life.expansion.escort,Math.min(dt,.08));
}
const beforePopulate=ModernGameplay.prototype.populate,beforeUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaEstateExpansionV2){
 ModernGameplay.prototype.__mandriaEstateExpansionV2=true;
 ModernGameplay.prototype.populate=function(...args){const result=beforePopulate.apply(this,args);return result;};
 ModernGameplay.prototype.update=function(dt){beforeUpdate.call(this,dt);estateEnhancementUpdate(this,dt);};
}
