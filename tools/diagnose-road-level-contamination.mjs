import fs from 'node:fs';
const [{Terrain},{applyCityData},{prepareGameplayMap}]=await Promise.all([import('../dist/terrain.js'),import('../dist/districts.js'),import('../dist/gameplay-areas.js')]);
await import('../dist/phase4-terrain-fixes.js');await import('../dist/terrain-level-calibration.js');await import('../dist/road-surface-authority.js');
const read=n=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+n+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);const terrain=new Terrain(read('terrain'),map,{modern:true});
const probes=[['Borgomagno',80,-1270],['Mussato',-667,-218],['Avanzo',1134,-1392],['San Massimo',1050,164],['Paolotti',764,-243]];
for(const [label,x,z] of probes){
 const rows=[];for(const s of terrain.roads.index.near(x,z,35)){const q=((x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],d=dx*dx+dz*dz,t=d?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/d)):0;return {x:a[0]+dx*t,z:a[1]+dz*t,t};})(x,z,s.a,s.b),d=Math.hypot(q.x-x,q.z-z);if(d>25)continue;const r=s.profile.road,a=terrain.roads.nodes[s.ia],b=terrain.roads.nodes[s.ib];rows.push({name:r.n||r.k,k:r.k,layer:Number(r.layer)||0,b:!!r.b,crossing:!!r.crossing,tunnel:!!r.tunnel,d:+d.toFixed(2),segH:+terrain.roads.segmentHeight(s,q.t).toFixed(3),natural:+terrain.elevation(q.x,q.z).toFixed(3),a:{id:s.ia,h:+a.h.toFixed(3),base:+a.base.toFixed(3)},bnode:{id:s.ib,h:+b.h.toFixed(3),base:+b.base.toFixed(3)}});}
 rows.sort((a,b)=>a.d-b.d);console.log('\nPROBE '+label+' '+x+','+z);console.log(JSON.stringify(rows.slice(0,24),null,2));
}
