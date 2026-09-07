import assert from 'node:assert/strict';
import vm from 'node:vm';
import * as THREE from './dist/vendor/three.module.js';
import {t,ctx} from './verify-stability.mjs';
import {CameraRig} from './dist/camera-rig.js';
import {TrafficSignals,trafficSpeed,lanePoint} from './dist/traffic.js';
import {Trams,sampleRail} from './dist/tram.js';
import {VEHICLES} from './dist/vehicles.js';
import {impactResponse} from './dist/incidents.js';
import {Terrain,PRATO,pratoLocal} from './dist/terrain.js';
import {vehicleBlocked} from './dist/movement.js';
import {makeRoadGraph,SpatialIndex,dist,angleDiff} from './dist/core.js';
import {auditMap} from './tools/audit-map.mjs';
const city=vm.runInContext('({cameraRig,signals,trams,incidents,districts,updateTraffic,updatePeople,placeTraffic})',ctx);
// Touch orbit, hold interval, shortest-angle recenter and stable held sideways input.
for(const mode of ['foot','car']){const rig=new CameraRig();rig.reset(3.1);rig.begin();rig.drag(160,-20);const yaw=rig.yaw;for(let i=0;i<60;i++)rig.update(1/60,{mode,yaw:-3.1,speed:90,time:i/60});assert.equal(rig.yaw,yaw);rig.end(1);rig.update(.5,{mode,yaw:-3.1,speed:90,time:2});assert.equal(rig.yaw,yaw);for(let i=0;i<240;i++)rig.update(1/60,{mode,yaw:-3.1,speed:90,time:2.3+i/60});assert(Math.abs(angleDiff(rig.yaw,-3.1))<.001);}
const sideways=new CameraRig();sideways.reset(0);const heading=sideways.basis(0,1);for(let i=0;i<180;i++){sideways.update(1/60,{mode:'foot',yaw:Math.PI/2,speed:3.6,time:i/60});assert.equal(sideways.basis(0,1),heading);}assert(Math.abs(sideways.yaw-Math.PI/2)<.01);
// Layered synthetic crossing: passing below a deck must not snap to its top.
const grid={version:1,x0:-500,z0:-500,step:500,width:3,height:3,heights:Array(9).fill(12),waterPlane:[12,0,0]};
const map={roads:[{p:[[-300,0],[300,0]],w:8,k:'primary',b:true,layer:1},{p:[[0,-300],[0,300]],w:7,k:'residential',layer:0}],areas:[],water:[]};const terrain=new Terrain(grid,map);
const lower=terrain.height(0,0,12),upper=terrain.height(0,0,18);assert(upper-lower>4.7);assert(Math.abs(lower-12)<.1);assert(upper<22,'no unbounded elevation feedback');
const deck={p:[[-10,-5],[10,-5],[10,5],[-10,5]],minY:17,h:.4},index=new SpatialIndex();index.add(deck,-10,-5,10,5);assert(!vehicleBlocked(0,0,0,index,VEHICLES.truck,12));assert(vehicleBlocked(0,0,0,index,VEHICLES.truck,15));
// Traffic honours one-way directions, independent phases and braking distance.
const roads=[{p:[[0,0],[0,80]],w:8,k:'primary'},{p:[[0,0],[0,-80]],w:8,k:'primary'},{p:[[0,0],[80,0]],w:8,k:'primary'},{p:[[0,0],[-80,0]],w:8,k:'primary'}];const graph=makeRoadGraph(roads),signals=new TrafficSignals(graph);
assert.equal(signals.phase(0,0,Math.PI/2),'red');assert.equal(signals.phase(0,0,0),'green');assert.equal(signals.phase(0,14.5,0),'red');assert.equal(signals.phase(0,16,Math.PI/2),'green');
const car={x:-6,z:0,y:12,yaw:Math.PI/2,speed:9,target:0,road:roads[0],spec:VEHICLES.mito,mesh:{visible:true}};
assert.equal(trafficSpeed(car,{x:0,z:0},[],signals,0),0);assert(trafficSpeed(car,{x:0,z:0},[],signals,16)>0);
assert.equal(trafficSpeed({...car,target:999},{x:100,z:0},[{x:-2,z:0,y:12,spec:VEHICLES.mito,mesh:{visible:true}}],signals,16),0);
assert(lanePoint({x:0,z:20},{x:0,z:0},roads[0]).x<0);
const one=makeRoadGraph([{p:[[0,0],[10,0]],w:7,k:'residential',oneway:-1}]);assert.equal(one.nodes[0].edges.length,0);assert.equal(one.nodes[1].edges[0].id,0);
// Actual mapped trams: finite geometry, continuous progress, impact never blocks rail motion.
assert(city.trams.routes.length>0);const tr=city.trams.vehicles[0],rail=sampleRail(tr.route,tr.d),actor={...rail,y:t.terrain.height(rail.x,rail.z)};let hits=0;city.trams.update(.1,1,actor,[actor],()=>hits++);assert(hits>0);const before=tr.d;for(let i=0;i<900;i++)city.trams.update(1/60,2+i/60,actor,[actor],()=>hits++);assert(Math.abs(tr.d-before)>5);assert(tr.cars.every(c=>c.position.toArray().every(Number.isFinite)));
tr.d=tr.route.length-4.31;tr.direction=1;tr.speed=10;tr.dwell=0;city.trams.update(.1,20,actor,[],()=>{});assert.equal(tr.direction,-1);assert(dist({x:tr.cars[0].position.x,z:tr.cars[0].position.z},{x:tr.cars[1].position.x,z:tr.cars[1].position.z})>7);
// Find a real, unobstructed straight road for controller-level turbo/respawn checks.
t.keys.clear();t.clearPolice();for(const c of t.cars)c.mesh.visible=false;let runway;
for(const road of t.world.data.roads){if(!['primary','secondary','motorway','trunk'].includes(road.k)||road.w<7)continue;for(let i=1;i<road.p.length;i++){const a=road.p[i-1],b=road.p[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<220)continue;const yaw=Math.atan2(b[0]-a[0],b[1]-a[1]);let good=true;for(let d=10;d<210;d+=5){const x=a[0]+Math.sin(yaw)*d,z=a[1]+Math.cos(yaw)*d,y=t.terrain.roads.sample(road,x,z)+.05;if(x< -5700||x>7000||z< -6200||z>6000||vehicleBlocked(x,z,yaw,t.world.collision,VEHICLES.cinquecento,y)||!t.terrain.dry(x,z,2,y)){good=false;break;}}if(good){runway={x:a[0]+Math.sin(yaw)*10,z:a[1]+Math.cos(yaw)*10,yaw,road};break;}}if(runway)break;}
assert(runway,'mapped straight road for the turbo scenario');
const turbo=t.addCar(runway.x,runway.z,runway.yaw,false,true,'cinquecento');
function reset(){city.incidents.recovery=null;t.waterRecovery.reset();Object.assign(t.state,runway,{mode:'car',car:turbo,speed:0,y:t.terrain.roads.sample(runway.road,runway.x,runway.z)+.05,health:100,knockX:0,knockZ:0,spin:0});Object.assign(turbo,runway,{y:t.state.y,speed:0,health:100});turbo.mesh.visible=true;t.keys.clear();t.keys.add('KeyW');}
reset();for(let i=0;i<60;i++){t.state.elapsed+=1/60;t.movePlayer(1/60);}const normal=t.state.speed;
reset();t.keys.add('ShiftLeft');for(let i=0;i<60;i++){t.state.elapsed+=1/60;t.movePlayer(1/60);}assert(t.state.speed>normal);
reset();t.keys.add('Tab');let maximum=0;for(let i=0;i<180&&!city.incidents.recovery;i++){t.state.elapsed+=1/60;t.movePlayer(1/60);maximum=Math.max(maximum,t.state.speed);}assert(maximum*3.6>340);assert(city.incidents.recovery);assert.equal(t.state.health,0);assert(!turbo.mesh.visible);const explosion={x:t.state.x,z:t.state.z};for(let i=0;i<125;i++){t.state.elapsed+=1/60;t.movePlayer(1/60);city.incidents.update(t.state.elapsed);}assert(!city.incidents.recovery);assert.equal(t.state.health,100);assert(turbo.mesh.visible);assert(dist(t.state,explosion)<220,'local respawn');
assert(impactResponse(2).damage<impactResponse(15).damage);assert(!impactResponse(15).destroy);assert(impactResponse(40).destroy);
// Local detail and vegetation use the same exclusion system at every loaded chunk.
assert(t.world.details.tadi.userData.facades>5);t.world.update(-565,-55,true);for(let i=0;i<15;i++)t.world.update(-565,-55);let plants=0;for(const group of t.world.loaded.values())for(const plant of group.userData.vegetation||[]){assert(city.districts.canPlant(plant.x,plant.z,t.terrain));plants++;}assert(plants>100);
const fountain=t.world.details.root.children.find(g=>g.userData.poi==='erbe-fountain');assert(fountain);assert(Math.abs(t.terrain.groundHeight(-77.6,-41.7)-t.terrain.elevation(-77.6,-41.7))<.3);
const report=auditMap(t.world.data,t.terrain);assert.equal(report.counts.unsupportedWater,0);assert.equal(report.counts.steep,0);assert.equal(report.counts.junctionSteps,0);assert.equal(report.counts.lowDecks,0);
console.log('PASS: touch camera math/hold/recenter, lateral walking basis, layered underpass and deck collision, one-way traffic, red/green/following, mapped tram progress/impact/terminal, actual controller Shift/Tab critical explosion/local respawn, impact severity, Via dei Tadi facades, vegetation exclusions, Erbe fountain and whole-map road scan.');
console.log(JSON.stringify({tramRoutes:city.trams.routes.map(r=>Math.round(r.length)),tramVehicles:city.trams.vehicles.length,tadiFacades:t.world.details.tadi.userData.facades,vegetation:plants,turboPeakKmh:maximum*3.6,respawnDistance:dist(t.state,explosion),mapIssues:report.counts}));
