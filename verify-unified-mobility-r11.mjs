// Lightweight build checks for R11 mobility before expensive OSM previews.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {VEHICLES} from './dist/vehicles.js';
import {MICHELANGELO,MAX_KMH,createMichelangeloModel} from './dist/unified-michelangelo.js';
import {BOAT_SPECS,createBoatModel} from './dist/nautical-catalog.js';
import {regionalVehiclePickup,vehicleFamily} from './dist/unified-vehicle-pickup.js';
import {heliPosition,RegionalAirTraffic} from './dist/regional-air-traffic.js';
import {RegionalWorld} from './dist/regional-world.js';

assert.equal(MAX_KMH,1000);
assert.equal(Math.round(VEHICLES[MICHELANGELO].max*3.6),1000);
assert(VEHICLES[MICHELANGELO].plane&&VEHICLES[MICHELANGELO].aircraft);
const plane=createMichelangeloModel();
assert(plane.isGroup&&plane.children.length>10,'Michelangelo should have dedicated 3D parts');
assert.equal(Object.keys(BOAT_SPECS).length,10);
for(const [id,b] of Object.entries(BOAT_SPECS)){
 assert(VEHICLES[id]?.watercraft&&VEHICLES[id].maxKmh===b.maxKmh,'Missing registered boat '+id);
 assert(createBoatModel(id)?.isGroup,'Missing real watercraft mesh '+id);
}
assert.equal(vehicleFamily(VEHICLES[MICHELANGELO]),'Aria');
assert.equal(vehicleFamily(VEHICLES['boat-sport']),'Acqua');

const lookups=[],roads={nearestRoad(x,z,range){
 lookups.push({x,z,range});
 return {x,z,y:1,yaw:0,road:{k:x>80?'footway':'residential',w:x>80?2:7.5}};
}};
const here={x:0,z:0,yaw:0};
const delivered=regionalVehiclePickup(roads,here,{width:1.9,length:4.3},p=>p.x<80);
assert(delivered&&delivered.road.k==='residential'&&lookups.length>0,
 'V must find OSM roads outside Padova');
const footOnly={nearestRoad:()=>({x:100,z:100,y:1,yaw:0,road:{k:'footway',w:2}})};
assert.equal(regionalVehiclePickup(footOnly,here,{width:1.9,length:4.3}),null,
 'Cars must not be placed on Venetian pedestrian calli');
assert.equal(regionalVehiclePickup(roads,here,{width:1.9,length:4.3},()=>false),null,
 'Never deliver vehicles in occupied or colliding roads');

const pad={x:3500,z:-3400,y:1};
for(const phase of [0,.05,.14,.37,.75,.91,.98,1,1.5]){
 const p=heliPosition(pad,phase);
 assert(Object.values(p).every(Number.isFinite),'Invalid continuous regional rotorcraft route');
 assert(p.y>=pad.y+.9,'No subterranean regional helicopters');
}
const beginning=heliPosition(pad,0),loop=heliPosition(pad,1);
assert(Math.abs(beginning.x-loop.x)<1e-6&&Math.abs(beginning.y-loop.y)<1e-6,
 'Helicopters must return to same pad every complete cycle');
const scene={children:[],add(o){this.children.push(o)},remove(o){
 this.children.splice(this.children.indexOf(o),1)}};
const terrain={height:()=>1,elevation:()=>1,dry:()=>true},collision={near:()=>[]};
const air=new RegionalAirTraffic(scene,terrain,collision);
assert(air.aircraft.filter(a=>a.kind==='plane').length===4);
assert(air.aircraft.filter(a=>a.kind==='helicopter').length>=3,
 'Dolo/Mirano/Marghera/Porto/Oriago should add private helicopter traffic when safe');
assert(air.pads.length>=3);
const first=air.update({x:14500,z:-3300,y:1,elapsed:12},'low');
assert(first.visible<=3,'Low graphics mode must cap visible flying NPCs');
const second=air.update({x:14500,z:-3300,y:1,elapsed:250},'high');
assert(second.visible<=7,'High graphics mode should cap visible flying NPCs');

const roadsFixture=Array.from({length:20},(_,i)=>({
 p:[[14940+i*3,30],[14965+i*3,30]],w:6.5,k:i%3?'residential':'footway'
}));
const grid={x0:14720,z0:0,width:4,height:4,step:160,heights:Array(16).fill(1)};
const regional=new RegionalWorld({add(){},remove(){}},{
 roads:roadsFixture,buildings:[],areas:[],water:[],shorelines:[]
},grid,{add(){}});
regional.focus={x:14990,z:64};regional.quality='medium';
const regionGroup={userData:{},add(){}};
regional.ambient(regionGroup,regional.chunks.get('46,0')||{roads:[]});
const arrivals=regionGroup.userData.ambient||[];
assert(arrivals.some(a=>a.person&&a.detail),
 'Near regional foot NPCs must reuse detailed Padova character models');
assert(arrivals.some(a=>!a.person&&a.detail),
 'Near regional traffic must reuse detailed Padova car models');
assert(arrivals.some(a=>a.person&&a.mesh.userData.hips?.children),
 'Regional character models must retain animated limbs');

const game=fs.readFileSync('dist/game.js','utf8'),
 hangar=fs.readFileSync('dist/villa-mandria-catalog-ui.js','utf8'),
 runtime=fs.readFileSync('dist/phase2-runtime.js','utf8'),
 region=fs.readFileSync('dist/regional-world.js','utf8');
for(const symbol of ['regionalVehiclePickup','extendRegionalDocks','new RegionalAirTraffic',
 'createMichelangeloModel','watercraftStep(state,keys,dt,terrain)','MAX_KMH']){
 assert(game.includes(symbol),'Unified controller missing '+symbol);
}
assert(game.includes('if(e.code===\'KeyV\')vehiclesMenu()'));
assert(hangar.includes("if(id==='airport-michelangelo')return createMichelangeloModel()"));
assert(hangar.includes("enabled:true}"));
assert(/import ['"]\.\/padova-boats\.js(?:\?[^'"]+)?['"]/.test(runtime),'Boat module must register in phase2 even after cache-bust');
assert(region.includes('regionalAmbientShared')&&region.includes('q===actor.previous'));
console.log('PASS: registered 1000 km/h Michelangelo, 10 navigable boats, regional V road-safety, detailed regional people/cars, world air traffic and quality budgets.');
