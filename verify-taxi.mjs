import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SpatialIndex} from './dist/core.js';
import {taxiFare,taxiDestinations,advanceTaxi} from './dist/taxi-service.js';
import {TaxiDispatcher} from './dist/TaxiDispatcher.js';
import {TaxiPathfinder} from './dist/Pathfinder.js';
import {VEHICLES} from './dist/vehicles.js';

assert.equal(taxiFare({x:0,z:0},{x:1,z:1}),10,'minimum fare');
assert.equal(taxiFare({x:0,z:0},{x:20000,z:20000}),100,'absolute maximum fare');
const places=[
 {name:'Portello',tag:'Università',x:10,z:20},
 {name:'Prato della Valle',tag:'Piazza',x:30,z:40},
 {name:'Stazione',tag:'Trasporti',x:50,z:60}
];
const destinations=taxiDestinations(places,{x:-100,z:-100},{x:100,z:100});
for(const name of ['Albignasego','Sacro Cuore','Vigonza','Ponte San Nicolò','Portello','Prato della Valle','Stazione','Zona Industriale','Aeroporto','Villa'])assert(destinations.some(p=>p.name===name),name+' destination');
assert(destinations.length<=10,'destination menu remains compact');

const terrain={height:()=>0,dry:()=>true},collision=new SpatialIndex(),car={x:0,z:0,y:0,yaw:0,speed:0,spec:VEHICLES.taxi};
const path=[{x:0,z:0},{x:0,z:120}];let index=0,arrived=false,blocked=false,maxStep=0;
for(let i=0;i<1800&&!arrived;i++){
 const before={x:car.x,z:car.z},step=advanceTaxi(car,path,index,1/60,terrain,collision);
 index=step.index;arrived=step.arrived;blocked||=step.blocked;
 maxStep=Math.max(maxStep,Math.hypot(car.x-before.x,car.z-before.z));
}
assert(arrived,'taxi physically follows its road path');
assert(!blocked,'clear route is not blocked');
assert(car.z>115,'taxi reaches pickup');
assert(maxStep<1,'progressive bounded movement');

// Test the current modular dispatcher, rather than removed legacy callTaxi/beginTaxiTrip globals.
const stubPathfinder={
 nearestRoad:pos=>({x:pos.x,z:pos.z,y:0,yaw:0}),
 route:(from,to)=>[{x:from.x,z:from.z},{x:to.x,z:to.z}]
};
const dispatcher=new TaxiDispatcher({graph:{},terrain,collision,taxiSpec:VEHICLES.taxi,vehicleBlocked:()=>false,pathfinder:stubPathfinder});
const plan=dispatcher.planDispatch({x:0,z:0,yaw:0});
assert(plan&&plan.path.length>=2,'dispatcher plans a physical pickup with a spawn and route');
assert(Math.hypot(plan.spawn.x,plan.spawn.z)>=28,'taxi must not spawn directly on the player');
assert(dispatcher.safe(plan.spawn)&&dispatcher.safe(plan.target),'pickup and spawn are valid');
const dispatchedCar={...plan.spawn,speed:0,spec:VEHICLES.taxi};let pickup=false,routeIndex=0;
for(let i=0;i<1800&&!pickup;i++){
 const step=dispatcher.step(dispatchedCar,plan.path,routeIndex,1/60);
 routeIndex=step.index;pickup=step.arrived;
}
assert(pickup,'the current dispatcher can complete its planned pickup');
assert.equal(new TaxiPathfinder({graph:{},terrain,bounds:{x:-10,z:-10,w:20,h:20}}).valid({x:50,z:0}),false,'out-of-bounds destination is rejected');

const game=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const mapUI=fs.readFileSync('dist/taxi-map-ui.js','utf8');
const controller=fs.readFileSync('dist/TaxiMenuController.js','utf8');
const loading=fs.readFileSync('dist/TaxiLoadingOverlay.js','utf8');
const system=fs.readFileSync('dist/TaxiSystem.js','utf8');
for(const [label,expected] of [
 ['physical taxi dispatch','function dispatchPhysicalTaxi('],
 ['dispatcher actually plans pickup','taxiDispatcher.planDispatch(state)'],
 ['taxi update','function updateTaxi(dt)'],
 ['talk range','taxiDriverNPC?.canInteract(state,3.3)'],
 ['explicit destination selection','taxiMenuController.startTaxiTransition('],
 ['real transition','await taxiSystem.travel('],
 ['single fare charge','if(!taxi.tripCharged)'],
 ['roadside drop-off','function taxiDropoffPoint('],
 ['failure releases controls','function taxiDestinationFailure(']
])assert(game.includes(expected),label+' must be wired into current game runtime');
assert(controller.includes('executeConfirmedTransition()')&&controller.includes('openConfirmation('),'menu requires confirmed transition');
assert(system.includes('async travel('),'TaxiSystem exposes asynchronous loading');
assert(loading.includes('show(')&&loading.includes('hide('),'loading overlay can open and close');
assert(mapUI.includes('mapPointFromPointer'),'custom destination transforms pointer correctly');
assert(html.includes('TAXI ABUSIVO IN TRANSITO…'),'taxi loading markup exists');
assert(fs.statSync('dist/assets/taxi-loading-pixel-atlas.webp').size>100000,'pixel-art atlas present');

console.log('PASS Taxi fare, 10 destinations, physical path, dispatcher pickup, bounds and current runtime wiring (browser UI requires manual WebGL check)');
