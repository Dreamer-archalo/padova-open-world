import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyCityData} from './dist/districts.js';
import {AIRPORT,AIRPORT_GATE,areaLocal,areaPoint,prepareGameplayMap,gameplayStructures} from './dist/gameplay-areas.js';
import {AIRPORT_ROAD_LAYOUT} from './dist/airport-road-network.js';

// Exercise the integrated map, including the real Mandria relocation.
const read=n=>JSON.parse(fs.readFileSync(new URL('./dist/data/'+n+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));
prepareGameplayMap(map);
const access=map.gameplay.roads.find(r=>r.n==='Ingresso aeroporto');
const roads=map.gameplay.roads.filter(r=>r.airportRoad);
assert(access,'main gate must connect to existing city roads');
assert.equal(roads.length,AIRPORT_ROAD_LAYOUT.length,'all intended airport routes are in the actual map');
assert(map.gameplay.airportRoadIntegration.connected,'airport entry must remain connected to the real city graph');
const key=p=>p.map(v=>v.toFixed(5)).join(',');
const graph=new Map();
function edge(a,b){const x=key(a),y=key(b);if(!graph.has(x))graph.set(x,new Set());if(!graph.has(y))graph.set(y,new Set());graph.get(x).add(y);graph.get(y).add(x);}
for(const r of [access,...roads])for(let i=1;i<r.p.length;i++)edge(r.p[i-1],r.p[i]);
const entry=key([AIRPORT_GATE.x,AIRPORT_GATE.z]),seen=new Set([entry]),queue=[entry];
while(queue.length){const p=queue.shift();for(const n of graph.get(p)||[])if(!seen.has(n)){seen.add(n);queue.push(n);}}
assert.equal(seen.size,graph.size,'every airport road must join the same driveable graph from the city gate');

const facilityNames=['Terminal e parcheggi','sosta breve','Eliporto civile','Hangar civili','Hangar civile nord','Hangar civile sud','Area militare','Hangar militare nord','Hangar militare sud','Officina e deposito','Carburante','Servizi sud'];
for(const name of facilityNames)assert(roads.some(r=>r.n.includes(name)),`missing facility route ${name}`);
// Exclude only elevated roof beams; all ground-level solid boxes remain checked.
const terrain={modern:true,gameplayPatches:[{height:0}],elevation:()=>0,groundHeight:()=>0};
const solids=gameplayStructures(terrain).filter(b=>b.solid&&b.minY<2.5&&b.p.every(p=>{const q=areaLocal(AIRPORT,...p);return q.u>=AIRPORT.minU-1&&q.u<=AIRPORT.maxU+1&&q.v>=AIRPORT.minV-1&&q.v<=AIRPORT.maxV+1;})).map(b=>{
 const corners=b.p.map(p=>areaLocal(AIRPORT,...p));return {minU:Math.min(...corners.map(p=>p.u)),maxU:Math.max(...corners.map(p=>p.u)),minV:Math.min(...corners.map(p=>p.v)),maxV:Math.max(...corners.map(p=>p.v))};
});
let samples=0;
for(const r of roads){
 for(let i=1;i<r.p.length;i++){
  const a=areaLocal(AIRPORT,...r.p[i-1]),b=areaLocal(AIRPORT,...r.p[i]),distance=Math.hypot(b.u-a.u,b.v-a.v);
  for(let s=0;s<=Math.ceil(distance*2);s++){
   const t=s/Math.max(1,Math.ceil(distance*2)),u=a.u+(b.u-a.u)*t,v=a.v+(b.v-a.v)*t;
   assert(u>=130,'road cars must not overlap the runway or aircraft taxiway');
   assert(u<AIRPORT.maxU&&v>AIRPORT.minV&&v<AIRPORT.maxV,'route must remain inside airport fence');
   for(const ob of solids)assert(u<ob.minU-2.1||u>ob.maxU+2.1||v<ob.minV-2.1||v>ob.maxV+2.1,`obstacle on ${r.n} at (${u.toFixed(1)},${v.toFixed(1)})`);
   samples++;
  }
 }
}
console.log(`PASS airport mobility: ${roads.length} connected facility roads, ${samples} ground-clearance samples; separate from runway and taxiway`);
