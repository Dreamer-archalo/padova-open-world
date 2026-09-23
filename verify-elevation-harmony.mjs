import fs from 'node:fs';
import assert from 'node:assert/strict';

globalThis.window=globalThis;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};

const [{Terrain},{applyCityData},{prepareGameplayMap},{LEVEL_PATCHES,SHOULDER_FEATHER}]=await Promise.all([
 import('./dist/terrain.js'),import('./dist/districts.js'),import('./dist/gameplay-areas.js'),import('./dist/phase4-terrain-fixes.js')
]);
await import('./dist/historic-terrain-level.js');
await import('./dist/historic-plaza-alignment.js');
const read=name=>JSON.parse(fs.readFileSync(new URL('./dist/data/'+name+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);
const terrain=new Terrain(read('terrain'),map,{modern:true});

const report={roadSegments:0,maxRoadGrade:0,gradeViolations:0,shoulderSamples:0,maxNearShoulderGap:0,maxTransverseChange:0,nearGapViolations:0,transverseViolations:0,shoulderViolations:0,bridgeSamples:0,bridgeViolations:0,flatZones:{},finiteSamples:0};
const badGrades=[],badShoulders=[],badBridges=[],worstRoads=new Map();
const excluded=/motorway|trunk|footway|path|cycleway|steps|pedestrian|tram/;

for(const profile of terrain.roads.profiles.values()){
 for(let i=1;i<profile.points.length;i++){
  const a=terrain.roads.nodes[profile.ids[i-1]],b=terrain.roads.nodes[profile.ids[i]],dx=profile.points[i][0]-profile.points[i-1][0],dz=profile.points[i][1]-profile.points[i-1][1],length=Math.hypot(dx,dz);if(length<.01)continue;
  const grade=Math.abs(terrain.roads.sample(profile.road,b.x,b.z)-terrain.roads.sample(profile.road,a.x,a.z))/length;report.roadSegments++;report.maxRoadGrade=Math.max(report.maxRoadGrade,grade);
  const limit=profile.road.k==='steps'?.66:.061;if(grade>limit){report.gradeViolations++;if(badGrades.length<20)badGrades.push({road:profile.road.n||profile.road.k,grade:+grade.toFixed(4),x:+((a.x+b.x)/2).toFixed(1),z:+((a.z+b.z)/2).toFixed(1)});}
  if(profile.road.crossing||profile.road.tunnel||excluded.test(profile.road.k||''))continue;
  const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,yaw=Math.atan2(dx,dz),nx=Math.cos(yaw),nz=-Math.sin(yaw),deck=terrain.roads.sample(profile.road,mx,mz);
  for(const side of [-1,1]){
   const near=profile.road.w/2+1.25,far=profile.road.w/2+Math.min(SHOULDER_FEATHER-.5,6.5),x1=mx+nx*near*side,z1=mz+nz*near*side,x2=mx+nx*far*side,z2=mz+nz*far*side;
   if(terrain.waterDistance(x1,z1)<1.5||terrain.waterDistance(x2,z2)<1.5||terrain.prato(x1,z1)?.canal&&terrain.waterAt(x1,z1)!==null||terrain.prato(x2,z2)?.canal&&terrain.waterAt(x2,z2)!==null)continue;
   const h1=terrain.groundHeight(x1,z1),h2=terrain.groundHeight(x2,z2),gap=Math.abs(h1-deck),transition=Math.abs(h2-h1);report.shoulderSamples++;report.maxNearShoulderGap=Math.max(report.maxNearShoulderGap,gap);report.maxTransverseChange=Math.max(report.maxTransverseChange,transition);
   if(gap>.55)report.nearGapViolations++;
   if(transition>1.35)report.transverseViolations++;
   if(gap>.55||transition>1.35){
    report.shoulderViolations++;
    const road=profile.road.n||profile.road.k,entry=worstRoads.get(road)||{road,count:0,maxGap:0,maxTransition:0};entry.count++;entry.maxGap=Math.max(entry.maxGap,gap);entry.maxTransition=Math.max(entry.maxTransition,transition);worstRoads.set(road,entry);
    if(badShoulders.length<20){const owner=terrain.roads.at(x2,z2,null,SHOULDER_FEATHER);badShoulders.push({road,gap:+gap.toFixed(3),transition:+transition.toFixed(3),x:+mx.toFixed(1),z:+mz.toFixed(1),deck:+deck.toFixed(3),nearGround:+h1.toFixed(3),farGround:+h2.toFixed(3),farOwner:owner?.road.n||owner?.road.k||null,farOwnerY:owner?+owner.height.toFixed(3):null});}
   }
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
 const variation=max-min;report.flatZones[patch.id]={samples:count,variation:+variation.toFixed(3)};assert(variation<.35,patch.name+' core variation '+variation.toFixed(3)+' m');
}

const leaders=[...worstRoads.values()].sort((a,b)=>b.count-a.count).slice(0,20).map(r=>({...r,maxGap:+r.maxGap.toFixed(3),maxTransition:+r.maxTransition.toFixed(3)}));
console.log('ELEVATION_DIAGNOSTIC '+JSON.stringify({report,leaders,examples:badShoulders}));
assert(report.roadSegments>10000,'map-wide road coverage too small');
assert.equal(report.gradeViolations,0,'road grade discontinuities: '+JSON.stringify(badGrades));
assert.equal(report.shoulderViolations,0,'road/terrain shoulder discontinuities: '+JSON.stringify(badShoulders));
assert.equal(report.bridgeViolations,0,'bridge/water discontinuities: '+JSON.stringify(badBridges));
report.maxRoadGrade=+report.maxRoadGrade.toFixed(4);report.maxNearShoulderGap=+report.maxNearShoulderGap.toFixed(3);report.ok=true;
fs.writeFileSync(new URL('./docs/elevation-harmony-audit.json',import.meta.url),JSON.stringify({...report,badGrades,badShoulders,badBridges},null,2)+'\n');
console.log(JSON.stringify(report,null,2));
