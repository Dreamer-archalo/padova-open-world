// Airport dogfight V2. Loaded INSTEAD of airport-cockpit-tuning.js.
// Preserve the pre-existing airport modules, city roads, and ground physics.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {CameraRig} from './camera-rig.js';
import {VEHICLES} from './vehicles.js';
import {vehicleBlocked} from './movement.js';
import {launchAirportMissile,missileJet} from './airport-flight-extras.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const military=c=>!!c&&(missileJet(c.style)||c.style==='airport-blackbird');
const flying=s=>s?.started&&s.mode==='car'&&s.car?.spec?.aircraft?s.car:null;
const alive=c=>c?.health>0&&c.mesh?.visible;
let game=null,visualPitch=0;
const keys=new Set();

export const wantedJetCount=stars=>clamp(Math.floor(Number(stars)||0),0,5);
export const wantedAfterKills=(base,kills)=>clamp(wantedJetCount(base)+Math.floor(Math.max(0,kills)/2),1,5);
export function hostileFlightAllowed(g){return !!military(flying(g?.state))&&g.state.wanted>=1;}
function forward(s){const pitch=s.flightPitch||0;return new THREE.Vector3(Math.sin(s.yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(s.yaw)*Math.cos(pitch)).normalize();}
function aimPoint(c){return new THREE.Vector3(c.x,c.y+(c.spec?.height||2)*.48,c.z);}
export function assistedFlightTarget(g,origin,direction){
 let aimed=null,auto=null,aimScore=Infinity,autoScore=Infinity;
 for(const c of g?.cars||[]){
  if(c===g.state.car||!alive(c)||!c.spec?.aircraft)continue;
  const to=aimPoint(c).sub(origin),distance=to.length();if(distance<18||distance>1100)continue;
  const cosine=to.dot(direction)/distance;if(cosine<=0)continue;
  const angle=Math.acos(clamp(cosine,-1,1));
  // A target inside the reticle ALWAYS wins over radar-based acquisition.
  if(angle<.105){const score=angle*1400+distance*.035;if(score<aimScore){aimScore=score;aimed=c;}}
  if(angle<.38){const score=angle*420+distance*.11-(c.airDefender?18:0);if(score<autoScore){autoScore=score;auto=c;}}
 }
 return aimed||auto;
}
export function aircraftGroundReverse(g,dt,held){
 const s=g.state,c=flying(s);if(!c?.spec.plane||!Number.isFinite(dt)||dt<=0)return false;
 const ground=g.terrain.height(s.x,s.z,s.y);
 if(!held||s.y>ground+.24||s.speed>2){c.groundReverse=0;return false;}
 c.groundReverse=clamp((c.groundReverse||0)+Math.min(dt,.1)*4.8,0,Math.min(5,c.spec.reverse||4));
 const step=c.groundReverse*Math.min(dt,.08),x=clamp(s.x-Math.sin(s.yaw)*step,-5940,7210),z=clamp(s.z-Math.cos(s.yaw)*step,-6440,6190);
 if(vehicleBlocked(x,z,s.yaw,g.collision,c.spec,s.y)||!g.terrain.dry(x,z,c.spec.width*.36,s.y)){c.groundReverse=0;s.speed=c.speed=0;return false;}
 s.x=c.x=x;s.z=c.z=z;s.y=c.y=g.terrain.height(x,z,s.y);s.speed=c.speed=-c.groundReverse;g.pose(c);return true;
}
function clearDefenders(g){
 for(const m of [...g.incomingMissiles||[]]){g.scene.remove(m.mesh);g.incomingMissiles.splice(g.incomingMissiles.indexOf(m),1);}
 for(const c of [...g.airDefenders||[]]){g.retire(c);g.airDefenders.splice(g.airDefenders.indexOf(c),1);}
 const warning=document.getElementById('flightWarning');if(warning)warning.hidden=true;
 g.airStrikes=0;g.dogfightBaseWanted=null;
}
function smoke(c){
 if(c.flightSmoke)return;
 const group=new THREE.Group(),geo=new THREE.SphereGeometry(.8,6,5);
 for(let i=0;i<4;i++){
  const puff=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:i%2?'#34383b':'#929a9b',transparent:true,opacity:.72,depthWrite:false}));
  puff.position.set((i%2?-.35:.4),c.spec.height*.62+i*.6,-c.spec.length*.3-i*1.9);puff.scale.setScalar(.8+i*.55);group.add(puff);
 }
 c.mesh.add(group);c.flightSmoke=group;
}
function wantedNow(g){
 const s=g.state,kills=Math.max(0,(g.confirmedAirKills||0)-(g.dogfightBaseKills||0));
 const desired=wantedAfterKills(g.dogfightBaseWanted||1,kills);
 s.wanted=Math.max(s.wanted||0,desired);g.wantedLevel=s.wanted;g.wantedHoldUntil=s.elapsed;s.escape=0;
 return s.wanted;
}
function destroyDefender(g,c){
 if(c.health<=0)return;
 const p={x:c.x,y:c.y+c.spec.height*.5,z:c.z};c.health=0;c.speed=0;c.mesh.visible=false;
 g.cannon?.impact(p,g.state.elapsed,5);g.confirmedAirKills=(g.confirmedAirKills||0)+1;
 const index=g.airDefenders?.indexOf(c)??-1;if(index>=0)g.airDefenders.splice(index,1);g.retire(c);
 const stars=wantedNow(g);g.toast?.('JET ABBATTUTO · '+g.confirmedAirKills+' TOTALE · RICERCA '+stars+'/5',2.5);
}
const originalHit=ModernGameplay.prototype.hit;
if(!ModernGameplay.prototype.__dogfightTwoHits){
 ModernGameplay.prototype.__dogfightTwoHits=true;
 ModernGameplay.prototype.hit=function(target,owner,enemy){
  if(target?.airDefender&&owner===this.state.car&&!enemy){
   if(target.health<=0)return;
   target.flightMissileHits=(target.flightMissileHits||0)+1;
   if(target.flightMissileHits>=2)destroyDefender(this,target);
   else{target.health=48;smoke(target);this.toast?.('JET COLPITO · FUMO · SECONDO COLPO PER ABBATTERLO',2);}
   return;
  }
  return originalHit.call(this,target,owner,enemy);
 };
}
function spawnDefender(g,index){
 const s=g.state,side=index%2?1:-1,rank=Math.floor(index/2),distance=200+rank*55;
 const x=clamp(s.x-Math.sin(s.yaw)*distance+Math.cos(s.yaw)*side*(130+rank*55),-5850,7120);
 const z=clamp(s.z-Math.cos(s.yaw)*distance-Math.sin(s.yaw)*side*(130+rank*55),-6350,6100);
 const y=Math.max(s.y+30+rank*13,g.terrain.elevation(x,z)+65),yaw=Math.atan2(s.x-x,s.z-z);
 const c=g.addCar(x,z,yaw,false,false,'airport-interceptor');
 Object.assign(c,{y,yaw,speed:70,health:100,parked:false,missionUnit:true,hostile:true,airDefender:true,fireAt:s.elapsed+3+index*.6,name:'JET INSEGUITORE · '+(index+1)});
 c.mesh.visible=true;g.pose(c);g.airDefenders.push(c);
 return c;
}
export function ensureDefenders(g){
 if(!hostileFlightAllowed(g))return;
 g.airDefenders??=[];
 // Remove invalid references, then refill in the SAME simulation tick.
 g.airDefenders=g.airDefenders.filter(c=>alive(c)&&g.cars.includes(c));
 const count=wantedJetCount(g.state.wanted);
 while(g.airDefenders.length<count)spawnDefender(g,g.airDefenders.length);
 // If a non-flight police event lowered the wanted level, enforce exact parity.
 while(g.airDefenders.length>count){const c=g.airDefenders.pop();g.retire(c);}
}
function explosion(g,m){
 const pos=m.mesh.position.clone(),p={x:pos.x,y:pos.y,z:pos.z};
 g.cannon?.impact(p,g.state.elapsed,9);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.22,7,36),new THREE.MeshBasicMaterial({color:'#ffb052',transparent:true,opacity:.92,depthWrite:false}));
 ring.position.copy(pos);ring.rotation.x=Math.PI/2;g.scene.add(ring);
 const ball=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshBasicMaterial({color:'#ffd18e',transparent:true,opacity:.5,depthWrite:false}));ball.position.copy(pos);g.scene.add(ball);
 (g.dogfightExplosions??=[]).push({ring,ball,age:0});
 for(const c of [...g.airDefenders||[]]){
  if(!alive(c)||aimPoint(c).distanceTo(pos)>64)continue;
  // An ordinary missile takes two hits. The special missile has an additional
  // direct blast; nearby jets receive one hit from the shockwave.
  g.hit(c,m.owner,false);
 }
 g.toast?.('MEGA MISSILE · DETONAZIONE',2);
}
function updateExplosions(g,dt){
 for(const effect of [...g.dogfightExplosions||[]]){
  effect.age+=dt;effect.ring.scale.setScalar(1+effect.age*68);effect.ball.scale.setScalar(1+effect.age*32);
  effect.ring.material.opacity=Math.max(0,.92*(1-effect.age/1.15));effect.ball.material.opacity=Math.max(0,.5*(1-effect.age/.9));
  if(effect.age>1.15){for(const mesh of [effect.ring,effect.ball]){g.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}g.dogfightExplosions.splice(g.dogfightExplosions.indexOf(effect),1);}
 }
}
function installHud(){
 if(typeof document==='undefined'||document.getElementById('flightCockpit'))return;
 const style=document.createElement('style');style.textContent=`
 #flightCockpit[hidden],#flightThreatBearing[hidden],#flightRadar[hidden]{display:none!important}
 body[data-flight-active="true"] .hud.mission,body[data-flight-active="true"] .hud.driving,body[data-flight-active="true"] .hud.keybar,body[data-flight-active="true"] #targetDistance,body[data-flight-active="true"] #touchCar{display:none!important}
 body[data-flight-military="true"] .hud.minimap,body[data-flight-military="true"] #flightPanel{display:none!important}
 #flightCockpit{position:fixed;inset:56px 15px 25px;z-index:65;pointer-events:none;color:#bafde5;font:700 15px/1.45 ui-monospace,monospace;text-shadow:0 1px 5px #00130f;contain:layout style}
 #flightCockpit:before{content:"";position:absolute;inset:0;border:2px solid #78ffce73;clip-path:polygon(0 0,23% 0,23% 2px,77% 2px,77% 0,100% 0,100% 100%,93% 100%,93% 99%,7% 99%,7% 100%,0 100%);box-shadow:inset 0 0 34px #58f7cc20}
 #flightCockpit .fc-top{position:absolute;top:0;left:50%;transform:translateX(-50%);padding:9px 24px;background:#09252aae;border:1px solid #74ffd48c;border-radius:0 0 14px 14px;text-align:center;min-width:260px;backdrop-filter:blur(3px)}
 #flightCockpit .fc-title{font-size:12px;letter-spacing:.14em;color:#a5fff3}
 #flightCockpit .fc-data{display:flex;gap:26px;justify-content:center;font-size:28px;font-variant-numeric:tabular-nums}
 #flightCockpit .fc-data small{font-size:12px;color:#a5e5d5}
 #flightCockpit .fc-systems{position:absolute;left:12px;top:26%;padding:14px 17px;background:#09252ab8;border:1px solid #74ffd48c;border-radius:10px;min-width:225px;backdrop-filter:blur(3px)}
 #flightCockpit .fc-systems strong{display:block;font-size:16px;margin-bottom:10px;color:#f0fff8}
 #flightCockpit .fc-systems div{font-size:14px;white-space:nowrap;margin:7px 0}
 #flightCockpit [data-condition="warning"]{color:#ffd078}#flightCockpit [data-condition="critical"]{color:#ff7272}
 #flightCockpit .fc-status{position:absolute;right:12px;top:25%;padding:11px 14px;min-width:180px;background:#09252ab0;border:1px solid #74ffd48c;border-radius:10px;text-align:right}
 #flightCockpit .fc-status b{display:block;font-size:19px;color:#ffe9ba}
 #flightCockpit .fc-bottom{position:absolute;bottom:0;left:50%;transform:translateX(-50%);padding:9px 15px;white-space:normal;max-width:66vw;text-align:center;background:#09252ac9;border:1px solid #74ffd48c;border-radius:8px;font-size:12px}
 #flightThreatBearing{position:fixed;top:46%;right:12px;z-index:68;background:#350f16d6;border:1px solid #ff6c74;padding:10px;color:#ffe3d8;font:700 14px ui-monospace,monospace;pointer-events:none}
 #flightRadar{position:fixed;left:17px;bottom:36px;width:245px;height:245px;z-index:67;pointer-events:none;background:#061f29cb;border:2px solid #74ffd49a;border-radius:50%;box-shadow:0 0 19px #35f6bd25}
 @media(max-width:760px){#flightCockpit{inset:65px 5px 100px}#flightCockpit .fc-top{min-width:150px;padding:4px 7px}.fc-title{font-size:10px!important}#flightCockpit .fc-data{gap:8px;font-size:18px}#flightCockpit .fc-data small{font-size:9px}#flightCockpit .fc-systems{top:29%;left:0;min-width:0;padding:7px;max-width:150px}#flightCockpit .fc-systems strong{font-size:11px}#flightCockpit .fc-systems div{font-size:10px;margin:4px 0}#flightCockpit .fc-status{right:0;top:29%;min-width:0;padding:6px;font-size:10px}#flightCockpit .fc-status b{font-size:12px}#flightCockpit .fc-bottom{bottom:0;font-size:9px;max-width:95vw}#flightRadar{left:8px;bottom:125px;width:150px;height:150px}#flightThreatBearing{font-size:10px;max-width:115px}}
 `;document.head.appendChild(style);
 const hud=document.createElement('div');hud.id='flightCockpit';hud.hidden=true;
 hud.innerHTML='<div class="fc-top"><div class="fc-title" id="fcVehicle">JET · CABINA OLOGRAFICA</div><div class="fc-data"><span><span id="fcSpeed">0</span><small> KM/H</small></span><span><span id="fcAlt">0</span><small> M</small></span><span><span id="fcLife">100</span><small> %</small></span></div></div><div class="fc-systems"><strong>DIAGNOSTICA AEROMOBILE</strong><div id="fcEngine">MOTORE · OK</div><div id="fcWing">ALI · OK</div><div id="fcRadarState">RADAR · OK</div><div id="fcKill">ABBATTIMENTI · 0</div></div><div class="fc-status"><b id="fcStars">RICERCA ☆☆☆☆☆</b><div id="fcEnemies">JET OSTILI · 0</div><div id="fcLock">NESSUN AGGANCIO</div></div><div class="fc-bottom" id="fcControls">W/S VELOCITÀ · A/D CURVA · SPACE SALI · CTRL SCENDI · SHIFT TURBO · TAB MISSILE · Q MEGA MISSILE · X CONTROMISURE · F PARACADUTE</div>';
 document.body.appendChild(hud);
 const radar=document.createElement('canvas');radar.id='flightRadar';radar.width=320;radar.height=320;radar.hidden=true;radar.setAttribute('aria-label','Radar aereo: jet ostili e posizione del giocatore');document.body.appendChild(radar);
 const indicator=document.createElement('div');indicator.id='flightThreatBearing';indicator.hidden=true;document.body.appendChild(indicator);
 const touch=document.getElementById('touchControls');if(touch)for(const [id,label,special] of [['flightMissileTouch','TAB · MISSILE',false],['flightMegaTouch','Q · MEGA MISSILE',true]]){const btn=document.createElement('button');btn.id=id;btn.textContent=label;btn.hidden=true;btn.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();launchWeapon(special);});touch.appendChild(btn);}
}
function write(id,value){const node=document.getElementById(id);if(node&&node.textContent!==value)node.textContent=value;}
function drawRadar(g){
 const cv=document.getElementById('flightRadar');if(!cv)return;
 const ctx=cv.getContext('2d'),s=g.state,center=160,scale=136/1050;
 ctx.clearRect(0,0,320,320);ctx.strokeStyle='#68f4cd8d';ctx.lineWidth=2;
 for(const r of [43,86,133]){ctx.beginPath();ctx.arc(center,center,r,0,Math.PI*2);ctx.stroke();}
 ctx.beginPath();ctx.moveTo(160,14);ctx.lineTo(160,306);ctx.moveTo(14,160);ctx.lineTo(306,160);ctx.stroke();
 ctx.fillStyle='#e5fff4';ctx.font='bold 14px monospace';ctx.fillText('RADAR · 1050 M',82,29);
 ctx.fillStyle='#82fce0';ctx.beginPath();ctx.moveTo(160,149);ctx.lineTo(153,169);ctx.lineTo(167,169);ctx.closePath();ctx.fill();
 for(const enemy of g.airDefenders||[]){if(!alive(enemy))continue;
  const dx=enemy.x-s.x,dz=enemy.z-s.z,right=dx*Math.cos(s.yaw)-dz*Math.sin(s.yaw),ahead=dx*Math.sin(s.yaw)+dz*Math.cos(s.yaw);
  const x=clamp(center+right*scale,17,303),y=clamp(center-ahead*scale,17,303);
  ctx.fillStyle='#ff777a';ctx.fillRect(x-5,y-5,10,10);ctx.fillStyle='#ffffff';ctx.font='bold 10px monospace';ctx.fillText('J',x+8,y+4);
 }
}
function hudStep(g){
 const s=g.state,c=flying(s),active=!!c&&!s.paused,combat=active&&military(c),hud=document.getElementById('flightCockpit'),radar=document.getElementById('flightRadar'),indicator=document.getElementById('flightThreatBearing');
 document.body.dataset.flightActive=active?'true':'false';document.body.dataset.flightMilitary=combat?'true':'false';
 if(hud)hud.hidden=!combat;if(radar)radar.hidden=!combat;
 for(const id of ['flightMissileTouch','flightMegaTouch']){const btn=document.getElementById(id);if(btn)btn.hidden=!combat;}
 const up=document.querySelector('#touchControls [data-key="Space"]');if(up){up.dataset.groundLabel??=up.textContent;up.textContent=active?'SPACE · SALI':up.dataset.groundLabel;}
 if(!combat){if(indicator)indicator.hidden=true;return;}
 if(s.elapsed<(g.nextDogfightHud||0))return;g.nextDogfightHud=s.elapsed+.12;
 const health=clamp(Math.ceil(s.health),0,100),alt=Math.max(0,Math.round(s.y-g.terrain.height(s.x,s.z,s.y)));
 write('fcVehicle',c.name||'JET · CABINA OLOGRAFICA');write('fcSpeed',String(Math.round(Math.abs(s.speed)*3.6)));write('fcAlt',String(alt));write('fcLife',String(health));
 const components=c.flightComponents||{engine:100,wing:100,radar:100};
 for(const [id,label,value] of [['fcEngine','MOTORE',components.engine],['fcWing','ALI',components.wing],['fcRadarState','RADAR',components.radar]]){
  const node=document.getElementById(id);write(id,label+' · '+(value<35?'CRITICO':value<75?'DANNEGGIATO':'OK'));if(node)node.dataset.condition=value<35?'critical':value<75?'warning':'ok';
 }
 write('fcKill','ABBATTIMENTI · '+(g.confirmedAirKills||0));
 write('fcStars','RICERCA '+ '★'.repeat(s.wanted)+'☆'.repeat(5-s.wanted));
 const enemies=(g.airDefenders||[]).filter(alive);write('fcEnemies','JET OSTILI · '+enemies.length+'/'+s.wanted);
 const target=assistedFlightTarget(g,new THREE.Vector3(s.x,s.y+c.spec.height*.5,s.z),forward(s));write('fcLock',target?(target.airDefender?'AGGANCIO · JET':'AGGANCIO · AEREO'):'NESSUN AGGANCIO');
 if(indicator){const nearest=enemies.sort((a,b)=>Math.hypot(a.x-s.x,a.z-s.z)-Math.hypot(b.x-s.x,b.z-s.z))[0];indicator.hidden=!nearest;
  if(nearest){const angle=Math.atan2(Math.sin(Math.atan2(nearest.x-s.x,nearest.z-s.z)-s.yaw),Math.cos(Math.atan2(nearest.x-s.x,nearest.z-s.z)-s.yaw));indicator.textContent=(angle>0?'▶':'◀')+' JET OSTILE · '+Math.round(Math.hypot(nearest.x-s.x,nearest.z-s.z))+' M';}
 }
 drawRadar(g);
}
function componentDamage(g,c){
 c.flightComponents??={engine:100,wing:100,radar:100};const now=g.state.health,previous=c.previousCockpitHealth??now;
 if(now<previous-1){const key=['wing','engine','radar'][(c.flightDamageEvents||0)%3];c.flightDamageEvents=(c.flightDamageEvents||0)+1;c.flightComponents[key]=Math.max(0,c.flightComponents[key]-(previous-now)*1.2);}
 c.previousCockpitHealth=now;
}
// A single damped visual pitch avoids competing instantaneous cockpit rotations.
const oldRig=CameraRig.prototype.update;
if(!CameraRig.prototype.__dogfightCamera){CameraRig.prototype.__dogfightCamera=true;CameraRig.prototype.update=function(dt,options){const yaw=oldRig.call(this,dt,options),s=game?.state;if(flying(s)?.spec.plane&&!this.dragging){const a=1-Math.exp(-clamp(dt,0,.06)*3.8);visualPitch+=(clamp(s.flightPitch||0,-.88,.63)-visualPitch)*a;this.pitch+=(clamp(.39-visualPitch*.55,.15,1.15)-this.pitch)*a;}else visualPitch=0;return yaw;};}
const originalLookAt=THREE.Object3D.prototype.lookAt;
if(!THREE.PerspectiveCamera.prototype.__dogfightAim){THREE.PerspectiveCamera.prototype.__dogfightAim=true;THREE.PerspectiveCamera.prototype.lookAt=function(x,y,z){const s=game?.state;if(typeof x==='number'&&typeof y==='number'&&typeof z==='number'&&military(flying(s))&&Math.hypot(x-s.x,z-s.z)<2&&Math.abs(y-s.y)<18&&s.camera!==2)return originalLookAt.call(this,x+Math.sin(s.yaw)*23,y+Math.sin(visualPitch)*23,z+Math.cos(s.yaw)*23);return originalLookAt.apply(this,arguments);};}
const previousPopulate=ModernGameplay.prototype.populate,previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__dogfightV2){
 ModernGameplay.prototype.__dogfightV2=true;
 ModernGameplay.prototype.populate=function(...args){const result=previousPopulate.apply(this,args);game=this;this.confirmedAirKills=0;this.airStrikes=0;this.dogfightBaseWanted=null;this.dogfightBaseKills=0;this.dogfightExplosions=[];installHud();return result;};
 ModernGameplay.prototype.update=function(dt){
  const s=this.state,c=flying(s),combat=military(c);
  if((!combat||s.wanted===0)&&(this.airDefenders?.length||this.incomingMissiles?.length||this.dogfightBaseWanted!==null))clearDefenders(this);
  if(combat){
   this.airStrikes=0; // Disable the old four-shots => forced three-star rule.
   s.escape=0;
   if(s.wanted>0){this.wantedLevel=s.wanted;this.wantedHoldUntil=s.elapsed;ensureDefenders(this);}
   if(!c.originalFlightBrake)c.originalFlightBrake=c.spec.brake||10;
   const faster=Math.max(30,c.originalFlightBrake*2.6);if(c.spec.brake<faster)c.spec={...c.spec,brake:faster};
  }
  const specialBefore=(this.airportMissiles||[]).filter(m=>m.special&&m.owner===c);
  previousUpdate.call(this,dt);
  const current=flying(s);
  if(current){aircraftGroundReverse(this,dt,keys.has('KeyS')||keys.has('ArrowDown'));componentDamage(this,current);}
  if(military(current)){
   this.airStrikes=0;
   if(s.wanted>0){this.wantedLevel=s.wanted;this.wantedHoldUntil=s.elapsed;ensureDefenders(this);s.escape=0;}
   for(const m of this.airportMissiles||[])if(m.owner===current&&alive(m.target)){
    const direction=aimPoint(m.target).sub(new THREE.Vector3(m.p.x,m.p.y,m.p.z));if(direction.lengthSq()>1)m.dir.lerp(direction.normalize(),Math.min(.15,Math.max(0,dt)*2.4)).normalize();
   }
  }
  for(const m of specialBefore)if(!(this.airportMissiles||[]).includes(m)){if(m.life<6.1)explosion(this,m);}
  updateExplosions(this,Math.max(0,dt));hudStep(this);
 };
}
function launchWeapon(special=false){
 const g=game,s=g?.state,c=flying(s);if(!g||!military(c)||s.paused||s.health<=0)return false;
 const style=c.style;if(style==='airport-blackbird')c.style='airport-interceptor';
 let fired=false;try{fired=launchAirportMissile(g);}finally{c.style=style;}
 if(!fired)return false;
 const m=g.airportMissiles.at(-1);if(!m)return false;
 const direction=forward(s),origin=new THREE.Vector3(m.p.x,m.p.y,m.p.z),target=assistedFlightTarget(g,origin,direction);
 m.target=target;m.dir.copy(target?aimPoint(target).sub(origin).normalize():direction);
 m.special=special;if(special){m.speed=190;c.nextAirportMissile=s.elapsed+5.5;}
 // The legacy interceptor wrapper must not overwrite the explicit crosshair lock.
 c.lastTrackedMissile=c.nextAirportMissile;g.airStrikes=0;
 if(g.dogfightBaseWanted===null){g.dogfightBaseWanted=Math.max(1,s.wanted||0);g.dogfightBaseKills=g.confirmedAirKills||0;}
 wantedNow(g);ensureDefenders(g);
 g.toast?.(special?'MEGA MISSILE · LANCIO':'MISSILE GUIDATO · '+(target?'BERSAGLIO AGGANCIATO':'TRAETTORIA LIBERA'),1.5);
 return true;
}
if(typeof window!=='undefined'){
 window.addEventListener('keydown',event=>{
  if(['KeyS','ArrowDown'].includes(event.code))keys.add(event.code);
  const c=flying(game?.state);if(!c||game.state.paused||document.querySelector('dialog[open]'))return;
  if(['KeyJ','KeyV','KeyK'].includes(event.code)){event.preventDefault();event.stopImmediatePropagation();return;}
  if(military(c)&&['Tab','KeyQ'].includes(event.code)){
   event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)launchWeapon(event.code==='KeyQ');
  }
 },true);
 window.addEventListener('keyup',event=>keys.delete(event.code),true);
 window.addEventListener('blur',()=>keys.clear());
}
