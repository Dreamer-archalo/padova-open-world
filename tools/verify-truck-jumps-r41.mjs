import assert from 'node:assert/strict';
import {t,ctx} from './controller-harness.mjs';
import vm from 'node:vm';
import {SpatialIndex} from '../dist/core.js';
import {VEHICLES} from '../dist/vehicles.js';
import {mobileRamp,onTruckRamp} from '../dist/stunt-traffic.js';
import {groundVehicleStep,startArcadeJump,landingDamage,resetGroundMotion} from '../dist/vehicle-dynamics.js';
import {commandSet} from '../dist/command-guide.js';

const flat={height:()=>0,slope:()=>0,waterAt:()=>null},empty=new SpatialIndex(),input={turn:0,handbrake:false},results=[];
for(const hz of [20,30,60,120])for(const speed of [0,4,12])for(const yaw of [0,1.2]){
 const truck={x:0,z:0,y:0,yaw,speed,health:100,spec:VEHICLES.camionrampa,mesh:{visible:true}};
 const car={x:-Math.sin(yaw)*11,z:-Math.cos(yaw)*11,y:0,yaw,speed:speed+20,health:100,spec:VEHICLES.sedan};let launched=false,landed=false,peak=0;
 for(let i=0;i<hz*7;i++){
  truck.x+=Math.sin(yaw)*speed/hz;truck.z+=Math.cos(yaw)*speed/hz;flat.mobileRamps=[mobileRamp(truck)];
  const motion=groundVehicleStep(car,car,input,1/hz,flat,empty);
  assert.equal(motion.hitSpeed,0,'deck has no vertical barrier');
  if(!launched&&Math.hypot(car.x-truck.x,car.z-truck.z)<(car.spec.length+truck.spec.length)/2)assert(onTruckRamp(car,truck),'approach, ascent and cab clearance bypass truck collision');
  launched||=motion.launched;landed||=motion.landed;peak=Math.max(peak,car.y);
  if(landed)break;
 }
 assert(launched&&landed&&peak>3.5,`real moving-truck jump at ${hz} Hz / ${speed} m/s`);results.push({hz,truckSpeed:speed,peak});
 const approach={...car,x:truck.x+Math.cos(yaw)*.42-Math.sin(yaw)*6.1,
 z:truck.z-Math.sin(yaw)*.42-Math.cos(yaw)*6.1,y:truck.y,yaw:yaw+.15,speed:20};
 assert(onTruckRamp(approach,truck),'offset rear-bumper approach is collision free');
 assert(!onTruckRamp({...car,x:truck.x+Math.cos(yaw)*2,z:truck.z-Math.sin(yaw)*2,y:0},truck),'sides still collide');
 assert(!onTruckRamp({...truck,spec:VEHICLES.sedan,yaw:yaw+Math.PI,y:0},truck),'head-on collisions still work');
}
flat.mobileRamps=[];
assert(Math.max(...results.map(r=>r.peak))-Math.min(...results.map(r=>r.peak))<.3,'moving ramp launch is consistent across frame rates and truck speeds');
for(const hz of [30,60])for(const speed of [4,12,14,18]){
 const truck={x:0,z:0,y:0,yaw:0,speed,health:100,spec:VEHICLES.camionrampa,lodSpan:.1,mesh:{visible:true}},car={x:0,z:-11,y:0,yaw:0,speed:speed+15,spec:VEHICLES.mito};
 let launched=false,landed=false;
 for(let i=0;i<hz*8;i++){
  if(i%(hz/10)===0)truck.z+=speed*.1;
  flat.mobileRamps=[mobileRamp(truck)];const m=groundVehicleStep(car,car,input,1/hz,flat,empty);
  assert.equal(m.hitSpeed,0,'10 Hz traffic deck does not block entry');
  if(m.launched){assert(car.z-truck.z>1.5,'launch clears the lip, not the middle of the moving deck');launched=true;}
  if(m.landed&&launched){landed=true;break;}
 }
 assert(launched&&landed,'jump works with Iper Performance traffic updates');
}
flat.mobileRamps=[];
for(const hz of [20,30,60,120])for(const capacity of [100,525])for(const speed of [0,22]){
 const car={spec:{...VEHICLES.sedan,maxHealth:capacity},health:80},actor={x:0,z:0,y:7,yaw:0,speed,health:80};
 const terrain={...flat,height:()=>7};assert(startArcadeJump(actor,car));assert(!startArcadeJump(actor,car),'no stacking in the air');let peak=actor.y,damage=0,landed=false;
 for(let i=0;i<hz*7;i++){const m=groundVehicleStep(actor,car,input,1/hz,terrain,empty);peak=Math.max(peak,actor.y);damage+=landingDamage(m,car);if(m.landed){assert(m.arcadeLanding);actor.health-=landingDamage(m,car);landed=true;break;}}
 assert(landed);assert(Math.abs(peak-57)<.006,`50 m apex at ${hz} Hz`);assert.equal(actor.y,7);assert(Math.abs(damage*capacity/100-1)<1e-9,'exactly one life point with/without armor');
 assert(!car.jump.arcadeJump);assert.equal(landingDamage({landed:true,landingSpeed:22},car),30,'next ordinary fall retains normal damage');resetGroundMotion(car);assert.equal(car.jump,null);
}
for(const spec of [{aircraft:true},{watercraft:true},{boat:true}])assert(!startArcadeJump({health:100},{spec}));
assert(!startArcadeJump({health:0},{spec:VEHICLES.sedan}));assert(commandSet({mode:'car',car:{style:'sedan',spec:VEHICLES.sedan}}).commands.some(([key,label])=>key==='9'&&label.includes('50 m')));

