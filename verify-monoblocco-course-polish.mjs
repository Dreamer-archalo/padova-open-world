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
const old=[.13,.43,.73,.29,.87].map(t=>onTrack(layout,t));
const ramps=chooseExtraRamps(b.p,layout,old,5);
assert(ramps.length>=2,'Two or more genuinely safe additional ramps must fit on the actual roof');
for(const [i,p] of ramps.entries()){
 assert(roofClear(b.p,p.x,p.z,3),'Extra ramp must remain clear of roof edge');
 assert(Math.hypot(p.x-layout.helipad.x,p.z-layout.helipad.z)>=19,'Extra ramp must not invade helipad');
 for(const q of [...old,...ramps.slice(i+1)])assert(Math.hypot(p.x-q.x,p.z-q.z)>=17,'Ramps must not overlap');
 const s=Math.sin(p.yaw),c=Math.cos(p.yaw);
 for(let d=-4;d<=19;d+=1.5)for(const side of [-1,0,1])assert(roofClear(b.p,p.x+s*d+c*side*1.45,p.z+c*d-s*side*1.45,1.8),'Approach or jump landing must not go over the parapet');
}
const bridges=findGapBridges(b.p,layout);
assert(bridges.length<=2,'Keep suspension crossings limited and purposeful');
for(const bridge of bridges){
 assert(pointInside(bridge.a.x,bridge.a.z,b.p)&&pointInside(bridge.b.x,bridge.b.z,b.p),'Both bridge ends require real roof support');
 let gap=0;
 for(let k=1;k<30;k++)if(!pointInside(bridge.a.x+(bridge.b.x-bridge.a.x)*k/30,bridge.a.z+(bridge.b.z-bridge.a.z)*k/30,b.p))gap++;
 assert(gap>=4,'Do not label an ordinary plank laid on the roof as a gap bridge');
}
const upgrade=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8');
const polish=fs.readFileSync(new URL('./dist/monoblocco-course-polish.js',import.meta.url),'utf8');
assert(upgrade.includes("import './monoblocco-course-polish.js';"),'The upgrade must actually load in game');
assert(polish.includes('phase3RoofUpgrade')&&polish.includes('monobloccoRoofCleaned'),'Clean both the city roof geometry and the pitched upgrade without touching global city geometry');
assert(polish.includes('terrain.arcadeRamps.push')&&polish.includes('realGapBridge:true'),'Jump ramps and actual gap bridges must participate in vehicle physics');
console.log('PASS Monoblocco polish:',ramps.length,'additional safe ramps;',bridges.length,'actual-gap bridge candidates; original course preserved.');
