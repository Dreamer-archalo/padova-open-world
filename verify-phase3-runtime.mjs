import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const runtime=read('./dist/phase3-runtime.js');
const roofs=read('./dist/roof-upgrades.js');
const bridge=read('./dist/phase2-runtime.js');

assert.ok(bridge.includes("./roof-upgrades.js"),'roof upgrades are not wired');
assert.ok(bridge.includes("./phase3-runtime.js"),'Phase 3 runtime is not wired');
assert.ok(runtime.includes("padova-bike-records-v1"),'motorcycle records must persist locally');
for(const id of ['euganeo','zona-est','arcella','sud'])assert.ok(runtime.includes("id:'"+id+"'"),'missing motorcycle course: '+id);
assert.ok(runtime.includes('phase3-bike-ramp')&&runtime.includes('terrain.arcadeRamps'),'motorcycle challenge must use physical ramp support');
assert.ok(runtime.includes('PERCORSO OSTACOLI MOTO'),'J activity entry missing');
assert.ok(runtime.includes("'fulmine':'zenit'")||runtime.includes("?'fulmine':'zenit'"),'rare fast NPC racer styles missing');
assert.ok(runtime.includes('max:42')||runtime.includes('{max:42'),'street racer speed budget missing');
assert.ok(runtime.includes('expiresAt')&&runtime.includes('nextRacerAt'),'street racers must be rare and time-limited');

assert.ok(roofs.includes("stage==='detail'"),'pitched roofs must stay out of core streaming');
assert.ok(roofs.includes('!this.profile?.simple'),'Iper Performance must skip extra pitched roofs');
assert.ok(roofs.includes('function gable')&&roofs.includes('function hipped'),'expected varied gable/hipped roof profiles');
assert.ok(roofs.includes("zone==='industrial'")&&roofs.includes('industrial||a<18'),'industrial/oversized roofs must keep a cheap fallback');

console.log(JSON.stringify({courses:4,localRecords:true,physicalRamps:true,rareStreetRacers:true,roofProfiles:['gable','hipped'],hyperPerformanceProtected:true},null,2));
