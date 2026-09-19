import fs from 'node:fs';
globalThis.window=globalThis;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};
await import('../dist/phase4-terrain-fixes.js');await import('../dist/historic-terrain-level.js');await import('../dist/historic-plaza-alignment.js');
const [{Terrain},{applyCityData},{prepareGameplayMap},{roadStructures}]=await Promise.all([import('../dist/terrain.js'),import('../dist/districts.js'),import('../dist/gameplay-areas.js'),import('../dist/road-structures.js')]);
const read=n=>JSON.parse(fs.readFileSync(new URL(`../dist/data/${n}.json`,import.meta.url)));
const data=read('padova');applyCityData(data,read('city'));prepareGameplayMap(data);const terrain=new Terrain(read('terrain'),data,{modern:true});const boxes=roadStructures(terrain);
const centre={x:-1910,z:-467.5};const nearby=boxes.filter(b=>Math.hypot(b.x-centre.x,b.z-centre.z)<50&&['deck','pier','underpass-pier','underpass-lintel'].includes(b.kind)).map(b=>({kind:b.kind,road:b.road.n||b.road.surfaceId,surfaceId:b.road.surfaceId,x:+b.x.toFixed(2),z:+b.z.toFixed(2),y:+b.minY.toFixed(2),top:+(b.minY+b.h).toFixed(2),length:+b.length.toFixed(2),width:+b.w.toFixed(2),yaw:+b.yaw.toFixed(3)})).sort((a,b)=>a.x-b.x||a.z-b.z);
const span=nearby.filter(b=>b.surfaceId===3957&&b.kind==='deck');const adjacent=nearby.filter(b=>b.surfaceId!==3957&&['pier','underpass-pier'].includes(b.kind)&&Math.abs(b.z-centre.z)<18).sort((a,b)=>Math.abs(a.x-centre.x)-Math.abs(b.x-centre.x));
console.log('CHIESANUOVA_ACTUAL_ABUTMENTS',JSON.stringify({span,adjacent:adjacent.slice(0,22),lowerRoad:nearby.filter(b=>b.kind==='deck'&&b.surfaceId!==3957).slice(0,16),totalNearby:nearby.length}));
