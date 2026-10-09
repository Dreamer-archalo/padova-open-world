import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {SpatialIndex} from '../dist/core.js';
import {VEHICLES} from '../dist/vehicles.js';
import '../dist/special-vehicles.js';
import {trafficLane,laneOffset,lanePoint,curbParkingTarget} from '../dist/traffic.js';
import {groundVehicleStep,groundContact} from '../dist/vehicle-dynamics.js';
import {mobileRamp} from '../dist/stunt-traffic.js';
import {regionalNpcStep,reviveRegionalCar} from '../dist/regional-traffic-physics.js';
import {RegionalWorld} from '../dist/regional-world.js';
import {PadovaUrbanDirector} from '../dist/urban-life.js';

const collision=new SpatialIndex(60),flat={height:()=>5,slope:()=>0,dry:()=>true,waterAt:()=>null,roads:{sample:()=>5}},
 road={k:'motorway',w:7,oneway:1,a:[0,0],b:[0,100]},right=laneOffset(road,0),left=laneOffset(road,1);
const makeCar=(style,x=right,z=0)=>({x,z,y:5,yaw:0,speed:8,health:100,style,spec:VEHICLES[style],mesh:new THREE.Group(),r:road,road,dir:1,lane:0,desiredLane:0,laneOffset:right,driver:1});
const car=makeCar('sedan');
assert.equal(trafficLane(car,{x:right,z:40},[car],null,10,0),0,'straight continuation must keep right lane');
const blocker=makeCar('sedan',left,0);
assert.equal(trafficLane(car,{x:right,z:40},[car,blocker],null,11,Math.PI/2),0,'left turn must not merge into occupied lane');
assert.equal(trafficLane(car,{x:right,z:40},[car],null,12,Math.PI/2),1,'left turn uses available left lane');
Object.assign(car,{lane:1,laneOffset:left});
assert.equal(trafficLane(car,{x:left,z:40},[car],null,13,-Math.PI/2),0,'right turn uses right lane');
// Anchor lane geometry to the actual steering solver: D/right is turn=-1.
for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
 const probe=makeCar('sedan',0,0);probe.yaw=yaw;probe.speed=10;
 groundVehicleStep(probe,probe,{turn:-1,handbrake:false},.1,flat,collision);
 const target={x:Math.sin(yaw)*100,z:Math.cos(yaw)*100},point=lanePoint(target,{x:0,z:0},{k:'secondary',w:8});
 const side=p=>p.x*Math.cos(yaw)-p.z*Math.sin(yaw);
 assert(side(probe)<0&&side({x:point.x-target.x,z:point.z-target.z})<0,'traffic lane is on the same side as actual right steering');
}

const urban={k:'residential',w:8},park=makeCar('sedan',laneOffset(urban,0));Object.assign(park,{road:urban,laneOffset:laneOffset(urban,0)});
const curb=curbParkingTarget(park,{x:park.x,z:100},flat,collision,[]);
assert(curb&&Math.abs(curb.x+(urban.w/2+park.spec.width/2+.5))<1e-9,'right parking offset measured from road centre, not current lane');

const tank=makeCar('cisterna',right,3);tank.speed=0;tank.regionalTraffic=true;
const hitter=makeCar('sedan');hitter.speed=20;hitter.regionalTraffic=true;
const viewer={mode:'foot',x:100,z:100,y:5,health:100};let blasts=0;
regionalNpcStep(hitter,[tank],viewer,1/60,{...flat,npcBlast:()=>blasts++},collision,4);
assert(tank.fuelExploded&&tank.mesh.visible&&tank.permanentlyDestroyed&&tank.burning&&hitter.health<40,'regional tanker blast includes the car that struck it');
assert.equal(blasts,1);
reviveRegionalCar(tank,0,20,0,flat);
assert.equal(tank.x,right,'regional respawn restores physical lane position');
assert.equal(tank.fuelExploded,false);
const rampTruck=makeCar('camionrampa',right,0),climber=makeCar('sedan',right,-3.2);rampTruck.speed=0;
const rampTerrain={...flat,mobileRamps:[mobileRamp(rampTruck)]};climber.y=groundContact(rampTerrain,climber.x,climber.z,climber.y,climber).y;
regionalNpcStep(climber,[rampTruck],viewer,1/60,rampTerrain,collision,5);
assert.equal(climber.health,100,'regional ramp ascent is not treated as a vehicle collision');

