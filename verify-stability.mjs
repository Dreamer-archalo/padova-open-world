import * as cameraModule from './dist/camera-rig.js';
import * as districtModule from './dist/districts.js';
import * as trafficModule from './dist/traffic.js';
import * as tramModule from './dist/tram.js';
import * as incidentModule from './dist/incidents.js';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from './dist/vendor/three.module.js';
import * as core from './dist/core.js';
import * as worldModule from './dist/world.js';
import * as movement from './dist/movement.js';
import * as terrainModule from './dist/terrain.js';
import * as vehicles from './dist/vehicles.js';
import {BuildingModels,validateEntry} from './dist/building-models.js';
import {inspectGLB} from './dist/model-format.js';
import {GLTFLoader} from './dist/vendor/GLTFLoader.js';

const wall={p:[[2,-10],[3,-10],[3,10],[2,10]],minX:2,maxX:3,minZ:-10,maxZ:10,h:8};
const index=new core.SpatialIndex();index.add(wall,2,-10,3,10);
const slide=movement.slideMove({x:0,z:0},10,5,.36,index);
assert(slide.x<=1.641 && slide.z>4.9,'must slide along the wall');
assert(!core.collides(slide.x,slide.z,.36,index));
const fast=movement.slideMove({x:0,z:0},100,0,.36,index);
assert(fast.x<2,'must not tunnel through a wall');
const boom=movement.cameraBoom({x:0,y:1.5,z:0},{x:8,y:4,z:0},index);
assert(boom.x<1.71,'camera must stay in front of a wall');
const overhead=movement.cameraBoom({x:0,y:12,z:0},{x:8,y:12,z:0},index);
assert.equal(overhead.x,8,'camera may pass above a roof');
assert(movement.vehicleBlocked(.5,0,Math.PI/2,index),'car nose must collide before its centre');
for(const hz of [30,60,120,144]){
  const clock=new movement.FixedClock();let time=0;
  for(let i=0;i<hz*10;i++)clock.advance(1/hz,dt=>time+=dt);
  assert(Math.abs(time-10)<1e-7,'fixed timestep at '+hz+' Hz');
}
const clock=new movement.FixedClock();let ticks=0;clock.advance(60,()=>ticks++);assert.equal(ticks,8,'tab resume must not trigger an unbounded catch-up');

