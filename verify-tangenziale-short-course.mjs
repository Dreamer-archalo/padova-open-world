import fs from 'node:fs';
const short=fs.readFileSync(new URL('./dist/tangenziale-race-short-course.js',import.meta.url),'utf8');
const upgrades=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8');
const checks=[
 ['short target',/TARGET_RACE_METRES=3800/.test(short)&&/MIN_RACE_METRES=2400/.test(short)],
 ['strict off-road recovery',/SHORT_TRACK_LIMIT=18/.test(short)&&/Fuori strada · respawn immediato in pista/.test(short)&&/respawnActor/.test(short)],
 ['larger race minimap',/tangenziale-short-race/.test(short)&&/width:320px/.test(short)&&/height:230px/.test(short)],
 ['three high ramps',/HIGH_RAMP_FRACTIONS=\[\.18,\.48,\.82\]/.test(short)&&/rise=2\.55/.test(short)&&/tangenziale-race-ramp-high/.test(short)],
 ['two fake slowdown ramps',/FAKE_RAMP_FRACTIONS=\[\.33,\.66\]/.test(short)&&/RAMPA TRAPPOLA/.test(short)&&/s\.speed\*=\.42/.test(short)],
 ['obstacles repositioned for short race',/OBSTACLE_FRACTIONS=\[\.27,\.53,\.76\]/.test(short)&&/buildOffsetPath/.test(short)],
 ['finish moved to short course',/Tangenziale breve/.test(short)&&/r\.finishSet\.position\.set/.test(short)&&/g\.state\.route=trimmed/.test(short)],
 ['runtime import',/import '\.\/tangenziale-race-short-course\.js';/.test(upgrades)]
];
let failed=0;for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);if(!ok)failed++;}if(failed)process.exit(1);
