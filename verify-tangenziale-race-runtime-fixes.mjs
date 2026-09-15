import fs from 'node:fs';

const fixes=fs.readFileSync(new URL('./dist/tangenziale-race-runtime-fixes.js',import.meta.url),'utf8');
const upgrades=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8');
const second=fs.readFileSync(new URL('./dist/tangenziale-race-second.js',import.meta.url),'utf8');

const checks=[
 ['finish requires physical line crossing',/crossedFinish\(actor,r,progress\)/.test(fixes)&&/along>=-FINISH_PLANE_TOLERANCE/.test(fixes)&&!/playerProgress>=r\.total-28/.test(fixes)],
 ['player finish override installed',/TangenzialeRace\.prototype\.updatePlayer=updatePlayerFinishCorrectly/.test(fixes)],
 ['adaptive lane choice scans obstacles and racers',/chooseLane\(manager,car,p,index\)/.test(fixes)&&/\.\.\.r\.obstacles,r\.playerCar,\.\.\.r\.ai/.test(fixes)&&/candidates=\[-bound,0,bound\]/.test(fixes)],
 ['AI can steer and overtake instead of driving straight',/wantedLane/.test(fixes)&&/raceLane/.test(fixes)&&/goal=Math\.atan2/.test(fixes)&&/turnRate=1\.95/.test(fixes)],
 ['bridge deck height is authoritative',/Bridge and flyover samples are authoritative/.test(fixes)&&/roads\?\.sample/.test(fixes)&&/guide\.road\?\.b/.test(fixes)],
 ['AI collision fallback and respawn remain active',/vehicleBlocked\(nx,nz,car\.yaw,g\.collision,car\.spec,ny\)/.test(fixes)&&/AI_OFFROAD_LIMIT=26/.test(fixes)&&/respawnCheckpoint/.test(fixes)],
 ['last ramp is moved earlier and softened',/LAST_RAMP_MAX_FRACTION=\.76/.test(fixes)&&/LAST_RAMP_MAX_RISE=2\.05/.test(fixes)&&/relocateRamp/.test(fixes)],
 ['ramp locations reject bends bridges and tunnels',/rampSpotSafe/.test(fixes)&&/road\.tunnel\|\|road\.crossing\|\|road\.b/.test(fixes)&&/bend<\.14/.test(fixes)],
 ['ramp freeze recovery exists',/recoverRampFailure/.test(fixes)&&/Rampa ripristinata · gara continua/.test(fixes)],
 ['second race still has seven equal-spec racers',/AI_COUNT=6/.test(second)&&/g\.addCar\(r\.start\.x,r\.start\.z,r\.startYaw,false,true,'fulmine'\)/.test(second)&&/raceSkill:1/.test(second)],
 ['runtime fixes load after second race',/tangenziale-race-second\.js';\nimport '\.\/tangenziale-race-runtime-fixes\.js'/.test(upgrades)]
];

let failed=0;
for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);if(!ok)failed++;}
if(failed)process.exit(1);
