import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from '../dist/vendor/three.module.js';
import {DEALER_CATALOG,createDealerVehicle,dealerQuote,Dealerships,DEALER_SITES} from '../dist/dealerships.js';
import {VEHICLES} from '../dist/vehicles.js';
import {dealerCapabilities} from '../dist/dealer-customization.js';
import {workshopQuote} from '../dist/vehicle-workshops.js';
const hash=r=>{const h=createHash('sha256');r.traverse(o=>{if(o.isMesh){h.update(Buffer.from(o.geometry.attributes.position.array.buffer));h.update(Buffer.from(o.geometry.attributes.color.array.buffer));}});return h.digest('hex');};
const vertices=(root,part)=>{const out=[];root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,a=o.geometry.attributes.optionPart;for(let i=0;i<p.count;i++)if(a?.getX(i)===part)out.push([p.getX(i),p.getY(i),p.getZ(i)]);});return out;};
for(const id of ['nido','salone_6','collector-nebula','collector-stradale33','collector-azzurra','naked','scooter','ape','truck']){
 const initial=dealerQuote(id),basic=createDealerVehicle(id,initial.color,initial.wheels,initial),rims=['standard','mesh','sport'].map(wheelDesign=>{const q=dealerQuote(id,{wheelDesign,wheels:'bronze'});return createDealerVehicle(id,q.color,q.wheels,q);});
 assert.equal(new Set(rims.map(hash)).size,3,id+' visibly distinct rim designs');
 for(const root of rims.slice(1)){const mounts=root.userData.wheelMounts;assert(mounts?.length>0,id+' wheel mounting coordinates');for(const [x,y,z] of vertices(root,1))assert(mounts.some(m=>Math.abs(x-m.x)<m.width*.7+.04&&Math.hypot(y-m.y,z-m.z)<m.r*.8),id+' rim vertex stays inside a real wheel');}
 const q=dealerQuote(id,{chromeMirrors:'bronze',chromeGrille:'black'}),finished=createDealerVehicle(id,q.color,q.wheels,q);
 assert.deepEqual(vertices(finished,2),vertices(basic,2),id+' mirror finish changes no placement or number of mirrors');assert(vertices(finished,2).length>0,id+' functional mirror housings');
 if(dealerCapabilities({...VEHICLES[id],vehicleType:id}).exhaust){const q=dealerQuote(id,{exhaust:'dual'}),exhaust=createDealerVehicle(id,q.color,q.wheels,q);assert(vertices(exhaust,4).length>0,id+' mounted exhaust');}
 const car={style:id,spec:VEHICLES[id],mesh:createDealerVehicle(id),health:100};const quote=workshopQuote(car,{wheelDesign:'mesh',chromeMirrors:'black',grille:'mesh'});car.mesh=createDealerVehicle(id,quote.color,quote.wheels,quote);assert.equal(workshopQuote(car,{wheelDesign:'mesh',chromeMirrors:'black',grille:'mesh'}).amountDue,0,id+' repeating installation costs nothing');
}
assert.equal(VEHICLES['collector-nebula'].shape,'spider66');assert.equal(VEHICLES['collector-stradale33'].shape,'stradale67');
assert.equal(DEALER_CATALOG['collector-stradale33'].price,250000);assert(Object.values(DEALER_CATALOG).every(c=>c.id==='collector-stradale33'||c.price<250000));
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const state={money:400000},shops=new Dealerships({state,scene:new T.Scene(),cars:[],terrain:{},collision:{},pose(){},addCar(){},regionalWorld(){},roadAt(){}}),site=DEALER_SITES.find(s=>s.tier==='lusso');shops.active.set(site.id,{});assert(shops.stock(site).includes('collector-stradale33'));assert(shops.purchase(site,'collector-stradale33'));assert.equal(state.money,150000);assert(shops.owned.has('collector-stradale33'));
console.log('PASS R39: 9 model families, distinct mounted rims, original mirror geometry, attached exhaust, repeated quote, Spider replacement, historic Stradale and actual highest-price dealer purchase.');
