import assert from 'node:assert/strict';
import {raceOneHarness} from './race-one-harness.mjs';
import '../dist/race-two-immersion.js';
import {raceVehicleSpec} from '../dist/race-one-immersion.js';
import {raceCorridorPosition} from '../dist/race-corridor.js';
const m=raceOneHarness();m.restoreSnapshot();
for(const hz of [30,60]){
 m.start({race:2,difficulty:'easy',vehicle:'scooter',seed:42});const r=m.race,g=m.game,s=g.state;
 r.phase='running';r.startedAt=s.elapsed;r.playerFinished=true;r.playerCar.raceFinished=true;
 for(const c of r.ai)c.raceFinished=true;
 const old=r.ai[4],c=g.addCar(old.x,old.z,old.yaw,false,true,'officina');for(const key of Object.keys(old))if(key.startsWith('race'))c[key]=old[key];g.retire(old);r.ai[4]=c;
 const p=r.samples[79],next=r.samples[80];Object.assign(c,{spec:raceVehicleSpec('officina'),missionUnit:true,fixedSpawn:true,tangenzialeRace:true,raceFinished:false,health:89,speed:-3.4528,x:-3225.9560947098985,z:-6107.645143657898,y:19.7635111898843,yaw:Math.atan2(next.x-p.x,next.z-p.z),raceHint:79,raceCheckpoint:79,raceProgress:2218.1416374238856,raceForwardWatermark:2220,raceStallTime:6.1});g.pose(c);
 const recoveries=[],recover=m.respawnActor;m.respawnActor=function(car,index,side){if(car===c){const health=c.health;recoveries.push({index,hint:c.raceHint,health,side});assert(index<=c.raceHint);const result=recover.call(this,car,index,side);if(health>0)assert.equal(c.health,health,'healthy recovery must preserve damage');return result;}return recover.call(this,car,index,side);};
 s.elapsed+=1/hz;m.updateAI(1/hz);assert.equal(recoveries.length,1,'reverse oscillation must recover');assert(recoveries[0].index<=79);assert.equal(c.health,89);assert(raceCorridorPosition(g,r,c,c.raceHint).valid);
 for(let tick=0;!c.raceFinished&&tick<hz*240;tick++){s.elapsed+=1/hz;m.updateAI(1/hz);}
 const result={hz,finished:c.raceFinished,time:r.finishTimes[5],recoveries};console.log('R30_WIDE_RECOVERY',JSON.stringify(result));assert(c.raceFinished,'long vehicle must physically finish after recovery');assert(recoveries.length<8);
 // The player can request the same checkpoint recovery without a free repair.
 r.playerFinished=false;r.playerCar.raceFinished=false;r.playerHint=60;r.playerCheckpoint=60;s.health=57;r.playerCar.health=57;m.keyDown({code:'KeyR',repeat:false,preventDefault(){},stopImmediatePropagation(){}});assert.equal(s.health,57);assert(raceCorridorPosition(g,r,{...s,jump:r.playerCar.jump},60).valid);
 m.respawnActor=recover;m.abort();
}
console.log('PASS R30 long-vehicle oscillation recovery, preserved damage, no forward checkpoint and physical finish at 30/60 Hz');
