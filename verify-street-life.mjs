import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const taxi=read('./dist/taxi-service.js');
const map=read('./dist/taxi-map-ui.js');
const cruise=read('./dist/cruise-control.js');
const traffic=read('./dist/traffic.js');
const pursuit=read('./dist/ambient-pursuits.js');
const runtime=read('./dist/phase2-runtime.js');
const stadium=read('./dist/stadium.js');
const details=read('./dist/city-details.js');

const destinations=['Prato della Valle','Piazza dei Signori','Portello','Aeroporto','Arcella','Capolinea tram sud (Albignasego)','Stadio','Ponte San Nicolò','Vigonza','Zona Industriale'];
for(const name of destinations)assert.ok(taxi.includes(name),`Taxi destination missing: ${name}`);
for(const old of ['Sacro Cuore','Stazione Centrale','Villa Treves'])assert.ok(!taxi.includes(old),`Old taxi destination still exposed: ${old}`);
assert.ok(map.includes("activities.prepend(choose)"),'SCEGLI TU is not promoted to the first Taxi option');
assert.ok(map.includes("e.preventDefault()")&&map.includes('scale=next'),'Map zoom must remain internal to the map');
assert.ok(map.includes('Math.min(b,Math.max')||map.includes('Math.max(a,Math.min'),'Map zoom must be bounded');

assert.ok(cruise.includes("KeyK"),'Cruise keyboard shortcut K missing');
assert.ok(cruise.includes('Math.round(current)'),'Cruise must capture current speed');
assert.ok(cruise.includes("adjust(-5)")&&cruise.includes("adjust(5)"),'Cruise fine adjustment should be ±5 km/h');

for(const mood of ["'group'","'wheelie'","'zigzag'"])assert.ok(traffic.includes(mood),`Scooter behaviour missing: ${mood}`);
assert.ok(traffic.includes('laneClearance')&&traffic.includes('safe(l)'),'Scooter weaving must keep lane-clearance safety checks');

assert.ok(runtime.includes("./ambient-pursuits.js"),'Ambient pursuits are not wired into runtime');
assert.ok(pursuit.includes('game.state.wanted>0'),'Ambient pursuit must yield when the player is wanted');
assert.ok(!/state\.wanted\s*=/.test(pursuit),'Ambient pursuits must not alter player wanted level');
assert.ok(pursuit.includes('game.ambientPursuit'),'Ambient pursuit must be single-instance/stateful');

assert.ok(details.includes('createStadium')&&details.includes('stadium.update(x,z)'),'Stadium is not wired into city details');
assert.ok(stadium.includes('new THREE.InstancedMesh'),'Footballers should use instancing');
assert.ok(stadium.includes('maxDistance=950'),'Stadium must be distance-culled');
assert.ok(stadium.includes('if(visible)updatePlayers'),'Football animation must only update when nearby');
assert.ok(stadium.includes('for(let i=0;i<18;i++)'),'Expected lightweight 18-player training/match group');

// Static load guard: these additions should stay deliberately small. This is
// not a GPU/FPS benchmark; it prevents accidental future geometry explosions.
const stadiumMeshConstructors=(stadium.match(/new THREE\.Mesh\(/g)||[]).length;
const stadiumInstanced=(stadium.match(/new THREE\.InstancedMesh\(/g)||[]).length;
assert.ok(stadiumMeshConstructors<=8,`Stadium standalone mesh constructors too high: ${stadiumMeshConstructors}`);
assert.ok(stadiumInstanced<=2,`Stadium instanced mesh constructors too high: ${stadiumInstanced}`);
assert.ok((pursuit.match(/addCar\(/g)||[]).length<=2,'Ambient pursuit must not spawn more than two authored actors');

console.log('street-life checks: PASS');
console.log(JSON.stringify({taxiDestinations:destinations.length,stadiumMeshConstructors,stadiumInstanced,ambientPursuitActors:(pursuit.match(/addCar\(/g)||[]).length},null,2));
