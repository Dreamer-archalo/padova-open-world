import fs from 'node:fs';
const race=fs.readFileSync(new URL('./dist/tangenziale-race.js',import.meta.url),'utf8');
const driving=fs.readFileSync(new URL('./dist/modern-driving.js',import.meta.url),'utf8');
const upgrades=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8');
const checks=[
 ['activity and confirmation',/GARA IN TANGENZIALE/.test(race)&&/Sei sicuro di voler iniziare\?/.test(race)&&/teletrasportato automaticamente/.test(race)],
 ['four identical racers',/RACER_STYLE='fulmine'/.test(race)&&/AI_COUNT=3/.test(race)&&/START_GRID/.test(race)],
 ['two-by-two clean start grid',/side:-1\.45,back:0/.test(race)&&/side:1\.45,back:0/.test(race)&&/back:6\.5/.test(race)],
 ['three shift turbos',/TURBO_CHARGES=3/.test(race)&&/ShiftLeft/.test(race)&&/TURBO_SECONDS=2\.6/.test(race)],
 ['rewards',/WIN_REWARD=350/.test(race)&&/LOSE_PENALTY=100/.test(race)],
 ['motorway-only route discovery',/motorway\|trunk/.test(race)&&/chooseRaceRoute/.test(race)],
 ['route preserves road identity',/prev\.set\(e\.id,\{id:u,road:e\.road\}\)/.test(race)&&/road:i===0\?roads\[0\]/.test(race)],
 ['bridge-aware deck height',/function trackHeight/.test(race)&&/terrain\.roads\?\.sample/.test(race)&&/trackHeight\(this\.game,p,q\.x,q\.z,p\.y\)/.test(race)],
 ['grade-separated progress',/function sampleDistance/.test(race)&&/actor\.y-p\.y/.test(race)],
 ['safe non-bridge start selection',/function chooseStartIndex/.test(race)&&/road\.b\|\|road\.crossing/.test(race)],
 ['level-aware AI corridor',/terrain\.roads\?\.candidates/.test(driving)&&/support\.height\+\.05/.test(driving)],
 ['ramps',/tangenzialeRace:true/.test(race)&&/tangenziale-race-ramp/.test(race)],
 ['obstacle dodge paths',/routeWithDetours/.test(race)&&/tangenzialeObstacle:true/.test(race)],
 ['out-of-track respawn',/TRACK_LIMIT=82/.test(race)&&/Fuori tracciato/.test(race)&&/respawnActor/.test(race)],
 ['start lights and marshal',/startSet\.lights/.test(race)&&/flag-marshal/.test(race)&&/quattro semafori rossi/.test(race)],
 ['snapshot restore',/snapshot\(\)/.test(race)&&/restoreSnapshot/.test(race)&&/gameGraceUntil/.test(race)],
 ['runtime import',/import '\.\/tangenziale-race\.js';/.test(upgrades)]
];
let failed=0;for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);if(!ok)failed++;}if(failed)process.exit(1);
