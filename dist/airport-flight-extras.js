// Airport-only enhancements: playable jet missiles, additional civilian aircraft
// and a paused-map flight radar. Does not modify city terrain or road controllers.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VEHICLES} from './vehicles.js';
import {SPECIAL_VEHICLES} from './special-vehicles.js';
import {vehicleBlocked} from './movement.js';
import {staticHit} from './combat.js';
import {AIRPORT,areaPoint} from './gameplay-areas.js';
import {installVehicleDamage} from './vehicle-damage.js';
import {destroyAirportAircraft} from './airport-air-traffic.js';

const JETS=new Set(['airport-jet','airport-interceptor','airport-strike']);
export const missileJet=style=>JETS.has(style);
const civil=[
 {style:'airport-regional',name:'Aereo regionale · turboelica',width:20,length:19,height:5,max:82,accel:7.5,steer:.46,u:103,v:198,color:'#e1e9df',trim:'#24718b',engines:2},
 {style:'airport-business',name:'Business jet · executive',width:13,length:17,height:4.5,max:111,accel:11,steer:.65,u:104,v:-35,color:'#dce4eb',trim:'#425e91',engines:2},
 {style:'airport-commuter',name:'Aereo civile · pendolare',width:11,length:12,height:3.7,max:86,accel:9,steer:.72,u:103,v:-119,color:'#f0e4ca',trim:'#b65d35',engines:2}
];
export const CIVIL_AIRCRAFT=civil.map(({style,name,u,v})=>({style,name,u,v}));
for(const spec of civil){const data={...VEHICLES['airport-trainer'],name:spec.name,width:spec.width,length:spec.length,height:spec.height,wheelbase:spec.length*.42,max:spec.max,boost:spec.max,accel:spec.accel,steer:spec.steer,aircraft:true,plane:true};VEHICLES[spec.style]=data;SPECIAL_VEHICLES[spec.style]=data;}
const cube=new THREE.BoxGeometry(1,1,1),materials=new Map();
function block(group,x,y,z,w,h,d,color){
 if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.72}));
 const mesh=new THREE.Mesh(cube,materials.get(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
}
function civilModel(spec){
 const g=new THREE.Group(),regional=spec.style==='airport-regional',business=spec.style==='airport-business',span=spec.width;
 block(g,0,spec.height*.46,0,regional?2.65:business?2:1.65,spec.height*.62,spec.length*.86,spec.color);
 block(g,0,spec.height*.48,spec.length*.46,regional?1.6:1.3,.65,1.3,spec.color);
 block(g,0,spec.height*.43,-.45,span,.24,regional?2.65:2.15,spec.color);
 block(g,0,spec.height*.53,-spec.length*.42,span*.38,.2,1.45,spec.trim);
 block(g,0,spec.height*.78,-spec.length*.42,.22,spec.height*.9,1.9,spec.trim);
 block(g,0,spec.height*.66,spec.length*.23,1.35,.62,2.8,'#42657b');
 for(const sign of [-1,1]){
  const engineX=sign*span*.29;
  block(g,engineX,spec.height*.25,.4,regional?1.15:.85,regional?1.55:.95,regional?3.4:3,spec.trim);
  if(regional){block(g,engineX,spec.height*.25,2.15,.1,2.7,.12,'#344047');block(g,engineX,spec.height*.25,2.15,2.7,.1,.12,'#344047');}
  block(g,sign*.9,.45,-spec.length*.2,.3,.9,.65,'#384449');
  for(let z=-spec.length*.32;z<spec.length*.28;z+=2.5)block(g,sign*(regional?1.33:business?1.02:.85),spec.height*.58,z,.065,.27,.65,'#46738a');
 }
 g.name=spec.name;return g;
}
function parkCivil(g){
 const ops=g.interactiveAirport;if(!ops||ops.civilReady||Math.hypot(g.state.x-AIRPORT.x,g.state.z-AIRPORT.z)>1050)return;
 ops.civilReady=true;ops.civil=[];
 for(const spec of civil){
  const p=areaPoint(AIRPORT,spec.u,spec.v),y=g.terrain.height(p.x,p.z),yaw=AIRPORT.yaw-Math.PI/2,dimensions=VEHICLES[spec.style];
  const occupied=g.cars.some(c=>c.mesh.visible&&Math.hypot(c.x-p.x,c.z-p.z)<(c.spec.length+dimensions.length)*.5+3);
  if(occupied||!g.terrain.dry(p.x,p.z,dimensions.width*.5,y)||vehicleBlocked(p.x,p.z,yaw,g.collision,dimensions,y))continue;
  const car=g.addCar(p.x,p.z,yaw,false,true,spec.style),old=car.mesh,mesh=civilModel(spec);
  g.scene.remove(old);g.scene.add(mesh);car.mesh=mesh;
  Object.assign(car,{x:p.x,z:p.z,y,yaw,health:100,speed:0,parked:true,airportClaimed:true,missionUnit:true,name:spec.name,damageVisual:null});
  installVehicleDamage(car);g.pose(car);ops.civil.push(car);ops.extras.push(car);
 }
}
const nose=new THREE.CylinderGeometry(.12,.2,1.85,7),flame=new THREE.MeshBasicMaterial({color:'#ffa83b'}),skin=new THREE.MeshStandardMaterial({color:'#d9dfd8',metalness:.4,roughness:.43});
function missileMesh(){const g=new THREE.Group(),body=new THREE.Mesh(nose,skin),tail=new THREE.Mesh(new THREE.ConeGeometry(.27,.75,6),flame);body.rotation.x=Math.PI/2;tail.rotation.x=-Math.PI/2;tail.position.z=-1.1;g.add(body,tail);return g;}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function targets(g,origin,forward){
 let best=null,score=Infinity;
 for(const a of g.cars){
  if(a===g.state.car||a.health<=0||!a.mesh.visible||!a.spec.aircraft)continue;
  const dx=a.x-origin.x,dz=a.z-origin.z,dy=(a.y+a.spec.height*.45)-origin.y,d=Math.hypot(dx,dz,dy);
  const dot=(dx*forward.x+dz*forward.z+dy*forward.y)/Math.max(d,.01);
  if(d<950&&d>17&&dot>.89&&d<score){best=a;score=d;}
 }
 return best;
}
export function launchAirportMissile(g){
 const state=g?.state,car=state?.car;
 if(!state?.started||state.paused||state.mode!=='car'||!car||!missileJet(car.style)||car.health<=0)return false;
 g.airportMissiles??=[];
 if(state.elapsed<(car.nextAirportMissile||0)||g.airportMissiles.length>=6)return false;
 const wing=(car.airportMissileSide||1)*Math.min(3.5,car.spec.width*.24),sin=Math.sin(car.yaw),cos=Math.cos(car.yaw),
  p={x:car.x+sin*(car.spec.length*.46)+cos*wing,y:car.y+Math.max(1,car.spec.height*.37),z:car.z+cos*(car.spec.length*.46)-sin*wing},
  direction=new THREE.Vector3(sin,.025,cos).normalize(),mesh=missileMesh();
 const target=targets(g,p,direction);mesh.position.set(p.x,p.y,p.z);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);
 g.scene.add(mesh);g.airportMissiles.push({mesh,p,dir:direction,speed:125,life:0,owner:car,target});
 car.airportMissileSide=-(car.airportMissileSide||1);car.nextAirportMissile=state.elapsed+1.45;
 g.toast?.('MISSILE · lanciato',1.25);return true;
}
function hitMissile(g,m,from,to){
 let winner=null,t=Infinity;const wall=staticHit(from,to,g.collision);if(wall.object){winner={kind:'wall'};t=wall.t;}
 for(const c of g.cars){
  if(c===m.owner||c.health<=0||!c.mesh.visible)continue;
  const vx=to.x-from.x,vy=to.y-from.y,vz=to.z-from.z,length=vx*vx+vy*vy+vz*vz||1;
  const f=clamp(((c.x-from.x)*vx+(c.y+c.spec.height*.5-from.y)*vy+(c.z-from.z)*vz)/length,0,1);
  const dx=from.x+vx*f-c.x,dz=from.z+vz*f-c.z,dy=from.y+vy*f-c.y-c.spec.height*.5;
  const r=Math.max(1,c.spec.width*.51),h=Math.max(1,c.spec.height*.6);
  if((dx*dx+dz*dz)/(r*r)+dy*dy/(h*h)<=1&&f<t){t=f;winner={kind:'vehicle',car:c};}
 }
 if(to.y<=g.terrain.height(to.x,to.z,to.y)+.3&&1<t){t=1;winner={kind:'ground'};}
 return winner?{...winner,t}:null;
}
export function tickAirportMissiles(g,dt){
 if(!g.airportMissiles?.length||!Number.isFinite(dt)||dt<=0)return;
 for(const m of [...g.airportMissiles]){
  m.life+=Math.min(dt,.12);const from={...m.p};
  if(m.target?.health>0&&m.target.mesh.visible){
   const aim=new THREE.Vector3(m.target.x-m.p.x,m.target.y+m.target.spec.height*.5-m.p.y,m.target.z-m.p.z).normalize();
   m.dir.lerp(aim,Math.min(.045,dt*.58)).normalize();
  }
  m.speed=Math.min(190,m.speed+34*dt);const to={x:from.x+m.dir.x*m.speed*dt,y:from.y+m.dir.y*m.speed*dt,z:from.z+m.dir.z*m.speed*dt};
  const impact=hitMissile(g,m,from,to);
  if(impact){const p={x:from.x+(to.x-from.x)*impact.t,y:from.y+(to.y-from.y)*impact.t,z:from.z+(to.z-from.z)*impact.t};
   g.cannon?.impact(p,g.state.elapsed,2.3);
   if(impact.car){g.hit(impact.car,m.owner,false);if(impact.car.airportAI&&impact.car.health<=0){const a=g.airTraffic?.aircraft.find(a=>a.id===impact.car.airportAI);if(a)destroyAirportAircraft(g.airTraffic,a);}}
  }
  if(impact||m.life>=6||Math.hypot(to.x-g.state.x,to.z-g.state.z)>1500){g.scene.remove(m.mesh);g.airportMissiles.splice(g.airportMissiles.indexOf(m),1);}
  else{m.p=to;m.mesh.position.set(to.x,to.y,to.z);m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),m.dir);}
 }
}

