import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {SpatialIndex} from '../dist/core.js';
import {VEHICLES} from '../dist/vehicles.js';
import '../dist/airport-interactivity.js';
import {CIVIL_AIRCRAFT,missileJet,launchAirportMissile,tickAirportMissiles,flyingAirportMarkers} from '../dist/airport-flight-extras.js';
import {createAirportTraffic,tickAirportTraffic} from '../dist/airport-air-traffic.js';

assert.equal(CIVIL_AIRCRAFT.length,3,'three additional civilian models');
for(const c of CIVIL_AIRCRAFT){assert(VEHICLES[c.style]?.plane&&VEHICLES[c.style]?.aircraft,'civil model is not boardable/flyable '+c.style);assert(c.name&&Number.isFinite(c.u)&&Number.isFinite(c.v));}
for(const jet of ['airport-jet','airport-interceptor','airport-strike'])assert(missileJet(jet),'military jet has no missile '+jet);
for(const craft of ['airport-cargo','airport-airliner','airport-golf','airport-business'])assert(!missileJet(craft),'noncombat vehicle may fire '+craft);

const scene=new THREE.Scene(),owner={style:'airport-jet',spec:VEHICLES['airport-jet'],health:100,speed:35,x:0,y:20,z:0,yaw:0,mesh:new THREE.Group()};
const state={started:true,paused:false,mode:'car',car:owner,elapsed:1,x:0,y:20,z:0};
const victim={style:'airport-cargo',spec:VEHICLES['airport-cargo'],health:100,x:0,y:20,z:118,yaw:0,mesh:new THREE.Group()};
let hits=0,impacts=0;
const g={scene,state,cars:[owner,victim],policeAir:[],collision:new SpatialIndex(30),terrain:{height:()=>0},toast(){},hit(car){car.health=0;car.mesh.visible=false;hits++;},cannon:{impact(){impacts++;}}};
assert(launchAirportMissile(g),'TAB should launch from a boarded military jet');
assert.equal(g.airportMissiles.length,1);
assert(!launchAirportMissile(g),'missile cooldown ignored');
for(let i=0;i<100&&hits===0;i++){state.elapsed+=1/60;tickAirportMissiles(g,1/60);}
assert.equal(hits,1,'jet missile did not hit the opposing aircraft');
assert.equal(impacts,1,'jet missile impact effect missing');
assert.equal(g.airportMissiles.length,0,'impact missile not retired');
state.elapsed+=1.6;assert(launchAirportMissile(g),'missile cannot fire after cooldown');
for(let i=0;i<390;i++){state.elapsed+=1/60;tickAirportMissiles(g,1/60);}
assert.equal(g.airportMissiles.length,0,'expired missile has not been removed');
state.mode='foot';state.car=null;assert(!launchAirportMissile(g),'missiles can fire on foot');
state.mode='car';state.car=owner;
const sim=createAirportTraffic();g.airTraffic=sim;
assert(flyingAirportMarkers(g).some(p=>p.kind==='C'),'airborne cargo missing from M-map');
assert(flyingAirportMarkers(g).some(p=>p.kind==='H'),'autonomous helicopter missing from M-map');
assert(!flyingAirportMarkers(g).some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.z)),'invalid M-map coordinates');
state.car=null;state.mode='foot';assert.deepEqual(flyingAirportMarkers(g),[],'flight radar must be disabled on foot');
const departures=new Set(),arrivals=new Set();let idle=0,longestIdle=0;
for(let i=0;i<25000;i++){
 const before=sim.aircraft.map(a=>a.phase);tickAirportTraffic(sim,.1);
 const flying=sim.aircraft.filter(a=>a.type==='cargo'&&['takeoff','departure','cruise','arrival-hold','approach','landing'].includes(a.phase)).length;
 idle=flying?0:idle+.1;longestIdle=Math.max(longestIdle,idle);
 for(const [j,a] of sim.aircraft.entries())if(a.type==='cargo'){
  if(a.phase==='takeoff'&&before[j]!=='takeoff')departures.add(a.id);
  if(a.phase==='landing'&&before[j]!=='landing')arrivals.add(a.id);
 }
}
const snapshot=sim.aircraft.filter(a=>a.type==='cargo').map(a=>({id:a.id,phase:a.phase,cycles:a.completed}));
console.log('CARGO_ROTATION_DIAGNOSTIC '+JSON.stringify({departures:[...departures],arrivals:[...arrivals],longestIdleSeconds:+longestIdle.toFixed(1),runway:sim.runway,taxiway:sim.taxiway,snapshot}));
assert(departures.has('cargo-c')&&departures.has('cargo-d'),'both initially parked transports must take off autonomously');
assert.equal(arrivals.size,4,'all four cargo transports must return and land');
assert(snapshot.every(a=>a.cycles>=1),'cargo did not complete hangar-flight-return cycle');
assert(longestIdle<600,'airport cargo traffic stopped for more than ten minutes');
console.log('PASS civilian models, jet missile collision and cooldown, flight map and scheduled cargo departures');
