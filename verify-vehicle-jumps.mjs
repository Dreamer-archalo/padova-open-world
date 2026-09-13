import assert from 'node:assert/strict';
import fs from 'node:fs';
import {t} from './tools/controller-harness.mjs';
import {groundVehicleStep,groundContact,steeringRate,JUMP_GRAVITY} from './dist/vehicle-dynamics.js';
import {VEHICLES} from './dist/vehicles.js';
import {SpatialIndex} from './dist/core.js';

const ramps=t.terrain.arcadeRamps||[];assert.equal(ramps.length,4,'four rare mapped jump ramps');
const results=[];
for(const ramp of ramps){
 const actor={x:ramp.x-Math.sin(ramp.yaw)*(ramp.length/2+7),z:ramp.z-Math.cos(ramp.yaw)*(ramp.length/2+7),y:0,yaw:ramp.yaw,speed:32};actor.y=groundContact(t.terrain,actor.x,actor.z).y;
 const car={spec:VEHICLES.mito};let launched=false,landed=false,maxY=actor.y,flightFrames=0;
 for(let i=0;i<360;i++){
  const before={x:actor.x,z:actor.z},motion=groundVehicleStep(actor,car,{turn:0,handbrake:false},1/60,t.terrain,t.world.collision);
  assert(Number.isFinite(actor.x+actor.y+actor.z+actor.yaw),'finite jump state');assert(Math.hypot(actor.x-before.x,actor.z-before.z)<1,'bounded swept step');
  launched||=motion.launched;if(motion.airborne)flightFrames++;maxY=Math.max(maxY,actor.y);if(launched&&motion.landed){landed=true;break;}if(motion.hitSpeed)break;
 }
 assert(launched,'ramp launch '+JSON.stringify({x:ramp.x,z:ramp.z}));assert(landed,'ramp landing '+JSON.stringify({x:ramp.x,z:ramp.z}));assert(flightFrames>15,'visible airborne interval');assert(maxY>Math.max(...ramp.topY)+.35,'jump clears ramp lip');
 assert(Math.abs(actor.y-groundContact(t.terrain,actor.x,actor.z,actor.y).y)<.05,'lands on mapped ground');
 results.push({x:ramp.x,z:ramp.z,flightFrames,maxY,landingX:actor.x,landingZ:actor.z});
}

const flat={height:()=>0,slope:()=>0,waterAt:()=>null,arcadeRamps:[]},empty=new SpatialIndex(),turn=(spec,speed,airborne=false)=>{const actor={x:0,z:0,y:airborne?30:0,yaw:0,speed},car={spec,jump:airborne?{airborne:true,vx:0,vz:speed,vy:2,lastX:0,lastZ:0}:null};for(let i=0;i<60;i++)groundVehicleStep(actor,car,{turn:1,handbrake:false},1/60,flat,empty);return {yaw:actor.yaw,actor,car};};
const normal=turn(VEHICLES.cinquecento,38),turbo=turn(VEHICLES.cinquecento,110),moto=turn(VEHICLES.motorcycle,53),air=turn(VEHICLES.mito,35,true);
assert(turbo.yaw>1,'turbo steering remains effective');assert(turbo.yaw<normal.yaw,'steering softens progressively with speed');assert(moto.yaw>turbo.yaw,'motorcycle steering remains more agile than a car');assert(air.yaw>0&&air.yaw<turbo.yaw*.45,'air steering is reduced but non-zero');
assert.equal(JUMP_GRAVITY,18);assert(steeringRate(VEHICLES.cinquecento,110)>1);
const report={ramps:results,gravity:JUMP_GRAVITY,steeringRadiansPerSecond:{cinquecentoNormal:normal.yaw,cinquecentoTurbo:turbo.yaw,motorcycle:moto.yaw,airborne:air.yaw}};
fs.writeFileSync('docs/vehicle-jump-results.json',JSON.stringify(report,null,2)+'\n');
console.log('PASS mapped ramps, ballistic motion, landing and high-speed steering',report);