// Exercise the actual controller, including its car collision and damage loop.
const saved={roofs:t.terrain.roofs,height:t.terrain.height,slope:t.terrain.slope,waterAt:t.terrain.waterAt,near:t.world.collision.near};
t.terrain.roofs=null;t.terrain.height=()=>0;t.terrain.slope=()=>0;t.terrain.waterAt=()=>null;t.world.collision.near=()=>[];for(const c of t.cars)c.mesh.visible=false;t.keys.clear();
const truck=t.addCar(0,0,0,false,false,'camionrampa'),car=t.addCar(0,-11,0,false,false,'sedan');truck.mesh.visible=car.mesh.visible=true;truck.health=car.health=100;truck.speed=4;
Object.assign(t.state,{mode:'car',car,x:0,z:-11,y:0,yaw:0,speed:24,health:100,paused:false});t.keys.add('KeyW');let launched=false,landed=false;
for(let i=0;i<600;i++){truck.z+=truck.speed/60;t.poseVehicle(truck);t.movePlayer(1/60);if(!launched)assert.equal(t.state.health,100,'actual traffic collision does not block ramp approach');launched||=!!car.jump?.airborne;if(launched&&!car.jump?.airborne){landed=true;break;}}
assert(launched&&landed,'controller jumps over the real ramp truck');truck.mesh.visible=false;t.keys.clear();resetGroundMotion(car);
Object.assign(t.state,{x:0,z:-20,y:0,yaw:0,speed:0,health:80});car.health=80;car.spec={...car.spec,maxHealth:525};
const manager=vm.runInContext('inputManager',ctx);manager.onKeyDown({code:'Digit9',repeat:false});assert(car.jump.airborne);const vy=car.jump.vy;manager.onKeyDown({code:'Digit9',repeat:true});assert.equal(car.jump.vy,vy);
for(let i=0;i<600&&car.jump.airborne;i++)t.movePlayer(1/60);
assert(!car.jump.airborne);assert(Math.abs(t.state.health-(80-100/525))<1e-9,'controller applies exactly one armored life point');assert(!car.severeCrash&&!car.burning);
manager.onKeyDown({code:'Numpad9',repeat:false});assert(car.jump.airborne,'numeric keypad works');resetGroundMotion(car);
Object.assign(t.terrain,{roofs:saved.roofs,height:saved.height,slope:saved.slope,waterAt:saved.waterAt});t.world.collision.near=saved.near;
assert.equal(t.cars.filter(c=>c.encounterStyle==='camionrampa').length,3,'three persistent ramp trucks across quality levels');
console.log('PASS R41 truck ramps: 32 moving/stationary approaches including 10 Hz traffic, collision clearance, 16 fifty-metre jumps, one life point, repeat guards and actual keyboard/controller integration.',results);
