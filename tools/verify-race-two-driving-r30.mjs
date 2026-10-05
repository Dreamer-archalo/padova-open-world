import assert from 'node:assert/strict';
import fs from 'node:fs';
import {raceOneHarness} from './race-one-harness.mjs';
import {t,ctx} from './controller-harness.mjs';
import '../dist/race-two-immersion.js';
import {raceCorridorPosition} from '../dist/race-corridor.js';
import {clamp,angleDiff} from '../dist/core.js';
import vm from 'node:vm';
// Reference driver uses real steering/throttle and physically crosses the finish.
// Both carriageways remain legal even before the optional regional map is loaded.
const m=raceOneHarness();m.restoreSnapshot();m.previousRaceRoster=[];m.start({race:2,difficulty:'hard',vehicle:'cinquecento',seed:42});const r=m.race,g=m.game,s=g.state,pts=r.samples;
r.phase='running';r.startedAt=s.elapsed;let recovery=0,damage=0,health=s.health,boost=0;const old=m.respawnActor;m.respawnActor=function(c,...a){if(c===r.playerCar)recovery++;return old.call(this,c,...a);};
const yawAt=i=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];return Math.atan2(b.x-a.x,b.z-a.z);};
for(let tick=0;tick<12000&&(!r.playerFinished||r.ai.some(c=>!c.raceFinished));tick++){
 s.elapsed+=1/60;
 if(!r.playerFinished){
 let best=Infinity,along=pts.cumulative[r.playerHint],idx=Math.min(r.playerHint,pts.length-2);
 for(let i=Math.max(r.startIndex,idx-1);i<Math.min(pts.length-1,idx+2);i++){const a=pts[i],b=pts[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),f=clamp(((s.x-a.x)*dx+(s.z-a.z)*dz)/(len*len),0,1),d=Math.hypot(s.x-a.x-dx*f,s.z-a.z-dz*f);if(d<best){best=d;along=pts.cumulative[i]+len*f;}}
 const aim=along+12+Math.abs(s.speed)*.24;let ti=idx;while(ti<pts.length-2&&pts.cumulative[ti+1]<aim)ti++;const a=pts[ti],b=pts[ti+1],len=Math.hypot(b.x-a.x,b.z-a.z),f=clamp((aim-pts.cumulative[ti])/len,0,1),yaw=Math.atan2(b.x-a.x,b.z-a.z),bend=Math.abs(angleDiff(yawAt(Math.min(pts.length-1,ti+3)),yaw));
 let lane=r.corridor.stations[ti].members[1]?.side||0;const obstacle=r.obstacles.find(o=>o.mesh.visible&&Math.hypot(o.x-s.x,o.z-s.z)<90&&(o.x-s.x)*Math.sin(yaw)+(o.z-s.z)*Math.cos(yaw)>0);if(obstacle){const side=(obstacle.x-a.x)*Math.cos(yaw)-(obstacle.z-a.z)*Math.sin(yaw);if(Math.abs(side-lane)<2)lane+=side>lane?-.7:.7;}
 let x=a.x+(b.x-a.x)*f+Math.cos(yaw)*lane,z=a.z+(b.z-a.z)*f-Math.sin(yaw)*lane;if(ti>=pts.length-2){x+=Math.sin(yaw)*28;z+=Math.cos(yaw)*28;}const goal=Math.atan2(x-s.x,z-s.z),diff=angleDiff(goal,s.yaw);
 let desired=s.elapsed<r.playerTurboUntil?r.playerCar.spec.turboMax:r.playerCar.spec.max;if(bend>.32)desired=Math.min(desired,18);else if(bend>.14)desired=Math.min(desired,28);if(Math.abs(diff)>.22)desired=Math.min(desired,24);
 t.keys.clear();if(s.speed>desired+1)t.keys.add('KeyS');else t.keys.add('KeyW');if(diff>.014)t.keys.add('KeyA');else if(diff<-.014)t.keys.add('KeyD');
 if(boost<3&&r.playerProgress/r.total>=[.19,.51,.81][boost]&&bend<.1){m.keyDown({code:'ShiftLeft',repeat:false,preventDefault(){},stopImmediatePropagation(){}});boost++;}
 vm.runInContext('collisionCooldown=Math.max(0,collisionCooldown-1/60)',ctx);t.movePlayer(1/60);m.applyPlayerTurbo(1/60);
 }
 m.updateAI(1/60);m.updatePlayer();if(tick%1200===0)console.log('R30_DRIVE_PROGRESS',JSON.stringify({tick,progress:r.playerProgress,health:s.health,recovery,x:s.x,z:s.z,y:s.y,speed:s.speed}));if(s.health<health)damage+=health-s.health;health=s.health;
}
const result={state:{x:s.x,z:s.z,y:s.y,speed:s.speed,health:s.health,hint:r.playerHint,progress:r.playerProgress},bots:r.ai.map(c=>({finished:c.raceFinished,progress:c.raceProgress,health:c.health})),finished:r.playerFinished,times:r.finishTimes,order:r.finishOrder,recovery,damage,models:r.ai.map(c=>c.style)};
console.log('R30_DRIVE_RESULT',JSON.stringify(result));
assert(r.playerFinished&&r.ai.every(c=>c.raceFinished),'all cars physically cross the finish');assert.equal(recovery,0,'clean player never respawns');assert(damage<100,'driver can finish without destroying the car');assert(r.finishOrder.indexOf(0)<3,'Cinquecento stays competitive on hard through real-controller driving');
fs.mkdirSync('test-artifacts/r30',{recursive:true});fs.writeFileSync('test-artifacts/r30/merit.json',JSON.stringify(result,null,2));t.keys.clear();m.restoreSnapshot();console.log('PASS R30 real driving: Cinquecento finishes hard using the opposite carriageway',JSON.stringify(result));
