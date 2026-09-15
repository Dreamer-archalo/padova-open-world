import fs from 'node:fs';
const sprint=fs.readFileSync(new URL('./dist/tangenziale-race-short-sprint.js',import.meta.url),'utf8');
const upgrades=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8');
const checks=[
 ['short race target',/TARGET_METRES=3400/.test(sprint)&&/MIN_METRES=2200/.test(sprint)&&/Sprint tangenziale/.test(sprint)],
 ['strict off-road respawn',/OFFROAD_LIMIT=18/.test(sprint)&&/Fuori strada · respawn immediato in pista/.test(sprint)&&/playerCheckpoint/.test(sprint)],
 ['larger dedicated race map',/tangenzialeCourseBox/.test(sprint)&&/330px/.test(sprint)&&/304/.test(sprint)&&/196/.test(sprint)],
 ['three high ramps',/HIGH_RAMP_FRACTIONS=\[\.18,\.48,\.82\]/.test(sprint)&&/rise=2\.55/.test(sprint)&&/tangenziale-race-ramp-high/.test(sprint)],
 ['two slowdown traps',/FAKE_RAMP_FRACTIONS=\[\.33,\.66\]/.test(sprint)&&/RAMPA TRAPPOLA/.test(sprint)&&/s\.speed\*=\.42/.test(sprint)],
 ['obstacles stay inside short route',/OBSTACLE_FRACTIONS=\[\.27,\.53,\.76\]/.test(sprint)&&/offsetPath/.test(sprint)],
 ['finish and route are trimmed',/r\.finish=trim\.at\(-1\)/.test(sprint)&&/g\.state\.route=trim\.slice/.test(sprint)],
 ['loaded after race polish',/tangenziale-race-polish\.js';\nimport '\.\/tangenziale-race-short-sprint\.js'/.test(upgrades)]
];
let failed=0;for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);if(!ok)failed++;}if(failed)process.exit(1);
