import assert from 'node:assert/strict';
import fs from 'node:fs';

const finalFixes=fs.readFileSync(new URL('./dist/tangenziale-race-final-fixes.js',import.meta.url),'utf8');
const structures=fs.readFileSync(new URL('./dist/road-structures.js',import.meta.url),'utf8');
const upgrades=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8');

const checks=[
 ['finish banner is large and explicit',/FINISH!/.test(finalFixes)&&/raceFinishFlash/.test(finalFixes)&&/font-size:clamp\(72px,12vw,150px\)/.test(finalFixes)],
 ['race 2 final 1.35 km is cleaned',/CLEAN_FINAL_METRES=1350/.test(finalFixes)&&/pista libera fino al traguardo/.test(finalFixes)&&/tangenziale-second-race-features/.test(finalFixes)],
 ['late race props are removed or hidden',/arcadeRamps=.*filter/.test(finalFixes)&&/car\.mesh\.visible=false/.test(finalFixes)&&/r\.decelerators=\[\]/.test(finalFixes)],
 ['bad bridge structure collision is filtered only near player',/STRUCTURE_IGNORE_KINDS/.test(finalFixes)&&/COLLISION_FILTER_METRES=1500/.test(finalFixes)&&/Math\.hypot\(x-state\.x,z-state\.z\)>18/.test(finalFixes)],
 ['sudden-stop recovery exists',/suddenStop=previousSpeed>8&&speed<1\.2/.test(finalFixes)&&/current\+2/.test(finalFixes)],
 ['old collisionless faux bridge arch blocks are gone',!/underpass-lintel/.test(structures)&&!/underpass-arch/.test(structures)],
 ['underpass still has real side piers and deck',/underpass-pier/.test(structures)&&/kind==='deck'/.test(structures)],
 ['final fixes load after race polish',/tangenziale-race-v2-polish\.js';\nimport '\.\/tangenziale-race-final-fixes\.js'/.test(upgrades)]
];

for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);assert.ok(ok,name);}
console.log('PASS tangenziale final fixes');
