import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from '../dist/vendor/three.module.js';
import {VEHICLES,createVehicle} from '../dist/vehicles.js';
import {SPECIAL_VEHICLES,createSpecialVehicle} from '../dist/special-vehicles.js';
import {ROAD_FLEET_IDS,createPoliceCoachwork,createEmergencyCoachwork,createTransitCoachwork} from '../dist/road-fleet-coachwork.js';
import {DEALER_CATALOG,createDealerVehicle,dealerQuote,Dealerships,dealerDisplayLayout,reserveDealerBuildings,DEALER_SITES} from '../dist/dealerships.js';
import {dealerBuildSpec,dealerCapabilities} from '../dist/dealer-customization.js';
import {COLLECTOR_CARS} from '../dist/collector-cars.js';
import {TRAFFIC_VEHICLES} from '../dist/modern-vehicles.js';
import {compactCoachwork,coachworkLOD,createCoachwork} from '../dist/car-coachwork.js';
import {paintHangarVehicle} from '../dist/villa-mandria-hangar.js';
import {hangarPreviewModel} from '../dist/villa-mandria-catalog-ui.js';
import {polygonsOverlap} from '../dist/movement.js';
import {pointInside} from '../dist/core.js';
const report={models:[],shops:[],options:{},purchase:{}};
for(const spec of [VEHICLES.taxi,VEHICLES.sedan,VEHICLES.taxi]){const body=createCoachwork('legacy-sedan',{...spec,family:'sedan'}).children[0];body.geometry.computeBoundingBox();assert(Math.abs(body.geometry.boundingBox.max.z-body.geometry.boundingBox.min.z-spec.length)<1e-5,'cached sedan shell preserves taxi/police dimensions regardless of build order');}
const hash=g=>{const h=createHash('sha256');g.traverse(o=>{if(o.isMesh)h.update(Buffer.from(o.geometry.attributes.position.array.buffer));});return h.digest('hex');};
for(const id of ROAD_FLEET_IDS){
 const spec=VEHICLES[id],root=SPECIAL_VEHICLES[id]?createSpecialVehicle(id):createVehicle(id),size=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
 assert.equal(root.userData.modelRevision,36,id);assert(size.x<=spec.width*1.035&&size.z<=spec.length*1.035,id+' fits collision footprint '+size.toArray());
 let triangles=0;root.traverse(o=>{if(!o.isMesh)return;for(const attr of Object.values(o.geometry.attributes))assert(attr.array.every(Number.isFinite),id+' finite data');triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});assert(triangles<10500,id+' detail budget '+triangles);
 const before=[];root.traverse(o=>{if(o.isMesh)before.push({o,colors:o.geometry.attributes.color.array.slice(),mask:o.geometry.attributes.collectorPaint.array.slice()});});paintHangarVehicle(root,'#a9473f');let changed=0,protectedCount=0;
 for(const {o,colors,mask} of before)for(let i=0;i<mask.length;i++)if(mask[i])changed+=o.geometry.attributes.color.getX(i)!==colors[i*3];else{assert.deepEqual(Array.from(o.geometry.attributes.color.array.slice(i*3,i*3+3)),Array.from(colors.slice(i*3,i*3+3)),id+' protected tyres/glass/trim');protectedCount++;}assert(changed>30&&protectedCount>30,id+' functional paint');
 const preview=hangarPreviewModel(id,'#a9473f');assert.equal(preview.userData.modelRevision,36,id+' hangar same model');assert(new THREE.Box3().setFromObject(preview).getSize(new THREE.Vector3()).distanceTo(size)<1e-4,id+' preview bounds');
 if(id==='tank'){const turret=root.getObjectByName('turret');assert(turret&&root.userData.turret===turret);turret.rotation.y=.6;assert(Number.isFinite(turret.matrixWorld.elements[0]));}
 if(spec.bike||['motorcycle','scooter'].includes(id))assert.equal(root.userData.wheelCount,2);if(id==='ape')assert.equal(root.userData.wheelCount,3);
 report.models.push({id,triangles,draws:root.children.filter(o=>o.isMesh).length,bounds:size.toArray()});
}
const bikeIds=['motorcycle','scooter','naked','supersport','touring','cruiser','trail','enduro'];assert.equal(new Set(bikeIds.map(id=>hash(SPECIAL_VEHICLES[id]?createSpecialVehicle(id):createVehicle(id)))).size,bikeIds.length,'distinct bike silhouettes');
// A pane can exist in the mesh while facing inward or being hidden by the cab.
// Probe the rendered outside surfaces, rather than only counting glass vertices.
for(const id of ['truck','cisterna','ape']){const s=VEHICLES[id],root=id==='truck'||id==='ape'?createVehicle(id):createSpecialVehicle(id),y=id==='ape'?1.39:s.height*.87*.71,z=id==='ape'?.45:s.length*.5-1.25,ray=new THREE.Raycaster(new THREE.Vector3(s.width+1,y,z),new THREE.Vector3(-1,0,0));root.updateMatrixWorld(true);assert.equal(ray.intersectObject(root,true)[0]?.object.material.userData.coachBucket,'glass',id+' side glass visible from outside');}
{const root=createVehicle('ape');root.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(0,1.65,3),new THREE.Vector3(0,0,-1));assert.equal(ray.intersectObject(root,true)[0]?.object.material.userData.coachBucket,'glass','Ape windscreen visible above nose');}
for(const id of ['naked','scooter','enduro']){const q=dealerQuote(id,{brakes:'race'}),root=createDealerVehicle(id,q.color,q.wheels,q),red=new THREE.Color('#b44f36');let count=0;root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,c=o.geometry.attributes.color;for(let i=0;i<p.count;i++)if(Math.abs(c.getX(i)-red.r)<1e-5&&Math.abs(c.getY(i)-red.g)<1e-5&&Math.abs(c.getZ(i)-red.b)<1e-5){assert(Math.abs(p.getX(i))<.12,id+' brake caliper mounted at wheel');count++;}});assert(count>0,id+' purchased calipers visible');}
for(const [id,ceiling] of [['ape',1.15],['cantiere',2.22],['pianale-6',1.48]]){const q=dealerQuote(id,{cargo:'rails'}),root=createDealerVehicle(id,q.color,q.wheels,q),rail=new THREE.Color('#a0afb3');let count=0;root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,c=o.geometry.attributes.color;for(let i=0;i<p.count;i++)if(Math.abs(c.getX(i)-rail.r)<1e-5&&Math.abs(c.getY(i)-rail.g)<1e-5&&Math.abs(c.getZ(i)-rail.b)<1e-5){assert(p.getY(i)<=ceiling,id+' rails mounted on cargo walls');count++;}});assert(count>0,id+' mounted purchased rails');}
{const q=dealerQuote('ape',{brakes:'race'}),root=createDealerVehicle('ape',q.color,q.wheels,q),red=new THREE.Color('#b44f36');root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,c=o.geometry.attributes.color;for(let i=0;i<p.count;i++)if(p.getZ(i)>0&&Math.abs(c.getX(i)-red.r)<1e-5&&Math.abs(c.getY(i)-red.g)<1e-5&&Math.abs(c.getZ(i)-red.b)<1e-5)assert(Math.abs(p.getX(i))<.10,'Ape brake calipers mounted at single central front wheel');});}
for(const id of ['cisterna','betoniera','soccorso'])assert(!dealerCapabilities({...VEHICLES[id],vehicleType:id}).cargo.values.some(v=>v[0]==='rails'),id+' no incompatible roof rails');
{const root=createSpecialVehicle('tank');root.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(3,.66,.40),new THREE.Vector3(-1,0,0));assert.equal(ray.intersectObject(root,true)[0]?.object.material.userData.coachBucket,'alloy','tank road wheels visible inside track frame');}
for(const id of Object.keys(TRAFFIC_VEHICLES))assert(!VEHICLES[id].clubReward,'club premium models remain earned');
const police=compactCoachwork(createPoliceCoachwork(VEHICLES.sedan));assert.equal(police.userData.vehicleType,'police');assert.equal(police.children.length,4);assert.equal(coachworkLOD(police).type,'Mesh');
for(const kind of ['fire','ambulance']){const m=createEmergencyCoachwork(kind==='fire'?VEHICLES.truck:VEHICLES.utility,kind);assert.equal(m.userData.emergencyFlashers.length,2);assert.equal(m.userData.modelRevision,36);}
assert.equal(createTransitCoachwork().userData.modelRevision,36);
for(const [id,entry] of Object.entries(DEALER_CATALOG)){
 const defs=dealerCapabilities({...VEHICLES[id],vehicleType:id});report.options[id]=Object.keys(defs);
 const options=Object.fromEntries(Object.entries(defs).map(([key,def])=>[key,def.values.at(-1)[0]])),quote=dealerQuote(id,{...options,color:'#315979',speed:2});
 const m=createDealerVehicle(id,quote.color,quote.wheels,quote),base=createDealerVehicle(id);assert(m.children.length===4,id+' configurable four surfaces');assert.notEqual(hash(m),hash(base),id+' optional visible geometry');
 assert(quote.total>=entry.price);assert.equal(quote.total,entry.price+Object.values(quote.extras).reduce((a,b)=>a+b,0));const stats=dealerBuildSpec(VEHICLES[id],quote);assert(stats.accel>VEHICLES[id].accel&&stats.brake>VEHICLES[id].brake,id+' real upgrade stats');
 const invalid=dealerQuote(id,{...options,wheels:'free-gold',roof:'invalid',speed:-100,brakes:'invalid'});assert.equal(invalid.wheels,'standard');assert.equal(invalid.speed,0);assert.equal(invalid.brakes,'standard');
 if(entry.roadFleet&&['truck','cisterna','betoniera','ape'].includes(id)){assert(!defs.bodykit&&!defs.exhaust);assert(!defs.livery.values.some(v=>v[0]==='twin-stripe'));}
}
assert.equal(Object.values(DEALER_CATALOG).filter(v=>v.collector).length,15);assert.equal(Object.keys(COLLECTOR_CARS).length,15);
const buildings=JSON.parse(fs.readFileSync('dist/data/padova.json')).buildings;reserveDealerBuildings(buildings,DEALER_SITES.filter(s=>s.city.startsWith('Padova')));
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const scene=new THREE.Scene(),cars=[],state={money:100000,started:true},env={scene,cars,state,terrain:{},collision:{},pose(){},addCar(){},regionalWorld(){},roadAt(){},buildings};
const shops=new Dealerships(env);
for(const site of DEALER_SITES.filter(s=>s.city.startsWith('Padova'))){const b=shops.locate(site),layout=dealerDisplayLayout(b,shops.stock(site));assert(layout.length>=4,site.id+' enough displays');for(const [i,a] of layout.entries()){assert(a.footprint.every(p=>pointInside(...p,b.p)));assert(layout.slice(i+1).every(c=>!polygonsOverlap(a.footprint,c.footprint)),site.id+' no overlapping vehicles');}report.shops.push({id:site.id,displays:layout.map(v=>v.id)});}
const site=DEALER_SITES.find(v=>v.tier==='normale');shops.active.set(site.id,{});
const options={color:'#315979',wheels:'bronze',speed:1,brakes:'sport',response:'street',exhaust:'chrome',bodykit:'touring',roof:'black',interior:'premium',livery:'coach-stripe'},before=state.money,q=shops.quote('nido',options);
assert(shops.purchase(site,'nido',options));assert.equal(state.money,before-q.total);assert(shops.owned.has('nido'));
const again=shops.quote('nido',options);assert.equal(again.amountDue,0,'same build costs no money twice');const first=state.money;shops.purchase(site,'nido',options);assert.equal(state.money,first);
const upgraded=shops.quote('nido',{...options,brakes:'race',wheels:'gold'});assert.equal(upgraded.amountDue,(890-390)+(590-340),'only incremental upgrade price');assert(shops.purchase(site,'nido',{...options,brakes:'race',wheels:'gold'}));
const restarted=new Dealerships(env);assert.equal(restarted.builds.get('nido').wheels,'gold');assert.equal(restarted.builds.get('nido').brakes,'race');
const poor=state.money;state.money=0;assert.equal(shops.purchase(site,'nido',{...options,speed:2,response:'sport'}),null);assert.equal(state.money,0);state.money=poor;
report.purchase={initial:q.total,repeat:again.amountDue,upgrade:upgraded.amountDue,saved:true};
fs.writeFileSync('docs/road-fleet-r36-results.json',JSON.stringify(report,null,2)+'\n');console.log('PASS R36',report.models.length,'road vehicles, distinct motorcycles, police/emergencies/tram, 15 collectors, compatible upgrades, prices, real stats, persistence and safe showroom footprints.');
