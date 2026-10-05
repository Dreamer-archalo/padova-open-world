import assert from 'node:assert/strict';
import fs from 'node:fs';
import {raceOneHarness} from './race-one-harness.mjs';
import {t,ctx} from './controller-harness.mjs';
import vm from 'node:vm';
import {raceVehicleSpec,raceVehicleChoices,raceVehicleStats,safeRaceEventIndex} from '../dist/race-one-immersion.js';
import {applyRaceImpact,raceDriveSettings} from '../dist/race-driving-rules.js';
import {resetGroundMotion} from '../dist/vehicle-dynamics.js';
const manager=raceOneHarness();manager.restoreSnapshot();
const boosts=[];
for(const style of ['cinquecento','taxi','collector-fiamma','collector-cobalto']){
 manager.start({difficulty:'hard',vehicle:style,seed:29});const r=manager.race,g=manager.game;
 r.phase='running';r.startedAt=g.state.elapsed;
 const index=r.samples.findIndex((p,i)=>safeRaceEventIndex(r,i)&&r.samples.slice(i,i+8).every(q=>{const b=r.samples[i+1],yaw=Math.atan2(b.x-p.x,b.z-p.z);return Math.abs((q.x-p.x)*Math.cos(yaw)-(q.z-p.z)*Math.sin(yaw))<.8}));assert(index>0);
 const p=r.samples[index],q=r.samples[index+1],yaw=Math.atan2(q.x-p.x,q.z-p.z),car=r.playerCar;
 const ramps=g.terrain.arcadeRamps;g.terrain.arcadeRamps=[];
 const visible=g.cars.map(c=>[c,c.mesh.visible]);for(const [c] of visible)if(c!==car)c.mesh.visible=false;
 const run=turbo=>{
  Object.assign(g.state,{car,mode:'car',x:p.x,z:p.z,y:p.y,yaw,speed:40,health:100});Object.assign(car,{x:p.x,z:p.z,y:p.y,yaw,speed:40,health:100,raceHitUntil:0,raceTurboUntil:0});resetGroundMotion(car);r.playerTurbo=3;r.playerTurboUntil=0;
  vm.runInContext('collisionCooldown=0',ctx);t.keys.clear();t.keys.add('KeyW');
  const started=g.state.elapsed;
  if(turbo){manager.keyDown({code:'ShiftLeft',repeat:false,preventDefault(){},stopImmediatePropagation(){}});assert.equal(r.playerTurbo,2);manager.keyDown({code:'ShiftLeft',repeat:true,preventDefault(){},stopImmediatePropagation(){}});assert.equal(r.playerTurbo,2,'holding SHIFT cannot drain every charge');}
  let peak=0;for(let tick=0;tick<144;tick++){g.state.elapsed+=1/60;t.movePlayer(1/60);manager.applyPlayerTurbo(1/60);peak=Math.max(peak,g.state.speed);}
  assert(g.state.health>95,'clean turbo test does not hit walls or vehicles');t.keys.clear();return {peak,distance:Math.hypot(g.state.x-p.x,g.state.z-p.z),seconds:g.state.elapsed-started};
 };
 const normal=run(false),turbo=run(true);assert(turbo.peak>=normal.peak*1.24,style+': SHIFT raises actual physics speed at least 24%');assert(turbo.distance>=normal.distance+25,style+': actual extra travelled distance is visible');
 boosts.push({style,normal,turbo});for(const [c,v] of visible)c.mesh.visible=v;
 // A real bot is sent towards an unavoidable obstacle: no ghosting through it.
 const bot=r.ai[0],obstacle=r.obstacles[0];r.playerFinished=true;
 const half=(bot.spec.length+obstacle.spec.length)/2;
 Object.assign(bot,{x:p.x,z:p.z,y:p.y,yaw,speed:40,health:100,raceHitUntil:0,raceHint:index,raceCheckpoint:index,raceProgress:r.samples.cumulative[index]-r.startDistance,raceLane:0,raceOffset:0,raceTargetLane:0});
 Object.assign(obstacle,{x:p.x+Math.sin(yaw)*(half+.1),z:p.z+Math.cos(yaw)*(half+.1),y:p.y,yaw,speed:0});
 for(const other of r.ai)if(other!==bot)other.mesh.visible=false;
 g.state.elapsed+=1/60;manager.updateAI(1/60);assert(bot.health<100,'bot genuinely receives obstacle collision damage');assert(bot.speed<20,'bot collision causes a tangible slowdown');
 const healthySpec=bot.spec;
 // Durability applies identically to human and bot, without instant explosions.
 const damages=[];
 for(const id of ['cinquecento','collector-cobalto']){const spec=raceVehicleSpec(id),a={speed:40,health:100},c={spec,raceOneRules:true,health:100};const d=applyRaceImpact(a,c,40,100);assert(d>0&&a.health>0);assert.equal(applyRaceImpact(a,c,40,100.1),0,'same contact is not charged every frame');damages.push(d);}
 assert(damages[1]<damages[0]*.7,'heavy vehicle withstands more impacts');
 const actor={speed:40,health:100},npc={spec:healthySpec,health:100,raceOneRules:true};const playerHit=applyRaceImpact(actor,npc,40,200),aiCar={spec:healthySpec,speed:40,health:100,raceOneRules:true};assert.equal(applyRaceImpact(aiCar,aiCar,40,200),playerHit,'shared damage formula');
 // A depleted race car recovers at its checkpoint and retains remaining boosts.
 r.playerFinished=false;r.playerCheckpoint=index;r.playerTurbo=2;g.state.health=0;manager.updatePlayer();assert.equal(g.state.health,100);assert.equal(r.playerTurbo,2);assert(r.playerHint>=r.startIndex);
 g.terrain.arcadeRamps=ramps;manager.restoreSnapshot();
}
for(const choice of raceVehicleChoices())for(const stat of raceVehicleStats(choice.id))assert(stat.value>0&&stat.value<=100);
fs.mkdirSync('test-artifacts/r29',{recursive:true});fs.writeFileSync('test-artifacts/r29/driving.json',JSON.stringify({boosts},null,2));
console.log('PASS R29 actual player physics, SHIFT speed/distance, real bot obstacle contact, durability and checkpoint recovery',JSON.stringify(boosts));
