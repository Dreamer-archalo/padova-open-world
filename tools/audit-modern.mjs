import {modernFootprints} from '../dist/modern-map.js';
import fs from 'node:fs';
import {Terrain} from '../dist/terrain.js';
import {applyCityData} from '../dist/districts.js';
import {roadStructures} from '../dist/road-structures.js';
import {SpatialIndex} from '../dist/core.js';
import {vehicleBlocked,vehicleFootprint,polygonsOverlap} from '../dist/movement.js';
import {VEHICLES} from '../dist/vehicles.js';
export function auditModern(data,terrain,collision){
 let maxGrade=0,maxDelta=0,samples=0;const faults=[],bridges=[];
 for(const p of terrain.roads.profiles.values()){
  if(!['primary','secondary','tertiary','residential','unclassified','service','motorway','trunk','living_street','motorway_link','trunk_link','primary_link','secondary_link','tertiary_link'].includes(p.road.k))continue;
  let bridgeSamples=0,blocked=0,wet=0,maxStep=0,previousHeight=null,previousGround=null,lastGrade=null;
  for(let i=1;i<p.points.length;i++){
   const a=p.points[i-1],b=p.points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<.01)continue;
   const n=Math.ceil(len),yaw=Math.atan2(b[0]-a[0],b[1]-a[1]),s={ia:p.ids[i-1],ib:p.ids[i],a,b,profile:p,i:i-1};let h0=terrain.roads.segmentHeight(s,0);
   for(let j=1;j<=n;j++){
    const x=a[0]+(b[0]-a[0])*j/n,z=a[1]+(b[1]-a[1])*j/n,h=terrain.roads.segmentHeight(s,j/n),grade=(h-h0)/(len/n);maxGrade=Math.max(maxGrade,Math.abs(grade));if(lastGrade!==null)maxDelta=Math.max(maxDelta,Math.abs(grade-lastGrade));lastGrade=grade;h0=h;samples++;
    if(Math.abs(grade)>.086)faults.push({kind:'grade',road:p.id,x,z,grade});
    if(p.road.crossing){
     bridgeSamples++;const ground=terrain.height(x,z,previousGround??h+.05),step=previousGround===null?0:Math.abs(ground-previousGround);maxStep=Math.max(maxStep,step);previousGround=ground;
     if(terrain.waterAt(x,z,0,ground)!==null){wet++;if(wet===1)faults.push({kind:'water',road:p.id,x,z});}
     if(collision&&vehicleBlocked(x,z,yaw,collision,VEHICLES.mito,h+.05)){blocked++;if(blocked===1)faults.push({kind:'collision',road:p.id,name:p.road.n,x,z,h,obstacles:[...collision.near(x,z,5)].filter(o=>polygonsOverlap(vehicleFootprint(x,z,yaw,2,4.08),o.p)&&h+.05+1.46>o.minY&&h+.05<o.minY+o.h).map(o=>({kind:o.kind,name:o.n,road:o.road?.n,minY:o.minY,h:o.h,driveTopMin:o.driveTopMin}))});}
     if(step>.25&&previousHeight!==null)faults.push({kind:'surfaceJump',road:p.id,x,z,step});previousHeight=h;
    }
   }
  }
  if(bridgeSamples)bridges.push({id:p.id,name:p.road.n||p.road.k,kind:p.road.k,width:p.road.w,samples:bridgeSamples,blocked,wet,maxStep});
 }
 return {samples,maxGrade,maxGradeChangePerSample:maxDelta,bridgeCount:bridges.length,bridges,faults};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const read=n=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+n,import.meta.url))),data=read('padova.json');applyCityData(data,read('city.json'));const terrain=new Terrain(read('terrain.json'),data,{modern:true}),collision=new SpatialIndex(60);
 data.buildings=modernFootprints(data.buildings,terrain);
 for(const b of data.buildings){const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]);Object.assign(b,{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)});b.minY=terrain.elevation((b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2);collision.add(b,b.minX,b.minZ,b.maxX,b.maxZ);}
 for(const b of roadStructures(terrain))collision.add(b,b.minX,b.minZ,b.maxX,b.maxZ);
 const report=auditModern(data,terrain,collision);fs.writeFileSync(new URL('../docs/modern-road-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,bridges:report.bridges.filter(b=>b.blocked||b.wet||b.maxStep>.25),faults:report.faults.slice(0,30)},null,2));
 if(report.faults.length)process.exitCode=1;
}
