import {auditMap} from './tools/audit-map.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import * as THREE from './dist/vendor/three.module.js';
import {t,ctx,els} from './verify-stability.mjs';
import {NPC_VEHICLES,createNPCCar,chooseTrafficStyle,HELICOPTER} from './dist/modern-vehicles.js';
import {updateTurbo,helicopterStep,pedestrianIntent,pursuitTarget} from './dist/modern-driving.js';
import {VEHICLES} from './dist/vehicles.js';
import {vehicleBlocked} from './dist/movement.js';
import {SpatialIndex,dist,makeRoadGraph} from './dist/core.js';
import {GeometryBatch} from './dist/world.js';
import {buildModernRoads} from './dist/modern-roads.js';
import {cutCorridor} from './dist/modern-map.js';
import {Terrain} from './dist/terrain.js';
import {auditModern} from './tools/audit-modern.mjs';
const ai=vm.runInContext('({updateTraffic,updatePeople,updatePolice,raiseWanted,signals,incidents,graph,placeTraffic,placePerson,vehiclesMenu})',ctx);
const results={};
// Exact new fleet geometry, collision bounds, exclusivity and district weights.
assert(Object.keys(NPC_VEHICLES).length>=20);
for(const [id,spec] of Object.entries(NPC_VEHICLES)){
 const model=createNPCCar(id),size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
 assert(size.x<=spec.width+.1&&size.z<=spec.length+.05&&size.y<=spec.height+.1,id+' collision bounds');
 model.traverse(m=>{if(m.isMesh)assert(m.geometry.attributes.position.array.every(Number.isFinite));});
}
const menuSource=fs.readFileSync('dist/game.js','utf8').split('function vehiclesMenu()')[1].split('function goodNearbyNode')[0];
assert(menuSource.includes("['mito','cinquecento','motorcycle','scooter','truck'].map"));
for(const id of [...Object.keys(NPC_VEHICLES),'airone'])assert(!menuSource.includes("'"+id+"'"));
for(let i=0;i<100;i++)assert(['van','pickup','mpv','classic'].includes(NPC_VEHICLES[chooseTrafficStyle('industrial',()=>i/100)].family));
let expensive=0;for(let i=0;i<1000;i++)if(['luxury','sport','supercar'].includes(NPC_VEHICLES[chooseTrafficStyle('urban',()=>i/1000)].family))expensive++;assert(expensive>0&&expensive<100);
results.fleet={newTypes:Object.keys(NPC_VEHICLES).length,rareShare:expensive/1000};
// Six continuous seconds, exact 6→1 display, reset, and non-special vehicles.
const turbo={style:'cinquecento',spec:VEHICLES.cinquecento};let display=[];
for(let i=0;i<359;i++){const r=updateTurbo(turbo,100,1/60);assert(!r.explode);if(!display.includes(r.remaining))display.push(r.remaining);}
assert.deepEqual(display,[6,5,4,3,2,1]);assert(updateTurbo(turbo,100,1/60).explode);
updateTurbo(turbo,90,1/60);assert.equal(turbo.turboTime,0);
for(let i=0;i<300;i++)updateTurbo(turbo,100,1/60);updateTurbo(turbo,97,1/60);assert.equal(turbo.turboTime,0);
assert.equal(updateTurbo({style:'nido',spec:VEHICLES.nido},200,9).explode,false);
results.turbo={seconds:6,display,reset:true};
// Aircraft flight uses the actual controller, including entry/exit restrictions.
t.keys.clear();t.clearPolice();for(const c of t.cars)c.mesh.visible=false;const heli=t.cars.find(c=>c.spec.aircraft);assert(heli);
heli.mesh.visible=true;Object.assign(t.state,{mode:'foot',car:null,x:heli.x+3,z:heli.z,y:heli.y,speed:0,health:100});t.toggleVehicle();assert.equal(t.state.car,heli);
const ground=t.state.y;t.keys.add('Space');for(let i=0;i<180;i++){t.state.elapsed+=1/60;t.movePlayer(1/60);}assert(t.state.y>ground+18);t.keys.clear();t.toggleVehicle();assert.equal(t.state.mode,'car','no exiting in air');
const airborne={x:t.state.x,z:t.state.z,y:t.state.y};t.keys.add('KeyW');for(let i=0;i<120;i++){t.state.elapsed+=1/60;t.movePlayer(1/60);}assert(dist(t.state,airborne)>10);assert(t.state.y>ground+18);t.keys.clear();
// Return to the checked pad to test descent and landing without selecting a rooftop.
Object.assign(t.state,{x:heli.home.x,z:heli.home.z,speed:0});t.keys.add('ShiftLeft');for(let i=0;i<400;i++){t.state.elapsed+=1/60;t.movePlayer(1/60);}t.keys.clear();assert(Math.abs(t.state.y-t.terrain.height(t.state.x,t.state.z))<.1);t.state.speed=0;t.toggleVehicle();assert.equal(t.state.mode,'foot');
// Altitude cap and solid obstruction checks are independent of the renderer.
const empty=new SpatialIndex(),flat={height:()=>0,elevation:()=>0,dry:()=>true,waterHeight:()=>-2};const flying={x:0,z:0,y:179.9,yaw:0,speed:0,vy:8,spec:HELICOPTER};for(let i=0;i<120;i++)helicopterStep(flying,{forward:0,turn:0,up:true},1/60,flat,empty);assert.equal(flying.y,180);
results.helicopters={pads:t.cars.filter(c=>c.spec.aircraft).map(c=>c.home.name),takeoff:true,landing:true,airExitBlocked:true,ceiling:180};
// Every new traffic model can be boarded and left through E.
const safe=t.dryRoad({x:-400,z:-100},VEHICLES.aurora);assert(safe);
for(const id of Object.keys(NPC_VEHICLES)){
 for(const c of t.cars)c.mesh.visible=false;const c=t.addCar(safe.x,safe.z,safe.yaw,false,true,id);
 Object.assign(t.state,{mode:'foot',car:null,x:c.x+Math.cos(c.yaw)*3,z:c.z-Math.sin(c.yaw)*3,y:c.y,speed:0});t.toggleVehicle();assert.equal(t.state.car,c,id+' enter');t.state.speed=0;t.toggleVehicle();assert.equal(t.state.mode,'foot',id+' exit');c.mesh.visible=false;
}
// Behaviour diversity and proactive reaction to approaching traffic.
const intents=new Set();for(let seed=0;seed<10;seed++){const p={seed,x:0,z:0,y:0,yaw:0,roadYaw:0,side:1,road:{w:7},anchor:{x:0,z:0}};const r=pedestrianIntent(p,2,[],{x:100,z:100});intents.add(r.profile);assert(Number.isFinite(r.speed));}
assert.equal(intents.size,10);const reaction=pedestrianIntent({seed:0,x:0,z:0,y:0,yaw:0},0,[{x:0,z:-5,y:0,speed:12,mesh:{visible:true}}],{x:100,z:100});assert(reaction.speed>3);
// Run live traffic/pedestrians/pursuit on the mapped network for 12 simulated seconds.
t.travel({x:-700,z:-400,name:'Traffic verification'});for(const c of t.cars)if(!c.parked)ai.placeTraffic(c,40,220);const trafficStart=t.cars.filter(c=>!c.parked&&c.mesh.visible).map(c=>({c,x:c.x,z:c.z}));assert(trafficStart.length>3);
ai.raiseWanted(2);const cops=vm.runInContext('cops',ctx),copStart=cops.map(c=>({x:c.x,z:c.z}));assert(cops.length>=2);
for(let i=0;i<720;i++){t.state.elapsed+=1/60;ai.updateTraffic(1/60);ai.updatePeople(1/60);ai.updatePolice(1/60);for(const c of cops){assert([c.x,c.z,c.y,c.yaw].every(Number.isFinite));assert(t.terrain.dry(c.x,c.z,.8,c.y));assert(!vehicleBlocked(c.x,c.z,c.yaw,t.world.collision,c.spec,c.y),'patrol collision');}}
assert(trafficStart.some(p=>dist(p,p.c)>8),'traffic must progress');assert(cops.some((c,i)=>copStart[i]&&dist(c,copStart[i])>5),'police must progress');assert(t.people.some(p=>p.mesh.visible&&p.speed===0));
results.ai={profiles:intents.size,movingTraffic:trafficStart.filter(p=>dist(p,p.c)>8).length,patrols:cops.length};t.clearPolice();
// Full-map scan includes tiny samples, whole-vehicle collision and water support.
const legacyAudit=auditMap(t.world.data,t.terrain);fs.writeFileSync('docs/modern-clearance-audit.json',JSON.stringify(legacyAudit,null,2)+'\n');
const report=auditModern(t.world.data,t.terrain,t.world.collision);assert.equal(report.faults.length,0,JSON.stringify(report.faults.slice(0,4)));assert(report.bridgeCount>=10);fs.writeFileSync('docs/modern-road-audit.json',JSON.stringify(report,null,2)+'\n');results.map={samples:report.samples,bridges:report.bridgeCount,maxGrade:report.maxGrade};
// Actual car controller on at least ten independent mapped bridges.
for(const c of t.cars)c.mesh.visible=false;const driven=[];const car=t.addCar(safe.x,safe.z,safe.yaw,false,true,'mito');
for(const p of t.terrain.roads.profiles.values()){
 if(!p.road.crossing||!['primary','secondary','tertiary','residential'].includes(p.road.k)||p.road.w<5||p.points.length<5)continue;
 const points=p.points,first=points[0];Object.assign(t.state,{x:first[0],z:first[1],y:t.terrain.roads.sample(p.road,...first)+.05,mode:'car',car,speed:10,health:100});t.waterRecovery.reset();ai.incidents.recovery=null;t.keys.clear();let ticks=0;
 for(let k=1;k<points.length&&ticks<1800;k++){
  const target={x:points[k][0],z:points[k][1]};while(dist(t.state,target)>.3&&ticks<1800){t.state.yaw=Math.atan2(target.x-t.state.x,target.z-t.state.z);t.state.speed=10;t.state.elapsed+=1/60;t.movePlayer(1/60);assert(!t.waterRecovery.active&&!ai.incidents.recovery,'bridge controller recovery '+p.road.n);assert(t.state.speed>0,'bridge obstructed '+p.road.n);ticks++;}
 }
 if(ticks<1800)driven.push(p.road.n||p.id);if(driven.length===12)break;
}
assert(driven.length>=10);results.drivenBridges=driven;
// Modern road rendering stays finite, and Padova 1500 remains opt-in to legacy terrain.
const road=[...t.terrain.roads.profiles.values()].find(p=>p.road.n==='Ponte dei Tadi').road,batch=new GeometryBatch();buildModernRoads(batch,road.p.slice(1).map((b,i)=>({a:road.p[i],b,road,w:road.w})),t.terrain);assert(batch.p.length>0&&batch.p.every(Number.isFinite)&&batch.c.every(Number.isFinite));
const grid={version:1,x0:-100,z0:-100,step:100,width:3,height:3,heights:Array(9).fill(12),waterPlane:[12,0,0]},map={roads:[{p:[[-90,0],[90,0]],w:7,k:'residential'}],water:[],areas:[]};assert.equal(new Terrain(grid,map).modern,false);
const layeredMap={roads:[{p:[[-90,0],[0,0],[90,0]],w:8,k:'primary',b:true,layer:1},{p:[[0,-90],[0,0],[0,90]],w:7,k:'secondary'}],water:[],areas:[]};
const layered=new Terrain(grid,layeredMap,{modern:true});assert(layered.height(0,0,18)-layered.height(0,0,12)>4.7,'shared OSM coordinate must preserve the underpass');
const layeredGraph=makeRoadGraph(layeredMap.roads,{separateLevels:true});assert.equal(layeredGraph.nodes.filter(n=>n.x===0&&n.z===0).length,2,'navigation must not invent a turn between overpass and road below');
const files=['dist/renaissance-game.js','dist/renaissance.css'];for(const file of files){const expected=JSON.parse(fs.readFileSync('docs/renaissance-baseline.json'))[file];assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),expected);}
const pieces=cutCorridor([[-5,-5],[5,-5],[5,5],[-5,5]],[[-1,-6],[1,-6],[1,6],[-1,6]]);assert.equal(pieces.length,2);assert(pieces.flat().every(p=>Math.abs(p[0])>=1));
fs.writeFileSync('docs/modern-test-results.json',JSON.stringify(results,null,2)+'\n');console.log('PASS modern 2026 gameplay controller, whole-map road/bridge audit, traffic/pedestrians/pursuits, E entry/exit on all new cars, helicopters, turbo timer and 1500 guards.');console.log(JSON.stringify(results));
