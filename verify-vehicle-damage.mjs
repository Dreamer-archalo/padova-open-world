import assert from 'node:assert/strict';
import * as THREE from './dist/vendor/three.module.js';
import {damageStage,installVehicleDamage,updateVehicleDamage,vehiclePerformanceFactor} from './dist/vehicle-damage.js';
import {VEHICLES} from './dist/vehicles.js';
import {t} from './tools/controller-harness.mjs';

assert.deepEqual([100,71,41,17].map(damageStage),[0,1,2,3]);
assert.equal(vehiclePerformanceFactor(100),1);
assert.equal(vehiclePerformanceFactor(35),1);
assert(vehiclePerformanceFactor(10)<.88&&vehiclePerformanceFactor(10)>.75);

const actor={mesh:new THREE.Group(),spec:VEHICLES.sport,health:100,simple:false};
const visual=installVehicleDamage(actor);assert(visual&&visual.root.children.length===4,'shared lightweight damage layers installed');
assert.equal(installVehicleDamage(actor),visual,'damage layers are installed once');
updateVehicleDamage(actor,65,1);assert(visual.crack.visible&&!visual.hood.visible&&!visual.smoke.visible);
updateVehicleDamage(actor,30,2);assert(visual.crack.visible&&visual.dent.visible&&visual.hood.visible&&!visual.smoke.visible);
updateVehicleDamage(actor,10,3);assert(visual.smoke.visible,'critical damage shows smoke');
actor.simple=true;updateVehicleDamage(actor,10,4);assert([...visual.root.children].every(o=>!o.visible),'Iper Performance hides damage details');
actor.simple=false;updateVehicleDamage(actor,100,5);assert([...visual.root.children].every(o=>!o.visible),'repair clears visual damage');

const car=t.addCar(t.state.x+20,t.state.z+20,0,false,true,'sport');
assert(car.damageVisual,'controller vehicles carry damage visuals');car.health=30;t.poseVehicle(car);assert.equal(car.damageVisual.stage,2);car.health=100;t.poseVehicle(car);assert.equal(car.damageVisual.stage,0);
console.log(JSON.stringify({tiers:4,criticalPerformance:vehiclePerformanceFactor(10),damageObjects:visual.root.children.length,hyperHidden:true,controllerIntegration:true},null,2));
