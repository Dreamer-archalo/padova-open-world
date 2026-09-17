import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const game=source('./dist/game.js');
const portello=source('./dist/portello.js');
const gameplay=source('./dist/gameplay-upgrades.js');
const runtime=source('./dist/phase2-runtime.js');

// A standalone Portello actor test cannot detect a forgotten connection to
// the actual game loop: keep both creation and per-frame update wired.
assert.match(game,/createMicromobilityActor\(i,terrain\)/,'micro-mobility actors must still be created');
assert.match(game,/micromobility\.push\(actor\)/,'created micro-mobility actors must enter the live pool');
assert.match(game,/function updateMicromobility\s*\(dt\)/,'micro-mobility update must exist');
assert.match(game,/stepMicromobility\(a,dt,terrain/,'live update must advance micro-mobility actors');
assert((game.match(/updateMicromobility\(dt\)/g)||[]).length>=2,'the render loop must invoke the micro-mobility update');
assert.match(portello,/export const MICROMOBILITY_ROUTES/,'micro-mobility routes must be retained');
for(const type of ["kind:'bike'","kind:'bike-basket'","kind:'scooter'"])
  assert(portello.includes(type),`missing Portello micro-mobility variant: ${type}`);
assert.match(portello,/hyper:2,low:4,medium:6,high:8/,'quality budgets must remain available');

// Existing functionality must survive later race/taxi/terrain modifications.
for(const file of ['tangenziale-race.js','tangenziale-race-second.js','tangenziale-race-difficulty.js','online-race-v2.js','online-race-second-fix.js','hospital-rooftop-easter-egg.js','taxi-loading-guard.js'])
  assert(gameplay.includes(`import './${file}';`),`missing gameplay import: ${file}`);
assert(runtime.includes("import './gameplay-upgrades.js';"),'gameplay upgrades must be loaded');
assert(!/^import\s+['"]\.\/road-reality-(?:pass|audit)\.js['"]/m.test(runtime),'disabled height monkey-patches must not be re-enabled without geometry validation');

console.log('PASS: micromobility creation/update, both races, online modules, taxi guard and disabled unsafe geometry overrides remain wired.');
console.log('This structural regression does not replace browser/WebGL, two-device or full elevation tests.');
