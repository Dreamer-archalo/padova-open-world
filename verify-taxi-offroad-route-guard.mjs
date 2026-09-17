import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {makeRoadGraph} from './dist/core.js';
import {TaxiPathfinder} from './dist/Pathfinder.js';

// Generic roadRoute scans the entire segments array when its starting or
// ending point has no locally indexed road. The taxi must reject such paths
// BEFORE calling the generic router, even when called repeatedly during a
// failed pickup/departure.
let globalScans=0;
const sparse={
  index:{near(){return new Set();}},
  nodes:[],
  get segments(){globalScans++;throw new Error('Unbounded global road scan');}
};
const taxi=new TaxiPathfinder({graph:sparse,terrain:{height:()=>0}});
const started=performance.now();
for(let i=0;i<1000;i++)assert.deepEqual(taxi.route({x:10000+i,z:5000},{x:0,z:0}),[]);
assert.equal(globalScans,0,'off-road searches must never enter the full-city fallback');
assert(performance.now()-started<250,'one thousand rejected off-road routes should be inexpensive');

const road={n:'Connected car street',k:'residential',w:8,access:'yes',p:[[0,0],[0,150]]};
const graph=makeRoadGraph([road],{separateLevels:true});
const connected=new TaxiPathfinder({graph,terrain:{height:()=>0}});
const path=connected.route({x:0,z:10},{x:0,z:140});
assert(path.length>=2,'valid taxi route on a nearby connected road is preserved');
assert.deepEqual(connected.route({x:1500,z:1500},{x:0,z:50}),[],'off-road pickup aborts without scanning the map');
assert.deepEqual(connected.route({x:0,z:50},{x:-2000,z:1800}),[],'off-road destination aborts without scanning the map');
console.log('PASS 1000 off-road taxi routes never scan global graph; normal connected taxi routing remains available');