const html=fs.readFileSync(new URL('./dist/index.html',import.meta.url),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
const els=new Map();const context2d=new Proxy({}, {get:(obj,key)=>obj[key]||(()=>{}),set:(obj,key,val)=>(obj[key]=val,true)});
const element=()=>({style:{},dataset:{},hidden:false,open:false,textContent:'',width:440,height:340,getContext:()=>context2d,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},querySelectorAll:()=>[],appendChild(){}});
ids.forEach(id=>els.set(id,element()));
const document={body:{classList:{add(){},remove(){}}},getElementById(id){assert(els.has(id),'missing DOM id '+id);return els.get(id);},querySelectorAll:()=>[],addEventListener(){},createElement:element};
globalThis.document=document;
const ctx=vm.createContext({THREE,...cameraModule,...districtModule,...trafficModule,...tramModule,...incidentModule,...core,...worldModule,...movement,...terrainModule,...vehicles,BuildingModels,document,window:{addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},console,Math,JSON,Set,Map,Number,Array,Float32Array,Uint8Array,devicePixelRatio:1,innerWidth:1440,innerHeight:900,requestAnimationFrame(){},location:{reload(){}}});
let code=fs.readFileSync(new URL('./dist/game.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/init\(\);\s*$/,'');vm.runInContext(code,ctx);
ctx.testData=JSON.parse(fs.readFileSync(new URL('./dist/data/padova.json',import.meta.url)));
ctx.cityData=JSON.parse(fs.readFileSync(new URL('./dist/data/city.json',import.meta.url)));
ctx.terrainData=JSON.parse(fs.readFileSync(new URL('./dist/data/terrain.json',import.meta.url)));
vm.runInContext(`data=testData;applyCityData(data,cityData);districts=new Districts(data);terrain=new Terrain(terrainData,data);terrain.districts=districts;scene=new THREE.Scene();world=new CityWorld(scene,data,terrain);graph=makeRoadGraph(data.roads);signals=new TrafficSignals(graph,data.signals);trams=new Trams(scene,data,terrain);incidents=new Incidents(scene);player=createPerson();camera=new THREE.PerspectiveCamera();sun=new THREE.DirectionalLight();marker=new THREE.Group();state.ready=true;state.started=true;createPopulation();followYaw=state.yaw;cameraRig.reset(state.yaw);`,ctx);
const t=vm.runInContext('({terrain,waterRecovery,recover,dryRoad,addCar,travel,falling,state,keys,cars,people,world,scene,player,camera,clock,movePlayer,updateCamera,updateUI,toggleVehicle,beginMission,cancelMission,updateMission,clearPolice,simulate})',ctx);
assert.equal(t.cars.length,31);assert.equal(t.people.length,72);
assert(t.player.userData.hips.children[0].position.y>.7,'leg pivots must be at the hips');
assert(!core.collides(t.state.x,t.state.z,.36,t.world.collision),'centre spawn must be clear');
t.toggleVehicle();assert.equal(t.state.mode,'car');assert.equal(t.state.y,t.terrain.height(t.state.x,t.state.z));
assert(!movement.vehicleBlocked(t.state.x,t.state.z,t.state.yaw,t.world.collision),'initial whole car must fit');
t.updateUI();assert.match(els.get('rpm').style.width,/%$/);assert(els.get('rpmValue').textContent);
for(const type of ['delivery','race','escape']){t.beginMission(type);assert.equal(t.state.mission.type,type);t.cancelMission(false);t.clearPolice();}
t.beginMission('delivery');let mission=t.state.mission;
t.state.x=mission.target.x;t.state.z=mission.target.z;t.state.speed=0;t.updateMission(1/60);assert.equal(mission.phase,'drop');
t.state.x=mission.target.x;t.state.z=mission.target.z;t.updateMission(1/60);assert.equal(t.state.mission,null);assert.equal(t.state.money,350);
t.state.x=t.cars[0].x;t.state.z=t.cars[0].z;t.state.speed=0;t.toggleVehicle();assert.equal(t.state.mode,'foot');
// Exercise the real controller in the centre across frame rates.
const start={x:t.state.x,z:t.state.z,yaw:t.state.yaw};let reference;
for(const hz of [30,60,144]){
  Object.assign(t.state,start,{speed:0,y:t.terrain.height(start.x,start.z),vy:0,elapsed:0});t.clock.reset();t.keys.clear();t.keys.add('KeyW');t.keys.add('KeyA');
  for(let frame=0;frame<hz*3;frame++)t.clock.advance(1/hz,dt=>{t.state.elapsed+=dt;t.movePlayer(dt);assert(!core.collides(t.state.x,t.state.z,.359,t.world.collision),'walk penetrated a building');});
  const endpoint={x:t.state.x,z:t.state.z};if(reference)assert(core.dist(reference,endpoint)<1e-7,'frame-rate dependent movement');else reference=endpoint;
}
t.keys.clear();t.keys.add('Space');t.movePlayer(1/60);assert(t.state.y>t.terrain.height(t.state.x,t.state.z));t.keys.clear();for(let i=0;i<120;i++)t.movePlayer(1/60);assert.equal(t.state.y,t.terrain.height(t.state.x,t.state.z));
for(let i=0;i<180;i++){t.simulate(1/60);t.updateCamera(1/60);assert([t.camera.position.x,t.camera.position.y,t.camera.position.z].every(Number.isFinite));}
t.updateUI();

// Exercise the real controller falling into mapped water in every supported mode.
const river=t.world.data.water.flatMap(r=>r.p.map(([x,z])=>({x,z}))).filter(p=>t.terrain.waterAt(p.x,p.z)!==null&&core.dist(p,{x:0,z:0})<1500).sort((a,b)=>core.dist(a,t.state)-core.dist(b,t.state))[0];
assert(river,'a real river is available for the controller test');
const restart=t.dryRoad({x:-150,z:-49},vehicles.VEHICLES.truck);assert(restart);
for(const type of ['foot','mito','motorcycle','scooter','truck']){
 t.keys.clear();t.waterRecovery.reset();Object.assign(t.state,restart,{mode:type==='foot'?'foot':'car',y:t.terrain.height(restart.x,restart.z),speed:0,vy:0});
 t.state.car=type==='foot'?null:t.addCar(restart.x,restart.z,restart.yaw,false,true,type);
 t.waterRecovery.remember(t.state,t.terrain);Object.assign(t.state,river,{y:t.terrain.elevation(river.x,river.z)});t.movePlayer(1/60);assert(t.waterRecovery.active,'fall must start '+type);
 const mode=t.state.mode;t.toggleVehicle();assert.equal(t.state.mode,mode,'cannot exit a falling vehicle');
 const at={x:t.state.x,z:t.state.z};t.keys.add('KeyW');for(let i=0;i<30;i++)t.movePlayer(1/60);assert.equal(t.state.x,at.x);assert.equal(t.state.z,at.z);assert(t.state.y<t.terrain.elevation(river.x,river.z));
 for(let i=0;i<53;i++)t.movePlayer(1/60);assert(!t.waterRecovery.active,'automatic respawn '+type);assert(t.terrain.dry(t.state.x,t.state.z,1));assert.equal(t.state.mode,mode);assert.equal(t.state.health,100);
 t.keys.clear();
}
t.state.speed=0;t.travel(worldModule.PLACES[8]);assert(t.terrain.dry(t.state.x,t.state.z,1));assert.equal(t.state.car.mesh.position.y,t.terrain.height(t.state.x,t.state.z));

// A small generated GLB is ONLY a test fixture, never a pretend scanned building.
const json={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],buffers:[{byteLength:36}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]}]};
let encoded=JSON.stringify(json);encoded+=' '.repeat((4-Buffer.byteLength(encoded)%4)%4);
const j=Buffer.from(encoded),bin=Buffer.from(new Float32Array([0,0,0,1,0,0,0,1,0]).buffer),glb=Buffer.alloc(12+8+j.length+8+bin.length);
glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(j.length,12);glb.writeUInt32LE(0x4e4f534a,16);j.copy(glb,20);glb.writeUInt32LE(bin.length,20+j.length);glb.writeUInt32LE(0x004e4942,24+j.length);bin.copy(glb,28+j.length);
const ab=glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength);
assert.equal(inspectGLB(ab).triangles,1);assert.throws(()=>inspectGLB(ab.slice(0,25)),/Truncated/);
const entry=validateEntry({name:'Palazzo della Ragione',url:'./models/fixture.glb',height:24,source:'https://example.org/fixture',author:'Test fixture',license:'CC0'});
assert.throws(()=>validateEntry({...entry,url:'https://remote.example/model.glb'}));
const model=await new GLTFLoader().parseAsync(ab,'');
const layer=new BuildingModels(t.scene,t.world);layer.loader.loadAsync=async()=>model;
const building=t.world.data.buildings.find(b=>b.n===entry.name);layer.entries=[{...entry,building}];
await layer.load(layer.entries[0]);assert.equal(layer.active.size,1);assert.equal(building.modelActive,true);
assert(t.world.landmarks.children.find(o=>o.userData.buildingName===entry.name).visible===false,'hide interpretive landmark on replacement');
layer.update(5000,5000);assert.equal(layer.active.size,0);assert.equal(building.modelActive,false);
assert(t.world.landmarks.children.find(o=>o.userData.buildingName===entry.name).visible,'restore landmark when model unloads');
layer.loader.loadAsync=async()=>{throw new Error('expected missing asset')};const warn=console.warn;console.warn=()=>{};await layer.load(layer.entries[0]);console.warn=warn;assert.equal(building.modelActive,false);assert.equal(layer.active.size,0);
console.log('PASS: swept movement, camera obstruction, car extent, 30/60/120/144 Hz clock, actual controller across frame rates, jump, delivery, missions, mapped-water falls/respawn in all vehicle modes, dry teleport, strict HUD IDs, GLB parsing/replacement/unload/failure fallback.');
console.log('No browser rendering or device FPS benchmark is claimed by this test.');

export {t,ctx,els};
