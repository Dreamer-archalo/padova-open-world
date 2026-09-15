import * as THREE from './vendor/three.module.js';
import {TangenzialeRace} from './tangenziale-race.js';
import {createWedgeCar} from './sport-models.js';
import {followRoad} from './chase-routing.js';
import {resetGroundMotion} from './vehicle-dynamics.js';
import {clamp,dist} from './core.js';
import {respawnCheckpoint,formatRaceTime} from './tangenziale-race-rules.js';

const RACE_LABEL='GARA TANGENZIALE 2 · SETTE SPORTIVE';
const AI_COUNT=6,TURBO_CHARGES=3,TURBO_SECONDS=2.6;
const TARGET_METRES=4100,MIN_METRES=3600,START_ROUTE_SEPARATION=2200,START_WORLD_SEPARATION=900,OFFROAD_LIMIT=18;
const RAMP_FRACTIONS=[.12,.26,.39,.53,.68,.84],INTERACTIVE_RAMP_INDEXES=new Set([1,4]);
const DECEL_FRACTIONS=[.20,.46,.73,.91];
const OBSTACLE_FRACTIONS=[.16,.30,.42,.56,.67,.78,.88];
const COLORS=['#e53935','#f4d13d','#39b86b','#3084e8','#111318','#f2f2ee','#ef67b2'];
const COLOR_NAMES=['ROSSA','GIALLA','VERDE','BLU','NERA','BIANCA','ROSA'];
const GRID=[
 {side:-1.55,back:0},{side:1.55,back:0},
 {side:-1.55,back:7.2},{side:1.55,back:7.2},
 {side:-1.55,back:14.4},{side:1.55,back:14.4},
 {side:0,back:21.6}
];
const AI_OFFSETS=[-1.55,1.55,-.55,.55,-1.9,1.9];
const TURBO_PLAN=[.22,.52,.81];
const MODEL_FORMS=[
 {w:1.88,l:4.28,h:1.04,wing:false},
 {w:2.03,l:4.62,h:1.10,wing:true},
 {w:1.94,l:4.42,h:1.02,wing:false},
 {w:2.06,l:4.76,h:1.13,wing:true},
 {w:1.91,l:4.50,h:1.00,wing:true},
 {w:2.00,l:4.34,h:1.08,wing:false},
 {w:1.97,l:4.68,h:1.05,wing:true}
];
const OBSTACLE_STYLES=['truck','wagon','utility','officina','campo','corriere','sedan'];
const OBSTACLE_LABELS=['CAMION','AUTO FERMA','FURGONE','VAN LAVORI','PICKUP','CORRIERE','AUTO GUASTA'];
let activeManager=null;

