// Compact, read-only sample of the named problem locations. Run from repo root.
import fs from 'node:fs';
globalThis.window=globalThis;
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const [{Terrain},{applyCityData},{prepareGameplayMap}]=await Promise.all([import('../dist/terrain.js'),import('../dist/districts.js'),import('../dist/gameplay-areas.js'),import('../dist/phase4-terrain-fixes.js')]);
const read=n=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+n+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);const terrain=new Terrain(read('terrain'),map,{modern:true});
for(const [name,x,z] of [['Riviera San Benedetto',-680,-440],['Prato sud',-130,971],['Via Paolotti',765,-246],['Via Roma',0,0]]){
 console.log(JSON.stringify({name,x,z,ground:terrain.groundHeight(x,z),natural:terrain.elevation(x,z),roads:terrain.roads.candidates(x,z,12).map(s=>({name:s.road.n||s.road.k,height:s.height,distance:s.d,bridge:!!s.road.crossing,tunnel:!!s.road.tunnel,covered:!!s.road.coveredPassage}))}));
}
