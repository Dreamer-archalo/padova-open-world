import assert from 'node:assert/strict';
import {makeRoadGraph} from './dist/core.js';
import {TaxiPathfinder} from './dist/Pathfinder.js';
import {CityStream} from './dist/streaming.js';

// This destination is 350 m from the only connected road. The first normal
// 320 m pass cannot find it; the bounded retry must find a driveable road.
const road={n:'Connected test road',k:'residential',w:8,access:'yes',p:[[350,0],[355,0]]};
const graph=makeRoadGraph([road],{separateLevels:true});
const terrain={roads:{sample:()=>10},height:()=>10};
const finder=new TaxiPathfinder({graph,terrain,bounds:{x:-1000,z:-1000,w:2000,h:2000}});
const found=finder.nearestRoad({x:0,z:0},{maxRadius:320,maxCandidates:2500,maxMs:18});
assert(found,'bounded retry must not reject a valid, connected nearby road');
assert.equal(found.segment.road,road,'retry must return the original road, not raw map coordinates');
assert.equal(finder.nearestRoad({x:2001,z:0}),null,'out-of-map coordinates must remain invalid');

let inTransit=true,requests=0;
globalThis.document={body:{classList:{contains(name){return name==='taxi-transit'&&inTransit;}}}};
await import('./dist/taxi-loading-guard.js');
const stream=Object.create(CityStream.prototype);
stream.prefetch=()=>{requests++;};stream.metrics={pressure:false,coreQueued:4,detailQueued:7,queued:11};stream.lastPlan='old';
assert.equal(stream.coreReady(350,0,72),true,'taxi must never wait on a destination worker');
assert.equal(stream.coreReady(350,0,72),true,'repeated same-target readiness must remain immediate');
assert.equal(requests,1,'prefetch must run once, not on each frame');
assert.equal(stream.update({x:350,z:0}),0,'taxi must skip chunk generation during transit');
assert.equal(stream.metrics.pressure,true);
assert.equal(stream.metrics.queued,0);
assert.equal(stream.coreReady(450,0,72),true);
assert.equal(requests,2,'new destination should still be prefetched once');
inTransit=false;
console.log('PASS taxi destination fallback, connected-road selection, no redundant prefetch and nonblocking transit');
