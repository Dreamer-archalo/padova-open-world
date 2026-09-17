import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeRoadGraph,nearestOnSegment,dist,roadRoute} from '../dist/core.js';
import {AIRPORT,AIRPORT_GATE,areaPoint,areaLocal,prepareGameplayMap} from '../dist/gameplay-areas.js';
import {findTaxiRoad} from '../dist/taxi-service.js';
import {vehicleBlocked} from '../dist/movement.js';
import {VEHICLES} from '../dist/vehicles.js';
import * as THREE from '../dist/vendor/three.module.js';
globalThis.window=globalThis;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};
await import('../dist/phase4-terrain-fixes.js');await import('../dist/historic-terrain-level.js');await import('../dist/historic-plaza-alignment.js');
const [{Terrain},{CityWorld}]=await Promise.all([import('../dist/terrain.js'),import('../dist/world.js')]);
const read=n=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+n+'.json',import.meta.url)));
const map=read('padova');prepareGameplayMap(map);
const entrance=map.gameplay.roads.find(r=>r.n==='Ingresso aeroporto');assert(entrance);
const integrated=!!map.gameplay.airportConnectorPreview;
const entry=areaPoint(AIRPORT,228,250),old=entrance.p[0];
const g=makeRoadGraph(map.roads,{separateLevels:true});
// Exclude the already-connected airport entrance itself: once integrated it
// would be the nearest candidate to its own point, not an independent city road.
const candidates=g.segments.filter(s=>s.road!==entrance&&s.connected&&!s.road.b&&!s.road.tunnel&&!s.road.crossing&&!Number(s.road.layer)&&!['private','no'].includes(s.road.access)&&['secondary','tertiary','residential','unclassified','service','primary'].includes(s.road.k)).map(s=>{
 const a=g.nodes[s.a],b=g.nodes[s.b],p=nearestOnSegment(entry.x,entry.z,[a.x,a.z],[b.x,b.z]);return {s,p,d:dist(entry,p)};
}).filter(c=>c.d<40&&areaLocal(AIRPORT,c.p.x,c.p.z).u>220).sort((a,b)=>a.d-b.d);
assert(candidates.length,'No nearby connected at-grade road candidate');
const chosen=candidates[0],road=chosen.s.road,p=chosen.p;
console.log('CANDIDATE',JSON.stringify({integrated,road:road.n,roadKind:road.k,access:road.access,bridge:road.b,layer:road.layer,point:p,distanceToApproach:chosen.d,entryPoint:entry,original:old},null,2));
const a=g.nodes[chosen.s.a],b=g.nodes[chosen.s.b];let index=-1;
for(let i=1;i<road.p.length;i++)if(Math.hypot(road.p[i-1][0]-a.x,road.p[i-1][1]-a.z)<.11&&Math.hypot(road.p[i][0]-b.x,road.p[i][1]-b.z)<.11){index=i;break;}
assert(index>0,'Could not identify exact city road segment for topology check');
if(!integrated){
 // Source remains untouched for the reversible baseline; split only in memory.
 if(dist(a,p)>.11&&dist(b,p)>.11)road.p.splice(index,0,[p.x,p.z]);
 entrance.p[0]=[p.x,p.z];
}else{
 // A real draft integration must have precisely the projected junction, with
 // an actual city-road graph vertex (not merely two polylines that touch).
 assert(dist({x:entrance.p[0][0],z:entrance.p[0][1]},p)<.11,'Committed draft airport road does not meet candidate road');
 assert(dist(a,p)<.11||dist(b,p)<.11,'Committed candidate city segment lacks a junction vertex');
}
const joined=makeRoadGraph(map.roads,{separateLevels:true});
const parts=joined.segments.filter(s=>s.road===entrance);assert(parts.length===2&&parts.every(s=>s.connected),'Airport entry is not connected');
const route=roadRoute({x:a.x,z:a.z},AIRPORT_GATE,joined,{maxMs:2000,maxSteps:100000});assert(route.length>=3,'Cannot route from city road to airport');
const t=new Terrain(read('terrain'),map,{modern:true});
const world=new CityWorld(new THREE.Scene(),map,t,'hyper');
const taxi=findTaxiRoad(AIRPORT_GATE,joined,{roads:{sample:()=>0},height:()=>0},{maxMs:500,maxCandidates:8000});assert(taxi?.segment?.road===entrance,'Taxi still picks non-entrance road');
const check=(from,to,name)=>{
 const len=Math.hypot(to[0]-from[0],to[1]-from[1]),yaw=Math.atan2(to[0]-from[0],to[1]-from[1]);let prev=null,maxGrade=0,maxRoadGroundGap=0;
 for(let d=0;d<=len;d+=.5){const q=Math.min(1,d/len),x=from[0]+(to[0]-from[0])*q,z=from[1]+(to[1]-from[1])*q,y=t.roads.sample(entrance,x,z),support=t.height(x,z),ground=t.groundHeight(x,z);
  assert([y,support,ground].every(Number.isFinite),'Bad height on '+name);
  assert(t.dry(x,z,1,y),'Water on '+name+' at '+d);
  assert(!vehicleBlocked(x,z,yaw,world.collision,VEHICLES.mito,y),'Building/fence collision on '+name+' at '+d);
  if(prev!==null)maxGrade=Math.max(maxGrade,Math.abs(y-prev)/.5);prev=y;
  maxRoadGroundGap=Math.max(maxRoadGroundGap,Math.abs(y-ground));
 }
 console.log('SEGMENT_CHECK',JSON.stringify({name,length:len,maxGrade,maxRoadGroundGap}));
 assert(maxGrade<.065,'Unacceptable slope '+name);
 assert(maxRoadGroundGap<.55,'Road floats above/digs into ground '+name);
};
check(entrance.p[0],entrance.p[1],'public outer approach');
check(entrance.p[1],entrance.p[2],'public gate passage');
console.log(`PASS ${integrated?'integrated draft':'reversible candidate'} connection topology, taxi, collision, water and grade. Requires actual rendered/cartographic map validation before main merge.`);
