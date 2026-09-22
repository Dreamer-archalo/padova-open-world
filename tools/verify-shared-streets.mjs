import fs from 'node:fs';
import assert from 'node:assert/strict';
globalThis.window=globalThis;globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
// Load the SAME elevation modifiers as phase2-runtime, in the SAME order.
await import('../dist/phase4-terrain-fixes.js');
await import('../dist/historic-terrain-level.js');
await import('../dist/historic-plaza-alignment.js');
const {Terrain}=await import('../dist/terrain.js');const {applyCityData}=await import('../dist/districts.js');const {prepareGameplayMap}=await import('../dist/gameplay-areas.js');
const read=n=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+n+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);
console.time('terrain');const terrain=new Terrain(read('terrain'),map,{modern:true});console.timeEnd('terrain');
const report={segments:0,gradeFailures:0,maxGrade:0,overlaps:0,maxOverlapGap:0,shoulders:0,maxShoulderGap:0,waterBridges:0,minClearance:Infinity};const bad=[],gaps=[],wet=[];
for(const p of terrain.roads.profiles.values()){
 for(let i=1;i<p.points.length;i++){
  const [ax,az]=p.points[i-1],[bx,bz]=p.points[i],len=Math.hypot(bx-ax,bz-az);if(len<.01)continue;
  const a=terrain.roads.sample(p.road,ax,az),b=terrain.roads.sample(p.road,bx,bz),grade=Math.abs(a-b)/len;
  report.segments++;report.maxGrade=Math.max(report.maxGrade,grade);
  if(grade>.061){report.gradeFailures++;if(bad.length<30)bad.push({name:p.road.n,k:p.road.k,grade,x:ax,z:az,shared:terrain.roads.shared(p.road)});}
  if(i%4!==1)continue;
  const x=(ax+bx)/2,z=(az+bz)/2,h=terrain.roads.sample(p.road,x,z);
  if(terrain.roads.shared(p.road)){
   for(const q of terrain.roads.candidates(x,z))if(q.road!==p.road&&terrain.roads.shared(q.road)){report.overlaps++;report.maxOverlapGap=Math.max(report.maxOverlapGap,Math.abs(h-q.height));}
   if(terrain.waterDistance(x,z)>p.road.w/2+4){for(const side of [-1,1]){const d=p.road.w/2+1,xs=x-(bz-az)/len*d*side,zs=z+(bx-ax)/len*d*side;if(terrain.waterDistance(xs,zs)<2||terrain.prato(xs,zs)?.canal)continue;const deck=terrain.roads.sample(p.road,xs,zs),ground=terrain.groundHeight(xs,zs);if(Math.abs(deck-ground)>.001&&gaps.length<12)gaps.push({n:p.road.n,k:p.road.k,x:xs,z:zs,deck,ground,platform:!!terrain.platformAt(xs,zs),prato:terrain.prato(xs,zs)});report.shoulders++;report.maxShoulderGap=Math.max(report.maxShoulderGap,Math.abs(deck-ground));}}
  }
  if(p.road.crossing&&terrain.waterDistance(x,z)<0){if(h-terrain.waterHeight(x,z)<.45&&wet.length<12)wet.push({n:p.road.n,k:p.road.k,x,z,h,water:terrain.waterHeight(x,z),shared:terrain.roads.shared(p.road),raw:terrain.roads.rawSample(p.road,x,z),a:terrain.roads.nodes[p.ids[i-1]].h,b:terrain.roads.nodes[p.ids[i]].h});report.waterBridges++;report.minClearance=Math.min(report.minClearance,h-terrain.waterHeight(x,z));}
 }
}
const seams=[];
for(const p of terrain.roads.profiles.values())if(!terrain.roads.shared(p.road))for(const [endpoint,pos] of [[p.ids[0],p.points[0]],[p.ids.at(-1),p.points.at(-1)]]){
 const y=terrain.roads.sample(p.road,...pos);
 for(const q of terrain.roads.candidates(...pos))if(q.road!==p.road&&terrain.roads.shared(q.road)&&(q.segment.ia===endpoint||q.segment.ib===endpoint)&&q.d<.1&&Math.abs(q.height-y)>.15){if(seams.length<30)seams.push({name:p.road.n,k:p.road.k,other:q.road.n,x:pos[0],z:pos[1],delta:y-q.height});}
}
console.log('SEAMS '+JSON.stringify(seams));
assert.deepEqual(seams,[], 'Deck entrances must join the shared street without steps');
console.log(JSON.stringify({report,bad,gaps,wet},null,2));
assert(report.segments>100000);assert(report.overlaps>1000);assert.equal(report.maxOverlapGap,0);assert(report.maxShoulderGap<.01);assert.equal(report.gradeFailures,0);assert(report.minClearance>.45);
