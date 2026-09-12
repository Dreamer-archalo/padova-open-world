import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from './dist/vendor/three.module.js';
import {QUALITY,actorDetail,AdaptiveResolution} from './dist/quality.js';
import {cameraBoomContinuous} from './dist/movement.js';
import {SpatialIndex,collides,dist,pointInside,nearestOnSegment} from './dist/core.js';
import {CHARACTERS,HOME,VILLA,areaPoint,normalizeCharacter,gameplaySpawns} from './dist/gameplay-areas.js';
import {CharacterPicker,createCharacter} from './dist/characters.js';
import {EXTRA_TRAFFIC,SPECIAL_VEHICLES,createSpecialVehicle,planeStep} from './dist/special-vehicles.js';
import {TRAFFIC_VEHICLES,fleetFor} from './dist/modern-vehicles.js';
import {helicopterStep} from './dist/modern-driving.js';
import {batchStatic} from './dist/render-batch.js';
import {t,ctx} from './tools/controller-harness.mjs';
const api=vm.runInContext('({applyQuality,updatePeople,updateTraffic,selectCharacter,enterCity,vehicleReach,poseVehicle})',ctx);
const report={};
const fixture=new THREE.Group(),nested=new THREE.Group();nested.position.set(8,3,-2);nested.rotation.y=.4;fixture.add(nested);for(let i=0;i<3;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,2,3),new THREE.MeshStandardMaterial({color:i?'#cc9872':'#608aaa'}));mesh.position.set(i*2,0,i);nested.add(mesh);}fixture.position.set(100,20,50);const before=new THREE.Box3().setFromObject(fixture);batchStatic(fixture);const after=new THREE.Box3().setFromObject(fixture);assert(before.min.distanceTo(after.min)<1e-5&&before.max.distanceTo(after.max)<1e-5,'static batching preserves world geometry');let batched=0;fixture.traverse(o=>{if(o.isMesh)batched++;});assert.equal(batched,1);

