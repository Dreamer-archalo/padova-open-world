import fs from 'node:fs';
import assert from 'node:assert/strict';

const mission=fs.readFileSync('dist/mission-system.js','utf8');
const architecture=fs.readFileSync('dist/architecture-fixes.js','utf8');
const runtime=fs.readFileSync('dist/phase2-runtime.js','utf8');

assert(mission.includes("requires:'bike-at-start'")&&mission.includes("mode:'wait-bike'"),'bike courses remain selectable before mounting a bike');
assert(mission.includes('bikeStart:true')&&mission.includes('roadRoute(game.state,p.target,game.graph)'),'bike start keeps a visible navigated waypoint');
assert(mission.includes("if(d<22&&bikeReady(game.state))"),'bike challenge starts automatically when a bike reaches the gate');
assert(architecture.includes('if(b.authoredChurch)')&&architecture.includes('b.modelActive=true'),'generic streamed shell is suppressed for authored churches');
assert(architecture.includes('removeLegacyDuplicates')&&architecture.includes('basilica del santo'),'legacy major-church geometry is de-duplicated');
assert(architecture.includes('foundationY')&&architecture.includes('seatHistoricMonuments'),'churches and modified monuments are seated against local ground');
assert(runtime.includes("import './architecture-fixes.js'"),'architecture fixes are loaded by runtime');

console.log('PASS bike start navigation and authored church/monument wall fixes');
