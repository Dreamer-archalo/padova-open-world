import fs from 'node:fs';
import {Terrain} from '../dist/terrain.js';
import {findGradeCrossings} from '../dist/road-grade-crossings.js';

const read=n=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+n+'.json',import.meta.url)));
const map=read('padova'),terrain=new Terrain(read('terrain'),map,{modern:true});
const candidates=findGradeCrossings(map.roads),ikea={x:4400,z:-1400,radius:650};
const near=(a,b,r)=>Math.hypot(a.x-b.x,a.z-b.z)<r;
const endpoints=new Map(),key=p=>p[0].toFixed(1)+','+p[1].toFixed(1);
for(const road of map.roads)if(road.p?.length>1)for(const p of [road.p[0],road.p.at(-1)]){
 const k=key(p);if(!endpoints.has(k))endpoints.set(k,[]);endpoints.get(k).push(road);
}
const crossings=candidates.map(c=>{
 const upperY=terrain.roads.sample(c.upper,c.x,c.z),lowerY=terrain.roads.sample(c.lower,c.x,c.z);
 const joints=[c.upper.p[0],c.upper.p.at(-1)].filter(p=>
  near({x:p[0],z:p[1]},c,110)&&(endpoints.get(key(p))||[]).some(r=>r!==c.upper));
 return {x:+c.x.toFixed(1),z:+c.z.toFixed(1),upper:c.upper.n||c.upper.k,upperClass:c.upper.k,
  lower:c.lower.n||c.lower.k,lowerClass:c.lower.k,explicitBridge:!!(c.upper.b||c.upper.bridge),
  clearance:+(upperY-lowerY).toFixed(4),nearbyConnectedEndpoints:joints.length,
  ikea:near(c,ikea,ikea.radius)};
});
const inadequate=crossings.filter(c=>c.clearance<5.2),ikeaCrossings=crossings.filter(c=>c.ikea);
const report={mapDate:map.dataDate,scope:'Padova extract only; regional map is streamed separately',
 method:'2D OSM centre-line crossings with no shared mapped vertex; candidate order uses explicit bridge tags, road class and bridge names. Manual topology review is required.',
 targetClearance:5.4,summary:{candidateCrossings:crossings.length,below5_2m:inadequate.length,
  ikeaCrossings:ikeaCrossings.length,ikeaBelow5_2m:ikeaCrossings.filter(c=>c.clearance<5.2).length,
  ikeaConnectedApproaches:ikeaCrossings.filter(c=>c.nearbyConnectedEndpoints).length},
 priority:ikeaCrossings.sort((a,b)=>a.clearance-b.clearance),crossings};
fs.writeFileSync(new URL('../docs/interchange-audit-r20.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log('Padova interchange audit',report.summary);
