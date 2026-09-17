import fs from 'node:fs';
globalThis.window=globalThis;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};
await import('../dist/phase4-terrain-fixes.js');await import('../dist/historic-terrain-level.js');await import('../dist/historic-plaza-alignment.js');
const [{Terrain},{applyCityData},{prepareGameplayMap}]=await Promise.all([import('../dist/terrain.js'),import('../dist/districts.js'),import('../dist/gameplay-areas.js')]);
const read=n=>JSON.parse(fs.readFileSync(new URL(`../dist/data/${n}.json`,import.meta.url)));
const data=read('padova');applyCityData(data,read('city'));prepareGameplayMap(data);const terrain=new Terrain(read('terrain'),data,{modern:true});
const report=[];
for(const p of terrain.roads.profiles.values()){
 if(p.road.n!=='Cavalcavia Chiesanuova')continue;
 const spans=[];for(let i=1;i<p.points.length;i++){const a=p.points[i-1],b=p.points[i],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;if(Math.abs(x+1910)>12||Math.abs(z+467)>8)continue;
  const h=terrain.roads.sample(p.road,x,z),base=terrain.elevation(x,z),yaw=Math.atan2(b[0]-a[0],b[1]-a[1]),deckBottom=Math.min(terrain.roads.sample(p.road,...a),terrain.roads.sample(p.road,...b),h)-.74;
  const lower=terrain.roads.candidates(x,z,42).filter(s=>s.road!==p.road&&!/footway|path|steps|cycleway|tram|pedestrian/.test(s.road.k)).sort((a,b)=>a.d-b.d).slice(0,10).map(s=>({name:s.road.n||s.road.k,width:s.road.w,d:+s.d.toFixed(1),height:+s.height.toFixed(2),yaw:+Math.atan2(s.segment.b[0]-s.segment.a[0],s.segment.b[1]-s.segment.a[1]).toFixed(2),underpassCandidate:s.d<=s.road.w/2+2.2&&s.height<deckBottom-2.8&&s.height>deckBottom-11&&Math.abs(Math.sin(yaw-Math.atan2(s.segment.b[0]-s.segment.a[0],s.segment.b[1]-s.segment.a[1])))>.20}));
  const edge=p.road.w/2+1.05,offsets=[];for(const sign of [-1,1])for(const extra of [0,6.5,13,18,24,32,42]){const d=(edge+extra)*sign,px=x+Math.cos(yaw)*d,pz=z-Math.sin(yaw)*d;const conflicts=terrain.roads.candidates(px,pz,1.05).filter(s=>s.road!==p.road&&!/footway|path|steps|cycleway|tram|pedestrian/.test(s.road.k)&&s.d<=s.road.w/2+1.2&&s.height>=base-2&&s.height<deckBottom+2).map(s=>s.road.n||s.road.k);offsets.push({side:sign,extra,conflicts:[...new Set(conflicts)].slice(0,3)});}
  spans.push({x:+x.toFixed(1),z:+z.toFixed(1),length:+Math.hypot(b[0]-a[0],b[1]-a[1]).toFixed(1),yaw:+yaw.toFixed(2),deckBottom:+deckBottom.toFixed(2),ground:+base.toFixed(2),lower,offsets});}
 if(spans.length)report.push({surface:p.road.surfaceId,roadWidth:p.road.w,points:p.points.length,spans});
}
console.log('CHIESANUOVA_EXACT_PROFILES',JSON.stringify(report));
