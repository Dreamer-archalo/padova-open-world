import fs from 'node:fs';
import {pointInside} from '../dist/core.js';
import {findLayout,onTrack,roofClear} from '../dist/monoblocco-track.js';
const map=JSON.parse(fs.readFileSync(new URL('../dist/data/padova.json',import.meta.url)));
const b=map.buildings.find(o=>o.n==='Ospedale Civile - Monoblocco - Casse - Prenotazioni');
if(!b)throw Error('Monoblocco missing');const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]);Object.assign(b,{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)});
const route=findLayout(b.p,b);if(!route)throw Error('Roof circuit missing');
const n=route.points.length,candidates=[];
for(let i=0;i<n;i+=3)for(let j=i+9;j<n;j+=3){const a=route.points[i],q=route.points[j],arc=route.lengths[j]-route.lengths[i],chord=Math.hypot(q.x-a.x,q.z-a.z);if(arc<35||arc>95||chord<8||chord>30||!roofClear(b.p,a.x,a.z,3.5)||!roofClear(b.p,q.x,q.z,3.5))continue;
let outside=0,contiguous=0,current=0;for(let k=1;k<16;k++){const t=k/16,x=a.x+(q.x-a.x)*t,z=a.z+(q.z-a.z)*t,isOutside=!pointInside(x,z,b.p);if(isOutside){outside++;current++;contiguous=Math.max(contiguous,current);}else current=0;}
if(outside<3||contiguous<3)continue;let heli=true;for(let k=0;k<=16;k++){const t=k/16,x=a.x+(q.x-a.x)*t,z=a.z+(q.z-a.z)*t;if(Math.hypot(x-route.helipad.x,z-route.helipad.z)<16.5){heli=false;break;}}if(!heli)continue;
const heading=Math.atan2(q.x-a.x,q.z-a.z),incoming=Math.atan2(a.x-route.points[(i-1+n)%n].x,a.z-route.points[(i-1+n)%n].z),outgoing=Math.atan2(route.points[(j+1)%n].x-q.x,route.points[(j+1)%n].z-q.z),difference=(v)=>Math.abs(Math.atan2(Math.sin(v-heading),Math.cos(v-heading)));
const score=outside*2+Math.min(arc-chord,45)-chord*.2-difference(incoming)*9-difference(outgoing)*9;
candidates.push({i,j,arc:+arc.toFixed(1),chord:+chord.toFixed(1),outside,contiguous,heading:+heading.toFixed(3),approach:+difference(incoming).toFixed(2),depart:+difference(outgoing).toFixed(2),score:+score.toFixed(1),a:[+a.x.toFixed(1),+a.z.toFixed(1)],b:[+q.x.toFixed(1),+q.z.toFixed(1)]});
}
candidates.sort((a,b)=>b.score-a.score);
console.log('MONOBLOCCO_CONNECTOR_DIAGNOSTIC',JSON.stringify({track:Math.round(route.total),candidates:candidates.length,top:candidates.slice(0,8)},null,2));
