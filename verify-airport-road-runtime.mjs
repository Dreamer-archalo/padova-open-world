import assert from 'node:assert/strict';
import {t} from './tools/controller-harness.mjs';
import {VEHICLES} from './dist/vehicles.js';
import {vehicleBlocked} from './dist/movement.js';
import {AIRPORT_GATE} from './dist/gameplay-areas.js';

const roads=t.world.data.gameplay.roads.filter(r=>r.airportRoad);
assert.equal(roads.length,13,'all new airport facility roads loaded into actual world');
const segments=t.graph.segments.filter(s=>s.road.airportRoad);
assert(segments.length>roads.length,'airport road graph must contain each route segment');
const city=t.graph.segments.filter(s=>s.connected&&!s.road.gameplay).flatMap(s=>[t.graph.nodes[s.a],t.graph.nodes[s.b]].map(n=>({road:s.road.n,kind:s.road.k,x:n.x,z:n.z,d:Math.hypot(n.x-AIRPORT_GATE.x,n.z-AIRPORT_GATE.z)}))).sort((a,b)=>a.d-b.d).slice(0,4);
const access=t.graph.segments.filter(s=>s.road.n==='Ingresso aeroporto');
console.log('Airport city connection diagnostics',JSON.stringify({airportConnected:segments.filter(s=>s.connected).length,airportTotal:segments.length,cityAccess:access.map(s=>({connected:s.connected,from:t.graph.nodes[s.a],to:t.graph.nodes[s.b]})),nearestConnectedCity:city}));
assert(segments.every(s=>s.connected),'airport roads must connect to the primary Padova road graph, not an isolated island');
let samples=0,maxGrade=0;
for(const r of roads){
 let last=null;
 for(let i=1;i<r.p.length;i++){
  const a=r.p[i-1],b=r.p[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  assert(length>.1,'airport road has a degenerate segment: '+r.n);
  const yaw=Math.atan2(b[0]-a[0],b[1]-a[1]),count=Math.ceil(length);
  for(let j=0;j<=count;j++){
   const u=j/count,x=a[0]+(b[0]-a[0])*u,z=a[1]+(b[1]-a[1])*u,y=t.terrain.height(x,z);
   assert(Number.isFinite(y),'invalid airport road elevation on '+r.n);
   assert(t.terrain.dry(x,z,1,y),'airport road submerged: '+r.n);
   assert(!vehicleBlocked(x,z,yaw,t.world.collision,VEHICLES.mito,y),'real vehicle/building collision: '+r.n+' at '+JSON.stringify({x,z}));
   if(last)maxGrade=Math.max(maxGrade,Math.abs(y-last.y)/Math.max(.01,Math.hypot(x-last.x,z-last.z)));
   last={x,z,y};samples++;
  }
 }
}
assert(maxGrade<.15,'dangerous vertical step on airport road: '+maxGrade);
console.log(`PASS actual airport streets: ${roads.length} roads, ${segments.length} connected graph segments, ${samples} live terrain/collision samples, max grade ${maxGrade.toFixed(4)}`);