function yawAt(path,i){const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)];return Math.atan2(b.x-a.x,b.z-a.z);}
function lateral(p,yaw,offset){return {x:p.x+Math.cos(yaw)*offset,z:p.z-Math.sin(yaw)*offset};}
function heightAt(game,p,x=p.x,z=p.z){const y=p?.road?game.terrain.roads?.sample?.(p.road,x,z):NaN;return Number.isFinite(y)?y+.05:game.terrain.height(x,z,p.y);}
function localPoint(actor,feature){const dx=actor.x-feature.x,dz=actor.z-feature.z;return {u:dx*Math.cos(feature.yaw)-dz*Math.sin(feature.yaw),v:dx*Math.sin(feature.yaw)+dz*Math.cos(feature.yaw)};}
function sampleDistance(actor,p){const flat=dist(actor,p);if(!Number.isFinite(actor.y)||!Number.isFinite(p.y))return flat;return Math.hypot(flat,(actor.y-p.y)*4);}
function nearestSample(actor,samples,hint=0){let best=clamp(hint,0,samples.length-1),bestD=Infinity;const lo=Math.max(0,best-11),hi=Math.min(samples.length-1,best+16);for(let i=lo;i<=hi;i++){const d=sampleDistance(actor,samples[i]);if(d<bestD){bestD=d;best=i;}}if(bestD>OFFROAD_LIMIT)for(let i=0;i<samples.length;i+=2){const d=sampleDistance(actor,samples[i]);if(d<bestD){bestD=d;best=i;}}return {index:best,d:bestD};}
function progressAt(r,index){return Math.max(0,r.samples.cumulative[index]||0);}
function samplePolyline(path,spacing=28){if(path.length<2)return Object.assign(path.map(p=>({...p})),{cumulative:[0],total:0});const out=[{...path[0]}],cum=[0];let carry=0,total=0;for(let i=1;i<path.length;i++){let a={...path[i-1]},b=path[i],seg=dist(a,b);while(carry+seg>=spacing){const need=spacing-carry,t=need/Math.max(seg,.001),p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,road:b.road||a.road};total+=spacing;out.push(p);cum.push(total);a=p;seg=dist(a,b);carry=0;}carry+=seg;}const last=path.at(-1);if(dist(out.at(-1),last)>3){total+=dist(out.at(-1),last);out.push({...last});cum.push(total);}return Object.assign(out,{cumulative:cum,total});}
function prepareFullSamples(game,path){const samples=samplePolyline(path||[]);for(const p of samples)p.y=heightAt(game,p);return samples;}
function safeIndex(samples,fraction,{margin=5}={}){const target=Math.round((samples.length-1)*fraction);for(let d=0;d<=15;d++)for(const sign of d?[1,-1]:[1]){const i=target+d*sign;if(i<=margin||i>=samples.length-margin)continue;const road=samples[i]?.road;if(!road||road.tunnel||road.crossing||road.b||Number(road.layer)>0)continue;const bend=Math.abs(Math.atan2(Math.sin(yawAt(samples,i-2)-yawAt(samples,i+2)),Math.cos(yawAt(samples,i-2)-yawAt(samples,i+2))));if(bend>.32)continue;return i;}return clamp(target,margin+1,samples.length-margin-1);}
function routeWithDetours(samples,baseOffset,obstacles){return samples.map((p,i)=>{let shift=baseOffset;for(const o of obstacles){const d=Math.abs(i-o.index);if(d<=5){const target=o.offset>=0?-1.95:1.95,blend=1-d/6;shift=baseOffset+(target-baseOffset)*blend;}}return {...p,...lateral(p,yawAt(samples,i),shift)};});}
function safeStartSample(samples,i){const p=samples[i],road=p?.road;if(!road||road.tunnel||road.crossing||road.b||Number(road.layer)>0||road.w<8)return false;const bend=Math.abs(Math.atan2(Math.sin(yawAt(samples,i-2)-yawAt(samples,i+2)),Math.cos(yawAt(samples,i-2)-yawAt(samples,i+2))));return bend<.20;}

function chooseSecondWindow(r,samples){
 const cum=samples.cumulative||[],base=r.start;let baseIndex=0,bestBase=Infinity;for(let i=0;i<samples.length;i++){const d=dist(samples[i],base);if(d<bestBase){bestBase=d;baseIndex=i;}}
 if(samples.length<40||!cum.length)return null;
 const baseD=cum[baseIndex]||0,total=cum.at(-1)||samples.total||0;
 let best=null;
 for(const minRouteSep of [START_ROUTE_SEPARATION,1500,900]){
  for(let i=5;i<samples.length-20;i++){
   if(!safeStartSample(samples,i))continue;
   const routeSep=Math.abs((cum[i]||0)-baseD),worldSep=dist(samples[i],base);
   if(routeSep<minRouteSep||worldSep<(minRouteSep===START_ROUTE_SEPARATION?START_WORLD_SEPARATION:550))continue;
   const remaining=total-(cum[i]||0);if(remaining<MIN_METRES)continue;
   const desired=Math.min(TARGET_METRES,remaining-20);let end=i+1;
   while(end<samples.length-2&&(cum[end]-cum[i])<desired)end++;
   if(end>=samples.length-2)end=samples.length-3;
   const length=(cum[end]||0)-(cum[i]||0);if(length<MIN_METRES)continue;
   const score=worldSep*2+routeSep-Math.abs(TARGET_METRES-length)*.25;
   if(!best||score>best.score)best={start:i,end,length,score,routeSep,worldSep};
  }
  if(best)break;
 }
 if(!best)return null;
 const slice=samples.slice(best.start,best.end+1),origin=cum[best.start]||0;
 slice.cumulative=cum.slice(best.start,best.end+1).map(v=>v-origin);
 slice.total=slice.cumulative.at(-1)||best.length;
 return {samples:slice,length:slice.total,routeSep:best.routeSep,worldSep:best.worldSep};
}

