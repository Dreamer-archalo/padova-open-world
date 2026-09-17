import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const game=source('./dist/game.js');
const portello=source('./dist/portello.js');
const gameplay=source('./dist/gameplay-upgrades.js');
const runtime=source('./dist/phase2-runtime.js');
const city=source('./dist/city-micromobility.js');

// A standalone Portello actor test cannot detect a forgotten connection to
// the actual game loop: keep both creation and per-frame update wired.
assert.match(game,/createMicromobilityActor\(i,terrain\)/,'Portello actors must still be created');
assert.match(game,/micromobility\.push\(actor\)/,'created Portello actors must enter the live pool');
assert.match(game,/function updateMicromobility\s*\(dt\)/,'Portello update must exist');
assert.match(game,/stepMicromobility\(a,dt,terrain/,'Portello update must advance actors');
assert((game.match(/updateMicromobility\(dt\)/g)||[]).length>=2,'the render loop must invoke the Portello update');
assert.match(portello,/export const MICROMOBILITY_ROUTES/,'Portello routes must be retained');
for(const type of ["kind:'bike'","kind:'bike-basket'","kind:'scooter'"])
  assert(portello.includes(type),`missing Portello variant: ${type}`);
assert.match(portello,/hyper:2,low:4,medium:6,high:8/,'Portello quality budgets must remain');

// New district-wide actors are a separate, additive layer. Keep its import,
// real-road route selection, per-frame update and bounded performance pool.
assert(runtime.includes("import './city-micromobility.js';"),'citywide micromobility must be loaded by the production runtime');
assert.match(city,/export function cityMicromobilityRoutes\(/,'dynamic city-road routes must be preserved');
assert.match(city,/export function updateCityMicromobility\(/,'citywide NPC update must be preserved');
assert.match(city,/CityWorld\.prototype\.update=function/,'cityworld must invoke its citywide NPC update');
assert.match(city,/updateCityMicromobility\(this,x,z\)/,'render updates must reach citywide micromobility');
assert.match(city,/cityMicromobilityBudget\(world\.quality\)/,'quality-scaled population limits must remain');
assert.match(city,/cityMicromobilityRoadAllowed/,'road and district safety filtering must remain');

// Existing functionality must survive later race/taxi/terrain modifications.
for(const file of ['tangenziale-race.js','tangenziale-race-second.js','tangenziale-race-difficulty.js','online-race-v2.js','online-race-second-fix.js','hospital-rooftop-easter-egg.js','taxi-loading-guard.js'])
  assert(gameplay.includes(`import './${file}';`),`missing gameplay import: ${file}`);
assert(runtime.includes("import './gameplay-upgrades.js';"),'gameplay upgrades must be loaded');
assert(!/^import\s+['"]\.\/road-reality-(?:pass|audit)\.js['"]/m.test(runtime),'disabled height monkey-patches must not be re-enabled without geometry validation');

console.log('PASS: Portello plus citywide micromobility, both races, online modules, taxi guard and safe geometry wiring retained.');
console.log('Structural regression checks do not replace actual WebGL, two-device or full elevation tests.');
