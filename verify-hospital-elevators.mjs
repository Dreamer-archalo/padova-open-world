import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('dist/hospital-rooftop-elevators.js','utf8');
const upgrades=fs.readFileSync('dist/gameplay-upgrades.js','utf8');

assert.match(source,/ELEVATOR_COUNT=5/,'Five elevators are required');
assert.match(source,/resolveHospital/,'Elevators must anchor to the exact Monoblocco hospital resolver');
assert.match(source,/chooseCandidates\(site\.polygon\)/,'Elevators must derive distributed positions from the real hospital polygon');
assert.match(source,/E · ASCENSORE → PISTA MOTO/,'Ground access prompt missing');
assert.match(source,/E · ASCENSORE → PIANO TERRA/,'Roof return prompt missing');
assert.match(source,/function bike\(/,'Motorcycle access guard missing');
assert.match(source,/game\.hospitalElevators=state/,'Runtime elevator state is not exposed for browser validation');
assert.doesNotMatch(source,/terrain\.height\s*=/,'Elevator module must not globally rewrite terrain height');
assert.match(upgrades,/import '\.\/hospital-rooftop-elevators\.js';/,'Elevator module is not loaded by gameplay-upgrades');

console.log('PASS Monoblocco: five visible external elevators are wired to the exact hospital footprint, with foot/motorcycle travel and rooftop return.');
