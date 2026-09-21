import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyCityData} from '../dist/districts.js';
import {prepareGameplayMap,VILLA,areaLocal} from '../dist/gameplay-areas.js';
import {MANDRIA_PRIVATE_LIMITS,MANDRIA_PUBLIC_EXCLUSION,segmentEntersMandria} from '../dist/villa-mandria-road-privacy.js';
import {TREVES_PUBLIC_PARK} from '../dist/villa-mandria-relocation.js';
const read=file=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+file+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));
const parks=map.roads.filter(r=>r.p.some(p=>Math.hypot(p[0]-TREVES_PUBLIC_PARK.x,p[1]-TREVES_PUBLIC_PARK.z)<100));
const villaPublic=map.roads.filter(r=>!r.gameplay).length;
prepareGameplayMap(map);
const report=map.gameplay.mandriaPublicRoads;
assert(report,'Mandria road clipping must run during world preparation');
assert.deepEqual(report.privateLimits,MANDRIA_PRIVATE_LIMITS);
assert.deepEqual(report.publicExclusion,MANDRIA_PUBLIC_EXCLUSION,'road center must clear shoulders outside private border');
assert(report.split+report.removed>0,'mapped streets intruding into estate were not removed');
assert(report.bypasses>=1,'public road must reconnect after going around private property');
assert.equal(report.bypassRejected,0,'public road disconnected by unsafe geometry');
for(const road of map.roads){if(road.gameplay)continue;for(let i=1;i<road.p.length;i++){
 assert(!segmentEntersMandria(road.p[i-1],road.p[i]),`Public ${road.n||road.k} crosses estate shoulder setback`);
}}
const bypasses=map.roads.filter(r=>r.estateBypass);
assert(bypasses.length>=1&&bypasses.every(r=>r.estateSmoothBypass),'bypasses must be smooth and explicitly marked');
for(const road of bypasses){assert(road.p.length>=3,'smooth bypass must contain actual curve waypoints');
 for(let i=1;i<road.p.length;i++)assert(Math.hypot(road.p[i][0]-road.p[i-1][0],road.p[i][1]-road.p[i-1][1])>.02,'bypass contains zero-length zigzag');}
const inner=map.roads.filter(r=>r.gameplay&&/Villa della Mandria/.test(r.n||''));
assert(inner.length>=2,'private authored driveway and villa road must remain');
assert(inner.every(r=>r.access==='private'&&r.estateAuthorized===true),'civil NPCs can enter private villa roads');
assert(map.gameplay.roads.filter(r=>/Villa della Mandria/.test(r.n||'')).every(r=>r.access==='private'),'gameplay graph reused public villa road');
assert(map.roads.filter(r=>r.p.some(p=>Math.hypot(p[0]-TREVES_PUBLIC_PARK.x,p[1]-TREVES_PUBLIC_PARK.z)<100)).length>=parks.length*.65,'Parco Treves geometry changed');
assert(map.roads.length>villaPublic*.35,'road filtering erased excessive parts of Padova');
assert(areaLocal(VILLA,VILLA.x,VILLA.z).u===0,'villa coordinates changed');
console.log('PASS Mandria smooth external bypass and private driveway '+JSON.stringify({sourceRoads:villaPublic,publicRoads:map.roads.filter(r=>!r.gameplay).length,report,privateDriveways:inner.length,curvedPoints:bypasses.map(r=>r.p.length)}));
