// Player-flight quality pass. Runs after airport-combat-flight; does not modify road physics.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {CameraRig} from './camera-rig.js';
import {vehicleBlocked} from './movement.js';
import {missileJet} from './airport-flight-extras.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const liveCar=s=>s?.started&&s.mode==='car'&&s.car?.spec.aircraft?s.car:null;
let game=null,visualPitch=0;
const pressed=new Set();
export function hostileFlightAllowed(g){
 const s=g?.state,c=liveCar(s);
 if(!c)return false;
 // A zero-star civilian flight is never a legitimate missile target.
 // A military aircraft earns a response at three stars; extreme wanted levels
 // also permit a civilian intercept, but only while the police alert persists.
 return s.wanted>=3&&(missileJet(c.style)||s.wanted>=5);
}
export function assistedFlightTarget(g,origin,forward){
 let best=null,score=Infinity;
 for(const c of g?.cars||[]){
  if(c===g.state.car||c.health<=0||!c.mesh?.visible||!c.spec)continue;
  const dx=c.x-origin.x,dy=c.y+c.spec.height*.48-origin.y,dz=c.z-origin.z,d=Math.hypot(dx,dy,dz);
  if(d<20||d>1100)continue;
  const alignment=(dx*forward.x+dy*forward.y+dz*forward.z)/d;
  if(alignment<.87)continue; // generous cone, never lock through the rear hemisphere
  const angle=Math.acos(clamp(alignment,-1,1)),value=angle*560+d*.14-(c.airDefender?90:0);
  if(value<score){best=c;score=value;}
 }
 return best;
}
export function aircraftGroundReverse(g,dt,held){
 const s=g?.state,c=liveCar(s);
 if(!c?.spec.plane||!Number.isFinite(dt)||dt<=0)return false;
 const ground=g.terrain.height(s.x,s.z,s.y);
 if(!held||s.y>ground+.24||s.speed>2){c.groundReverse=0;return false;}
 c.groundReverse=clamp((c.groundReverse||0)+Math.min(dt,.1)*4.8,0,Math.min(5,c.spec.reverse||4));
 const step=c.groundReverse*Math.min(dt,.08),x=clamp(s.x-Math.sin(s.yaw)*step,-5940,7210),z=clamp(s.z-Math.cos(s.yaw)*step,-6440,6190);
 if(vehicleBlocked(x,z,s.yaw,g.collision,c.spec,s.y)||!g.terrain.dry(x,z,c.spec.width*.36,s.y)){
  c.groundReverse=0;s.speed=c.speed=0;return false;
 }
 s.x=c.x=x;s.z=c.z=z;s.y=c.y=g.terrain.height(x,z,s.y);s.speed=c.speed=-c.groundReverse;
 g.pose(c);return true;
}
function clearHostiles(g){
 for(const m of [...g.incomingMissiles||[]]){g.scene.remove(m.mesh);g.incomingMissiles.splice(g.incomingMissiles.indexOf(m),1);}
 for(const c of [...g.airDefenders||[]]){g.retire(c);g.airDefenders.splice(g.airDefenders.indexOf(c),1);}
 const warning=document.getElementById('flightWarning');if(warning)warning.hidden=true;
 g.airStrikes=0;
}
function smoke(c){
 if(c.flightSmoke)return;
 const plume=new THREE.Group(),geo=new THREE.SphereGeometry(.9,7,6);
 for(let i=0;i<4;i++){
  const puff=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:i%2?'#373b40':'#868b8e',transparent:true,opacity:.52,depthWrite:false}));
  puff.position.set((i%2?-.35:.4),c.spec.height*.52+i*.6,-c.spec.length*.29-i*1.9);puff.scale.setScalar(.6+i*.4);plume.add(puff);
 }
 c.mesh.add(plume);c.flightSmoke=plume;
}
function destroyDefender(g,c){
 c.health=0;c.speed=0;c.mesh.visible=false;
 g.cannon?.impact({x:c.x,y:c.y+c.spec.height*.5,z:c.z},g.state.elapsed,5);
 g.confirmedAirKills=(g.confirmedAirKills||0)+1;
 g.retire(c);const i=g.airDefenders?.indexOf(c)??-1;if(i>=0)g.airDefenders.splice(i,1);
 g.toast?.('ABBATTIMENTO CONFERMATO · +1 · TOTALE '+g.confirmedAirKills,3);
}
const originalHit=ModernGameplay.prototype.hit;
if(!ModernGameplay.prototype.__flightTwoHitJets){
 ModernGameplay.prototype.__flightTwoHitJets=true;
 ModernGameplay.prototype.hit=function(target,owner,enemy){
  if(target?.airDefender&&owner===this.state.car&&!enemy){
   if(target.health<=0)return;
   target.flightMissileHits=(target.flightMissileHits||0)+1;
   if(target.flightMissileHits>=2){destroyDefender(this,target);return;}
   target.health=48;smoke(target);this.raiseWanted?.(Math.max(3,this.state.wanted));
   this.toast?.('JET NEMICO COLPITO · FUMO · ANCORA UN MISSILE',2);return;
  }
  return originalHit.call(this,target,owner,enemy);
 };
}
function gunShot(g){
 const s=g.state,c=liveCar(s);if(!c||!missileJet(c.style)||s.health<=0||s.paused||s.elapsed<(c.nextFlightGun||0))return;
 c.nextFlightGun=s.elapsed+.13;
 const pitch=s.flightPitch||0,forward=new THREE.Vector3(Math.sin(s.yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(s.yaw)*Math.cos(pitch)).normalize();
 const start=new THREE.Vector3(s.x+forward.x*c.spec.length*.4,s.y+c.spec.height*.52,s.z+forward.z*c.spec.length*.4);
 const target=assistedFlightTarget(g,start,forward),end=target?new THREE.Vector3(target.x,target.y+target.spec.height*.48,target.z):start.clone().addScaledVector(forward,420);
 const material=new THREE.LineBasicMaterial({color:'#ffce87',transparent:true,opacity:.85}),geometry=new THREE.BufferGeometry().setFromPoints([start,end]),tracer=new THREE.Line(geometry,material);
 g.scene.add(tracer);(g.flightGunTracers??=[]).push({mesh:tracer,die:s.elapsed+.14});
 if(target&&start.distanceTo(end)<480){
  if(target.airDefender){target.health=Math.max(0,target.health-7);if(target.health<=65)smoke(target);if(target.health<=0)destroyDefender(g,target);}
  else{target.health=Math.max(0,target.health-7);if(target.health<=0){target.mesh.visible=false;target.speed=0;target.parked=true;target.destroyedUntil=s.elapsed+18;}}
  g.raiseWanted?.(Math.max(1,s.wanted));
 }
}
function makeCockpit(){
 if(typeof document==='undefined'||document.getElementById('flightCockpit'))return;
 const style=document.createElement('style');style.textContent=`
 #flightCockpit[hidden],#flightThreatBearing[hidden]{display:none!important}
 #flightCockpit{position:fixed;inset:64px 18px 26px;z-index:55;pointer-events:none;color:#cafce9;font:600 12px/1.4 ui-monospace,monospace;text-shadow:0 1px 3px #000;contain:layout style}
 #flightCockpit:before{content:"";position:absolute;inset:0;border:2px solid #75f8d555;border-bottom:0;clip-path:polygon(0 0,21% 0,21% 2px,79% 2px,79% 0,100% 0,100% 100%,94% 100%,94% 99%,6% 99%,6% 100%,0 100%);box-shadow:inset 0 0 30px #65cbb21f;opacity:.7}
 #flightCockpit .fc-top{position:absolute;top:0;left:50%;transform:translateX(-50%);padding:7px 18px;background:#061b23d9;border:1px solid #5acaaa88;border-radius:0 0 9px 9px;text-align:center;min-width:250px}
 #flightCockpit .fc-title{font-size:10px;letter-spacing:.12em;color:#8fc5be}
 #flightCockpit .fc-data{display:flex;gap:22px;justify-content:center;font-size:21px;font-variant-numeric:tabular-nums}
 #flightCockpit .fc-data small{font-size:9px;color:#a1c8c0}
 #flightCockpit .fc-systems{position:absolute;left:8px;top:31%;padding:9px 12px;background:#061b23c9;border-left:2px solid #53caaa;max-width:185px}
 #flightCockpit .fc-systems strong{display:block;margin-bottom:5px;color:#e3fff4;letter-spacing:.08em}
 #flightCockpit .fc-systems div{font-size:10px;margin:4px 0;white-space:nowrap}
 #flightCockpit .fc-systems [data-condition="warning"]{color:#ffb16d}
 #flightCockpit .fc-systems [data-condition="critical"]{color:#ff6262}
 #flightCockpit .fc-bottom{position:absolute;bottom:0;left:50%;transform:translateX(-50%);background:#061b23d9;padding:6px 13px;border:1px solid #5acaaa77;border-radius:6px;white-space:nowrap;font-size:10px;max-width:90vw;text-align:center}
 #flightCockpit .fc-bottom b{color:#fff1c2}
 #flightThreatBearing{position:fixed;top:43%;z-index:63;background:#201116cf;border:1px solid #ff6969b0;padding:7px 10px;border-radius:5px;color:#ffe2cf;font:700 13px ui-monospace,monospace;pointer-events:none;max-width:165px;text-align:center}
 body[data-flight-active="true"] #flightPanel{display:none!important}
 @media(max-width:760px){#flightCockpit{inset:75px 6px 110px;font-size:10px}#flightCockpit .fc-top{min-width:175px;padding:4px}#flightCockpit .fc-data{font-size:15px;gap:9px}#flightCockpit .fc-systems{top:25%;left:0;padding:5px;max-width:110px}#flightCockpit .fc-systems div{font-size:8px;white-space:normal}#flightCockpit .fc-bottom{font-size:8px;white-space:normal;width:72vw}#flightThreatBearing{font-size:9px;max-width:100px}}
 `;document.head.appendChild(style);
 const root=document.createElement('div');root.id='flightCockpit';root.hidden=true;
 root.innerHTML='<div class="fc-top"><div class="fc-title" id="fcVehicle">CABINA DI PILOTAGGIO</div><div class="fc-data"><span><span id="fcSpeed">000</span><small> KM/H</small></span><span><span id="fcAlt">0</span><small> M</small></span><span><span id="fcLife">100</span><small> %</small></span></div></div><div class="fc-systems"><strong>DIAGNOSTICA AEROMOBILE</strong><div id="fcEngine">MOTORE · OK</div><div id="fcWing">ALI / ROTORI · OK</div><div id="fcRadar">RADAR · OK</div><div id="fcKill">ABBATTIMENTI · 0</div></div><div class="fc-bottom" id="fcControls">W/S VELOCITÀ · A/D CURVA · SPACE SU · CTRL GIÙ · SHIFT TURBO · TAB MISSILE · Q MITRA · X CONTROMISURE</div>';
 document.body.appendChild(root);
 const bearing=document.createElement('div');bearing.id='flightThreatBearing';bearing.hidden=true;document.body.appendChild(bearing);
}
const write=(id,text)=>{const node=document.getElementById(id);if(node&&node.textContent!==text)node.textContent=text;};
function updateHud(g){
 const s=g.state,c=liveCar(s),root=document.getElementById('flightCockpit'),pointer=document.getElementById('flightThreatBearing');if(!root)return;
 const active=!!c&&!s.paused;document.body.dataset.flightActive=active?'true':'false';root.hidden=!active;
 if(!active){if(pointer)pointer.hidden=true;return;}
 if(s.elapsed<(g.nextCockpitDraw||0))return;g.nextCockpitDraw=s.elapsed+.12;
 const health=clamp(Math.ceil(s.health),0,100),alt=Math.max(0,Math.round(s.y-g.terrain.height(s.x,s.z,s.y)));
 write('fcVehicle',c.name||'CABINA DI PILOTAGGIO');write('fcSpeed',String(Math.round(Math.abs(s.speed)*3.6)));write('fcAlt',String(alt));write('fcLife',String(health));
 const components=c.flightComponents||{engine:100,wing:100,radar:100};
 for(const [id,label,value] of [['fcEngine','MOTORE',components.engine],['fcWing',c.spec.plane?'ALI':'ROTORI',components.wing],['fcRadar','RADAR',components.radar]]){
  const node=document.getElementById(id),condition=value<=35?'critical':value<75?'warning':'ok';write(id,label+' · '+(value<=35?'CRITICO':value<75?'DANNEGGIATO':'OK'));if(node)node.dataset.condition=condition;
 }
 write('fcKill','ABBATTIMENTI · '+(g.confirmedAirKills||0));
 write('fcControls',c.spec.plane?'W/S VELOCITÀ/RETRO · A/D CURVA · SPACE SU · CTRL GIÙ · SHIFT TURBO'+(missileJet(c.style)?' · TAB MISSILE · Q MITRA · X ESCA':''):'W/S AVANTI/RETRO · A/D RUOTA · SPACE SU · CTRL GIÙ · SHIFT TURBO');
 const target=(g.airDefenders||[]).filter(a=>a.health>0&&a.mesh.visible).sort((a,b)=>Math.hypot(a.x-s.x,a.z-s.z)-Math.hypot(b.x-s.x,b.z-s.z))[0];
 if(!pointer)return;pointer.hidden=!target;if(!target)return;
 const angle=Math.atan2(Math.sin(Math.atan2(target.x-s.x,target.z-s.z)-s.yaw),Math.cos(Math.atan2(target.x-s.x,target.z-s.z)-s.yaw));
 pointer.style.left=angle>0?'auto':'8px';pointer.style.right=angle>0?'8px':'auto';pointer.textContent=(angle>0?'▶':'◀')+' JET OSTILE · '+Math.round(Math.hypot(target.x-s.x,target.z-s.z))+' M';
}
function updateComponents(g,c){
 c.flightComponents??={engine:100,wing:100,radar:100};
 const now=g.state.health,previous=c.previousCockpitHealth??now;
 if(now<previous-1){const key=['wing','engine','radar'][(c.flightDamageEvents||0)%3];c.flightDamageEvents=(c.flightDamageEvents||0)+1;c.flightComponents[key]=Math.max(0,c.flightComponents[key]-(previous-now)*1.2);}
 c.previousCockpitHealth=now;
}
// The legacy flight extension already tilts CameraRig and lookAt independently;
// smooth once and use one consistent orientation when turbo changes speed rapidly.
const oldRigUpdate=CameraRig.prototype.update;
if(!CameraRig.prototype.__smoothCockpitView){
 CameraRig.prototype.__smoothCockpitView=true;
 CameraRig.prototype.update=function(dt,options){const yaw=oldRigUpdate.call(this,dt,options),s=game?.state;
  if(liveCar(s)?.spec.plane&&!this.dragging){const alpha=1-Math.exp(-clamp(dt,0,.06)*3.8);visualPitch+=(clamp(s.flightPitch||0,-.88,.63)-visualPitch)*alpha;const desired=clamp(.39-visualPitch*.55,.15,1.15);this.pitch+=(desired-this.pitch)*alpha;}
  else visualPitch=0;
  return yaw;
 };
}
const originalLookAt=THREE.Object3D.prototype.lookAt;
if(!THREE.PerspectiveCamera.prototype.__smoothCockpitAim){
 THREE.PerspectiveCamera.prototype.__smoothCockpitAim=true;
 THREE.PerspectiveCamera.prototype.lookAt=function(x,y,z){const s=game?.state;
  if(typeof x==='number'&&typeof y==='number'&&typeof z==='number'&&liveCar(s)?.spec.plane&&missileJet(s.car.style)&&Math.hypot(x-s.x,z-s.z)<2&&Math.abs(y-s.y)<18&&s.camera!==2){
   return originalLookAt.call(this,x+Math.sin(s.yaw)*23,y+Math.sin(visualPitch)*23,z+Math.cos(s.yaw)*23);
  }
  return originalLookAt.apply(this,arguments);
 };
}
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__cockpitTuning){
 ModernGameplay.prototype.__cockpitTuning=true;
 ModernGameplay.prototype.populate=function(...args){const result=oldPopulate.apply(this,args);game=this;this.confirmedAirKills=0;makeCockpit();return result;};
 ModernGameplay.prototype.update=function(dt){
  const s=this.state,c=liveCar(s);
  // Remove threats BEFORE legacy missile collision is processed. Clearing the
  // wanted stars or transferring to an innocent civilian cannot leave attacks.
  if(s.started&&!hostileFlightAllowed(this)&&(this.airDefenders?.length||this.incomingMissiles?.length||this.airStrikes))clearHostiles(this);
  if(c){if(!c.originalFlightBrake)c.originalFlightBrake=c.spec.brake||10;
   const quicker=c.spec.plane?Math.max(30,c.originalFlightBrake*2.6):Math.max(24,c.originalFlightBrake*2.5);
   if(c.spec.brake<quicker)c.spec={...c.spec,brake:quicker};
  }
  // Incoming missiles track more reliably, but are still limited in turn rate
  // and can be dodged or distracted with X.
  if(hostileFlightAllowed(this))for(const m of this.incomingMissiles||[]){const to=new THREE.Vector3(s.x-m.p.x,s.y-m.p.y,s.z-m.p.z);if(to.lengthSq()>1)m.dir.lerp(to.normalize(),Math.min(.11,Math.max(0,dt)*1.15)).normalize();}
  oldUpdate.call(this,dt);
  const aircraft=liveCar(s);
  if(aircraft){aircraftGroundReverse(this,dt,pressed.has('KeyS')||pressed.has('ArrowDown'));updateComponents(this,aircraft);}
  for(const m of this.airportMissiles||[]){if(m.owner!==aircraft||m.life>.25||m.target?.health>0)continue;
   const pitch=s.flightPitch||0,forward=new THREE.Vector3(Math.sin(s.yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(s.yaw)*Math.cos(pitch)).normalize();
   const candidate=assistedFlightTarget(this,m.p,forward);if(candidate)m.target=candidate;
  }
  // Existing implementation performs missile steering; this only increases
  // its acquisition agility, not the projectile's damage or hit radius.
  for(const m of this.airportMissiles||[])if(m.owner===aircraft&&m.target?.health>0){
   const to=new THREE.Vector3(m.target.x-m.p.x,m.target.y+m.target.spec.height*.48-m.p.y,m.target.z-m.p.z);
   if(to.lengthSq()>1)m.dir.lerp(to.normalize(),Math.min(.12,Math.max(0,dt)*2)).normalize();
  }
  if(aircraft&&missileJet(aircraft.style)&&pressed.has('KeyQ'))gunShot(this);
  for(const t of [...this.flightGunTracers||[]])if(s.elapsed>=t.die){this.scene.remove(t.mesh);t.mesh.geometry.dispose();t.mesh.material.dispose();this.flightGunTracers.splice(this.flightGunTracers.indexOf(t),1);}
  // Legacy interception logic must not continue firing after wanted is cleared.
  if(!hostileFlightAllowed(this)&&(this.airDefenders?.length||this.incomingMissiles?.length))clearHostiles(this);
  updateHud(this);
 };
}
if(typeof window!=='undefined'){
 window.addEventListener('keydown',event=>{if(['KeyS','ArrowDown','KeyQ'].includes(event.code))pressed.add(event.code);if(event.code==='KeyQ'&&liveCar(game?.state)&&missileJet(game.state.car.style)){event.preventDefault();}},true);
 window.addEventListener('keyup',event=>pressed.delete(event.code),true);
 window.addEventListener('blur',()=>pressed.clear());
}
