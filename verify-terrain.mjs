import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from './dist/vendor/three.module.js';
import {Terrain,WaterRecovery,PRATO,safeDryRoad} from './dist/terrain.js';
import {CityWorld,PLACES} from './dist/world.js';
import {VEHICLES,createVehicle,vehiclesOverlap} from './dist/vehicles.js';
import {SpatialIndex,makeRoadGraph,dist} from './dist/core.js';
import {vehicleBlocked,cameraBoom} from './dist/movement.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./dist/data/'+name,import.meta.url)));
const grid=read('terrain.json'),data=read('padova.json'),terrain=new Terrain(grid,data);
assert.equal(grid.verticalScale,1);assert(grid.heights.some(h=>h<4)&&grid.heights.some(h=>h>23));
assert.throws(()=>new Terrain({...grid,heights:[NaN]},data));
for(const [x,z] of [[grid.x0,grid.z0],[grid.x0+grid.step*(grid.width-1),grid.z0+grid.step*(grid.height-1)],[0,0],[-5970,-6480],[7250,6230]])assert([terrain.height(x,z),terrain.elevation(x,z),terrain.waterHeight(x,z)].every(Number.isFinite));
assert.equal(terrain.elevation(grid.x0,grid.z0),grid.heights[0]);
// Slight sample perturbations must not cause discontinuities in the elevation grid.
for(let x=-5000;x<6000;x+=640)assert(Math.abs(terrain.elevation(x-.001,10)-terrain.elevation(x+.001,10))<.001);
const testGrid={...grid,x0:-100,z0:-100,step:100,width:3,height:3,heights:[14,13,12,13,12,11,12,11,10],waterPlane:[12,-.01,-.01]};
const synthetic=new Terrain(testGrid,{water:[{p:[[-100,0],[100,0]],w:20},{p:[[0,-100],[0,100]],w:4}],areas:[],roads:[{p:[[0,-30],[0,30]],w:8,b:true}]});
assert(synthetic.waterAt(30,0)!==null);assert.equal(synthetic.waterAt(0,0),null,'bridge must cross water');assert(synthetic.height(0,0)>synthetic.waterHeight(0,0)+2);assert(synthetic.waterAt(5,0)!==null,'outside bridge footprint must be hazardous');assert(synthetic.waterHeight(90,0)<synthetic.waterHeight(-90,0),'downhill water');
assert(synthetic.groundHeight(30,0)<synthetic.waterHeight(30,0),'river bed below water');
assert(Math.abs(synthetic.height(0,-30.001)-synthetic.height(0,-29.999))<.01,'bridge approach continuity');
function local(x,z){return {x:PRATO.x+Math.cos(PRATO.yaw)*x+Math.sin(PRATO.yaw)*z,z:PRATO.z-Math.sin(PRATO.yaw)*x+Math.cos(PRATO.yaw)*z};}
for(const [x,z,wet] of [[0,0,false],[85,15,true],[85,0,false],[0,130,false],[110,0,false]]){const p=local(x,z);assert.equal(terrain.waterAt(p.x,p.z)!==null,wet,'Prato island, ring and footbridges');}
const recovery=new WaterRecovery();recovery.remember({x:30,z:40,yaw:1},synthetic);const last={...recovery.lastDry};recovery.enter(12,10);recovery.remember({x:30,z:0,yaw:0},synthetic);assert.deepEqual(recovery.lastDry,last);assert(!recovery.enter(15,10));let done=false;for(let i=0;i<82;i++)done=recovery.step(1/60)||done;assert(done&&recovery.y<10);recovery.reset();assert(!recovery.active);
// Nose, tail and front corners of the truck must collide; a bike still fits.
const obstacle={p:[[1.12,3.3],[1.5,3.3],[1.5,3.8],[1.12,3.8]],minX:1.12,maxX:1.5,minZ:3.3,maxZ:3.8,h:8,minY:12},index=new SpatialIndex();index.add(obstacle,1.12,3.3,1.5,3.8);
assert(vehicleBlocked(0,0,0,index,VEHICLES.truck));assert(!vehicleBlocked(0,0,0,index,VEHICLES.motorcycle));
assert(vehicleBlocked(0,0,Math.PI,index,VEHICLES.truck));
assert(cameraBoom({x:0,y:15,z:3.5},{x:5,y:15,z:3.5},index).x<1.12,'raised foundations affect camera');
assert.equal(cameraBoom({x:0,y:22,z:3.5},{x:5,y:22,z:3.5},index).x,5);
assert(vehiclesOverlap({x:0,z:0,yaw:0,style:'truck'},{x:0,z:4,yaw:Math.PI/2,style:'motorcycle'}));
assert(!vehiclesOverlap({x:0,z:0,yaw:0,style:'truck'},{x:5,z:4,yaw:0,style:'motorcycle'}));
for(const type of ['mito','motorcycle','scooter','truck']){const model=createVehicle(type,'#aa3344'),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());assert(size.z<=VEHICLES[type].length+.05,type+' model beyond collision length');assert(size.x<=VEHICLES[type].width+.12,type+' model beyond collision width');assert(size.z>VEHICLES[type].length*.8);model.traverse(o=>{if(o.isMesh)assert(o.geometry.attributes.position.array.every(Number.isFinite));});}
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){}})})};
const scene=new THREE.Scene(),world=new CityWorld(scene,data,terrain),graph=makeRoadGraph(data.roads);
for(const p of PLACES)for(const type of ['mito','motorcycle','truck']){const spec=VEHICLES[type],spawn=safeDryRoad(p,graph,world.collision,terrain,spec);assert(spawn,'dry spawn '+p.name+' '+type);assert(terrain.dry(spawn.x,spawn.z,spec.length/2));assert(!vehicleBlocked(spawn.x,spawn.z,spawn.yaw,world.collision,spec));assert(dist(spawn,p)<300);}
let bridges=0;for(const r of data.roads.filter(r=>r.b))for(let i=1;i<r.p.length;i++){const x=(r.p[i-1][0]+r.p[i][0])/2,z=(r.p[i-1][1]+r.p[i][1])/2;if(terrain.waterDistance(x,z)<0){assert.equal(terrain.waterAt(x,z),null,'real bridge hazard');bridges++;}}
assert(bridges>20);
for(const name of ['Palazzo della Ragione','Cappella degli Scrovegni','Chiesa degli Eremitani']){const group=world.landmarks.children.find(g=>g.userData.buildingName===name);assert(group&&group.children.length===1);const b=data.buildings.find(b=>b.n===name);assert(b.authoredLandmark);assert.equal(group.position.y,b.minY);assert(group.children[0].geometry.attributes.position.array.every(Number.isFinite));}
console.log('PASS: offline DEM, continuous grades, river bed, bridge approaches, '+bridges+' real bridge segments, Prato ring/passages, fall timer, truck corners, vehicle models, dry spawns for all landmarks and vehicle types, authored landmark foundations.');