function box(root,color,x,y,z,w,h,d,basic=false){const mat=basic?new THREE.MeshBasicMaterial({color}):new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.08});const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=!basic;mesh.receiveShadow=!basic;root.add(mesh);return mesh;}
function replaceRaceMesh(game,car,index){
 const f=MODEL_FORMS[index],old=car.mesh,mesh=createWedgeCar(COLORS[index],f.w,f.l,f.h,f.wing);
 const kit=new THREE.Group();kit.name='second-race-kit';
 const accent=index===4?'#f2f2ee':'#171d22';
 if(index%3===0){box(kit,accent,0,.72,.65,f.w*.12,.035,1.75,true);box(kit,accent,0,.74,-.75,f.w*.12,.035,1.15,true);}
 if(index%3===1){for(const side of [-1,1])box(kit,accent,side*f.w*.47,.28,0,.08,.08,f.l*.68,true);}
 if(index%3===2){box(kit,accent,0,1.17,-f.l*.26,f.w*.82,.07,.28,true);}
 if(index===5){for(const side of [-1,1])box(kit,'#b9c1c5',side*.32,.76,.62,.08,.035,1.55,true);}
 if(index===6){for(const side of [-1,1]){const canard=box(kit,'#20262c',side*f.w*.42,.32,f.l*.42,.36,.05,.26,true);canard.rotation.y=side*.16;}}
 mesh.add(kit);mesh.userData.secondRaceColor=COLORS[index];mesh.userData.secondRaceName=COLOR_NAMES[index];
 game.scene.remove(old);car.mesh=mesh;game.scene.add(mesh);game.pose(car);
 car.name=COLOR_NAMES[index]+' · SPORTIVA 0'+(index+1);
}
function gridPose(game,r,cfg){const base={x:r.start.x-Math.sin(r.startYaw)*cfg.back,z:r.start.z-Math.cos(r.startYaw)*cfg.back},p=lateral(base,r.startYaw,cfg.side);return {...p,y:heightAt(game,r.start,p.x,p.z)};}
function removeBaseRaceFeatures(game,r){
 game.terrain.arcadeRamps=(game.terrain.arcadeRamps||[]).filter(x=>!x.tangenzialeRace);
 const removable=/tangenziale-(race-ramps|bridge-jump-ramps|race-boost-pads|short-sprint-ramps|second-race-features)/;
 for(const root of r.roots||[])if(removable.test(root?.name||''))game.scene.remove(root);
 r.roots=(r.roots||[]).filter(root=>!removable.test(root?.name||''));
 r.ramps=[];r.fakeRamps=[];r.interactiveRamps=[];r.decelerators=[];
}
function rampVisual(root,r,index){const mesh=box(root,index%2?'#d88a32':'#c7672d',r.x,(r.baseY+r.baseY+r.rise)*.5-.05,r.z,r.width,.22,r.length);mesh.rotation.order='YXZ';mesh.rotation.y=r.yaw;mesh.rotation.x=-Math.atan2(r.rise,r.length);if(r.interactive){const gate=new THREE.Group();gate.position.set(r.x,r.baseY,r.z);gate.rotation.y=r.yaw;for(const side of [-1,1])box(gate,'#43e2ff',side*r.width*.48,1.05,-r.length*.72,.08,2.1,.08,true);const lamp=box(gate,'#43e2ff',0,2.05,-r.length*.72,r.width,.10,.12,true);r.pulseLamp=lamp;root.add(gate);}}
function buildRamp(game,r,index,side,interactive=false){const p=r.samples[index],yaw=yawAt(r.samples,index),q=lateral(p,yaw,side*1.45),baseY=heightAt(game,p,q.x,q.z),width=4.9,length=10.8,rise=interactive?2.75:2.45;const ramp={kind:interactive?'tangenziale-race-interactive-ramp':'tangenziale-race-ramp-second',tangenzialeRace:true,secondRace:true,index,x:q.x,z:q.z,yaw,width,length,rise,baseY,topY:[baseY,baseY,baseY+rise,baseY+rise],interactive};if(interactive){const back=length/2+4.8,s=Math.sin(yaw),c=Math.cos(yaw);ramp.interactivePad={x:q.x-s*back,z:q.z-c*back,yaw,width:width*.95,length:5.4};}return ramp;}
function addDecelerator(root,game,r,index){const p=r.samples[index],yaw=yawAt(r.samples,index),y=heightAt(game,p)+.035,width=Math.max(7.2,Math.min(10.5,p.road?.w||8.5)),length=5.6,d={index,x:p.x,z:p.z,yaw,width,length,lastToast:-Infinity};for(let k=-3;k<=3;k++){const along=k*.72,x=p.x+Math.sin(yaw)*along,z=p.z+Math.cos(yaw)*along;box(root,k%2?'#f4d13d':'#262b30',x,y,z,width,.045,.38,true).rotation.y=yaw;}r.decelerators.push(d);}
function positionObstacle(game,r,def,car){const p=r.samples[def.index],baseYaw=yawAt(r.samples,def.index),q=lateral(p,baseYaw,def.offset);Object.assign(car,{x:q.x,z:q.z,y:heightAt(game,p,q.x,q.z),yaw:baseYaw+def.yawOffset,speed:0,parked:true,missionUnit:true,fixedSpawn:true,tangenzialeObstacle:true,budgetSleeping:false,name:def.label});car.mesh.visible=true;game.pose(car);}

