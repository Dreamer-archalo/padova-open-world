import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import vm from 'node:vm';
import {safePedestrianSpot,pedestrianCapacity} from '../dist/npc-spawn-policy.js';
import {mobileRamp,updateWheelie,wheeliePose,fuelImpact,explodeFuelTruck} from '../dist/stunt-traffic.js';
import {leaveAircraft,openChute,freefallStep} from '../dist/flight-exit.js';
import {groundVehicleStep} from '../dist/vehicle-dynamics.js';
import {VEHICLES} from '../dist/vehicles.js';
import {laneOffset,laneCount} from '../dist/traffic.js';
import {SpatialIndex,dist} from '../dist/core.js';
import {Districts} from '../dist/districts.js';

let seed=31006;const random=Math.random;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
// Seed before constructing the controller population as well as the simulation.
const {t,ctx}=await import('./controller-harness.mjs');
const context={terrain:t.terrain,graph:t.graph,collision:t.world.collision},populations=[];
try{
 for(const [name,x,z] of [['villa',t.state.x,t.state.z],['center',0,100],['portello',1210,-430],['industrial',4000,0]]){
  Object.assign(t.state,{x,z,y:t.terrain.height(x,z),mode:'foot',car:null,speed:0});
  for(const p of t.people){p.mesh.visible=false;p.retryAt=0;p.cityTask=null;p.driverCar=null;}
  let checked=0,max=0;const born=new Map();let replacements=0;
  for(let i=0;i<1200;i++){
   t.state.elapsed+=.1;t.updatePeople(.1);
   const visible=t.people.filter(p=>p.mesh.visible&&!p.driverPool);max=Math.max(max,visible.length);
   for(const p of visible){assert(safePedestrianSpot(context,p),'unsafe pedestrian '+name);checked++;
    if(born.has(p)&&born.get(p)!==p.anchor)replacements++;born.set(p,p.anchor);
   }
  }
  assert.equal(replacements,0,'no timer-driven respawn of visible pedestrians');
  assert(t.people.filter(p=>p.mesh.visible).every(p=>dist(p,t.state)>3),'no clustering at player spawn');
  populations.push({name,max,checked,replacements});
 }
 assert(populations[1].max>=populations[0].max*3,'center substantially denser than peripheral villa');
 assert.equal(pedestrianCapacity('motorway',120),0);
 for(const road of [{k:'residential',w:6},{k:'secondary',w:12},{k:'motorway',w:7,oneway:1},{k:'trunk',w:7,oneway:-1}]){
  for(let lane=0;lane<laneCount(road);lane++){
   const offset=laneOffset(road,lane);assert(offset<=road.w/2-1&&offset>=-road.w/2+1);
   if(!road.oneway)assert(offset<0,'drive on right side in either travel direction');
  }
 }
 const flat={height:()=>0,slope:()=>0,waterAt:()=>null,roads:{sample:()=>0},dry:()=>true},empty=new SpatialIndex(60),jumps=[];
 for(const hz of [30,60])for(const moving of [false,true]){
  const truck={x:0,z:0,y:0,yaw:0,speed:moving?4:0,health:100,spec:VEHICLES.camionrampa,mesh:new THREE.Group()};
  const car={x:0,z:-8,y:0,yaw:0,speed:18,health:100,spec:VEHICLES.sedan};let launched=false,landed=false,peak=0;
  for(let i=0;i<hz*5;i++){
   truck.z+=truck.speed/hz;flat.mobileRamps=[mobileRamp(truck)];
   const hit=groundVehicleStep(car,car,{turn:0,handbrake:false},1/hz,flat,empty);
   assert.equal(hit.hitSpeed,0,'mobile ramp should not be treated as a wall');
   launched ||= hit.launched;landed ||= hit.landed;peak=Math.max(peak,car.y);
  }
  assert(launched&&landed&&peak>3.3,'real ballistic jump off parked/moving ramp truck');jumps.push({hz,moving,peak});
 }
 for(const style of ['motorcycle','scooter','trail','cruiser','supersport','naked','enduro','touring']){
  const c={style,spec:VEHICLES[style],speed:15,health:100};for(let i=0;i<60;i++)updateWheelie(c,true,1/60);
  assert(c.wheelie>.4&&wheeliePose(c).lift>.2,style+' front wheel lifts');
  for(let i=0;i<90;i++)updateWheelie(c,false,1/60);assert.equal(c.wheelie,0,'release lowers wheel');
 }
 const tank={style:'cisterna',spec:VEHICLES.cisterna,x:0,z:0,y:0,yaw:0,speed:0,health:100,mesh:new THREE.Group()},other={style:'sedan',spec:VEHICLES.sedan,x:0,z:3,y:0,yaw:0,speed:20,health:100,mesh:new THREE.Group()},player={mode:'car',car:other,health:100};let blasts=0;
 assert.equal(fuelImpact(other,tank),tank);assert(explodeFuelTruck(tank,{cars:[tank,other],state:player,time:4,blast:()=>blasts++}));assert(tank.mesh.visible&&tank.permanentlyDestroyed&&tank.burning&&other.health<100&&player.health===other.health);assert(!explodeFuelTruck(tank,{cars:[],time:5,blast:()=>blasts++}));assert.equal(blasts,1);
 const plane={spec:VEHICLES.rondone,mesh:new THREE.Group(),speed:40},state={x:0,z:0,y:100,yaw:0,speed:40,health:73,car:plane,mode:'car'};
 leaveAircraft(state,0);assert(state.freefall&&!state.parachuting);for(let i=0;i<60;i++)freefallStep(state,{turn:0},1/60,flat,empty);
 assert(state.y<90&&state.health===73&&!state.parachuting,'E exit falls without automatic chute');assert(openChute(state,flat));assert(state.parachuting&&!state.freefall);
 const controls=fs.readFileSync('dist/game.js','utf8');assert(!controls.includes("e.code==='KeyF')ejectParachute"));assert(controls.includes("e.code==='Digit0'||e.code==='Numpad0'"));
 // Full controller: sustained B affects the playable bike's render, not just a helper.
 const spot=t.dryRoad({x:-2000,z:500},VEHICLES.naked),bike=t.addCar(spot.x,spot.z,spot.yaw,false,true,'naked');
 Object.assign(t.state,{mode:'car',car:bike,x:bike.x,z:bike.z,y:bike.y,yaw:bike.yaw,speed:15,health:100,freefall:false,parachuting:false});t.keys.clear();t.keys.add('KeyB');
 for(let i=0;i<30;i++){t.state.elapsed+=1/60;t.movePlayer(1/60);}assert(bike.wheelie>.3&&bike.mesh.rotation.x<-.2,'controller B wheelie');t.keys.clear();
 const saved={x:t.state.x,z:t.state.z};Object.assign(t.state,{mode:'foot',car:null,x:-3292,z:3242,y:t.terrain.height(-3292,3242)});
 t.createBikerGroup();let groupSamples=0,wheelieSamples=0,maxSpread=0,roadSamples=0;
 for(let i=0;i<400;i++){t.state.elapsed+=.1;t.updateTraffic(.1);const group=t.cars.filter(c=>c.bikerGroup&&c.mesh.visible);
  if(group.length===3){groupSamples++;maxSpread=Math.max(maxSpread,...group.map(c=>dist(c,group[0])));wheelieSamples+=group.filter(c=>c.wheelie>.15).length;}
  for(const c of t.cars){
   if(!c.mesh.visible||c.parked||c.road?.oneway||c.road?.one||c.prev===undefined||c.target===undefined)continue;
   const a=t.graph.nodes[c.prev],b=t.graph.nodes[c.target];if(!a||!b||Math.min(dist(c,a),dist(c,b))<18)continue;
   const yaw=Math.atan2(b.x-a.x,b.z-a.z),side=(c.x-a.x)*Math.cos(yaw)-(c.z-a.z)*Math.sin(yaw);
   assert(side<0,'actual mapped traffic must remain on the right half of the road');roadSamples++;
  }
 }
 assert(groupSamples>200&&maxSpread<90&&wheelieSamples>0,'group retains three real motorcycles and performs wheelies');
 assert(roadSamples>100,'sample real non-junction traffic in both directions');
 const parkedSlots=t.cars.filter(c=>c.ambientParking).length;assert(parkedSlots>=7,'additional curb parking slots');
 const report={populations,jumps,models:['cisterna','camionrampa','supersport','naked','enduro','touring'],wheelie:'B',parachute:'0',blasts,group:{groupSamples,wheelieSamples,maxSpread},roadSamples,parkedSlots};
 fs.mkdirSync('test-artifacts/r31',{recursive:true});fs.writeFileSync('test-artifacts/r31/simulation.json',JSON.stringify(report,null,2));console.log('PASS R31',JSON.stringify(report));
}finally{Math.random=random;}
