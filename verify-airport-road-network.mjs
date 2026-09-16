import fs from 'node:fs';
import {AIRPORT,AIRPORT_GATE,areaLocal,prepareGameplayMap} from './dist/gameplay-areas.js';
import {makeRoadGraph,dist,nearestRoad,roadRoute,nearestOnSegment} from './dist/core.js';
import {findTaxiRoad} from './dist/taxi-service.js';

const map=JSON.parse(fs.readFileSync(new URL('./dist/data/padova.json',import.meta.url)));
const local=p=>areaLocal(AIRPORT,p.x,p.z);
const publicRoad=r=>['service','residential','unclassified','tertiary','secondary','primary'].includes(r.k)&&!r.tunnel&&!r.b&&!['no','private'].includes(r.access);
const candidates=[];
for(const road of map.roads){if(!publicRoad(road))continue;for(const p of road.p){const point={x:p[0],z:p[1]},l=local(point),d=dist(point,AIRPORT_GATE);if(d<80)candidates.push({name:road.n||road.k,d,u:l.u,v:l.v,x:p[0],z:p[1]});}}
candidates.sort((a,b)=>a.d-b.d);
prepareGameplayMap(map);
const graph=makeRoadGraph(map.roads,{separateLevels:true});
const entry=map.gameplay.roads.find(r=>r.n==='Ingresso aeroporto');
const outside={x:entry.p[0][0],z:entry.p[0][1]};
const road=nearestRoad(AIRPORT_GATE,graph,true,{maxRadius:100,fallback:false});
const taxi=findTaxiRoad(AIRPORT_GATE,graph,{roads:{sample:()=>0},height:()=>0},{maxMs:500,maxCandidates:8000});
const route=roadRoute(outside,AIRPORT_GATE,graph,{maxSteps:100000,maxMs:2000});
const nearby=[];
for(const s of graph.index.near(AIRPORT_GATE.x,AIRPORT_GATE.z,60)){
 const a=graph.nodes[s.a],b=graph.nodes[s.b],q=nearestOnSegment(AIRPORT_GATE.x,AIRPORT_GATE.z,[a.x,a.z],[b.x,b.z]),d=dist(q,AIRPORT_GATE);
 if(d>55)continue;nearby.push({road:s.road.n||s.road.k,access:s.road.access,connected:s.connected,d:+d.toFixed(3),a:s.a,b:s.b,aDegree:a.edges.length,bDegree:b.edges.length,al:local(a),bl:local(b)});
}
nearby.sort((a,b)=>a.d-b.d);
const crossings=[];
for(const r of map.gameplay.roads)for(let i=1;i<r.p.length;i++){
 const a=local({x:r.p[i-1][0],z:r.p[i-1][1]}),b=local({x:r.p[i][0],z:r.p[i][1]});
 if((a.u-215)*(b.u-215)<0){const t=(215-a.u)/(b.u-a.u);crossings.push({name:r.n,v:a.v+(b.v-a.v)*t});}
}
console.log(JSON.stringify({gate:local(AIRPORT_GATE),nearestPublicSource:candidates.slice(0,12),authoredRoads:map.gameplay.roads.map(r=>({name:r.n,access:r.access,width:r.w,points:r.p.length,localPoints:r.p.map(([x,z])=>local({x,z}))})),gateNearestRoad:road?{name:road.segment.road.n,access:road.segment.road.access,d:road.d,connected:road.segment.connected}:null,taxiDropoff:taxi?{name:taxi.segment.road.n,access:taxi.segment.road.access,offset:dist(taxi,AIRPORT_GATE)}:null,cityToGateRoutePoints:route.length,perimeterCrossings:crossings,nearbySegments:nearby.slice(0,24)},null,2));
