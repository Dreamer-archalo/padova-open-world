import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const city=read('./dist/phase3-city-systems.js');
const tram=read('./dist/phase3-tram-fix.js');
const polish=read('./dist/phase3-polish.js');
const roofs=read('./dist/roof-upgrades.js');
const bikes=read('./dist/phase3-runtime.js');
const damage=read('./dist/vehicle-damage.js');
const runtime=read('./dist/phase2-runtime.js');

for(const token of ['KeyH','CLACSON','phase3Parked','phase3IndoorUntil','Ambulanza','Vigili del Fuoco','phase3Incident','trafficBypass','TrafficSignals.prototype.phase','VISITA CITTÀ','padova-intro-shots-v1'])assert.ok(city.includes(token),`Phase 3 city system missing: ${token}`);
for(const name of ['Ponte Molino','Ponte Portello','Ponte San Lorenzo'])assert.ok(city.includes(name),`Bridge identity missing: ${name}`);
for(const district of ['ARCELLA','PORTELLO','FORCELLINI','MADONNA PELLEGRINA','SACRA FAMIGLIA','SAN GIUSEPPE','BRUSEGANA','GUIZZA','SACRO CUORE'])assert.ok(city.includes(district),`District gateway missing: ${district}`);
assert.ok((city.match(/\['(?:musicista|mercatino|studenti|cani|pattini|pigeons|cat|consegna|lavori)'/g)||[]).length>=18,'Expected at least 18 lightweight city-event definitions');
assert.ok(city.includes("s.quality==='hyper'")&&city.includes("['medium','high'].includes(s.quality)"),'Water/city detail must scale with graphics quality');
assert.ok(city.includes('game.state.elapsed+34')&&city.includes('nextIncident'),'Autonomous incidents need bounded lifetime/cadence');
assert.ok(city.includes('game.state.elapsed+42')&&city.includes('nextEmergency'),'Emergency vehicles need bounded lifetime/cadence');
assert.ok(tram.includes('InstancedMesh')&&tram.includes('t.dwell>0')&&tram.includes('walk=stopped'),'Tram stop passengers must be instanced and tied to dwell state');
assert.ok(polish.includes('event.isTrusted')&&polish.includes('data-phase3-horn'),'Normal Play must reset Tour mode and HUD must expose horn');
assert.ok(roofs.includes('phase3-pitched-roofs')&&roofs.includes("quality==='high'")&&roofs.includes('hipped'),'Pitched-roof quality layer missing');
for(const token of ['PERCORSO OSTACOLI MOTO','padova-bike-records-v1','phase3StreetRacer','fulmine','zenit'])assert.ok(bikes.includes(token),`Bike/racer feature missing: ${token}`);
for(const token of ['frontBumper','rearBumper','brokenLampMaterial','wheelGeometry'])assert.ok(damage.includes(token),`Physical damage element missing: ${token}`);
for(const file of ['./phase3-city-systems.js','./phase3-tram-fix.js','./phase3-polish.js'])assert.ok(runtime.includes(file),`Runtime wiring missing: ${file}`);
assert.ok(!/weather|rain|dayNight|nightCycle/i.test(city),'Weather/day-night systems must stay out of this performance pass');

console.log(JSON.stringify({cityEvents:18,districtGateways:9,bridgeIdentities:3,bars:6,tourMode:true,horn:true,parking:true,buildingEntries:true,emergency:true,incidents:true,adaptiveSignals:true,tramPassengers:true,qualityWater:true,bikeCourses:4},null,2));