function configureSecond(manager){
 const r=manager.race,g=manager.game,s=g.state;if(!r||r.__secondRace)return false;
 const fullSamples=prepareFullSamples(g,manager.routeCache),window=chooseSecondWindow(r,fullSamples);
 if(!window){manager.restoreSnapshot();g.toast('Seconda gara non disponibile: serve un tratto di tangenziale abbastanza lontano e lungo.',5);return false;}
 r.__secondRace=true;r.__shortSprint=true;r.secondRace=true;
 removeBaseRaceFeatures(g,r);
 r.samples=window.samples;r.startIndex=0;r.startDistance=0;r.total=window.length;r.start=r.samples[0];r.startYaw=yawAt(r.samples,0);r.finish=r.samples.at(-2)||r.samples.at(-1);r.finishYaw=yawAt(r.samples,Math.max(0,r.samples.length-2));
 r.secondStartRouteSeparation=window.routeSep;r.secondStartWorldSeparation=window.worldSep;
 r.playerHint=0;r.playerProgress=0;r.playerCheckpoint=0;r.playerFinished=false;r.playerTurbo=TURBO_CHARGES;r.playerTurboUntil=0;
 r.finishTimes=Array(AI_COUNT+1).fill(null);r.finishOrder=[];r.firstFinishAt=null;r.resultUntil=null;r.resultApplied=false;r.finished=false;r.countdownAt=s.elapsed;r.startedAt=null;
 if(r.startSet?.root){r.startSet.root.position.set(r.start.x,heightAt(g,r.start),r.start.z);r.startSet.root.rotation.y=r.startYaw;}
 if(r.finishSet){r.finishSet.position.set(r.finish.x,heightAt(g,r.finish),r.finish.z);r.finishSet.rotation.y=r.finishYaw;}

 while(r.ai.length<AI_COUNT){
  const c=g.addCar(r.start.x,r.start.z,r.startYaw,false,true,'fulmine');
  Object.assign(c,{health:100,parked:true,missionUnit:true,fixedSpawn:true,tangenzialeRace:true,budgetSleeping:false});
  r.ai.push(c);
 }
 const racers=[r.playerCar,...r.ai];
 for(let i=0;i<racers.length;i++){
  const c=racers[i],p=gridPose(g,r,GRID[i]);replaceRaceMesh(g,c,i);
  Object.assign(c,{x:p.x,z:p.z,y:p.y,yaw:r.startYaw,speed:0,health:100,parked:true,missionUnit:true,fixedSpawn:true,tangenzialeRace:true,budgetSleeping:false,raceSkill:1,raceTurbo:TURBO_CHARGES,raceTurboIndex:0,raceTurboUntil:0,raceHint:0,raceProgress:0,raceCheckpoint:0,raceIndex:i,raceOffset:i?AI_OFFSETS[i-1]:-1.2,raceFinished:false,secondInteractiveUntil:0,secondDecelHitAt:-Infinity,secondInteractiveHitAt:-Infinity,stuck:0});
  resetGroundMotion(c);g.pose(c);
 }
 g.claim(r.playerCar);r.playerCar.missionUnit=true;r.playerCar.fixedSpawn=true;r.playerCar.tangenzialeRace=true;

 const obstacleDefs=OBSTACLE_FRACTIONS.map((fraction,i)=>({index:safeIndex(r.samples,fraction),offset:[0,1.45,-1.45,.8,-.9,1.55,-1.55][i],style:OBSTACLE_STYLES[i],yawOffset:[.02,-.04,.05,-.03,.03,-.05,.04][i],label:OBSTACLE_LABELS[i]}));
 while(r.obstacles.length<obstacleDefs.length){const i=r.obstacles.length,def=obstacleDefs[i],p=r.samples[def.index],c=g.addCar(p.x,p.z,yawAt(r.samples,def.index),false,true,def.style);r.obstacles.push(c);}
 r.obstacleDefs=obstacleDefs;for(let i=0;i<obstacleDefs.length;i++)positionObstacle(g,r,obstacleDefs[i],r.obstacles[i]);
 for(let i=0;i<r.ai.length;i++){const c=r.ai[i];c.path=routeWithDetours(r.samples,AI_OFFSETS[i],obstacleDefs);c.pathIndex=1;}

 const root=new THREE.Group();root.name='tangenziale-second-race-features';
 for(const [i,fraction] of RAMP_FRACTIONS.entries()){const idx=safeIndex(r.samples,fraction),interactive=INTERACTIVE_RAMP_INDEXES.has(i),ramp=buildRamp(g,r,idx,i%2?-1:1,interactive);r.ramps.push(ramp);if(interactive)r.interactiveRamps.push(ramp);g.terrain.arcadeRamps.push(ramp);rampVisual(root,ramp,i);}
 for(const fraction of DECEL_FRACTIONS)addDecelerator(root,g,r,safeIndex(r.samples,fraction));
 g.scene.add(root);r.roots.push(root);

 const p0=gridPose(g,r,GRID[0]);Object.assign(s,{mode:'car',car:r.playerCar,x:p0.x,z:p0.z,y:p0.y,yaw:r.startYaw,speed:0,vy:0,health:100,wanted:0,escape:0,busted:0,waypoint:{x:r.finish.x,z:r.finish.z,name:'TRAGUARDO · Tangenziale 2'},route:r.samples.map(p=>({x:p.x,z:p.z}))});
 Object.assign(r.playerCar,{x:p0.x,z:p0.z,y:p0.y,yaw:r.startYaw,speed:0});resetGroundMotion(r.playerCar);g.pose(r.playerCar);
 g.world?.update?.(r.start.x,r.start.z,true);
 g.toast('TANGENZIALE 2 · 7 sportive · '+(r.total/1000).toFixed(1)+' km · rampe interattive e deceleratori.',5);
 manager.paintHud();
 return true;
}

