import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SpatialIndex,pointInside} from './dist/core.js';
import {clearRoadSurface,surfaceBatch,isCarriageway} from './dist/surface-layers.js';
import {Terrain} from './dist/terrain.js';
import {applyCityData} from './dist/districts.js';
import {prepareGameplayMap} from './dist/gameplay-areas.js';

const road={w:6,k:'secondary'},segment={a:[0,-30],b:[0,30],profile:{road}};
const index=new SpatialIndex(80);index.add(segment,-4,-30,4,30);
const fake={elevation:()=>0,roads:{index,segmentHeight:()=>0,sample:()=>0}};
const poly=[[-16,-16],[16,-16],[16,16],[-16,16]];
const cut=clearRoadSurface(poly,fake);
for(let x=-2.9;x<3;x+=.2)for(let z=-15;z<16;z++)assert(!cut.some(p=>pointInside(x,z,p)));
assert(cut.some(p=>pointInside(9,9,p)),'preserve adjoining pavement');
road.crossing=true;fake.roads.segmentHeight=()=>8;
assert.deepEqual(clearRoadSurface(poly,fake),[poly],'retain terrain beneath elevated decks');
road.crossing=false;fake.roads.segmentHeight=()=>0;
const triangles=[],writer=surfaceBatch({tri:(...v)=>triangles.push(v)},fake,{height:()=>-.08});
writer.quad([-16,10,-16],[-16,-3,16],[16,5,16],[16,9,-16],{});
assert(triangles.every(t=>t.slice(0,3).every(v=>v[1]===-.08)));

const read=name=>JSON.parse(fs.readFileSync(new URL('./dist/data/'+name+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);
const terrain=new Terrain(read('terrain'),map,{modern:true});
let samples=0,oldConflicts=0;const cells=new Map();
for(const p of terrain.roads.profiles.values())if(isCarriageway(p.road)&&!p.road.crossing){
 for(let i=1;i<p.points.length;i+=3){const x=(p.points[i][0]+p.points[i-1][0])/2,z=(p.points[i][1]+p.points[i-1][1])/2;
  const y=terrain.roads.sample(p.road,x,z),cx=Math.floor(x/16)*16,cz=Math.floor(z/16)*16;
  const corner=[terrain.groundHeight(cx,cz),terrain.groundHeight(cx+16,cz),terrain.groundHeight(cx,cz+16),terrain.groundHeight(cx+16,cz+16)];
  samples++;if(Math.max(...corner)>y+.2){oldConflicts++;const key=cx+','+cz;if(!cells.has(key))cells.set(key,{x:cx,z:cz,road:p.road.n||p.road.k});}
 }
}
let verified=0;
// Select failures geographically across the entire extract, not a list of fixes.
for(const cell of [...cells.values()].filter((_,i)=>i%Math.max(1,Math.floor(cells.size/250))===0)){
 const {x,z}=cell,parts=clearRoadSurface([[x,z],[x+16,z],[x+16,z+16],[x,z+16]],terrain);
 for(let dx=1;dx<16;dx+=2)for(let dz=1;dz<16;dz+=2){const a=x+dx,b=z+dz;
  const road=terrain.roads.candidates(a,b).find(s=>isCarriageway(s.road)&&!s.road.crossing&&s.d<s.road.w/2-.3);
  if(road)assert(!parts.some(p=>pointInside(a,b,p)),`surface covers ${cell.road} at ${a},${b}`);
 }verified++;
}
const report={samples,oldConflictCandidates:oldConflicts,affectedCells:cells.size,verifiedCells:verified,failures:0};
fs.writeFileSync(new URL('./docs/surface-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log('PASS: rendered surface corridors, pedestrian overlap, elevated ground and map-wide audit',report);
