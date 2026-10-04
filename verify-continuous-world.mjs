import fs from 'node:fs';

const need=['dist/continuous-world.html','dist/continuous-world.css','dist/continuous-world.js','dist/continuous-world-venice-entry.js','dist/venice-map-entry.js','dist/data/world-padova-venice.json','dist/data/world-terrain.json'];
for(const file of need)if(!fs.existsSync(file)||fs.statSync(file).size<20)throw new Error('Missing/empty '+file);
const world=JSON.parse(fs.readFileSync('dist/data/world-padova-venice.json','utf8'));
const terrain=JSON.parse(fs.readFileSync('dist/data/world-terrain.json','utf8'));
if(world.origin?.[0]!==45.4064||world.origin?.[1]!==11.8768)throw new Error('World origin changed');
if(world.bounds[0]>-6000||world.bounds[2]<38000||world.bounds[1]>-11000||world.bounds[3]<8000)throw new Error('Playable world envelope incomplete');
if((world.buildings?.length||0)<5000)throw new Error('Too few buildings');
if((world.roads?.length||0)<2000)throw new Error('Too few roads');
if(!(world.places||[]).some(p=>/Piazzale Roma/i.test(p.name)))throw new Error('Piazzale Roma missing');
const tx1=terrain.x0+(terrain.width-1)*terrain.step,tz1=terrain.z0+(terrain.height-1)*terrain.step;
if(terrain.x0>world.bounds[0]||tx1<world.bounds[2])throw new Error('Terrain x coverage incomplete');
if(terrain.z0>world.bounds[1]||tz1<world.bounds[3])throw new Error('Terrain z coverage incomplete');
const entry=fs.readFileSync('dist/venice-map-entry.js','utf8');
if(!entry.includes('VENEZIA VIA STRADA')||!entry.includes('./venice.html'))throw new Error('Both road and fast travel must remain');
const html=fs.readFileSync('dist/continuous-world.html','utf8');
if(!html.includes('FAST TRAVEL · VENEZIA')||!html.includes('continuous-world.js'))throw new Error('Continuous world UI incomplete');
const runtime=fs.readFileSync('dist/continuous-world.js','utf8');
if(!runtime.includes('const LAGOON=')||!runtime.includes('bridgeBase')||!runtime.includes('installLagoon()'))throw new Error('Lagoon/bridge treatment missing');

const css=fs.readFileSync('dist/continuous-world.css','utf8');
if(!/\[hidden\]\s*\{\s*display\s*:\s*none\s*!important\s*\}/.test(css))throw new Error('Missing hidden-state CSS override: loading overlay remains visible');
if(!runtime.includes("loading.style.display='none'"))throw new Error('Missing explicit loading overlay teardown');
if(!html.includes('loading-fix-1'))throw new Error('Loading fix assets need cache-busting version');

console.log('PASS continuous world:',world.buildings.length,'buildings,',world.roads.length,'roads, bounds',world.bounds,'terrain',terrain.width+'x'+terrain.height);
