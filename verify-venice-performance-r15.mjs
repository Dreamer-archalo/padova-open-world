import assert from 'node:assert/strict';
import * as THREE from './dist/vendor/three.module.js';
import {SpatialIndex} from './dist/core.js';
import {RegionalWorld} from './dist/regional-world.js';

const scene=new THREE.Scene(),collision=new SpatialIndex(80),x0=32000,z0=-4000;
const grid={width:100,height:80,step:100,x0,z0,heights:Array(100*80).fill(.35)};
const region=new RegionalWorld(scene,{roads:[],water:[],areas:[],buildings:[],shorelines:[]},grid,collision);

region.quality='low';
const veniceLow=region.streamProfile(35000,0),inlandLow=region.streamProfile(25000,0);
region.quality='high';
const veniceHigh=region.streamProfile(35000,0);
assert(veniceLow.loadRadius<veniceHigh.loadRadius,'Performance must stream fewer sectors than Detailed');
assert(veniceLow.loadRadius<inlandLow.loadRadius,'Lagoon budget must be tighter than inland budget');
assert(veniceLow.coastBuildings<veniceHigh.coastBuildings,'Performance must cap expensive detailed lagoon buildings');
assert(veniceLow.tileDetail<veniceHigh.tileDetail,'Performance must reduce terrain/water tessellation');

region.quality='low';
region.focus={x:35000,z:0};
const stagedBuild=region.buildSteps('110,0');
assert.equal(stagedBuild.next().done,false,'A regional sector must yield before completing expensive geometry');
stagedBuild.return();
for(let frame=0;frame<80;frame++)region.update({x:35000,z:0,elapsed:frame/60},1/60);
assert.equal(region.queue.length,0,'Low profile Venice sector queue should settle');
assert.equal(region.pendingBuild,null,'Cooperative regional build must complete without leaving partial work');
assert(region.visible.size<=25,'Low profile must keep the lagoon working set bounded: '+region.visible.size);
assert.equal(region.metrics.loaded,region.visible.size);
assert(region.metrics.maxBuildMs>=region.metrics.lastBuildMs&&region.metrics.totalBuilt>=region.visible.size,
 'Regional performance telemetry must report real sector construction');

const actor={x:35000,z:0,mesh:{visible:true}},near={x:35030,z:0,mesh:{visible:true}},
 edge={x:35089,z:0,mesh:{visible:true}},far={x:35200,z:0,mesh:{visible:true}};
region.refreshTrafficCells([actor,near,edge,far]);
assert.deepEqual(new Set(region.nearbyTraffic(actor)),new Set([near,edge]),
 'NPC collision queries must inspect nearby spatial cells instead of the whole world fleet');
console.log('PASS R15 Venice performance:',region.visible.size,'low-profile sectors; spatial traffic lookup and build telemetry active.');
