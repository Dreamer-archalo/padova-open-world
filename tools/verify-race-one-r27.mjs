import assert from 'node:assert/strict';
import fs from 'node:fs';
import {raceOneHarness} from './race-one-harness.mjs';
import {roadNeedsTerrainSeal} from '../dist/phase4-terrain-fixes.js';
import {vehicleBlocked} from '../dist/movement.js';

const results=[];
for(const hz of [60,30,20]){
 const modes={};
 for(const mode of ['easy','medium','hard']){
  const manager=raceOneHarness(mode),r=manager.race,g=manager.game;
  const playerMax=r.playerCar.spec.max;
  // Finishing first must not despawn unfinished bots after the old 12 s grace.
  r.playerFinished=true;r.finishTimes[0]=1;r.firstFinishAt=g.state.elapsed-20;
  assert.equal(manager.resolveIfReady(),false);
  let ticks=0,maxSpeed=0;
  while(r.ai.some(c=>!c.raceFinished)&&ticks<hz*150){
   g.state.elapsed+=1/hz;manager.updateAI(1/hz);ticks++;
   for(const c of r.ai){assert(Number.isFinite(c.x+c.y+c.z+c.speed));maxSpeed=Math.max(maxSpeed,c.speed);}
  }
  assert(r.ai.every(c=>c.raceFinished),`${mode}/${hz}: all three bots physically finish`);
  assert.equal(manager.recoveries,0,`${mode}/${hz}: no guardrail or off-road recovery needed`);
  for(const c of r.ai){
   const dx=c.x-r.finish.x,dz=c.z-r.finish.z;
   assert(dx*Math.sin(r.finishYaw)+dz*Math.cos(r.finishYaw)>=-.9,'bot crosses the real finish plane');
  }
  assert.equal(r.playerCar.spec.max,playerMax,'player performance unchanged');
  modes[mode]={seconds:r.finishTimes.slice(1),maxSpeed};
  manager.restoreSnapshot();
 }
 for(let i=0;i<3;i++){
  assert(modes.easy.seconds[i]>modes.medium.seconds[i]*1.15,'easy takes at least 15% longer');
  assert(modes.medium.seconds[i]>modes.hard.seconds[i],'hard is quicker through better driving');
 }
 assert(modes.hard.maxSpeed<=65+6.2+.01,'hard has no hidden speed multiplier above the standard boost');
 results.push({hz,...modes});
}
assert(roadNeedsTerrainSeal({k:'residential',w:8}),'ordinary road fill retained');
for(const flag of [{b:true},{crossing:true},{gradeSeparated:true},{localGradeDeck:true},{layer:1},{tunnel:true}])assert(!roadNeedsTerrainSeal({k:'residential',w:8,...flag}),'openings below elevated roads never filled');
const manager=raceOneHarness(),g=manager.game;
for(const name of ['Via San Tommaso','Via Francesco Petrarca','Via Ugo Foscolo']){
 const road=[...g.terrain.roads.profiles.keys()].find(r=>r.n===name&&r.b);
 assert(road&&!roadNeedsTerrainSeal(road),name+': actual bridge excluded from earth fill');
 const pier=g.world.structures.find(s=>s.kind==='underpass-pier'&&s.road===road);
 // Geometry lookup is validated separately in the real browser; collision
 // checks here cover the actual world, not a mocked empty obstacle index.
 assert(pier,name+': physical support retained');assert(vehicleBlocked(pier.x,pier.z,0,g.collision,manager.race.playerCar.spec,pier.y),name+': piers remain physical');
}
manager.restoreSnapshot();
fs.mkdirSync('test-artifacts/r27',{recursive:true});fs.writeFileSync('test-artifacts/r27/race-times.json',JSON.stringify(results,null,2));
console.log('PASS R27 full mapped race, every bot at 20/30/60 Hz, difficulty timing and open bridge fills',JSON.stringify(results));
