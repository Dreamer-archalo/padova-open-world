import '../dist/phase4-terrain-fixes.js';
import {t} from './controller-harness.mjs';
import {TangenzialeRace} from '../dist/tangenziale-race.js';
import '../dist/tangenziale-race-polish.js';
import '../dist/tangenziale-race-short-sprint.js';
import '../dist/tangenziale-race-second.js';
import '../dist/tangenziale-race-runtime-fixes.js';
import '../dist/tangenziale-race-v2-polish.js';
import '../dist/tangenziale-race-final-fixes.js';
import '../dist/tangenziale-race-difficulty.js';
import {applyRaceOneDifficulty} from '../dist/tangenziale-race-difficulty.js';

export function raceOneHarness(mode='medium'){
 const g={...t,collision:t.world.collision,pose:t.poseVehicle,toast(){},claim(){},graceUntil:0,
  retire(c){c.mesh.parent?.remove(c.mesh);const i=t.cars.indexOf(c);if(i>=0)t.cars.splice(i,1);},remove(c){this.retire(c);}};
 const manager=new TangenzialeRace(g);manager.paintHud=()=>{};manager.start();
 if(!manager.race)throw Error('Actual mapped race route must start');
 applyRaceOneDifficulty(manager.race,mode);
 manager.race.phase='running';manager.race.startedAt=t.state.elapsed;
 for(const c of manager.race.ai)c.parked=false;
 const respawn=manager.respawnActor.bind(manager);manager.recoveries=0;
 manager.respawnActor=(...args)=>{manager.recoveries++;return respawn(...args);};
 return manager;
}
