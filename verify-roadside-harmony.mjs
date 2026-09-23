import assert from 'node:assert/strict';
import {roadsideHarmony,EMBANKMENT_REACH} from './dist/roadside-harmony.js';
import {Terrain} from './dist/terrain.js';
const first={k:'residential',w:6},second={k:'secondary',w:6},flyover={k:'primary',w:10,crossing:true},footway={k:'footway',w:3};
const candidates=(x,z,reach)=>{assert.equal(reach,EMBANKMENT_REACH);return [
 {road:first,d:Math.abs(x),height:10},
 {road:second,d:Math.abs(x-16),height:15},
 {road:flyover,d:Math.abs(x-8),height:28}
].filter(s=>s.d<=s.road.w/2+reach);};
const terrain={modern:true,roads:{candidates}};
let maxJump=0,previous=null;
for(let x=-20;x<=36;x+=.25){const y=roadsideHarmony(terrain,x,0,12);assert(Number.isFinite(y));if(previous!==null)maxJump=Math.max(maxJump,Math.abs(y-previous));previous=y;}
assert(maxJump<.45,'Artificial ground cliff at a nearest-road ownership transition: '+maxJump);
assert(Math.abs(roadsideHarmony(terrain,0,0,12)-9.95)<.5,'Street embankment no longer meets its asphalt');
assert(Math.abs(roadsideHarmony(terrain,16,0,12)-14.95)<.5,'Second street embankment no longer meets its asphalt');
assert.equal(roadsideHarmony({modern:true,roads:{candidates:()=>[{road:flyover,height:28,d:0}]}},0,0,12),12,'Flyover must not drag the ground up to its deck');
const separated={modern:true,roads:{candidates:()=>[{road:first,d:1,height:10},{road:footway,d:0,height:24}]}};
assert.equal(roadsideHarmony(separated,0,0,12),9.95,'An upper footway must not create a wall across the lower carriageway');
const isolated={modern:true,roads:{candidates:()=>[{road:footway,d:0,height:14}]}};
assert.equal(roadsideHarmony(isolated,0,0,12),13.95,'An isolated ordinary walkway still needs supporting ground');
const unmarked={modern:true,roads:{candidates:()=>[{road:first,d:0,height:10},{road:second,d:0,height:23}]}};
assert(Math.abs(roadsideHarmony(unmarked,0,0,10)-9.95)<.5,'The lower road must retain grounded support even if an upper carriageway was not tagged as a bridge');

// Exercise the actual modern Terrain API: the phase-four nearest-road override
// must not replace the continuous solver between the centre and outer shoulder.
const grid={version:1,width:2,height:2,step:200,x0:-100,z0:-100,heights:[12,12,12,12],waterPlane:[0,0,0]};
const map={roads:[{k:'residential',w:6,p:[[-20,0],[36,0]]},{k:'tram',w:3,p:[[-20,3],[36,3]]}],areas:[],water:[]};
const world=new Terrain(grid,map,{modern:true});
assert(Object.hasOwn(world,'groundHeight'),'Modern map must install one continuous ground solver');
let maxActualJump=0,last=null;
for(let x=-20;x<=36;x+=.25){const y=world.groundHeight(x,0);assert(Number.isFinite(y));if(last!==null)maxActualJump=Math.max(maxActualJump,Math.abs(y-last));last=y;assert(Math.abs(y-world.roads.sample(map.roads[0],x,0))<.001,'Road and visible support must share one datum');assert.equal(world.roads.sample(map.roads[0],x,1),world.roads.sample(map.roads[1],x,1),'Tram and asphalt must coincide');}
assert(maxActualJump<.45,'Actual terrain has a cliff at the edge of the road: '+maxActualJump);
const historical=new Terrain(grid,map,{modern:false});assert(!Object.hasOwn(historical,'groundHeight'),'Keep historical terrain independent');
console.log('PASS continuous modern ground, overlapping levels, pedestrian separation and historical terrain; max 0.25 m-step '+maxActualJump.toFixed(3)+' m.');
