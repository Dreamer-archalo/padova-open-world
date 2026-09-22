import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyCityData} from '../dist/districts.js';
import {prepareGameplayMap} from '../dist/gameplay-areas.js';
import {segmentEntersMandria} from '../dist/villa-mandria-road-privacy.js';
import {mandriaRoadMetrics} from '../dist/villa-mandria-v11-road-quality.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+n+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);
const report=map.gameplay.mandriaRoadQuality,bypasses=map.roads.filter(r=>r.estateBypass);
assert(report&&report.examined===bypasses.length&&report.examined>=1,'Mandria bypass must be inspected');
assert(report.smoothed+report.retained===report.examined,'all routes must be preserved');
assert.equal(map.gameplay.mandriaPublicRoads.bypassRejected,0,'public road must remain connected');
for(const r of bypasses){assert(r.p.length>=3,'smooth road cannot disappear');
 for(let i=1;i<r.p.length;i++){
  assert(!segmentEntersMandria(r.p[i-1],r.p[i]),'wide public road entered estate');
  assert(Math.hypot(r.p[i][0]-r.p[i-1][0],r.p[i][1]-r.p[i-1][1])>.045,'zero-length segment');
 }
 const q=mandriaRoadMetrics(r.p);assert(Number.isFinite(q.length)&&q.length>50,'broken road geometry');
 if(r.estateV11Curved){assert(q.maxTurnDeg<=r.estateV11Before+.02,'corner smoothing introduced a sharper turn');assert(q.maxTurnDeg<=r.estateV11After+.02);}
}
console.log('MANDRIA_V11_ROADS '+JSON.stringify(report));
console.log('PASS v11 road geometry, clipping, connected bypass, safe turns and stable endpoints');
