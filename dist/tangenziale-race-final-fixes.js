import {TangenzialeRace} from './tangenziale-race.js';
import {clamp} from './core.js';

const CLEAN_FINAL_METRES=1350;
const COLLISION_FILTER_METRES=1500;
const STRUCTURE_IGNORE_KINDS=new Set(['deck','pier','underpass-pier','underpass-lintel','underpass-arch']);
let activeManager=null;

function progressAt(r,index){
 const start=r.startDistance||0,value=r.samples.cumulative?.[index];
 return Math.max(0,Number.isFinite(value)?value-start:0);
}
function nearestIndex(r,actor,hint=r.playerHint||r.startIndex||0){
 let best=clamp(hint,0,r.samples.length-1),bestD=Infinity;
 const lo=Math.max(0,best-18),hi=Math.min(r.samples.length-1,best+22);
 for(let i=lo;i<=hi;i++){
  const p=r.samples[i],d=Math.hypot(actor.x-p.x,actor.z-p.z);
  if(d<bestD){bestD=d;best=i;}
 }
 if(bestD>55)for(let i=0;i<r.samples.length;i+=2){
  const p=r.samples[i],d=Math.hypot(actor.x-p.x,actor.z-p.z);
  if(d<bestD){bestD=d;best=i;}
 }
 return best;
}
function remaining(r){return Math.max(0,r.total-(r.playerProgress||0));}
function routeClearance(r,item){
 const cx=Number.isFinite(item.x)?item.x:(item.minX+item.maxX)/2,cz=Number.isFinite(item.z)?item.z:(item.minZ+item.maxZ)/2;
 const hint=clamp(r.playerHint||0,0,r.samples.length-1),lo=Math.max(0,hint-10),hi=Math.min(r.samples.length-1,hint+18);
 let best=Infinity,width=8;
 for(let i=lo;i<=hi;i++){
  const p=r.samples[i],d=Math.hypot(cx-p.x,cz-p.z);
  if(d<best){best=d;width=Number(p.road?.w)||8;}
 }
 return {distance:best,width};
}
function shouldIgnoreStructure(r,item){
 if(!item||!STRUCTURE_IGNORE_KINDS.has(item.kind))return false;
 const q=routeClearance(r,item);
 if(item.kind==='deck')return q.distance<=Math.max(6,q.width*.65);
 return q.distance<=Math.max(3.2,q.width*.34);
}
function installCollisionGuard(manager){
 const collision=manager.game.collision;if(!collision||collision.__tangenzialeFinalGuard)return;
 const original=collision.near.bind(collision);collision.__tangenzialeFinalGuard=true;collision.__tangenzialeOriginalNear=original;
 collision.near=function(x,z,radius=0){
  const found=original(x,z,radius),m=activeManager,race=m?.race,state=m?.game?.state;
  if(!race?.__secondRace||race.phase!=='running'||remaining(race)>COLLISION_FILTER_METRES||!state)return found;
  // Only relax bad bridge/support geometry for collision queries around the player's
  // car. Buildings, guardrails, medians and unrelated world collision remain intact.
  if(Math.hypot(x-state.x,z-state.z)>18)return found;
  const filtered=new Set();for(const item of found)if(!shouldIgnoreStructure(race,item))filtered.add(item);return filtered;
 };
}
function cleanSecondRaceFinish(manager){
 const r=manager.race,g=manager.game;if(!r?.__secondRace||r.__finalSectionClean||r.phase!=='running'||remaining(r)>CLEAN_FINAL_METRES)return;
 r.__finalSectionClean=true;
 // At this point all stunt content is behind the player or close enough to the
 // finish to become a liability. The last 1.35 km is deliberately a clean drive.
 g.terrain.arcadeRamps=(g.terrain.arcadeRamps||[]).filter(x=>!x?.secondRace&&!/^tangenziale-race-(?:interactive-ramp|ramp-second)$/.test(x?.kind||''));
 for(const root of r.roots||[])if(root?.name==='tangenziale-second-race-features')root.visible=false;
 for(const car of r.obstacles||[]){if(!car)continue;car.speed=0;car.parked=true;if(car.mesh)car.mesh.visible=false;}
 r.decelerators=[];r.interactiveRamps=[];
 g.toast('ULTIMO TRATTO · pista libera fino al traguardo',1.8);
}
function keepFinalRoadLive(manager,dt){
 const r=manager.race,s=manager.game.state;if(!r?.__secondRace||r.phase!=='running'||remaining(r)>CLEAN_FINAL_METRES||r.playerFinished)return;
 const current=nearestIndex(r,s),p=r.samples[current];
 if(!p)return;
 const roadY=p.road?manager.game.terrain.roads?.sample?.(p.road,s.x,s.z):NaN;
 if(Number.isFinite(roadY)&&Math.abs(s.y-roadY)>.85&&!r.playerCar.jump?.airborne){
  s.y=roadY+.05;r.playerCar.y=s.y;manager.game.pose(r.playerCar);
 }
 // If a bad world structure cancels movement in the final corridor, recover onto
 // the next valid road sample instead of allowing a permanent freeze.
 const last=r.__finalMotionSample||{x:s.x,z:s.z};const moved=Math.hypot(s.x-last.x,s.z-last.z);r.__finalMotionSample={x:s.x,z:s.z};
 const speed=Math.abs(Number(s.speed)||0),previousSpeed=Math.abs(Number(r.__finalPreviousSpeed)||0),suddenStop=previousSpeed>8&&speed<1.2&&moved<.05;r.__finalPreviousSpeed=speed;
 if((speed>3&&moved<.018)||suddenStop)r.__finalHardBlock=(r.__finalHardBlock||0)+dt*(suddenStop?8:1);else r.__finalHardBlock=Math.max(0,(r.__finalHardBlock||0)-dt*3);
 if((r.__finalHardBlock||0)<.48)return;
 const idx=Math.min(r.samples.length-3,current+2),next=r.samples[idx],yaw=Math.atan2(r.samples[Math.min(r.samples.length-1,idx+1)].x-r.samples[Math.max(0,idx-1)].x,r.samples[Math.min(r.samples.length-1,idx+1)].z-r.samples[Math.max(0,idx-1)].z),y=next.road?manager.game.terrain.roads?.sample?.(next.road,next.x,next.z):next.y;
 const restart=Math.max(12,Math.min(Math.max(speed,previousSpeed*.72),r.playerCar.spec.max*.68));
 Object.assign(r.playerCar,{x:next.x,z:next.z,y:Number.isFinite(y)?y+.05:next.y,yaw,speed:restart});
 Object.assign(s,{x:r.playerCar.x,z:r.playerCar.z,y:r.playerCar.y,yaw:r.playerCar.yaw,speed:r.playerCar.speed,vy:0});
 r.playerHint=idx;r.playerCheckpoint=Math.max(r.playerCheckpoint||0,idx);r.playerProgress=Math.max(r.playerProgress||0,progressAt(r,idx));r.__finalHardBlock=0;r.__finalPreviousSpeed=restart;manager.game.pose(r.playerCar);
}
function showFinish(){
 if(typeof document==='undefined')return;let el=document.getElementById('raceFinishFlash');
 if(!el){el=document.createElement('div');el.id='raceFinishFlash';el.style.cssText='position:fixed;left:50%;top:33%;transform:translate(-50%,-50%);z-index:120;pointer-events:none;font-family:Inter,system-ui,sans-serif;font-weight:1000;font-size:clamp(72px,12vw,150px);letter-spacing:.03em;color:#fff;text-shadow:0 5px 28px #000,0 0 10px rgba(255,197,106,.75);opacity:0;transition:opacity .12s ease';document.body.appendChild(el);}
 el.textContent='FINISH!';el.style.opacity='1';clearTimeout(el.__hideTimer);el.__hideTimer=setTimeout(()=>{el.style.opacity='0';},2400);
}

const PREVIOUS_UPDATE=TangenzialeRace.prototype.update;
const PREVIOUS_MARK=TangenzialeRace.prototype.markFinished;
TangenzialeRace.prototype.update=function(dt){
 activeManager=this;installCollisionGuard(this);
 const out=PREVIOUS_UPDATE.call(this,dt);
 if(this.race?.__secondRace){cleanSecondRaceFinish(this);keepFinalRoadLive(this,dt);}
 return out;
};
TangenzialeRace.prototype.markFinished=function(index,car){
 const r=this.race,was=r?.finishTimes?.[index];const out=PREVIOUS_MARK.call(this,index,car);
 if(index===0&&was===null&&r?.finishTimes?.[0]!==null)showFinish();return out;
};

export const RACE_FINAL_FIXES={cleanFinalMetres:CLEAN_FINAL_METRES,collisionFilterMetres:COLLISION_FILTER_METRES,finishBanner:'FINISH!',bridgeCollisionGuard:true};
