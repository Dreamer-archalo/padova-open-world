import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game=fs.readFileSync('dist/game.js','utf8');
const fare=fs.readFileSync('dist/taxi-affordability.js','utf8');
assert.doesNotMatch(fare,/Fondi insufficienti/,'taxi confirmation must not be blocked by balance');
assert.doesNotMatch(fare,/stopImmediatePropagation/,'fare helper must not swallow the confirmation click');
assert.match(fare,/if\(button\.disabled\)button\.disabled=false;/,'fare helper must re-enable a stale disabled confirm button');
assert.match(game,/e\.code==='KeyX'/,'X should close paused taxi menu');
assert.match(game,/async function preloadTaxiDestination\(arrival,destination\)/,'taxi destination preloader missing');
assert.match(game,/world\.prefetch\(arrival\.x,arrival\.z,560\)/,'taxi must prefetch the destination');
assert.match(game,/world\.coreReady\(arrival\.x,arrival\.z,180\)/,'taxi must wait for destination road\/collision core');
assert.match(game,/await preloadTaxiDestination\(arrival,destination\);/,'taxi travel must preload before teleport');
const from=game.indexOf('function dispatchPhysicalTaxi(){'),to=game.indexOf('\nfunction updateTaxi(dt){',from);
assert(from>=0&&to>from,'dispatch function missing');
const source=game.slice(from,to);
function scenario(phase,metres){
 const messages=[],calls=[];
 const state={started:true,mode:'foot',x:metres,z:0,elapsed:50,waypoint:null,route:[]};
 const car={x:0,z:0,y:0,yaw:0,speed:0,health:100,parked:true,mesh:{visible:true}};
 const taxi={car,phase,driver:{visible:true},target:{x:0,z:0},path:[],blocked:0};
 const plan={spawn:{x:metres+42,z:0,y:0,yaw:0},target:{x:metres+6,z:0,y:0,yaw:0},path:[{x:metres+42,z:0},{x:metres+6,z:0}]};
 const scope={
  state,taxi,taxiDispatcher:{planDispatch:()=>{calls.push('dispatch');return plan;}},
  dist:(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),
  toast:t=>messages.push(t),
  taxiDriverNPC:{hide:()=>calls.push('hide')},
  setTaxiHazards:()=>{},placeTaxiDriver:()=>calls.push('place-driver'),
  routeTo:()=>{},poseVehicle:()=>{},previousActors:{delete:()=>{}},
  taxiDestinationFailure:e=>{throw e},createTaxiDriver:()=>({visible:false}),addCar:()=>car
 };
 const dispatch=vm.runInNewContext(`(${source})`,scope);
 dispatch();
 return {taxi,state,calls,messages};
}
for(const phase of ['ready','arriving']){
 const {taxi,state,calls}=scenario(phase,1900);
 assert.equal(taxi.phase,'arriving',`${phase}: stale cab must redispatch`);
 assert.equal(taxi.car.x,1942,`${phase}: pickup must be near new player position`);
 assert.equal(state.waypoint.x,1906,`${phase}: target marker must not point to old taxi`);
 assert.deepEqual(calls.includes('dispatch'),true,`${phase}: dispatcher must run`);
}
const near=scenario('ready',20);
assert.equal(near.taxi.phase,'ready');
assert.equal(near.calls.includes('dispatch'),false,'nearby cab must be reused');
assert.equal(near.state.waypoint.x,0);
console.log('PASS: stale taxi redispatch, zero-balance confirm enabled, destination prefetch wiring, X key and nearby reuse');
