import fs from 'node:fs';
import {findLayout,roofClear} from '../dist/monoblocco-track.js';
const world=JSON.parse(fs.readFileSync(new URL('../dist/data/padova.json',import.meta.url)));
const b=world.buildings.find(q=>q.n==='Ospedale Civile - Monoblocco - Casse - Prenotazioni'),poly=b.p,xs=poly.map(p=>p[0]),zs=poly.map(p=>p[1]);Object.assign(b,{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)});
const layout=findLayout(poly,b),step=4,cells=new Map();
for(let i=0;b.minX+2+step*i<b.maxX-2;i++)for(let j=0;b.minZ+2+step*j<b.maxZ-2;j++){const x=b.minX+2+step*i,z=b.minZ+2+step*j;if(roofClear(poly,x,z,4.6))cells.set(i+','+j,{i,j,x,z});}
function clearLine(a,b){for(let i=0;i<=5;i++){const t=i/5;if(!roofClear(poly,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,3.5))return false;}return true;}
const remaining=new Set(cells.keys()),components=[];
while(remaining.size){const start=remaining.values().next().value,queue=[start];remaining.delete(start);for(let i=0;i<queue.length;i++){const p=cells.get(queue[i]);for(const [di,dj] of [[0,1],[0,-1],[1,0],[-1,0]]){const key=(p.i+di)+','+(p.j+dj),q=cells.get(key);if(q&&remaining.has(key)&&clearLine(p,q)){remaining.delete(key);queue.push(key);}}}
const group=queue.map(k=>cells.get(k)),nearest=p=>Math.min(...layout.points.map(q=>Math.hypot(q.x-p.x,q.z-p.z))),cx=group.reduce((s,p)=>s+p.x,0)/group.length,cz=group.reduce((s,p)=>s+p.z,0)/group.length;components.push({count:group.length,centre:[Math.round(cx),Math.round(cz)],bbox:[Math.min(...group.map(p=>p.x)),Math.max(...group.map(p=>p.x)),Math.min(...group.map(p=>p.z)),Math.max(...group.map(p=>p.z))],nearTrack:Math.round(nearest({x:cx,z:cz})),farthest:group.sort((a,b)=>nearest(b)-nearest(a)).slice(0,2).map(p=>[p.x,p.z,Math.round(nearest(p))])});}
components.sort((a,b)=>b.count-a.count);
console.log('ROOF_REGIONS',JSON.stringify({components:components.length,totalCells:cells.size,regions:components.slice(0,20),trackMeters:Math.round(layout.total),roofCoverage:layout.roofCoverage}));
