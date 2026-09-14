import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CIVIC_PIAZZAS,insideCivicPiazzaDistrict} from './dist/historic-plaza-alignment.js';

for(const p of CIVIC_PIAZZAS)assert(insideCivicPiazzaDistrict(p.x,p.z),p.id+' must share the civic piazza datum');
const plaza=fs.readFileSync('dist/historic-plaza-alignment.js','utf8');
const architecture=fs.readFileSync('dist/historic-architecture-alignment.js','utf8');
const villa=fs.readFileSync('dist/villa-spawn-alignment.js','utf8');
const runtime=fs.readFileSync('dist/phase2-runtime.js','utf8');

assert(plaza.includes('if(platform)return platform.height'),'authored gameplay platforms are excluded from historic levelling');
assert(plaza.includes('n.h=this.terrain.elevation(n.x,n.z)'),'ordinary civic streets use the exact shared vertical datum');
assert(plaza.includes('road.crossing')&&plaza.includes('road.tunnel')&&plaza.includes('Number(road.layer)'),'bridges/tunnels/layered roads stay vertically independent');
assert(architecture.includes('if(b.authoredChurch)')&&architecture.includes('b.modelActive=true'),'generic OSM church shells are suppressed');
assert(architecture.includes('removeLegacyDuplicates')&&architecture.includes('duomo di padova'),'legacy Duomo/major church landmark duplicates are removed');
assert(architecture.includes('seatHistoricMonuments')&&architecture.includes('foundationY'),'historic authored monuments are seated to local paving');
assert(villa.includes("c.home?.name!=='Villa Treves'")&&villa.includes('platformAt?.(c.x,c.z)'),'Villa Treves fixed vehicles are explicitly surface-aligned');
for(const file of ['historic-plaza-alignment.js','historic-architecture-alignment.js','villa-spawn-alignment.js'])assert(runtime.includes(`import './${file}';`),file+' must be wired into runtime');

console.log('PASS shared Duomo/Signori/Frutta/Erbe datum, architecture de-duplication and Villa spawn alignment');
