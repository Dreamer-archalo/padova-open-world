import * as THREE from './vendor/three.module.js';
import {TangenzialeRace} from './tangenziale-race.js';
import {VEHICLES} from './vehicles.js';
import './special-vehicles.js';
import './modern-vehicles.js';
import './dealerships.js';
import './tangenziale-race-difficulty.js';
import {raceOneDifficulty,RACE_ONE_DIFFICULTIES} from './tangenziale-race-difficulty.js';
import {clamp,angleDiff} from './core.js';
import {vehicleBlocked} from './movement.js';
import {openRaceGarage} from './race-garage.js';
import {activateRaceTurbo} from './race-driving-rules.js';

// Event counts are budgets: an unsafe location is skipped, never forced onto a bridge.
export const RACE_ENVIRONMENTS=Object.freeze({
 easy:Object.freeze({ramps:1,rise:.85,traps:0,parked:1,moving:0,crowds:12,warning:210,penalty:1,summary:'1 salto dolce, 1 ostacolo segnalato, poche distrazioni'}),
 medium:Object.freeze({ramps:2,rise:1.25,traps:1,parked:3,moving:1,crowds:28,warning:180,penalty:.72,summary:'2 salti, 1 rallentatore, 3 ostacoli e 1 mezzo lento'}),
 hard:Object.freeze({ramps:3,rise:1.65,traps:2,parked:5,moving:2,crowds:48,warning:155,penalty:.58,summary:'3 salti, 2 rallentatori, 5 ostacoli e 2 mezzi lenti'})
});
export const RACE_PROFILES=Object.freeze({
 agile:Object.freeze({label:'Agile',max:62,accel:16.5,brake:26,steer:1.22,turbo:1.32,damage:1.15,description:'Ottima ripresa e curve rapide, più delicato negli urti'}),
 balanced:Object.freeze({label:'Equilibrato',max:64,accel:15.8,brake:25,steer:1.14,turbo:1.29,damage:1,description:'Velocità, controllo e resistenza ben distribuiti'}),
 sprint:Object.freeze({label:'Veloce',max:65.5,accel:15,brake:24,steer:1.08,turbo:1.26,damage:1.12,description:'Più veloce sul dritto, meno agile e resistente'}),
 robust:Object.freeze({label:'Resistente',max:63,accel:15.2,brake:26,steer:1.12,turbo:1.28,damage:.68,description:'Sopporta più urti; ingombro maggiore da gestire'})
});
export const RACE_VEHICLE_IDS=Object.freeze([
 'cinquecento','taxi','fulmine','mito','motorcycle','scooter','trail','cruiser','zenit','vortice','lido','officina','campo','porto','selva',
 ...['ametista','ruggine','nebula','zebra','mandarino','azzurra','cobalto','limone','velluto','sale','prisma','bruma','fiamma','perla','magnete'].map(id=>'collector-'+id)
]);
export function eligibleRaceVehicle(spec){return !!spec&&!spec.aircraft&&!spec.watercraft&&!spec.tracked&&!spec.armor&&Number.isFinite(spec.max)&&spec.width<=2.7&&spec.length<=6.6&&spec.height<=2.9;}
export function raceVehicleProfile(spec){
 if(spec.bike||spec.width<1.15||spec.length<3.9)return 'agile';
 if(['suv','pickup','van','mpv','wagon'].includes(spec.family)||['safari','sixwheel','limo','woody'].includes(spec.shape)||spec.height>1.8)return 'robust';
 if(spec.max>=58||['supercar','sport'].includes(spec.family))return 'sprint';
 return 'balanced';
}
export function raceVehicleSpec(style){
 const base=VEHICLES[style];if(!eligibleRaceVehicle(base))throw Error('Mezzo non adatto alla gara: '+style);
 const profile=RACE_PROFILES[raceVehicleProfile(base)];
 // Fulmine remains the familiar reference car. Every other model stays close to it.
 const tuning=style==='fulmine'?RACE_PROFILES.balanced:profile;
 return {...base,max:tuning.max,boost:tuning.max,accel:tuning.accel,brake:tuning.brake,steer:tuning.steer,
  reverse:7,mass:clamp(base.mass||1,.8,1.4),turboMax:tuning.max*tuning.turbo,turboAccel:tuning.accel*2.2,
  raceDamageFactor:base.bike||base.width<1.15?1.35:tuning.damage,critical:Infinity};
}
export const raceVehicleChoices=()=>RACE_VEHICLE_IDS.filter(id=>eligibleRaceVehicle(VEHICLES[id])).map(id=>({id,name:VEHICLES[id].name,profile:id==='fulmine'?'balanced':raceVehicleProfile(VEHICLES[id])}));
export function raceVehicleStats(id){const s=raceVehicleSpec(id);return [
 {key:'speed',label:'Velocità',value:Math.round(s.max/75*100),detail:Math.round(s.max*3.6)+' km/h'},
 {key:'handling',label:'In curva',value:Math.round(s.steer/1.5*100),detail:'Maneggevolezza'},
 {key:'turbo',label:'Turbo',value:Math.round((s.turboMax/s.max-1)/.4*100),detail:'+'+Math.round((s.turboMax/s.max-1)*100)+'% · '+Math.round(s.turboMax*3.6)+' km/h'},
 {key:'durability',label:'Resistenza',value:Math.round(.6/s.raceDamageFactor*100),detail:'Meno danni con valori più alti'}
];}
function randomSource(seed){let n=seed>>>0;return ()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};}
function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function chooseRaceRoster(mode,player='fulmine',random=Math.random,previous=[]){
 const choices=raceVehicleChoices();
 const preferred=choices.filter(c=>mode==='easy'?['agile','balanced','robust'].includes(c.profile):mode==='hard'?['sprint','balanced'].includes(c.profile):true);
 const fresh=preferred.filter(c=>c.id!==player&&!previous.includes(c.id));
 const pool=fresh.length>=3?[...fresh]:preferred.filter(c=>c.id!==player);
 const ids=[];while(pool.length&&ids.length<3){const i=Math.min(pool.length-1,Math.floor(random()*pool.length));ids.push(pool.splice(i,1)[0].id);}
 return ids;
}
const yawAt=(r,i)=>{const a=r.samples[Math.max(0,i-1)],b=r.samples[Math.min(r.samples.length-1,i+1)];return Math.atan2(b.x-a.x,b.z-a.z);};
const progressAt=(r,i)=>(r.samples.cumulative[i]||0)-r.startDistance;
const offset=(p,yaw,side)=>({x:p.x+Math.cos(yaw)*side,z:p.z-Math.sin(yaw)*side});
function surface(game,p,x=p.x,z=p.z){const y=game.terrain.roads?.sample?.(p.road,x,z);return Number.isFinite(y)?y+.05:game.terrain.height(x,z,p.y);}
export function safeRaceEventIndex(r,i){
 if(i<r.startIndex+7||i>=r.samples.length-12||progressAt(r,i)>r.total-520)return false;
 for(let j=i-3;j<=i+6;j++){
  const road=r.samples[j]?.road;
  if(!road||road.b||road.crossing||road.tunnel||Number(road.layer)>0||road.w<8)return false;
 }
 const a=r.samples[i-3],b=r.samples[i+6],distance=Math.hypot(b.x-a.x,b.z-a.z);
 return Math.abs(angleDiff(yawAt(r,i-3),yawAt(r,i+6)))<.14&&Math.abs(b.y-a.y)/Math.max(1,distance)<.045;
}
function location(manager,fraction,used,width=2.4,side=2.3){
 const r=manager.race,target=r.total*fraction,indices=[];
 for(let i=r.startIndex+7;i<r.samples.length-12;i++)if(safeRaceEventIndex(r,i)&&used.every(j=>Math.abs(progressAt(r,j)-progressAt(r,i))>=84))indices.push(i);
 indices.sort((a,b)=>Math.abs(progressAt(r,a)-target)-Math.abs(progressAt(r,b)-target));
 for(const index of indices)for(const actualSide of [side,-side]){const p=r.samples[index],yaw=yawAt(r,index),q=offset(p,yaw,actualSide),y=surface(manager.game,p,q.x,q.z);
  if(vehicleBlocked(q.x,q.z,yaw,manager.game.collision,{width,length:13,height:2,wheelbase:2.5},y))continue;
  used.push(index);return {index,...q,yaw,baseY:y,progress:progressAt(r,index),side:actualSide};
 }
 return null;
}
const cube=new THREE.BoxGeometry();
function block(root,color,x,y,z,w,h,d){const mesh=new THREE.Mesh(cube,new THREE.MeshStandardMaterial({color,roughness:.7}));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);root.add(mesh);return mesh;}
function at(root,event){const group=new THREE.Group();group.position.set(event.x,event.baseY,event.z);group.rotation.y=event.yaw;root.add(group);return group;}
function rampVisual(root,r){
 const g=at(root,r),plate=block(g,'#c87936',0,r.rise/2,0,r.width,.14,Math.hypot(r.length,r.rise));plate.rotation.x=-Math.atan2(r.rise,r.length);
 for(const side of [-1,1]){const rail=block(g,'#fff0c4',side*(r.width/2-.08),r.rise/2+.10,0,.09,.12,Math.hypot(r.length,r.rise));rail.rotation.x=plate.rotation.x;}
 const pad=r.boostPad;for(let j=0;j<5;j++)block(g,j%2?'#3cbad0':'#f7e58a',0,.035,-r.length/2-4.5+(j-2)*.7,r.width*.9,.035,.3);
 // Uniform boost uses the existing race boost controller and cannot be farmed.
 pad.used=false;
}
function trapVisual(root,event){const g=at(root,event);for(let j=0;j<7;j++)block(g,j%2?'#21272e':'#f7ca48',0,.045,(j-3)*.6,event.width,.055,.35);}
function warningSign(root,g,r,event){
 const p=r.samples[Math.max(r.startIndex+2,event.index-5)],yaw=yawAt(r,event.index-5),q=offset(p,yaw,(event.side<0?-1:1)*(p.road.w/2+1)),y=surface(g,p,q.x,q.z);
 const group=at(root,{...q,yaw,baseY:y});block(group,'#8a969e',0,1,0,.09,2,.09);block(group,event.kind==='ramp'?'#44b8c7':'#f7bf45',0,2.05,0,1.05,.68,.09);
 block(group,'#18232b',0,2.05,.055,event.kind==='ramp'?.5:.08,.4,.03);
}
export function safeSpectatorSpot(g,x,z,y){
 for(const [dx,dz] of [[0,0],[.45,.45],[-.45,.45],[.45,-.45],[-.45,-.45]]){
  if(g.terrain.roads.candidates(x+dx,z+dz,.7).length)return false;
 }
 return g.terrain.dry(x,z,.5,y)&&!vehicleBlocked(x,z,0,g.collision,{width:.8,length:.8,height:1.9},y);
}
function crowds(root,g,r,count){
 const spectators=[];let groups=0;
 for(let n=0;n<count;n++){
  const target=Math.round(r.startIndex+5+(r.samples.length-r.startIndex-18)*(n+1)/(count+1));
  for(const delta of [0,1,-1,2,-2,3,-3]){
   const i=clamp(target+delta,r.startIndex+4,r.samples.length-5),p=r.samples[i],yaw=yawAt(r,i),road=p.road;
   if(!road||road.b||road.tunnel||road.crossing||Number(road.layer)>0)continue;
   const side=n%2?-1:1,positions=[];
   for(let j=0;j<10;j++){
    const q=offset(p,yaw,side*(road.w/2+2.4+(j%2)*.85)),along=(Math.floor(j/2)-2)*1.2;
    q.x+=Math.sin(yaw)*along;q.z+=Math.cos(yaw)*along;const y=g.terrain.height(q.x,q.z,p.y);
    if(!Number.isFinite(y)||Math.abs(y-p.y)>2.5||!safeSpectatorSpot(g,q.x,q.z,y))continue;
    positions.push({...q,y,yaw});
   }
   if(positions.length<3)continue;
   for(const [j,p] of positions.entries()){
    const person=at(root,{...p,baseY:p.y});block(person,['#307caa','#b8445c','#efc553','#65a478'][j%4],0,.98,0,.34,.75,.26);block(person,'#e5c5a6',0,1.53,0,.24,.25,.23);block(person,'#242e38',0,.34,0,.3,.48,.22);
    block(person,'#e5c5a6',.26,1.28,0,.12,.52,.13);if(j%3===0){block(person,'#ccd6cc',.32,1.72,0,.035,.7,.035);block(person,j%2?'#e95456':'#63dcde',.48,1.98,0,.38,.28,.03);}
    spectators.push(p);
   }
   groups++;break;
  }
 }
 return {spectators,groups};
}
// Bake static signs/crowds/ramps into one draw call; no per-frame crowd AI.
function bake(root){
 root.updateMatrixWorld(true);const positions=[],normals=[],colors=[],v=new THREE.Vector3(),n=new THREE.Vector3(),inv=root.matrixWorld.clone().invert(),materials=new Set();
 root.traverse(m=>{if(!m.isMesh)return;const matrix=new THREE.Matrix4().multiplyMatrices(inv,m.matrixWorld),normal=new THREE.Matrix3().getNormalMatrix(matrix),geo=m.geometry,indices=geo.index?.array,col=m.material.color;
  for(let j=0;j<(indices?.length||geo.attributes.position.count);j++){const i=indices?indices[j]:j;v.fromBufferAttribute(geo.attributes.position,i).applyMatrix4(matrix);n.fromBufferAttribute(geo.attributes.normal,i).applyMatrix3(normal).normalize();positions.push(v.x,v.y,v.z);normals.push(n.x,n.y,n.z);colors.push(col.r,col.g,col.b);}materials.add(m.material);
 });root.clear();for(const m of materials)m.dispose();const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));root.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7})));
}
function clearLegacyFeatures(manager){
 const r=manager.race,g=manager.game;g.terrain.arcadeRamps=(g.terrain.arcadeRamps||[]).filter(x=>!x.tangenzialeRace);
 for(const root of r.roots)if(/tangenziale-(short-sprint-ramps|race-ramps|bridge-jump-ramps|race-boost-pads)/.test(root.name))g.scene.remove(root);
 for(const c of r.obstacles)g.retire(c);r.obstacles=[];r.obstacleDefs=[];r.ramps=[];r.fakeRamps=[];
 r.__rampsStabilized=true;r.playerRampBoostUntil=0;r.lastBoostRamp=null;
}
export function configureRaceEnvironment(manager,mode,seed=1){
 const r=manager.race;if(!r||r.__secondRace||r.immersion)return false;
 const key=raceOneDifficulty(mode),config=RACE_ENVIRONMENTS[key],g=manager.game,root=new THREE.Group(),random=randomSource(seed),used=[],events=[];
 root.name='race-one-immersion-r28';clearLegacyFeatures(manager);
 const plans=[];
 for(let n=0;n<config.ramps;n++)plans.push({kind:'ramp',fraction:[.14,.33,.51][n],number:n});
 for(let n=0;n<config.traps;n++)plans.push({kind:'trap',fraction:[.23,.44][n],number:n});
 for(let n=0;n<config.parked;n++)plans.push({kind:'parked',fraction:[.08,.20,.29,.40,.56][n],number:n});
 for(let n=0;n<config.moving;n++)plans.push({kind:'moving',fraction:[.36,.59][n],number:n});
 plans.sort((a,b)=>a.fraction-b.fraction);
 for(const plan of plans){
  const side=(plan.number%2?-1:1)*(plan.kind==='parked'?1.95:2.25),event=location(manager,plan.fraction+(random()-.5)*.007,used,2.4,side);
  if(!event)continue;Object.assign(event,{kind:plan.kind,label:{ramp:'SALTO FACOLTATIVO',trap:'RALLENTATORE',parked:'MEZZO FERMO',moving:'TRAFFICO LENTO'}[plan.kind],warned:false});
  if(plan.kind==='ramp'){
   Object.assign(event,{tangenzialeRace:true,kind:'ramp',width:2.4,length:12,rise:config.rise,topY:[event.baseY,event.baseY,event.baseY+config.rise,event.baseY+config.rise],boostPad:{x:event.x-Math.sin(event.yaw)*10.5,z:event.z-Math.cos(event.yaw)*10.5,yaw:event.yaw,width:2.2,length:4.8,used:false}});
   r.ramps.push(event);g.terrain.arcadeRamps.push(event);rampVisual(root,event);
  }else if(plan.kind==='trap'){
   Object.assign(event,{width:2.4,length:4.2,hits:new Set()});trapVisual(root,event);
  }else{
   const styles=plan.kind==='moving'?['rondine','viaggio']:['compact','wagon','utility','officina','campo'];
   const c=g.addCar(event.x,event.z,event.yaw,false,true,styles[plan.number%styles.length]);
   Object.assign(c,{y:event.baseY,speed:0,parked:true,missionUnit:true,fixedSpawn:true,tangenzialeObstacle:true,budgetSleeping:false,name:event.label});
   event.car=c;c.mesh.visible=plan.kind!=='moving';g.pose(c);r.obstacles.push(c);r.obstacleDefs.push({index:event.index,offset:event.side,style:c.style,label:event.label});
   if(plan.kind==='moving')Object.assign(event,{distance:0,activated:false,finished:false,startIndex:event.index,speed:key==='hard'?13:10});
  }
  warningSign(root,g,r,event);events.push(event);
 }
 const audience=crowds(root,g,r,config.crowds);bake(root);g.scene.add(root);r.roots.push(root);
 r.immersion={mode:key,config,seed,events,root,spectators:audience.spectators,next:null,counts:{ramps:r.ramps.length,traps:events.filter(e=>e.kind==='trap').length,parked:events.filter(e=>e.kind==='parked').length,moving:events.filter(e=>e.kind==='moving').length,crowds:audience.groups,spectators:audience.spectators.length}};
 // Suppress nearby ambient cars, saving their state; scheduled race traffic is predictable.
 r.immersion.ambient=[];
 for(const c of g.cars){if(c===r.snapshot.car||c.tangenzialeRace||c.tangenzialeObstacle||c.spec.aircraft||c.spec.watercraft)continue;
  if(r.samples.slice(r.startIndex).some(p=>Math.hypot(c.x-p.x,c.z-p.z)<24&&Math.abs((c.y||0)-p.y)<4)){
   r.immersion.ambient.push({car:c,parked:c.parked,visible:c.mesh.visible,speed:c.speed});c.parked=true;c.speed=0;c.mesh.visible=false;
  }
 }
 return true;
}
function updateMoving(manager,dt){
 const r=manager.race,g=manager.game,lead=Math.max(r.playerProgress||0,...r.ai.map(c=>c.raceProgress||0));
 for(const e of r.immersion.events){if(e.kind!=='moving'||e.finished)continue;
  if(!e.activated){if(lead<e.progress-160)continue;e.activated=true;e.car.mesh.visible=true;}
  e.distance+=e.speed*dt;const end=Math.min(r.samples.length-10,e.startIndex+6),target=r.samples.cumulative[e.startIndex]+e.distance;
  let i=e.startIndex;while(i<end&&r.samples.cumulative[i+1]<target)i++;
  if(i>=end){e.finished=true;e.car.mesh.visible=false;e.car.speed=0;continue;}
  const a=r.samples[i],b=r.samples[i+1],f=clamp((target-r.samples.cumulative[i])/Math.max(1,r.samples.cumulative[i+1]-r.samples.cumulative[i]),0,1),yaw=Math.atan2(b.x-a.x,b.z-a.z),point={x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f},side=e.side-Math.sign(e.side)*.65*Math.sin(Math.min(1,e.distance/160)*Math.PI),q=offset(point,yaw,side),y=surface(g,a,q.x,q.z);
  if(vehicleBlocked(q.x,q.z,yaw,g.collision,e.car.spec,y)){e.finished=true;e.car.speed=0;continue;}
  Object.assign(e.car,{...q,y,yaw,speed:e.speed,parked:true});g.pose(e.car);
 }
}
export function applyRaceHazards(manager){
 const r=manager.race,g=manager.game;if(!r?.immersion||r.phase!=='running')return;
 for(const e of r.immersion.events){if(e.kind!=='trap')continue;
  for(const c of [r.playerCar,...r.ai]){
   if(c.raceFinished||c===r.playerCar&&r.playerFinished||e.hits.has(c))continue;
   const actor=c===r.playerCar?g.state:c,dx=actor.x-e.x,dz=actor.z-e.z,u=dx*Math.cos(e.yaw)-dz*Math.sin(e.yaw),v=dx*Math.sin(e.yaw)+dz*Math.cos(e.yaw);
   if(Math.abs(u)>e.width/2||Math.abs(v)>e.length/2||Math.abs(actor.y-e.baseY)>1.5||c.jump?.airborne)continue;
   e.hits.add(c);actor.speed*=r.immersion.config.penalty;c.speed=actor.speed;
   if(c===r.playerCar)g.toast('RALLENTATORE · velocità ridotta',1.6);
  }
 }
}
const priorConfirm=TangenzialeRace.prototype.openConfirmation;
TangenzialeRace.prototype.openConfirmation=function(...args){
 const out=priorConfirm.apply(this,args),content=typeof document==='undefined'?null:document.getElementById('menuContent');
 const difficulty=document.getElementById('raceOneDifficulty');if(!content||!difficulty)return out;
 const copy=content.querySelector('.about-copy');if(copy)copy.innerHTML='<strong>Gara 1 · scegli la difficoltà</strong><br>Premi Inizia gara per scegliere il tuo mezzo. 3 avversari diversi, 3 turbo su SHIFT. Vittoria +€350 · sconfitta -€100.';
 const label=content.querySelector('label[for="raceOneDifficulty"] strong');if(label)label.textContent='DIFFICOLTÀ · BOT E PERCORSO';
 for(const o of difficulty.options)o.textContent=RACE_ONE_DIFFICULTIES[o.value].name+' · '+RACE_ENVIRONMENTS[o.value].summary;
 difficulty.value=this.selectedRaceDifficulty||'medium';
 document.getElementById('startTangenzialeRace').onclick=()=>{this.selectedRaceDifficulty=difficulty.value;openRaceGarage(this,difficulty.value,{choices:raceVehicleChoices(),spec:raceVehicleSpec,stats:raceVehicleStats,profiles:RACE_PROFILES,profile:raceVehicleProfile});};
 return out;
};
const priorTurbo=TangenzialeRace.prototype.applyPlayerTurbo;
TangenzialeRace.prototype.applyPlayerTurbo=function(dt){const r=this.race;if(!r?.immersion)return priorTurbo.call(this,dt);r.playerCar.raceTurboUntil=r.playerFinished?0:r.playerTurboUntil;};
const priorKey=TangenzialeRace.prototype.keyDown;
TangenzialeRace.prototype.keyDown=function(e){const r=this.race,before=r?.playerTurboUntil||0,out=priorKey.call(this,e);if(r?.immersion&&r.playerTurboUntil>before){activateRaceTurbo(this.game.state,r.playerCar,this.game.state.elapsed,r.playerTurboUntil);this.game.toast('TURBO +'+Math.round((r.playerCar.spec.turboMax/r.playerCar.spec.max-1)*100)+'% · '+r.playerTurbo+' rimasti',1.6);}return out;};
const priorStart=TangenzialeRace.prototype.start;
TangenzialeRace.prototype.start=function(...args){
 if(this.race)return;
 if(this.__nextRaceMode==='second'||typeof window!=='undefined'&&window.PadovaOnline?.connected)return priorStart.apply(this,args);
 const mode=raceOneDifficulty(args[0]?.difficulty||document.getElementById('raceOneDifficulty')?.value),requested=args[0]?.vehicle||this.selectedRaceVehicle||'fulmine',player=eligibleRaceVehicle(VEHICLES[requested])?requested:'fulmine';
 const seed=Number.isFinite(args[0]?.seed)?args[0].seed:hash(Date.now()+':'+Math.random()),random=randomSource(seed),roster=chooseRaceRoster(mode,player,random,this.previousRaceRoster||[]),styles=[player,...roster],game=this.game,add=game.addCar;
 let slot=0,out;
 game.addCar=function(...a){if(a[5]==='fulmine'&&slot<4){a[5]=styles[slot++];const car=add.apply(this,a);car.spec=raceVehicleSpec(car.style);car.raceOneRules=true;car.raceProfile=car.style==='fulmine'?'balanced':raceVehicleProfile(VEHICLES[car.style]);return car;}return add.apply(this,a);};
 try{out=priorStart.apply(this,args);}finally{game.addCar=add;}
 const r=this.race;if(!r||r.__secondRace)return out;
 this.selectedRaceVehicle=player;this.previousRaceRoster=roster;
 // The UI's difficulty wrapper reads its selector. Explicit test/start options also apply.
 if(r.difficulty!==mode){for(const [i,c] of r.ai.entries()){c.raceTuning=RACE_ONE_DIFFICULTIES[mode];c.raceSkill=c.raceTuning.skills[i];c.raceTurbo=c.raceTuning.turbo;}r.difficulty=mode;}
 for(const c of [r.playerCar,...r.ai]){const livery=c.mesh.getObjectByName('tangenziale-livery');if(livery){c.mesh.remove(livery);livery.traverse(m=>{if(m.isMesh)m.geometry.dispose();});}}
 configureRaceEnvironment(this,mode,seed);game.toast(RACE_ONE_DIFFICULTIES[mode].name+' · '+r.playerCar.name+' · '+RACE_ENVIRONMENTS[mode].summary,4);return out;
};
const priorAI=TangenzialeRace.prototype.updateAI;
TangenzialeRace.prototype.updateAI=function(dt){if(this.race?.immersion&&this.race.phase==='running')updateMoving(this,dt);const out=priorAI.call(this,dt);applyRaceHazards(this);return out;};
const priorUpdate=TangenzialeRace.prototype.update;
TangenzialeRace.prototype.update=function(dt){
 const out=priorUpdate.call(this,dt),r=this.race;if(!r?.immersion||r.phase!=='running'||r.playerFinished)return out;
 const next=r.immersion.events.find(e=>e.progress>r.playerProgress+10&&!e.finished);r.immersion.next=next;
 if(next&&!next.warned&&next.progress-r.playerProgress<r.immersion.config.warning){next.warned=true;this.game.toast(next.label+' · '+Math.round(next.progress-r.playerProgress)+' m · '+(next.side<0?'sinistra':'destra'),2.1);}
 return out;
};
function drawEventMap(r){
 const canvas=document.getElementById('tangenzialeCourseMap'),ctx=canvas?.getContext('2d');if(!ctx)return;
 const path=r.samples.slice(r.startIndex),xs=path.map(p=>p.x),zs=path.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),spanX=Math.max(1,maxX-minX),spanZ=Math.max(1,maxZ-minZ),scale=Math.min((canvas.width-20)/spanX,(canvas.height-20)/spanZ),ox=(canvas.width-spanX*scale)/2,oy=(canvas.height-spanZ*scale)/2;
 for(const e of r.immersion.events){if(e.finished||e.progress<r.playerProgress-50)continue;ctx.fillStyle=e.kind==='ramp'?'#55ddea':e.kind==='trap'?'#f8ce4f':'#ef9657';ctx.fillRect(ox+(e.x-minX)*scale-2,canvas.height-(oy+(e.z-minZ)*scale)-2,4,4);}
}
const priorPaint=TangenzialeRace.prototype.paintHud;
TangenzialeRace.prototype.paintHud=function(...args){const out=priorPaint.apply(this,args),r=this.race;if(r?.immersion&&typeof document!=='undefined')queueMicrotask(()=>{
 if(this.race!==r)return;drawEventMap(r);const board=document.getElementById('tangenzialeBoard');if(board)board.style.maxWidth='min(360px,45vw)';const desc=document.getElementById('missionDesc');if(desc){const next=r.immersion.next;desc.textContent=r.playerCar.name+' · '+RACE_ONE_DIFFICULTIES[r.difficulty].name+' · '+(this.game.state.elapsed<r.playerTurboUntil?'TURBO ATTIVO '+Math.max(0,r.playerTurboUntil-this.game.state.elapsed).toFixed(1)+'s · '+Math.round(r.playerCar.spec.turboMax*3.6)+' km/h':'SHIFT · Turbo '+r.playerTurbo+'/3')+' · '+Math.round(r.playerProgress/r.total*100)+'%'+(next?' · '+next.label+' '+Math.round(next.progress-r.playerProgress)+' m':' · X abbandona');}
 });return out;};
const priorBoard=TangenzialeRace.prototype.raceBoard;
TangenzialeRace.prototype.raceBoard=function(){const r=this.race;if(!r?.immersion)return priorBoard.call(this);return priorBoard.call(this).replace(/AUTO ([1-4])(?: · TU)?/g,(_,n)=>{const c=n==='1'?r.playerCar:r.ai[Number(n)-2];return c.name+(n==='1'?' · TU':'');});};
const priorRestore=TangenzialeRace.prototype.restoreSnapshot;
TangenzialeRace.prototype.restoreSnapshot=function(...args){
 const r=this.race;if(r?.immersion){for(const saved of r.immersion.ambient){if(this.game.cars.includes(saved.car)){saved.car.parked=saved.parked;saved.car.speed=saved.speed;saved.car.mesh.visible=saved.visible;}}
  for(const root of r.roots)root.traverse(m=>{if(m.isMesh){if(m.geometry!==cube)m.geometry.dispose();if(root===r.immersion.root)m.material.dispose();}});
 }return priorRestore.apply(this,args);
};
