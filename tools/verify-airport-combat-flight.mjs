import assert from 'node:assert/strict';
import '../dist/airport-interactivity.js';
import {aircraftControlStep,abandonedFlightStep,BLACKBIRD,BLACKBIRD_LIMIT,BLACKBIRD_EFFECT} from '../dist/airport-combat-flight.js';
import {VEHICLES} from '../dist/vehicles.js';

const jet={style:'airport-interceptor',spec:{...VEHICLES['airport-interceptor']},x:0,y:100,z:0,yaw:0,speed:80,health:100};
const state={car:jet,x:0,y:100,z:0,yaw:0,vy:0,speed:80};
const dive=aircraftControlStep(state,.15,{dive:true,boost:true,left:true},0);
assert(dive&&!dive.crashed&&dive.pitch<0,'independent Ctrl dive failed');
assert(state.y<100,'dive must lose altitude');
assert(state.speed>80,'Shift must accelerate aircraft');
assert(state.yaw>0,'Shift must add steering authority');
const afterDive=state.y;
for(let i=0;i<10;i++)aircraftControlStep(state,.1,{climb:true},0);
assert(state.flightPitch>0&&state.y>afterDive,'Space must pitch upward and gain altitude');
assert.equal(jet.flightPitch,state.flightPitch,'visual pitch not synchronized with pilot');

const blackbird={style:BLACKBIRD,spec:{...VEHICLES[BLACKBIRD]},x:0,y:100,z:0,yaw:0,speed:BLACKBIRD_EFFECT-1,health:100};
const recon={car:blackbird,x:0,y:100,z:0,yaw:0,vy:0,speed:BLACKBIRD_EFFECT-1};
for(let i=0;i<120;i++)aircraftControlStep(recon,1/60,{boost:true},0);
assert(recon.speed>=BLACKBIRD_EFFECT,'Blackbird cannot reach visual shockwave threshold');
assert(recon.speed<=BLACKBIRD_LIMIT+1e-6,'Blackbird exceeds 600 km/h');
assert.equal(Math.round(BLACKBIRD_LIMIT*3.6),600,'maximum speed wrong');

const terrain={height:()=>0,dry:()=>true},collision={near:()=>[]};
const soft={x:0,y:14,z:0,yaw:0,speed:0,spec:VEHICLES['airport-trainer'],flightAbandoned:{startAltitude:14,vy:0,speed:4,age:0,done:false}};
let softResult;for(let i=0;i<600&&!soft.flightAbandoned.done;i++)softResult=abandonedFlightStep(soft,1/60,terrain,collision);
assert(soft.flightAbandoned.done&&!softResult.crashed&&soft.y===0,'low-altitude aircraft did not land safely');
const hard={x:0,y:95,z:0,yaw:0,speed:0,spec:VEHICLES['airport-jet'],flightAbandoned:{startAltitude:95,vy:0,speed:25,age:0,done:false}};
let hardResult;for(let i=0;i<600&&!hard.flightAbandoned.done;i++)hardResult=abandonedFlightStep(hard,1/60,terrain,collision);
assert(hard.flightAbandoned.done&&hardResult.crashed,'high abandoned aircraft must crash');
console.log('PASS independent jet pitch/climb, Shift acceleration/turn, Blackbird 560/600 kmh, low-altitude auto-landing, high-altitude crash');
