import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './dist/vendor/three.module.js';
import {SpatialIndex,makeRoadGraph,nearestRoad,dist,pointInside,collides} from './dist/core.js';
import {VEHICLES} from './dist/vehicles.js';
import {ModernGameplay} from './dist/modern-gameplay.js';
import {DEALER_SITES,DEALER_CATALOG,Dealerships,createDealerVehicle,reserveDealerBuildings,dealerWallParts,dealerQuote} from './dist/dealerships.js';

const luxury=Object.values(DEALER_CATALOG).filter(c=>c.luxury),ordinary=Object.values(DEALER_CATALOG).filter(c=>!c.luxury);
assert.equal(DEALER_SITES.length,10);assert(luxury.length>=13);assert(ordinary.length>=10);
assert.equal(Object.values(DEALER_CATALOG).filter(c=>c.custom).length,4,'Only four new industrial models');
assert.equal(new Set(luxury.map(c=>c.base)).size,luxury.length,'Luxury silhouettes must be different');
assert(luxury.every(c=>VEHICLES[c.id].length>=5.049),'Luxury models must be full-size');
for(const c of luxury)assert(createDealerVehicle(c.id).children.length>5,'Vehicle must have its own detailed model: '+c.id);

// Check actual Padova footprints, road graph and original map coordinates.
const map=JSON.parse(fs.readFileSync(new URL('./dist/data/padova.json',import.meta.url)));
const collision=new SpatialIndex(60);
const localSites=DEALER_SITES.filter(s=>s.city.startsWith('Padova')),selected=reserveDealerBuildings(map.buildings,localSites);
assert.equal(selected.size,localSites.length,'All Padova sites need a real OSM footprint');
for(const b of map.buildings){const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]);Object.assign(b,{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:0});if(b.dealerSite)for(const wall of dealerWallParts(b))collision.add(wall,wall.minX,wall.minZ,wall.maxX,wall.maxZ);else collision.add(b,b.minX,b.minZ,b.maxX,b.maxZ);}
const graph=makeRoadGraph(map.roads),storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
const scene=new THREE.Scene(),cars=[],state={started:true,mode:'foot',quality:'high',money:20000,elapsed:0};
const shops=new Dealerships({scene,terrain:{height:()=>0,dry:()=>true},collision,cars,state,regionalWorld:()=>null,buildings:map.buildings,
 roadAt:p=>nearestRoad(p,graph,false,{maxRadius:90,fallback:false,maxMs:10}),
 addCar:(x,z,yaw,police,parked,style)=>{const car={x,z,yaw,parked,style,spec:VEHICLES[style],mesh:new THREE.Group()};cars.push(car);scene.add(car.mesh);return car;},pose:()=>{}});
for(const site of localSites){
 const p=shops.locate(site);assert(p,'No existing building near '+site.name);
 assert(dist(site,{x:p.cx,z:p.cz})<270,'Showroom must stay in its real neighbourhood');
 assert(p.dealerSlots.every(q=>pointInside(q.x,q.z,p.p)&&!collides(q.x,q.z,.5,collision,0)),'Displayed cars must fit inside the original building and away from walls');
 assert(!collides(p.dealerDoor.outside.x,p.dealerDoor.outside.z,.35,collision,0),'Showroom entrance must open to the street');
 state.x=site.x;state.z=site.z;for(let i=0;i<40&&!shops.active.has(site.id);i++)shops.update();
 const entry=shops.active.get(site.id);assert(entry);assert.equal(entry.units.length,p.dealerSlots.length);
 state.money=50000;
 const car=entry.units[0],money=state.money;assert(shops.buy(car));assert.equal(state.money,money-car.dealerPrice);assert(shops.owned.has(car.style));
 assert(!shops.steal(car),'Purchased car cannot be stolen from dealer stock');
 const stolen=entry.units[1],ownedBefore=shops.owned.size;assert(shops.steal(stolen));assert.equal(shops.owned.size,ownedBefore);
 state.x=site.x+900;state.z=site.z+900;shops.update();assert(!shops.active.has(site.id));
}
const quote=dealerQuote('salone_6',{color:'#aa3442',speed:2,wheels:'bronze',interior:'premium',name:'La mia GT'});
assert.equal(quote.total,DEALER_CATALOG.salone_6.price+220+2200+340+490+120);
assert.equal(quote.max,VEHICLES.salone_6.max+12);
state.x=localSites[0].x;state.z=localSites[0].z;shops.update();state.money=50000;
const before=state.money;assert(shops.purchase(localSites[0],'salone_6',quote));assert.equal(state.money,before-quote.total,'Configured total deducted once');assert.equal(shops.builds.get('salone_6').name,'La mia GT');
const restarted=new Dealerships({scene,terrain:{},collision,cars,state,regionalWorld:()=>null,roadAt:()=>null,pose:()=>{}});
assert(restarted.owned.has('salone_0')&&restarted.purchased.has('padova-lusso:0'),'Purchase must survive reload');
assert.equal(restarted.builds.get('salone_6').wheels,'bronze','Configured vehicle must survive reload');

const air=Object.create(ModernGameplay.prototype);
air.state={wanted:3,elapsed:1,x:0,z:0,y:0};air.dealerPursuitUntil=75;air.fiveStarAt=0;air.policeAir=[];
air.spawnPoliceAir=()=>{air.policeAir.push({x:0,z:0,y:45,yaw:0,mesh:{userData:{}},airLights:[]});};
air.terrain={height:()=>0};air.pose=()=>{};air.clearPoliceAir=()=>{air.policeAir.length=0;};
air.updatePoliceAir(.016);assert.equal(air.policeAir.length,1,'Robbery must bring helicopter at three stars');
air.state.elapsed=80;air.updatePoliceAir(.016);assert.equal(air.policeAir.length,0,'Helicopter must eventually allow escape');
console.log('PASS dealerships: mapped interiors and entrances, 13 luxury models, options, purchases, theft and helicopter');
