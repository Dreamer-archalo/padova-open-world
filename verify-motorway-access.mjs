import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nearestOnSegment,SpatialIndex} from './dist/core.js';
import {capsuleIntervals,subtractIntervals} from './dist/guardrail-access.js';
import {CameraRig} from './dist/camera-rig.js';
import {footMotion} from './dist/foot-controller.js';
import {t} from './tools/controller-harness.mjs';

assert.deepEqual(subtractIntervals(24,capsuleIntervals([0,0],[24,0],[20,-20],[20,20],3)),[[0,17],[23,24]],'crossing at the rail end');
assert(subtractIntervals(24,capsuleIntervals([0,0],[24,0],[20,-2],[80,8],3))[0][1]<20,'shallow merging ramp');
// Reset after a teleport/respawn must clear the previous held steering cycle.
const rig=new CameraRig(),actor={yaw:0};footMotion(actor,rig,{forward:1,turn:1,run:false},2);rig.reset(-1);footMotion(actor,rig,{forward:1,turn:0,run:false},.1);assert.equal(actor.yaw,-1);

const rails=t.world.structures.filter(b=>['guardrail','median'].includes(b.kind)),index=new SpatialIndex(80),issues=[];
for(const profile of t.terrain.roads.profiles.values())for(let i=1;i<profile.road.p.length;i++){
 const a=profile.road.p[i-1],b=profile.road.p[i],pad=profile.road.w/2+2;index.add({a,b,road:profile.road},Math.min(a[0],b[0])-pad,Math.min(a[1],b[1])-pad,Math.max(a[0],b[0])+pad,Math.max(a[1],b[1])+pad);
}
let samples=0,nearAccess=0;
for(const rail of rails){
 for(let i=0;i<rail.p.length;i++){const a=rail.p[i],b=rail.p[(i+1)%rail.p.length],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3));
  for(let j=0;j<=n;j++){
   const x=a[0]+(b[0]-a[0])*j/n,z=a[1]+(b[1]-a[1])*j/n;samples++;
   for(const s of index.near(x,z,1)){
    if(s.road===rail.road&&rail.side===0)continue;
    const q=nearestOnSegment(x,z,s.a,s.b),distance=Math.hypot(x-q.x,z-q.z);if(distance>s.road.w/2+.025)continue;
    const h=t.terrain.roads.sample(s.road,q.x,q.z);if(Math.abs(h-t.terrain.roads.sample(rail.road,x,z))>2.1)continue;
    if(s.road!==rail.road)nearAccess++;
    if(issues.length<30)issues.push({road:rail.road.n,other:s.road.n,x,z,distance,width:s.road.w,side:rail.side});
   }
  }
 }
}
assert(rails.length>1000&&rails.length<20000,'bounded guardrail geometry');
const gaps=t.terrain.motorwayAudit.gaps;assert(gaps.length>8);for(let i=0;i<gaps.length;i++)for(let j=0;j<i;j++)assert(Math.hypot(gaps[i].x-gaps[j].x,gaps[i].z-gaps[j].z)>=849.9,'openings must be rare');
const report={barriers:rails.length,accessCuts:t.terrain.motorwayAudit.accessCuts,periodicOpenings:gaps.length,minimumSpacing:850,edgeSamples:samples,blockedAccessSamples:nearAccess,issues};
fs.writeFileSync('docs/motorway-access-results.json',JSON.stringify(report,null,2)+'\n');assert.equal(issues.length,0,JSON.stringify(issues));
console.log('PASS global guardrail/carriageway clearance, shallow ramps, junctions and periodic openings',report);
