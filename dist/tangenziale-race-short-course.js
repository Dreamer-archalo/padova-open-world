import * as THREE from './vendor/three.module.js';
import {TangenzialeRace} from './tangenziale-race.js';

const TARGET_RACE_METRES=3800;
const MIN_RACE_METRES=2400;
const SHORT_TRACK_LIMIT=18;
const HIGH_RAMP_FRACTIONS=[.18,.48,.82];
const FAKE_RAMP_FRACTIONS=[.33,.66];
const OBSTACLE_FRACTIONS=[.27,.53,.76];

function yawAt(path,i){const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)];return Math.atan2(b.x-a.x,b.z-a.z);}
function lateral(p,yaw,offset){return {x:p.x+Math.cos(yaw)*offset,z:p.z-Math.sin(yaw)*offset};}
function heightAt(game,p,x=p.x,z=p.z){const y=p?.road?game.terrain.roads?.sample?.(p.road,x,z):NaN;return Number.isFinite(y)?y+.05:game.terrain.height(x,z,p.y);}
function progressAt(r,i){return Math.max(0,(r.samples.cumulative[i]||0)-r.startDistance);}
function horizontalDistance(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function nearestHorizontal(actor,samples,hint=0){let best=Math.max(0,Math.min(samples.length-1,hint)),d=Infinity;const lo=Math.max(0,best-12),hi=Math.min(samples.length-1,best+18);for(let i=lo;i<=hi;i++){const q=horizontalDistance(actor,samples[i]);if(q<d){d=q;best=i;}}if(d>SHORT_TRACK_LIMIT)for(let i=0;i<samples.length;i+=2){const q=horizontalDistance(actor,samples[i]);if(q<d){d=q;best=i;}}return {index:best,d};}
function safeIndex(samples,start,end,fraction){const target=Math.round(start+(end-start)*fraction);let best=target,bestScore=Infinity;for(let delta=0;delta<=12;delta++)for(const sign of delta?[1,-1]:[1]){const i=target+delta*sign;if(i<=start+5||i>=end-4)continue;const p=samples[i],road=p.road;if(!road||road.tunnel||road.crossing||road.b||Number(road.layer)>0)continue;const bend=Math.abs(Math.atan2(Math.sin(yawAt(samples,i+2)-yawAt(samples,i-2)),Math.cos(yawAt(samples,i+2)-yawAt(samples,i-2))));const score=delta+bend*10;if(score<bestScore){bestScore=score;best=i;}}return best;}
function buildOffsetPath(samples,offset,obstacles){return samples.map((p,i)=>{let shift=offset;for(const o of obstacles){const delta=Math.abs(i-o.index);if(delta<=4){const target=o.offset>=0?-1.65:1.65,blend=1-delta/5;shift=offset+(target-offset)*blend;}}return {...p,...lateral(p,yawAt(samples,i),shift)};});}
function wedgeMesh(r,color='#e08d35',fake=false){const root=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color,roughness:.68});const body=new THREE.Mesh(new THREE.BoxGeometry(r.width,fake?.22:.24,r.length),mat);body.position.set(0,(r.rise||.28)/2,0);body.rotation.x=-Math.atan2(r.rise||.28,r.length);body.castShadow=true;body.receiveShadow=true;root.add(body);if(fake){const stripeMat=new THREE.MeshBasicMaterial({color:'#171b20'});for(const z of [-2.5,0,2.5]){const stripe=new THREE.Mesh(new THREE.BoxGeometry(r.width*.9,.04,.55),stripeMat);stripe.position.set(0,.22,z);root.add(stripe);}}root.position.set(r.x,(r.baseY||0)-.03,r.z);root.rotation.y=r.yaw;return root;}
function highRamp(game,r,index,side){const p=r.samples[index],yaw=yawAt(r.samples,index),q=lateral(p,yaw,side*1.55),baseY=heightAt(game,p,q.x,q.z);const width=5.0,length=10.5,rise=2.55;return {kind:'tangenziale-race-ramp-high',tangenzialeRace:true,x:q.x,z:q.z,yaw,width,length,rise,baseY,topY:[baseY,baseY,baseY+rise,baseY+rise]};}
function fakeRamp(game,r,index,side){const p=r.samples[index],yaw=yawAt(r.samples,index),q=lateral(p,yaw,side*.9),baseY=heightAt(game,p,q.x,q.z);return {kind:'tangenziale-race-fake-ramp',tangenzialeRaceFake:true,index,x:q.x,z:q.z,yaw,width:5.4,length:8.5,rise:.28,baseY,lastHit:-Infinity};}
function configureMinimap(active){if(typeof document==='undefined')return;let style=document.getElementById('tangenzialeShortCourseStyle');if(!style){style=document.createElement('style');style.id='tangenzialeShortCourseStyle';style.textContent='body.tangenziale-short-race .minimap{width:320px!important;box-shadow:0 14px 55px #0009;border-color:#ffc56a77!important} body.tangenziale-short-race #minimap{height:230px!important} @media(max-width:800px){body.tangenziale-short-race .minimap{width:230px!important;left:12px!important}body.tangenziale-short-race #minimap{height:170px!important}}';document.head.appendChild(style);}document.body.classList.toggle('tangenziale-short-race',!!active);}
function shortenRace(manager){const r=manager.race,g=manager.game;if(!r||r.__shortCourseConfigured)return;r.__shortCourseConfigured=true;const available=r.total,target=Math.min(TARGET_RACE_METRES,available);if(available>MIN_RACE_METRES&&target<available-160){let finishIndex=r.startIndex+1;for(let i=r.startIndex+1;i<r.samples.length-2;i++){finishIndex=i;if(progressAt(r,i)>=target)break;}finishIndex=safeIndex(r.samples,r.startIndex,finishIndex,1);const old=r.samples,trimmed=old.slice(0,finishIndex+1);trimmed.cumulative=old.cumulative.slice(0,finishIndex+1);trimmed.total=trimmed.cumulative.at(-1)||0;r.samples=trimmed;r.finish=trimmed.at(-1);r.finishYaw=yawAt(trimmed,trimmed.length-1);r.total=Math.max(1,progressAt(r,trimmed.length-1));if(r.finishSet){r.finishSet.position.set(r.finish.x,heightAt(g,r.finish),r.finish.z);r.finishSet.rotation.y=r.finishYaw;}g.state.waypoint={x:r.finish.x,z:r.finish.z,name:'TRAGUARDO · Tangenziale breve'};g.state.route=trimmed.slice(r.startIndex).map(p=>({x:p.x,z:p.z}));for(const c of r.ai)c.path=(c.path||[]).slice(0,trimmed.length);}
 const end=r.samples.length-1;
 for(let i=0;i<r.obstacleDefs.length;i++){const def=r.obstacleDefs[i],car=r.obstacles[i],index=safeIndex(r.samples,r.startIndex,end,OBSTACLE_FRACTIONS[i]);def.index=index;const p=r.samples[index],yaw=yawAt(r.samples,index)+(def.yawOffset||0),q=lateral(p,yawAt(r.samples,index),def.offset||0);Object.assign(car,{x:q.x,z:q.z,y:heightAt(g,p,q.x,q.z),yaw,speed:0,parked:true,budgetSleeping:false,missionUnit:true,fixedSpawn:true});car.mesh.visible=true;g.pose(car);}
 for(const c of r.ai)c.path=buildOffsetPath(r.samples,c.raceOffset||0,r.obstacleDefs);
 g.terrain.arcadeRamps=(g.terrain.arcadeRamps||[]).filter(x=>!x.tangenzialeRace);const rampRoot=r.roots.find(x=>x?.name==='tangenziale-race-ramps');rampRoot?.clear?.();r.ramps=[];r.fakeRamps=[];
 for(const [i,fraction] of HIGH_RAMP_FRACTIONS.entries()){const index=safeIndex(r.samples,r.startIndex,end,fraction),ramp=highRamp(g,r,index,i%2?-1:1);r.ramps.push(ramp);g.terrain.arcadeRamps.push(ramp);rampRoot?.add(wedgeMesh(ramp,i===1?'#d56135':'#d99b36',false));}
 for(const [i,fraction] of FAKE_RAMP_FRACTIONS.entries()){const index=safeIndex(r.samples,r.startIndex,end,fraction),trap=fakeRamp(g,r,index,i%2?1:-1);r.fakeRamps.push(trap);rampRoot?.add(wedgeMesh(trap,'#f0a33b',true));}
 configureMinimap(true);g.toast('SPRINT TANGENZIALE · circa 2 minuti · rampe alte + rampe trappola.',4);
}
function fakeRampHit(manager,r){const s=manager.game.state;if(r.playerFinished||!r.fakeRamps?.length)return;for(const trap of r.fakeRamps){const dx=s.x-trap.x,dz=s.z-trap.z,u=dx*Math.cos(trap.yaw)-dz*Math.sin(trap.yaw),v=dx*Math.sin(trap.yaw)+dz*Math.cos(trap.yaw);if(Math.abs(u)>trap.width/2||Math.abs(v)>trap.length/2)continue;if(s.elapsed-trap.lastHit<1.4)return;trap.lastHit=s.elapsed;s.speed*=.42;r.playerCar.speed=s.speed;manager.game.toast('RAMPA TRAPPOLA · perdi velocità!',1.6);return;}}
function enforceTrack(manager,r){if(r.playerFinished)return;const s=manager.game.state,p=nearestHorizontal(s,r.samples,r.playerHint||r.startIndex);if(p.d<=SHORT_TRACK_LIMIT)return;manager.respawnActor(r.playerCar,r.playerCheckpoint??r.startIndex,-1.2);manager.game.toast('Fuori strada · respawn immediato in pista.',1.8);}

