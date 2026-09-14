import fs from 'node:fs';
const race=fs.readFileSync(new URL('./dist/tangenziale-race.js',import.meta.url),'utf8');
const upgrades=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8');
const checks=[
 ['activity and confirmation',/GARA IN TANGENZIALE/.test(race)&&/Sei sicuro di voler iniziare\?/.test(race)&&/teletrasportato automaticamente/.test(race)],
 ['four identical racers',/RACER_STYLE='fulmine'/.test(race)&&/AI_COUNT=3/.test(race)],
 ['three shift turbos',/TURBO_CHARGES=3/.test(race)&&/ShiftLeft/.test(race)&&/TURBO_SECONDS=2\.6/.test(race)],
 ['rewards',/WIN_REWARD=350/.test(race)&&/LOSE_PENALTY=100/.test(race)],
 ['motorway-only route discovery',/motorway\|trunk/.test(race)&&/chooseRaceRoute/.test(race)],
 ['ramps',/tangenzialeRace:true/.test(race)&&/tangenziale-race-ramp/.test(race)],
 ['obstacle dodge paths',/routeWithDetours/.test(race)&&/tangenzialeObstacle:true/.test(race)],
 ['out-of-track respawn',/TRACK_LIMIT=82/.test(race)&&/Fuori tracciato/.test(race)&&/respawnActor/.test(race)],
 ['start lights and marshal',/startSet\.lights/.test(race)&&/flag-marshal/.test(race)&&/quattro semafori rossi/.test(race)],
 ['snapshot restore',/snapshot\(\)/.test(race)&&/restoreSnapshot/.test(race)&&/gameGraceUntil/.test(race)],
 ['runtime import',/import '\.\/tangenziale-race\.js';/.test(upgrades)]
];
let failed=0;for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);if(!ok)failed++;}if(failed)process.exit(1);
