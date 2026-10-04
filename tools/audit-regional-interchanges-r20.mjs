import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {SpatialIndex} from '../dist/core.js';
import {RegionalWorld} from '../dist/regional-world.js';
import {PADOVA_EAST} from '../dist/unified-regions.js';
import {findGradeCrossings} from '../dist/road-grade-crossings.js';

const source=new URL('../dist/data/',import.meta.url),mapFile=new URL('region-padova-venice.json',source);
if(!fs.existsSync(mapFile)){
 console.log('Regional geometry unavailable locally; the preview workflow downloads it before this audit.');
}else{
 const read=n=>JSON.parse(fs.readFileSync(new URL(n,source))),map=read('region-padova-venice.json'),terrain=read('world-terrain.json');
 const world=new RegionalWorld(new THREE.Scene(),map,terrain,new SpatialIndex(80));
 const t=(road,segment,x,z)=>{
  let used=0,total=world.roadLengths.get(road)||1;
  for(let i=1;i<segment;i++)used+=Math.hypot(road.p[i][0]-road.p[i-1][0],road.p[i][1]-road.p[i-1][1]);
  const a=road.p[segment-1],b=road.p[segment],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  return Math.max(0,Math.min(1,(used+Math.max(0,Math.min(length,((x-a[0])*dx+(z-a[1])*dz)/Math.max(.001,length))))/total));
 };
 const crossings=findGradeCrossings(map.roads||[]).filter(c=>c.x>PADOVA_EAST&&c.x<40500&&c.z>-13500&&c.z<10000).map(c=>{
  const y=world.roadY(c.upper,c.x,c.z,t(c.upper,c.upperSegment,c.x,c.z)),lower=world.roadY(c.lower,c.x,c.z,t(c.lower,c.lowerSegment,c.x,c.z));
  return {x:+c.x.toFixed(1),z:+c.z.toFixed(1),upper:c.upper.n||c.upper.k,lower:c.lower.n||c.lower.k,
   explicitBridge:!!(c.upper.b||c.upper.bridge),clearance:+(y-lower).toFixed(2)};
 });
 const report={scope:'Streamed regional roads east of Padova',targetClearance:5.4,
  summary:{candidateCrossings:crossings.length,below5_2m:crossings.filter(c=>c.clearance<5.2).length},crossings};
 fs.writeFileSync(new URL('../docs/regional-interchange-audit-r20.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log('Regional interchange audit',report.summary);
}
