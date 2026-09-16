import fs from 'node:fs';
import {AIRPORT,AIRPORT_GATE,areaLocal,prepareGameplayMap} from './dist/gameplay-areas.js';
import {makeRoadGraph,dist,nearestRoad,roadRoute} from './dist/core.js';
import {findTaxiRoad} from './dist/taxi-service.js';
const map=JSON.parse(fs.readFileSync(new URL('./dist/data/padova.json',import.meta.url)));
const local=p=>areaLocal(AIRPORT,p.x,p.z),publicRoad=r=>['service','residential','unclassified','tertiary','secondary','primary'].includes(r.k)&&!r.tunnel&&!r.b&&!['no','private'].includes(r.access);
prepareGameplayMap(map);
const graph=makeRoadGraph(map.roads,{separateLevels:true}),entry=map.gameplay.roads.find(r=>r.n==='Ingresso aeroporto');
const outside={x:entry.p[0][0],z:entry.p[0][1]},near=[];
const sourceNodes=[...new Set(graph.segments.filter(s=>!s.connected&&s.road.n==='Via Sorio').flatMap(s=>[s.a,s.b]))].map(id=>({id,...graph.nodes[id]})).filter(n=>dist(n,outside)<1000);
for(const s of graph.index.near(outside.x,outside.z,1800)){
 if(!s.connected||!publicRoad(s.road))continue;
 for(const id of [s.a,s.b]){const n=graph.nodes[id],d=dist(n,outside);if(d>1500)continue;let best={d:Infinity};for(const p of sourceNodes){const gap=dist(n,p);if(gap<best.d)best={d:gap,id:p.id,point:local(p)};}near.push({road:s.road.n||s.road.k,access:s.road.access,bridge:!!s.road.b,layer:s.road.layer,point:local(n),distanceToGate:+dist(n,AIRPORT_GATE).toFixed(2),distanceToVia:+best.d.toFixed(2),nearestVia:best.point,node:id});}
}
const uniq=[...new Map(near.map(n=>[n.node,n])).values()];uniq.sort((a,b)=>a.distanceToVia-b.distanceToVia);
const road=nearestRoad(AIRPORT_GATE,graph,true,{maxRadius:100,fallback:false}),taxi=findTaxiRoad(AIRPORT_GATE,graph,{roads:{sample:()=>0},height:()=>0},{maxMs:500,maxCandidates:8000}),route=roadRoute(outside,AIRPORT_GATE,graph,{maxSteps:100000,maxMs:2000});
console.log(JSON.stringify({gate:local(AIRPORT_GATE),entry:entry.p.map(([x,z])=>local({x,z})),sourceViaNodes:sourceNodes.length,nearMainNetwork:uniq.slice(0,32),nearestToGate:road?{road:road.segment.road.n,d:road.d}:null,taxiDropoff:taxi?{road:taxi.segment.road.n,d:dist(taxi,AIRPORT_GATE)}:null,cityRoutePoints:route.length},null,2));
