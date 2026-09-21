import fs from 'node:fs';
import {project} from '../dist/core.js';
import {applyCityData} from '../dist/districts.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+n+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));
const hint=project(45.403920,11.887309);
const candidates=map.buildings.map(b=>{const p=b.p||[],xs=p.map(p=>p[0]),zs=p.map(p=>p[1]),w=Math.max(...xs)-Math.min(...xs),l=Math.max(...zs)-Math.min(...zs),cx=Number.isFinite(b.cx)?b.cx:(Math.min(...xs)+Math.max(...xs))/2,cz=Number.isFinite(b.cz)?b.cz:(Math.min(...zs)+Math.max(...zs))/2,dist=Math.hypot(cx-hint.x,cz-hint.z);return {name:b.n||b.name||'',type:b.t,cx:Math.round(cx),cz:Math.round(cz),dist:Math.round(dist),area:Math.round(w*l),w:Math.round(w),l:Math.round(l),height:b.h,points:p.length};}).filter(b=>b.dist<350&&b.area>150).sort((a,b)=>b.area-a.area);
console.log('HOSPITAL_HINT',hint);
console.log('HOSPITAL_LARGEST_NEAR_HINT',JSON.stringify(candidates.slice(0,30),null,2));
