import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pointInside} from './dist/core.js';
globalThis.window=globalThis;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};
await import('./dist/phase4-terrain-fixes.js');
await import('./dist/historic-terrain-level.js');
await import('./dist/historic-plaza-alignment.js');
const [{Terrain},{applyCityData},{prepareGameplayMap},{roadStructures}]=await Promise.all([import('./dist/terrain.js'),import('./dist/districts.js'),import('./dist/gameplay-areas.js'),import('./dist/road-structures.js')]);
const read=name=>JSON.parse(fs.readFileSync(new URL(`./dist/data/${name}.json`,import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);
const terrain=new Terrain(read('terrain'),map,{modern:true}),boxes=roadStructures(terrain),byRoad=new Map();
// A transfer girder counts as support ONLY if it physically joins BOTH
// neighboring collision-bearing piers, touches real bridge deck undersides,
// and leaves >=4.05m beneath for the divided roadway. Do not waive noSupport.
const girders=boxes.filter(b=>b.kind==='transfer-girder');
const verifiedGirders=[];
for(const g of girders){
 const decks=boxes.filter(b=>b.kind==='deck'&&b.road===g.road&&pointInside(b.x,b.z,g.p));
 const piers=boxes.filter(b=>b.kind==='underpass-pier'&&b.road.surfaceId===3959&&pointInside(b.x,b.z,g.p)&&Math.abs(b.minY+b.h-(g.minY+g.h))<.16).sort((a,b)=>a.x-b.x);
 const roads=terrain.roads.candidates(g.x,g.z,11).filter(s=>s.road.n==='Corso Australia'&&s.d<=s.road.w/2+1);
 assert(decks.length>=3,'Chiesanuova girder must physically touch all three original road decks');
 assert(piers.length>=2&&piers.at(-1).x-piers[0].x>18,'Girder must span two independent real adjacent load-bearing columns');
 assert(decks.every(d=>Math.abs(d.minY-(g.minY+g.h))<.06),'Girder upper face must contact every original road deck');
 assert(roads.length>=2&&roads.every(s=>g.minY-s.height-.05>=4.05),'Corso Australia divided lanes must retain >=4.05m vertical clearance');
 assert(g.solid!==false&&g.p.length===4,'Transfer girder must be rendered and collision-bearing');
 verifiedGirders.push(g);
}
for(const box of boxes){if(!['deck','pier','underpass-pier','transfer-girder'].includes(box.kind))continue;const r=box.road;if(!byRoad.has(r))byRoad.set(r,{deck:0,pier:0,portal:0,girder:0});const p=byRoad.get(r);if(box.kind==='deck')p.deck++;else if(box.kind==='pier')p.pier++;else if(box.kind==='underpass-pier')p.portal++;else if(verifiedGirders.includes(box))p.girder++;}
const eligible=[];
for(const profile of terrain.roads.profiles.values()){
 const r=profile.road;if(!(r.b||r.crossing||Number(r.layer)>0)||r.k==='tram'||r.w<4)continue;
 let length=0,mid=null;
 for(let i=1;i<profile.points.length;i++){
  const a=profile.points[i-1],b=profile.points[i],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,h=terrain.roads.sample(r,x,z),base=terrain.elevation(x,z),d=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(!terrain.prato(x,z)&&Number.isFinite(h)&&Number.isFinite(base)&&h-base>2.8){length+=d;mid={x,z};}
 }
 if(length>=16){const p=byRoad.get(r)||{deck:0,pier:0,portal:0,girder:0};eligible.push({road:r.n||r.surfaceId||r.k,raisedMetres:Math.round(length),x:Math.round(mid.x),z:Math.round(mid.z),deck:p.deck,pier:p.pier,portal:p.portal,girder:p.girder});}
}
eligible.sort((a,b)=>b.raisedMetres-a.raisedMetres);
const noDeck=eligible.filter(b=>!b.deck),noSupport=eligible.filter(b=>!b.pier&&!b.portal&&!b.girder);
const report={totalStructures:boxes.length,eligibleRaisedBridges:eligible.length,verifiedLoadBearingGirders:verifiedGirders.length,firstThree:eligible.slice(0,3),noDeck:noDeck.slice(0,20),noSupport:noSupport.slice(0,20)};
console.log('REAL_BRIDGE_MAP_AUDIT',JSON.stringify(report,null,2));
assert(eligible.length>=3,'Need at least three genuine elevated bridge spans');
assert.equal(noDeck.length,0,'Missing physical deck on some real bridge spans');
assert.equal(noSupport.length,0,'Floating bridges: some real elevated spans lack visible collision-bearing supports');
console.log('PASS actual Padova raised spans have decks and physically verified structural load paths');
