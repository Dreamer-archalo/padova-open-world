// Airport flight extension; no global road, terrain or city-traffic changes.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {CameraRig} from './camera-rig.js';
import {SPECIAL_VEHICLES,createSpecialVehicle} from './special-vehicles.js';
import {VEHICLES} from './vehicles.js';
import {AIRPORT,areaPoint} from './gameplay-areas.js';
import {vehicleBlocked} from './movement.js';
import {staticHit} from './combat.js';
import {installVehicleDamage} from './vehicle-damage.js';
import {flyingAirportMarkers,missileJet} from './airport-flight-extras.js';
import {destroyAirportAircraft} from './airport-air-traffic.js';

const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export const BLACKBIRD='airport-blackbird';
export const BLACKBIRD_LIMIT=600/3.6;
export const BLACKBIRD_EFFECT=560/3.6;
const blackbirdSpec={...VEHICLES['airport-interceptor'],name:'Merlo Nero · ricognitore ispirato al Blackbird',width:18,length:31,height:5.8,wheelbase:13,max:BLACKBIRD_LIMIT,boost:BLACKBIRD_LIMIT,accel:24,brake:13,steer:.48,plane:true,aircraft:true};
VEHICLES[BLACKBIRD]=blackbirdSpec;SPECIAL_VEHICLES[BLACKBIRD]=blackbirdSpec;
const held=new Set();let touchDive=false,touchBoost=false,game=null;
const active=()=>!!game?.state?.started&&!game.state.paused&&game.state.mode==='car'&&game.state.car?.spec?.aircraft;
const isJet=car=>!!car&&(missileJet(car.style)||car.style===BLACKBIRD);
const box=new THREE.BoxGeometry(1,1,1);
const mats=new Map();
function block(group,x,y,z,w,h,l,color){if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,metalness:.2,roughness:.7}));const m=new THREE.Mesh(box,mats.get(color));m.position.set(x,y,z);m.scale.set(w,h,l);m.castShadow=m.receiveShadow=true;group.add(m);return m;}
function blackbirdModel(){
 const g=new THREE.Group();g.name='Merlo Nero · ricognitore';
 block(g,0,2.3,0,2,1.55,25,'#202732');block(g,0,2.7,13,1.35,.85,5,'#222a35');
 block(g,0,3.12,7.7,1.3,.55,4.6,'#3c5367');
 for(const side of [-1,1]){
  block(g,side*3.8,2.0,-2.8,6.8,.25,12.5,'#242d39');
  block(g,side*5.3,2.0,-7.6,4.6,.17,8.5,'#242d39');
  block(g,side*2.7,2.6,-5.8,2.35,2.2,14,'#202934');
  block(g,side*2.7,3.75,-11.6,.22,3.4,3.6,'#3e5260');
  block(g,side*2.7,1.9,-13,1.55,1.1,1.5,'#7e4232');
  block(g,side*2.5,.57,3,.35,1.1,.65,'#343941');
 }
 block(g,0,2.5,-13.1,4,.45,5,'#1d252f');
 const trails=[];for(const side of [-1,1]){const trail=new THREE.Mesh(new THREE.ConeGeometry(.55,8,8),new THREE.MeshBasicMaterial({color:'#8bc8ef',transparent:true,opacity:.33,depthWrite:false}));trail.rotation.x=Math.PI/2;trail.position.set(side*2.7,2.1,-19);trail.visible=false;g.add(trail);trails.push(trail);}g.userData.flightTrails=trails;return g;
}
function shockwave(g,car){const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.095,7,40),new THREE.MeshBasicMaterial({color:'#ccf3ff',transparent:true,opacity:.8,depthWrite:false}));ring.position.set(car.x,car.y+2,car.z);ring.rotation.y=car.yaw;g.scene.add(ring);(g.flightShockwaves??=[]).push({mesh:ring,age:0});g.toast?.('MERLO NERO · ONDA VISIVA 560 KM/H',2);}
function spawnBlackbird(g){const s=g.state,ops=g.interactiveAirport;if(!ops||g.flightBlackbird||s.elapsed<(g.flightBlackbirdRetry||0)||Math.hypot(s.x-AIRPORT.x,s.z-AIRPORT.z)>1050)return;
 g.flightBlackbirdRetry=s.elapsed+5;
 for(const [u,v] of [[121,-439],[149,-442],[109,-416],[173,-430],[110,-395]]){
  const p=areaPoint(AIRPORT,u,v),y=g.terrain.height(p.x,p.z),yaw=AIRPORT.yaw-Math.PI/2;
  if(!g.terrain.dry(p.x,p.z,9,y)||vehicleBlocked(p.x,p.z,yaw,g.collision,blackbirdSpec,y)||g.cars.some(c=>c.mesh.visible&&Math.hypot(c.x-p.x,c.z-p.z)<(c.spec.length+blackbirdSpec.length)/2+4))continue;
  const car=g.addCar(p.x,p.z,yaw,false,true,BLACKBIRD),old=car.mesh,mesh=blackbirdModel();
  g.scene.remove(old);g.scene.add(mesh);Object.assign(car,{mesh,x:p.x,y,z:p.z,yaw,speed:0,health:100,parked:true,airportClaimed:true,missionUnit:true,damageVisual:null});
  installVehicleDamage(car);g.pose(car);ops.extras.push(car);g.flightBlackbird=car;return;
 }
}
// Pure control calculation, also used by a deterministic regression test.
export function aircraftControlStep(s,dt,{climb=false,dive=false,boost=false,left=false,right=false}={},ground=-Infinity){
 const car=s.car;if(!car?.spec?.plane||dt<=0)return null;
 if(!Number.isFinite(car.airCruise)){car.airCruise=car.style===BLACKBIRD?130:car.spec.max;car.airBoost=car.style===BLACKBIRD?BLACKBIRD_LIMIT:Math.min(car.spec.max*1.35,BLACKBIRD_LIMIT);car.spec={...car.spec,max:car.airBoost,boost:car.airBoost};}
 const former=s.flightPitch||0,command=(climb?1:0)-(dive?1:0);
 const pitch=clamp(command?former+command*dt*.9:former*Math.exp(-dt*.16),-.88,.63);
 s.flightPitch=car.flightPitch=pitch;
 const climbRate=clamp(Math.sin(pitch)*Math.max(22,s.speed*.53),-55,48),priorVy=s.vy||0;
 const requested=s.y+(climbRate-priorVy)*dt;
 if(requested<=ground+.05&&s.y>ground+1.5&&climbRate< -12)return {crashed:true,pitch,climbRate};
 s.y=Math.max(ground,requested);s.vy=s.y<=ground+.03?0:climbRate;
 if(boost){s.speed=Math.min(car.airBoost,s.speed+car.spec.accel*1.5*dt);}
 else if(s.speed>car.airCruise)s.speed=Math.max(car.airCruise,s.speed-car.spec.brake*1.5*dt);
 if(boost&&(left||right))s.yaw+=((left?1:0)-(right?1:0))*car.spec.steer*.55*dt;
 car.x=s.x;car.y=s.y;car.z=s.z;car.yaw=s.yaw;car.speed=s.speed;
 return {crashed:false,pitch,climbRate};
}
export function abandonedFlightStep(c,dt,terrain,collision){
 const fall=c.flightAbandoned;if(!fall||fall.done||dt<=0)return null;
 const step=Math.min(dt,.12),ground=terrain.height(c.x,c.z,c.y),high=fall.startAltitude>32;
 fall.vy=high?Math.max(-65,fall.vy-21*step):Math.max(-4.5,fall.vy-8*step);
 const vx=Math.sin(c.yaw)*fall.speed*step,vz=Math.cos(c.yaw)*fall.speed*step;
 const nx=clamp(c.x+vx,-5940,7210),nz=clamp(c.z+vz,-6440,6190),nextGround=terrain.height(nx,nz,c.y),nextY=c.y+fall.vy*step;
 const blocked=vehicleBlocked(nx,nz,c.yaw,collision,c.spec,Math.min(c.y,nextY));
 if(!blocked){c.x=nx;c.z=nz;}else if(high){fall.done=true;return {crashed:true};}
 fall.speed=Math.max(0,fall.speed*(1-step*(high?.4:2.3)));
 c.yaw+=Math.sin(fall.age*1.8)*step*(high?.12:.025);fall.age+=step;
 if(nextY<=Math.max(ground,nextGround)+.08){c.y=Math.max(ground,nextGround);c.speed=0;c.parked=true;fall.done=true;
  return {crashed:high||fall.vy< -13||!terrain.dry(c.x,c.z,c.spec.width*.45,c.y)};
 }
 c.y=nextY;c.speed=fall.speed;c.parked=false;return {crashed:false,landed:false};
}
function handleAbandoned(g,dt){const s=g.state;
 if(g.flightLastPilot&&s.parachuting&&!s.car&&!g.flightLastPilot.flightAbandoned){
  const c=g.flightLastPilot,alt=c.y-g.terrain.height(c.x,c.z,c.y);
  c.flightAbandoned={startAltitude:alt,vy:0,speed:Math.min(75,g.flightLastSpeed||0)*.48,age:0,done:false};c.mesh.visible=true;c.parked=false;c.abandonedAt=s.elapsed;
  g.abandonedAircraft??=[];g.abandonedAircraft.push(c);g.toast?.('Velivolo abbandonato · perdita di controllo',2);
 }
 g.flightLastPilot=null;
 for(const c of [...g.abandonedAircraft||[]]){
  if(!c.flightAbandoned||c.flightAbandoned.done){g.abandonedAircraft.splice(g.abandonedAircraft.indexOf(c),1);continue;}
  c.mesh.visible=true;
  const outcome=abandonedFlightStep(c,dt,g.terrain,g.collision);g.pose(c);c.mesh.rotation.x=-.12-Math.min(.95,c.flightAbandoned.age*.18);
  if(outcome?.crashed){c.health=0;c.speed=0;c.mesh.visible=false;c.destroyedUntil=s.elapsed+25;g.cannon?.impact({x:c.x,y:c.y,z:c.z},s.elapsed,5);
   if(c.airportAI){const a=g.airTraffic?.aircraft.find(a=>a.id===c.airportAI);if(a)destroyAirportAircraft(g.airTraffic,a);}
   g.toast?.('Velivolo precipitato · esplosione',2);
  }else if(c.flightAbandoned.done){c.parked=true;g.toast?.('Velivolo atterrato senza pilota',2);}
  if(c.flightAbandoned.done)g.abandonedAircraft.splice(g.abandonedAircraft.indexOf(c),1);
 }
}
function interceptorModel(g){const source=g.interactiveAirport?.extras.find(c=>c.style==='airport-interceptor')?.mesh;if(source)return source.clone(true);const m=new THREE.Group();block(m,0,1.8,0,1.8,1.5,14,'#8e6660');block(m,0,2,.1,13,.2,3.5,'#995a54');block(m,0,3,-5,.23,2.5,2,'#b45a51');return m;}
function spawnInterceptor(g,index){const s=g.state,side=index%2?-1:1,px=s.x-Math.sin(s.yaw)*240+Math.cos(s.yaw)*side*170,pz=s.z-Math.cos(s.yaw)*240-Math.sin(s.yaw)*side*170;
 const x=clamp(px,-5850,7120),z=clamp(pz,-6350,6100),y=Math.max(s.y+35,g.terrain.elevation(x,z)+75),yaw=Math.atan2(s.x-x,s.z-z);
 const c=g.addCar(x,z,yaw,false,false,'airport-interceptor'),old=c.mesh;g.scene.remove(old);c.mesh=interceptorModel(g);g.scene.add(c.mesh);c.y=y;c.speed=65;c.parked=false;c.health=100;c.missionUnit=true;c.hostile=true;c.airDefender=true;c.name='JET INTERCETTORE · OSTILE';c.fireAt=s.elapsed+3+index;installVehicleDamage(c);g.pose(c);
 g.airDefenders.push(c);
}
function hostileMissileModel(){const m=new THREE.Mesh(new THREE.ConeGeometry(.22,2.4,8),new THREE.MeshBasicMaterial({color:'#ff6548'}));m.rotation.x=Math.PI/2;return m;}
function fireInterceptor(g,c){const s=g.state,mesh=hostileMissileModel(),p=new THREE.Vector3(c.x,c.y+2,c.z),dir=new THREE.Vector3(s.x-c.x,s.y-c.y,s.z-c.z).normalize();mesh.position.copy(p);g.scene.add(mesh);
 (g.incomingMissiles??=[]).push({mesh,p,dir,speed:110,age:0,owner:c});c.fireAt=s.elapsed+6.5;g.toast?.('ALLARME · MISSILE IN ARRIVO! VIRA E USA SHIFT',3);
}
function advanceThreats(g,dt){const s=g.state,c=s.car,airborne=!!c?.spec.aircraft&&s.y-g.terrain.height(s.x,s.z,s.y)>15;
 g.airDefenders??=[];g.incomingMissiles??=[];
 if(g.airStrikes>=4&&s.mode==='car'&&airborne&&s.elapsed>=(g.nextAirDefense||0)){
  const wantedCount=g.airStrikes>=8?2:1;while(g.airDefenders.length<wantedCount)spawnInterceptor(g,g.airDefenders.length);
  g.nextAirDefense=s.elapsed+20;s.wanted=Math.max(s.wanted,3);
 }
 for(const a of [...g.airDefenders]){
  if(a.health<=0||!a.mesh.visible||Math.hypot(a.x-s.x,a.z-s.z)>2800||!Number.isFinite(a.y)){g.retire(a);g.airDefenders.splice(g.airDefenders.indexOf(a),1);continue;}
  const dx=s.x-a.x,dz=s.z-a.z,distance=Math.hypot(dx,dz),targetYaw=Math.atan2(dx,dz),difference=Math.atan2(Math.sin(targetYaw-a.yaw),Math.cos(targetYaw-a.yaw));
  a.yaw+=clamp(difference,-.75*dt,.75*dt);a.speed+=(distance>170?85:45-a.speed)*Math.min(1,dt*1.2);
  a.speed=clamp(a.speed,40,105);const x=a.x+Math.sin(a.yaw)*a.speed*dt,z=a.z+Math.cos(a.yaw)*a.speed*dt;
  a.x=clamp(x,-5880,7180);a.z=clamp(z,-6380,6150);a.y+=clamp(Math.max(s.y+30,g.terrain.elevation(a.x,a.z)+55)-a.y,-25*dt,25*dt);
  g.pose(a);a.mesh.rotation.x=-.06;
  if(airborne&&distance<600&&distance>35&&Math.abs(difference)<.58&&s.elapsed>=a.fireAt&&g.incomingMissiles.length<4)fireInterceptor(g,a);
 }
 for(const m of [...g.incomingMissiles]){
  const from=m.p.clone(),target=new THREE.Vector3(s.x,s.y+Math.max(1,c?.spec.height*.4||1),s.z),desired=target.sub(from).normalize();
  // Limited homing rate and lifetime: hard turns/afterburner can break pursuit.
  m.dir.lerp(desired,Math.min(.9,dt*.57)).normalize();m.speed=Math.min(165,m.speed+16*dt);const step=m.dir.clone().multiplyScalar(m.speed*dt);m.p.add(step);m.age+=dt;m.mesh.position.copy(m.p);m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),m.dir);
  const hit=airborne&&Math.hypot(m.p.x-s.x,m.p.y-s.y,m.p.z-s.z)<Math.max(5,(c?.spec.width||4)*.33);
  const wall=staticHit({x:from.x,y:from.y,z:from.z},{x:m.p.x,y:m.p.y,z:m.p.z},g.collision).object;
  if(hit){s.health=Math.max(0,s.health-39);if(c)c.health=s.health;g.cannon?.impact({x:s.x,y:s.y,z:s.z},s.elapsed,3);if(s.health<=0)g.defeat?.('Abbattuto da un missile intercettore');else g.toast?.('MISSILE · colpito! '+Math.ceil(s.health)+'% integrità',2);}
  if(hit||wall||m.p.y<=g.terrain.height(m.p.x,m.p.z,m.p.y)||m.age>5.5||Math.hypot(m.p.x-s.x,m.p.z-s.z)>1400){g.scene.remove(m.mesh);g.incomingMissiles.splice(g.incomingMissiles.indexOf(m),1);}
 }
 const warning=document.getElementById('flightWarning');if(warning){const danger=airborne?g.incomingMissiles.reduce((n,m)=>Math.min(n,m.p.distanceTo(new THREE.Vector3(s.x,s.y,s.z))),Infinity):Infinity;warning.hidden=!Number.isFinite(danger);if(Number.isFinite(danger))warning.textContent='⚠ MISSILE IN ARRIVO · '+Math.round(danger)+' M · CURVA + SHIFT';}
}
function flightRadar(g){const dialog=document.getElementById('mapDialog'),canvas=document.getElementById('fullmap');if(!dialog?.open||!canvas||!g?.state?.car?.spec.aircraft)return;
 const ctx=canvas.getContext('2d'),p=flyingAirportMarkers(g);ctx.save();
 for(const entry of p){const x=(entry.x+6050)/13400*canvas.width,y=(entry.z+6550)/12900*canvas.height;if(x<8||x>canvas.width-8||y<42||y>canvas.height-8)continue;
  const peer=g.cars.find(c=>c.name===entry.label&&Math.hypot(c.x-entry.x,c.z-entry.z)<20),kind=entry.kind==='J'||peer&&missileJet(peer.style)?'J':entry.kind;
  ctx.beginPath();ctx.arc(x,y,6.3,0,Math.PI*2);ctx.fillStyle=kind==='J'?'#ff4c50':kind==='H'?'#70dfff':'#45e184';ctx.fill();ctx.strokeStyle='#132b38';ctx.lineWidth=1.5;ctx.stroke();ctx.font='bold 8px sans-serif';ctx.fillStyle='#102c32';ctx.textAlign='center';ctx.fillText(kind,x,y+2.8);
 }
 ctx.fillStyle='rgba(13,31,38,.85)';ctx.fillRect(10,canvas.height-32,300,23);ctx.font='bold 12px system-ui';ctx.textAlign='left';ctx.fillStyle='#70dfff';ctx.fillText('● ELICOTTERI',18,canvas.height-16);ctx.fillStyle='#45e184';ctx.fillText('● AEREI',133,canvas.height-16);ctx.fillStyle='#ff4c50';ctx.fillText('● JET',234,canvas.height-16);ctx.restore();
}
function addHud(){if(typeof document==='undefined'||document.getElementById('flightPanel'))return;
 const panel=document.createElement('div');panel.id='flightPanel';panel.setAttribute('aria-live','off');Object.assign(panel.style,{position:'fixed',left:'50%',bottom:'7%',transform:'translateX(-50%)',zIndex:'60',padding:'8px 12px',borderRadius:'8px',background:'rgba(8,21,31,.77)',color:'#e8f1f0',font:'bold 12px system-ui',pointerEvents:'none',textAlign:'center',whiteSpace:'nowrap'});panel.hidden=true;document.body.appendChild(panel);
 const warning=document.createElement('div');warning.id='flightWarning';warning.setAttribute('role','alert');Object.assign(warning.style,{position:'fixed',left:'50%',top:'17%',transform:'translateX(-50%)',zIndex:'62',padding:'11px 17px',borderRadius:'8px',background:'#811c28',color:'#fff',font:'bold 17px system-ui',pointerEvents:'none'});warning.hidden=true;document.body.appendChild(warning);
 const marker=document.createElement('div');marker.id='flightAim';marker.textContent='⊕';Object.assign(marker.style,{position:'fixed',left:'50%',top:'47%',transform:'translate(-50%,-50%)',zIndex:'61',font:'36px monospace',color:'#b9f3dd',textShadow:'0 0 5px #071b18',pointerEvents:'none'});marker.hidden=true;document.body.appendChild(marker);
 const touch=document.getElementById('touchDescend');if(touch){touch.dataset.key='ControlLeft';touch.textContent='CTRL · GIÙ';touch.addEventListener('pointerdown',()=>touchDive=true);for(const ev of ['pointerup','pointercancel','lostpointercapture'])touch.addEventListener(ev,()=>touchDive=false);}
 const target=document.getElementById('touchControls');if(target){const button=document.createElement('button');button.id='flightTurboButton';button.textContent='SHIFT · TURBO';button.hidden=true;button.style.margin='4px';target.appendChild(button);button.addEventListener('pointerdown',e=>{e.preventDefault();touchBoost=true;button.setPointerCapture(e.pointerId);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(ev,()=>touchBoost=false);}
 const map=document.getElementById('mapDialog');if(map){new MutationObserver(()=>{if(map.open)queueMicrotask(()=>flightRadar(game));}).observe(map,{attributes:true,attributeFilter:['open']});map.addEventListener('click',()=>queueMicrotask(()=>flightRadar(game)));}
}
const cameraUpdate=CameraRig.prototype.update;
if(!CameraRig.prototype.__airportDiveCamera){CameraRig.prototype.__airportDiveCamera=true;CameraRig.prototype.update=function(dt,opts){const yaw=cameraUpdate.call(this,dt,opts),s=game?.state;if(s?.mode==='car'&&isJet(s.car)&&!this.dragging){const desired=clamp(.39-(s.flightPitch||0)*.72,.15,1.15);this.pitch+=(desired-this.pitch)*(1-Math.exp(-Math.min(.12,dt)*6));}return yaw;};}
const rawLookAt=THREE.PerspectiveCamera.prototype.lookAt;
if(!THREE.PerspectiveCamera.prototype.__airportDiveAim){THREE.PerspectiveCamera.prototype.__airportDiveAim=true;THREE.PerspectiveCamera.prototype.lookAt=function(x,y,z){const s=game?.state;if(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z)&&s?.started&&!s.paused&&s.mode==='car'&&isJet(s.car)&&Math.hypot(x-s.x,z-s.z)<2&&Math.abs(y-s.y)<18&&s.camera!==2){const angle=s.flightPitch||0;return rawLookAt.call(this,x+Math.sin(s.yaw)*24,y+Math.sin(angle)*35,z+Math.cos(s.yaw)*24);}return rawLookAt.apply(this,arguments);};}
const previousPopulate=ModernGameplay.prototype.populate,previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__airportCombatFlight){ModernGameplay.prototype.__airportCombatFlight=true;
 ModernGameplay.prototype.populate=function(...args){const result=previousPopulate.apply(this,args);game=this;this.airDefenders=[];this.incomingMissiles=[];this.abandonedAircraft=[];this.airStrikes=0;this.flightLastPilot=null;this.flightLastSpeed=0;this.flightShockwaves=[];addHud();return result;};
 ModernGameplay.prototype.update=function(dt){
  previousUpdate.call(this,dt);const s=this.state;if(!s.started||!Number.isFinite(dt)||dt<=0)return;
  spawnBlackbird(this);
  const c=s.car,airborne=!!c?.spec.aircraft&&s.mode==='car',plane=airborne&&c.spec.plane;
  if(plane){
   const ground=this.terrain.height(s.x,s.z,s.y),outcome=aircraftControlStep(s,dt,{climb:held.has('Space'),dive:held.has('ControlLeft')||held.has('ControlRight')||touchDive,boost:held.has('ShiftLeft')||held.has('ShiftRight')||touchBoost,left:held.has('KeyA')||held.has('ArrowLeft'),right:held.has('KeyD')||held.has('ArrowRight')},ground);
   if(outcome?.crashed){this.defeat?.('Picchiata · impatto con il suolo');}
   else{this.pose(c);c.mesh.rotation.x=-(s.flightPitch||0);const old=c.lastBlackbirdSpeed||0;if(c.style===BLACKBIRD){if(s.speed>=BLACKBIRD_EFFECT&&old<BLACKBIRD_EFFECT)shockwave(this,c);for(const t of c.mesh.userData.flightTrails||[])t.visible=s.speed>=BLACKBIRD_EFFECT;}c.lastBlackbirdSpeed=s.speed;}
  }else if(airborne){s.flightPitch=0;if(held.has('ControlLeft')||held.has('ControlRight')||touchDive){const ground=this.terrain.height(s.x,s.z,s.y);s.y=Math.max(ground,s.y-6*dt);s.vy=-6;c.y=s.y;this.pose(c);}}
  else s.flightPitch=0;
  const next=c?.nextAirportMissile||0;if(airborne&&missileJet(c.style)&&next>(c.lastTrackedMissile||0)){this.airStrikes++;c.lastTrackedMissile=next;
   const m=this.airportMissiles?.findLast(m=>m.owner===c&&m.life<.2);if(m){const pitch=s.flightPitch||0;m.dir.set(Math.sin(s.yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(s.yaw)*Math.cos(pitch)).normalize();const opponents=this.airDefenders.filter(a=>a.health>0&&a.mesh.visible).sort((a,b)=>Math.hypot(a.x-s.x,a.z-s.z)-Math.hypot(b.x-s.x,b.z-s.z));if(opponents[0]&&Math.hypot(opponents[0].x-s.x,opponents[0].z-s.z)<950)m.target=opponents[0];}
   if(this.airStrikes===4)this.toast?.('ALLERTA MILITARE · intercettori in arrivo',3);
  }
  // Player's existing missile controller already tracks its acquired target.
  for(const m of this.airportMissiles||[]){if(m.owner!==c||!m.target?.health||m.target.health<=0)continue;const desired=new THREE.Vector3(m.target.x-m.p.x,m.target.y+m.target.spec.height*.5-m.p.y,m.target.z-m.p.z).normalize();m.dir.lerp(desired,Math.min(.85,dt*1.35)).normalize();}
  if(airborne){this.flightLastPilot=c;this.flightLastSpeed=s.speed;}else handleAbandoned(this,dt);
  if(airborne)handleAbandoned(this,dt);
  advanceThreats(this,Math.min(dt,.12));
  for(const effect of [...this.flightShockwaves]){effect.age+=dt;effect.mesh.scale.setScalar(1+effect.age*11);effect.mesh.material.opacity=Math.max(0,.8*(1-effect.age/.95));if(effect.age>.95){this.scene.remove(effect.mesh);effect.mesh.geometry.dispose();effect.mesh.material.dispose();this.flightShockwaves.splice(this.flightShockwaves.indexOf(effect),1);}}
  const panel=document.getElementById('flightPanel'),aim=document.getElementById('flightAim'),button=document.getElementById('flightTurboButton');if(panel){panel.hidden=!airborne;if(airborne)panel.textContent=plane?'W/S VELOCITÀ · A/D CURVA · SPACE SALI · CTRL PICCHIATA · SHIFT TURBO · F PARACADUTE'+(missileJet(c.style)?' · TAB MISSILE':''):'W/S AVANTI · A/D RUOTA · SPACE SALI · CTRL SCENDI · SHIFT TURBO · F PARACADUTE';}
  if(aim)aim.hidden=!(plane&&isJet(c));if(button)button.hidden=!airborne;
 };
}
if(typeof window!=='undefined'){
 window.addEventListener('keydown',e=>{if(!active()||document.querySelector('dialog[open]'))return;
  if(['ShiftLeft','ShiftRight','ControlLeft','ControlRight','Space','KeyA','KeyD','ArrowLeft','ArrowRight'].includes(e.code))held.add(e.code);
  if(['ShiftLeft','ShiftRight','ControlLeft','ControlRight'].includes(e.code)){e.preventDefault();if(e.code.startsWith('Shift'))e.stopImmediatePropagation();}
  if(e.code==='KeyX'&&missileJet(game.state.car?.style)){e.preventDefault();const s=game.state;if(s.elapsed<(game.lastFlare||0)+5)return;game.lastFlare=s.elapsed;for(const m of game.incomingMissiles||[])if(m.p.distanceTo(new THREE.Vector3(s.x,s.y,s.z))<380){m.age=5.6;game.toast?.('CONTROMISURA · missile disorientato',2);}}
 },true);
 window.addEventListener('keyup',e=>held.delete(e.code),true);window.addEventListener('blur',()=>{held.clear();touchDive=touchBoost=false;});
}
