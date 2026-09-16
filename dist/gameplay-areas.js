// Draft-only airport connector. The prior gameplay layout is retained intact
// in the implementation module; public exports remain compatible. This preview
// intentionally awaits real 3D/map verification before merging or publishing.
import {makeRoadGraph,nearestOnSegment,dist} from './core.js';
import {prepareGameplayMap as prepareBase,AIRPORT,areaPoint,areaLocal} from './gameplay-areas-implementation.js';
export * from './gameplay-areas-implementation.js';

export function prepareGameplayMap(map){
 prepareBase(map);
 if(!map.gameplay||map.gameplay.airportConnectorPreview)return map;
 const entrance=map.gameplay.roads?.find(r=>r.n==='Ingresso aeroporto');
 if(!entrance||entrance.p.length!==3)return map;
 const approach=areaPoint(AIRPORT,228,250);
 const graph=makeRoadGraph(map.roads,{separateLevels:true});
 const candidates=graph.segments.filter(s=>s.connected&&!s.road.b&&!s.road.tunnel&&!s.road.crossing&&!Number(s.road.layer)&&!['private','no'].includes(s.road.access)&&['secondary','tertiary','residential','unclassified','service','primary'].includes(s.road.k)).map(s=>{
  const a=graph.nodes[s.a],b=graph.nodes[s.b],point=nearestOnSegment(approach.x,approach.z,[a.x,a.z],[b.x,b.z]);
  return {segment:s,point,distance:dist(approach,point)};
 }).filter(c=>c.distance<40&&areaLocal(AIRPORT,c.point.x,c.point.z).u>220).sort((a,b)=>a.distance-b.distance);
 const chosen=candidates[0];if(!chosen)return map;
 const road=chosen.segment.road,p=chosen.point,a=graph.nodes[chosen.segment.a],b=graph.nodes[chosen.segment.b];
 // Make the true segment projection a shared graph vertex. Merely setting the
 // access road to a midpoint without splitting its original polyline leaves
 // a visually touching but disconnected navigation graph.
 let at=-1;
 for(let i=1;i<road.p.length;i++)if(Math.hypot(road.p[i-1][0]-a.x,road.p[i-1][1]-a.z)<.11&&Math.hypot(road.p[i][0]-b.x,road.p[i][1]-b.z)<.11){at=i;break;}
 if(at<1)return map;
 if(dist(a,p)>.11&&dist(b,p)>.11)road.p.splice(at,0,[p.x,p.z]);
 entrance.p[0]=[p.x,p.z];
 map.gameplay.airportConnectorPreview={cityRoad:road.n,junction:[p.x,p.z],linkLength:chosen.distance,visualValidationPending:true};
 return map;
}
