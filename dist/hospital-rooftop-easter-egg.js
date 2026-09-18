import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {pointInside,nearestOnSegment} from './core.js';
import {vehicleFootprint} from './movement.js';
import {SPECIAL_VEHICLES,EXTRA_TRAFFIC} from './special-vehicles.js';
import {VEHICLES} from './vehicles.js';
import {findLayout,onTrack,roofClear} from './monoblocco-track.js';

// Use the exact irregular Monoblocco footprint, never its bounding rectangle.
const TARGET='Ospedale Civile - Monoblocco - Casse - Prenotazioni';
const TARGET_POINT={x:816,z:518};
const trialSpec={name:'Trial 125 · Roof Edition',family:'motorcycle',width:.78,length:1.94,height:1.36,wheelbase:1.21,accel:18,brake:31,max:19,boost:21,reverse:3,steer:2.65,mass:.52,npcOnly:true,bike:true};
EXTRA_TRAFFIC.rooftrial=trialSpec;SPECIAL_VEHICLES.rooftrial=trialSpec;VEHICLES.rooftrial=trialSpec;
const games=new WeakMap(),materials=new Map();
function material(color,emissive=false){const key=color+emissive;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,emissive:emissive?color:'#000000',emissiveIntensity:emissive?.65:0,roughness:.78,metalness:.04,side:THREE.DoubleSide}));return materials.get(key);}
function block(root,color,x,y,z,w,h,l,yaw=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),material(color));m.position.set(x,y,z);m.rotation.y=yaw;m.castShadow=m.receiveShadow=true;root.add(m);return m;}
function footprint(box){const p=box.p||[];return p.length>3&&p[0][0]===p.at(-1)[0]&&p[0][1]===p.at(-1)[1]?p.slice(0,-1):p;}
function distanceToEdge(x,z,poly){let d=Infinity;for(let i=0;i<poly.length;i++){const p=nearestOnSegment(x,z,poly[i],poly[(i+1)%poly.length]);d=Math.min(d,Math.hypot(x-p.x,z-p.z));}return d;}
function safe(poly,x,z,margin=5){return pointInside(x,z,poly)&&distanceToEdge(x,z,poly)>=margin;}
function resolveHospital(game){const nearby=[...(game.collision?.near?.(TARGET_POINT.x,TARGET_POINT.z,250)||[])];const building=nearby.find(b=>b.n===TARGET&&Array.isArray(b.p)&&b.p.length>=3&&Number.isFinite(b.minY)&&Number.isFinite(b.h));if(!building)return null;return {building,polygon:footprint(building),roofY:building.minY+building.h+.13};}
function collisionBox(game,x,z,width,length,y,h,yaw=0,flags={}){const p=vehicleFootprint(x,z,yaw,width,length),xs=p.map(v=>v[0]),zs=p.map(v=>v[1]);game.collision.add({p,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:y,h,...flags},Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs));}
function flatRoof(root,poly,y){const shape=new THREE.Shape();poly.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),material('#aeb8b9'));mesh.rotation.x=-Math.PI/2;mesh.position.y=y+.035;mesh.receiveShadow=true;mesh.name='monoblocco-whole-footprint-flat-roof';root.add(mesh);return mesh;}
function parapets(game,root,poly,y){for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<.45)continue;const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,yaw=Math.atan2(b[0]-a[0],b[1]-a[1]);block(root,'#d1d5d1',x,y+.53,z,.40,1.06,len+.12,yaw);collisionBox(game,x,z,.40,len+.12,y,1.06,yaw,{hospitalRoofParapet:true});}}
function helipad(root,p,y){const ring=new THREE.Mesh(new THREE.TorusGeometry(10.1,.38,8,48),material('#f7f7ed',true));ring.position.set(p.x,y+.14,p.z);ring.rotation.x=Math.PI/2;root.add(ring);for(const [dx,dz,w,l] of [[-3.2,0,1.2,8.2],[3.2,0,1.2,8.2],[0,0,7.6,1.2]])block(root,'#fafafa',p.x+dx,y+.12,p.z+dz,w,.08,l);for(let i=0;i<12;i++){const a=i/12*Math.PI*2,x=p.x+12.2*Math.cos(a),z=p.z+12.2*Math.sin(a),lamp=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.09,8),material(i%2?'#56d7ff':'#ffffff',true));lamp.position.set(x,y+.14,z);root.add(lamp);}const sign=block(root,'#1a4848',p.x,y+.055,p.z+14.2,18,.08,.3);sign.userData.roofHelipad=true;}
function ramp(game,root,y,p,rise=.82){const length=5.2,width=2.9,r={kind:'hospital-rooftop-ramp',hospitalRoof:true,x:p.x,z:p.z,yaw:p.yaw,width,length,rise,baseY:y,topY:[y,y,y+rise,y+rise]};game.terrain.arcadeRamps.push(r);const mesh=block(root,'#c47b3d',p.x,y+rise/2+.05,p.z,width,.18,length,p.yaw);mesh.rotation.order='YXZ';mesh.rotation.x=-Math.atan2(rise,length);return r;}
function woodenBridge(game,root,y,p){const rise=.22,width=3.35,length=6.5,r={kind:'hospital-roof-wooden-bridge',hospitalRoof:true,x:p.x,z:p.z,yaw:p.yaw,width,length,rise,baseY:y,topY:[y+rise,y+rise,y+rise,y+rise]};game.terrain.arcadeRamps.push(r);block(root,'#936542',p.x,y+rise-.07,p.z,width,.15,length,p.yaw);for(let i=-3;i<=3;i++){const t=i/3*length*.46,x=p.x+Math.sin(p.yaw)*t,z=p.z+Math.cos(p.yaw)*t;block(root,'#b28a5a',x,y+rise+.025,z,width,.055,.13,p.yaw);}return r;}
function addCourse(game,root,poly,layout,y){const ramps=[],bridges=[];for(let i=0;i<84;i++){const p=onTrack(layout,i/84);if(i%2===0)block(root,'#e2c47d',p.x,y+.049,p.z,.13,.022,1.35,p.yaw);}
 for(const t of [.13,.43,.73])ramps.push(ramp(game,root,y,onTrack(layout,t),.70+t*.45));
 for(const t of [.29,.87])bridges.push(woodenBridge(game,root,y,onTrack(layout,t)));
 for(const t of [.05,.35,.60,.94]){const p=onTrack(layout,t),m=Math.hypot(p.dx,p.dz),x=p.x+p.dz/m*5,z=p.z-p.dx/m*5;if(!safe(poly,x,z,3))continue;block(root,'#ef9141',x,y+.30,z,.4,.6,.4);collisionBox(game,x,z,.4,.4,y,.6,0,{hospitalRoofObstacle:true});}
 return {ramps,bridges};}
