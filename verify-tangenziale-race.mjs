import fs from 'node:fs';
const race=fs.readFileSync(new URL('./dist/tangenziale-race.js',import.meta.url),'utf8');
const rules=fs.readFileSync(new URL('./dist/tangenziale-race-rules.js',import.meta.url),'utf8');
const driving=fs.readFileSync(new URL('./dist/modern-driving.js',import.meta.url),'utf8');
const structures=fs.readFileSync(new URL('./dist/road-structures.js',import.meta.url),'utf8');
const upgrades=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8');
const checks=[
 ['activity and confirmation',/GARA IN TANGENZIALE/.test(race)&&/Sei sicuro di voler iniziare\?/.test(race)&&/teletrasportato automaticamente/.test(race)],
 ['four identical racers',/RACER_STYLE='fulmine'/.test(race)&&/AI_COUNT=3/.test(race)&&/START_GRID/.test(race)],
 ['two-by-two clean start grid',/side:-1\.55,back:0/.test(race)&&/side:1\.55,back:0/.test(race)&&/back:7\.2/.test(race)],
 ['five second locked countdown',/COUNTDOWN_SECONDS/.test(race)&&/BLOCKED_DURING_COUNTDOWN/.test(race)&&/PARTENZA BLOCCATA/.test(race)&&/5, 4, 3, 2, 1/.test(race)],
 ['starter girl and checkered flag',/flag-starter-girl/.test(race)&&/buildStarterGirl/.test(race)&&/flag\.userData\.flag/.test(race)],
 ['three shift turbos',/TURBO_CHARGES=3/.test(race)&&/ShiftLeft/.test(race)&&/TURBO_SECONDS=2\.6/.test(race)],
 ['voluntary exit',/KeyX/.test(race)&&/ABBANDONA GARA/.test(race)&&/Gara abbandonata/.test(race)&&/restoreSnapshot/.test(race)],
 ['rewards',/WIN_REWARD=350/.test(race)&&/LOSE_PENALTY=100/.test(race)],
 ['motorway-only route discovery',/motorway\|trunk/.test(race)&&/chooseRaceRoute/.test(race)],
 ['route preserves road identity',/prev\.set\(e\.id,\{id:u,road:e\.road\}\)/.test(race)&&/road:i===0\?roads\[0\]/.test(race)],
 ['bridge-aware deck height',/function trackHeight/.test(race)&&/terrain\.roads\?\.sample/.test(race)&&/trackHeight\(this\.game,p,q\.x,q\.z,p\.y\)/.test(race)],
 ['grade-separated progress',/function sampleDistance/.test(race)&&/actor\.y-p\.y/.test(race)],
 ['safe non-bridge start selection',/function chooseStartIndex/.test(race)&&/road\.b\|\|road\.crossing/.test(race)],
 ['persistent racers',/ensureRacer/.test(race)&&/g\.cars\.includes\(c\)/.test(race)&&/c\.mesh\.visible=true/.test(race)&&/budgetSleeping=false/.test(race)],
 ['checkpoint respawn',/playerCheckpoint/.test(race)&&/raceCheckpoint/.test(race)&&/respawnCheckpoint/.test(race)&&/ultimo checkpoint valido/.test(race)],
 ['level-aware AI corridor',/terrain\.roads\?\.candidates/.test(driving)&&/support\.height\+\.05/.test(driving)],
 ['four safe ramps',/\[\[\.20,-1\],\[\.44,1\],\[\.68,-1\],\[\.88,1\]\]/.test(race)&&/safeFeatureIndex/.test(race)],
 ['real obstacles including truck',/style:'truck'/.test(race)&&/style:'wagon'/.test(race)&&/style:'utility'/.test(race)&&/tangenzialeObstacle:true/.test(race)],
 ['live four-car timing board',/finishTimes:\[null,null,null,null\]/.test(race)&&/TEMPI GARA/.test(race)&&/AUTO 1 · TU/.test(race)&&/formatRaceTime/.test(race)],
 ['finish grace and results',/firstFinishAt/.test(race)&&/resultsReady/.test(race)&&/phase='results'/.test(race)],
 ['underpass collision portal',/underpass-pier/.test(structures)&&/underpass-lintel/.test(structures)&&/underpass-arch/.test(structures)&&/solid:false/.test(structures)],
 ['underpass keeps lower road open',/clearance<3\.4/.test(structures)&&/opening=Math\.max\(5\.2,lower\.road\.w\+\.7\)/.test(structures)],
 ['rules module',/COUNTDOWN_SECONDS=5/.test(rules)&&/nextCheckpoint/.test(rules)&&/resultsReady/.test(rules)],
 ['snapshot restore',/snapshot\(\)/.test(race)&&/restoreSnapshot/.test(race)&&/gameGraceUntil/.test(race)],
 ['runtime import',/import '\.\/tangenziale-race\.js';/.test(upgrades)]
];
let failed=0;for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);if(!ok)failed++;}if(failed)process.exit(1);
