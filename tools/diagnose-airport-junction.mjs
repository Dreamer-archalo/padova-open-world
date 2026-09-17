import fs from 'node:fs';
import {makeRoadGraph,nearestOnSegment,dist} from '../dist/core.js';
import {AIRPORT,AIRPORT_GATE,areaLocal,prepareGameplayMap} from '../dist/gameplay-areas.js';
globalThis.window=globalThis;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};
await import('../dist/phase4-terrain-fixes.js');
await import('../dist/historic-terrain-level.js');
await import('../dist/historic-plaza-alignment.js');
const {Terrain}=await import('../dist/terrain.js');
const read=name=>JSON.parse(fs.readFileSync(new URL(`../dist/data/${name}.json`,import.meta.url)));
const map=read('padova');prepareGameplayMap(map);
const graph=makeRoadGraph(map.roads,{separateLevels:true}),terrain=new Terrain(read('terrain'),map,{modern:true});
const access=map.gameplay.roads.find(r=>r.n==='Ingresso aeroporto');
if(!access)throw Error('Airport public entrance not present');
const from={x:access.p[0][0],z:access.p[0][1]},fromY=terrain.roads.sample(access,from.x,from.z);
function candidates(pos,maxD){
 return graph.segments.filter(s=>s.connected).map(s=>{
  const a=graph.nodes[s.a],b=graph.nodes[s.b],p=nearestOnSegment(pos.x,pos.z,[a.x,a.z],[b.x,b.z]),d=dist(pos,p);
  if(d>maxD)return null;
  const road=s.road,y=terrain.roads.sample(road,p.x,p.z),ground=terrain.groundHeight(p.x,p.z);
  return {road:road.n||'(unnamed)',kind:road.k,d:+d.toFixed(2),point:[+p.x.toFixed(2),+p.z.toFixed(2)],height:+y.toFixed(2),heightFromAccess:+(y-fromY).toFixed(2),ground:+ground.toFixed(2),bridge:!!(road.b||road.crossing),tunnel:!!road.tunnel,layer:road.layer||0,access:road.access||'unspecified',start: [a.x,a.z],end:[b.x,b.z]};
 }).filter(Boolean).sort((a,b)=>a.d-b.d).slice(0,24);
}
const local=areaLocal(AIRPORT,from.x,from.z);
console.log('AIRPORT_JUNCTION_DIAGNOSTIC',JSON.stringify({gate:AIRPORT_GATE,entranceStart:from,entranceStartLocal:local,accessY:fromY,mainGraphNodes:graph.nodes.length,connectedSegments:graph.segments.filter(s=>s.connected).length,nearEntrance:candidates(from,180),nearGate:candidates(AIRPORT_GATE,180)},null,2));