function addBike(game,layout,t,y,occupied,name){const p=onTrack(layout,t),c=game.addCar(p.x,p.z,p.yaw,false,!occupied,'rooftrial');Object.assign(c,{x:p.x,z:p.z,y:y+.11,yaw:p.yaw,speed:0,health:100,parked:!occupied,fixedSpawn:true,missionUnit:true,budgetSleeping:false,hospitalRoofBike:true,name});c.mesh.visible=true;game.pose(c);if(c.rider)c.rider.visible=true;return c;}
function bump(t,at,width=.046,height=.95){const d=Math.abs((((t-at)+.5)%1+1)%1-.5);return d>=width?0:Math.sin((1-d/width)*Math.PI/2)*height;}
function update(game){const s=games.get(game);if(!s)return;
 // Parked aircraft remain in the world; a parked helicopter is not a disposable traffic spawn.
 for(const c of game.cars)if(c.spec?.aircraft&&!c.spec.plane&&c.parked&&c.mesh?.visible&&c.y>=s.y-.5&&c.y<s.y+1.2&&safe(s.polygon,c.x,c.z,2)){
  c.rooftopParked=true;c.fixedSpawn=false;c.missionUnit=true;c.abandonedAt=0;c.budgetSleeping=false;c.mesh.visible=true;
 }
 for(let i=0;i<s.moving.length;i++){
  const c=s.moving[i];if(!c||!game.cars.includes(c)||game.state.car===c)continue;
  const t=((game.state.elapsed*(i? .039:.044)+s.phases[i])%1+1)%1,p=onTrack(s.layout,t),jump=bump(t,.16,.040,.82)+bump(t,.46,.045,.98)+bump(t,.76,.043,.88);
  Object.assign(c,{x:p.x,z:p.z,y:s.y+.11+jump,yaw:p.yaw,speed:i?12.5:14,parked:false,fixedSpawn:true,missionUnit:true,budgetSleeping:false,health:100});
  c.mesh.visible=true;c.mesh.position.set(c.x,c.y,c.z);c.mesh.rotation.set(jump>.08?-.08:0,p.yaw,0,'YXZ');if(c.rider)c.rider.visible=true;
 }
}
function install(game){if(games.has(game))return games.get(game);const hospital=resolveHospital(game);if(!hospital){console.warn('[Monoblocco trial] exact hospital footprint not found: refusing to use a substitute roof');return null;}const {building,polygon,roofY:y}=hospital,layout=findLayout(polygon,building);if(!layout){console.warn('[Monoblocco trial] no collision-safe loop and independent helipad on real polygon');return null;}
 const root=new THREE.Group();root.name='ospedale-monoblocco-entire-roof-trial';flatRoof(root,polygon,y);parapets(game,root,polygon,y);helipad(root,layout.helipad,y);const course=addCourse(game,root,polygon,layout,y);
 game.scene.add(root);
 const oldHeight=game.terrain.height.bind(game.terrain),oldSlope=game.terrain.slope.bind(game.terrain);
 game.terrain.height=(x,z,reference=null)=>Number.isFinite(reference)&&reference>=y-2.25&&pointInside(x,z,polygon)?Math.max(y,oldHeight(x,z,reference)):oldHeight(x,z,reference);
 game.terrain.slope=(x,z,yaw,wheelbase,reference=null)=>Number.isFinite(reference)&&reference>=y-2.25&&pointInside(x,z,polygon)?0:oldSlope(x,z,yaw,wheelbase,reference);
 const riders=[addBike(game,layout,0,y,true,'Pro Trial · 01'),addBike(game,layout,.50,y,true,'Pro Trial · 02')];const playerBike=addBike(game,layout,.82,y,false,'Trial 125 · Moto disponibile');
 const entry={name:TARGET,building,polygon,y,layout,root,helipad:layout.helipad,ramps:course.ramps,bridges:course.bridges,bikes:[...riders,playerBike],moving:riders,phases:[0,.5]};games.set(game,entry);return entry;
}
const originalPopulate=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__hospitalRooftopEasterEgg){
 ModernGameplay.prototype.__hospitalRooftopEasterEgg=true;
 ModernGameplay.prototype.populate=function(...args){const result=originalPopulate.apply(this,args);install(this);return result;};
 const originalUpdate=ModernGameplay.prototype.update;
 ModernGameplay.prototype.update=function(dt){const result=originalUpdate.call(this,dt);update(this);return result;};
}
export const HOSPITAL_ROOFTOP_EASTER_EGG={anchor:TARGET,wholeFootprint:true,helipad:true,bikes:3,movingRiders:2,ramps:3,woodenBridges:2};
export {TARGET as HOSPITAL_MONOBLOCCO_NAME,resolveHospital,findLayout,onTrack};
