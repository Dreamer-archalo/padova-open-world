import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import '../dist/airport-interactivity.js'; // registers the playable interceptor spec
import {VEHICLES} from '../dist/vehicles.js';
import {flightCommand,controlSpeed,selectFlightCruise} from '../dist/airport-air-controls.js';
import {airHuntPayout,enemyPointer,runwayMissionSpot,startAirHunt} from '../dist/airport-air-hunt.js';

assert.deepEqual(flightCommand(new Set(['ArrowUp','Tab'])),{climb:true,dive:false,throttle:true,brake:false});
assert.deepEqual(flightCommand(new Set(['ArrowDown','ControlLeft'])),{climb:false,dive:true,throttle:false,brake:true});
assert.equal(controlSpeed(40,{throttle:true},.5,20,30,100),50,'Tab accelerates');
assert.equal(controlSpeed(40,{brake:true},.5,20,30,100),25,'Ctrl brakes');
assert.equal(controlSpeed(98,{throttle:true},1,20,30,100),100,'max speed remains bounded');
const blackbird={airCruise:130,airBoost:600/3.6};
selectFlightCruise(blackbird,new Set(['Tab']));assert.equal(blackbird.airCruise,600/3.6,'Tab must override legacy automatic cruise braking');
selectFlightCruise(blackbird,new Set());assert.equal(blackbird.airCruise,130,'cruise resets after throttle released');
selectFlightCruise({airCruise:undefined,airBoost:undefined},new Set(['Tab']));
assert.equal(airHuntPayout(0),0);assert.equal(airHuntPayout(1),150);
assert.equal(airHuntPayout(10),1500);assert.equal(airHuntPayout(40),1500);
const pilot={x:0,z:0,y:90,yaw:0,flightPitch:0},ahead=enemyPointer(pilot,{x:0,z:280,y:90}),left=enemyPointer(pilot,{x:-280,z:0,y:90}),right=enemyPointer(pilot,{x:280,z:0,y:90});
assert(ahead.x>10&&ahead.x<90&&ahead.metres===280,'enemy straight ahead is on screen');
assert(left.x<10&&left.arrow==='◀','left off-screen enemy is on left edge');
assert(right.x>90&&right.arrow==='▶','right off-screen enemy is on right edge');
const g={state:{started:true,paused:false,mode:'foot',x:0,z:0,y:0,yaw:0,health:100,money:0,jobs:0,wanted:0,elapsed:0,car:null,mission:null},cars:[],scene:new THREE.Group(),
 terrain:{height:()=>0,dry:()=>true},collision:{near:()=>[]},airDefenders:[],extraDogfighters:[],incomingMissiles:[],confirmedAirKills:0,
 addCar(x,z,yaw,police,parked,style){const car={x,z,y:0,yaw,speed:0,health:100,style,spec:VEHICLES[style],mesh:new THREE.Group(),parked};this.cars.push(car);this.scene.add(car.mesh);return car;},
 retire(car){this.cars.splice(this.cars.indexOf(car),1);this.scene.remove(car.mesh);},pose(){},toast(){}};
assert(VEHICLES['airport-interceptor']?.aircraft,'interceptor spec must already be installed');
const spot=runwayMissionSpot(g);assert(spot&&Number.isFinite(spot.x)&&Number.isFinite(spot.z),'safe runway placement');
assert.equal(startAirHunt(g),true,'mission starts immediately from the activities menu');
assert.equal(g.state.mode,'car');assert.equal(g.state.car.style,'airport-interceptor');
assert.equal(g.state.wanted,1,'first two enemy jets are triggered');
assert.equal(g.state.mission.type,'airhunt');assert.equal(g.airHunt.startKills,0);assert.equal(g.airHunt.kills,0);
assert.equal(g.state.money,0,'no advance payment before a confirmed kill');
assert(Math.hypot(g.state.x-spot.x,g.state.z-spot.z)<.01,'pilot spawns at the airport runway');
console.log('PASS air hunt: arrows, speed/cruise controls, €150 per kill, €1,500 cap, safe runway and pilot seated');
