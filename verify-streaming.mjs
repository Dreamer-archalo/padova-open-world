import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Worker} from 'node:worker_threads';
import {CityStream,streamingPlan,streamingSnapshot} from './dist/streaming.js';
import {hydrateTerrain} from './dist/streaming-worker.js';
import {PerformanceOverlay} from './dist/performance-overlay.js';
import {t} from './tools/controller-harness.mjs';

const report={scenarios:[],measurement:'Node controller + actual geometry worker; CPU timings, not GPU FPS'};
const snapshot=streamingSnapshot(t.terrain),copy=hydrateTerrain(structuredClone(snapshot));
for(const [x,z] of [[-2500,3000],[0,0],[1200,-600],[4000,0],[-2800,1200]]){
 assert.equal(copy.height(x,z),t.terrain.height(x,z));assert.equal(copy.waterHeight(x,z),t.terrain.waterHeight(x,z));
}
const doc={hidden:false};const overlay=new PerformanceOverlay(doc);assert.equal(doc.hidden,true);overlay.toggle();assert.equal(doc.hidden,false);overlay.toggle();assert.equal(doc.hidden,true);
const east=streamingPlan({x:0,z:0,speed:95,yaw:Math.PI/2},420);assert(east.keys.some(k=>k.x>600));assert(east.look>=380);
const aircraft=streamingPlan({x:0,z:0,speed:90,yaw:Math.PI/2,aircraft:true,altitude:250},420);assert(aircraft.look>east.look);assert(aircraft.keys.length<130);

const factory=()=>{const worker=new Worker(new URL('./tools/streaming-node-worker.mjs',import.meta.url));const adapter={postMessage:(m,t)=>worker.postMessage(m,t),terminate:()=>worker.terminate()};worker.on('message',data=>adapter.onmessage?.({data}));worker.on('error',error=>adapter.onerror?.(error));return adapter;};
t.world.setQuality('hyper');const begin=performance.now();const stream=new CityStream(t.world,{workerFactory:factory});t.world.streaming=stream;report.initialSnapshotMs=performance.now()-begin;
const delay=()=>new Promise(resolve=>setTimeout(resolve,8));
const cases=[
 ['teletrasporto',-250,-20,0,0,0,false],['auto massima velocità',2600,2900,75,1.2,0,false],
 ['Cinquecento Turbo',-2700,3600,97.22,1.5,0,false],['moto',1000,2800,72,2.5,0,false],
 ['elicottero',-2150,1080,65,-1,100,true],['aereo',3000,-2000,110,1.57,300,true],
 ['cambio rapido direzione',-270,-90,97,-1.57,0,false]
];
try{
 for(const [name,x,z,speed,yaw,altitude,aircraft] of cases){
  const start=performance.now(),p={x,z,speed,yaw,altitude,aircraft};let peakQueue=0,maxUpdate=0,ticks=0;
  do{const before=performance.now();stream.update(p,ticks===0);maxUpdate=Math.max(maxUpdate,performance.now()-before);peakQueue=Math.max(peakQueue,stream.metrics.queued);ticks++;await delay();
   assert(performance.now()-start<25000,name+' essential core timed out');
  }while(!stream.coreReady(x,z,80));
  assert.equal(stream.metrics.backend,'worker');
  assert(peakQueue<200,'bounded queue');
  const initialMs=performance.now()-start;
  // Fly/drive through the prediction corridor; reverse while an old job runs.
  for(let i=0;i<32;i++){const dt=.05;if(name==='cambio rapido direzione'&&i===8)p.yaw+=Math.PI;p.x+=Math.sin(p.yaw)*speed*dt;p.z+=Math.cos(p.yaw)*speed*dt;const b=performance.now();stream.update(p);maxUpdate=Math.max(maxUpdate,performance.now()-b);await delay();}
  report.scenarios.push({name,coreReadyMs:+initialMs.toFixed(1),maxUpdateMs:+maxUpdate.toFixed(1),peakQueue,loaded:t.world.loaded.size,prefetch:stream.metrics.prefetch});
  console.log(name,JSON.stringify(report.scenarios.at(-1)));
 }
 // A pinned destination loads even while the player remains in another area.
 stream.prefetch(1250,-500,80);const started=performance.now();
 while(!stream.coreReady(1250,-500,80)){stream.update({x:5000,z:1000,speed:0});await delay();assert(performance.now()-started<25000);}
 report.destinationPrefetchMs=performance.now()-started;
 // Give one dense tile the detail budget, then refresh its buildings while
 // keeping the old, complete terrain visible until replacement arrives.
 stream.pins=[];t.world.radius=1;const centre={x:160,z:160,speed:0},detailStart=performance.now();
 while(!t.world.loaded.get('0,0')?.userData.detailReady){stream.update(centre);await delay();assert(performance.now()-detailStart<25000,'detail timed out');}
 const detailed=t.world.loaded.get('0,0');assert(detailed.userData.coreReady);assert(detailed.userData.detail.children.length>0);
 const coreCount=detailed.userData.core.children.length;assert(coreCount>0);assert(!detailed.userData.core.children.some(o=>o.userData.streamBuildings||o.userData.streamRoads));
 stream.invalidate('0,0');assert.equal(detailed.userData.coreReady,false);assert.equal(detailed.userData.core.children.length,coreCount,'refresh retains visible terrain');
 const refreshStart=performance.now();while(!stream.coreReady(160,160,1)){stream.update(centre);await delay();assert(performance.now()-refreshStart<25000);}
 report.detailAndRefreshMs=performance.now()-detailStart;
 report.cancelledStaleJobs=stream.metrics.cancelled;assert(report.cancelledStaleJobs>0);
 // Strictly limit renderer thread upload/scheduling cost, with allowance for CI
 // scheduling noise. Worker geometry is allowed to take longer off-thread.
 assert(Math.max(...report.scenarios.map(s=>s.maxUpdateMs))<150,'main thread streaming stall');
 const key=[...t.world.loaded.keys()][0];assert(t.world.loaded.get(key).userData.coreReady);
}finally{stream.dispose();}
fs.writeFileSync('docs/streaming-results.json',JSON.stringify(report,null,2)+'\n');
console.log('PASS predictive streaming, terrain snapshot, cancellation, destination readiness, bounded queue, hidden F3 overlay');
