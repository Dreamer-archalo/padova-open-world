import {groundContact} from '../dist/vehicle-dynamics.js';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {t,ctx} from './controller-harness.mjs';
import {DEALER_SITES,DEALER_CATALOG} from '../dist/dealerships.js';
import {VEHICLES} from '../dist/vehicles.js';
import {pointInside,dist} from '../dist/core.js';
import {vehicleFootprint,polygonsOverlap,vehicleBlocked} from '../dist/movement.js';
import {showroomWalkable} from '../dist/dealer-showroom-life.js';
const shops=vm.runInContext('dealerships',ctx),sites=DEALER_SITES.filter(s=>s.city.startsWith('Padova')),results=[];
for(const site of sites){
 const b=shops.locate(site);Object.assign(t.state,{mode:'foot',car:null,paused:false,x:b.dealerDoor.outside.x,z:b.dealerDoor.outside.z,y:t.terrain.height(b.dealerDoor.outside.x,b.dealerDoor.outside.z),money:1e8,speed:0});shops.update();const entry=shops.active.get(site.id);
 assert.equal(entry.life.actors.length,5,site.id+' has two staff and three customers');assert.equal(entry.life.actors.filter(a=>a.role==='staff').length,2);
 const starts=entry.life.actors.map(a=>({x:a.x,z:a.z})),moving=new Set();let speech=false;
 for(let frame=0;frame<800;frame++){t.state.elapsed+=.08;shops.animate();entry.life.actors.forEach((a,i)=>{assert(showroomWalkable(b,entry.units,a.x,a.z),site.id+' pedestrian clear of cars and walls');assert(Math.abs(a.mesh.position.y-t.terrain.height(a.x,a.z)-.025)<1e-8);assert(!entry.life.actors.some(o=>o!==a&&dist(a,o)<.64),'people must not overlap');if(dist(a,starts[i])>1)moving.add(i);speech||=a.mesh.children.some(o=>o.isSprite&&o.visible);});}
 assert(moving.size>=3,site.id+' active customers and staff');assert(speech,site.id+' conversations');console.log("Verified people",site.id);
 for(const car of entry.units){assert.equal(car.y,b.dealerFloorY);assert.equal(car.mesh.position.y,car.y);assert(car.y>b.minY+.2,'display is above foundations');}
 const catalog=shops.stock(site),ids=[...new Set([catalog.find(id=>!shops.owned.has(id)&&!VEHICLES[id].bike&&VEHICLES[id].length<5),catalog.find(id=>!shops.owned.has(id)&&VEHICLES[id].length>6.3)])].filter(Boolean),sales=[];
 for(const id of ids){const before=t.state.money,delivered=shops.purchaseAndDeliver(site,id);assert(delivered,site.id+' delivery '+id);const c=delivered.car,s=c.spec;assert.equal(before-t.state.money,delivered.quote.amountDue);assert.equal(c.y,groundContact(t.terrain,c.x,c.z,c.y,c).y);assert.equal(c.mesh.position.y,c.y);assert(!vehicleBlocked(c.x,c.z,c.yaw,t.world.collision,s,c.y));assert.equal(c.dealershipStock,null);assert(c.requestedByPlayer);assert.equal(t.cars.filter(v=>v.style===id&&v.requestedByPlayer).length,1);
  if(shops.needsOutdoor(site,id)){assert.equal(delivered.destination,'outside');assert(!polygonsOverlap(vehicleFootprint(c.x,c.z,c.yaw,s.width,s.length),b.p));}
  // One press of E must board with correct elevation and then drive immediately.
  Object.assign(t.state,{mode:'foot',car:null,x:c.x+Math.cos(c.yaw)*(s.width/2+.6),z:c.z-Math.sin(c.yaw)*(s.width/2+.6),y:c.y,speed:0,paused:false});c.lodFrom={x:c.x+100,z:c.z+100};t.toggleVehicle();assert.equal(t.state.car,c);assert.equal(t.state.y,c.y);assert.equal(c.lodFrom,null);const start={x:c.x,z:c.z};t.keys.clear();t.keys.add('KeyW');for(let frame=0;frame<180&&dist(t.state,start)<7;frame++)t.movePlayer(1/60);t.keys.clear();assert(dist(t.state,start)>3,'first boarding drives '+site.id+' '+id);assert(t.state.health>95,'delivery does not damage vehicle');if(delivered.destination==='inside'){assert(!pointInside(t.state.x,t.state.z,b.p),'first drive leaves showroom through gate');}
  sales.push({id,destination:delivered.destination,travel:Math.round(dist(t.state,start))});t.state.mode='foot';t.state.car=null;t.state.speed=0;Object.assign(t.state,{x:b.dealerDoor.outside.x,z:b.dealerDoor.outside.z,y:t.terrain.height(b.dealerDoor.outside.x,b.dealerDoor.outside.z)});
 }
 results.push({site:site.id,people:entry.life.actors.length,walking:moving.size,sales});shops.unload(entry);
}
// A blocked forecourt must reject a sale before charging or creating ownership.
const site=sites.find(s=>s.id==='zip-uruguay'),b=shops.locate(site);Object.assign(t.state,{x:b.dealerDoor.outside.x,z:b.dealerDoor.outside.z});shops.update();const collision=shops.collision;shops.collision={near:()=>new Set([{p:[[b.cx-200,b.cz-200],[b.cx+200,b.cz-200],[b.cx+200,b.cz+200],[b.cx-200,b.cz+200]],minY:0,h:100}])};const id=shops.stock(site).find(id=>!shops.owned.has(id)&&shops.needsOutdoor(site,id)),money=t.state.money;assert.equal(shops.purchaseAndDeliver(site,id),null);assert.equal(t.state.money,money);assert(!shops.owned.has(id));shops.collision=collision;
console.log('PASS R41 dealership handover: grounded displays and people in six actual dealerships; active staff/customers; correct-sized delivery with obstacle and gate checks; one E boards and drives; blocked sale never charged.',results);
