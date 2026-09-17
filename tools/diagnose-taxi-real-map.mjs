import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {SpatialIndex,makeRoadGraph,project} from '../dist/core.js';
import {taxiDestinations} from '../dist/taxi-service.js';
import {TaxiDispatcher} from '../dist/TaxiDispatcher.js';
import {TaxiPathfinder} from '../dist/Pathfinder.js';
import {VEHICLES} from '../dist/vehicles.js';
import {applyCityData} from '../dist/districts.js';
import {prepareGameplayMap} from '../dist/gameplay-areas.js';
import {Terrain} from '../dist/terrain.js';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../dist/data/${name}.json`,import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);
const terrain=new Terrain(read('terrain'),map,{modern:true});
const graph=makeRoadGraph(map.roads,{separateLevels:true});
const pathfinder=new TaxiPathfinder({graph,terrain,bounds:{x:-6050,z:-6550,w:13400,h:12900}});
const places=[
 {name:'Prato della Valle',x:-115,z:960},
 {name:'Piazza dei Signori',x:-278,z:-137},
 {name:'Portello',...project(45.4108,11.8918)},
 {name:'Arcella',...project(45.4291,11.8828)},
 {name:'Stadio Euganeo',...project(45.4352,11.8564)}
];
const destinations=taxiDestinations(places,{x:-150,z:-49},project(45.3964,11.8494));
let found=0,maxMs=0;
for(const dest of destinations){
 const start=performance.now(),road=pathfinder.nearestRoad(dest,{maxRadius:320,maxCandidates:2500,maxMs:18}),ms=performance.now()-start;
 maxMs=Math.max(ms,maxMs);found+=Number(!!road);
 console.log('TAXI_DESTINATION',JSON.stringify({name:dest.name,road:!!road,ms:Math.round(ms)}));
 assert(ms<450,`Taxi destination search exceeds safe bounded time: ${dest.name}`);
}
assert(found>=6,'at least six of ten real taxi destinations must have a nearby drivable road');
const dispatcher=new TaxiDispatcher({graph,terrain,collision:new SpatialIndex(),taxiSpec:VEHICLES.taxi,vehicleBlocked:()=>false,pathfinder});
let dispatched=0;
for(const origin of [{x:-115,z:960,yaw:0},{x:-150,z:-49,yaw:0},{x:235,z:545,yaw:0}]){
 const start=performance.now(),plan=dispatcher.planDispatch(origin),ms=performance.now()-start;
 dispatched+=Number(!!plan);
 console.log('TAXI_PICKUP',JSON.stringify({origin,connected:!!plan,ms:Math.round(ms),length:plan?.path.length??0}));
 assert(ms<500,'Real-map taxi dispatch must not monopolize the browser main thread');
}
assert(dispatched>=1,'at least one real central location must dispatch an actual connected taxi route');
console.log('PASS real Padova taxi stress:',JSON.stringify({destinationsFound:found,total:destinations.length,dispatches:dispatched,maxDestinationMs:Math.round(maxMs)}));
