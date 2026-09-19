// Airport integration retains its single graph-connected vehicle entrance.
// The fictional estate lives at Mandria; the real Parco Treves is untouched.
import {makeRoadGraph,nearestOnSegment,dist} from './core.js';
import {prepareGameplayMap as prepareBase,gameplayStructures as originalStructures,gameplaySpawns as baseSpawns,AIRPORT,AIRPORT_GATE,areaPoint,areaLocal} from './gameplay-areas-implementation.js';
import {buildAirportRoads} from './airport-road-network.js';
import {villaGarageStructures} from './villa-treves-layout.js';
import {relocateVillaToMandria,verifyParkAndVillaMap,VILLA_PUBLIC_NAME} from './villa-mandria-relocation.js';
export * from './gameplay-areas-implementation.js';

export function gameplaySpawns(){
 return baseSpawns().map(s=>s.name==='Villa Treves'?{...s,name:VILLA_PUBLIC_NAME}:s);
}

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
  // Wide, collision-free airport entrance.
  for(const v of [226,274])box(211,v,1.7,1.7,7.2,'#d1d3cb');
  for(const v of [217,283])box(215,v,1.1,18,1.2,'#adb6b4');
  box(211,250,1.65,48,.75,'#526775',7.2,false);
  box(211.9,250,.3,30,1.55,'#24566d',8,false);
  for(const v of [228,272])box(211.4,v,.5,.6,1.55,'#e9dba2',8,false);
  for(const [u,v,w,d,h,wall] of [
    [170,562,24,13,5,'#bec8c3'],
    [172,-442,26,17,5.5,'#71816b'],
    [188,-35,16,14,5,'#9baba6']
  ]){
    box(u,v,w,d,h,wall);
    box(u,v,w+1,d+1,.3,'#52656a',h);
    box(u,v+d/2+.12,w*.55,.12,2.25,'#47677b',1.2,false);
  }
  // Collision-aware garage now follows the new villa coordinates.
  result.push(...villaGarageStructures(terrain));
  return result;
}

// Clip only source roads crossing the actual AIRPORT footprint, not the park.
const CLIP={minU:-94,maxU:223,minV:-584,maxV:584};
function outsideAirport(points){
  const paths=[];let current=[];
  const flush=()=>{if(current.length>1)paths.push(current);current=[];};
  const add=(a,b)=>{
    if(Math.hypot(a[0]-b[0],a[1]-b[1])<.01)return;
    if(current.length&&Math.hypot(current.at(-1)[0]-a[0],current.at(-1)[1]-a[1])>.01)flush();
    if(!current.length)current.push(a);current.push(b);
  };
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],p=areaLocal(AIRPORT,...a),q=areaLocal(AIRPORT,...b);
    let lo=0,hi=1;
    for(const [start,delta,min,max] of [[p.u,q.u-p.u,CLIP.minU,CLIP.maxU],[p.v,q.v-p.v,CLIP.minV,CLIP.maxV]]){
      if(Math.abs(delta)<1e-9){if(start<min||start>max){lo=1;hi=0;break;}}
      else{const x=(min-start)/delta,y=(max-start)/delta;lo=Math.max(lo,Math.min(x,y));hi=Math.min(hi,Math.max(x,y));}
    }
    if(lo>=hi){add(a,b);continue;}
    const at=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
    if(lo>0)add(a,at(lo));flush();if(hi<1)add(at(hi),b);
  }
  flush();return paths;
}

export function prepareGameplayMap(map){
  // Select empty land and move VILLA/HOME before prepareBase modifies the map.
  // The old Treves location therefore keeps its original OSM structures/paths.
  const relocation=map.gameplay?null:relocateVillaToMandria(map);
  prepareBase(map);
  if(relocation){
    const drive=map.gameplay.roads.find(r=>r.n==='Accesso villa Treves');
    if(!drive)throw new Error('Mandria villa access road was not generated');
    const approach={x:relocation.site.x,z:relocation.site.z+69};
    const gate={x:relocation.site.x,z:relocation.site.z+51};
    drive.n='Accesso Villa della Mandria';drive.access='yes';
    drive.p=[relocation.site.road.point,[approach.x,approach.z],[gate.x,gate.z]];
    const central=map.gameplay.roads.find(r=>r.n==='Viale della villa');
    if(central)central.n='Viale Villa della Mandria';
  }
  if(map.gameplay.airportRoadIntegration)return map;
  const entry=map.gameplay.roads.find(r=>r.n==='Ingresso aeroporto');
  const oldService=map.gameplay.roads.find(r=>r.n==='Servizi aeroportuali');
  if(oldService){map.gameplay.roads=map.gameplay.roads.filter(r=>r!==oldService);map.roads=map.roads.filter(r=>r!==oldService);}
  map.roads=map.roads.flatMap(r=>r.gameplay?[r]:outsideAirport(r.p).map(p=>({...r,p,airportClipped:true})));
  const added=buildAirportRoads(AIRPORT,areaPoint);
  map.gameplay.roads.push(...added);map.roads.push(...added);
  if(!entry){map.gameplay.airportRoadIntegration={status:'missing-entrance',connected:false};
    if(relocation)verifyParkAndVillaMap(map,relocation);return map;}
  const outside=areaPoint(AIRPORT,228,250);
  entry.access='yes';entry.p=[[outside.x,outside.z],[AIRPORT_GATE.x,AIRPORT_GATE.z]];
  const graph=makeRoadGraph(map.roads,{separateLevels:true});
  const choices=graph.segments.filter(s=>s.connected&&s.road!==entry&&!s.road.gameplay&&!s.road.b&&!s.road.tunnel&&!s.road.crossing&&!Number(s.road.layer)&&!['private','no'].includes(s.road.access)&&['secondary','tertiary','residential','unclassified','service','primary'].includes(s.road.k)).map(s=>{
    const a=graph.nodes[s.a],b=graph.nodes[s.b],point=nearestOnSegment(outside.x,outside.z,[a.x,a.z],[b.x,b.z]);
    return {segment:s,a,b,point,distance:dist(outside,point)};
  }).filter(c=>c.distance<40&&areaLocal(AIRPORT,c.point.x,c.point.z).u>223).sort((a,b)=>a.distance-b.distance);
  let junction=null;
  for(const c of choices){
    const road=c.segment.road;let at=-1;
    for(let i=1;i<road.p.length;i++){
      const a=road.p[i-1],b=road.p[i];
      if((Math.hypot(a[0]-c.a.x,a[1]-c.a.z)<.11&&Math.hypot(b[0]-c.b.x,b[1]-c.b.z)<.11)||
         (Math.hypot(a[0]-c.b.x,a[1]-c.b.z)<.11&&Math.hypot(b[0]-c.a.x,b[1]-c.a.z)<.11)){at=i;break;}
    }
    if(at<1)continue;
    if(dist(c.a,c.point)>.11&&dist(c.b,c.point)>.11)road.p.splice(at,0,[c.point.x,c.point.z]);
    junction={road:road.n||road.k,point:[c.point.x,c.point.z],distance:c.distance};break;
  }
  if(junction)entry.p.unshift(junction.point);
  map.gameplay.airportRoadIntegration={connected:!!junction,cityJunction:junction,visualValidationPending:true,sourceRoadsClipped:true};
  if(relocation)verifyParkAndVillaMap(map,relocation);
  return map;
}
