// Airport integration based on the current main layout, with the original
// structures/spawns retained in gameplay-areas-implementation.js.
// Aircraft taxiways are not car roads.
import {makeRoadGraph,nearestOnSegment,dist} from './core.js';
import {prepareGameplayMap as prepareBase,gameplayStructures as originalStructures,AIRPORT,AIRPORT_GATE,areaPoint,areaLocal} from './gameplay-areas-implementation.js';
import {buildAirportRoads} from './airport-road-network.js';
export * from './gameplay-areas-implementation.js';

// Replace the improvised fence posts flanking the access with a visibly wide
// gateway. Its traffic aperture is +/-24 m around v=250, much wider than
// the 8 m access road. The sign is elevated above every road vehicle.
export function gameplayStructures(terrain){
  const structures=originalStructures(terrain);
  if(!structures.length)return structures;
  const fenceColors=new Set(['#76867f','#596862','#555e60','#fff2bc']);
  const result=structures.filter(s=>{
    if(s.kind!=='gameplay'||!fenceColors.has(s.color))return true;
    const p=areaLocal(AIRPORT,s.x,s.z);
    return !(p.u>208&&p.u<218&&Math.abs(p.v-250)<=31);
  });
  function box(u,v,w,d,h,color,base=0,solid=true){
    const centre=areaPoint(AIRPORT,u,v),y=terrain.elevation(centre.x,centre.z)+base;
    const poly=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([du,dv])=>{const p=areaPoint(AIRPORT,u+du,v+dv);return [p.x,p.z];});
    result.push({x:centre.x,z:centre.z,p:poly,y,minY:y,h,color,solid,kind:'gameplay',minX:Math.min(...poly.map(p=>p[0])),maxX:Math.max(...poly.map(p=>p[0])),minZ:Math.min(...poly.map(p=>p[1])),maxZ:Math.max(...poly.map(p=>p[1]))});
  }
  // Robust supports and sidewalls outside the actual driving corridor.
  for(const v of [226,274])box(211,v,1.7,1.7,7.2,'#d1d3cb');
  for(const v of [217,283])box(215,v,1.1,18,1.2,'#adb6b4');
  box(211,250,1.65,48,.75,'#526775',7.2,false);
  box(211.9,250,.3,30,1.55,'#24566d',8,false);
  for(const v of [228,272])box(211.4,v,.5,.6,1.55,'#e9dba2',8,false);
  return result;
}

export function prepareGameplayMap(map){
  prepareBase(map);
  if(map.gameplay.airportRoadIntegration)return map;
  const entry=map.gameplay.roads.find(r=>r.n==='Ingresso aeroporto');
  const oldService=map.gameplay.roads.find(r=>r.n==='Servizi aeroportuali');
  // Retire ONLY the old car route that ran across the aircraft taxiway.
  if(oldService){map.gameplay.roads=map.gameplay.roads.filter(r=>r!==oldService);map.roads=map.roads.filter(r=>r!==oldService);}
  const added=buildAirportRoads(AIRPORT,areaPoint);
  map.gameplay.roads.push(...added);
  map.roads.push(...added);
  if(!entry){map.gameplay.airportRoadIntegration={status:'missing-entrance',connected:false};return map;}
  // Keep a single real gap in the airport fence, at local (215,250).
  // The outside approach is a distinct vertex; its endpoint is exactly the
  // existing entrance at (205,250) and the road network's internal spine.
  const outside=areaPoint(AIRPORT,228,250);
  entry.access='yes';
  entry.p=[[outside.x,outside.z],[AIRPORT_GATE.x,AIRPORT_GATE.z]];
  const graph=makeRoadGraph(map.roads,{separateLevels:true});
  // Never select a nearest road merely by 2D distance. Require the primary
  // connected graph, ground-level public access and an OUTSIDE-fence point.
  const choices=graph.segments.filter(s=>s.connected&&s.road!==entry&&!s.road.gameplay&&!s.road.b&&!s.road.tunnel&&!s.road.crossing&&!Number(s.road.layer)&&!['private','no'].includes(s.road.access)&&['secondary','tertiary','residential','unclassified','service','primary'].includes(s.road.k)).map(s=>{
    const a=graph.nodes[s.a],b=graph.nodes[s.b],point=nearestOnSegment(outside.x,outside.z,[a.x,a.z],[b.x,b.z]);
    return {segment:s,a,b,point,distance:dist(outside,point)};
  }).filter(c=>c.distance<40&&areaLocal(AIRPORT,c.point.x,c.point.z).u>220).sort((a,b)=>a.distance-b.distance);
  let junction=null;
  for(const c of choices){
    const road=c.segment.road;
    let at=-1;
    for(let i=1;i<road.p.length;i++){
      const a=road.p[i-1],b=road.p[i];
      if((Math.hypot(a[0]-c.a.x,a[1]-c.a.z)<.11&&Math.hypot(b[0]-c.b.x,b[1]-c.b.z)<.11)||
         (Math.hypot(a[0]-c.b.x,a[1]-c.b.z)<.11&&Math.hypot(b[0]-c.a.x,b[1]-c.a.z)<.11)){at=i;break;}
    }
    if(at<1)continue;
    // Split the real road polyline at the precise projected junction. Merely
    // crossing it on screen would leave disconnected graph components.
    if(dist(c.a,c.point)>.11&&dist(c.b,c.point)>.11)road.p.splice(at,0,[c.point.x,c.point.z]);
    junction={road:road.n||road.k,point:[c.point.x,c.point.z],distance:c.distance};break;
  }
  if(junction)entry.p.unshift(junction.point);
  // This flag is diagnostic, not a release certificate: actual geometry,
  // driving, collision, Taxi and WebGL tests must still pass.
  map.gameplay.airportRoadIntegration={connected:!!junction,cityJunction:junction,visualValidationPending:true};
  return map;
}
