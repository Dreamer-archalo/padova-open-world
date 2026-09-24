import fs from 'node:fs';

const need=['dist/continuous-world.html','dist/continuous-world.css','dist/continuous-world.js','dist/continuous-world-venice-entry.js','dist/venice-map-entry.js','dist/data/world-padova-venice.json','dist/data/world-terrain.json'];
for(const file of need)if(!fs.existsSync(file)||fs.statSync(file).size<20)throw new Error('Missing/empty '+file);
const world=JSON.parse(fs.readFileSync('dist/data/world-padova-venice.json','utf8'));
const terrain=JSON.parse(fs.readFileSync('dist/data/world-terrain.json','utf8'));
if(world.origin?.[0]!==45.4064||world.origin?.[1]!==11.8768)throw new Error('World origin changed');
if(world.bounds[2]<34000)throw new Error('World does not reach Venice');
if((world.buildings?.length||0)<5000)throw new Error('Too few buildings');
if((world.roads?.length||0)<2000)throw new Error('Too few roads');
if(!(world.places||[]).some(p=>/Piazzale Roma/i.test(p.name)))throw new Error('Piazzale Roma missing');
if(terrain.x0>-6500||terrain.x0+(terrain.width-1)*terrain.step<42000)throw new Error('Terrain x coverage incomplete');
if(terrain.z0>-9000||terrain.z0+(terrain.height-1)*terrain.step<9000)throw new Error('Terrain z coverage incomplete');
const entry=fs.readFileSync('dist/venice-map-entry.js','utf8');
if(!entry.includes('VENEZIA VIA STRADA')||!entry.includes('./venice.html'))throw new Error('Both road and fast travel must remain');
const html=fs.readFileSync('dist/continuous-world.html','utf8');
if(!html.includes('FAST TRAVEL · VENEZIA')||!html.includes('continuous-world.js'))throw new Error('Continuous world UI incomplete');
console.log('PASS continuous world:',world.buildings.length,'buildings,',world.roads.length,'roads, bounds',world.bounds,'terrain',terrain.width+'x'+terrain.height);
