import assert from 'node:assert/strict';
import '../dist/modern-vehicles.js';
import {VEHICLES} from '../dist/vehicles.js';
import {VILLA,areaPoint,gameplaySpawns,gameplayStructures} from '../dist/gameplay-areas.js';
import {VILLA_GARAGE} from '../dist/villa-treves-layout.js';
import {hangarCatalogue,hangarCategory,hangarThumbnail,paintHangarVehicle,hangarInBay} from '../dist/villa-mandria-hangar.js';
import * as THREE from '../dist/vendor/three.module.js';
import {vehicleBlocked} from '../dist/movement.js';

const all=hangarCatalogue(),ids=all.map(c=>c.id);
assert(ids.length>=35,'all registered base, NPC, freight and special vehicles must appear');
assert.equal(new Set(ids).size,ids.length,'no duplicates');
for(const id of ['mito','cinquecento','cruiser','truck','tir','autotreno','falco','levante','libellula','albatros','tank','bicycle','kick-scooter'])
 assert(ids.includes(id),'missing playable catalogue entry '+id);
assert(all.every(c=>c.name===VEHICLES[c.id].name&&Number.isFinite(c.spec.max)&&c.category),'valid names, stats and category');
assert.equal(hangarCategory('bicycle',VEHICLES.bicycle),'bicycle');
assert.equal(hangarCategory('kick-scooter',VEHICLES['kick-scooter']),'bicycle');
assert.equal(hangarCategory('tank',VEHICLES.tank),'tracked');
assert.equal(hangarCategory('falco',VEHICLES.falco),'helicopter');
assert.equal(hangarCategory('libellula',VEHICLES.libellula),'aircraft');
assert(hangarThumbnail('car','#c33f44').startsWith('data:image/svg+xml;charset=utf-8,'),'local illustrated image for every card');
const mesh=new THREE.Group(),geometry=new THREE.BoxGeometry(),mat=new THREE.MeshStandardMaterial({color:'#a6b477'});
const body=new THREE.Mesh(geometry,mat);mesh.add(body);
paintHangarVehicle(mesh,'#b52f3d');assert.notEqual(body.material,mat,'vehicle paint must clone shared materials');
const first=body.material.color.getHexString();paintHangarVehicle(mesh,'#397084');assert.notEqual(first,body.material.color.getHexString(),'color choice must update the selected model');
assert.equal(mat.color.getHexString(),'a6b477','shared original vehicle materials cannot be recolored');
const terrain={modern:true,gameplayPatches:[{height:10}],elevation:()=>10,height:()=>10,groundHeight:()=>10};
const collision={near:()=>gameplayStructures(terrain).filter(s=>s.solid)};
const stage=areaPoint(VILLA,VILLA_GARAGE.u,VILLA_GARAGE.v);
for(const [id,s] of [['airport-cargo',{width:33,length:27,height:8}],['airport-blackbird',{width:18,length:31,height:5.8}],['autotreno',VEHICLES.autotreno]]){
 assert(!vehicleBlocked(stage.x,stage.z,-Math.PI/2,collision,s,10),id+' must fit the one exhibition bay');
}
assert(hangarInBay(stage),'showroom position recognized as occupied');
assert(!hangarInBay(areaPoint(VILLA,0,26)),'vehicle on driveway has left hangar and must be preserved');
const villaSpawns=gameplaySpawns().filter(s=>s.name==='Villa della Mandria');
assert.equal(villaSpawns.length,7,'all preexisting villa vehicles preserved');
assert(villaSpawns.every(s=>s.x<VILLA.x),'preexisting vehicles moved away from hangar');
console.log('PASS Mandria hangar: '+all.length+' listed vehicles, bicycle/scooter, illustrative SVG, live paint, cargo/Blackbird clearance and 7 original spawns');
