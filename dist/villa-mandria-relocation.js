// The fictional villa is a single estate: move it away from the real Parco Treves.
// Choose a free source-map site near Mandria/Armistizio BEFORE the old gameplay
// footprint filter or terrain/platform patches run. Never delete real buildings
// to make room for the estate and never touch the Treves public park.
import {project,pointInside} from './core.js';
import {VILLA,HOME,areaPoint} from './gameplay-areas-implementation.js';

export const TREVES_PUBLIC_PARK=Object.freeze(project(45.40208,11.88539));
export const MANDRIA_SEARCH=Object.freeze(project(45.3732,11.8308));
export const VILLA_PUBLIC_NAME='Villa della Mandria';

const bounds=p=>({minX:Math.min(...p.map(q=>q[0])),maxX:Math.max(...p.map(q=>q[0])),minZ:Math.min(...p.map(q=>q[1])),maxZ:Math.max(...p.map(q=>q[1]))});
const intersects=(b,x,z,rx,rz)=>b.minX<=x+rx&&b.maxX>=x-rx&&b.minZ<=z+rz&&b.maxZ>=z-rz;
const roadKinds=new Set(['service','residential','unclassified','tertiary','secondary','primary']);
const unobstructed=(from,to,obstacles)=>{
 const distance=Math.hypot(from.x-to.x,from.z-to.z),steps=Math.ceil(distance/5);
 for(let i=1;i<steps;i++){
  const t=i/steps,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;
  if(obstacles.some(b=>intersects(b,x,z,4,4)))return false;
 }
 return true;
};

export function chooseMandriaVillaSite(map){
 if(!map?.buildings||!map?.roads||!map?.water||!map?.areas)throw new Error('Villa relocation requires the unmodified source map');
 const a=MANDRIA_SEARCH,R=1020;
 const close=p=>intersects(p,a.x,a.z,R,R);
 const buildings=map.buildings.filter(b=>b.p?.length).map(b=>({source:b,...bounds(b.p)})).filter(close);
 const water=[...map.water.filter(w=>w.p?.length),...map.areas.filter(w=>w.k==='water'&&w.p?.length)]
  .map(w=>bounds(w.p)).filter(close);
 const restricted=map.areas.filter(w=>/cemetery|grave_yard|graveyard/i.test(w.k||'')&&w.p?.length)
  .map(w=>bounds(w.p)).filter(close);
 const obstacles=[...buildings,...water,...restricted];
 const segments=[],nodes=[];
 for(const road of map.roads){
  if(!road.p?.length)continue;
  const allowed=roadKinds.has(road.k)&&!road.b&&!road.tunnel&&!road.crossing&&!Number(road.layer)&&!['private','no'].includes(road.access);
  for(const p of road.p)if(allowed&&Math.abs(p[0]-a.x)<R&&Math.abs(p[1]-a.z)<R)nodes.push({x:p[0],z:p[1],road});
  for(let i=1;i<road.p.length;i++){
   const b={minX:Math.min(road.p[i-1][0],road.p[i][0]),maxX:Math.max(road.p[i-1][0],road.p[i][0]),
    minZ:Math.min(road.p[i-1][1],road.p[i][1]),maxZ:Math.max(road.p[i-1][1],road.p[i][1])};
   if(close(b))segments.push(b);
  }
 }
 const candidates=[];
 for(let dx=-720;dx<=720;dx+=60)for(let dz=-720;dz<=720;dz+=60){
  const x=a.x+dx,z=a.z+dz;
  if(Math.hypot(dx,dz)>820||Math.hypot(x-TREVES_PUBLIC_PARK.x,z-TREVES_PUBLIC_PARK.z)<2000)continue;
  // An 8 m safety band protects existing OSM geometry and roads, including
  // narrow paths. The public map stays untouched, not merely rendered over.
  if(obstacles.some(b=>intersects(b,x,z,57,62))||segments.some(b=>intersects(b,x,z,58,63)))continue;
  const approach={x,z:z+69};
  let best=null;
  for(const n of nodes){
   // The entrance is on the north edge of the estate, facing its central drive.
   if(n.z<z+65||Math.abs(n.x-x)>140)continue;
   const distance=Math.hypot(n.x-x,n.z-(z+69));
   if(distance>240||best&&distance>=best.distance)continue;
   if(!unobstructed(n,approach,obstacles))continue;
   best={point:[n.x,n.z],name:n.road.n||n.road.k,distance};
  }
  if(!best)continue;
  candidates.push({x,z,road:best,score:Math.hypot(dx,dz)+best.distance*.45});
 }
 candidates.sort((a,b)=>a.score-b.score||a.x-b.x||a.z-b.z);
 if(!candidates.length)throw new Error('No building-free, road-accessible Mandria villa site; do not erase source structures');
 return candidates[0];
}

export function relocateVillaToMandria(map){
 if(map.gameplay?.villaRelocation)return map.gameplay.villaRelocation;
 const originalTrevesBuildings=map.buildings.filter(b=>b.p?.some(p=>
  Math.hypot(p[0]-TREVES_PUBLIC_PARK.x,p[1]-TREVES_PUBLIC_PARK.z)<180));
 const site=chooseMandriaVillaSite(map);
 Object.assign(VILLA,{x:site.x,z:site.z});
 Object.assign(HOME,{...areaPoint(VILLA,0,26),name:VILLA_PUBLIC_NAME,tag:'Casa principale / respawn'});
 return {site,originalTrevesBuildings};
}

export function verifyParkAndVillaMap(map,relocation){
 const {site,originalTrevesBuildings}=relocation;
 const missing=originalTrevesBuildings.filter(b=>!map.buildings.includes(b));
 if(missing.length)throw new Error('Relocation removed '+missing.length+' original Parco Treves buildings');
 const erased=map.buildings.some(b=>b.p?.some(p=>
  Math.abs(p[0]-site.x)<55&&Math.abs(p[1]-site.z)<60));
 if(erased)throw new Error('A real building remains inside the new villa footprint');
 const report={name:VILLA_PUBLIC_NAME,position:{x:site.x,z:site.z},
  approximately:{lat:45.3732-(site.z-MANDRIA_SEARCH.z)/111320,lon:11.8308+(site.x-MANDRIA_SEARCH.x)/(111320*Math.cos(45.4064*Math.PI/180))},
  access:site.road,trevesBuildingsPreserved:originalTrevesBuildings.length,originalBuildingsRemoved:missing.length};
 map.gameplay.villaRelocation=report;return report;
}
