import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pointInside} from './dist/core.js';
import {findLayout,onTrack,roofClear} from './dist/monoblocco-track.js';
import {chooseExtraRamps,findGapBridges} from './dist/monoblocco-course-polish.js';
const map=JSON.parse(fs.readFileSync(new URL('./dist/data/padova.json',import.meta.url)));
const b=map.buildings.find(v=>v.n==='Ospedale Civile - Monoblocco - Casse - Prenotazioni');
assert(b?.p?.length>=15,'Require the exact Monoblocco polygon');
const xs=b.p.map(q=>q[0]),zs=b.p.map(q=>q[1]);
Object.assign(b,{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)});
const layout=findLayout(b.p,b);assert(layout,'The original motorcycle loop must remain valid');
const original=[.13,.43,.73,.29,.87].map(t=>onTrack(layout,t));
const onlyJumpRamps=original.slice(0,3);
const bridges=findGapBridges(b.p,layout,2,onlyJumpRamps);
assert(bridges.length>=1&&bridges.length<=2,'At least one real roof gap must have two suitable bridge entrances');
for(const bridge of bridges){
 assert(pointInside(bridge.a.x,bridge.a.z,b.p)&&pointInside(bridge.b.x,bridge.b.z,b.p),'Both ends must meet real supported roof');
 let gap=0;for(let k=1;k<30;k++)if(!pointInside(bridge.a.x+(bridge.b.x-bridge.a.x)*k/30,bridge.a.z+(bridge.b.z-bridge.a.z)*k/30,b.p))gap++;
 assert(gap>=4,'Do not count planks resting on a roof as a gap bridge');
 for(const r of onlyJumpRamps)for(const end of [bridge.a,bridge.b])assert(Math.hypot(r.x-end.x,r.z-end.z)>=7.5,'Original ramp cannot collide with bridge entrance');
}
const avoid=bridges.flatMap(p=>[p.a,p.b]),ramps=chooseExtraRamps(b.p,layout,original,5,avoid);
assert(ramps.length>=2,'At least two additional safe jump ramps must fit around bridge reservations');
for(const [i,p] of ramps.entries()){
 assert(roofClear(b.p,p.x,p.z,3),'Jump ramp must be clear of parapet');
 assert(Math.hypot(p.x-layout.helipad.x,p.z-layout.helipad.z)>=19,'Jump ramp must not invade helipad');
 for(const q of [...original,...ramps.slice(i+1),...avoid])assert(Math.hypot(p.x-q.x,p.z-q.z)>=16.9,'Jumps and bridge approaches cannot overlap');
 const s=Math.sin(p.yaw),c=Math.cos(p.yaw);
 for(let d=-4;d<=19;d+=1.5)for(const side of [-1,0,1])assert(roofClear(b.p,p.x+s*d+c*side*1.45,p.z+c*d-s*side*1.45,1.8),'Jump run-up or landing must stay on roof');
}
const upgrade=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8'),polish=fs.readFileSync(new URL('./dist/monoblocco-course-polish.js',import.meta.url),'utf8'),elevated=fs.readFileSync(new URL('./dist/monoblocco-raised-bridges.js',import.meta.url),'utf8');
assert(upgrade.includes("import './monoblocco-course-polish.js';")&&upgrade.includes("import './monoblocco-raised-bridges.js';"),'Both planner and real bridge renderer must load');
assert(polish.includes('phase3RoofUpgrade')&&polish.includes('monobloccoRoofCleaned'),'Clean both roof sources locally');
assert(polish.includes('bridgeReservations')&&polish.includes('terrain.arcadeRamps.push'),'Bridge access must be reserved before creating new ramps');
assert(elevated.includes('realGapBridge:true')&&elevated.includes('realGapBridgeApproach:true'),'Span AND both access ramps require physical contact');
console.log('PASS Monoblocco course plan:',bridges.length,'reserved real gaps;',ramps.length,'safe additional ramps; helipad and original loop retained.');
