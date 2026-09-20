import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyCityData} from '../dist/districts.js';
import {prepareGameplayMap,VILLA,areaLocal} from '../dist/gameplay-areas.js';
import {MANDRIA_PRIVATE_LIMITS,segmentEntersMandria} from '../dist/villa-mandria-road-privacy.js';
import {TREVES_PUBLIC_PARK} from '../dist/villa-mandria-relocation.js';
const read=file=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+file+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));
const parks=map.roads.filter(r=>r.p.some(p=>Math.hypot(p[0]-TREVES_PUBLIC_PARK.x,p[1]-TREVES_PUBLIC_PARK.z)<100));
const villaPublic=map.roads.filter(r=>!r.gameplay).length;
prepareGameplayMap(map);
const report=map.gameplay.mandriaPublicRoads;
assert(report,'Mandria public road clip must run during world preparation');
assert.deepEqual(report.privateLimits,MANDRIA_PRIVATE_LIMITS);
assert(report.split+report.removed>0,'the reported intrusive mapped streets were not removed');
for(const road of map.roads){if(road.gameplay)continue;for(let i=1;i<road.p.length;i++){
 assert(!segmentEntersMandria(road.p[i-1],road.p[i]),`Public ${road.n||road.k} crosses private estate after clipping`);
}}
const inner=map.roads.filter(r=>r.gameplay&&/Villa della Mandria/.test(r.n||''));
assert(inner.length>=2,'the private authored driveway and villa road must remain');
assert(inner.every(r=>r.access==='private'&&r.estateAuthorized===true),'civil NPCs can still enter an access=yes villa road');
assert(map.gameplay.roads.filter(r=>/Villa della Mandria/.test(r.n||'')).every(r=>r.access==='private'),'the gameplay graph reused a public villa road');
assert(map.roads.filter(r=>r.p.some(p=>Math.hypot(p[0]-TREVES_PUBLIC_PARK.x,p[1]-TREVES_PUBLIC_PARK.z)<100)).length>=parks.length*.65,'Parco Treves geometry unexpectedly changed');
assert(map.roads.length>villaPublic*.35,'road filtering erased excessive parts of Padova');
assert(areaLocal(VILLA,VILLA.x,VILLA.z).u===0,'villa coordinates changed');
console.log('PASS Mandria mapped street clipping and private driveway access '+JSON.stringify({sourceRoads:villaPublic,publicRoads:map.roads.filter(r=>!r.gameplay).length,report,privateDriveways:inner.length}));
