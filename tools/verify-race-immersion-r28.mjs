import assert from 'node:assert/strict';
import fs from 'node:fs';
import {raceOneHarness} from './race-one-harness.mjs';
import {RACE_ENVIRONMENTS,RACE_PROFILES,raceVehicleChoices,raceVehicleSpec,chooseRaceRoster,safeRaceEventIndex,applyRaceHazards} from '../dist/race-one-immersion.js';
import {VEHICLES} from '../dist/vehicles.js';
import {groundVehicleStep,resetGroundMotion} from '../dist/vehicle-dynamics.js';
const choices=raceVehicleChoices(),baseJSON=JSON.stringify(VEHICLES),times=[],counts={};
const template=raceOneHarness();template.restoreSnapshot();
assert(choices.length>=40,'broad catalogue of usable road vehicles');
assert(!choices.some(c=>/tank|tir|airone|falco|michelangelo/.test(c.id)));
for(const c of choices){const spec=raceVehicleSpec(c.id);assert(spec.max>=62&&spec.max<=68);assert(spec.accel>=13.8&&spec.accel<=16.2);assert.equal(spec.width,VEHICLES[c.id].width);assert.equal(spec.turboMax,spec.max,'no hidden Cinquecento advantage');}
assert(RACE_PROFILES.agile.max<RACE_PROFILES.sprint.max&&RACE_PROFILES.agile.accel>RACE_PROFILES.sprint.accel);
let previous=[];for(let n=0;n<5;n++){const roster=chooseRaceRoster('medium','fulmine',()=>.25,previous);assert.equal(new Set(roster).size,3);assert(!roster.includes('fulmine'));assert(roster.every(id=>!previous.includes(id)));previous=roster;}
for(const hz of [30,60])for(const mode of ['easy','medium','hard']){
 const m=template,g=m.game;m.previousRaceRoster=[];const snapshot={x:g.state.x,z:g.state.z,money:g.state.money};
 // The full start chain creates actual models, then configures the route.
 m.start({difficulty:mode,vehicle:'collector-limone',seed:42});const r=m.race;r.phase='running';r.startedAt=g.state.elapsed;r.playerFinished=true;r.finishTimes[0]=1;r.firstFinishAt=g.state.elapsed-20;
 assert.equal(r.difficulty,mode);assert.equal(r.playerCar.style,'collector-limone');assert.equal(new Set(r.ai.map(c=>c.style)).size,3);
 const budget=RACE_ENVIRONMENTS[mode];counts[mode]=r.immersion.counts;
 for(const key of ['ramps','traps','parked','moving'])assert.equal(counts[mode][key],budget[key],mode+': complete safe event budget '+key);
 assert.equal(r.immersion.root.children.length,1,'all static props share a draw call');
 for(const e of r.immersion.events){assert(safeRaceEventIndex(r,e.index));assert(e.progress<r.total-520);}
 let recoveries=0;const original=m.respawnActor;m.respawnActor=function(...a){recoveries++;return original.apply(this,a);};
 for(let tick=0;r.ai.some(c=>!c.raceFinished)&&tick<hz*180;tick++){g.state.elapsed+=1/hz;m.updateAI(1/hz);for(const c of r.ai)assert(Number.isFinite(c.x+c.y+c.z+c.speed));}
 assert(r.ai.every(c=>c.raceFinished),mode+'/'+hz+': every varied bot finishes');assert.equal(recoveries,0,mode+'/'+hz+': no bot recovery');
 times.push({hz,mode,models:r.ai.map(c=>c.style),times:r.finishTimes.slice(1),counts});console.log('COMPLETE',hz,mode,JSON.stringify(r.finishTimes.slice(1)));
 // Every slowdown has identical rules for player and bots, only once per pass.
 if(r.immersion.events.some(e=>e.kind==='trap')){const trap=r.immersion.events.find(e=>e.kind==='trap');r.playerFinished=false;r.playerCar.raceFinished=false;Object.assign(g.state,{x:trap.x,z:trap.z,y:trap.baseY,speed:50});r.playerCar.jump=null;
  applyRaceHazards(m);assert.equal(g.state.speed,50*budget.penalty);applyRaceHazards(m);assert.equal(g.state.speed,50*budget.penalty,'no repeated penalty each frame');
 }
 const actors=[r.playerCar,...r.ai,...r.obstacles],root=r.immersion.root;m.restoreSnapshot();assert(actors.every(c=>!g.cars.includes(c)));assert(!g.scene.children.includes(root));assert(!g.terrain.arcadeRamps.some(r=>r.tangenzialeRace));
 assert.equal(g.state.x,snapshot.x);assert.equal(g.state.z,snapshot.z);assert.equal(g.state.money,snapshot.money);
}
for(const hz of [30,60]){const rows=times.filter(t=>t.hz===hz),mean=m=>{const t=rows.find(t=>t.mode===m).times;return t.reduce((a,b)=>a+b)/3;};assert(mean('easy')>mean('medium')*1.1);assert(mean('medium')>mean('hard')*1.06);}
assert.equal(JSON.stringify(VEHICLES),baseJSON,'global vehicle specifications never change');
// All profiles physically launch/land on each actual mapped ramp, with genuine ground physics.
const rampResults=[];
for(const mode of ['easy','medium','hard']){const m=template;m.start({difficulty:mode,vehicle:'fulmine',seed:42});const g=m.game,r=m.race;
 for(const ramp of r.ramps)for(const style of ['scooter','fulmine','collector-fiamma','collector-perla']){
  const car={spec:raceVehicleSpec(style)},actor={x:ramp.x-Math.sin(ramp.yaw)*10,z:ramp.z-Math.cos(ramp.yaw)*10,y:ramp.baseY,yaw:ramp.yaw,speed:45};let launched=false,landed=false,blocked=false;
  for(let t=0;t<300;t++){const step=groundVehicleStep(actor,car,{turn:0,handbrake:false},1/60,g.terrain,g.collision);launched||=step.launched;landed||=step.landed;blocked||=step.hitSpeed>1;assert(Number.isFinite(actor.x+actor.z+actor.y));if(landed)break;}
  assert(launched&&landed&&!blocked,mode+'/'+style+': ramp launches and lands without collision');rampResults.push({mode,style,index:ramp.index,launched,landed});
 }
 m.restoreSnapshot();
}
fs.mkdirSync('test-artifacts/r28',{recursive:true});fs.writeFileSync('test-artifacts/r28/verification.json',JSON.stringify({catalogue:choices.length,counts,times,rampResults},null,2));
console.log('PASS R28',JSON.stringify({catalogue:choices.length,counts,times:times.map(t=>({hz:t.hz,mode:t.mode,times:t.times,models:t.models})),rampCases:rampResults.length}));
