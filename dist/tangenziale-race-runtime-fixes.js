import {TangenzialeRace} from './tangenziale-race.js';
import {clamp,dist,angleDiff} from './core.js';
import {vehicleBlocked} from './movement.js';
import {resetGroundMotion} from './vehicle-dynamics.js';
import {respawnCheckpoint} from './tangenziale-race-rules.js';

const PLAYER_OFFROAD_LIMIT=18;
const AI_OFFROAD_LIMIT=26;
const FINISH_PLANE_TOLERANCE=.9;
const FINISH_PROGRESS_WINDOW=62;
const AI_TURBO_PLAN=[.19,.51,.81];
const LAST_RAMP_MAX_FRACTION=.76;
const LAST_RAMP_MAX_RISE=2.05;

function yawAt(samples,i){
 const a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)];
 return Math.atan2(b.x-a.x,b.z-a.z);
}
function lateral(p,yaw,offset){return {x:p.x+Math.cos(yaw)*offset,z:p.z-Math.sin(yaw)*offset};}
function surfaceY(game,p,x=p.x,z=p.z,reference=p.y){
 const y=p?.road?game.terrain.roads?.sample?.(p.road,x,z):NaN;
 if(Number.isFinite(y))return y+.05;
 const fallback=game.terrain.height(x,z,reference);
 return Number.isFinite(fallback)?fallback:(Number.isFinite(reference)?reference:0);
}
function sampleDistance(actor,p){
 const flat=dist(actor,p);
 if(!Number.isFinite(actor.y)||!Number.isFinite(p.y))return flat;
 return Math.hypot(flat,(actor.y-p.y)*3.2);
}
function nearestSample(actor,samples,hint=0){
 let best=clamp(hint,0,samples.length-1),bestD=Infinity;
 const lo=Math.max(0,best-12),hi=Math.min(samples.length-1,best+18);
 for(let i=lo;i<=hi;i++){
  const d=sampleDistance(actor,samples[i]);
  if(d<bestD){bestD=d;best=i;}
 }
 if(bestD>AI_OFFROAD_LIMIT)for(let i=0;i<samples.length;i+=2){
  const d=sampleDistance(actor,samples[i]);
  if(d<bestD){bestD=d;best=i;}
 }
 return {index:best,d:bestD};
}
function nearestSample2D(actor,samples,hint=0){
 let best=clamp(hint,0,samples.length-1),bestD=Infinity;
 const lo=Math.max(0,best-14),hi=Math.min(samples.length-1,best+20);
 for(let i=lo;i<=hi;i++){
  const d=Math.hypot(actor.x-samples[i].x,actor.z-samples[i].z);
  if(d<bestD){bestD=d;best=i;}
 }
 if(bestD>AI_OFFROAD_LIMIT)for(let i=0;i<samples.length;i+=2){
  const d=Math.hypot(actor.x-samples[i].x,actor.z-samples[i].z);
  if(d<bestD){bestD=d;best=i;}
 }
 return {index:best,d:bestD};
}
function progressAt(r,index){return Math.max(0,(r.samples.cumulative?.[index]||0)-(r.startDistance||0));}
function finishIndex(r){
 if(Number.isInteger(r.__finishIndex))return r.__finishIndex;
 let best=Math.max(r.startIndex||0,0),bestD=Infinity;
 for(let i=Math.max(0,r.samples.length-12);i<r.samples.length;i++){
  const d=dist(r.samples[i],r.finish);
  if(d<bestD){bestD=d;best=i;}
 }
 r.__finishIndex=best;
 return best;
}
function crossedFinish(actor,r,progress){
 const fi=finishIndex(r),finish=r.finish||r.samples[fi],yaw=Number.isFinite(r.finishYaw)?r.finishYaw:yawAt(r.samples,fi);
 const dx=actor.x-finish.x,dz=actor.z-finish.z;
 const along=dx*Math.sin(yaw)+dz*Math.cos(yaw);
 const side=dx*Math.cos(yaw)-dz*Math.sin(yaw);
 const roadWidth=Math.max(8,finish.road?.w||8);
 const closeEnough=progress>=Math.max(0,r.total-FINISH_PROGRESS_WINDOW);
 return closeEnough&&along>=-FINISH_PLANE_TOLERANCE&&Math.abs(side)<=Math.max(7,roadWidth*.72);
}
function localToRoute(object,center,yaw){
 const dx=object.x-center.x,dz=object.z-center.z;
 return {forward:dx*Math.sin(yaw)+dz*Math.cos(yaw),side:dx*Math.cos(yaw)-dz*Math.sin(yaw)};
}
function laneBounds(car,road){
 const halfRoad=Math.max(3.7,(road?.w||8)*.5);
 return Math.max(1.25,Math.min(3.45,halfRoad-(car.spec?.width||2)*.5-.28));
}
function chooseLane(manager,car,p,index){
 const r=manager.race,samples=r.samples,center=samples[p.index],routeYaw=yawAt(samples,p.index),bound=laneBounds(car,center.road);
 const base=clamp(Number.isFinite(car.raceOffset)?car.raceOffset:0,-bound,bound);
 const candidates=[-bound,0,bound];
 if(Math.abs(base)>.35)candidates.push(base);
 const hazards=[];
 const scan=Math.max(34,Math.min(88,Math.abs(car.speed||0)*1.45+24));
 for(const other of [...r.obstacles,r.playerCar,...r.ai]){
  if(!other||other===car||other.mesh?.visible===false||other.raceFinished)continue;
  if(Number.isFinite(other.y)&&Number.isFinite(car.y)&&Math.abs(other.y-car.y)>4.5)continue;
  const q=localToRoute(other,center,routeYaw);
  if(q.forward<-5||q.forward>scan)continue;
  hazards.push({other,...q});
 }
 let bestLane=base,bestScore=-Infinity,nearestAhead=Infinity;
 for(const h of hazards)if(h.forward>=0)nearestAhead=Math.min(nearestAhead,h.forward);
 for(const lane of [...new Set(candidates.map(v=>Math.round(v*100)/100))]){
  let score=-Math.abs(lane-base)*.42;
  score+=(index%2?-.04:.04)*lane;
  for(const h of hazards){
   const otherW=h.other.spec?.width||2,needed=(car.spec?.width||2)*.5+otherW*.5+.42;
   const clearance=Math.abs(lane-h.side)-needed;
   const urgency=1-clamp(h.forward/scan,0,1);
   if(clearance<0)score-=220*urgency+55;
   else score+=Math.min(3.5,clearance)*(.7+urgency*2.3);
  }
  if(score>bestScore){bestScore=score;bestLane=lane;}
 }
 return {lane:bestLane,nearestAhead,hazards,bound};
}
function turboCap(car,r,game){
 const turbo=game.state.elapsed<(car.raceTurboUntil||0);
 const interactive=game.state.elapsed<(car.secondInteractiveUntil||0);
 const skill=r.__secondRace?1:clamp(car.raceSkill||1,.975,1.04);
 return car.spec.max*skill+(turbo?6.2:0)+(interactive?8.8:0);
}
function triggerAITurbo(car,r,game){
 if((car.raceTurbo||0)<=0)return;
 const frac=(car.raceProgress||0)/Math.max(1,r.total);
 const i=car.raceTurboIndex||0;
 if(i>=AI_TURBO_PLAN.length||frac<AI_TURBO_PLAN[i])return;
 car.raceTurbo--;car.raceTurboIndex=i+1;car.raceTurboUntil=game.state.elapsed+2.6;
}
function moveRaceAI(manager,car,dt,index,p,laneInfo){
 const r=manager.race,g=manager.game,samples=r.samples;
 const currentRoad=samples[p.index]?.road,bound=laneInfo.bound;
 const wantedLane=clamp(laneInfo.lane,-bound,bound);
 if(!Number.isFinite(car.raceLane))car.raceLane=clamp(car.raceOffset||0,-bound,bound);
 const laneRate=3.8*dt;
 car.raceLane+=clamp(wantedLane-car.raceLane,-laneRate,laneRate);
 const lookahead=clamp(2+Math.floor(Math.abs(car.speed||0)/13),2,7);
 const ti=Math.min(samples.length-1,p.index+lookahead),target=samples[ti],tyaw=yawAt(samples,ti),q=lateral(target,tyaw,car.raceLane);
 const goal=Math.atan2(q.x-car.x,q.z-car.z),diff=angleDiff(goal,car.yaw),futureYaw=yawAt(samples,Math.min(samples.length-1,ti+3)),bend=Math.abs(angleDiff(futureYaw,tyaw));
 let desired=turboCap(car,r,g);
 if(Math.abs(diff)>.7)desired=Math.min(desired,13);
 else if(Math.abs(diff)>.38)desired=Math.min(desired,25);
 if(bend>.42)desired=Math.min(desired,20);
 else if(bend>.24)desired=Math.min(desired,31);
 if(laneInfo.nearestAhead<13)desired=Math.min(desired,7);
 else if(laneInfo.nearestAhead<22)desired=Math.min(desired,18);
 const accel=14.8,brake=Math.max(18,car.spec.brake||20),turnRate=1.95;
 car.speed+=clamp(desired-car.speed,-brake*dt,accel*dt);
 const nextYaw=car.yaw+clamp(diff,-turnRate*dt,turnRate*dt);
 if(Number.isFinite(nextYaw))car.yaw=nextYaw;
 const steps=Math.max(1,Math.ceil(Math.abs(car.speed)*dt/.65)),step=dt/steps;
 let moved=0,blocked=false;
 for(let n=0;n<steps;n++){
  const nx=car.x+Math.sin(car.yaw)*car.speed*step,nz=car.z+Math.cos(car.yaw)*car.speed*step;
  const guideIndex=Math.min(samples.length-1,p.index+Math.max(1,Math.round((n+1)/steps*lookahead))),guide=samples[guideIndex];
  let ny=surfaceY(g,guide,nx,nz,car.y);
  // Bridge and flyover samples are authoritative: never snap an AI car to the road underneath.
  if((guide.road?.b||guide.road?.crossing||Number(guide.road?.layer)>0)&&Number.isFinite(guide.y)&&Math.abs(ny-guide.y)>2.2)ny=guide.y;
  if(!Number.isFinite(nx)||!Number.isFinite(nz)||!Number.isFinite(ny)||vehicleBlocked(nx,nz,car.yaw,g.collision,car.spec,ny)){
   blocked=true;car.speed=Math.max(0,car.speed*.25);break;
  }
  moved+=Math.hypot(nx-car.x,nz-car.z);car.x=nx;car.z=nz;car.y=ny;
 }
 car.stuck=moved<.04?(car.stuck||0)+dt:Math.max(0,(car.stuck||0)-dt*2);
 if(blocked)car.avoidBlockedUntil=g.state.elapsed+1.2;
 g.pose(car);
}
function updateSmartAI(dt){
 const r=this.race,g=this.game;if(!r)return;
 for(const [i,c] of r.ai.entries()){
  this.ensureRacer(c,i+1,c.raceOffset??0);
  if(c.raceFinished){c.speed=0;c.parked=true;g.pose(c);continue;}
  const p=nearestSample2D(c,r.samples,c.raceHint??r.startIndex??0);
  this.updateCheckpoint(c,p,'raceHint','raceCheckpoint');
  c.raceProgress=Math.max(c.raceProgress||0,progressAt(r,p.index));
  if(crossedFinish(c,r,c.raceProgress)){this.markFinished(i+1,c);continue;}
  triggerAITurbo(c,r,g);
  const laneInfo=chooseLane(this,c,p,i+1);
  moveRaceAI(this,c,dt,i+1,p,laneInfo);
  const after=nearestSample2D(c,r.samples,c.raceHint??p.index);
  c.raceHint=after.index;c.raceProgress=Math.max(c.raceProgress||0,progressAt(r,after.index));
  if(after.d>AI_OFFROAD_LIMIT||(c.stuck||0)>3.2){
   const cp=respawnCheckpoint(r.startIndex||0,c.raceCheckpoint??r.startIndex??0,r.samples.length);
   this.respawnActor(c,cp,c.raceLane??c.raceOffset??0);c.raceLane=c.raceOffset??0;
  }
 }
}
function updatePlayerFinishCorrectly(){
 const r=this.race,s=this.game.state;if(!r)return false;
 if(r.playerFinished){Object.assign(s,{speed:0,vy:0});r.playerCar.speed=0;r.playerCar.parked=true;this.game.pose(r.playerCar);return true;}
 if(s.car!==r.playerCar||s.mode!=='car'){
  this.respawnActor(r.playerCar,respawnCheckpoint(r.startIndex||0,r.playerCheckpoint??r.startIndex??0,r.samples.length),-1.2);s.car=r.playerCar;s.mode='car';this.game.toast('Gara ripristinata · torni in pista.',2);return true;
 }
 if(s.health<=0){this.respawnActor(r.playerCar,respawnCheckpoint(r.startIndex||0,r.playerCheckpoint??r.startIndex??0,r.samples.length),-1.2);this.game.toast('Auto ripristinata all’ultimo checkpoint.',2.5);return true;}
 const previous=r.playerHint,p=nearestSample2D(s,r.samples,r.playerHint??r.startIndex??0);
 r.playerHint=p.index;r.playerProgress=Math.max(r.playerProgress||0,progressAt(r,p.index));
 if(p.d<=15)this.updateCheckpoint(r.playerCar,p,'raceHint','raceCheckpoint');
 if(p.d<=15&&p.index>=(r.playerCheckpoint??r.startIndex??0)&&p.index<=(previous??p.index)+6)r.playerCheckpoint=p.index;
 if(p.d>PLAYER_OFFROAD_LIMIT||!Number.isFinite(s.x)||!Number.isFinite(s.z)||!Number.isFinite(s.y)){
  this.respawnActor(r.playerCar,respawnCheckpoint(r.startIndex||0,r.playerCheckpoint??r.startIndex??0,r.samples.length),-1.2);this.game.toast('Fuori tracciato · respawn all’ultimo checkpoint valido.',2);return true;
 }
 if(crossedFinish(s,r,r.playerProgress))this.markFinished(0,r.playerCar);
 return true;
}
function rampIndex(r,ramp){
 if(Number.isInteger(ramp.index))return clamp(ramp.index,0,r.samples.length-1);
 let best=0,bestD=Infinity;for(let i=0;i<r.samples.length;i++){const d=Math.hypot(ramp.x-r.samples[i].x,ramp.z-r.samples[i].z);if(d<bestD){bestD=d;best=i;}}return best;
}
function rampSpotSafe(r,index){
 if(index<8||index>r.samples.length-10)return false;
 const a=Math.max(2,index-4),b=Math.min(r.samples.length-3,index+5);
 for(let i=a;i<=b;i++){
  const road=r.samples[i]?.road;
  if(!road||road.tunnel||road.crossing||road.b||Number(road.layer)>0||road.w<7.8)return false;
 }
 const bend=Math.abs(angleDiff(yawAt(r.samples,a),yawAt(r.samples,b)));
 const grade=Math.abs((r.samples[b].y||0)-(r.samples[a].y||0))/Math.max(1,dist(r.samples[a],r.samples[b]));
 return bend<.14&&grade<.055;
}
function findSafeRampIndex(r,target,minIndex=8){
 const hi=Math.min(r.samples.length-10,Math.floor((r.samples.length-1)*.82)),base=clamp(target,minIndex,hi);
 for(let d=0;d<=24;d++)for(const sign of d?[1,-1]:[1]){
  const i=base+d*sign;if(i<minIndex||i>hi)continue;if(rampSpotSafe(r,i))return i;
 }
 return base;
}
function updateRampVisuals(r,oldX,oldZ,ramp){
 const roots=(r.roots||[]).filter(root=>/tangenziale-(short-sprint-ramps|second-race-features|race-ramps)/.test(root?.name||''));
 for(const root of roots)for(const child of root.children||[]){
  if(Math.hypot((child.position?.x||0)-oldX,(child.position?.z||0)-oldZ)>2.2)continue;
  if(child.isGroup){
   child.position.set(ramp.x,ramp.baseY,ramp.z);child.rotation.y=ramp.yaw;
   for(const mesh of child.children||[])if(mesh.isMesh&&Math.abs(mesh.rotation.x||0)>.01){mesh.position.y=ramp.rise*.5;mesh.rotation.x=-Math.atan2(ramp.rise,ramp.length);}
  }else if(child.isMesh){
   child.position.set(ramp.x,ramp.baseY+ramp.rise*.5-.05,ramp.z);child.rotation.order='YXZ';child.rotation.y=ramp.yaw;child.rotation.x=-Math.atan2(ramp.rise,ramp.length);
  }
 }
}
function relocateRamp(manager,ramp,newIndex,isLast=false){
 const r=manager.race,g=manager.game,oldX=ramp.x,oldZ=ramp.z,oldIndex=rampIndex(r,ramp),oldP=r.samples[oldIndex],oldYaw=yawAt(r.samples,oldIndex);
 const oldSide=(ramp.x-oldP.x)*Math.cos(oldYaw)-(ramp.z-oldP.z)*Math.sin(oldYaw),p=r.samples[newIndex],yaw=yawAt(r.samples,newIndex),side=clamp(oldSide,-1.75,1.75),q=lateral(p,yaw,side);
 ramp.index=newIndex;ramp.x=q.x;ramp.z=q.z;ramp.yaw=yaw;ramp.baseY=surfaceY(g,p,q.x,q.z,p.y);
 if(isLast)ramp.rise=Math.min(ramp.rise||LAST_RAMP_MAX_RISE,LAST_RAMP_MAX_RISE);
 ramp.topY=[ramp.baseY,ramp.baseY,ramp.baseY+(ramp.rise||0),ramp.baseY+(ramp.rise||0)];
 const behind=(ramp.length||10)/2+4.8,s=Math.sin(yaw),c=Math.cos(yaw);
 if(ramp.boostPad)Object.assign(ramp.boostPad,{x:q.x-s*behind,z:q.z-c*behind,yaw,width:(ramp.width||5)*.92,length:5.2});
 if(ramp.interactivePad)Object.assign(ramp.interactivePad,{x:q.x-s*behind,z:q.z-c*behind,yaw,width:(ramp.width||5)*.95,length:5.4});
 updateRampVisuals(r,oldX,oldZ,ramp);
}
function stabilizeRamps(manager){
 const r=manager.race;if(!r||r.__rampsStabilized)return;r.__rampsStabilized=true;
 const ramps=(r.ramps||[]).filter(x=>x?.tangenzialeRace);
 if(!ramps.length)return;
 let previous=(r.startIndex||0)+6;
 for(let i=0;i<ramps.length;i++){
  const ramp=ramps[i],last=i===ramps.length-1,current=rampIndex(r,ramp),maxLast=Math.floor((r.samples.length-1)*LAST_RAMP_MAX_FRACTION),target=last?Math.min(current,maxLast):current;
  const next=findSafeRampIndex(r,target,previous+8);
  if(next!==current||!rampSpotSafe(r,current)||last&&(current>maxLast||(ramp.rise||0)>LAST_RAMP_MAX_RISE))relocateRamp(manager,ramp,next,last);
  previous=next;
 }
}
function localRamp(actor,ramp){
 const dx=actor.x-ramp.x,dz=actor.z-ramp.z;
 return {u:dx*Math.cos(ramp.yaw)-dz*Math.sin(ramp.yaw),v:dx*Math.sin(ramp.yaw)+dz*Math.cos(ramp.yaw)};
}
function recoverRampFailure(manager,dt){
 const r=manager.race,s=manager.game.state;if(!r||r.phase!=='running'||r.playerFinished)return;
 const car=r.playerCar;
 if(!Number.isFinite(s.x)||!Number.isFinite(s.z)||!Number.isFinite(s.y)||!Number.isFinite(s.speed)){
  manager.respawnActor(car,respawnCheckpoint(r.startIndex||0,r.playerCheckpoint??r.startIndex??0,r.samples.length),-1.2);manager.game.toast('Fisica gara ripristinata.',1.5);return;
 }
 let onRamp=null;
 for(const ramp of r.ramps||[]){const q=localRamp(s,ramp);if(Math.abs(q.u)<ramp.width*.62&&Math.abs(q.v)<ramp.length*.68){onRamp=ramp;break;}}
 if(!onRamp){r.__rampStuck=0;return;}
 if(Math.abs(s.speed)<.55)r.__rampStuck=(r.__rampStuck||0)+dt;else r.__rampStuck=0;
 const guide=nearestSample2D(s,r.samples,r.playerHint??r.startIndex??0),expected=r.samples[guide.index]?.y;
 const verticalBad=Number.isFinite(expected)&&(s.y<expected-5||s.y>expected+30);
 if(r.__rampStuck<1.05&&!verticalBad)return;
 const idx=Math.min(r.samples.length-3,rampIndex(r,onRamp)+5);manager.respawnActor(car,idx,-1.15);
 const restart=Math.min(car.spec.max*.55,34);car.speed=restart;s.speed=restart;r.playerHint=idx;r.playerCheckpoint=Math.max(r.playerCheckpoint||0,idx);r.__rampStuck=0;manager.game.toast('Rampa ripristinata · gara continua.',1.5);
}
function prepareRace(manager){
 const r=manager.race;if(!r||r.__runtimeRaceFixes)return;r.__runtimeRaceFixes=true;r.__finishIndex=null;
 stabilizeRamps(manager);
 for(const [i,c] of r.ai.entries()){c.raceLane=Number.isFinite(c.raceOffset)?c.raceOffset:0;c.stuck=0;c.raceIndex=i+1;}
}

const PREVIOUS_UPDATE=TangenzialeRace.prototype.update;
TangenzialeRace.prototype.updateAI=updateSmartAI;
TangenzialeRace.prototype.updatePlayer=updatePlayerFinishCorrectly;
TangenzialeRace.prototype.update=function(dt){
 if(this.race)prepareRace(this);
 const out=PREVIOUS_UPDATE.call(this,dt);
 if(this.race){recoverRampFailure(this,dt);if(this.race.phase==='running')this.game.state.wanted=0;}
 return out;
};

export const RACE_RUNTIME_FIXES={
 finishPlane:true,playerOffroadLimit:PLAYER_OFFROAD_LIMIT,aiOffroadLimit:AI_OFFROAD_LIMIT,adaptiveLaneAI:true,bridgeSurfaceSolver:true,lastRampMaxFraction:LAST_RAMP_MAX_FRACTION,lastRampMaxRise:LAST_RAMP_MAX_RISE
};
