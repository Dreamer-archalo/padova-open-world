import * as THREE from './vendor/three.module.js';
import {TangenzialeRace} from './tangenziale-race.js';
import {configureSecond} from './tangenziale-race-second.js';
import {VEHICLES} from './vehicles.js';
import {RACE_ONE_DIFFICULTIES,raceOneDifficulty} from './tangenziale-race-difficulty.js';
import {raceVehicleChoices,raceVehicleSpec,raceVehicleStats,raceVehicleProfile,RACE_PROFILES,chooseRaceRoster,safeRaceEventIndex,clearLegacyFeatures,crowds,bake} from './race-one-immersion.js';
import {openRaceGarage} from './race-garage.js';
import {buildRaceCorridor,raceCorridorPosition,corridorSurface,corridorFinish} from './race-corridor.js';
import {clamp} from './core.js';
import {vehicleBlocked} from './movement.js';
import {raceDriveSettings} from './race-driving-rules.js';
import {resetGroundMotion} from './vehicle-dynamics.js';
import {formatRaceTime} from './tangenziale-race-rules.js';

export const SECOND_RACE_ENVIRONMENTS=Object.freeze({
 easy:{ramps:6,trapRamps:1,slow:2,slowLength:30,chains:2,parked:3,crowds:30,rise:1.15,warning:210,penalty:.8,summary:'6 rampe, trappola, zone lunghe e 2 serie di sprint'},
 medium:{ramps:8,trapRamps:2,slow:3,slowLength:44,chains:3,parked:5,crowds:60,rise:1.5,warning:180,penalty:.7,summary:'8 rampe, 2 trappole, zone lunghe e 3 serie di sprint'},
 hard:{ramps:10,trapRamps:3,slow:4,slowLength:60,chains:4,parked:7,crowds:90,rise:1.8,warning:155,penalty:.6,summary:'10 rampe, 3 trappole, zone lunghe e 4 serie di sprint'}
});
const cube=new THREE.BoxGeometry();
function block(root,color,x,y,z,w,h,d){const m=new THREE.Mesh(cube,new THREE.MeshStandardMaterial({color,roughness:.7}));m.position.set(x,y,z);m.scale.set(w,h,d);root.add(m);return m;}
function group(root,e){const g=new THREE.Group();g.position.set(e.x,e.baseY,e.z);g.rotation.y=e.yaw;root.add(g);return g;}
function point(manager,index,side){const r=manager.race,p=r.samples[index],yaw=r.corridor.stations[index].yaw,x=p.x+Math.cos(yaw)*side,z=p.z-Math.sin(yaw)*side;return {index,x,z,yaw,side,baseY:corridorSurface(manager.game,r,p,x,z),progress:r.samples.cumulative[index]};}
function spot(manager,fraction,used,number,width=2.4,length=13){
 const r=manager.race,indices=r.samples.map((_,i)=>i).filter(i=>safeRaceEventIndex(r,i)&&used.every(j=>Math.abs(r.samples.cumulative[j]-r.samples.cumulative[i])>=56));
 indices.sort((a,b)=>Math.abs(r.samples.cumulative[a]-r.total*fraction)-Math.abs(r.samples.cumulative[b]-r.total*fraction));
 for(const i of indices){const members=r.corridor.stations[i].members,preferred=members[number%members.length];
  for(const m of [preferred,...members.filter(m=>m!==preferred)])for(const lane of [number%2?-2.3:2.3,number%2?2.3:-2.3]){
   const e=point(manager,i,m.side+lane);
   if(vehicleBlocked(e.x,e.z,e.yaw,manager.game.collision,{width,length,height:2,wheelbase:2.5},e.baseY))continue;
   used.push(i);return e;
  }
 }
 return null;
}
function zoneVisual(root,e,color){const g=group(root,e);for(let j=-e.length/2+1;j<e.length/2;j+=2)block(g,j%4<2?color:'#202b34',0,.035,j,e.width,.045,.7);for(const s of [-1,1])block(g,color,s*(e.width/2-.08),.055,0,.12,.05,e.length);}
function sign(root,e){const g=group(root,{...e,x:e.x+Math.cos(e.yaw)*(e.side<0?-5.5:5.5),z:e.z-Math.sin(e.yaw)*(e.side<0?-5.5:5.5)});block(g,'#8797a1',0,1,0,.08,2,.08);block(g,e.label.includes('TRAPPOLA')?'#ef6948':e.kind==='sprint'?'#54e0e8':'#f7d257',0,2.1,0,.9,.65,.08);}
export function configureAdvancedSecond(manager,mode='medium',seed=Date.now()){
 const r=manager.race,g=manager.game;if(!r?.__secondRace||r.advancedSecond)return false;
 r.advancedSecond=true;r.difficulty=raceOneDifficulty(mode);r.corridor=buildRaceCorridor(g,r);
 const config=SECOND_RACE_ENVIRONMENTS[r.difficulty],root=new THREE.Group(),events=[],used=[];root.name='race-two-immersion-r30';clearLegacyFeatures(manager);
 for(let n=0;n<config.ramps;n++){
  const e=spot(manager,.10+.68*(n+1)/(config.ramps+1),used,n);if(!e)continue;
  Object.assign(e,{kind:'ramp',label:n<config.trapRamps?'RAMPA TRAPPOLA · ATTERRAGGIO LENTO':'SALTO FACOLTATIVO',warned:false,tangenzialeRace:true,secondRace:true,width:2.4,length:12,rise:config.rise,trapRamp:n<config.trapRamps});
  e.topY=[e.baseY,e.baseY,e.baseY+e.rise,e.baseY+e.rise];
  if(!e.trapRamp)e.boostPad={x:e.x-Math.sin(e.yaw)*10.5,z:e.z-Math.cos(e.yaw)*10.5,yaw:e.yaw,width:2.2,length:4.8,used:false};
  const v=group(root,e),plate=block(v,e.trapRamp?'#df6143':'#ce883e',0,e.rise/2,0,e.width,.14,Math.hypot(e.length,e.rise));plate.rotation.x=-Math.atan2(e.rise,e.length);
  for(const s of [-1,1]){const rail=block(v,e.trapRamp?'#ffe073':'#c4f5f3',s*(e.width/2-.08),e.rise/2+.10,0,.09,.12,Math.hypot(e.length,e.rise));rail.rotation.x=plate.rotation.x;}
  r.ramps.push(e);g.terrain.arcadeRamps.push(e);events.push(e);sign(root,e);
  if(e.trapRamp){const landing={...e,kind:'slow',label:'ATTERRAGGIO TRAPPOLA',x:e.x+Math.sin(e.yaw)*32,z:e.z+Math.cos(e.yaw)*32,width:3.2,length:26,progress:e.progress+32,trapLanding:true};landing.baseY=corridorSurface(g,r,r.samples[e.index+1],landing.x,landing.z,e.baseY);zoneVisual(root,landing,'#e57b48');events.push(landing);}
 }
 // Each chain crosses both roads. Three consecutive pads refresh a capped boost;
 // they cannot stack speed without limit or consume the driver's SHIFT charges.
 for(let n=0;n<config.chains;n++){
  const target=r.total*(.16+.57*n/Math.max(1,config.chains-1)),indices=r.samples.map((_,i)=>i).filter(i=>safeRaceEventIndex(r,i)&&safeRaceEventIndex(r,i+2)&&!events.some(e=>e.kind==='sprint'&&Math.abs(e.progress-r.samples.cumulative[i])<84));
  indices.sort((a,b)=>Math.abs(r.samples.cumulative[a]-target)-Math.abs(r.samples.cumulative[b]-target));const i=indices[0];if(i===undefined)continue;
  for(let j=0;j<3;j++)for(const member of r.corridor.stations[i+j].members){const e={...point(manager,i+j,member.side),kind:'sprint',label:'SPRINT '+(j+1)+'/3',chain:n,pad:j,width:member.road.w-.8,length:5,hits:new Set(),warned:false};zoneVisual(root,e,'#46d9de');events.push(e);if(j===0)sign(root,e);}
 }
 for(let n=0;n<config.slow;n++){
  const e=spot(manager,.20+.55*n/Math.max(1,config.slow-1),used,n+1);if(!e)continue;
  // Long zones occupy half a carriageway; another lane remains an escape route.
  Object.assign(e,{kind:'slow',label:'RALLENTATORE LUNGO · '+config.slowLength+' m',width:4.4,length:config.slowLength,warned:false});zoneVisual(root,e,'#e4be48');events.push(e);sign(root,e);
 }
 for(let n=0;n<config.parked;n++){
  const e=spot(manager,.12+.65*n/Math.max(1,config.parked-1),used,n+2,2.5,10);if(!e)continue;
  const c=g.addCar(e.x,e.z,e.yaw,false,true,['compact','wagon','officina','campo'][n%4]);Object.assign(c,{y:e.baseY,speed:0,parked:true,missionUnit:true,fixedSpawn:true,tangenzialeObstacle:true,budgetSleeping:false});g.pose(c);
  Object.assign(e,{kind:'parked',label:'MEZZO FERMO',car:c,warned:false});r.obstacles.push(c);r.obstacleDefs.push({index:e.index,offset:e.side,style:c.style,label:e.label});events.push(e);sign(root,e);
 }
 for(const member of r.corridor.stations[r.samples.length-2].members){const e={...point(manager,r.samples.length-2,member.side),baseY:member.y};const line=group(root,e);for(let j=0;j<Math.floor(member.road.w);j++)for(let k=0;k<2;k++)block(line,(j+k)%2?'#f2f5ec':'#192b35',j-(member.road.w-1)/2,.045,k-.5,1,.04,1);}
 const audience=crowds(root,g,r,config.crowds);bake(root);g.scene.add(root);r.roots.push(root);events.sort((a,b)=>a.progress-b.progress);
 r.immersion={mode:r.difficulty,config,seed,events,root,ambient:[],spectators:audience.spectators,counts:{ramps:r.ramps.length,trapRamps:r.ramps.filter(e=>e.trapRamp).length,slow:events.filter(e=>e.kind==='slow'&&!e.trapLanding).length,chains:new Set(events.filter(e=>e.kind==='sprint').map(e=>e.chain)).size,sprintPads:events.filter(e=>e.kind==='sprint').length,parked:r.obstacles.length,spectators:audience.spectators.length}};
 for(const c of g.cars){if(c===r.snapshot.car||c.tangenzialeRace||c.tangenzialeObstacle||c.spec.aircraft||c.spec.watercraft)continue;if(r.samples.some(p=>Math.hypot(c.x-p.x,c.z-p.z)<50&&Math.abs((c.y||0)-p.y)<4)){r.immersion.ambient.push({car:c,parked:c.parked,visible:c.mesh.visible,speed:c.speed});c.parked=true;c.speed=0;c.mesh.visible=false;}}
 return true;
}
export function applySecondRaceEvents(manager,dt){
 const r=manager.race,g=manager.game;if(!r?.advancedSecond||r.phase!=='running')return;
 for(const e of r.immersion.events){if(e.kind!=='slow'&&e.kind!=='sprint')continue;for(const car of [r.playerCar,...r.ai]){
  if(car.raceFinished||car===r.playerCar&&r.playerFinished)continue;
  const actor=car===r.playerCar?g.state:car,dx=actor.x-e.x,dz=actor.z-e.z,u=dx*Math.cos(e.yaw)-dz*Math.sin(e.yaw),v=dx*Math.sin(e.yaw)+dz*Math.cos(e.yaw);
  if(Math.abs(u)>e.width/2||Math.abs(v)>e.length/2||Math.abs(actor.y-e.baseY)>1.7||car.jump?.airborne)continue;
  if(e.kind==='slow'){car.raceSlowUntil=g.state.elapsed+.12;actor.speed*=Math.exp(-dt*2.7);}
  else if(!e.hits.has(car)){e.hits.add(car);car.raceSprintUntil=g.state.elapsed+2.2;actor.speed=Math.min(raceDriveSettings(car,g.state.elapsed,actor.health).max,Math.max(0,actor.speed)+8);if(car===r.playerCar)g.toast('SPRINT '+(e.pad+1)+'/3 · BOOST',1.1);}
  car.speed=actor.speed;
 }}
}
const priorConfirm=TangenzialeRace.prototype.openSecondRaceConfirmation;
TangenzialeRace.prototype.openSecondRaceConfirmation=function(){
 const out=priorConfirm.call(this);if(this.race||this.game.state.mission)return out;
 const content=document.getElementById('menuContent'),title=document.getElementById('menuTitle');if(!content)return out;if(title)title.textContent='Gara 2 · sfida avanzata';
 content.innerHTML='<p class="about-copy"><strong>7 mezzi, due carreggiate valide.</strong><br>Rampe e rampe trappola, rallentatori lunghi, tre sprint consecutivi e più tifosi. Anche il contromano è percorso di gara.<br>Scegli la difficoltà, poi il mezzo con immagine e statistiche. SHIFT: 3 turbo. Vittoria +€350 · sconfitta -€100.</p><label for="raceTwoDifficulty"><strong>DIFFICOLTÀ · BOT E PERCORSO</strong><select id="raceTwoDifficulty" style="width:100%;padding:9px;margin:10px 0">'+Object.entries(SECOND_RACE_ENVIRONMENTS).map(([key,c])=>'<option value="'+key+'">'+RACE_ONE_DIFFICULTIES[key].name+' · '+c.summary+'</option>').join('')+'</select></label><div class="menu-actions"><button class="primary" id="startTangenzialeRaceSecond">INIZIA GARA 2</button><button id="cancelTangenzialeRaceSecond">ANNULLA</button></div>';
 const select=document.getElementById('raceTwoDifficulty');select.value=this.selectedSecondRaceDifficulty||'medium';
 document.getElementById('startTangenzialeRaceSecond').onclick=()=>{this.selectedSecondRaceDifficulty=select.value;openRaceGarage(this,select.value,{choices:raceVehicleChoices(),spec:raceVehicleSpec,stats:raceVehicleStats,profiles:RACE_PROFILES,profile:raceVehicleProfile,raceNumber:2});};
 document.getElementById('cancelTangenzialeRaceSecond').onclick=()=>{document.getElementById('menu').close();this.game.state.paused=false;};return out;
};
const priorStart=TangenzialeRace.prototype.start;
TangenzialeRace.prototype.start=function(options={}){
 if(options.race!==2||typeof window!=='undefined'&&window.PadovaOnline?.connected)return priorStart.call(this,options);
 if(this.race)return;this.__nextRaceMode='second';try{priorStart.call(this,options);}finally{this.__nextRaceMode=null;}if(!this.race||!configureSecond(this))return;
 const r=this.race,g=this.game,mode=raceOneDifficulty(options.difficulty),player=raceVehicleChoices().some(c=>c.id===options.vehicle)?options.vehicle:this.selectedSecondRaceVehicle||'fulmine';
 let seed=Number.isFinite(options.seed)?options.seed:Date.now(),random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
 const first=chooseRaceRoster(mode,player,random,this.previousSecondRoster||[]),roster=[...first,...chooseRaceRoster(mode,player,random,[...(this.previousSecondRoster||[]),...first])],styles=[player,...roster];
 for(const [i,old] of [r.playerCar,...r.ai].entries()){
  const c=g.addCar(old.x,old.z,old.yaw,false,true,styles[i]);for(const key of Object.keys(old))if(key.startsWith('race'))c[key]=old[key];
  Object.assign(c,{spec:raceVehicleSpec(c.style),raceOneRules:true,raceTwoRules:true,raceTuning:RACE_ONE_DIFFICULTIES[mode],raceSkill:i?RACE_ONE_DIFFICULTIES[mode].skills[(i-1)%3]:1,raceTurbo:i?RACE_ONE_DIFFICULTIES[mode].turbo:3,raceLane:old.raceOffset,missionUnit:true,fixedSpawn:true,tangenzialeRace:true,budgetSleeping:false});g.retire(old);if(i===0)r.playerCar=c;else r.ai[i-1]=c;
 }
 this.selectedSecondRaceVehicle=player;this.previousSecondRoster=roster;g.claim(r.playerCar);g.state.car=r.playerCar;
 configureAdvancedSecond(this,mode,options.seed);this.freezeGrid();g.toast('GARA 2 · '+RACE_ONE_DIFFICULTIES[mode].name+' · '+r.playerCar.name+' · entrambe le carreggiate valide',4);
};
const priorPlayer=TangenzialeRace.prototype.updatePlayer;
TangenzialeRace.prototype.updatePlayer=function(){
 const r=this.race,g=this.game,s=g.state;if(!r?.advancedSecond)return priorPlayer.call(this);
 if(r.playerFinished){s.speed=0;s.vy=0;r.playerCar.speed=0;return true;}
 const p=raceCorridorPosition(g,r,{...s,jump:r.playerCar.jump},r.playerHint),previous=r.playerHint;
 if(s.car!==r.playerCar||s.mode!=='car'||s.health<=0||!p.valid){this.respawnActor(r.playerCar,r.playerCheckpoint,-1.2);s.car=r.playerCar;s.mode='car';g.toast(s.health<=0?'Mezzo ripristinato al checkpoint':'Rientro al checkpoint · fuori da entrambe le carreggiate',2);return true;}
 r.playerHint=p.index;r.playerProgress=Math.max(r.playerProgress,p.progress);
 if(p.index>=r.playerCheckpoint&&p.index<=previous+6){r.playerCheckpoint=p.index;r.playerCheckpointSide=p.side;}
 if(corridorFinish(r,{...s,jump:r.playerCar.jump},r.playerProgress))this.markFinished(0,r.playerCar);return true;
};
// A healthy driver who leaves the route keeps the same damage after recovery.
// Only a destroyed vehicle is repaired, and no checkpoint can be ahead of progress.
const priorRespawn=TangenzialeRace.prototype.respawnActor;
TangenzialeRace.prototype.respawnActor=function(car,index,side=0){
 const r=this.race;if(!r?.advancedSecond)return priorRespawn.call(this,car,index,side);
 const isPlayer=car===r.playerCar,health=isPlayer?this.game.state.health:car.health,hint=isPlayer?r.playerHint:car.raceHint;
 const checkpoint=clamp(Math.min(index,hint??index),0,r.samples.length-1);
 const out=priorRespawn.call(this,car,checkpoint,side);
 if(health>0){car.health=health;if(isPlayer)this.game.state.health=health;}
 car.raceSprintUntil=0;car.raceSlowUntil=0;car.raceTurboUntil=0;if(isPlayer)r.playerTurboUntil=0;
 return out;
};
const priorCheckpoint=TangenzialeRace.prototype.updateCheckpoint;
TangenzialeRace.prototype.updateCheckpoint=function(c,p,indexKey,checkpointKey){if(!this.race?.advancedSecond)return priorCheckpoint.call(this,c,p,indexKey,checkpointKey);const prev=c[indexKey]??0;c[indexKey]=p.index;if(p.valid&&p.index>=c[checkpointKey]&&p.index<=prev+6)c[checkpointKey]=p.index;};
const priorAI=TangenzialeRace.prototype.updateAI;
TangenzialeRace.prototype.updateAI=function(dt){applySecondRaceEvents(this,dt);return priorAI.call(this,dt);};
const priorResults=TangenzialeRace.prototype.resolveIfReady;
TangenzialeRace.prototype.resolveIfReady=function(){if(this.race?.advancedSecond&&this.race.ai.some(c=>!c.raceFinished))return false;return priorResults.call(this);};
const priorBoard=TangenzialeRace.prototype.raceBoard;
TangenzialeRace.prototype.raceBoard=function(){const r=this.race;if(!r?.advancedSecond)return priorBoard.call(this);return [r.playerCar,...r.ai].map((c,i)=>'<div><strong>'+c.name+(i===0?' · TU':'')+'</strong><span style="float:right;margin-left:12px">'+(r.finishTimes[i]!==null?'#'+(r.finishOrder.indexOf(i)+1)+' · '+formatRaceTime(r.finishTimes[i]):Math.round(Math.min(100,(i===0?r.playerProgress:c.raceProgress||0)/r.total*100))+'%')+'</span></div>').join('');};
