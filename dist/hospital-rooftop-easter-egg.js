import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {project,clamp,dist} from './core.js';
import {VILLA} from './gameplay-areas.js';

// The easter egg belongs to the central hospital immediately beside the Treves villa.
// Resolve the actual hospital footprint present in the loaded map instead of placing
// a detached platform at a fixed coordinate.
const HOSPITAL_HINT=project(45.403920,11.887309);
const SEARCH_RADIUS=175;
const DEFAULT_W=68,DEFAULT_L=50;
const stateByGame=new WeakMap();
const mats=new Map();
function mat(color,{emissive=null,metalness=.05,roughness=.72}={}){const key=[color,emissive,metalness,roughness].join(':');if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,emissive:emissive||'#000000',emissiveIntensity:emissive?1.15:0,metalness,roughness}));return mats.get(key);}
function basic(color){return new THREE.MeshBasicMaterial({color});}
function worldPoint(center,lx,lz){const s=Math.sin(center.yaw),c=Math.cos(center.yaw);return {x:center.x+c*lx+s*lz,z:center.z-s*lx+c*lz};}
function box(root,color,cx,cy,cz,w,h,d,yaw,material=null){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material||mat(color));m.position.set(cx,cy,cz);m.rotation.y=yaw;m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
function orientedRect(cx,cz,w,l,yaw){const s=Math.sin(yaw),c=Math.cos(yaw);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sz])=>[cx+c*sx*w/2+s*sz*l/2,cz-s*sx*w/2+c*sz*l/2]);}
function collisionBox(game,cx,cz,w,l,minY,h,yaw,extra={}){if(!game.collision?.add)return null;const p=orientedRect(cx,cz,w,l,yaw),item={p,minY,h,...extra},xs=p.map(v=>v[0]),zs=p.map(v=>v[1]);game.collision.add(item,Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs));return item;}
function candidateCenter(b){return {x:Number.isFinite(b.cx)?b.cx:(b.minX+b.maxX)/2,z:Number.isFinite(b.cz)?b.cz:(b.minZ+b.maxZ)/2};}
function footprintYaw(b){if(!Array.isArray(b.p)||b.p.length<2)return .08;let best=null;for(let i=0;i<b.p.length;i++){const a=b.p[i],q=b.p[(i+1)%b.p.length],len=Math.hypot(q[0]-a[0],q[1]-a[1]);if(!best||len>best.len)best={len,yaw:Math.atan2(q[0]-a[0],q[1]-a[1])};}return best?.yaw??.08;}
function resolveHospital(game){
 const pool=[...(game.collision?.near?.(HOSPITAL_HINT.x,HOSPITAL_HINT.z,SEARCH_RADIUS)||[])].filter(b=>{
  if(!b||b.kind||!Array.isArray(b.p)||b.p.length<3||!Number.isFinite(b.minX)||!Number.isFinite(b.maxX)||!Number.isFinite(b.minZ)||!Number.isFinite(b.maxZ)||!Number.isFinite(b.h))return false;
  const c=candidateCenter(b),w=b.maxX-b.minX,l=b.maxZ-b.minZ,dVilla=dist(c,VILLA),dHint=dist(c,HOSPITAL_HINT);
  return dVilla>70&&dVilla<390&&dHint<SEARCH_RADIUS&&w*l>180&&b.h>5;
 });
 pool.sort((a,b)=>{
  const ca=candidateCenter(a),cb=candidateCenter(b),na=String(a.n||a.name||'').toLowerCase(),nb=String(b.n||b.name||'').toLowerCase(),hospital=/osped|hospital|clin|giustinian|policlin/.test(na)?-180:0,hospitalB=/osped|hospital|clin|giustinian|policlin/.test(nb)?-180:0;
  const areaA=(a.maxX-a.minX)*(a.maxZ-a.minZ),areaB=(b.maxX-b.minX)*(b.maxZ-b.minZ);
  return hospital+dist(ca,HOSPITAL_HINT)-Math.min(70,areaA/80)-(hospitalB+dist(cb,HOSPITAL_HINT)-Math.min(70,areaB/80));
 });
 const building=pool[0]||null,c=building?candidateCenter(building):HOSPITAL_HINT,w=building?building.maxX-building.minX:DEFAULT_W,l=building?building.maxZ-building.minZ:DEFAULT_L;
 return {building,x:c.x,z:c.z,yaw:building?footprintYaw(building):.08,width:clamp(w+3,58,82),length:clamp(l+3,44,62),name:building?.n||building?.name||'Ospedale centrale'};
}
function highestRoof(game,anchor,ground){if(anchor.building&&Number.isFinite(anchor.building.minY)&&Number.isFinite(anchor.building.h))return clamp(anchor.building.minY+anchor.building.h+.28,ground+13,ground+36);let top=ground+19;for(const b of game.collision?.near?.(anchor.x,anchor.z,40)||[]){if(b.kind)continue;const value=(b.minY||ground)+(b.h||0);if(Number.isFinite(value)&&value>ground+5&&value<ground+42)top=Math.max(top,value);}return clamp(top+.28,ground+16,ground+35);}
function makeHelipad(root,center){const p=worldPoint(center,-center.width*.27,0),ring=new THREE.Mesh(new THREE.TorusGeometry(10.4,.38,8,64),mat('#f7f7ef',{emissive:'#777b72',roughness:.42}));ring.position.set(p.x,center.roofY+.15,p.z);ring.rotation.x=Math.PI/2;ring.rotation.z=-center.yaw;root.add(ring);const white=mat('#ffffff',{emissive:'#4f524d',roughness:.48});
 for(const [lx,lz,w,d] of [[-3.3,0,1.25,9],[3.3,0,1.25,9],[0,0,7.8,1.25]]){const q=worldPoint(center,-center.width*.27+lx,lz);box(root,'#fff',q.x,center.roofY+.16,q.z,w,.10,d,center.yaw,white);}
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2,q=worldPoint(center,-center.width*.27+Math.cos(a)*12.1,Math.sin(a)*12.1),lamp=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.08,10),mat(i%2?'#4cd7ff':'#f4f4e9',{emissive:i%2?'#4cd7ff':'#f4f4e9'}));lamp.position.set(q.x,center.roofY+.14,q.z);root.add(lamp);}return p;}
function addRoofRamp(game,root,center,lx,lz,yawOffset=0,rise=1.45,width=3.8,length=8.2){const p=worldPoint(center,lx,lz),yaw=center.yaw+yawOffset,r={kind:'hospital-rooftop-ramp',hospitalRoof:true,x:p.x,z:p.z,yaw,width,length,rise,baseY:center.roofY,topY:[center.roofY,center.roofY,center.roofY+rise,center.roofY+rise]};game.terrain.arcadeRamps=[...(game.terrain.arcadeRamps||[]),r];const mesh=box(root,'#d48735',p.x,center.roofY+rise*.5+.05,p.z,width,.18,length,yaw);mesh.rotation.order='YXZ';mesh.rotation.x=-Math.atan2(rise,length);return r;}
function addObstacle(game,root,center,lx,lz,w,l,h,color='#596168'){const p=worldPoint(center,lx,lz);box(root,color,p.x,center.roofY+h/2+.05,p.z,w,h,l,center.yaw);collisionBox(game,p.x,p.z,w,l,center.roofY,h,center.yaw,{hospitalRoofObstacle:true});}
function addParapet(game,root,center){const h=.82,t=.34;for(const [lx,lz,w,l] of [[0,-center.length/2,center.width,t],[0,center.length/2,center.width,t],[-center.width/2,0,t,center.length],[center.width/2,0,t,center.length]]){const p=worldPoint(center,lx,lz);box(root,'#d9d5cb',p.x,center.roofY+h/2,p.z,w,h,l,center.yaw);collisionBox(game,p.x,p.z,w,l,center.roofY,h,center.yaw,{hospitalRoofParapet:true});}}
function addHospitalMark(root,center){const p=worldPoint(center,center.width*.39,-center.length*.39);const post=box(root,'#d9d9d2',p.x,center.roofY+1.65,p.z,.20,3.3,.20,center.yaw),panel=box(root,'#20262b',p.x,center.roofY+3.05,p.z,9.2,1.05,.22,center.yaw,mat('#20262b',{metalness:.2,roughness:.48}));post.userData.hospitalRoofMarker=true;panel.userData.hospitalRoofMarker=true;const q=worldPoint(center,center.width*.39,-center.length*.395);box(root,'#52e1ff',q.x,center.roofY+3.05,q.z,7.4,.08,.04,center.yaw,basic('#52e1ff'));}
function addBike(game,center,style,lx,lz,yawOffset,name){const p=worldPoint(center,lx,lz),c=game.addCar(p.x,p.z,center.yaw+yawOffset,false,true,style);Object.assign(c,{x:p.x,z:p.z,y:center.roofY+.09,yaw:center.yaw+yawOffset,speed:0,health:100,parked:true,fixedSpawn:true,missionUnit:false,budgetSleeping:false,hospitalRoofBike:true,name});c.mesh.visible=true;game.pose(c);return c;}
function install(game){
 if(stateByGame.has(game))return stateByGame.get(game);
 const anchor=resolveHospital(game),ground=game.terrain.height(anchor.x,anchor.z),roofY=highestRoof(game,anchor,ground),center={...anchor,roofY},root=new THREE.Group();root.name='hospital-rooftop-easter-egg-treves';
 // This slab intentionally covers the existing roof so the hospital next to Villa Treves
 // is unmistakably flat and playable from edge to edge.
 box(root,'#a9afb2',center.x,roofY-.22,center.z,center.width,.44,center.length,center.yaw,mat('#a9afb2',{roughness:.92}));
 const roofSurface={kind:'hospital-flat-roof',hospitalRoof:true,x:center.x,z:center.z,yaw:center.yaw,width:center.width-1,length:center.length-1,rise:0,baseY:roofY,topY:[roofY,roofY,roofY,roofY]};game.terrain.arcadeRamps=[...(game.terrain.arcadeRamps||[]),roofSurface];
 collisionBox(game,center.x,center.z,center.width,center.length,ground,Math.max(.5,roofY-ground),center.yaw,{hospitalRoof:true,driveTopMin:roofY});
 addParapet(game,root,center);makeHelipad(root,center);addHospitalMark(root,center);
 const stuntX=center.width*.18,span=Math.min(20,center.length*.35),ramps=[addRoofRamp(game,root,center,stuntX,-span,.02,1.25,3.6,7.7),addRoofRamp(game,root,center,center.width*.33,0,-.12,1.65,3.9,8.8),addRoofRamp(game,root,center,stuntX,span,.10,1.4,3.7,8.1)];
 addObstacle(game,root,center,center.width*.27,-span,4.5,1.2,.8,'#ca763d');addObstacle(game,root,center,center.width*.39,8,1.1,5.5,1.05,'#58646c');addObstacle(game,root,center,center.width*.13,3,2.3,2.3,.75,'#6b735f');addObstacle(game,root,center,center.width*.30,span,5.2,1,.7,'#bd9848');
 game.scene.add(root);
 const bike1=addBike(game,center,'trail',center.width*.16,-8,.1,'Ragazzo rooftop · Trail'),bike2=addBike(game,center,'cruiser',center.width*.30,8,Math.PI,'Ragazzo rooftop · Cruiser'),bike3=addBike(game,center,'motorcycle',center.width*.08,center.length*.35,-Math.PI/2,'Moto rooftop · libera');
 for(const bike of [bike1,bike2]){bike.parked=false;bike.missionUnit=true;if(bike.rider)bike.rider.visible=true;}
 const entry={center,ground,roofY,root,roofSurface,ramps,bikes:[bike1,bike2,bike3],moving:[bike1,bike2],phase:[0,.46],installedAt:game.state.elapsed};stateByGame.set(game,entry);return entry;
}
function bump(t,center,width=.055,height=1.25){const d=Math.abs((((t-center)+.5)%1+1)%1-.5);if(d>=width)return 0;return Math.sin((1-d/width)*Math.PI/2)*height;}
function updateRiders(game){const h=stateByGame.get(game);if(!h)return;for(let i=0;i<h.moving.length;i++){const bike=h.moving[i];if(!bike||game.state.car===bike)continue;const t=((game.state.elapsed*.052+h.phase[i])%1+1)%1,a=t*Math.PI*2,rx=Math.min(18,h.center.width*.28)-i*1.8,rz=Math.min(15,h.center.length*.30)-i*.9,cx=h.center.width*.15+i*1.2,lx=cx+Math.cos(a)*rx,lz=Math.sin(a)*rz,p=worldPoint(h.center,lx,lz),dlx=-Math.sin(a)*rx,dlz=Math.cos(a)*rz,heading=worldPoint({x:0,z:0,yaw:h.center.yaw},dlx,dlz),jump=bump(t,.20,.045,1.25)+bump(t,.66,.052,1.0);bike.x=p.x;bike.z=p.z;bike.y=h.roofY+.10+jump;bike.yaw=Math.atan2(heading.x,heading.z);bike.speed=15+i*2;bike.parked=false;bike.fixedSpawn=true;bike.missionUnit=true;bike.budgetSleeping=false;bike.health=100;bike.mesh.visible=true;bike.mesh.position.set(bike.x,bike.y,bike.z);bike.mesh.rotation.set(jump>.08?-.08:0,bike.yaw,0,'YXZ');if(bike.rider)bike.rider.visible=true;}}
const previousPopulate=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__hospitalRooftopEasterEgg){ModernGameplay.prototype.__hospitalRooftopEasterEgg=true;ModernGameplay.prototype.populate=function(...args){const out=previousPopulate.apply(this,args);install(this);return out;};const previousUpdate=ModernGameplay.prototype.update;ModernGameplay.prototype.update=function(dt){const out=previousUpdate.call(this,dt);updateRiders(this);return out;};}

export const HOSPITAL_ROOFTOP_EASTER_EGG={anchor:'actual hospital footprint beside Villa Treves',hint:HOSPITAL_HINT,searchRadius:SEARCH_RADIUS,helipad:true,bikes:3,movingRiders:2,ramps:3};
