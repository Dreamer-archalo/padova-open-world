import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resultsReady,formatRaceTime} from './dist/tangenziale-race-rules.js';

const src=fs.readFileSync(new URL('./dist/tangenziale-race-second.js',import.meta.url),'utf8');
const upgrades=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8');

const checks=[
 ['seven racers / six AI',/AI_COUNT=6/.test(src)&&/racers:AI_COUNT\+1/.test(src)&&/finishTimes=Array\(AI_COUNT\+1\)\.fill\(null\)/.test(src)],
 ['seven exact requested colors',/COLORS=\['#e53935','#f4d13d','#39b86b','#3084e8','#111318','#f2f2ee','#ef67b2'\]/.test(src)&&/ROSSA','GIALLA','VERDE','BLU','NERA','BIANCA','ROSA/.test(src)],
 ['different-zone selection',/prepareFullSamples\(g,manager\.routeCache\)/.test(src)&&/START_ROUTE_SEPARATION=2200/.test(src)&&/START_WORLD_SEPARATION=900/.test(src)&&/chooseSecondWindow/.test(src)],
 ['slightly longer course',/TARGET_METRES=4100/.test(src)&&/MIN_METRES=3600/.test(src)],
 ['six ramps and two interactive ramps',/RAMP_FRACTIONS=\[\.12,\.26,\.39,\.53,\.68,\.84\]/.test(src)&&/INTERACTIVE_RAMP_INDEXES=new Set\(\[1,4\]\)/.test(src)&&/RAMPA INTERATTIVA · BOOST ATTIVATO/.test(src)],
 ['four decelerators',/DECEL_FRACTIONS=\[\.20,\.46,\.73,\.91\]/.test(src)&&/DECELERATORE · -32% velocità/.test(src)&&/actor\.speed\*=\.68/.test(src)],
 ['seven obstacles with detours',/OBSTACLE_FRACTIONS=\[\.16,\.30,\.42,\.56,\.67,\.78,\.88\]/.test(src)&&/routeWithDetours\(r\.samples,AI_OFFSETS\[i\],obstacleDefs\)/.test(src)&&/traffic:traffic\.filter/.test(src)],
 ['equal AI performance and intelligence',/raceSkill:1/.test(src)&&/const turbo=.*interactive=.*max=c\.spec\.max\+\(turbo\?6\.2:0\)\+\(interactive\?8\.8:0\)/.test(src)&&/accel:14\.7,turnRate:1\.8/.test(src)&&/TURBO_PLAN=\[\.22,\.52,\.81\]/.test(src)],
 ['shared base physics despite different body shapes',/g\.addCar\(r\.start\.x,r\.start\.z,r\.startYaw,false,true,'fulmine'\)/.test(src)&&/createWedgeCar\(COLORS\[index\]/.test(src)&&/MODEL_FORMS/.test(src)],
 ['seven-car countdown grid',/const GRID=\[/.test(src)&&/secondFreezeGrid/.test(src)&&/TangenzialeRace\.prototype\.freezeGrid/.test(src)],
 ['strict off-road recovery',/OFFROAD_LIMIT=18/.test(src)&&/p\.d>OFFROAD_LIMIT/.test(src)],
 ['second activity is separately exposed',/tangenzialeRaceSecondActivity/.test(src)&&/GARA TANGENZIALE 2 · SETTE SPORTIVE/.test(src)],
 ['loaded after short sprint',/tangenziale-race-short-sprint\.js';\nimport '\.\/tangenziale-race-second\.js'/.test(upgrades)]
];

let failed=0;
for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);if(!ok)failed++;}
if(failed)process.exit(1);

const seven=[null,null,null,null,null,null,null];
seven[2]=61.4;
assert.equal(resultsReady(66.0,61.4,seven),false);
for(let i=0;i<seven.length;i++)seven[i]??=61.4+i*.8;
assert.equal(resultsReady(66.0,61.4,seven),true);
assert.equal(formatRaceTime(126.35),'02:06.3');
console.log('PASS seven-car timing/results');
