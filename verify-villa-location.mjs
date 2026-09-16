import fs from 'node:fs';
globalThis.window=globalThis;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
await import('./dist/phase4-terrain-fixes.js');await import('./dist/historic-terrain-level.js');await import('./dist/historic-plaza-alignment.js');
const [{Terrain},{prepareGameplayMap,VILLA},{applyCityData}]=await Promise.all([import('./dist/terrain.js'),import('./dist/gameplay-areas.js'),import('./dist/districts.js')]);
const load=n=>JSON.parse(fs.readFileSync(new URL('./dist/data/'+n+'.json',import.meta.url)));
const data=load('padova');applyCityData(data,load('city'));prepareGameplayMap(data);
const terrain=new Terrain(load('terrain'),data,{modern:true});
const candidates=[];
for(let dx=-300;dx<=300;dx+=20)for(let dz=-300;dz<=300;dz+=20){
 const x=VILLA.x+dx,z=VILLA.z+dz,distance=Math.hypot(dx,dz);if(distance>310)continue;
 let minWater=Infinity,maxElevation=-Infinity,minElevation=Infinity;
 for(const ox of [-54,-27,0,27,54])for(const oz of [-54,-27,0,27,54]){
  const xx=x+ox,zz=z+oz;minWater=Math.min(minWater,terrain.waterDistance(xx,zz));
  const h=terrain.rawElevation(xx,zz);maxElevation=Math.max(maxElevation,h);minElevation=Math.min(minElevation,h);
 }
 if(minWater<15)continue;
 const roads=terrain.roads.candidates(x,z,90).filter(r=>!/footway|path|cycleway|pedestrian|steps|tram/.test(r.road.k||''));
 const nearestRoad=roads.length?Math.min(...roads.map(r=>r.d)):Infinity;
 candidates.push({dx,dz,distance:+distance.toFixed(1),minWater:+minWater.toFixed(1),elevationSpread:+(maxElevation-minElevation).toFixed(2),nearestRoad:+nearestRoad.toFixed(1)});
}
candidates.sort((a,b)=>a.distance-b.distance||a.nearestRoad-b.nearestRoad);
console.log('[Villa survey] original',VILLA.x,VILLA.z,'waterDistance',terrain.waterDistance(VILLA.x,VILLA.z),'candidates',candidates.length);
console.log('[Villa survey] nearest safe candidates',JSON.stringify(candidates.slice(0,18),null,2));
console.log('[Villa survey] nearby named areas',JSON.stringify(data.areas.filter(a=>a.n&&/treves|parco/i.test(a.n)&&a.p.some(p=>Math.hypot(p[0]-VILLA.x,p[1]-VILLA.z)<450)).map(a=>({name:a.n,kind:a.k,p:a.p.length})).slice(0,12)));