// A swept camera may stop early, but must never tunnel through a wall or roof.
const index=new SpatialIndex(10);for(const [x,z,w,d,y,h] of [[0,0,.15,18,0,12],[6,2,4,4,8,1],[-8,7,3,3,0,5]]){const b={p:[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]],h,minY:y};index.add(b,x-w/2,z-d/2,x+w/2,z+d/2);}
let checked=0;for(let i=0;i<160;i++){const a={x:-15,y:1+i%16,z:-14+i%29},b={x:17,y:1+(i*7)%18,z:14-(i*3)%29},q=cameraBoomContinuous(a,b,index);assert([q.x,q.y,q.z].every(Number.isFinite));for(let j=1;j<=150;j++){const u=j/150,x=a.x+(q.x-a.x)*u,z=a.z+(q.z-a.z)*u,y=a.y+(q.y-a.y)*u;assert(![...index.near(x,z,1)].some(b=>y+.285>b.minY&&y-.285<b.minY+b.h&&(pointInside(x,z,b.p)||b.p.some((p,k)=>dist({x,z},nearestOnSegment(x,z,p,b.p[(k+1)%b.p.length]))<.285))),'camera crosses expanded wall');checked++;}}
assert.equal(cameraBoomContinuous({x:-5,y:30,z:0},{x:5,y:30,z:0},index).x,5,'camera can pass above roof');report.cameraSamples=checked;
const empty=new SpatialIndex(),flat={height:()=>0,elevation:()=>0,dry:()=>true,waterHeight:()=>-2};
for(const style of ['falco','levante','rondone','albatros']){const spec=SPECIAL_VEHICLES[style],a={x:0,z:0,y:0,yaw:0,speed:0,vy:0,spec},step=spec.plane?planeStep:helicopterStep;for(let i=0;i<600;i++)step(a,{forward:1,turn:0,up:true},1/60,flat,empty);assert(a.y>20,style+' takes off');for(let i=0;i<1500&&a.y>.01;i++)step(a,{forward:spec.plane?0:0,turn:0,down:true},1/60,flat,empty);assert(a.y<.1,style+' lands');assert([a.x,a.z,a.y,a.yaw,a.speed].every(Number.isFinite));}
report.newAircraftFlight=['falco','levante','rondone','albatros'];
assert.equal(TRAFFIC_VEHICLES.autotreno.length,22.6);assert(!fleetFor('historic').includes('autotreno'));assert(fleetFor('industrial',{k:'primary',w:10}).includes('autotreno'));assert(!fleetFor('urban',{k:'residential',w:6}).includes('autotreno'));
for(const style of Object.keys(EXTRA_TRAFFIC)){const model=createSpecialVehicle(style);model.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(model);assert(!b.isEmpty());assert(b.max.y>1&&b.min.y>=-.01);}
report.additionalCityVehicles=Object.keys(EXTRA_TRAFFIC);
const villaSpawns=gameplaySpawns().filter(p=>p.name==='Villa Treves');assert.equal(villaSpawns.filter(p=>SPECIAL_VEHICLES[p.style]?.aircraft).length,2);assert.equal(villaSpawns.filter(p=>p.style==='tank').length,1);assert(!villaSpawns.some(p=>EXTRA_TRAFFIC[p.style]?.family==='freight'||EXTRA_TRAFFIC[p.style]?.family==='work'));
// Every fence edge blocks walking while the gate stays open.
for(const [u,v] of [[-44,25],[44,25],[0,-43],[-25,49],[25,49]]){const p=areaPoint(VILLA,u,v);assert(collides(p.x,p.z,.4,t.world.collision,t.terrain.height(p.x,p.z)),JSON.stringify({u,v,y:t.terrain.height(p.x,p.z),base:t.terrain.elevation(p.x,p.z),near:[...t.world.collision.near(p.x,p.z,1)].filter(b=>pointInside(p.x,p.z,b.p)).map(b=>({h:b.h,minY:b.minY,kind:b.kind}))}));}
for(let v=26;v<57;v++){const p=areaPoint(VILLA,0,v);assert(!collides(p.x,p.z,.4,t.world.collision,t.terrain.height(p.x,p.z)));}
assert.equal(normalizeCharacter('scando'),'fede');assert.equal(normalizeCharacter('nico'),'nino');const money=t.state.money,jobs=t.state.jobs;
for(const c of CHARACTERS){api.selectCharacter(c.id);assert.equal(t.state.character,c.id);const g=createCharacter(c.id);assert.equal(g.userData.hips.children.length,2);assert.equal(g.userData.arms.children.length,2);assert.equal(g.userData.character,c.id);}
assert.equal(t.state.money,money);assert.equal(t.state.jobs,jobs);api.enterCity('milo');assert.equal(t.state.character,'milo');assert(dist(t.state,HOME)<.1);assert.equal(t.state.started,true);
const elements=new Map(),element=()=>({hidden:false,children:[],attrs:{},appendChild(v){this.children.push(v);},setAttribute(k,v){this.attrs[k]=v;},focus(){this.focused=true;}});for(const id of ['characterChoices','confirmCharacter','intro','characterPicker','characterOutfit'])elements.set(id,element());let chosen;const picker=new CharacterPicker({getElementById:id=>elements.get(id),createElement:element},id=>chosen=id);picker.open('nico');picker.update(100,1440,900);assert.equal(picker.models.filter(m=>m.visible).length,5);picker.buttons[2].onclick();elements.get('confirmCharacter').onclick();assert.equal(chosen,'marchese');assert(!picker.active);picker.open('fede');picker.update(200,390,844);assert.equal(picker.models.filter(m=>m.visible).length,1);report.characters=CHARACTERS.map(c=>c.name);
const countDraws=()=>{let calls=0,triangles=0;t.scene.traverseVisible(o=>{if(o.isMesh){calls++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});return {calls,triangles};};
const key=Math.floor(HOME.x/320)+','+Math.floor(HOME.z/320);t.state.x=HOME.x;t.state.z=HOME.z;t.world.build(key);const collision=t.world.collision;
report.quality={};for(const quality of ['medium','hyper','low','hyper']){t.state.quality=quality;api.applyQuality();for(let i=0;i<18;i++){t.state.elapsed+=1/60;api.updatePeople(1/60);}const q=QUALITY[quality];assert.equal(t.people.filter(p=>!p.budgetSleeping).length,q.people);assert(t.cars.filter(c=>!c.parked&&!c.fixedSpawn&&!c.budgetSleeping).length<=q.traffic);assert.equal(t.world.collision,collision);let walls=0;t.world.loaded.get(key).traverse(o=>{if(o.userData.detailedMaterial){walls++;assert.equal(o.material.isMeshBasicMaterial===true,q.simple);if(q.simple)assert(!o.material.map);}});assert(walls>0);report.quality[quality]={people:q.people,traffic:q.traffic,...countDraws()};}
assert(report.quality.hyper.calls<report.quality.medium.calls*.35,'hyper should drastically reduce actor draw submissions '+JSON.stringify(report.quality));
const car=t.cars.find(c=>c.style==='mito'),oldSpec=car.spec;actorDetail(car,true);assert.equal(car.spec,oldSpec);assert.equal(car.mesh.children.filter(c=>c.visible).length,1);actorDetail(car,false);assert.equal(car.spec,oldSpec);
// Parked craft are not animated; quality changes don't add repeated populations.
const total=t.cars.length;for(let i=0;i<5;i++)api.applyQuality();assert.equal(t.cars.length,total);
const resolution=new AdaptiveResolution();let ratio=null;for(let i=0;i<900;i++)ratio=resolution.sample(.04,QUALITY.hyper)??ratio;assert(ratio>=.45&&ratio<.65);resolution.reset();assert.equal(resolution.scale,1);report.adaptivePixelRatioFloor=ratio;
// Time the actual controller, advancing simulation time so low-frequency AI runs.
for(const name of ['updatePeople','updateTraffic','updateCamera']){const fn=vm.runInContext(name,ctx),start=performance.now();for(let i=0;i<120;i++){t.state.elapsed+=1/60;fn(1/60);}report[name+'120TicksMs']=performance.now()-start;}
// Exhaust the cooperative chunk generator and verify it yields before finishing.
const otherKey=Math.floor((HOME.x+320)/320)+','+Math.floor(HOME.z/320);let yields=0,maxSlice=0;const it=t.world.buildSteps(otherKey);for(;;){const start=performance.now(),next=it.next();maxSlice=Math.max(maxSlice,performance.now()-start);if(next.done)break;yields++;}assert(yields>20);assert(t.world.loaded.has(otherKey));report.chunkStreaming={yieldPoints:yields,maxSliceMs:maxSlice};
report.browser={threeD:'not performed in this run',fps:'not measured; controller CPU and draw submissions are not end-user FPS'};
fs.writeFileSync('docs/performance-results.json',JSON.stringify(report,null,2)+'\n');console.log('PASS performance budgets, camera sweep, villa gate, character selection/save migration, new aircraft, city fleet, pooling and cooperative streaming');console.log(JSON.stringify(report));
