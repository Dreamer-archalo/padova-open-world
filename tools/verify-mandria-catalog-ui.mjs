import assert from 'node:assert/strict';
import '../dist/modern-vehicles.js';
// All 16 aircraft are registered across the airport modules at runtime.
// Import their registration side effects here instead of counting a partial fleet.
import '../dist/airport-interactivity.js';
import '../dist/airport-flight-extras.js';
import '../dist/airport-combat-flight.js';
import '../dist/airport-military-fleet.js';
import {VEHICLES} from '../dist/vehicles.js';
import {hangarCatalogue} from '../dist/villa-mandria-hangar.js';
import {HANGAR_SECTIONS,hangarSection,hangarPreviewModel} from '../dist/villa-mandria-catalog-ui.js';
const all=hangarCatalogue(),ids=all.map(e=>e.id);
assert.deepEqual(HANGAR_SECTIONS.map(s=>s.id),['air','land','urban','water']);
assert(HANGAR_SECTIONS.find(s=>s.id==='water')?.enabled===false,'boats must not imply playable vehicles');
assert(ids.length>=52,'do not lose the existing vehicle registry');
assert(ids.every(id=>['air','land','urban'].includes(hangarSection(id,VEHICLES[id]))),'every existing vehicle in one available top-level category');
assert.equal(hangarSection('bicycle'),'urban');
assert.equal(hangarSection('kick-scooter'),'urban');
assert.equal(hangarSection('tank'),'land');
assert.equal(hangarSection('mil-tank-heavy'),'land');
assert.equal(hangarSection('rondone'),'air');
assert.equal(hangarSection('falco'),'air');
const examples=['mito','cinquecento','saetta','fulmine','mil-tank-heavy','mil-truck-carrier','bicycle','kick-scooter','falco','rondone','airport-jet','airport-cargo'];
for(const id of examples){
 if(!VEHICLES[id])continue;
 const object=hangarPreviewModel(id);
 assert(object?.isObject3D&&object.children.length,'dedicated 3-D preview needed for '+id);
 let count=0;object.traverse(o=>{if(o.isMesh)count++;});
 assert(count>0,'preview model has no renderable geometry '+id);
}
const aircraft=ids.filter(id=>hangarSection(id)==='air');
assert.equal(aircraft.length,16,'verify all 16 currently catalogued aircraft');
for(const id of aircraft){
 // In the reported bug a live world actor could be a truck placeholder. Its
 // clone must never be used when a dedicated aircraft preview is requested.
 const badLiveActor={cars:[{style:id,mesh:{clone(){throw Error('cloned ground placeholder for '+id);}}}]};
 const object=hangarPreviewModel(id,'#b52f3d',badLiveActor);
 assert.equal(object?.userData.previewCategory,'air','aircraft card uses a ground preview: '+id);
 let meshes=0;object.traverse(o=>{if(o.isMesh)meshes++;});
 assert(meshes>0,'aircraft preview has no mesh: '+id);
}
console.log('PASS hangar sections: '+JSON.stringify({total:ids.length,air:aircraft.length,land:ids.filter(id=>hangarSection(id)==='land').length,urban:ids.filter(id=>hangarSection(id)==='urban').length,boats:'disabled',modelFactories:examples.length,aircraftPlaceholderRegressions:aircraft.length}));
