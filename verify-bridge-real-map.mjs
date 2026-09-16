import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.window=globalThis;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};
await import('./dist/phase4-terrain-fixes.js');
await import('./dist/historic-terrain-level.js');
await import('./dist/historic-plaza-alignment.js');
const [{Terrain},{applyCityData},{prepareGameplayMap},{roadStructures}]=await Promise.all([import('./dist/terrain.js'),import('./dist/districts.js'),import('./dist/gameplay-areas.js'),import('./dist/road-structures.js')]);
const read=name=>JSON.parse(fs.readFileSync(new URL(`./dist/data/${name}.json`,import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);
const terrain=new Terrain(read('terrain'),map,{modern:true}),boxes=roadStructures(terrain),byRoad=new Map();
for(const box of boxes){if(!['deck','pier','underpass-pier'].includes(box.kind))continue;const r=box.road;if(!byRoad.has(r))byRoad.set(r,{deck:0,pier:0,portal:0});const p=byRoad.get(r);if(box.kind==='deck')p.deck++;else if(box.kind==='pier')p.pier++;else p.portal++;}
const eligible=[];
for(const profile of terrain.roads.profiles.values()){
 const r=profile.road;if(!(r.b||r.crossing||Number(r.layer)>0)||r.k==='tram'||r.w<4)continue;
 let length=0,mid=null;
 for(let i=1;i<profile.points.length;i++){
  const a=profile.points[i-1],b=profile.points[i],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,h=terrain.roads.sample(r,x,z),base=terrain.elevation(x,z),d=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(!terrain.prato(x,z)&&Number.isFinite(h)&&Number.isFinite(base)&&h-base>2.8){length+=d;mid={x,z};}
 }
 if(length>=16){const p=byRoad.get(r)||{deck:0,pier:0,portal:0};eligible.push({road:r.n||r.surfaceId||r.k,raisedMetres:Math.round(length),x:Math.round(mid.x),z:Math.round(mid.z),deck:p.deck,pier:p.pier,portal:p.portal});}
}
eligible.sort((a,b)=>b.raisedMetres-a.raisedMetres);
const noDeck=eligible.filter(b=>!b.deck),noSupport=eligible.filter(b=>!b.pier&&!b.portal);
const report={totalStructures:boxes.length,eligibleRaisedBridges:eligible.length,firstThree:eligible.slice(0,3),noDeck:noDeck.slice(0,20),noSupport:noSupport.slice(0,20)};
console.log('REAL_BRIDGE_MAP_AUDIT',JSON.stringify(report,null,2));
assert(eligible.length>=3,'Need at least three genuine elevated bridge spans');
assert.equal(noDeck.length,0,'Missing physical deck on some real bridge spans');
assert.equal(noSupport.length,0,'Floating bridges: some real elevated spans lack visible collision-bearing supports');
console.log('PASS actual Padova bridge spans have physical decks and load-bearing columns');
