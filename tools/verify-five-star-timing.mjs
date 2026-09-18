import assert from 'node:assert/strict';
import vm from 'node:vm';
import {t,ctx,els} from './controller-harness.mjs';
import {VEHICLES} from '../dist/vehicles.js';
const api=vm.runInContext('({gameplay,poseVehicle,incidents})',ctx),gp=api.gameplay;
// Real player tank and TAB cannon input. Independently advance the gameplay's
// actual timed wanted-level state machine before observing real military units.
t.clearPolice();t.cancelMission(false);t.waterRecovery.reset();api.incidents.recovery=null;
t.keys.clear();for(const c of t.cars)c.mesh.visible=false;for(const p of t.people)p.mesh.visible=false;
gp.cannon.clear();gp.clearEnemies();gp.graceUntil=0;
Object.assign(t.state,{parachuting:false,respawnHome:false,health:100,speed:0,knockX:0,knockZ:0,spin:0});
t.travel({x:-900,z:-500,name:'Five-star timing regression'});
const tank=t.cars.find(c=>c.style==='tank');assert(tank,'no playable tank');
const road=t.dryRoad(t.state,VEHICLES.tank);assert(road,'no reachable road to initiate pursuit');
Object.assign(tank,{x:road.x,z:road.z,yaw:road.yaw,y:t.terrain.height(road.x,road.z),speed:0,health:100,fireAt:0});api.poseVehicle(tank);
tank.mesh.visible=true;
Object.assign(t.state,{mode:'foot',car:null,x:tank.x+Math.cos(tank.yaw)*(tank.spec.width/2+1),z:tank.z-Math.sin(tank.yaw)*(tank.spec.width/2+1),y:tank.y,speed:0,health:100});
t.toggleVehicle();assert.equal(t.state.car,tank,'failed to board real tank');
t.keys.add('Tab');for(let i=0;i<330;i++){t.state.elapsed+=1/60;t.movePlayer(1/60);}t.keys.clear();
assert.equal(t.state.wanted,5,'real TAB cannon input did not reach five stars');
// UI wanted value can be raw 5 before gameplay.update has paced actual levels.
// Continued provocation sustains the desired 5-star state while the genuine
// paceWanted method advances level 1→5 at its actual scheduled intervals.
for(let level=1;level<=5;level++){
 t.state.wanted=5;
 if(level>1)t.state.elapsed=Math.max(t.state.elapsed,gp.wantedHoldUntil)+.02;
 gp.paceWanted();
 assert.equal(gp.wantedLevel,level,'wanted level was not paced through level '+level);
}
assert.equal(t.state.wanted,5,'paced wanted level did not reach five stars');
t.updateUI();assert.equal(els.get('wanted').textContent,'★★★★★');
assert.equal(gp.military.length,0,'military must not spawn before grace period');
assert(gp.fiveStarAt>0&&gp.nextMilitary>gp.fiveStarAt,'five-star entry did not configure delayed spawn');
const startedAt=gp.fiveStarAt,firstAllowed=Math.max(gp.graceUntil,gp.nextMilitary);
assert(firstAllowed-startedAt>=8.9,'first unit grace must last approximately nine seconds');
t.state.elapsed=firstAllowed-.02;gp.update(1/60);
assert.equal(gp.military.length,0,'first tank spawned prematurely');
t.state.elapsed=firstAllowed+.02;gp.update(1/60);
assert.equal(gp.military.length,1,'first five-star tank missing at its scheduled time');
const first=gp.military[0];assert(first.hostile&&first.mesh.visible,'first military unit not live and hostile');
const secondAllowed=Math.max(gp.nextMilitary,startedAt+18.02);
t.state.elapsed=secondAllowed+.02;gp.update(1/60);
assert.equal(gp.military.length,2,'second five-star tank missing after the 18-second gate');
assert(gp.military.every(c=>c.hostile&&c.mesh.visible&&c.spec===VEHICLES.tank),'both military tanks must be real live units');
console.log(JSON.stringify({ok:true,wanted:5,firstDelaySeconds:+(firstAllowed-startedAt).toFixed(2),secondDelaySeconds:+(secondAllowed-startedAt).toFixed(2),firstTank:true,secondTank:true,legacyInstantTwoTankAssertion:'invalid: two units are deliberately staggered'},null,2));
