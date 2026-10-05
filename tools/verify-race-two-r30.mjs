import assert from 'node:assert/strict';
import {raceOneHarness} from './race-one-harness.mjs';
import {configureAdvancedSecond,applySecondRaceEvents} from '../dist/race-two-immersion.js';
import {raceCorridorPosition,corridorFinish} from '../dist/race-corridor.js';
import {raceDriveSettings} from '../dist/race-driving-rules.js';
import {safeSpectatorSpot} from '../dist/race-one-immersion.js';
const m=raceOneHarness();m.restoreSnapshot();
const reports=[];
for(const mode of ['easy','medium','hard']){
 m.start({race:2,difficulty:mode,vehicle:'cinquecento',seed:1234});const r=m.race,g=m.game,s=g.state;
 assert(r.advancedSecond&&r.ai.length===6);assert.equal(new Set([r.playerCar,...r.ai].map(c=>c.style)).size,7);assert.equal(r.playerCar.style,'cinquecento');
 r.phase='running';r.startedAt=s.elapsed;r.playerFinished=false;m.recoveries=0;
 console.log('R30_CONFIG',JSON.stringify({mode,counts:r.immersion.counts,dual:r.corridor.dualStations,stations:r.samples.length,models:r.ai.map(c=>c.style)}));
 assert(r.immersion.counts.ramps>=6);assert(r.immersion.counts.chains>=2);assert(r.corridor.dualStations>r.samples.length*.7);
 assert(r.immersion.spectators.every(p=>safeSpectatorSpot(g,p.x,p.z,p.y)));
 // Real parallel roads throughout the full route, in both driving directions.
 let checked=0;for(const station of r.corridor.stations){for(const member of station.members){
  const y=g.terrain.roads.sample(member.road,member.x,member.z)+.05;
  for(const yaw of [station.yaw,station.yaw+Math.PI]){
   const actor={x:member.x,z:member.z,y,yaw},p=raceCorridorPosition(g,r,actor,station.index);
   assert(p.valid,`Carriageway invalid at ${station.index}: ${JSON.stringify({actor,p})}`);checked++;
  }
  Object.assign(s,{x:member.x,z:member.z,y,yaw:station.yaw,speed:23,health:76,car:r.playerCar,mode:'car'});r.playerFinished=false;r.playerHint=station.index;r.playerProgress=0;r.playerCheckpoint=station.index;m.updatePlayer();
  assert.equal(m.recoveries,0,`Unexpected respawn ${station.index}`);assert.equal(s.health,76);
 }}
 const p=r.samples[Math.floor(r.samples.length/2)];assert(!raceCorridorPosition(g,r,{...p,x:p.x+100,y:p.y},Math.floor(r.samples.length/2)).valid);assert(!raceCorridorPosition(g,r,{...p,y:p.y-8},Math.floor(r.samples.length/2)).valid,'lower deck rejected');
 const f=r.corridor.stations[r.samples.length-2];for(const member of f.members)assert(corridorFinish(r,{x:member.x+Math.sin(r.finishYaw)*2,z:member.z+Math.cos(r.finishYaw)*2,y:member.y},r.total-28));
 // Shared zone effects on player and bot; unchanged SHIFT inventory.
 r.playerFinished=false;const bot=r.ai[0],e=r.immersion.events.find(e=>e.kind==='slow'&&!e.trapLanding),charges=r.playerTurbo;
 for(const car of [r.playerCar,bot]){const actor=car===r.playerCar?s:car;Object.assign(actor,{x:e.x,z:e.z,y:e.baseY,speed:60,health:100});car.raceFinished=false;car.jump=null;applySecondRaceEvents(m,1/60);assert(actor.speed<60);assert(raceDriveSettings(car,s.elapsed).max<=car.spec.max*.51);}
 s.elapsed+=1;assert.equal(raceDriveSettings(bot,s.elapsed).max,bot.spec.max);assert.equal(r.playerTurbo,charges);
 const chain=r.immersion.events.filter(e=>e.kind==='sprint'&&e.chain===0&&Math.abs(e.side)<1);assert.equal(chain.length,3);
 for(const e of chain){for(const car of [r.playerCar,bot]){const actor=car===r.playerCar?s:car;Object.assign(actor,{x:e.x,z:e.z,y:e.baseY,speed:40,health:100});car.jump=null;applySecondRaceEvents(m,1/60);assert(actor.speed>40);assert(raceDriveSettings(car,s.elapsed).boosted);}s.elapsed+=.5;}assert.equal(r.playerTurbo,charges);
 // Rebuild grid after zone probes, then run every rival through the actual map.
 m.freezeGrid();r.phase='running';r.startedAt=s.elapsed;r.playerFinished=true;r.playerCar.raceFinished=true;r.finishTimes[0]=1;r.firstFinishAt=s.elapsed-20;m.recoveries=0;
 const recoveryLog=[],recover=m.respawnActor;m.respawnActor=function(c,index,...rest){recoveryLog.push({health:c.health,hint:c.raceHint,index,stuck:c.stuck,x:c.x,z:c.z,y:c.y});assert(index<=c.raceHint,'recovery cannot skip ahead');return recover.call(this,c,index,...rest);};
 for(let tick=0;r.ai.some(c=>!c.raceFinished)&&tick<18000;tick++){s.elapsed+=1/60;m.updateAI(1/60);}
 const report={mode,counts:r.immersion.counts,checked,finished:r.ai.map(c=>c.raceFinished),times:r.finishTimes.slice(1),recoveries:m.recoveries,recoveryLog,positions:r.ai.map(c=>({progress:c.raceProgress,hint:c.raceHint,speed:c.speed,health:c.health,x:c.x,z:c.z,y:c.y}))};console.log('R30_RACE',JSON.stringify(report));assert(report.finished.every(Boolean));assert(report.recoveries<20);reports.push(report);m.respawnActor=recover;m.abort();
 assert(!g.terrain.arcadeRamps.some(e=>e.tangenzialeRace));
}
for(let i=1;i<reports.length;i++)for(const key of ['ramps','trapRamps','slow','chains','spectators'])assert(reports[i].counts[key]>=reports[i-1].counts[key],`progressive ${key}`);
console.log('PASS R30 advanced second race, both mapped carriageways, shared zones, sprint chains, varied rivals and finish lines');
