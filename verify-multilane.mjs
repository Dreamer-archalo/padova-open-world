import assert from 'node:assert/strict';
import fs from 'node:fs';
import {laneCount,laneOffset,lanePoint,laneClearance,trafficLane,trafficSpeed,advanceTrafficSpeed} from './dist/traffic.js';
import {VEHICLES} from './dist/vehicles.js';
import './dist/modern-vehicles.js';
import {QUALITY} from './dist/quality.js';

const motorway={w:13,k:'motorway',one:true},dual={w:12,k:'trunk',one:false},narrow={w:7,k:'secondary',one:false};
assert.equal(laneCount(motorway),3);assert.equal(laneCount(dual),2);assert.equal(laneCount(narrow),1);
const offsets=[0,1,2].map(i=>laneOffset(motorway,i));assert(offsets[0]<offsets[1]&&offsets[1]<offsets[2]);assert(offsets.every(v=>Math.abs(v)<motorway.w/2-1));
const point=lanePoint({x:0,z:100},{x:0,z:0},motorway,2);assert.equal(point.x,offsets[2]);

const road={w:10,k:'motorway',one:true},right=laneOffset(road,0),left=laneOffset(road,1),visible={visible:true};
const car={x:right,z:0,y:5,yaw:0,speed:20,spec:VEHICLES.sedan,style:'sedan',lane:0,desiredLane:0,laneOffset:right,driver:1,mesh:{...visible,id:5},road},blocker={x:right,z:18,y:5,yaw:0,speed:7,spec:VEHICLES.compact,mesh:visible};
assert(laneClearance(car,road,0,[car,blocker]).front<15);assert.equal(laneClearance(car,road,1,[car,blocker]).front,Infinity);
assert.equal(trafficLane(car,{x:right,z:100},[car,blocker],null,10),1,'overtake into free left lane');assert.equal(car.laneReason,'sorpasso');
Object.assign(car,{lane:1,desiredLane:1,laneOffset:left,laneDecisionAt:0,overtakeUntil:0});assert.equal(trafficLane(car,{x:left,z:100},[car],null,20),0,'return to right lane');
Object.assign(car,{lane:1,desiredLane:1,laneOffset:left,laneDecisionAt:0,mesh:{...visible,id:8}});const player={x:left,z:-30,y:5,speed:42,spec:VEHICLES.sport};assert.equal(trafficLane(car,{x:left,z:100},[car],player,30),0,'some cars free the lane for a fast player');
Object.assign(car,{lane:0,desiredLane:0,laneOffset:right,laneDecisionAt:0});assert.equal(trafficLane(car,{x:right,z:40},[car],null,40,Math.PI/2),1,'left-turn preparation uses left lane');

const accelerate=(style,spec)=>{const c={speed:0,longAccel:0,spec,style};for(let i=0;i<300;i++)advanceTrafficSpeed(c,30,1/60);return c.speed;},sport=accelerate('sport',VEHICLES.sport),compact=accelerate('compact',VEHICLES.compact),truck=accelerate('truck',VEHICLES.truck);assert(sport>compact&&compact>truck,'category acceleration');
const braking={speed:25,longAccel:0,spec:VEHICLES.sport};advanceTrafficSpeed(braking,0,1/60);assert(braking.speed>24.9,'braking begins progressively');for(let i=0;i<240;i++)advanceTrafficSpeed(braking,0,1/60);assert.equal(braking.speed,0);
const signals={junctions:new Map(),allowed:()=>true},straight={...car,lane:0,laneOffset:right,yaw:0,speed:15,spec:VEHICLES.sport,style:'sport'},straightSpeed=trafficSpeed(straight,{x:right,z:100},[],signals,0),curveSpeed=trafficSpeed(straight,{x:right+30,z:5},[],signals,0);assert(curveSpeed<straightSpeed,'progressive curve slowdown');

const source=fs.readFileSync('dist/game.js','utf8');assert(!source.includes('cars.indexOf(c)%10'),'quality mode must not hide traffic a second time by district density');assert(QUALITY.hyper.traffic>=24&&QUALITY.low.traffic>=36,'economic modes keep visible traffic budgets');
const report={laneCounts:{oneWay13m:laneCount(motorway),twoWay12mPerDirection:laneCount(dual),narrow:laneCount(narrow)},offsets,behaviours:['sorpasso','rientro','libera corsia','svincolo'],speedAfterFiveSeconds:{sport,compact,truck},curve:{straightSpeed,curveSpeed},qualityTraffic:{hyper:QUALITY.hyper.traffic,performance:QUALITY.low.traffic}};
fs.writeFileSync('docs/multilane-results.json',JSON.stringify(report,null,2)+'\n');console.log('PASS multilane traffic, lane changes, category dynamics and economic-mode traffic',report);
