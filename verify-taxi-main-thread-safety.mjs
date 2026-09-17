import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TaxiDispatcher} from './dist/TaxiDispatcher.js';
import {TaxiMenuController} from './dist/TaxiMenuController.js';
import {VEHICLES} from './dist/vehicles.js';

// A congested location must not trigger the old 30 synchronous A* routes.
let roads=0,routes=0;
const fake={nearestRoad:p=>{roads++;return {x:p.x,z:p.z,y:10,yaw:0};},route:(a,b)=>{routes++;return [{x:a.x,z:a.z},{x:b.x,z:b.z}];}};
const dispatcher=new TaxiDispatcher({graph:{},terrain:{dry:()=>true},collision:{},taxiSpec:VEHICLES.taxi,vehicleBlocked:()=>false,pathfinder:fake});
const plan=dispatcher.planDispatch({x:0,z:0,yaw:0});
assert(plan&&plan.path.length===2,'first safe connected route must produce a real pickup');
assert(routes<=10,'dispatch must not rank thirty costly pathfinding routes');
assert(roads<=13,'dispatch must bound road probes as well as route probes');

// The post-arrival code calls roadNear / route in nested loops. Four pairs is
// the maximum allowed on the main thread during one taxi-transit transaction.
globalThis.document={body:{classList:{contains:name=>name==='taxi-transit'}}};
for(let i=0;i<24;i++){
 const road=dispatcher.roadNear({x:i,z:0},180);
 if(road)dispatcher.route(road,{x:100,z:0});
}
assert.equal(roads<=17,true,'at most four extra post-arrival road searches');
assert.equal(routes<=14,true,'at most four extra post-arrival A* routes');
delete globalThis.document;
assert(dispatcher.roadNear({x:2,z:2}), 'search budget must reset outside transit');

// The real confirmation controller used to close the dialog and immediately
// resume rendering, world streaming and traffic while teleporting.
await import('./dist/taxi-confirmation-runtime.js');
const source=fs.readFileSync(new URL('./dist/taxi-confirmation-runtime.js',import.meta.url),'utf8');
assert.match(source,/closeAllTaxiUI\?\.\(\);[\s\S]*?showFastFadeOverlay\?\.\(\);[\s\S]*?setPaused\?\.\(true\)/,'confirmed transfer must freeze the 3D world after closing the dialog');
assert.match(source,/finally\s*\{[\s\S]*?setPaused\?\.\(false\)/,'transfer must unpause even on error');
assert.equal(typeof TaxiMenuController.prototype.executeConfirmedTransition,'function');
console.log('PASS taxi synchronous routing budget, bounded departure, reset and paused transfer');
