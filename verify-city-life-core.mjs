import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from './dist/vendor/three.module.js';
import {t,ctx} from './tools/controller-harness.mjs';
import {SpeedCameras} from './dist/speed-cameras.js';
import {footMotion,animateGait} from './dist/foot-controller.js';
import {QUALITY} from './dist/quality.js';
import {createCharacter} from './dist/characters.js';
import {AIRPORT,areaPoint} from './dist/gameplay-areas.js';
import {VEHICLES} from './dist/vehicles.js';
import {vehicleBlocked} from './dist/movement.js';
const api=vm.runInContext('({speedCameras,trams,cameraRig,applyQuality,poseVehicle})',ctx);
const audit=t.terrain.motorwayAudit;assert(audit.barriers>1000&&audit.barriers<20000,'guardrail budget: '+audit.barriers);assert(audit.gaps.length>0);assert(audit.gaps.every(g=>g.length>=10&&g.length<=15));
let lanes=0;for(const b of t.world.structures.filter(s=>s.kind==='guardrail').filter((_,i)=>i%61===0)){
 assert(vehicleBlocked(b.x,b.z,0,t.world.collision,VEHICLES.scooter,b.y),'rail has collision');lanes++;
}
// The fine follows a real directional sweep; pauses/slow passes/respawns cannot bill.
const radar={x:0,z:0,y:0,yaw:0,road:{w:10},limit:90,armed:true,cooldownUntil:0,mesh:{visible:true}};
const state={x:0,z:-1,y:0,car:{spec:{}},speed:30,money:100,elapsed:0};let saves=0,toasts=[];
const cameras=Object.create(SpeedCameras.prototype);Object.assign(cameras,{sites:[radar],state,save:()=>saves++,toast:t=>toasts.push(t),previous:null});
cameras.update();state.z=1;cameras.update();assert.equal(state.money,75);assert.equal(toasts[0],'MULTA AUTOVELOX -25');
for(let i=0;i<60;i++){state.z=i%2?1:-1;state.elapsed+=.02;cameras.update();}assert.equal(state.money,75,'one fine per crossing');
state.elapsed=20;state.z=60;cameras.update();state.z=-60;cameras.update();state.z=-1;state.speed=20;cameras.update();state.z=1;cameras.update();assert.equal(state.money,75,'obeying limit is free');
state.z=60;state.elapsed=40;cameras.update();state.z=-1;cameras.update();state.z=1;state.y=8;state.speed=30;cameras.update();assert.equal(state.money,75,'different elevation');assert.equal(saves,1);
assert.equal(api.speedCameras.sites.length,12);assert(api.speedCameras.sites.every(s=>s.road.n===s.roadName&&s.source));
for(const direction of [-1,1]){const actor={yaw:0},rig={yaw:0,dragging:false};for(let i=0;i<1200;i++)footMotion(actor,rig,{turn:direction,forward:0,run:false},1/60);assert(Math.abs(actor.yaw-direction*45)<1e-6,'rotation stays continuous for 20s');}
const start=areaPoint(AIRPORT,0,-300);Object.assign(t.state,{...start,y:t.terrain.height(start.x,start.z),yaw:0,mode:'foot',car:null,health:100,vy:0});api.cameraRig.reset(0);
for(const key of ['KeyA','ArrowLeft','KeyD','ArrowRight']){const startYaw=t.state.yaw;t.keys.add(key);for(let i=0;i<400;i++)t.movePlayer(1/60);t.keys.clear();assert(Math.abs(t.state.yaw-startYaw)>12,'held '+key);}
const g=createCharacter('fede');animateGait(g,.08,3.6,false);const walk={...g.userData.gait};animateGait(g,.08,7,true);assert(g.userData.gait.frequency>walk.frequency&&g.userData.gait.amplitude>walk.amplitude);
const hat=new THREE.Box3().setFromObject(g.getObjectByName('wizard hat')),face=new THREE.Box3().setFromObject(g.getObjectByName('face'));assert(hat.min.y>face.max.y,'Merlin hat clears head');
for(const [q,count] of [['hyper',2],['low',3],['medium',4],['high',4]]){api.trams.setQuality(q);assert.equal(api.trams.vehicles.filter(v=>!v.sleeping).length,count);assert(api.trams.vehicles.every(v=>v.cars.length===2));assert(QUALITY[q].traffic>=24);}
assert.equal(VEHICLES.cruiser.name,'Notturna · moto cruiser');
const report={guardrails:audit.barriers,guardrailCollisionSamples:lanes,gaps:audit.gaps.length,velox:12,fine:25,singleCharge:true,heldRotationSeconds:20,trams:{hyper:2,low:3,medium:4,high:4},runningAnimation:true,hatClearance:true};fs.writeFileSync('docs/city-life-core-results.json',JSON.stringify(report,null,2)+'\n');console.log('PASS city-life core',report);
