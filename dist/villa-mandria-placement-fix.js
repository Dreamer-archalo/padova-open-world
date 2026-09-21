// Complete the v3 estate using narrow-phase geometry checks. SpatialIndex.near()
// returns candidates from whole 60 m cells, NOT objects intersecting the query.
// Do not remove map buildings, terrain, street collisions or existing vehicles.
import * as THREE from './vendor/three.module.js';
import {pointInside,nearestOnSegment} from './core.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint,areaLocal} from './gameplay-areas.js';
import {installVehicleDamage} from './vehicle-damage.js';
import {ESTATE_BORDER} from './villa-mandria-estate-v3.js';

const geo={box:new THREE.BoxGeometry(1,1,1),cone:new THREE.ConeGeometry(1,1,7),sphere:new THREE.SphereGeometry(1,8,6),wheel:new THREE.CylinderGeometry(1,1,1,10)};
const colors=new Map();
function material(color){if(!colors.has(color))colors.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));return colors.get(color);}
function item(parent,shape,color,x,y,z,w,h,d){const m=new THREE.Mesh(geo[shape],material(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=false;m.receiveShadow=false;parent.add(m);return m;}
const box=(p,c,x,y,z,w,h,d)=>item(p,'box',c,x,y,z,w,h,d);
const world=(u,v)=>areaPoint(VILLA,u,v);
const valid=(u,v,margin=4)=>u>ESTATE_BORDER.west+margin&&u<ESTATE_BORDER.east-margin&&v>ESTATE_BORDER.south+margin&&v<ESTATE_BORDER.north-margin;
// Exact polygon + edge/footprint test; do not confuse an index bucket with a hit.
export function mandriaFree(g,u,v,r=1.3,height=2.4){
 const p=world(u,v),y=g.terrain.height(p.x,p.z);
 if(!Number.isFinite(y)||!g.terrain.dry(p.x,p.z,Math.min(2,r),y))return false;
 for(const b of g.collision?.near?.(p.x,p.z,r+1)||[]){
  if(b.solid===false||b.kind==='road')continue;
  if(Number.isFinite(b.minY)&&Number.isFinite(b.h)&&(y+height<=b.minY||y>=b.minY+b.h))continue;
  if(p.x+r<b.minX||p.x-r>b.maxX||p.z+r<b.minZ||p.z-r>b.maxZ)continue;
  if(!Array.isArray(b.p)||b.p.length<3)return false;
  if(pointInside(p.x,p.z,b.p))return false;
  for(let i=0;i<b.p.length;i++){
   const q=nearestOnSegment(p.x,p.z,b.p[i],b.p[(i+1)%b.p.length]);
   if(Math.hypot(p.x-q.x,p.z-q.z)<r)return false;
  }
 }
 return true;
}
function safeFootprint(g,u,v,r=4.4){return [[0,0],[-r,-r],[r,-r],[-r,r],[r,r],[-r,0],[r,0],[0,-r],[0,r]].every(([du,dv])=>mandriaFree(g,u+du,v+dv,1.1,4.5));}
function position(parent,g,u,v){const p=world(u,v);parent.position.set(p.x,g.terrain.height(p.x,p.z),p.z);}
function cottage(root,g,u,v){if(!valid(u,v,10)||!safeFootprint(g,u,v))return false;
 const house=new THREE.Group();position(house,g,u,v);house.rotation.y=VILLA.yaw;
 box(house,'#d5b487',0,1.55,0,7.2,3.1,7.1);
 for(const side of [-1,1])box(house,'#975d3d',side*1.85,3.67,0,4.1,.32,7.9).rotation.z=side*.35;
 box(house,'#4a362b',0,1.10,3.59,1.4,2.2,.12);
 for(const side of [-1,1])box(house,'#42606b',side*2.15,1.90,3.6,1.15,1.05,.12);
 house.name='Mandria · casa dei lavoratori agricoli';root.add(house);return true;
}
function cottages(g,root){let built=0;
 for(const side of [-1,1]){
  const candidates=[72,78,85,95,105].flatMap(u=>[-86,-78,-70,-58,-47].map(v=>[side*u,v]));
  for(const [u,v] of candidates){if(cottage(root,g,u,v)){built++;break;}}
 }return built;
}
function oldPoplarAt(g,p){return g.villaLife.root.children.some(o=>o.isGroup&&o.visible&&o.children.filter(c=>c.geometry?.type==='ConeGeometry').length===3&&Math.hypot(o.position.x-p.x,o.position.z-p.z)<5);}
function addPoplars(g,root){let count=0;
 for(let v=54,row=0;v>=12;v-=10,row++)for(const side of [-1,1]){
  for(const offset of [12,15,18,21,24]){
   const u=side*offset,p=world(u,v);
   if(!valid(u,v,3)||!mandriaFree(g,u,v,1.35,16))continue;
   if(oldPoplarAt(g,p)){count++;break;}
   const tree=new THREE.Group(),h=15+(row%3);
   position(tree,g,u,v);
   item(tree,'wheel','#78694d',0,h*.31,0,.24,h*.62,.24);
   for(let j=0;j<3;j++)item(tree,'cone',j%2?'#3f683c':'#466d40',0,h*(.56+j*.13),0,1.45-j*.13,h*.43,1.45-j*.13);
   tree.name='Mandria · pioppo dentro la tenuta';root.add(tree);count++;break;
  }
 }return count;
}
function repairFence(g,root){const b=ESTATE_BORDER,gap=b.gateHalfWidth;
 const edges=[[[b.west,b.south],[b.east,b.south]],[[b.west,b.south],[b.west,b.north]],[[b.east,b.south],[b.east,b.north]],[[b.west,b.north],[-gap,b.north]],[[gap,b.north],[b.east,b.north]]];
 const old=root.children.filter(o=>o.name==='Estate boundary post');
 let fixed=0;
 for(const [a,z] of edges){const length=Math.hypot(z[0]-a[0],z[1]-a[1]),n=Math.ceil(length/4);
  for(let i=0;i<n;i++){
   const p=a.map((v,j)=>v+(z[j]-v)*i/n),q=a.map((v,j)=>v+(z[j]-v)*(i+1)/n),pa=world(...p),pb=world(...q);
   if(old.some(o=>Math.hypot(o.position.x-pa.x,o.position.z-pa.z)<.08))continue;
   const mid=[(p[0]+q[0])/2,(p[1]+q[1])/2];
   if(![p,mid,q].every(([u,v])=>mandriaFree(g,u,v,.62,1.8)))continue;
   const ya=g.terrain.height(pa.x,pa.z),yb=g.terrain.height(pb.x,pb.z);
   if(Math.abs(ya-yb)>.55)continue;
   const cx=(pa.x+pb.x)/2,cz=(pa.z+pb.z)/2,angle=Math.atan2(pb.x-pa.x,pb.z-pa.z),distance=Math.hypot(pb.x-pa.x,pb.z-pa.z);
   for(const h of [.50,1.10])box(root,'#b7a27b',cx,(ya+yb)/2+h,cz,.13,.14,distance+.06).rotation.y=angle;
   const post=box(root,'#cdbb96',pa.x,ya+.85,pa.z,.28,1.7,.28);post.name='Estate boundary post';old.push(post);fixed++;
  }
 }
 return fixed;
}
function freeRoute(g,route,r){for(let j=1;j<route.length;j++){
  const a=route[j-1],b=route[j],d=Math.hypot(a[0]-b[0],a[1]-b[1]),steps=Math.max(1,Math.ceil(d/2));let prev=null;
  for(let k=0;k<=steps;k++){const t=k/steps,u=a[0]+(b[0]-a[0])*t,v=a[1]+(b[1]-a[1])*t;
   if(!valid(u,v,9)||!mandriaFree(g,u,v,r,2.8))return false;
   const p=world(u,v),y=g.terrain.height(p.x,p.z);
   if(prev!==null&&Math.abs(prev-y)>.48)return false;
   prev=y;
  }
 }return true;}
function horse(){const model=new THREE.Group();item(model,'sphere','#815a37',0,1.33,0,.53,.56,1.05);item(model,'sphere','#815a37',0,1.88,.68,.27,.62,.35);item(model,'sphere','#9f7346',0,2.17,.89,.28,.29,.39);
 for(const side of [-1,1])item(model,'cone','#49321f',side*.17,2.47,.8,.105,.28,.12).rotation.z=side*.25;
 box(model,'#332c26',0,1.91,-.1,.75,.12,.65);item(model,'cone','#473020',0,1.56,-1.08,.21,.87,.24).rotation.x=-.35;
 const legs=[];for(const side of [-1,1])for(const z of [-.69,.67]){const leg=new THREE.Group();leg.position.set(side*.35,1.02,z);box(leg,'#765134',0,-.47,0,.18,.92,.19);box(leg,'#31271e',0,-.91,.09,.24,.14,.33);model.add(leg);legs.push(leg);}
 model.userData.horseLegs=legs;model.name='Mandria · cavallo da sella';return model;
}
function ape(){const model=new THREE.Group();box(model,'#1a1d21',0,.39,0,1.3,.27,2.55);box(model,'#11161b',0,1.17,.55,1.33,1.42,1.28);box(model,'#334750',0,1.36,1.22,1.12,.65,.09);box(model,'#15191c',0,.92,-.69,1.36,.69,1.24);box(model,'#1f2427',0,1.31,-.60,1.38,.11,1.28);
 for(const [x,z] of [[0,1.03],[-.62,-.86],[.62,-.86]])item(model,'wheel','#202428',x,.31,z,.31,.16,.31).rotation.z=Math.PI/2;
 for(const x of [-.43,.43])box(model,'#e7d6a1',x,.66,1.31,.23,.13,.08);
 model.name='Mandria · Ape Car nera tre ruote';return model;
}
function guard(model,mounted){const person=new THREE.Group();person.position.y=mounted?1.7:.6;
 box(person,'#22252a',0,.56,0,.55,.7,.38);box(person,'#eae3d8',0,.67,.19,.18,.33,.03);box(person,'#25252a',0,.67,.22,.07,.3,.03);box(person,'#c9a381',0,1.12,0,.29,.31,.28);box(person,'#151a1e',0,1.33,0,.39,.1,.33);
 for(const side of [-1,1]){box(person,'#22252a',side*.18,.12,.04,.2,.55,.22);box(person,'#22252a',side*.37,.56,0,.18,.6,.2);}
 box(person,'#202426',.37,.29,.24,.12,.7,.12).rotation.z=-.2;model.add(person);return person;
}
function spawn(g,kind,route){const isHorse=kind==='mounted',p=world(...route[0]);
 const c=g.addCar(p.x,p.z,VILLA.yaw,false,true,isHorse?'motorcycle':'mito'),old=c.mesh;
 g.scene.remove(old);g.forget?.(c);
 c.mesh=isHorse?horse():ape();c.spec={...c.spec,name:isHorse?'Cavallo della tenuta':'Ape Car · sicurezza',width:isHorse?1.2:1.6,length:isHorse?2.5:2.8,height:isHorse?2.58:2.04,wheelbase:isHorse?1.65:1.75,accel:isHorse?7:5,brake:13,max:isHorse?13.5:13,boost:isHorse?18:15,reverse:1.3,steer:isHorse?1.8:1.2,mass:isHorse?.45:.65,bike:isHorse};
 c.rider=null;c.name=c.spec.name;c.mandriaPatrol=kind;c.route=route;c.routeIndex=1;c.fixedSpawn=true;c.parked=true;c.speed=0;c.health=100;c.y=g.terrain.height(p.x,p.z);
 c.guardModel=guard(c.mesh,isHorse);g.scene.add(c.mesh);installVehicleDamage(c);g.pose(c);return c;
}
function findPatrol(g,kind,side){const r=kind==='mounted'?.76:1.05;
 const us=side<0?[-78,-83,-74,-95,-106]:[65,70,75,85,105];
 const vs=kind==='mounted'?[22,14,8,-2,-15,-28]:[14,6,-7,-20,-35,-47];
 for(const u of us)for(const v of vs){const direction=side<0?3:-3;
  for(const length of [16,10,6]){
   const route=[[u,v],[u,v-length],[u+direction,v-length],[u+direction,v],[u,v]];
   if(freeRoute(g,route,r))return route;
  }
 }return null;}
function move(g,c,dt){if(!g.cars.includes(c)||c===g.state.car)return;
 const distance=Math.hypot(c.x-g.state.x,c.z-g.state.z);
 if(distance<5){c.speed=0;return;}
 if(distance>380){c.speed=0;c.mesh.visible=false;return;}
 if(g.state.quality==='hyper'&&c.patrolSlot!==0){c.mesh.visible=false;return;}
 c.mesh.visible=true;const [u,v]=c.route[c.routeIndex],target=world(u,v),dx=target.x-c.x,dz=target.z-c.z,remaining=Math.hypot(dx,dz);
 if(remaining<.55){c.routeIndex=(c.routeIndex+1)%c.route.length;c.speed=0;return;}
 const pace=c.mandriaPatrol==='mounted'?3.7:3.1,step=Math.min(remaining,pace*Math.min(dt,.07)),x=c.x+dx/remaining*step,z=c.z+dz/remaining*step,l=areaLocal(VILLA,x,z);
 if(!mandriaFree(g,l.u,l.v,c.spec.width*.55,2.8)){c.speed=0;c.routeIndex=(c.routeIndex+1)%c.route.length;return;}
 c.x=x;c.z=z;c.yaw=Math.atan2(dx,dz);c.y=g.terrain.height(x,z);c.speed=step/Math.max(dt,.001);g.pose(c);
 if(c.mandriaPatrol==='mounted')c.mesh.userData.horseLegs.forEach((leg,i)=>leg.rotation.x=Math.sin(g.state.elapsed*11+i*Math.PI*.7)*.42);
}
function initialize(g){const estate=g.villaV3,root=estate.root;
 const fixed=repairFence(g,root);estate.fence.built+=fixed;estate.fence.skipped=Math.max(0,estate.fence.skipped-fixed);
 estate.houses+=cottages(g,root);estate.poplars+=addPoplars(g,root);
 for(const kind of ['mounted','ape'])for(const side of [-1,1]){
  const route=findPatrol(g,kind,side);if(!route)continue;
  const c=spawn(g,kind,route);c.patrolSlot=estate.patrols.filter(p=>p.mandriaPatrol===kind).length;estate.patrols.push(c);
 }
 estate.placementFixed=true;
}
const previous=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaPrecisePlacement){
 ModernGameplay.prototype.__mandriaPrecisePlacement=true;
 ModernGameplay.prototype.update=function(dt){previous.call(this,dt);
  if(!this.state?.started||!this.villaV3||!this.villaLife?.expansion||!Number.isFinite(dt)||dt<=0)return;
  if(!this.villaV3.placementFixed)initialize(this);
  for(const c of this.villaV3.patrols)if(c.route)move(this,c,dt);
 };
}
