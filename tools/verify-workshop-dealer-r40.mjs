import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../dist/vendor/three.module.js';
import {DEALER_SITES,DEALER_CATALOG,createDealerVehicle,dealerQuote,Dealerships,reserveDealerBuildings} from '../dist/dealerships.js';
import {VEHICLES} from '../dist/vehicles.js';
import {createPerson} from '../dist/world.js';
import {dealerCapabilities,dealerBuildSpec,DEALER_OPTIONS} from '../dist/dealer-customization.js';
import {workshopQuote} from '../dist/vehicle-workshops.js';
import {pointInside} from '../dist/core.js';
import {vehicleFootprint,polygonsOverlap} from '../dist/movement.js';
import {showroomWalkable} from '../dist/dealer-showroom-life.js';
const hash=root=>{const h=createHash('sha256');root.traverse(o=>{if(o.isMesh){h.update(Buffer.from(o.geometry.attributes.position.array.buffer));h.update(Buffer.from(o.geometry.attributes.color.array.buffer));}});return h.digest('hex');};
assert.equal(DEALER_OPTIONS.wheelDesign.values.length,11);
for(const id of ['nido','collector-nebula','collector-stradale33','naked','ape','truck']){
 const meshes=DEALER_OPTIONS.wheelDesign.values.map(([wheelDesign])=>{const q=dealerQuote(id,{wheelDesign,wheels:'bronze'});return createDealerVehicle(id,q.color,q.wheels,q);});
 assert.equal(new Set(meshes.map(hash)).size,11,id+' has eleven distinct mounted designs');
 for(const mesh of meshes)mesh.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,a=o.geometry.attributes.optionPart;for(let i=0;i<p.count;i++)if(a?.getX(i)===1)assert(mesh.userData.wheelMounts.some(m=>Math.abs(p.getX(i)-m.x)<m.width*.8+.05&&Math.hypot(p.getY(i)-m.y,p.getZ(i)-m.z)<m.r*.83),'rim must fit a real wheel');});
 const car={style:id,spec:VEHICLES[id],mesh:createDealerVehicle(id),health:83};
 const selected={frontGuard:'heavy',rearGuard:'heavy',tyreGuard:'runflat',safetyGlass:'ballistic',chassis:'armored'},visible=workshopQuote(car,selected),hidden=workshopQuote(car,{...selected,protectionVisibility:'hidden'});
 assert.equal(hidden.capacity,visible.capacity);assert.equal(hidden.amountDue,visible.amountDue);assert.deepEqual(dealerBuildSpec(VEHICLES[id],hidden),dealerBuildSpec(VEHICLES[id],visible));
 const concealed=createDealerVehicle(id,hidden.color,hidden.wheels,hidden),basic=createDealerVehicle(id,hidden.color,hidden.wheels,{...hidden,frontGuard:'standard',rearGuard:'standard',tyreGuard:'standard',safetyGlass:'standard',chassis:'standard',protectionVisibility:'visible'});
 assert.equal(hash(concealed),hash(basic),id+' hidden protection changes no geometry or colours');
 car.mesh=concealed;assert.equal(workshopQuote(car,hidden).amountDue,0,'hiding protection is free on repeat');
 const toggle=workshopQuote(car,{protectionVisibility:'visible'});assert.equal(toggle.amountDue,0);assert.equal(toggle.capacity,hidden.capacity);
}
for(const id of ['nido','salone_6','truck','collector-stradale33']){const caps=dealerCapabilities({...VEHICLES[id],vehicleType:id});assert(!caps.interior&&!caps.upholstery&&!caps.steering);assert.equal(dealerQuote(id,{interior:'premium',upholstery:'red'}).total,dealerQuote(id).total);}
for(const id of ['collector-nebula','collector-azzurra','salone_10','naked','scooter'])assert(dealerCapabilities({...VEHICLES[id],vehicleType:id}).interior);
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},clearRect(){}})})};globalThis.localStorage={getItem:()=>null,setItem(){}};
const map=JSON.parse(fs.readFileSync(new URL('../dist/data/padova.json',import.meta.url))),sites=DEALER_SITES.filter(s=>s.city.startsWith('Padova'));reserveDealerBuildings(map.buildings,sites);for(const b of map.buildings)if(b.dealerSite)b.minY=7;
const cars=[],scene=new T.Scene(),state={started:true,mode:'foot',quality:'high',money:600000,elapsed:0},shops=new Dealerships({scene,state,cars,createPerson,buildings:map.buildings,terrain:{},regionalWorld:()=>null,pose:c=>c.mesh.position.set(c.x,c.y||7,c.z),addCar(x,z,yaw,police,parked,id,build){const car={x,z,yaw,style:id,spec:dealerBuildSpec(VEHICLES[id],build),health:100,mesh:createDealerVehicle(id,build?.color,build?.wheels,build),parked};cars.push(car);scene.add(car.mesh);return car;}});
const results=[];
for(const site of sites){const b=shops.locate(site);Object.assign(state,{x:b.dealerDoor.outside.x,z:b.dealerDoor.outside.z,elapsed:0});shops.load(site,b);const entry=shops.active.get(site.id);assert.equal(entry.life.actors.length,5,site.id+' has 2 staff and 3 customers');
 const start=entry.life.actors.map(a=>[a.x,a.z]);let moved=false,talking=false;
 for(let i=0;i<2200;i++){state.elapsed=i*.08;shops.animate();entry.life.actors.forEach((a,j)=>{assert(pointInside(a.x,a.z,b.p),site.id+' actor stays inside');assert.equal(a.mesh.position.y,b.dealerFloorY+.025);moved||=Math.hypot(start[j][0]-a.x,start[j][1]-a.z)>1;talking||=a.mesh.children.some(c=>c.isSprite&&c.visible);});}
 assert(moved,site.id+' people walk');assert(talking,site.id+' conversations appear');
 const id=site.id==='padova-lusso'?'collector-stradale33':shops.stock(site).find(id=>!shops.owned.has(id)&&VEHICLES[id].height<(b.h||4)),before=state.money,delivery=shops.purchaseAndDeliver(site,id,{wheelDesign:'turbine'});assert(delivery,site.id+' delivers a vehicle');assert(state.money<before);assert.equal(vehicleFootprint(delivery.car.x,delivery.car.z,delivery.car.yaw,delivery.car.spec.width,delivery.car.spec.length).every(p=>pointInside(...p,b.p)),delivery.destination==='inside');if(shops.needsOutdoor(site,id))assert.equal(delivery.destination,'outside');assert.equal(delivery.car.dealershipStock,null);assert(delivery.car.requestedByPlayer);assert.equal(cars.filter(c=>c.style===id&&c.requestedByPlayer).length,1);shops.animate();const seller=entry.life.actors.find(a=>a.deliveryUntil>state.elapsed);assert(seller);assert(Math.hypot(seller.x-delivery.car.x,seller.z-delivery.car.z)<delivery.car.spec.width/2+5,'seller waits by the delivered vehicle');
 results.push({site:site.id,people:5,delivered:id});shops.unload(entry);assert(cars.includes(delivery.car),'unloading the dealer preserves the purchase');shops.load(site,b);const loaded=shops.active.get(site.id);assert(!loaded.units.some(c=>c.dealershipStock&&polygonsOverlap(vehicleFootprint(c.x,c.z,c.yaw,c.spec.width,c.spec.length),vehicleFootprint(delivery.car.x,delivery.car.z,delivery.car.yaw,delivery.car.spec.width,delivery.car.spec.length))),'reload cannot restore a display over the delivered vehicle');shops.unload(loaded);
}
console.log('PASS R40: 11 wheel designs across six families; hidden protection preserves price, life and exact body; invisible interiors excluded; six actual Padova showrooms, grounded walking staff/clients, conversations, safe interior/exterior delivery and preserved purchases.',results);
