import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from './dist/vendor/three.module.js';
import {VEHICLES} from './dist/vehicles.js';
import {Terrain,safeDryRoad} from './dist/terrain.js';
import {CityWorld,PLACES} from './dist/world.js';
import {makeRoadGraph,safeRoadPoint,roadRoute,collides,dist} from './dist/core.js';
// Exercise actual world geometry in Node. This does not claim browser or visual QA.
globalThis.document={createElement(){return {width:0,height:0,getContext(){return {fillRect(){}};}};}};
const data=JSON.parse(fs.readFileSync(new URL('./dist/data/padova.json',import.meta.url)));
const scene=new THREE.Scene();const terrain=new Terrain(JSON.parse(fs.readFileSync(new URL('./dist/data/terrain.json',import.meta.url))),data);const world=new CityWorld(scene,data,terrain),graph=makeRoadGraph(data.roads);
const targets=PLACES.map(p=>{const t=safeDryRoad(p,graph,world.collision,terrain,VEHICLES.mito);assert(t,'no spawn '+p.name);assert(!collides(t.x,t.z,1,world.collision),'blocked '+p.name);return {...t,name:p.name};});
for(let i=1;i<targets.length;i++){const path=roadRoute(targets[0],targets[i],graph);assert(path.length>1,'No route to '+targets[i].name);console.log(targets[i].name,'route',Math.round(path.slice(1).reduce((d,p,k)=>d+dist(path[k],p),0))+' m','spawn offset',Math.round(dist(PLACES[i],targets[i]))+' m');}
world.update(-117,960,true);for(let i=0;i<25;i++)world.update(-117,960);
let count=0,verts=0;scene.traverse(o=>{if(o.isMesh){assert(o.geometry.attributes.position.array.every(Number.isFinite),'nonfinite geometry');count++;verts+=o.geometry.attributes.position.count;}});assert(world.loaded.size>10);console.log('Initial scene',count,'meshes',verts,'vertices',world.loaded.size,'chunks');
// The race must have enough time for the actual mapped route length.
let raceLength=0;for(let i=1;i<6;i++){const order=[0,1,2,3,5,8],path=roadRoute(targets[order[i-1]],targets[order[i]],graph);assert(path.length>1,'disconnected race stage');raceLength+=path.slice(1).reduce((s,p,k)=>s+dist(path[k],p),0);}assert(raceLength<6000,'race too long for 300 seconds');console.log('Race length',Math.round(raceLength),'m');
const spawn=targets[0];assert(!collides(spawn.x,spawn.z,1.05,world.collision));
console.log('PASS: finite world geometry, all landmark spawns and road routes, chunk loading, race distance.');
