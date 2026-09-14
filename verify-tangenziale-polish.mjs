import assert from 'node:assert/strict';
import fs from 'node:fs';

const polish=fs.readFileSync('dist/tangenziale-race-polish.js','utf8');
const bridges=fs.readFileSync('dist/road-structures.js','utf8');
const runtime=fs.readFileSync('dist/gameplay-upgrades.js','utf8');

assert(runtime.includes("import './tangenziale-race-polish.js';"),'race polish runtime is loaded');
assert(polish.includes('IN GARA · ')&&polish.includes('% percorso'),'live board no longer presents the same running timer as four different race times');
assert(polish.includes('TEMPO FINALE / AVANZAMENTO'),'race board distinguishes final time from progress');
assert(polish.includes('tangenzialeCourseMap')&&polish.includes('PERCORSO COMPLETO'),'compact full-course minimap exists');
assert(polish.includes('BOOST RAMPA')&&polish.includes('playerRampBoostUntil'),'ramps give a real speed advantage');
assert(polish.includes('bridgeJump:true')&&polish.includes('BOOST PONTE'),'bridge-jump ramps are generated on suitable approaches');
assert(polish.includes('gap>820')&&polish.includes('targetSkill'),'rivals rubber-band and recover instead of disappearing kilometres behind');
assert(bridges.includes('road.crossing||road.b||Number(road.layer)>0'),'bridge structures cover explicit bridges and layered roads');
assert(bridges.includes('lower.road.w+2.6')&&bridges.includes("'underpass-lintel',upperRoad,{solid:false"),'underpass portal is wider and overhead visual is non-solid');
assert(bridges.includes('/motorway|trunk/.test(road.k)?1.5:1.05'),'fast-road parapets stay farther outside the carriageway');

console.log('PASS tangenziale HUD, minimap, boost ramps, rival recovery and bridge clearances');