const HELI_ROUTE=[[0,0,0,0],[8,0,0,55],[33,830,990,145],[67,1700,1150,175],[105,900,-1050,160],[132,110,-700,95],[163,0,0,48],[176,0,0,0],[191,0,0,0]];
function heliMarker(t,index){
 const phase=((t+index*87)%191+191)%191,i=Math.max(0,HELI_ROUTE.findIndex((p,j)=>j<HELI_ROUTE.length-1&&phase>=p[0]&&phase<=HELI_ROUTE[j+1][0]));
 const a=HELI_ROUTE[i],b=HELI_ROUTE[Math.min(i+1,HELI_ROUTE.length-1)],f=clamp((phase-a[0])/Math.max(.001,b[0]-a[0]),0,1),sgn=index?-1:1;
 if(a[3]+(b[3]-a[3])*f<5)return null;
 const p=areaPoint(AIRPORT,(index?110:105)+(a[1]+(b[1]-a[1])*f)*sgn,(index?-365:385)+(a[2]+(b[2]-a[2])*f)*sgn);
 return {...p,kind:'H',label:index?'Elicottero militare':'Elicottero civile'};
}
export function flyingAirportMarkers(g){
 const s=g?.state;if(!s?.car?.spec.aircraft||s.mode!=='car')return [];
 const points=[];
 for(const a of g.airTraffic?.aircraft||[]){
  if(a.phase==='wrecked'||a.phase==='claimed'||a.yAbove<5)continue;
  const p=areaPoint(AIRPORT,a.u,a.v);points.push({...p,kind:a.type==='cargo'?'C':a.type==='jet'?'J':'A',label:a.id});
 }
 for(let i=0;i<2;i++){const p=heliMarker(g.airTraffic?.time||s.elapsed,i);if(p)points.push(p);}
 for(const c of [...g.cars,...g.policeAir]){
  if(c===s.car||c.airportAI||!c.spec?.aircraft||c.health<=0||!c.mesh.visible)continue;
  if(c.y-g.terrain.height(c.x,c.z,c.y)<5)continue;
  if(!points.some(p=>Math.hypot(p.x-c.x,p.z-c.z)<15))points.push({x:c.x,z:c.z,kind:c.spec.plane?'A':'H',label:c.name});
 }
 return points;
}
const MAP={x:-6050,z:-6550,w:13400,h:12900};
function drawFlightMap(g){
 const dialog=document.getElementById('mapDialog'),canvas=document.getElementById('fullmap');
 if(!dialog?.open||!canvas||!g?.state?.car?.spec.aircraft)return;
 const c=canvas.getContext('2d'),points=flyingAirportMarkers(g);
 c.save();c.fillStyle='rgba(10,31,42,.89)';c.fillRect(9,9,236,26);c.font='bold 13px system-ui';c.fillStyle='#d7f4f4';c.fillText('TRAFFICO AEREO · '+points.length+' IN VOLO',17,27);
 for(const p of points){const x=(p.x-MAP.x)/MAP.w*canvas.width,y=(p.z-MAP.z)/MAP.h*canvas.height;
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<8||x>canvas.width-8||y<42||y>canvas.height-8)continue;
  c.beginPath();c.arc(x,y,6,0,Math.PI*2);c.fillStyle=p.kind==='J'?'#f78777':p.kind==='H'?'#74e5da':'#ffd36c';c.fill();
  c.lineWidth=1.5;c.strokeStyle='#132b38';c.stroke();c.fillStyle='#132b38';c.font='bold 8px sans-serif';c.textAlign='center';c.fillText(p.kind,x,y+2.8);
 }
 c.restore();
}
let currentGame=null;
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__airportFlightExtras){
 ModernGameplay.prototype.__airportFlightExtras=true;
 ModernGameplay.prototype.populate=function(...args){const result=oldPopulate.apply(this,args);currentGame=this;this.airportMissiles=[];return result;};
 ModernGameplay.prototype.update=function(dt){oldUpdate.call(this,dt);parkCivil(this);tickAirportMissiles(this,dt);};
}
if(typeof document!=='undefined'&&typeof document.addEventListener==='function'){
 document.addEventListener('keydown',event=>{
  if(event.code!=='Tab'||event.repeat||document.querySelector('dialog[open]')||!currentGame?.state?.started)return;
  if(missileJet(currentGame.state.car?.style)){event.preventDefault();launchAirportMissile(currentGame);}
 },true);
 const dialog=document.getElementById('mapDialog');
 if(dialog){new MutationObserver(()=>{if(dialog.open)drawFlightMap(currentGame);}).observe(dialog,{attributes:true,attributeFilter:['open']});
  dialog.addEventListener('click',()=>queueMicrotask(()=>drawFlightMap(currentGame)),true);
 }
}
