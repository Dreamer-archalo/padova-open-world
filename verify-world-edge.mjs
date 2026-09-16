import fs from 'node:fs';
globalThis.window=globalThis;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};
await import('./dist/phase4-terrain-fixes.js');await import('./dist/historic-terrain-level.js');await import('./dist/historic-plaza-alignment.js');
const [{Terrain},{applyCityData},{prepareGameplayMap,VILLA}]=await Promise.all([import('./dist/terrain.js'),import('./dist/districts.js'),import('./dist/gameplay-areas.js')]);
const read=n=>JSON.parse(fs.readFileSync(new URL('./dist/data/'+n+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);
const t=new Terrain(read('terrain'),map,{modern:true});
console.log('VILLA',VILLA.x,VILLA.z,VILLA.platform);
for(const [x,z] of [[708,440],[712,440],[716,440],[720,440],[712,432],[712,444],[716,444],[716,448],[720,448],[720,452],[756,440],[755,410],[748,398],[VILLA.x,VILLA.z]]){
 const nearest=t.roads.candidates(x,z,9).map(c=>({type:c.road.k,name:c.road.n,roadHeight:+c.height.toFixed(2),distance:+c.d.toFixed(2),crossing:!!c.road.crossing,b:!!c.road.b,layer:c.road.layer})).sort((a,b)=>a.distance-b.distance).slice(0,5);
 console.log('EDGE',JSON.stringify({x,z,raw:+t.rawElevation(x,z).toFixed(2),elev:+t.elevation(x,z).toFixed(2),ground:+t.groundHeight(x,z).toFixed(2),physics:+t.height(x,z).toFixed(2),platform:t.platformAt(x,z)?.height??null,water:+t.waterDistance(x,z).toFixed(1),nearest}));
}
