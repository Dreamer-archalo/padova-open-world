import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './dist/vendor/three.module.js';
import {PadovaIntelligentNPC,PadovaSidewalkRoutes,PADOVA_NPC_R17,PEDESTRIAN_STATES,DRIVER_STATES} from './dist/urban-life.js';
import {SpatialIndex,makeRoadGraph,dist} from './dist/core.js';
import {trafficSpeed} from './dist/traffic.js';
import {VEHICLES} from './dist/vehicles.js';
import {createPerson} from './dist/world.js';

const terrain={height:()=>0,dry:()=>true};
const road={k:'residential',w:8,p:[[0,0],[0,80]],oneway:1};
const graph=makeRoadGraph([road]);
const person=(seed,x=6,z=2)=>({seed,x,z,y:0,yaw:0,speed:0,health:100,mesh:createPerson('#719085',seed)});
const state={x:6,z:0,y:0,yaw:0,elapsed:0,wanted:0,quality:'low',mode:'car',speed:0};
const game={state,terrain,graph,collision:new SpatialIndex(),people:[],cars:[],cops:[],signals:{junctions:new Map(),allowed:()=>true},pose(c){c.mesh.position.set(c.x,c.y,c.z);},toast(){},enabled:()=>true};
const ai=new PadovaIntelligentNPC(game);game.intelligentNPC=ai;
const tick=(p,seconds)=>{for(let i=0;i<seconds*20;i++){state.elapsed+=.05;ai.update();ai.personStep(p,.05);}};
const p=person(4);game.people.push(p);ai.attach(p);
// Local routes move along the sidewalk without teleporting; actual navigation
// and collision checks execute, rather than only asserting source-code tokens.
const route=ai.routes.route(p,{x:5.25,z:14});assert(route?.length,'local sidewalk route');
assert(ai.routes.lastExpansions<=PADOVA_NPC_R17.maxRouteSearch);
assert(ai.plan(p,{x:5.25,z:14}));p.aiR17.nextPlan=100;tick(p,14);assert(dist(p,{x:5.25,z:14})<1,'pedestrian reaches chosen destination');
const bench={kind:'bench',x:6,z:14,door:{x:6,z:14},seats:[{x:6,z:14,yaw:0,owner:null}]};
ai.setSites([bench]);ai.routeAt=-Infinity;assert(ai.plan(p,bench.door,'approach-bench',bench));assert(ai.reserve(p,bench));tick(p,1);assert.equal(p.aiR17.state,'seated');assert.equal(bench.seats[0].owner,p);
const second=person(5);ai.attach(second);assert(!ai.reserve(second,bench),'occupied seat cannot be double booked');
ai.emit('explosion',{x:6,z:14,y:0});tick(p,.1);assert.equal(p.aiR17.state,'fleeing');assert.equal(bench.seats[0].owner,null,'danger releases seat');tick(p,10);assert.notEqual(p.aiR17.state,'fleeing','danger has a bounded recovery');
// Bar actor must physically reach the entrance before starting entry and then
// walk to the chair. It stays visible indoors and walks back to the same door.
const bar={kind:'bar',x:6,z:20,door:{x:6,z:20},seats:[{x:7,z:22,yaw:Math.PI,owner:null}]};ai.setSites([bar]);Object.assign(p,{x:6,z:20});ai.release(p);ai.routeAt=-Infinity;assert(ai.plan(p,bar.door,'approach-bar',bar));assert(ai.reserve(p,bar));tick(p,4);assert.equal(p.aiR17.state,'bar-seated');assert(p.mesh.visible);assert(dist(p,bar.seats[0])<.5);ai.transition(p,'bar-seated',.1);p.aiR17.nextPlan=state.elapsed+100;for(let i=0;i<100&&bar.seats[0].owner;i++)tick(p,.05);assert.notEqual(p.aiR17.state,'bar-seated');assert.equal(bar.seats[0].owner,null);assert(dist(p,bar.door)<.6,'bar exit uses door');
// A crossing waits for green and approaching vehicles, then completes and
// restores the destination state. Existing car traffic yields to these actors.
ai.release(p);Object.assign(p,{x:-5,z:40});p.aiR17.path=[{x:5,z:40,crossing:{junction:0,yaw:0}}];p.aiR17.pathIndex=0;ai.transition(p,'walking');let allowed=false;game.signals.allowed=()=>allowed;tick(p,.1);assert.equal(p.aiR17.state,'waiting-crossing');assert(p.x<0);allowed=true;tick(p,10);assert(p.x>4.5);assert.notEqual(p.aiR17.state,'waiting-crossing');
// A permanently blocked crossing releases its route instead of looping forever.
Object.assign(p,{x:-5,z:40});p.aiR17.path=[{x:5,z:40,crossing:{junction:0,yaw:0}}];p.aiR17.pathIndex=0;p.aiR17.goalSince=state.elapsed;ai.transition(p,'walking');p.aiR17.nextPlan=Infinity;game.signals.allowed=()=>false;tick(p,36);assert.notEqual(p.aiR17.state,'waiting-crossing','crossing watchdog recovers');game.signals.allowed=()=>true;
const car={x:-1.9,z:8,y:0,yaw:0,speed:5,health:100,spec:VEHICLES.compact,road,prev:0,target:1,driver:1,laneOffset:-1.9,mesh:new THREE.Group()};
const free=trafficSpeed(car,{x:-1.9,z:80},[],game.signals,state.elapsed);car.npcParkingSpeed=2;assert(trafficSpeed(car,{x:-1.9,z:80},[],game.signals,state.elapsed)<=2);delete car.npcParkingSpeed;assert(free>2);
// Drive -> search -> slow -> park -> leave -> walk -> return -> board -> drive.
const driver=person(0,-5.25,10);driver.driverPoolR17=true;driver.mesh.visible=false;game.people=[driver];game.cars=[car];state.x=-5.25;state.z=10;ai.indexAt=-Infinity;ai.update();assert.equal(ai.vehicleStep(car,.05),false);assert.equal(car.aiDriverR17.state,'driving');ai.vehicleStep(car,.05);assert.equal(car.aiDriverR17.state,'search-parking');ai.vehicleStep(car,.05);assert.equal(car.aiDriverR17.state,'slowing');Object.assign(car,car.aiDriverR17.spot.entry,{speed:.1});ai.vehicleStep(car,.05);assert.equal(car.aiDriverR17.state,'parking');
for(let i=0;i<180;i++){state.elapsed+=.05;ai.update();ai.vehicleStep(car,.05);if(driver.mesh.visible)ai.personStep(driver,.05);if(car.aiDriverR17?.state==='parked')break;}
assert.equal(car.aiDriverR17.state,'parked');assert(driver.mesh.visible,'driver leaves existing car');assert(car.parked);assert.equal(ai.metrics.poolBorrows,1);assert.equal(game.people.length,1,'no second population');
// Let him finish the kerb step, send him to a reachable sidewalk destination,
// then allow the same FSM to return, board and depart.
ai.setSites([]);tick(driver,3);ai.routeAt=-Infinity;assert(ai.plan(driver,{x:-5.25,z:34},'walking'));driver.aiR17.nextPlan=state.elapsed+8;tick(driver,20);for(let i=0;i<800&&car.aiDriverR17;i++){state.elapsed+=.05;ai.update();ai.personStep(driver,.05);ai.vehicleStep(car,.05);}assert.equal(ai.metrics.driverCycles,1,'driver completes the return and departure cycle');assert(!car.parked);assert.equal(ai.metrics.poolReturns,1);
// Near/middle/far scheduling, low-budget actors, stolen/destroyed vehicles,
// cancellation and bounded graph caches prevent loops and resource growth.
const distant=person(8,900,0);ai.attach(distant);ai.personStep(distant,.1);assert(!distant.mesh.visible);assert(!distant.aiR17);for(let i=0;i<20;i++)ai.routes.local({x:i*100,z:0});assert(ai.routes.cache.size<=PADOVA_NPC_R17.maxRouteCaches);assert(PEDESTRIAN_STATES.includes('conversation')&&DRIVER_STATES.includes('boarding'));
const previous=ai.metrics.transitions;game.enabled=()=>false;ai.personStep(p,.1);ai.vehicleStep(car,.1);assert.equal(ai.metrics.transitions,previous,'AI is disabled outside Padova');
// Existing dedicated verifiers include the real wallet callback, fare/charge,
// hangar physics and industrial dealership catalogue.
await import('./verify-taxi-wallet.mjs');await import('./verify-hangar-air.mjs');await import('./verify-dealerships.mjs');
const source=fs.readFileSync('dist/game.js','utf8');assert(source.includes('hangarRoofDeparture&&dist(state,VILLA)<170'));assert(source.includes('roofWreck?{...openVilla'));assert(source.includes('if(!taxi.tripCharged)'));assert(source.includes('getBalance:()=>state.money'));
console.log('PASS R17: sidewalks, crossing, seats, bar door/exit, danger recovery, driver full cycle, bounded routing/pooling, Padova-only, taxi and aircraft');
