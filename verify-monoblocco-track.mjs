import fs from 'node:fs';
import assert from 'node:assert/strict';
import {findLayout,onTrack,roofClear} from './dist/monoblocco-track.js';
const map=JSON.parse(fs.readFileSync(new URL('./dist/data/padova.json',import.meta.url)));
const b=map.buildings.find(b=>b.n==='Ospedale Civile - Monoblocco - Casse - Prenotazioni');
assert(b,'Monoblocco missing');const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]);Object.assign(b,{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)});
const layout=findLayout(b.p,b);
assert(layout,'track graph did not find a route and independent safe heli pad');
const samples=Array.from({length:720},(_,i)=>onTrack(layout,i/720));
for(let i=0;i<samples.length;i++){const p=samples[i];assert(roofClear(b.p,p.x,p.z,2.2),`off-roof sample ${i}`);assert(Math.hypot(p.x-layout.helipad.x,p.z-layout.helipad.z)>14.5,'track overlaps helipad');}
assert(roofClear(b.p,layout.helipad.x,layout.helipad.z,16),'helipad perimeter/lighting spills outside roof');
assert(layout.total>500,'Extended trial must be considerably longer than original 458 m');
const rx=samples.map(p=>p.x),rz=samples.map(p=>p.z);let bends=0;for(let i=1;i<samples.length;i++){let delta=Math.abs(samples[i].yaw-samples[i-1].yaw);delta=Math.min(delta,Math.PI*2-delta);if(delta>.14)bends++;}
const coverage={polygonBBox:[b.minX,b.maxX,b.minZ,b.maxZ],trackBBox:[Math.min(...rx),Math.max(...rx),Math.min(...rz),Math.max(...rz)],fraction:layout.roofCoverage,bends};
console.log('TRACK_CANDIDATE',JSON.stringify({points:layout.points.length,metres:layout.total,helipad:layout.helipad,centre:layout.centerline.length,...coverage,sample:layout.points.filter((_,i)=>i%Math.max(1,Math.floor(layout.points.length/12))===0)}));
assert(bends>=12,'Keep meaningful curves, not a single straight rooftop shuttle');
console.log('PASS expanded real-map circuit, 720 roof-safe samples, bends, independent helipad');