const originalStart=TangenzialeRace.prototype.start;
if(!TangenzialeRace.prototype.__shortCourseUpgrade){
 TangenzialeRace.prototype.__shortCourseUpgrade=true;
 TangenzialeRace.prototype.start=function(...args){const result=originalStart.apply(this,args);if(this.race)shortenRace(this);return result;};
 const originalUpdate=TangenzialeRace.prototype.update;
 TangenzialeRace.prototype.update=function(dt){if(this.race&&!this.race.__shortCourseConfigured)shortenRace(this);originalUpdate.call(this,dt);const r=this.race;if(r?.phase==='running'){enforceTrack(this,r);fakeRampHit(this,r);configureMinimap(true);}else if(!r)configureMinimap(false);};
 const originalRestore=TangenzialeRace.prototype.restoreSnapshot;
 TangenzialeRace.prototype.restoreSnapshot=function(...args){const result=originalRestore.apply(this,args);configureMinimap(false);return result;};
}

export const TANGENZIALE_SHORT_RACE={targetMetres:TARGET_RACE_METRES,minMetres:MIN_RACE_METRES,trackLimit:SHORT_TRACK_LIMIT,highRamps:HIGH_RAMP_FRACTIONS.length,fakeRamps:FAKE_RAMP_FRACTIONS.length};
