import fs from 'node:fs';
import {pointInside,nearestOnSegment} from '../dist/core.js';
const map=JSON.parse(fs.readFileSync(new URL('../dist/data/padova.json',import.meta.url))),b=map.buildings.find(b=>b.n==='Ospedale Civile - Monoblocco - Casse - Prenotazioni');
if(!b)throw new Error('missing real hospital');
const poly=b.p,xs=poly.map(p=>p[0]),zs=poly.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
const clearance=(x,z)=>Math.min(...poly.map((p,i)=>{const q=nearestOnSegment(x,z,p,poly[(i+1)%poly.length]);return Math.hypot(x-q.x,z-q.z);}));
const groups=[2,4,6,8,10,12,14,16,18,22].map(m=>{const safe=[];for(let x=minX+3;x<maxX;x+=5)for(let z=minZ+3;z<maxZ;z+=5)if(pointInside(x,z,poly)&&clearance(x,z)>=m)safe.push([x,z]);return {margin:m,count:safe.length,samples:safe.slice(0,5).map(q=>q.map(Math.round))};});
const ellipse=(x,z,rx,rz,margin)=>Array.from({length:48},(_,i)=>{const t=i/48*2*Math.PI,px=x+Math.cos(t)*rx,pz=z+Math.sin(t)*rz;return pointInside(px,pz,poly)&&clearance(px,pz)>=margin;}).every(Boolean);
const candidates=[];for(let x=minX+15;x<maxX-15;x+=7)for(let z=minZ+15;z<maxZ-15;z+=7)if(pointInside(x,z,poly)&&clearance(x,z)>=8)for(const rx of [65,50,40,30,22,15,10])for(const rz of [50,38,28,20,15,10,7]){if(x-rx<minX||x+rx>maxX||z-rz<minZ||z+rz>maxZ||!ellipse(x,z,rx,rz,3))continue;candidates.push({x:Math.round(x),z:Math.round(z),rx,rz,area:rx*rz});}
candidates.sort((a,b)=>b.area-a.area);
console.log('MONOBLOCCO_DIAGNOSTICS',JSON.stringify({vertexCount:poly.length,bounds:{minX,maxX,minZ,maxZ},groups,ellipses:candidates.length,largestEllipses:candidates.slice(0,10),polygon:poly.map(p=>p.map(q=>Math.round(q)))},null,2));
