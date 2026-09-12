import {SpatialIndex,pointInside,nearestOnSegment,dist,project} from './core.js';
export function applyCityData(map,city){
 if(!city||city.version!==1||city.baseRoadCount&&city.baseRoadCount!==map.roads.length)throw new Error('Missing city transport data');
 for(const p of city.roads){if(!map.roads[p.i])throw new Error('City road index mismatch');Object.assign(map.roads[p.i],p);if(p.bridge!==undefined)map.roads[p.i].b=p.bridge;if(p.oneway!==undefined)map.roads[p.i].one=p.oneway!==0;}
 for(const p of city.water)if(map.water[p.i])Object.assign(map.water[p.i],p);
 map.tracks=city.tracks;map.stops=city.stops;map.signals=city.signals;map.landuse=city.zones;map.roads.push(...map.tracks);
}
export const PORTELLO={...project(45.4108,11.8918),radius:520};
export const DISTRICTS={
 university:{label:'PORTELLO · UNIVERSITÀ',traffic:.5,people:1.8,trees:1.1,vehicles:['scooter','scooter','compact','nido'],colors:['#608fb1','#a56765','#e1ca82','#557c79']},
 historic:{label:'CENTRO STORICO',traffic:.35,people:1.5,trees:.7,vehicles:['compact','scooter','mito','cinquecento'],colors:['#c4a188','#436c85','#a65c63','#6f8e74']},
 urban:{label:'PADOVA URBANA',traffic:1,people:1,trees:1,vehicles:['sedan','compact','mito','scooter','wagon'],colors:['#547b8c','#ad7b65','#727491','#547861']},
 residential:{label:'QUARTIERE RESIDENZIALE',traffic:.65,people:.6,trees:1.8,vehicles:['wagon','compact','sedan','utility'],colors:['#828a67','#ba9478','#6a8190']},
 industrial:{label:'ZONA INDUSTRIALE',traffic:.7,people:.25,trees:.35,vehicles:['truck','truck','utility','wagon'],colors:['#d4a74e','#7b8b87','#436176']},
 countryside:{label:'CAMPAGNA',traffic:.22,people:.12,trees:2.2,vehicles:['utility','wagon','sedan'],colors:['#7c8964','#85745d','#899798']},
 green:{label:'AREA VERDE',traffic:.1,people:1,trees:3,vehicles:['scooter','compact'],colors:['#b95a58','#5e94b0','#9d9681']},
 wild:{label:'MARGINE SELVAGGIO',traffic:.08,people:.07,trees:5,vehicles:['utility','wagon'],colors:['#6f7967','#8a7864']},
 motorway:{label:'TANGENZIALE',traffic:1.6,people:0,trees:.7,vehicles:['sedan','truck','wagon','sport'],colors:['#657879']}
};
export class Districts{
 constructor(map){this.map=map;this.index=new SpatialIndex(200);this.buildings=new SpatialIndex(60);this.roads=new SpatialIndex(80);this.cache=new Map();
  const bounds=p=>[Math.min(...p.map(p=>p[0])),Math.min(...p.map(p=>p[1])),Math.max(...p.map(p=>p[0])),Math.max(...p.map(p=>p[1]))];
  for(const a of map.landuse||[])this.index.add(a,...bounds(a.p));
  for(const a of map.areas)if(['park','garden'].includes(a.k))this.index.add({...a,k:'park'},...bounds(a.p));
  for(const b of map.buildings)this.buildings.add(b,...bounds(b.p));
  for(const r of map.roads)for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i];this.roads.add({a,b,road:r},Math.min(a[0],b[0])-r.w,Math.min(a[1],b[1])-r.w,Math.max(a[0],b[0])+r.w,Math.max(a[1],b[1])+r.w);}
  const brown=(map.landuse||[]).find(a=>a.k==='brownfield'&&Math.hypot(...a.p[0])>2600);this.wild=brown?{x:brown.p[0][0],z:brown.p[0][1]}:{x:-4300,z:-3400};
 }
 at(x,z,road=null){if(dist({x,z},PORTELLO)<PORTELLO.radius&&!/motorway|trunk/.test(road?.k||''))return 'university';if(road&&['motorway','trunk','motorway_link','trunk_link'].includes(road.k))return 'motorway';if(dist({x,z},this.wild)<380)return 'wild';
  const uses=[...this.index.near(x,z)].filter(a=>pointInside(x,z,a.p));
  if(uses.some(a=>a.k==='industrial'))return 'industrial';
  if(Math.hypot(x*.95,(z-100)*.85)<1150)return 'historic';
  if(uses.some(a=>['park','forest','wood','recreation_ground'].includes(a.k)))return 'green';
  if(uses.some(a=>['commercial','retail'].includes(a.k)))return 'urban';
  if(uses.some(a=>a.k==='residential'))return 'residential';
  if(uses.some(a=>['farmland','meadow'].includes(a.k)))return 'countryside';return Math.hypot(x,z)<2800?'urban':'countryside';
 }
 nearRoad(x,z,margin=0){for(const s of this.roads.near(x,z,margin)){const p=nearestOnSegment(x,z,s.a,s.b);if(Math.hypot(x-p.x,z-p.z)<s.road.w/2+margin)return s;}return null;}
 canPlant(x,z,terrain){if(this.nearRoad(x,z,2.8)||!terrain.dry(x,z,1)||terrain.prato(x,z))return false;for(const b of this.buildings.near(x,z,2)){if(pointInside(x,z,b.p))return false;for(let i=0;i<b.p.length;i++){const p=nearestOnSegment(x,z,b.p[i],b.p[(i+1)%b.p.length]);if(Math.hypot(x-p.x,z-p.z)<1.8)return false;}}return true;}
}
