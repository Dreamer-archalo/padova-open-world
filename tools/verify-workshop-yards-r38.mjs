import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {SpatialIndex,makeRoadGraph,collides} from '../dist/core.js';
import {Terrain,safeDryRoad} from '../dist/terrain.js';
import {RegionalWorld} from '../dist/regional-world.js';
import {reserveDealerBuildings,DEALER_SITES,dealerWallParts} from '../dist/dealerships.js';
import {WORKSHOP_SITES} from '../dist/vehicle-workshops.js';
import {findWorkshopYard,createWorkshopYard,animateWorkshopYard,registerWorkshopWalls} from '../dist/workshop-yard.js';
import {VEHICLES} from '../dist/vehicles.js';
import {createPerson} from '../dist/world.js';

const data=JSON.parse(fs.readFileSync('dist/data/padova.json')),
 grid=JSON.parse(fs.readFileSync('dist/data/terrain.json')),
 region=JSON.parse(fs.readFileSync('dist/data/region-padova-venice.json')),
 regionalGrid=JSON.parse(fs.readFileSync('dist/data/world-terrain.json'));
reserveDealerBuildings(data.buildings,DEALER_SITES.filter(s=>s.city.startsWith('Padova')));
const terrain=new Terrain(grid,data,{modern:true}),collision=new SpatialIndex(60);
for(const b of data.buildings){const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]);Object.assign(b,{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:terrain.elevation((Math.min(...xs)+Math.max(...xs))/2,(Math.min(...zs)+Math.max(...zs))/2),h:Math.max(2.6,b.h||7)});if(b.dealerSite)for(const wall of dealerWallParts(b))collision.add(wall,wall.minX,wall.minZ,wall.maxX,wall.maxZ);else collision.add(b,b.minX,b.minZ,b.maxX,b.maxZ);}
const regional=new RegionalWorld(new THREE.Scene(),region,regionalGrid,collision);regional.installTerrainHooks(terrain);
const graph=makeRoadGraph(data.roads,{separateLevels:true});
const safeRoad=p=>{if(!regional.contains(p.x,p.z))return safeDryRoad(p,graph,collision,terrain,VEHICLES.mito);
 return regional.nearestRoad(p.x,p.z,300,null,r=>r.w>=4.5&&/^(primary|secondary|tertiary|residential|unclassified|living_street)$/.test(r.k))||regional.nearestRoad(p.x,p.z,650,null,r=>r.w>=3.5&&!/steps|footway|path|cycleway|pedestrian|motorway|trunk|service/.test(r.k));};
const result=[];
for(const site of WORKSHOP_SITES){const road=safeRoad(site),yard=findWorkshopYard(site,safeRoad,terrain,(x,z,y,r)=>!collides(x,z,r,collision,y));
 result.push({id:site.id,road:yard?.road.kind||road?.road?.k||road?.segment?.road?.k,distance:yard?Math.round(Math.hypot(yard.road.x-site.x,yard.road.z-site.z)):null,ready:!!yard,side:yard?.side});
 assert(yard,`No drivable, clear front entrance for ${site.id}: ${JSON.stringify(result.at(-1))}`);
 assert(terrain.dry(yard.parking.x,yard.parking.z,1,yard.parking.y));
 assert(!collides(yard.parking.x,yard.parking.z,1,collision,yard.parking.y));
 assert(Math.hypot(yard.road.x-yard.parking.x,yard.road.z-yard.parking.z)<20);
}
// The four people stand on the sampled surface, walk/talk and remain visible.
globalThis.document={createElement:()=>({width:512,height:128,getContext:()=>({fillRect(){},fillText(){},set fillStyle(v){},set textAlign(v){},set font(v){}})})};
const scene=new THREE.Scene(),sample=WORKSHOP_SITES[0],yard=findWorkshopYard(sample,safeRoad,terrain,(x,z,y,r)=>!collides(x,z,r,collision,y)),entry=createWorkshopYard(yard,scene,terrain,createPerson,sample);
registerWorkshopWalls(yard,collision);const rear=yard.surface(0,28);
assert(collides(rear.x,rear.z,.4,collision,rear.y),'garage back wall stops the car');
assert(!collides(yard.parking.x,yard.parking.z,1,collision,yard.parking.y),'player parking remains open');
assert.equal(entry.people.length,4);for(const p of entry.people)assert(Math.abs(p.mesh.position.y-terrain.height(p.mesh.position.x,p.mesh.position.z,p.mesh.position.y))<.08);
const first=entry.people[0].mesh.position.clone();animateWorkshopYard({...entry,visible:true},5,terrain);assert(first.distanceTo(entry.people[0].mesh.position)>.1);
for(const p of entry.people)assert(Math.abs(p.mesh.position.y-terrain.height(p.mesh.position.x,p.mesh.position.z,p.mesh.position.y))<.08);
console.log('PASS R38 workshops: seven roadside entrances, open parking bays, dry clear yards, visible moving staff/customers. '+JSON.stringify(result));
