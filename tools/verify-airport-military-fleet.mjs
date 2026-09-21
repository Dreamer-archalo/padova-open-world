import assert from 'node:assert/strict';
import '../dist/modern-vehicles.js';
import {VEHICLES} from '../dist/vehicles.js';
import {SPECIAL_VEHICLES} from '../dist/special-vehicles.js';
import {AIRPORT,areaPoint,areaLocal,gameplaySpawns,gameplayStructures} from '../dist/gameplay-areas.js';
import {hangarCatalogue,hangarCategory,paintHangarVehicle} from '../dist/villa-mandria-hangar.js';
import {MILITARY_FLEET,MILITARY_PARKING,militaryFleetModel} from '../dist/airport-military-fleet.js';
import {vehicleBlocked} from '../dist/movement.js';

const ids=Object.keys(MILITARY_FLEET),entries=hangarCatalogue();
assert.equal(ids.length,7,'exactly 3 tanks + 2 armored vehicles + 2 military trucks');
assert.equal(ids.filter(id=>VEHICLES[id].tracked).length,3,'exactly three independent tracked tanks');
assert.equal(ids.filter(id=>!VEHICLES[id].tracked&&!id.includes('truck')).length,2,'two new drivable armored vehicles');
assert.equal(ids.filter(id=>id.includes('truck')).length,2,'two military trucks');
assert.equal(MILITARY_PARKING.length,7,'seven independent parking spaces');
assert.equal(new Set(MILITARY_PARKING.map(s=>s.id)).size,7,'no missing or duplicate military spawns');
const uniqueNames=new Set();
for(const id of ids){
 const spec=VEHICLES[id],model=militaryFleetModel(id);
 assert.equal(SPECIAL_VEHICLES[id],spec,'special car builder must recognize '+id);
 assert(entries.some(e=>e.id===id&&e.name===spec.name),'new type missing from Mandria hangar: '+id);
 assert(!uniqueNames.has(spec.name),'each model needs a distinct name');uniqueNames.add(spec.name);
 assert(Number.isFinite(spec.width*spec.length*spec.height*spec.wheelbase*spec.max*spec.steer),'dimensions and handling finite');
 assert(model.children.some(c=>c.isMesh),'distinct 3-D low-poly body for '+id);
 const expectedTurret=!!spec.tracked;
 assert.equal(!!model.userData.turret,expectedTurret,'tracked tank needs controllable cannon only: '+id);
 if(expectedTurret)assert.equal(hangarCategory(id,spec),'tracked','tracked tank must appear under tank category');
 else if(id.includes('truck'))assert.equal(hangarCategory(id,spec),'freight','truck must appear in truck category');
 const model2=militaryFleetModel(id),first=model.children.find(o=>o.isMesh),second=model2.children.find(o=>o.isMesh);
 assert.notEqual(first.geometry,second.geometry,'separate meshes for independently paintable vehicles');
 paintHangarVehicle(model,'#c73f55');
 assert.equal(model2.children.find(o=>o.isMesh).material.color?.getHexString(),second.material.color?.getHexString(),'repaint cannot affect another vehicle');
}
const terrain={modern:true,gameplayPatches:[{height:10}],elevation:()=>10,height:()=>10,groundHeight:()=>10,dry:()=>true};
const solids=gameplayStructures(terrain).filter(s=>s.solid);
const collision={near:(x,z,r)=>solids.filter(s=>s.minX<=x+r&&s.maxX>=x-r&&s.minZ<=z+r&&s.maxZ>=z-r)};
const previous=gameplaySpawns().filter(p=>p.name!=='Villa della Mandria'&&Math.hypot(p.x-AIRPORT.x,p.z-AIRPORT.z)<700);
for(const s of MILITARY_PARKING){
 const p=areaPoint(AIRPORT,s.u,s.v),spec=VEHICLES[s.id];
 assert(s.u>=85&&s.u<=125&&s.v>=-370&&s.v<=-135,'must park INSIDE existing military apron, not runway/terminal');
 assert(!vehicleBlocked(p.x,p.z,AIRPORT.yaw-Math.PI/2,collision,spec,10),'colliding hangar wall/fence at '+s.id);
 for(const q of previous){
  const other=VEHICLES[q.style];assert(other,'legacy airport spec missing in fixture: '+q.style);
  assert(Math.hypot(p.x-q.x,p.z-q.z)>(spec.length+other.length)*.55,'overlap existing airport vehicle '+s.id+' and '+q.style);
 }
 for(const t of MILITARY_PARKING.filter(t=>t!==s)){
  const q=areaPoint(AIRPORT,t.u,t.v);
  assert(Math.hypot(p.x-q.x,p.z-q.z)>(spec.length+VEHICLES[t.id].length)*.55,'new parking overlap '+s.id+' / '+t.id);
 }
 const local=areaLocal(AIRPORT,p.x,p.z);assert(Math.abs(local.u-s.u)<.001&&Math.abs(local.v-s.v)<.001);
}
console.log('PASS MILITARY_FLEET '+JSON.stringify({newVehicles:ids.length,tanks:3,armored:2,trucks:2,catalogueEntries:entries.length,parking:MILITARY_PARKING.length,distinctModels:true,existingSpawnsPreserved:previous.length}));
