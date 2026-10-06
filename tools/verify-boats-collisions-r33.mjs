import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {BOAT_SPECS,createBoatModel,watercraftStep,boatLaunchPoint} from '../dist/nautical-catalog.js';
import {VEHICLES} from '../dist/vehicles.js';
import {launchPadovaBoat} from '../dist/padova-boats.js';
import {SpatialIndex} from '../dist/core.js';
import {vehicleBlocked} from '../dist/movement.js';
import {groundVehicleStep} from '../dist/vehicle-dynamics.js';
import {carPairResponse} from '../dist/vehicle-contact.js';
import {impactResponse} from '../dist/incidents.js';
import '../dist/airport-traffic-enhancement.js';
import '../dist/airport-interactivity.js';
import '../dist/airport-flight-extras.js';
import '../dist/airport-combat-flight.js';
import {SPECIAL_VEHICLES,SPECIAL_MODEL_FACTORIES,createSpecialVehicle} from '../dist/special-vehicles.js';
const boats=[];
for(const [id,s] of Object.entries(BOAT_SPECS)){
 const model=createBoatModel(id),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());assert.equal(model.userData.modelRevision,33);assert(model.children.length<=3);assert(size.x>=s.width*.65&&size.x<s.width*1.10,id+' beam '+size.x);assert(size.z>=s.length*.90&&size.z<s.length*1.12,id+' length '+size.z);assert(bounds.min.y<0&&bounds.max.y<s.airDraft+.42,id+' bridge envelope '+bounds.max.y);assert(model.getObjectByName('boat-glass')||['gondola','electric'].includes(s.kind));
 let triangles=0;model.traverse(o=>{if(o.isMesh){assert([...o.geometry.attributes.position.array].every(Number.isFinite));triangles+=o.geometry.attributes.position.count/3;}});assert(triangles<18000,id+' triangle budget');boats.push({id,width:size.x,length:size.z,height:size.y,triangles,drawCalls:model.children.length,maxKmh:s.maxKmh});
}
const aircraft=[];
for(const id of SPECIAL_MODEL_FACTORIES.keys()){const model=createSpecialVehicle(id),spec=VEHICLES[id],size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());assert.equal(model.userData.vehicleType,id);assert(size.x>=spec.width*.65,id+' must include aircraft wings');assert(size.z>=spec.length*.7,id+' aircraft fuselage');aircraft.push({id,width:size.x,length:size.z});}
SPECIAL_VEHICLES['test-future-plane']={width:20,length:16,height:4,plane:true,aircraft:true};const future=createSpecialVehicle('test-future-plane');assert(new THREE.Box3().setFromObject(future).getSize(new THREE.Vector3()).x>18,'unregistered aircraft must never become generic trucks');delete SPECIAL_VEHICLES['test-future-plane'];
const fastIds=['boat-speedster','boat-catamaran','boat-jetski-race'],water={waterSample:()=>({distance:-100}),waterHeight:()=>0,bridge:()=>null},velocities=[];
for(const hz of [30,60])for(const id of fastIds){const c={spec:VEHICLES[id],mesh:createBoatModel(id)},state={x:0,z:0,y:0,yaw:0,speed:0,health:100,car:c,elapsed:0};for(let i=0;i<hz*8;i++){state.elapsed+=1/hz;watercraftStep(state,new Set(['KeyW','ShiftLeft']),1/hz,water);}assert(Math.abs(state.speed*3.6-BOAT_SPECS[id].maxKmh)<.01);velocities.push({id,hz,kmh:state.speed*3.6});}
// Even a large time slice must not tunnel through a thin bank or bridge.
for(const obstacle of ['bank','bridge']){const id='boat-jetski-race',c={spec:VEHICLES[id],mesh:createBoatModel(id)},s={x:0,z:0,yaw:0,speed:VEHICLES[id].max,health:100,car:c};const terrain={...water,waterSample:(x,z)=>({distance:obstacle==='bank'&&z>5&&z<5.6?0:-100}),bridge:(x,z)=>obstacle==='bridge'&&z>5&&z<5.6?{height:.5}:null};const hit=watercraftStep(s,new Set(['KeyW','ShiftLeft']),.5,terrain);assert(hit.blocked&&s.z<5,obstacle+' swept stop');}
// A mapped dock facing a low bridge must use its safe opposite direction.
const launchTerrain={...water,bridge:(x,z)=>z>5&&z<9?{height:.5}:null},dock={x:0,z:0,yaw:0},launch=boatLaunchPoint(BOAT_SPECS['boat-speedster'],launchTerrain,dock);assert(launch&&Math.cos(launch.yaw)<-.99&&Math.hypot(launch.x,launch.z)<=12);assert.equal(boatLaunchPoint(BOAT_SPECS['boat-speedster'],{...water,bridge:()=>({height:.5})},dock),null,'a fully obstructed dock must refuse a launch');
const launchGame={state:{freefall:true,parachuting:true,character:'fede'},scene:new THREE.Scene(),terrain:water,nautical:{docks:[{...dock,x:200,z:300,y:0,width:24,id:0}]},addCar:(x,z,yaw,p,park,id)=>({x,z,yaw,spec:VEHICLES[id],mesh:new THREE.Group()})};assert(launchPadovaBoat(launchGame,'boat-speedster',0));assert.equal(launchGame.state.freefall,false);assert.equal(launchGame.state.parachuting,false);assert.equal(launchGame.state.car.mesh.position.x,launchGame.state.x);assert.equal(launchGame.state.car.mesh.position.z,launchGame.state.z);assert.equal(launchGame.state.car.mesh.rotation.y,launchGame.state.yaw);
const flat={height:()=>0,slope:()=>0,waterAt:()=>null},index=new SpatialIndex(20),wall={p:[[2,-100],[2.1,-100],[2.1,100],[2,100]],minY:0,h:10};index.add(wall,2,-100,2.1,100);
const make=(yaw,speed,x=0,z=0)=>({x,z,y:0,yaw,speed,health:100,spec:VEHICLES.sedan,mesh:new THREE.Group()});
const impacts=[];
for(const hz of [30,60,120])for(const kind of ['front','glance','reverse']){
 const c=make(kind==='front'?Math.PI/2:kind==='reverse'?-Math.PI/2:.10,kind==='reverse'?-35:kind==='front'?35:30,kind==='glance'?0:-2);let normal=0,hadContact=false;for(let i=0;i<hz*2;i++){const hit=groundVehicleStep(c,c,{turn:0,handbrake:false},1/hz,flat,index);normal=Math.max(normal,hit.hitSpeed);hadContact ||=!!hit.contact;assert(!vehicleBlocked(c.x,c.z,c.yaw,index,c.spec,c.y),'full footprint penetrated '+kind);}
 assert(hadContact);if(kind==='glance'){assert(c.z>52&&c.speed>23,kind+' should keep forward motion '+c.z+' / '+c.speed);assert(normal<4);assert(impactResponse(normal).damage<1);}else{assert(normal>30&&c.speed*(kind==='reverse'?-1:1)<0,'head-on must rebound');assert(impactResponse(normal).damage<45&&!impactResponse(normal).destroy);}impacts.push({hz,kind,normal,finalSpeed:c.speed,x:c.x,z:c.z});
}
for(const kind of ['front','glance','reverse']){const rows=impacts.filter(r=>r.kind===kind);assert(Math.max(...rows.map(r=>r.finalSpeed))-Math.min(...rows.map(r=>r.finalSpeed))<.1,'30 / 60 / 120 Hz contact consistency');}
// Contact normals work on rotated facades, and sliding in the air retains gravity.
for(const angle of [.37,-.9,2.2]){const rotate=([x,z])=>[x*Math.cos(angle)+z*Math.sin(angle),-x*Math.sin(angle)+z*Math.cos(angle)],p=wall.p.map(rotate),rotated=new SpatialIndex(20);rotated.add({...wall,p},Math.min(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[0])),Math.max(...p.map(v=>v[1])));const [x,z]=rotate([-2,0]),car=make(Math.PI/2+angle,35,x,z);let impact=0;for(let i=0;i<60;i++){impact=Math.max(impact,groundVehicleStep(car,car,{turn:0,handbrake:false},1/60,flat,rotated).hitSpeed);assert(!vehicleBlocked(car.x,car.z,car.yaw,rotated,car.spec,car.y));}assert(car.speed<0&&impact>34.9);}
const flying=make(.1,30);flying.y=4;flying.jump={airborne:true,vx:Math.sin(.1)*30,vz:Math.cos(.1)*30,vy:0};for(let i=0;i<30;i++)groundVehicleStep(flying,flying,{turn:0,handbrake:false},1/60,flat,index);assert(Math.abs(flying.y-(4-.5*18*.5**2))<.03,'wall contact must not freeze vertical gravity');assert(flying.jump.airborne&&flying.jump.vy< -8.9);
// Bridge decks remain height-aware.
const deckIndex=new SpatialIndex(20),deck={...wall,minY:10,h:2};deckIndex.add(deck,2,-100,2.1,100);const under=make(Math.PI/2,35);for(let i=0;i<60;i++)groundVehicleStep(under,under,{turn:0,handbrake:false},1/60,flat,deckIndex);assert(under.x>30,'underpass ceiling must not act like a ground wall');
const empty=new SpatialIndex(20),a=make(0,22,0,-1.8),b=make(Math.PI,22,0,1.8),pair=carPairResponse(a,a,b,empty);assert(pair&&pair.impact>40);assert(a.speed<0&&b.speed<0,'both cars rebound from opposing velocities');assert(!impactResponse(pair.impact).destroy);const aa=make(0,20,0,0),bb=make(0,20,1.5,0),parallel=carPairResponse(aa,aa,bb,empty);assert.equal(parallel.impact,0,'side by side cars do not receive a frontal damage penalty');assert(aa.speed>19&&bb.speed>19);
fs.writeFileSync('docs/boats-collisions-r33-results.json',JSON.stringify({boats,aircraft,velocities,impacts,pair:{impact:pair.impact,speedA:a.speed,speedB:b.speed},sweep:true,underpass:true},null,2));console.log('PASS R33 MODELS / PHYSICS',JSON.stringify({boats:boats.length,aircraft:aircraft.length,velocities,impacts,pair:pair.impact}));
