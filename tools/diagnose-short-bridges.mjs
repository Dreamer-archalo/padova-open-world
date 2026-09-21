import fs from 'node:fs';
globalThis.window=globalThis;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};
await import('../dist/phase4-terrain-fixes.js');
const [{Terrain},{applyCityData},{prepareGameplayMap}]=await Promise.all([import('../dist/terrain.js'),import('../dist/districts.js'),import('../dist/gameplay-areas.js')]);
const read=n=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+n+'.json',import.meta.url)));const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);const terrain=new Terrain(read('terrain'),map,{modern:true});
for(const profile of terrain.roads.profiles.values()){
 const r=profile.road;if(!/Pontealto|Chiesanuova/.test(r.n||''))continue;
 const rows=[];for(let i=1;i<profile.points.length;i++){
  const a=profile.points[i-1],b=profile.points[i],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,h=terrain.roads.sample(r,x,z),base=terrain.elevation(x,z),yaw=Math.atan2(b[0]-a[0],b[1]-a[1]),edge=r.w/2+1.05;
  if(h-base<2.3)continue;const candidates=[];for(const side of [-1,1])for(const ex of [0,1.6,3.5,6.5,9.5,13]){const px=x+Math.cos(yaw)*(edge+ex)*side,pz=z-Math.sin(yaw)*(edge+ex)*side;const others=terrain.roads.candidates(px,pz,1.05).filter(s=>s.road!==r&&s.d<=s.road.w/2+1.2&&s.height>=base-2&&s.height<h+2);candidates.push({side,ex,blocked:others.length,roads:others.slice(0,2).map(s=>s.road.n||s.road.k)});}
 rows.push({x:+x.toFixed(1),z:+z.toFixed(1),len:+Math.hypot(b[0]-a[0],b[1]-a[1]).toFixed(1),h:+h.toFixed(2),base:+base.toFixed(2),gap:+(h-base).toFixed(2),candidates});
 }
 if(rows.length)console.log('SHORT_BRIDGE_DIAGNOSTIC',r.n,JSON.stringify(rows.slice(0,15)));
}
