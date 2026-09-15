import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {project,clamp} from './core.js';

// Ospedale centrale / Via Giustiniani. The roof is deliberately a compact
// playable easter egg: helipad on the west half, moto playground on the east.
const HOSPITAL=project(45.403920,11.887309);
const ROOF_W=64,ROOF_L=48,ROOF_YAW=.08;
const stateByGame=new WeakMap();
const mats=new Map();
function mat(color,{emissive=null,metalness=.05,roughness=.72}={}){const key=[color,emissive,metalness,roughness].join(':');if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,emissive:emissive||'#000000',emissiveIntensity:emissive?1.15:0,metalness,roughness}));return mats.get(key);}
function basic(color){return new THREE.MeshBasicMaterial({color});}
function worldPoint(cx,cz,lx,lz,yaw=ROOF_YAW){const s=Math.sin(yaw),c=Math.cos(yaw);return {x:cx+c*lx+s*lz,z:cz-s*lx+c*lz};}
function box(sceneRoot,color,cx,cy,cz,w,h,d,yaw=ROOF_YAW,material=null){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material||mat(color));m.position.set(cx,cy,cz);m.rotation.y=yaw;m.castShadow=true;m.receiveShadow=true;sceneRoot.add(m);return m;}
function orientedRect(cx,cz,w,l,yaw=ROOF_YAW){return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sz])=>{const p=worldPoint(cx,cz,sx*w/2,sz*l/2,yaw);return [p.x,p.z];});}
function collisionBox(game,cx,cz,w,l,minY,h,yaw=ROOF_YAW,extra={}){if(!game.collision?.add)return null;const p=orientedRect(cx,cz,w,l,yaw),item={p,minY,h,...extra};const xs=p.map(v=>v[0]),zs=p.map(v=>v[1]);game.collision.add(item,Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs));return item;}
function localFeature(center,lx,lz){return worldPoint(center.x,center.z,lx,lz);}
function highestNearbyRoof(game,ground){let top=ground+23;for(const b of game.collision?.near?.(HOSPITAL.x,HOSPITAL.z,44)||[]){const value=(b.minY||ground)+(b.h||0);if(!Number.isFinite(value)||value<ground+5||value>ground+44)continue;top=Math.max(top,value);}return clamp(top+.16,ground+22,ground+35);}
function makeHelipad(root,center,roofY){const p=localFeature(center,-17,0),ring=new THREE.Mesh(new THREE.TorusGeometry(10.2,.34,8,64),mat('#f2f4ef',{emissive:'#676b66',roughness:.45}));ring.position.set(p.x,roofY+.12,p.z);ring.rotation.x=Math.PI/2;ring.rotation.z=-ROOF_YAW;root.add(ring);
 const white=mat('#f6f7f2',{emissive:'#4d504c',roughness:.5});
 const a=localFeature(center,-20.2,0),b=localFeature(center,-13.8,0),c=localFeature(center,-17,0);
 box(root,'#fff',a.x,roofY+.13,a.z,1.15,.09,8.8,ROOF_YAW,white);box(root,'#fff',b.x,roofY+.13,b.z,1.15,.09,8.8,ROOF_YAW,white);box(root,'#fff',c.x,roofY+.14,c.z,7.5,.09,1.15,ROOF_YAW,white);
 for(let i=0;i<10;i++){const angle=i/10*Math.PI*2,lp=localFeature(center,-17+Math.cos(angle)*11.8,Math.sin(angle)*11.8),lamp=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.07,10),mat(i%2?'#4cd7ff':'#f0f3e7',{emissive:i%2?'#4cd7ff':'#f0f3e7'}));lamp.position.set(lp.x,roofY+.12,lp.z);root.add(lamp);}return p;}
