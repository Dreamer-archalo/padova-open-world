import assert from 'node:assert/strict';
globalThis.window=globalThis;
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
await import('../dist/phase4-terrain-fixes.js');
const {t}=await import('./controller-harness.mjs');
import {groundVehicleStep,groundContact} from '../dist/vehicle-dynamics.js';
import {VEHICLES} from '../dist/vehicles.js';
const ramps=t.terrain.earthAccess||[];console.log('EARTH_ACCESS_SITES '+JSON.stringify({ramps,audit:t.terrain.earthAccessAudit}));
assert(ramps.length>0,'Map needs at least one validated earth access');
const results=[];
for(const r of ramps)for(const reverse of [false,true]){
 const at=reverse?r.length+4:-4,yaw=r.yaw+(reverse?Math.PI:0),s={x:r.x+Math.sin(r.yaw)*at,z:r.z+Math.cos(r.yaw)*at,y:0,yaw,speed:8},car={spec:VEHICLES.mito};
 s.y=groundContact(t.terrain,s.x,s.z).y;let hits=0,launches=0;
 for(let i=0;i<Math.ceil((r.length+8)/8*60);i++){
  const m=groundVehicleStep(s,car,{turn:0,handbrake:false},1/60,t.terrain,t.world.collision);hits+=Number(m.hitSpeed>0);launches+=Number(m.launched);
 }
 const end=reverse?-4:r.length+4,distance=Math.hypot(s.x-(r.x+Math.sin(r.yaw)*end),s.z-(r.z+Math.cos(r.yaw)*end));
 results.push({name:r.name,reverse,hits,launches,distance});
 console.log('EARTH_ACCESS_DRIVE '+JSON.stringify(results.at(-1)));
 assert.equal(hits,0,'Earth access collision '+JSON.stringify(results.at(-1)));assert.equal(launches,0,'Slow access must stay grounded');assert(distance<.3,'Vehicle must complete the access');
}
console.log('PASS earth approaches driven in both directions '+JSON.stringify(results));