function secondFreezeGrid(manager){
 const r=manager.race,s=manager.game.state,all=[r.playerCar,...r.ai];
 for(let i=0;i<all.length;i++){const c=all[i],p=gridPose(manager.game,r,GRID[i]);manager.ensureRacer(c,i,c.raceOffset);Object.assign(c,{x:p.x,z:p.z,y:p.y,yaw:r.startYaw,speed:0,health:100,parked:true});resetGroundMotion(c);manager.game.pose(c);}
 const c=r.playerCar;Object.assign(s,{x:c.x,z:c.z,y:c.y,yaw:c.yaw,speed:0,vy:0,health:100});
}
function updateSecondAI(manager,dt){
 const r=manager.race,g=manager.game,traffic=[r.playerCar,...r.ai,...r.obstacles];
 for(const [i,c] of r.ai.entries()){
  manager.ensureRacer(c,i+1,c.raceOffset);
  if(c.raceFinished){c.speed=0;c.parked=true;g.pose(c);continue;}
  const p=nearestSample(c,r.samples,c.raceHint||0);manager.updateCheckpoint(c,p,'raceHint','raceCheckpoint');c.raceProgress=Math.max(c.raceProgress||0,progressAt(r,p.index));
  if(c.raceProgress>=r.total-28||dist(c,r.finish)<18){manager.markFinished(i+1,c);continue;}
  const frac=c.raceProgress/r.total;
  if(c.raceTurbo>0&&c.raceTurboIndex<TURBO_PLAN.length&&frac>=TURBO_PLAN[c.raceTurboIndex]){c.raceTurbo--;c.raceTurboIndex++;c.raceTurboUntil=g.state.elapsed+TURBO_SECONDS;}
  const turbo=g.state.elapsed<c.raceTurboUntil,interactive=g.state.elapsed<(c.secondInteractiveUntil||0),max=c.spec.max+(turbo?6.2:0)+(interactive?8.8:0);
  followRoad(c,dt,g.graph,g.terrain,g.collision,{max,accel:14.7,turnRate:1.8,traffic:traffic.filter(o=>o!==c)});
  g.pose(c);if(p.d>OFFROAD_LIMIT||c.stuck>4.2)manager.respawnActor(c,respawnCheckpoint(0,c.raceCheckpoint,r.samples.length),c.raceOffset);
 }
}
function hitFeature(actor,feature){const q=localPoint(actor,feature);return Math.abs(q.u)<=feature.width/2&&Math.abs(q.v)<=feature.length/2;}
function applySecondFeatures(manager){
 const r=manager.race,g=manager.game,s=g.state;if(!r?.__secondRace||r.phase!=='running')return;
 const actors=[r.playerCar,...r.ai];
 for(const ramp of r.interactiveRamps||[]){if(ramp.pulseLamp?.material)ramp.pulseLamp.material.opacity=.75+.25*Math.sin(s.elapsed*6);const pad=ramp.interactivePad;if(!pad)continue;for(const actor of actors){if(actor.raceFinished||!hitFeature(actor,pad)||s.elapsed-(actor.secondInteractiveHitAt||-Infinity)<2.2)continue;actor.secondInteractiveHitAt=s.elapsed;actor.secondInteractiveUntil=s.elapsed+1.8;actor.speed=Math.min(actor.spec.max*1.23,Math.max(actor.speed+10,actor.spec.max*.90));if(actor===r.playerCar){s.speed=actor.speed;g.toast('RAMPA INTERATTIVA · BOOST ATTIVATO',1.5);}}}
 for(const d of r.decelerators||[])for(const actor of actors){if(actor.raceFinished||!hitFeature(actor,d)||s.elapsed-(actor.secondDecelHitAt||-Infinity)<1.5)continue;actor.secondDecelHitAt=s.elapsed;actor.speed*=.68;if(actor===r.playerCar){s.speed=actor.speed;if(s.elapsed-d.lastToast>1.5){d.lastToast=s.elapsed;g.toast('DECELERATORE · -32% velocità',1.3);}}}
 if(s.elapsed<(r.playerCar.secondInteractiveUntil||0)){s.speed=Math.min(r.playerCar.spec.max*1.23,s.speed+.10);r.playerCar.speed=s.speed;}
 for(const ramp of r.interactiveRamps||[])if(ramp.pulseLamp?.material)ramp.pulseLamp.material.emissiveIntensity=.45+.30*(.5+.5*Math.sin(s.elapsed*6));
}
function secondBoard(manager){
 const r=manager.race,progress=[r.playerProgress,...r.ai.map(c=>c.raceProgress||0)];
 return progress.map((p,i)=>{const place=r.finishOrder.indexOf(i),time=r.finishTimes[i],pct=Math.round(Math.min(100,p/r.total*100)),status=time!==null?('#'+(place+1)+' · '+formatRaceTime(time)):('IN GARA · '+pct+'%');return '<div><strong>'+COLOR_NAMES[i]+(i===0?' · TU':'')+'</strong><span style="float:right;margin-left:18px">'+status+'</span></div>';}).join('');
}
function paintSevenDots(manager){
 const r=manager.race,canvas=typeof document!=='undefined'?document.getElementById('tangenzialeCourseMap'):null;if(!r?.__secondRace||!canvas)return;const ctx=canvas.getContext('2d'),path=r.samples;if(!ctx||path.length<2)return;
 const xs=path.map(p=>p.x),zs=path.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),pad=10,w=canvas.width-pad*2,h=canvas.height-pad*2,spanX=Math.max(1,maxX-minX),spanZ=Math.max(1,maxZ-minZ),scale=Math.min(w/spanX,h/spanZ),ox=(canvas.width-spanX*scale)/2,oy=(canvas.height-spanZ*scale)/2,pt=p=>({x:ox+(p.x-minX)*scale,y:canvas.height-(oy+(p.z-minZ)*scale)});
 [r.playerCar,...r.ai].forEach((c,i)=>{const q=pt(c);ctx.fillStyle=COLORS[i];ctx.beginPath();ctx.arc(q.x,q.y,i===0?5:4,0,Math.PI*2);ctx.fill();ctx.strokeStyle=i===4?'#ffffff':'rgba(0,0,0,.75)';ctx.lineWidth=i===4?1.5:1;ctx.stroke();});
}

