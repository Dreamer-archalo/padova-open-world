import fs from 'node:fs';
import assert from 'node:assert/strict';
import {findLayout,onTrack,roofClear} from './dist/monoblocco-track.js';
const map=JSON.parse(fs.readFileSync(new URL('./dist/data/padova.json',import.meta.url)));
const b=map.buildings.find(b=>b.n==='Ospedale Civile - Monoblocco - Casse - Prenotazioni');
assert(b,'Monoblocco missing');const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]);Object.assign(b,{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)});
const layout=findLayout(b.p,b);
console.log('TRACK_CANDIDATE',JSON.stringify(layout?{points:layout.points.length,metres:layout.total,helipad:layout.helipad,centre:layout.centerline.length,sample:layout.points.filter((_,i)=>i%Math.max(1,Math.floor(layout.points.length/12))===0)}:{found:false}));
assert(layout,'track graph did not find a route and independent safe heli pad');
for(let i=0;i<720;i++){const p=onTrack(layout,i/720);assert(roofClear(b.p,p.x,p.z,2.2),`off-roof sample ${i}`);assert(Math.hypot(p.x-layout.helipad.x,p.z-layout.helipad.z)>14.5,'track overlaps helipad');}
assert(roofClear(b.p,layout.helipad.x,layout.helipad.z,16),'helipad perimeter/lighting spills outside roof');
console.log('PASS real-map candidate loop, 720 samples, independent helipad');