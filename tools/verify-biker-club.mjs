import assert from 'node:assert/strict';
import fs from 'node:fs';
import {t} from './controller-harness.mjs';
import {BikerClub,clubPoint,clubCoordinates} from '../dist/biker-club.js';
import {CLUB_SAVE_KEY,CLUB_TRIALS,readClubProgress,clubVehicleUnlocked} from '../dist/biker-club-progress.js';
import {VEHICLES} from '../dist/vehicles.js';
import {TRAFFIC_VEHICLES,fleetFor} from '../dist/modern-vehicles.js';
import {angleDiff,dist} from '../dist/core.js';
import {resetGroundMotion} from '../dist/vehicle-dynamics.js';
const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
const messages=[],results=[],s=t.state,moneyBeforeClub=t.state.money;let club;
const remove=c=>{t.scene.remove(c.mesh);const i=t.cars.indexOf(c);if(i>=0)t.cars.splice(i,1);};
club=new BikerClub({state:s,graph:t.graph,terrain:t.terrain,collision:t.world.collision,cars:t.cars,scene:t.scene,keys:t.keys,addCar:t.addCar,pose:t.poseVehicle,remove,storage,toast:m=>messages.push(m),routeTo:p=>s.route=[p],closeDialogs(){},cancelMission(){club.cancel();s.mission=null;s.route=[];},finishMission(cash,message){s.money+=cash;s.jobs++;s.mission=null;s.route=[];messages.push(message);}});
for(const trial of CLUB_TRIALS){assert(!TRAFFIC_VEHICLES[trial.reward]);assert(!fleetFor('industrial').includes(trial.reward));}
const course=club.ensureCourse();assert(course);assert.equal(course.name,'Via Austria');
for(const c of t.cars)c.mesh.visible=false;
function prepare(id){club.cancel();s.mission=null;for(const c of t.cars)c.mesh.visible=false;const p=clubPoint(course,0),car=t.addCar(p.x,p.z,p.yaw,false,true,'naked');Object.assign(s,{x:car.x,z:car.z,y:car.y,yaw:car.yaw,car,mode:'car',speed:0,health:100,wanted:0,spin:0,knockX:0,knockZ:0,freefall:false,parachuting:false});resetGroundMotion(car);t.keys.clear();assert(club.accept(id));}
// The VM controller forwards actual launch/landing events to the live manager.
import {ctx} from './controller-harness.mjs';
ctx.testClub=club;await import('node:vm').then(({default:vm})=>vm.runInContext('bikerClub=testClub;',ctx));
function tick(dt,control){control?.();s.elapsed+=dt;t.movePlayer(dt);club.update(dt);}
function drive(target,dt){t.keys.clear();if(s.speed<target)t.keys.add('KeyW');if(s.speed>target+1)t.keys.add('KeyS');const error=angleDiff(course.yaw,s.yaw);if(error>.02)t.keys.add('KeyA');if(error<-.02)t.keys.add('KeyD');}
for(const hz of [30,60])for(const id of ['formation','wheelie','jumps']){
 prepare(id);let airborne=0,maxY=s.y,startY=s.y,crewWheelies=0;const initialCars=t.cars.length;
 for(let i=0;i<hz*82&&club.run;i++){
  const r=club.run;tick(1/hz,()=>{if(r.mission.phase!=='running'){t.keys.clear();return;}drive(id==='formation'?12:18,1/hz);if(id==='wheelie'&&clubCoordinates(course,s).along>=65)t.keys.add('KeyB');});
  if(s.car.jump?.airborne)airborne++;maxY=Math.max(maxY,s.y);crewWheelies+=club.crew.filter(c=>c.wheelie>.2).length;
 }
 assert.equal(s.mission,null);assert(club.progress.completed.includes(id),id+' actual controller completion at '+hz+'Hz: '+messages.slice(-2));assert.equal(club.crew.length,0);assert.equal(t.terrain.arcadeRamps.filter(r=>r.bikerClub).length,0);assert(t.cars.length<=initialCars,'managed actors removed');if(id==='jumps')assert(airborne>0&&maxY-startY>1.5);if(id==='wheelie')assert(crewWheelies>0,'crew demonstrates real wheelies');results.push({hz,id,airborne,maxHeight:maxY-startY,crewWheelies,record:club.progress.best[id]});
}
assert.equal(s.money-moneyBeforeClub,1100,'cash only for first completion of each trial');assert.equal(readClubProgress(storage).completed.length,3);for(const trial of CLUB_TRIALS){assert(clubVehicleUnlocked(trial.reward,storage));assert(VEHICLES[trial.reward].bike&&VEHICLES[trial.reward].clubReward);}
assert.equal(new BikerClub({...club,storage}).unlocked().length,3,'unlocks survive a fresh mission manager');
// No automatic progress from driving through the gates with both wheels down.
values.clear();prepare('wheelie');for(let i=0;i<60*25&&club.run;i++)tick(1/60,()=>{if(club.run.mission.phase==='running')drive(18,1/60);});assert(!club.progress.completed.includes('wheelie'));assert.equal(readClubProgress(storage).completed.length,0);
// Walking, changing vehicle, collision and a recovery interrupt qualification.
for(const reason of ['walk','switch','damage']){prepare('formation');for(let i=0;i<200;i++)tick(1/60);assert.equal(club.run.mission.phase,'running');if(reason==='walk'){s.mode='foot';s.car=null;}if(reason==='switch')s.car=t.addCar(s.x+10,s.z+10,s.yaw,false,true,'enduro');if(reason==='damage')s.health-=10;tick(1/60);assert(!club.run&&s.mission===null);assert(!t.terrain.arcadeRamps.some(r=>r.bikerClub));}
prepare('formation');club.start();const borrowed=club.crew[0];Object.assign(s,{car:borrowed,x:borrowed.x,z:borrowed.z,y:borrowed.y,yaw:borrowed.yaw,speed:0});tick(1/60);assert(!club.run);assert(t.cars.includes(borrowed)&&borrowed.mesh.visible,'a bike the player has taken must remain in the world');assert(!borrowed.bikerClubUnit&&!borrowed.missionUnit);
prepare('jumps');club.start();const count=t.cars.length;assert(t.terrain.arcadeRamps.some(r=>r.bikerClub));club.cancelMission();assert.equal(t.cars.length,count-3);assert(!t.terrain.arcadeRamps.some(r=>r.bikerClub));
// Calling is gated, bounded to three and follows the actual path without warps.
assert.equal(club.callCrew(),false);values.set(CLUB_SAVE_KEY,JSON.stringify({completed:CLUB_TRIALS.map(t=>t.id),best:{formation:20,wheelie:10,jumps:20}}));prepare('formation');club.cancelMission();s.speed=0;assert(club.callCrew());assert.equal(club.crew.length,3);assert(club.callCrew());assert.equal(club.crew.length,3);let largestStep=0;
for(let i=0;i<60*15;i++){const old=club.crew.map(c=>({x:c.x,z:c.z}));tick(1/60,()=>drive(12,1/60));club.crew.forEach((c,j)=>largestStep=Math.max(largestStep,dist(old[j],c)));}
assert(club.roam&&club.crew.length===3);assert(largestStep<1,'riders use real movement, no visible teleport');const spread=Math.max(...club.crew.map(c=>dist(c,s)));assert(spread<70,'crew catches up and stays nearby');club.dismiss();assert.equal(club.crew.length,0);
for(const c of t.cars)c.mesh.visible=false;const riderPoint=clubPoint(course,60),truckPoint=clubPoint(course,85),rider=t.addCar(riderPoint.x,riderPoint.z,riderPoint.yaw,false,false,'naked'),truck=t.addCar(truckPoint.x,truckPoint.z,truckPoint.yaw,false,true,'cisterna');rider.speed=12;Object.assign(s,{x:course.start.x+500,z:course.start.z+500});for(let i=0;i<600;i++)club.drive(rider,clubPoint(course,180),12,1/60);const truckGap=dist(rider,truck);assert(truckGap>(rider.spec.length+truck.spec.length)/2+1,'crew stops before the full rear footprint of a tanker');assert(rider.speed<.2);remove(rider);remove(truck);
s.mode='foot';s.car=null;assert.equal(club.callCrew(),false,'crew requires an actual motorcycle');
values.set(CLUB_SAVE_KEY,'not json');assert.deepEqual(readClubProgress(storage),{completed:[],best:{}});
fs.writeFileSync('docs/biker-club-results.json',JSON.stringify({course:{name:course.name,start:course.start,length:course.length,roadWidth:course.road.w},runs:results,freeRide:{largestStep,spread,truckGap},checks:['real-controller 30/60Hz','gated rewards','first-completion cash only','persistent unlocks','failure conditions','actor and ramp cleanup','bounded crew','no teleports','corrupt storage']},null,2));console.log('PASS BIKER CLUB',JSON.stringify({results,largestStep,spread}));