function addRoofRamp(game,root,center,lx,lz,yawOffset=0,rise=1.55,width=3.7,length=8.4){const p=localFeature(center,lx,lz),yaw=ROOF_YAW+yawOffset,r={kind:'hospital-rooftop-ramp',hospitalRoof:true,x:p.x,z:p.z,yaw,width,length,rise,baseY:center.roofY,topY:[center.roofY,center.roofY,center.roofY+rise,center.roofY+rise]};game.terrain.arcadeRamps=[...(game.terrain.arcadeRamps||[]),r];const mesh=box(root,'#d18a37',p.x,center.roofY+rise*.5+.06,p.z,width,.18,length,yaw);mesh.rotation.order='YXZ';mesh.rotation.x=-Math.atan2(rise,length);return r;}
function addObstacle(game,root,center,lx,lz,w,l,h,color='#596168'){const p=localFeature(center,lx,lz);box(root,color,p.x,center.roofY+h/2+.06,p.z,w,h,l,ROOF_YAW);collisionBox(game,p.x,p.z,w,l,center.roofY,h,ROOF_YAW,{hospitalRoofObstacle:true});}
function addParapet(game,root,center){const h=.82,t=.34;for(const [lx,lz,w,l] of [[0,-ROOF_L/2,ROOF_W,t],[0,ROOF_L/2,ROOF_W,t],[-ROOF_W/2,0,t,ROOF_L],[ROOF_W/2,0,t,ROOF_L]]){const p=localFeature(center,lx,lz);box(root,'#d6d3c9',p.x,center.roofY+h/2,p.z,w,h,l,ROOF_YAW);collisionBox(game,p.x,p.z,w,l,center.roofY,h,ROOF_YAW,{hospitalRoofParapet:true});}}
function addEasterEggSign(root,center){const p=localFeature(center,25,-18);const panel=box(root,'#1c2227',p.x,center.roofY+1.3,p.z,7,.95,.18,ROOF_YAW,mat('#1c2227',{metalness:.25,roughness:.5}));panel.userData.hospitalRoofSign=true;for(const [i,width] of [5.7,4.2,2.8].entries()){const q=localFeature(center,25,-18.12+i*.03);box(root,'#53e1ff',q.x,center.roofY+1.48-i*.28,q.z,width,.055,.04,ROOF_YAW,basic('#53e1ff'));}}
function addBike(game,center,style,lx,lz,yawOffset,name){const p=localFeature(center,lx,lz),c=game.addCar(p.x,p.z,ROOF_YAW+yawOffset,false,true,style);Object.assign(c,{x:p.x,z:p.z,y:center.roofY+.08,yaw:ROOF_YAW+yawOffset,speed:0,health:100,parked:true,fixedSpawn:true,missionUnit:false,budgetSleeping:false,hospitalRoofBike:true,name});c.mesh.visible=true;game.pose(c);return c;}
function install(game){if(stateByGame.has(game))return stateByGame.get(game);const ground=game.terrain.height(HOSPITAL.x,HOSPITAL.z),roofY=highestNearbyRoof(game,ground),center={...HOSPITAL,roofY},root=new THREE.Group();root.name='hospital-rooftop-easter-egg';
 // Flat playable slab above the existing central hospital roof.
 box(root,'#a8adb0',center.x,roofY-.18,center.z,ROOF_W,.36,ROOF_L,ROOF_YAW,mat('#a8adb0',{roughness:.9}));
 const roofSurface={kind:'hospital-flat-roof',hospitalRoof:true,x:center.x,z:center.z,yaw:ROOF_YAW,width:ROOF_W-1,length:ROOF_L-1,rise:0,baseY:roofY,topY:[roofY,roofY,roofY,roofY]};game.terrain.arcadeRamps=[...(game.terrain.arcadeRamps||[]),roofSurface];
 collisionBox(game,center.x,center.z,ROOF_W,ROOF_L,ground,Math.max(.5,roofY-ground),ROOF_YAW,{hospitalRoof:true,driveTopMin:roofY});
 addParapet(game,root,center);makeHelipad(root,center,roofY);
 // Compact stunt line on the opposite half of the roof. The helipad remains clear.
 const ramps=[addRoofRamp(game,root,center,7,-13,.02,1.25,3.5,7.6),addRoofRamp(game,root,center,20,-1,-.13,1.65,3.8,8.8),addRoofRamp(game,root,center,8,13,.10,1.4,3.6,8.1)];
 addObstacle(game,root,center,15,-14,4.6,1.2,.8,'#ca763d');addObstacle(game,root,center,25,8,1.1,5.8,1.05,'#58646c');addObstacle(game,root,center,7,3,2.3,2.3,.75,'#6b735f');addObstacle(game,root,center,19,14,5.5,1.0,.7,'#bd9848');
 addEasterEggSign(root,center);game.scene.add(root);
 const bike1=addBike(game,center,'trail',9,-7,.1,'Ragazzo rooftop · Trail');const bike2=addBike(game,center,'cruiser',18,8,Math.PI,'Ragazzo rooftop · Cruiser');const bike3=addBike(game,center,'motorcycle',3,17,-Math.PI/2,'Moto rooftop · libera');
 // Two riders are already lapping the rooftop. The third bike is intentionally parked for the player.
 for(const bike of [bike1,bike2]){bike.parked=false;bike.missionUnit=true;if(bike.rider)bike.rider.visible=true;}
 const entry={center,ground,roofY,root,roofSurface,ramps,bikes:[bike1,bike2,bike3],moving:[bike1,bike2],phase:[0,.46],installedAt:game.state.elapsed};stateByGame.set(game,entry);return entry;}
function bump(t,center,width=.055,height=1.25){let d=Math.abs((((t-center)+.5)%1+1)%1-.5);if(d>=width)return 0;return Math.sin((1-d/width)*Math.PI/2)*height;}
function updateRiders(game,dt){const h=stateByGame.get(game);if(!h)return;for(let i=0;i<h.moving.length;i++){const bike=h.moving[i];if(!bike||game.state.car===bike)continue;const t=((game.state.elapsed*.052+h.phase[i])%1+1)%1,a=t*Math.PI*2,rx=17.5-i*1.8,rz=15-i*.9,cx=10+i*1.3,lx=cx+Math.cos(a)*rx,lz=Math.sin(a)*rz,p=localFeature(h.center,lx,lz),dlx=-Math.sin(a)*rx,dlz=Math.cos(a)*rz;const wp=worldPoint(0,0,dlx,dlz),jump=bump(t,.20,.045,1.35)+bump(t,.66,.052,1.05);bike.x=p.x;bike.z=p.z;bike.y=h.roofY+.09+jump;bike.yaw=Math.atan2(wp.x,wp.z);bike.speed=15+i*2;bike.parked=false;bike.fixedSpawn=true;bike.missionUnit=true;bike.budgetSleeping=false;bike.health=100;bike.mesh.visible=true;bike.mesh.position.set(bike.x,bike.y,bike.z);bike.mesh.rotation.set(jump>.08?-.08:0,bike.yaw,0,'YXZ');if(bike.rider)bike.rider.visible=true;}
}
const previousPopulate=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__hospitalRooftopEasterEgg){ModernGameplay.prototype.__hospitalRooftopEasterEgg=true;ModernGameplay.prototype.populate=function(...args){const out=previousPopulate.apply(this,args);install(this);return out;};const previousUpdate=ModernGameplay.prototype.update;ModernGameplay.prototype.update=function(dt){const out=previousUpdate.call(this,dt);updateRiders(this,dt);return out;};}

export const HOSPITAL_ROOFTOP_EASTER_EGG={lat:45.403920,lon:11.887309,width:ROOF_W,length:ROOF_L,helipad:true,bikes:3,movingRiders:2,ramps:3};
