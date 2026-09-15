import fs from 'node:fs';
const [{Terrain},{applyCityData},{prepareGameplayMap},{SHOULDER_FEATHER}]=await Promise.all([
  import('../dist/terrain.js'),import('../dist/districts.js'),import('../dist/gameplay-areas.js'),import('../dist/phase4-terrain-fixes.js')
]);
await import('../dist/terrain-level-calibration.js');
await import('../dist/road-surface-authority.js');
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);
const terrain=new Terrain(read('terrain'),map,{modern:true});
const excluded=/motorway|trunk|footway|path|cycleway|steps|pedestrian|tram/;
const structuralName=/cavalcavia|ponte|viadott|sovrappass/i;
const report={samples:0,violations:0,ordinary:0,independentLevel:0,bridgeFlag:0,layered:0,waterCorridor:0,structuralName:0,highDeck:0,dryOrdinary:0,maxTransition:0,maxGap:0,top:[]};
for(const profile of terrain.roads.profiles.values()){
 const road=profile.road;if(road.crossing||road.tunnel||excluded.test(road.k||''))continue;
 for(let i=1;i<profile.points.length;i++){
  const a=terrain.roads.nodes[profile.ids[i-1]],b=terrain.roads.nodes[profile.ids[i]],dx=profile.points[i][0]-profile.points[i-1][0],dz=profile.points[i][1]-profile.points[i-1][1],length=Math.hypot(dx,dz);if(length<.01)continue;
  const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,yaw=Math.atan2(dx,dz),nx=Math.cos(yaw),nz=-Math.sin(yaw),deck=terrain.roads.sample(road,mx,mz),natural=terrain.elevation(mx,mz);
  for(const side of [-1,1]){
   const near=road.w/2+1.25,far=road.w/2+Math.min(SHOULDER_FEATHER-.5,6.5),x1=mx+nx*near*side,z1=mz+nz*near*side,x2=mx+nx*far*side,z2=mz+nz*far*side;
   const waterD=Math.min(terrain.waterDistance(x1,z1),terrain.waterDistance(x2,z2));if(waterD<1.5)continue;
   const h1=terrain.groundHeight(x1,z1),h2=terrain.groundHeight(x2,z2),gap=Math.abs(h1-deck),transition=Math.abs(h2-h1);report.samples++;report.maxTransition=Math.max(report.maxTransition,transition);report.maxGap=Math.max(report.maxGap,gap);
   if(gap<=.55&&transition<=1.35)continue;
   report.violations++;const independent=!!road.b||Math.abs(Number(road.layer)||0)>0,waterCorridor=waterD<10.5,named=structuralName.test(road.n||''),highDeck=Math.abs(deck-natural)>1.8;
   if(independent)report.independentLevel++;else report.ordinary++;if(road.b)report.bridgeFlag++;if(Math.abs(Number(road.layer)||0)>0)report.layered++;if(waterCorridor)report.waterCorridor++;if(named)report.structuralName++;if(highDeck)report.highDeck++;if(!independent&&!waterCorridor&&!named&&!highDeck)report.dryOrdinary++;
   report.top.push({road:road.n||road.k,k:road.k,b:!!road.b,layer:Number(road.layer)||0,waterD:+waterD.toFixed(2),deckDelta:+(deck-natural).toFixed(3),gap:+gap.toFixed(3),transition:+transition.toFixed(3),x:+mx.toFixed(1),z:+mz.toFixed(1)});
  }
 }
}
report.top.sort((a,b)=>Math.max(b.transition,b.gap)-Math.max(a.transition,a.gap));report.top=report.top.slice(0,40);report.maxTransition=+report.maxTransition.toFixed(3);report.maxGap=+report.maxGap.toFixed(3);
console.log(JSON.stringify(report,null,2));
