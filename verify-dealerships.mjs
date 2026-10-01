import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './dist/vendor/three.module.js';
import {SpatialIndex,makeRoadGraph,nearestRoad,dist} from './dist/core.js';
import {VEHICLES} from './dist/vehicles.js';
import {ModernGameplay} from './dist/modern-gameplay.js';
import {DEALER_SITES,DEALER_CATALOG,Dealerships,createDealerVehicle} from './dist/dealerships.js';

const luxury=Object.values(DEALER_CATALOG).filter(c=>c.luxury),ordinary=Object.values(DEALER_CATALOG).filter(c=>!c.luxury);
assert.equal(DEALER_SITES.length,10);assert.equal(luxury.length,10);assert(ordinary.length>=10);
assert.equal(Object.values(DEALER_CATALOG).filter(c=>c.custom).length,4,'Only four new industrial models');
assert.equal(new Set(luxury.map(c=>c.base)).size,10,'Luxury silhouettes must be different');
assert(luxury.every(c=>VEHICLES[c.id].length>=5.05),'Luxury models must be full-size');
for(const c of luxury)assert(createDealerVehicle(c.id).children.length>5,'Vehicle must have its own detailed model: '+c.id);

// Check actual Padova footprints, road graph and original map coordinates.
const map=JSON.parse(fs.readFileSync(new URL('./dist/data/padova.json',import.meta.url)));
const collision=new SpatialIndex(60);
for(const b of map.buildings){const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]);Object.assign(b,{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:0});collision.add(b,b.minX,b.minZ,b.maxX,b.maxZ);}
const graph=makeRoadGraph(map.roads),storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
const scene=new THREE.Scene(),cars=[],state={started:true,mode:'foot',quality:'high',money:20000,elapsed:0};
const shops=new Dealerships({scene,terrain:{height:()=>0,dry:()=>true},collision,cars,state,regionalWorld:()=>null,
 roadAt:p=>nearestRoad(p,graph,false,{maxRadius:90,fallback:false,maxMs:10}),
 addCar:(x,z,yaw,police,parked,style)=>{const car={x,z,yaw,parked,style,spec:VEHICLES[style],mesh:new THREE.Group()};cars.push(car);scene.add(car.mesh);return car;},pose:()=>{}});
for(const site of DEALER_SITES.filter(s=>s.city.startsWith('Padova'))){
 const p=shops.locate(site);assert(p,'No free accessible showroom near '+site.name);
 assert(dist(site,p)<270,'Showroom must stay in its real neighbourhood');
 state.x=site.x;state.z=site.z;for(let i=0;i<40&&!shops.active.has(site.id);i++)shops.update();
 const entry=shops.active.get(site.id);assert(entry);assert.equal(entry.units.length,10);
 state.money=50000;
 const car=entry.units[0],money=state.money;assert(shops.buy(car));assert.equal(state.money,money-car.dealerPrice);assert(shops.owned.has(car.style));
 assert(!shops.steal(car),'Purchased car cannot be stolen from dealer stock');
 const stolen=entry.units[1],ownedBefore=shops.owned.size;assert(shops.steal(stolen));assert.equal(shops.owned.size,ownedBefore);
 state.x=site.x+900;state.z=site.z+900;shops.update();assert(!shops.active.has(site.id));
}
const restarted=new Dealerships({scene,terrain:{},collision,cars,state,regionalWorld:()=>null,roadAt:()=>null,pose:()=>{}});
assert(restarted.owned.has('salone_0')&&restarted.purchased.has('padova-lusso:0'),'Purchase must survive reload');

const air=Object.create(ModernGameplay.prototype);
air.state={wanted:3,elapsed:1,x:0,z:0,y:0};air.dealerPursuitUntil=75;air.fiveStarAt=0;air.policeAir=[];
air.spawnPoliceAir=()=>{air.policeAir.push({x:0,z:0,y:45,yaw:0,mesh:{userData:{}},airLights:[]});};
air.terrain={height:()=>0};air.pose=()=>{};air.clearPoliceAir=()=>{air.policeAir.length=0;};
air.updatePoliceAir(.016);assert.equal(air.policeAir.length,1,'Robbery must bring helicopter at three stars');
air.state.elapsed=80;air.updatePoliceAir(.016);assert.equal(air.policeAir.length,0,'Helicopter must eventually allow escape');
console.log('PASS dealerships: ten sites, four industrial models, purchases, theft, location and helicopter');
