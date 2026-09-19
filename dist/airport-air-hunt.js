// Additive airport dogfight UI and one opt-in mission. Loaded last; no changes
// to the city-road, race, motorcycle, taxi or multiplayer controllers.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {AIRPORT,areaPoint} from './gameplay-areas.js';
import {VEHICLES} from './vehicles.js';
import {vehicleBlocked} from './movement.js';
import {installVehicleDamage} from './vehicle-damage.js';
import {airControlHeld,flightCommand,controlSpeed} from './airport-air-controls.js';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const isMilitary=c=>!!c&&['airport-jet','airport-interceptor','airport-strike','airport-blackbird'].includes(c.style);
const PALETTE=['#d75651','#4b8eca','#d5b24c','#72a36c','#a779bb','#d5dfe7'];
const LABELS=['ROSSO','BLU','GIALLO','VERDE','VIOLA','ARGENTO'];
const alive=c=>!!c&&c.health>0&&!!c.mesh?.visible;
const fighters=g=>[...new Set([...(g.airDefenders||[]),...(g.extraDogfighters||[])])].filter(alive);
export const airHuntPayout=kills=>Math.max(0,Math.min(10,Math.floor(kills||0)))*150;
export function enemyPointer(s,c){
 const bearing=Math.atan2(Math.sin(Math.atan2(c.x-s.x,c.z-s.z)-s.yaw),Math.cos(Math.atan2(c.x-s.x,c.z-s.z)-s.yaw));
 const horizontal=Math.hypot(c.x-s.x,c.z-s.z),height=Math.atan2((c.y||0)-(s.y||0),Math.max(1,horizontal))-(s.flightPitch||0);
 const ahead=Math.abs(bearing)<1.03;
 return {x:clamp(ahead?50+bearing*44:(bearing>0?94:6),6,94),y:clamp(47-height*49,17,83),
  arrow:ahead?(height>.2?'↑':height<-.2?'↓':'➤'):(bearing>0?'▶':'◀'),metres:Math.round(Math.hypot(horizontal,(c.y||0)-(s.y||0)))};
}
function fighterModel(){
 const root=new THREE.Group(),geo=new THREE.BoxGeometry(),skin=new THREE.MeshStandardMaterial({color:'#4d7897',roughness:.68}),wing=new THREE.MeshStandardMaterial({color:'#77adc2',roughness:.67}),glass=new THREE.MeshStandardMaterial({color:'#294e63',roughness:.35});
 const part=(x,y,z,w,h,l,mat)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(w,h,l);m.castShadow=true;root.add(m);};
 part(0,2,0,2,1.7,14,skin);part(0,2.2,.8,14,.3,3.4,wing);part(0,2.3,-5.5,5,.22,1.6,wing);part(0,3.1,3,1.3,.7,2.4,glass);
 for(const side of [-1,1]){part(side*.8,3,-5.5,.2,2.3,2.3,skin);part(side*.85,1.38,-3.8,.75,.8,3.1,skin);}
 root.name='Missione · jet pronto al decollo';return root;
}
export function runwayMissionSpot(g){
 const spec=VEHICLES['airport-interceptor'];if(!spec||!g.terrain||!g.collision)return null;
 for(const v of [-370,-415,-320,-270,-215]){
  const point=areaPoint(AIRPORT,0,v),y=g.terrain.height(point.x,point.z),p={...point,y,yaw:AIRPORT.yaw};
  if(!g.terrain.dry(p.x,p.z,spec.width*.42,y)||vehicleBlocked(p.x,p.z,p.yaw,g.collision,spec,y))continue;
  if(g.cars.some(c=>c.mesh?.visible&&Math.hypot(c.x-p.x,c.z-p.z)<(c.spec.length+spec.length)*.5+7))continue;
  return p;
 }
 return null;
}
function saveMissionReward(s){
 try{const existing=JSON.parse(localStorage.getItem('padova-game-v1')||'{}');
  localStorage.setItem('padova-game-v1',JSON.stringify({...existing,money:s.money,jobs:s.jobs}));
 }catch(error){console.warn('[Air hunt] reward storage unavailable',error);}
}
function clearMissionEnemies(g){
 for(const c of [...(g.airDefenders||[]),...(g.extraDogfighters||[])])if(g.cars.includes(c))g.retire(c);
 g.airDefenders=[];g.extraDogfighters=[];
 for(const missile of g.incomingMissiles||[])g.scene.remove(missile.mesh);
 g.incomingMissiles=[];g.airStrikes=0;g.dogfightBaseWanted=null;
 g.state.wanted=0;g.wantedLevel=0;g.state.escape=0;
}
function finishAirHunt(g,success,reason=''){const run=g.airHunt;if(!run?.active)return;
 run.active=false;const s=g.state,kills=run.kills,payout=airHuntPayout(kills);
 if(success){s.jobs=(s.jobs||0)+1;clearMissionEnemies(g);}
 else if(reason==='annullata')clearMissionEnemies(g);
 if(s.mission===run.mission)s.mission=null;
 saveMissionReward(s);
 const message=success?`CACCIA AEREA COMPLETATA · 10/10 · €${payout}`:`CACCIA AEREA ${reason==='annullata'?'ANNULLATA':'FALLITA'} · ${kills}/10 · €${payout} GUADAGNATI`;
 g.airHuntNotice={message,until:s.elapsed+7};g.toast?.(message,5);
}
export function startAirHunt(g){
 const s=g?.state;if(!s?.started||!g.addCar||!g.scene)return false;
 const p=runwayMissionSpot(g);if(!p){g.toast?.('Pista occupata: impossibile preparare il jet in sicurezza.',4);return false;}
 // Run the game's own cancellation path for an existing job (armored van etc.).
 if(typeof document!=='undefined'){
  const cancel=document.getElementById('cancelJob');if(s.mission&&cancel)cancel.click();
  else if(s.mission){g.stopArmored?.(s.mission);s.mission=null;}
  const close=document.getElementById('closeMenu');if(document.getElementById('menu')?.open)close?.click();
 }
 if(g.airHunt?.active)finishAirHunt(g,false,'annullata');
 // Never carry a former fight or an incoming missile into the new run.
 clearMissionEnemies(g);
 const old=s.car;if(old){old.speed=0;old.parked=true;if(old.y>g.terrain.height(old.x,old.z)+3)old.mesh.visible=false;}
 const car=g.addCar(p.x,p.z,p.yaw,false,true,'airport-interceptor'),previous=car.mesh,mesh=fighterModel();
 g.scene.remove(previous);g.scene.add(mesh);car.mesh=mesh;car.damageVisual=null;installVehicleDamage(car);
 Object.assign(car,{x:p.x,z:p.z,y:p.y,yaw:p.yaw,speed:0,health:100,parked:false,missionUnit:true,airportClaimed:true,name:'Caccia aerea · jet di missione'});
 Object.assign(s,{mode:'car',car,x:p.x,z:p.z,y:p.y,yaw:p.yaw,speed:0,vy:0,health:100,wanted:1,escape:0,parachuting:false,paused:false,flightPitch:0,waypoint:null,route:[]});
 if(g.player)g.player.visible=false;
 g.pose(car);g.dogfightBaseWanted=1;g.dogfightBaseKills=g.confirmedAirKills||0;
 const mission={type:'airhunt',title:'CACCIA AEREA · 0/10',desc:'Abbatti 10 jet senza morire · €150 per ogni abbattimento',target:null,deadline:Infinity};
 s.mission=mission;g.airHunt={active:true,jet:car,mission,startKills:g.confirmedAirKills||0,kills:0};g.airHuntNotice=null;
 g.toast?.('CACCIA AEREA · 10 JET · TAB ACCELERA · ↑/↓ QUOTA · G MISSILE · Q MEGA',6);
 return true;
}
function tintEnemies(g){
 g.airHuntPainted??=new WeakSet();g.airHuntColorSerial??=0;
 for(const c of fighters(g)){
  if(g.airHuntPainted.has(c))continue;
  const index=g.airHuntColorSerial++%PALETTE.length;
  c.airCombatTint=PALETTE[index];c.airCombatColor=LABELS[index];c.airCombatNumber=g.airHuntColorSerial;
  const tint=new THREE.Color(PALETTE[index]);
  c.mesh.traverse(node=>{
   if(!node.isMesh||!node.material)return;
   const colorize=material=>{
    if(!material?.color)return material;
    const copy=material.clone();copy.color.lerp(tint,.75);return copy;
   };
   node.material=Array.isArray(node.material)?node.material.map(colorize):colorize(node.material);
  });
  g.airHuntPainted.add(c);
 }
}
function ensureUi(){if(typeof document==='undefined')return;
 if(!document.getElementById('airHuntStyles')){
  const style=document.createElement('style');style.id='airHuntStyles';
  style.textContent=`#airHuntPointers{position:fixed;inset:0;z-index:72;pointer-events:none}#airHuntPointers[hidden],#airHuntBanner[hidden]{display:none!important}.airHuntPointer{position:absolute;transform:translate(-50%,-50%);padding:4px 7px;border:1px solid currentColor;border-radius:6px;background:#101e27ca;color:white;font:800 12px/1.3 ui-monospace,monospace;white-space:nowrap;text-shadow:0 1px 3px #000;box-shadow:0 0 8px #0008}#airHuntBanner{position:fixed;z-index:74;left:50%;top:121px;transform:translateX(-50%);padding:8px 14px;border:1px solid #75ffd0;border-radius:8px;background:#061f27dc;color:#d3fff0;font:800 14px ui-monospace,monospace;text-align:center;pointer-events:none}body[data-flight-military="true"] #interact{display:none!important}@media(max-width:760px){.airHuntPointer{font-size:10px;padding:3px 4px}#airHuntBanner{top:110px;font-size:10px;padding:4px 8px;max-width:70vw}}`;
  document.head.appendChild(style);
 }
 if(!document.getElementById('airHuntPointers')){const layer=document.createElement('div');layer.id='airHuntPointers';layer.hidden=true;document.body.appendChild(layer);
  for(let i=0;i<6;i++){const el=document.createElement('div');el.className='airHuntPointer';el.hidden=true;layer.appendChild(el);}
 }
 if(!document.getElementById('airHuntBanner')){const banner=document.createElement('div');banner.id='airHuntBanner';banner.hidden=true;banner.setAttribute('aria-live','polite');document.body.appendChild(banner);}
 const content=document.getElementById('menuContent');if(content&&!content.dataset.airHuntObserved){
  content.dataset.airHuntObserved='true';
  const inject=()=>{const list=content.querySelector('.activities'),race=content.querySelector('[data-mission="race"]');if(!list||!race||content.querySelector('[data-mission="airhunt"]'))return;
   const button=document.createElement('button');button.className='activity';button.dataset.mission='airhunt';
   button.innerHTML='<span class="icon">✈</span><span><b>CACCIA AEREA</b><small>Compari su un jet in aeroporto. Abbatti 10 nemici senza morire.</small></span><span class="reward">€150 / jet · €1.500 max</span>';
   list.appendChild(button);button.addEventListener('click',()=>startAirHunt(activeGame));};
  new MutationObserver(inject).observe(content,{childList:true});inject();
 }
}
let activeGame=null;
function updateAirHunt(g){const run=g.airHunt,s=g.state;if(!run?.active)return;
 if(s.mode!=='car'||s.car!==run.jet||s.health<=0||run.jet.health<=0||!run.jet.mesh.visible){finishAirHunt(g,false,'interrotta');return;}
 if(s.mission!==run.mission){finishAirHunt(g,false,'annullata');return;}
 const confirmed=Math.max(0,(g.confirmedAirKills||0)-run.startKills),newKills=Math.min(10,confirmed);
 if(newKills>run.kills){
  const gained=newKills-run.kills;run.kills=newKills;s.money+=150*gained;saveMissionReward(s);
  run.mission.title=`CACCIA AEREA · ${run.kills}/10`;
  run.mission.desc=`Abbattuti ${run.kills}/10 · guadagnati €${airHuntPayout(run.kills)}`;
  g.toast?.(`JET ABBATTUTO · +€${150*gained} · ${run.kills}/10`,2.5);
 }
 if(run.kills>=10)finishAirHunt(g,true);
}
function updatePilot(g,dt,previousY){
 const s=g.state,c=s.car;
 if(!s.started||s.paused||s.mode!=='car'||!isMilitary(c)||!Number.isFinite(dt)||dt<=0)return;
 const command=flightCommand(airControlHeld),step=Math.min(.12,dt);
 s.speed=controlSpeed(s.speed,command,step,c.spec.accel*1.6,Math.max(25,c.spec.brake*2.4),c.airBoost||c.spec.max);
 c.speed=s.speed;
 if(command.climb||command.dive){
  const direction=(command.climb?1:0)-(command.dive?1:0);
  s.flightPitch=clamp((s.flightPitch||0)+direction*step*.9,-.75,.63);
  const rise=Math.sin(s.flightPitch)*Math.max(19,s.speed*.52),ground=g.terrain.height(s.x,s.z,s.y),next=previousY+rise*step;
  if(next<ground+.03&&previousY>ground+1.5&&rise< -12){g.defeat?.('Caccia aerea · impatto con il suolo');return;}
  s.y=Math.max(ground,next);s.vy=s.y<=ground+.03?0:rise;c.y=s.y;
  g.pose(c);c.mesh.rotation.x=-s.flightPitch;
 }
}
function updateMarkers(g){if(typeof document==='undefined')return;
 const s=g.state,visible=!!s.started&&!s.paused&&s.mode==='car'&&isMilitary(s.car),layer=document.getElementById('airHuntPointers'),banner=document.getElementById('airHuntBanner');
 if(layer){layer.hidden=!visible;if(visible&&s.elapsed>=(g.airHuntMarkerAt||0)){
  g.airHuntMarkerAt=s.elapsed+.10;const jets=fighters(g),children=layer.children;
  for(let i=0;i<children.length;i++){const el=children[i],jet=jets[i];el.hidden=!jet;if(!jet)continue;
   const marker=enemyPointer(s,jet),label=`${marker.arrow} J${i+1} ${jet.airCombatColor||'JET'} · ${marker.metres} m`;
   if(el.textContent!==label)el.textContent=label;el.style.color=jet.airCombatTint||'#ff8888';
   el.style.left=marker.x+'%';el.style.top=clamp(marker.y+(i%3-1)*3,15,85)+'%';
  }
 }}
 if(banner){const run=g.airHunt,notice=g.airHuntNotice,showMission=visible&&run?.active,showNotice=notice&&s.elapsed<notice.until;
  banner.hidden=!showMission&&!showNotice;
  if(showMission)banner.textContent=`CACCIA AEREA · ${run.kills}/10 JET · €${airHuntPayout(run.kills)} / €1.500`;
  else if(showNotice)banner.textContent=notice.message;
 }
 if(visible){const instructions=document.getElementById('fcControls'),text='A/D STERZA · ↑ SALI · ↓ SCENDI · TAB ACCELERA · CTRL FRENA · G MISSILE · Q MEGA MISSILE · X FLARE · F PARACADUTE';
  if(instructions&&instructions.textContent!==text)instructions.textContent=text;
  const touch=document.getElementById('flightMissileTouch');if(touch&&touch.textContent!=='G · MISSILE')touch.textContent='G · MISSILE';
  const brake=document.getElementById('touchDescend');if(brake&&brake.textContent!=='CTRL · FRENA')brake.textContent='CTRL · FRENA';
  const turbo=document.getElementById('flightTurboButton');if(turbo&&turbo.textContent!=='TAB · ACCELERA')turbo.textContent='TAB · ACCELERA';
 }
 const missionType=document.getElementById('missionType');if(missionType&&g.airHunt?.active&&missionType.textContent!=='CACCIA AEREA')missionType.textContent='CACCIA AEREA';
}
const previousPopulate=ModernGameplay.prototype.populate,previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__airportAirHunt20260919){
 ModernGameplay.prototype.__airportAirHunt20260919=true;
 ModernGameplay.prototype.populate=function(...args){const result=previousPopulate.apply(this,args);activeGame=this;this.airHunt=null;ensureUi();
  const defeat=this.defeat;this.defeat=(...arguments_)=>{if(this.airHunt?.active)finishAirHunt(this,false,'interrotta');return defeat?.(...arguments_);};
  return result;
 };
 ModernGameplay.prototype.update=function(dt){
  const previousY=this.state?.y;
  previousUpdate.call(this,dt);
  if(!this.state?.started||!Number.isFinite(dt)||dt<=0)return;
  updatePilot(this,dt,previousY);updateAirHunt(this);tintEnemies(this);updateMarkers(this);
 };
}
