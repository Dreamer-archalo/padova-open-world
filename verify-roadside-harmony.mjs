import assert from 'node:assert/strict';
import {roadsideHarmony,EMBANKMENT_REACH} from './dist/roadside-harmony.js';
const first={k:'residential',w:6},second={k:'secondary',w:6},flyover={k:'primary',w:10,crossing:true};
const terrain={modern:true,roads:{candidates(x,z,reach){assert.equal(reach,EMBANKMENT_REACH);return [
 {road:first,d:Math.abs(x),height:10},
 {road:second,d:Math.abs(x-16),height:15},
 {road:flyover,d:Math.abs(x-8),height:28}
 ].filter(s=>s.d<=s.road.w/2+reach);}}};
let maxJump=0,previous=null;
for(let x=-20;x<=36;x+=.25){const y=roadsideHarmony(terrain,x,0,12);assert(Number.isFinite(y));if(previous!==null)maxJump=Math.max(maxJump,Math.abs(y-previous));previous=y;}
assert(maxJump<.45,'Artificial ground cliff at a nearest-road ownership transition: '+maxJump);
assert(Math.abs(roadsideHarmony(terrain,0,0,12)-9.95)<.5,'Street embankment no longer meets its asphalt');
assert(Math.abs(roadsideHarmony(terrain,16,0,12)-14.95)<.5,'Second street embankment no longer meets its asphalt');
assert.equal(roadsideHarmony({modern:true,roads:{candidates:()=>[{road:flyover,height:28,d:0}]}},0,0,12),12,'Flyover must not drag the ground up to its deck');
console.log('PASS multi-road terrain is continuous and grade-separated flyover cannot lift lower ground; max 0.25 m-step '+maxJump.toFixed(3)+' m.');