function decorateSecondActivity(){
 if(typeof document==='undefined')return;const content=document.getElementById('menuContent'),title=document.getElementById('menuTitle');if(!content||!/A little extra on the side\./i.test(title?.textContent||''))return;
 const list=content.querySelector('.activities');if(!list||document.getElementById('tangenzialeRaceSecondActivity'))return;
 const b=document.createElement('button');b.id='tangenzialeRaceSecondActivity';b.className='activity';b.innerHTML='<span class="icon">⚑</span><span><b>'+RACE_LABEL+'</b><small>7 sportive · prestazioni pari · 4,1 km · 6 rampe · deceleratori · 7 ostacoli</small></span><span class="reward">+€350</span>';b.onclick=()=>activeManager?.openSecondRaceConfirmation();list.appendChild(b);
}

const PREVIOUS_FREEZE=TangenzialeRace.prototype.freezeGrid;
const PREVIOUS_UPDATE_AI=TangenzialeRace.prototype.updateAI;
const PREVIOUS_UPDATE=TangenzialeRace.prototype.update;
const PREVIOUS_PAINT=TangenzialeRace.prototype.paintHud;
const PREVIOUS_BOARD=TangenzialeRace.prototype.raceBoard;

TangenzialeRace.prototype.openSecondRaceConfirmation=function(){
 const g=this.game;if(this.race)return;if(g.state.mission){g.toast('Concludi o annulla la missione attiva prima della seconda gara.',4);document.getElementById('menu')?.close();g.state.paused=false;return;}
 const menu=document.getElementById('menu'),title=document.getElementById('menuTitle'),content=document.getElementById('menuContent');if(!menu||!content)return;if(title)title.textContent='Tangenziale 2 · sette sportive';
 content.innerHTML='<p class="about-copy"><strong>Seconda gara, in un’altra zona della tangenziale.</strong><br>7 sportive diverse per forma e colore, ma con la stessa velocità e la stessa IA. Percorso più lungo, 6 rampe, 4 deceleratori, 7 ostacoli e 2 rampe interattive.<br><strong>Vittoria +€350 · sconfitta -€100.</strong><br><kbd>SHIFT</kbd> turbo · <kbd>X</kbd> abbandona e ripristina la situazione precedente.</p><div class="menu-actions"><button class="primary" id="startTangenzialeRaceSecond">INIZIA GARA 2</button><button id="cancelTangenzialeRaceSecond">ANNULLA</button></div>';
 document.getElementById('startTangenzialeRaceSecond').onclick=()=>{this.__nextRaceMode='second';this.start();this.__nextRaceMode=null;if(this.race)configureSecond(this);};
 document.getElementById('cancelTangenzialeRaceSecond').onclick=()=>{menu.close();g.state.paused=false;};
};
TangenzialeRace.prototype.freezeGrid=function(){if(this.race?.__secondRace)return secondFreezeGrid(this);return PREVIOUS_FREEZE.call(this);};
TangenzialeRace.prototype.updateAI=function(dt){if(this.race?.__secondRace)return updateSecondAI(this,dt);return PREVIOUS_UPDATE_AI.call(this,dt);};
TangenzialeRace.prototype.raceBoard=function(){if(this.race?.__secondRace)return secondBoard(this);return PREVIOUS_BOARD.call(this);};
TangenzialeRace.prototype.paintHud=function(center=null){const out=PREVIOUS_PAINT.call(this,center);if(this.race?.__secondRace)queueMicrotask(()=>{if(!this.race?.__secondRace)return;const title=document.getElementById('missionTitle'),desc=document.getElementById('missionDesc');if(title&&this.race.phase==='running')title.textContent='Posizione '+this.rank()+' / 7';if(desc)desc.textContent='Sportiva '+COLOR_NAMES[0].toLowerCase()+' · Turbo '+this.race.playerTurbo+'/3 · SHIFT · X abbandona · '+Math.round(Math.min(100,this.race.playerProgress/this.race.total*100))+'% percorso';paintSevenDots(this);});return out;};
TangenzialeRace.prototype.update=function(dt){activeManager=this;const out=PREVIOUS_UPDATE.call(this,dt);if(this.race?.__secondRace){applySecondFeatures(this);queueMicrotask(()=>paintSevenDots(this));}return out;};

if(typeof document!=='undefined'&&typeof MutationObserver!=='undefined'){new MutationObserver(decorateSecondActivity).observe(document.getElementById('menuContent')||document.body,{childList:true,subtree:true});queueMicrotask(decorateSecondActivity);}

export const SECOND_TANGENZIALE_RACE={
 racers:AI_COUNT+1,ai:AI_COUNT,targetMetres:TARGET_METRES,minMetres:MIN_METRES,startRouteSeparation:START_ROUTE_SEPARATION,startWorldSeparation:START_WORLD_SEPARATION,
 colors:COLORS,rampCount:RAMP_FRACTIONS.length,interactiveRamps:INTERACTIVE_RAMP_INDEXES.size,decelerators:DECEL_FRACTIONS.length,obstacles:OBSTACLE_FRACTIONS.length,offroadLimit:OFFROAD_LIMIT,equalSkill:1
};
