import assert from 'node:assert/strict';
import fs from 'node:fs';
import {project} from './dist/core.js';
import {ModernGameplay} from './dist/modern-gameplay.js';

// Reproduce the real 30%-boot exception without invoking full 18 MB map and
// WebGL. The gameplay constructor used to omit `data` but Padova fleet
// unconditionally dereferenced gameplay.data.water in populate().
const game=fs.readFileSync('dist/game.js','utf8'),
 runtime=fs.readFileSync('dist/phase2-runtime.js','utf8'),
 html=fs.readFileSync('dist/index.html','utf8'),
 dockSource=fs.readFileSync('dist/padova-boats.js','utf8');
assert(game.includes('new ModernGameplay({state,data,cars'),
 'Startup must supply raw OSM waterways to nautical gameplay');
assert(dockSource.includes('g.data?.water||[]'),
 'Optional boat data must never crash the whole city on first load');
assert(game.includes('__padovaLoaderDebug?.fail?.'),
 'Unexpected JS exceptions must show their real cause, not a false network warning');
assert(html.includes('game.js?v=startup-r13'));
assert(/padova-boats\.js\?v=startup-r13/.test(game));
assert(/padova-boats\.js\?v=startup-r13/.test(runtime));

// Intercept unrelated military population to exercise the REAL dock registration
// wrapper with exactly the game fields used in production.
ModernGameplay.prototype.populate=function(){return 'base-popuplated'};
await import('./dist/padova-boats.js?v=startup-r13');
const p=project(45.4095,11.8929);
const sample={w:16,p:[[p.x-80,p.z],[p.x+80,p.z]],layer:0};
function stub(data){
 const scene={children:[],add(x){this.children.push(x)}};
 return Object.assign(Object.create(ModernGameplay.prototype),{
  data,scene,state:{started:false},terrain:{
   waterSample:()=>({distance:-3}),waterHeight:()=>1.4
  }
 });
}
const gameWithWater=stub({water:[sample]});
assert.equal(gameWithWater.populate(),'base-popuplated');
assert(gameWithWater.nautical.docks.length>=1,
 'Named Padova docks must be created from loaded OSM waterways');
assert(gameWithWater.nautical.docks[0].name.includes('Portello'));
assert(gameWithWater.scene.children.length>=1,
 'Created marina must attach real dock model to the scene');
const gameWithoutOptionalData=stub(undefined);
assert.doesNotThrow(()=>gameWithoutOptionalData.populate(),
 'Missing optional water data must not halt game startup');
assert.equal(gameWithoutOptionalData.nautical.docks.length,0);
console.log('PASS R13: reproduced and fixed 30% crash; populated true OSM water docks; no crash when waterways are absent; cache-busted loaders and real errors visible.');
