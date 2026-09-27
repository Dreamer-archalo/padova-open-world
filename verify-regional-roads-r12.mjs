import assert from 'node:assert/strict';
import fs from 'node:fs';
import {smoothRegionalRoadProfile,regionalChunkCuts,regionalGrade} from './dist/regional-road-profile.js';
import {RegionalWorld} from './dist/regional-world.js';
const near=(a,b,tol=1e-5)=>assert(Math.abs(a-b)<=tol, a+' != '+b);
const sampleTerrain=(x,z)=>2.5+Math.sin(x/41)*1.25+Math.cos(x/115)*1.3+
  .0027*x+Math.sin(z/80)*.3;
const allKinds=['motorway','trunk','primary','secondary','tertiary','residential'];
for(const kind of allKinds){
 const points=[[0,0],[180,10],[320,22],[450,47],[620,45]];
 const profile=smoothRegionalRoadProfile(points,sampleTerrain,kind);
 near(profile.sample(0),sampleTerrain(...points[0]));
 near(profile.sample(1),sampleTerrain(...points.at(-1)));
 for(let i=1;i<profile.samples.length;i++){
  const a=profile.samples[i-1],b=profile.samples[i],grade=Math.abs(b.y-a.y)/(b.s-a.s);
  assert(grade<=profile.grade+.0002,
    kind+' changes height too steeply: '+grade+' > '+profile.grade);
 }
 for(let i=0;i<=1200;i++)assert(Number.isFinite(profile.sample(i/1200)));
}
assert(regionalGrade('motorway')<regionalGrade('residential'));
assert(regionalGrade('primary')<regionalGrade('tertiary'));

// A single continuous original OSM way must not disappear at ANY 320m tile
// boundary. Tiny corner sections and negative coordinates are supported.
for(const [a,b] of [
 [[7523,-723],[9344,384]],[[8000,100],[9600,100]],
 [[-100,-1600],[950,-600]],[[7791,-20],[7811,955]]
]){
 const cuts=regionalChunkCuts(a,b,320,42);
 near(cuts[0],0);near(cuts.at(-1),1);assert(cuts.length>3);
 for(let i=1;i<cuts.length;i++){
  const t=cuts[i-1],u=cuts[i],
   p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],
   q=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u],
   len=Math.hypot(p[0]-q[0],p[1]-q[1]);
  assert(len<=42+1e-4);
  // Endpoints exactly on chunk borders count as valid edges.
  for(let axis=0;axis<2;axis++){
   const lo=Math.min(p[axis],q[axis]),hi=Math.max(p[axis],q[axis]);
   assert(Math.floor((lo+1e-5)/320)===Math.floor((hi-1e-5)/320)||
    Math.abs(lo-hi)<1e-5,'regional segment illegally crosses chunk boundary');
  }
 }
}

const fixture={
 roads:[
  {k:'motorway',w:11,oneway:true,p:[[7640,95],[8950,95]]},
  {k:'trunk',w:9,p:[[8000,165],[8600,165]]},
  {k:'primary',w:7,p:[[8440,240],[8570,240]]},
  {k:'secondary',w:7,p:[[8505,200],[8505,320]]},
  {k:'residential',w:5,p:[[8480,280],[8530,280]]},
  {k:'footway',w:2,p:[[8010,93],[8170,93]]},
  {k:'motorway',w:10,b:true,p:[[8650,220],[8960,220]]}
 ],buildings:[],areas:[],water:[],shorelines:[]
};
const grid={x0:7280,z0:-200,width:15,height:8,step:180,heights:[]};
for(let j=0;j<grid.height;j++)for(let i=0;i<grid.width;i++)
 grid.heights.push(sampleTerrain(grid.x0+i*grid.step,grid.z0+j*grid.step));
const scene={children:[],add(o){this.children.push(o)},remove(o){
 this.children.splice(this.children.indexOf(o),1);
}},collision={added:[],add(...a){this.added.push(a)}};
const world=new RegionalWorld(scene,fixture,grid,collision);
const highway=fixture.roads[0],prof=world.roadProfiles.get(highway);
assert(prof&&prof.length>1300);
const segments=[...world.chunks.values()].flatMap(c=>c.roads)
 .filter(p=>p.k==='motorway'&&!p.bri&&p.a[1]===95)
 .sort((a,b)=>a.a[0]-b.a[0]);
assert(segments.length>=31,'A 1.31 km motorway must be divided into continuous short spans');
for(let i=0;i<segments.length;i++){
 const p=segments[i],len=Math.hypot(p.b[0]-p.a[0],p.b[1]-p.a[1]);
 assert(len<=42.001,'highway segments require precise contact profiles');
 if(i){near(segments[i-1].b[0],p.a[0]);near(segments[i-1].yB,p.yA,1e-6);}
 const middle=(p.a[0]+p.b[0])*.5,t=(middle-7640)/(8950-7640);
 near((p.yA+p.yB)/2,prof.sample(t),.11);
 near(world.nearestRoad(middle,95,3)?.y,(p.yA+p.yB)/2,1e-6);
 near(world.nearestRoad(middle,95,3)?.y,prof.sample(t),.11);
 near(world.height(middle,95,prof.sample(t)),prof.sample(t)+.065,.027);
}
const onRoad=world.nearestRoad(8100,95,7);
assert(onRoad?.road.k==='motorway','mainline selection must find drivable artery');
const edge=world.height(8100,95+onRoad.road.w/2+.9,onRoad.y),
 outside=world.height(8100,95+onRoad.road.w/2+2.9,onRoad.y);
assert(Number.isFinite(edge)&&Number.isFinite(outside));
assert(Math.abs(edge-outside)<.7,
 'Motorway shoulder must gently join the ground rather than form an invisible step');
const bridge=fixture.roads.at(-1);
const begin=world.roadY(bridge,8650,220,0),
 crest=world.roadY(bridge,8805,220,.5),
 end=world.roadY(bridge,8960,220,1);
assert(crest>Math.max(begin,end)+2.1,'Elevated bridges retain real height and boat clearance');
near(begin,world.raw(8650,220)+.14);near(end,world.raw(8960,220)+.14);

world.focus={x:8090,z:95};world.quality='medium';
const chunkKey=Math.floor(8090/320)+','+Math.floor(95/320);
world.build(chunkKey);
const group=world.visible.get(chunkKey);assert(group,'Highway chunk must stream');
const color=c=>group.children.filter(o=>o.material?.color?.getHexString()===c);
for(const [hex,feature] of [
 ['4b595f','motorway asphalt'],['9b9d94','shoulder'],
 ['7e8b79','real terrain-bonded embankment'],
 ['b8c0bd','longitudinal crash barrier'],['dddacf','stable dashed lane markings']
])assert(color(hex).length>0,'Missing motorway feature: '+feature);
const src=fs.readFileSync('dist/regional-world.js','utf8'),
 padova=fs.readFileSync('dist/modern-roads.js','utf8');
assert(src.includes('this.junctions.set(')&&src.includes('cappedJunctions'),
 'Only true same-level town junctions must receive capped asphalt fans');
assert(src.includes('this.roadProfiles?.get(road)?.sample(t)'),
 'Visual asphalt must use same height profile as vehicle collision');
assert(padova.includes('buildModernRoads(batch,segments,terrain)'),
 'Padova road renderer must remain intact');
console.log('PASS R12: long intermunicipal motorway has no tile gaps, bounded grade and same visual/physical height; shoulders, terrain foundations, guardrails, proper dash paint and bridge clearance intact.');
