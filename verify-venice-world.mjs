import assert from 'node:assert/strict';
import fs from 'node:fs';

for(const path of ['dist/venice.html','dist/venice.css','dist/venice-game.js','dist/venice-map-entry.js','dist/index.html','dist/data/venice.json']){
 assert(fs.existsSync(path),path+' missing');
}
const html=fs.readFileSync('dist/venice.html','utf8');
const runtime=fs.readFileSync('dist/venice-game.js','utf8');
const entry=fs.readFileSync('dist/venice-map-entry.js','utf8');
const index=fs.readFileSync('dist/index.html','utf8');
const data=JSON.parse(fs.readFileSync('dist/data/venice.json','utf8'));

assert.match(index,/venice-map-entry\.js/,'Padova must load the Venice map entry');
assert.match(entry,/VAI A VENEZIA/,'Go to Venice button missing');
assert.match(entry,/\.\/venice\.html/,'Go to Venice target missing');
assert.match(html,/VENEZIA — Open World/,'Venice page title missing');
assert.match(html,/VAI A PADOVA/,'Return to Padova missing');
assert.match(runtime,/data\/venice\.json/,'Venice runtime does not load generated OSM data');
assert.match(runtime,/Canale: qui servirà una barca/,'Canal gameplay boundary missing');
assert.match(runtime,/__veniceWorld/,'Venice runtime state must be exposed for future boat integration');

assert.equal(data.city,'Venezia');
assert(Array.isArray(data.buildings)&&data.buildings.length>2500,'Too few Venice buildings');
assert(Array.isArray(data.roads)&&data.roads.length>500,'Too few Venice paths/roads');
assert(Array.isArray(data.water)&&data.water.length>50,'Too few Venice waterways');
assert(Array.isArray(data.places)&&data.places.length>=7,'Venice fast-travel places missing');
assert(data.places.some(p=>p.name==='Piazza San Marco'));
assert(data.places.some(p=>p.name==='Ponte di Rialto'));
assert(data.places.some(p=>p.name==='Giudecca'));

const [minX,minZ,maxX,maxZ]=data.bounds;
assert(maxX>minX&&maxZ>minZ,'Invalid Venice bounds');
assert(data.spawn.x>=minX&&data.spawn.x<=maxX&&data.spawn.z>=minZ&&data.spawn.z<=maxZ,'Spawn outside Venice bounds');

console.log('PASS Venice world: '+data.buildings.length+' buildings, '+data.roads.length+' paths/roads, '+data.water.length+' waterways; Padova ↔ Venezia map navigation wired.');
