import assert from 'node:assert/strict';
import {AIRPORT_FLEET,createAirportTraffic,tickAirportTraffic,destroyAirportAircraft} from '../dist/airport-air-traffic.js';

const sim=createAirportTraffic();
assert.equal(AIRPORT_FLEET.filter(a=>a.type==='cargo').length,4,'four transport aircraft');
assert.equal(sim.aircraft.filter(a=>a.type==='cargo'&&a.phase==='cruise').length,2,'two transports airborne');
assert.equal(sim.aircraft.filter(a=>a.type==='cargo'&&a.phase==='parked').length,2,'two transports parked');
assert.equal(sim.aircraft.filter(a=>a.type==='jet').length,2,'two military jets');
let takeoffs=0,landings=0,smallestGap=Infinity,maximumAltitudeStep=0;
for(let n=0;n<25000;n++){
 const previous=sim.aircraft.map(a=>({phase:a.phase,yAbove:a.yAbove,u:a.u,v:a.v}));
 tickAirportTraffic(sim,.1);
 const occupied=sim.aircraft.filter(a=>['lineup','takeoff','approach','landing','rollout','exit'].includes(a.phase));
 assert(occupied.length<=1,'two aircraft using runway simultaneously: '+occupied.map(a=>a.id).join(','));
 if(occupied.length)assert.equal(sim.runway,occupied[0].id,'runway reserved by the wrong aircraft');
 const onTaxiway=sim.aircraft.filter(a=>['taxi','hold','lineup','approach','landing','rollout','exit','return'].includes(a.phase));
 assert(onTaxiway.length<=2,'unbounded ground/approach traffic');
 for(const [i,a] of sim.aircraft.entries()){
  if(a.phase==='takeoff'&&previous[i].phase!=='takeoff')takeoffs++;
  if(a.phase==='landing'&&previous[i].phase!=='landing')landings++;
  assert(Number.isFinite(a.u)&&Number.isFinite(a.v)&&Number.isFinite(a.yAbove)&&a.yAbove>=0,'invalid flight pose: '+a.id);
  maximumAltitudeStep=Math.max(maximumAltitudeStep,Math.abs(a.yAbove-previous[i].yAbove));
  const delta=Math.hypot(a.u-previous[i].u,a.v-previous[i].v);
  assert(delta<=a.speed*.1+.05,'teleportation: '+a.id+' / '+a.phase+' / '+delta);
  for(let j=i+1;j<sim.aircraft.length;j++){
   const b=sim.aircraft[j],gap=Math.hypot(a.u-b.u,a.v-b.v)-(a.width+b.width)*.53;
   if(Math.abs(a.yAbove-b.yAbove)<10){smallestGap=Math.min(smallestGap,gap);assert(gap>=-.001,'overlapping aircraft: '+a.id+'/'+b.id+' at '+sim.time);}
  }
 }
}
assert(takeoffs>=8&&landings>=8,'insufficient departures or arrivals');
assert(sim.aircraft.every(a=>a.completed>=1),'some aircraft never completed a full hangar-flight-return cycle');
assert(maximumAltitudeStep<3,'aircraft altitude teleported '+maximumAltitudeStep);
const collided=sim.aircraft.find(a=>a.phase==='parked');assert(collided,'no aircraft available to test collision');
const oldLock=sim.runway;destroyAirportAircraft(sim,collided);
assert.equal(collided.phase,'wrecked');assert.notEqual(sim.runway,collided.id);assert.notEqual(sim.taxiway,collided.id);
assert(oldLock===null||typeof oldLock==='string');
console.log('PASS AIRPORT_TRAFFIC '+JSON.stringify({aircraft:sim.aircraft.length,takeoffs,landings,smallestGap:Math.round(smallestGap*10)/10,maximumAltitudeStep:Math.round(maximumAltitudeStep*100)/100,completed:sim.aircraft.map(a=>a.completed)}));
