import fs from 'node:fs';
import assert from 'node:assert/strict';

globalThis.window=globalThis;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};

const [{Terrain},{applyCityData},{prepareGameplayMap},{LEVEL_PATCHES,SHOULDER_FEATHER}]=await Promise.all([
 import('./dist/terrain.js'),import('./dist/districts.js'),import('./dist/gameplay-areas.js'),import('./dist/phase4-terrain-fixes.js')
]);
await import('./dist/terrain-level-calibration.js');
const read=name=>JSON.parse(fs.readFileSync(new URL('./dist/data/'+name+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);
const terrain=new Terrain(read('terrain'),map,{modern:true});

const report={roadSegments:0,maxRoadGrade:0,gradeViolations:0,shoulderSamples:0,maxNearShoulderGap:0,shoulderViolations:0,bridgeSamples:0,bridgeViolations:0,flatZones:{},finiteSamples:0};
const badGrades=[],badShoulders=[],badBridges=[],flatViolations=[];
const excluded=/motorway|trunk|footway|path|cycleway|steps|pedestrian|tram/;

for(const profile of terrain.roads.profiles.values()){
 for(let i=1;i<profile.points.length;i++){
  const a=terrain.roads.nodes[profile.ids[i-1]],b=terrain.roads.nodes[profile.ids[i]],dx=profile.points[i][0]-profile.points[i-1][0],dz=profile.points[i][1]-profile.points[i-1][1],length=Math.hypot(dx,dz);if(length<.01)continue;
  const grade=Math.abs(b.h-a.h)/length;report.roadSegments++;report.maxRoadGrade=Math.max(report.maxRoadGrade,grade);
  const limit=profile.road.k==='steps'?.66:.061;if(grade>limit){report.gradeViolations++;if(badGrades.length<20)badGrades.push({road:profile.road.n||profile.road.k,grade:+grade.toFixed(4),x:+((a.x+b.x)/2).toFixed(1),z:+((a.z+b.z)/2).toFixed(1)});}
  if(profile.road.crossing||profile.road.tunnel||excluded.test(profile.road.k||''))continue;
  const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,yaw=Math.atan2(dx,dz),nx=Math.cos(yaw),nz=-Math.sin(yaw),deck=terrain.roads.sample(profile.road,mx,mz);
  for(const side of [-1,1]){
   const near=profile.road.w/2+1.25,far=profile.road.w/2+Math.min(SHOULDER_FEATHER-.5,6.5),x1=mx+nx*near*side,z1=mz+nz*near*side,x2=mx+nx*far*side,z2=mz+nz*far*side;
   if(terrain.waterDistance(x1,z1)<1.5||terrain.waterDistance(x2,z2)<1.5)continue;
   const h1=terrain.groundHeight(x1,z1),h2=terrain.groundHeight(x2,z2),gap=Math.abs(h1-deck),transition=Math.abs(h2-h1);report.shoulderSamples++;report.maxNearShoulderGap=Math.max(report.maxNearShoulderGap,gap);
   if(gap>.55||transition>1.35){report.shoulderViolations++;if(badShoulders.length<20)badShoulders.push({road:profile.road.n||profile.road.k,gap:+gap.toFixed(3),transition:+transition.toFixed(3),x:+mx.toFixed(1),z:+mz.toFixed(1)});}
  }
 }
}

for(const profile of terrain.roads.profiles.values())if(profile.road.crossing){
 for(let i=1;i<profile.points.length;i++){
  const x=(profile.points[i-1][0]+profile.points[i][0])/2,z=(profile.points[i-1][1]+profile.points[i][1])/2;if(terrain.waterDistance(x,z)>=0)continue;
  const deck=terrain.roads.sample(profile.road,x,z),water=terrain.waterHeight(x,z),clearance=deck-water;report.bridgeSamples++;
  if(clearance<.45||terrain.waterAt(x,z,0,deck)!==null){report.bridgeViolations++;if(badBridges.length<20)badBridges.push({road:profile.road.n||profile.road.k,clearance:+clearance.toFixed(3),x:+x.toFixed(1),z:+z.toFixed(1)});}
 }
}

for(const patch of LEVEL_PATCHES){
 let min=Infinity,max=-Infinity,count=0;for(let ix=-2;ix<=2;ix++)for(let iz=-2;iz<=2;iz++){
  const lx=ix*patch.rx*.13,lz=iz*patch.rz*.13,c=Math.cos(patch.yaw||0),s=Math.sin(patch.yaw||0),x=patch.p.x+c*lx+s*lz,z=patch.p.z-s*lx+c*lz,h=terrain.elevation(x,z);assert(Number.isFinite(h));min=Math.min(min,h);max=Math.max(max,h);count++;report.finiteSamples++;
 }
 const variation=max-min;report.flatZones[patch.id]={samples:count,variation:+variation.toFixed(3)};if(variation>=.35)flatViolations.push({id:patch.id,name:patch.name,variation:+variation.toFixed(3)});
}

assert.equal(flatViolations.length,0,'level-plane core discontinuities: '+JSON.stringify(flatViolations));
assert(report.roadSegments>10000,'map-wide road coverage too small');
assert.equal(report.gradeViolations,0,'road grade discontinuities: '+JSON.stringify(badGrades));
assert.equal(report.shoulderViolations,0,'road/terrain shoulder discontinuities: '+JSON.stringify(badShoulders));
assert.equal(report.bridgeViolations,0,'bridge/water discontinuities: '+JSON.stringify(badBridges));
report.maxRoadGrade=+report.maxRoadGrade.toFixed(4);report.maxNearShoulderGap=+report.maxNearShoulderGap.toFixed(3);report.ok=true;
fs.writeFileSync(new URL('./docs/elevation-harmony-audit.json',import.meta.url),JSON.stringify({...report,badGrades,badShoulders,badBridges,flatViolations},null,2)+'\n');
console.log(JSON.stringify(report,null,2));