const grid={width:3,height:3,step:100,x0:11900,z0:-100,heights:Array(9).fill(5)},blank={roads:[],water:[],areas:[],buildings:[],shorelines:[]};
function walkingScene(next,side=-4.25){
 const region=new RegionalWorld(new THREE.Scene(),blank,grid,collision),r={k:'residential',w:6,a:[12000,0],b:[12000,10],yA:5,yB:5};
 next={k:'residential',w:6,yA:5,yB:5,...next};
 for(const q of [r,next])region.insertSpatial(region.roads,q,q.a,q.b,8);
 const p={person:true,detail:true,r,t:.995,dir:1,side,x:12000-side,z:9.95,y:5,mesh:new THREE.Group(),health:100};
 const group=new THREE.Group();group.userData={ambient:[p],detailed:true};
 region.visible.set('37,0',group);region.key='37,0';region.height=()=>5;region.contains=()=>true;region.advanceBuildSlice=()=>false;
 region.streamProfile=()=>({keepRadius:100,detailRadius:0,actorPhysicsRadius:1e9});
 region.attachTraffic({cars:[],terrain:flat,player:{x:12000,z:0,y:5,mode:'foot'},collision});
 return {region,p,r,next};
}
const reversed=walkingScene({a:[12000,20],b:[12000,10]});
reversed.region.update({x:12000,z:0,y:5,elapsed:1},.075);
assert.equal(reversed.p.r,reversed.next);assert.equal(reversed.p.dir,-1);assert.equal(reversed.p.side,4.25);
assert.equal(reversed.p.x,12004.25,'reversed OSM vertex order retains the same sidewalk');
reversed.region.update({x:12000,z:0,y:5,elapsed:2},.075);
assert(reversed.p.z>10&&Math.abs(reversed.p.mesh.position.y-(reversed.p.y+.07))<1e-9,'render and simulation share pedestrian elevation');
const corner=walkingScene({a:[12000,10],b:[12010,10]},4.25);
corner.region.update({x:12000,z:0,y:5,elapsed:1},.075);
assert.equal(corner.p.r,corner.r,'unsafe disconnected sidewalks keep original segment');
assert.equal(corner.p.t,.995);assert.equal(corner.p.dir,-1);assert.equal(corner.p.x,11995.75);
corner.region.update({x:12000,z:0,y:5,elapsed:2},.075);
assert(corner.p.z<9.95&&corner.region.safeWalk(corner.p.x,corner.p.z,corner.p.y),'rejected turn resumes safe walking without teleportation');

const prohibited=new RegionalWorld(new THREE.Scene(),{...blank,roads:[
 {k:'residential',w:6,junction:'roundabout',p:[[12000,0],[12000,20]]},
 {k:'service',w:6,access:'private',p:[[12040,0],[12040,20]]}
]},grid,collision);
const segments=[...new Set([...prohibited.roads.values()].flat())];
assert(segments.some(r=>r.junction==='roundabout')&&segments.some(r=>r.access==='private'),'regional chunking preserves pedestrian restrictions');
assert(!prohibited.safeWalk(12004.25,10,5)&&!prohibited.safeWalk(12044.25,10,5));

const p={x:0,z:0,y:5,yaw:0,seed:1,mesh:new THREE.Group(),anchor:{x:0,z:0}},
 game={state:{elapsed:27,x:0,z:0,mode:'foot'},people:[p],signals:{junctions:new Map(),allowed:()=>false}},director=new PadovaUrbanDirector(game,{bars:[],benches:[]});
p.cityCross={id:1,yaw:0,to:{x:0,z:10}};director.start(p,'crosswalk',p.cityCross.to);p.cityTask.started=0;
assert(director.intent(p,{},27,[]).crossing&&p.cityCross.committed);
director.react(p,[{x:0,z:2,speed:8,mesh:{visible:true}}]);director.alarm({x:0,z:0});
assert.equal(p.cityTask.state,'crosswalk','pedestrian finishes crossing when nearby cars or alarms occur');
director.afterMove(p,60,false,.1);assert.equal(p.cityTask.state,'crosswalk','timeout cannot abandon pedestrian on roadway');
p.z=10;director.afterMove(p,61,false,.1);assert.equal(p.cityTask,null,'crossing completes at safe destination');

const report={rightSteeringAlignment:true,straightLane:true,safeTurnMerge:true,curbOffset:true,regionalBlast:{health:hitter.health,blasts},regionalRespawn:true,regionalRampAscent:true,sidewalkContinuity:true,regionalRestrictions:true,crosswalkCompletion:true};
fs.mkdirSync('test-artifacts/r31',{recursive:true});fs.writeFileSync('test-artifacts/r31/review.json',JSON.stringify(report,null,2)+'\n');
console.log('PASS R31 REVIEW',JSON.stringify(report));
