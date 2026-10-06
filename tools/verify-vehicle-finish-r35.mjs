import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {NPC_VEHICLES,createNPCCar,TRAFFIC_VEHICLES} from '../dist/modern-vehicles.js';
import {compactCoachwork,chooseRoadFinish,coachworkLOD} from '../dist/car-coachwork.js';
import {createVehicle} from '../dist/vehicles.js';
import {createCar} from '../dist/world.js';
import {hangarPreviewModel} from '../dist/villa-mandria-catalog-ui.js';
import {paintHangarVehicle} from '../dist/villa-mandria-hangar.js';
import {DEALER_CATALOG,createDealerVehicle} from '../dist/dealerships.js';
import {actorDetail} from '../dist/quality.js';
const report={models:[],finishes:{},errors:[]};
for(const [id,s] of Object.entries(NPC_VEHICLES)){
 const g=compactCoachwork(createNPCCar(id,'#49677e',{wheels:'bronze',livery:'two-tone',roof:'#232c32'}));
 assert.equal(g.userData.modelRevision,35);assert.equal(g.children.length,4,id+' four material buckets');let triangles=0;
 for(const o of g.children){for(const key of ['position','normal','color','uv','collectorPaint'])assert(o.geometry.attributes[key].array.every(Number.isFinite),id+'/'+key);triangles+=o.geometry.attributes.position.count/3;}
 assert(triangles<5000,id+' triangle budget '+triangles);
 assert(g.children.find(o=>o.name==='coachwork-paint').material.map?.isDataTexture);assert(g.children.find(o=>o.name==='coachwork-trim').material.roughness>.7);
 const size=new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());assert(size.x<=s.width*1.03&&size.z<=s.length*1.035,id+' stays within its declared collision footprint '+size.toArray());
 const lod=coachworkLOD(g),ls=new THREE.Box3().setFromObject(lod).getSize(new THREE.Vector3());assert(Math.abs(ls.x-size.x)<1e-5&&Math.abs(ls.z-size.z)<1e-5,id+' distant silhouette preserved');
 const actor={mesh:g,spec:s};actorDetail(actor,true);assert(g.children.filter(o=>o.visible).length===1&&g.children.find(o=>o.visible).geometry!==undefined);actorDetail(actor,false);assert(g.children.filter(o=>o.visible).length===4);
 const paint=g.children.find(o=>o.name==='coachwork-paint'),trim=g.children.find(o=>o.name==='coachwork-trim'),original=trim.geometry.attributes.color.array.slice();paintHangarVehicle(g,'#944237');assert.deepEqual(trim.geometry.attributes.color.array,original,'paint keeps roof, tyre and trim colours');assert(Math.abs(paint.geometry.attributes.color.getX(0)-new THREE.Color('#944237').r)<1e-5);
 report.models.push({id,triangles,width:size.x,length:size.z,draws:4,lodDraws:1});
}
let seed=91;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
for(const family of ['compact','classic','sport','van']){
 const counts={standard:0,graphite:0,black:0,bronze:0,white:0,gold:0,plain:0,'two-tone':0,'coach-stripe':0,'twin-stripe':0};
 for(let i=0;i<50000;i++){const f=chooseRoadFinish({family},random);counts[f.wheels]++;counts[f.livery]++;}
 assert(counts.standard>counts.graphite&&counts.graphite>counts.black&&counts.black>counts.bronze&&counts.bronze>counts.white&&counts.white>counts.gold);assert(counts.plain>45000);if(family==='van')assert.equal(counts.plain,50000);report.finishes[family]=counts;
}
for(const id of Object.keys(TRAFFIC_VEHICLES))assert(!TRAFFIC_VEHICLES[id].clubReward,'premium club bikes remain gated');
for(const id of ['mito','cinquecento'])assert.equal(createVehicle(id,'#67776b').userData.modelRevision,35);
for(const id of ['sedan','compact','wagon','utility','sport'])assert.equal(createCar('#67776b',false,id).userData.modelRevision,35);
for(const id of Object.keys(DEALER_CATALOG)){
 const live=createDealerVehicle(id,'#67776b'),preview=hangarPreviewModel(id,'#67776b');assert.equal(preview.userData.modelRevision,35);const a=new THREE.Box3().setFromObject(live).getSize(new THREE.Vector3()),b=new THREE.Box3().setFromObject(preview).getSize(new THREE.Vector3());assert(a.distanceTo(b)<1e-5,'hangar/dealer share same model '+id);
}
fs.writeFileSync('docs/vehicle-finish-r35-results.json',JSON.stringify(report,null,2)+'\n');console.log('PASS R35 geometry, four surfaces, real texture, paint isolation, distant silhouettes, 200k weighted finishes, dealer/hangar parity and club gates',report.models.length,'models');
