// Keep the fictional Mandria tenuta private without moving or erasing public
// streets outside its perimeter. Split crossing source-road polylines exactly
// at the estate boundary; the villa's authored private driveway is exempt.
import {VILLA,areaLocal} from './gameplay-areas-implementation.js';

export const MANDRIA_PRIVATE_LIMITS=Object.freeze({west:-132,east:132,south:-97,north:62});
const same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<.025;
function outsideParts(points,limits=MANDRIA_PRIVATE_LIMITS){
 const paths=[];let current=[];
 const flush=()=>{if(current.length>=2)paths.push(current);current=[];};
 const append=(a,b)=>{if(same(a,b))return;if(current.length&&!same(current.at(-1),a))flush();if(!current.length)current.push(a);current.push(b);};
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],p=areaLocal(VILLA,...a),q=areaLocal(VILLA,...b);
  let start=0,end=1;
  // Parametric Liang-Barsky clipping in estate-local coordinates.
  for(const [origin,delta,min,max] of [[p.u,q.u-p.u,limits.west,limits.east],[p.v,q.v-p.v,limits.south,limits.north]]){
   if(Math.abs(delta)<1e-10){if(origin<min||origin>max){start=1;end=0;break;}}
   else{const s=(min-origin)/delta,t=(max-origin)/delta;start=Math.max(start,Math.min(s,t));end=Math.min(end,Math.max(s,t));}
  }
  if(start>=end){append(a,b);continue;}
  const at=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  if(start>0)append(a,at(start));flush();if(end<1)append(at(end),b);
 }
 flush();return paths;
}
export function privatizeMandriaRoads(map){
 if(!map?.gameplay?.villaRelocation||!Array.isArray(map.roads))return {split:0,removed:0,pieces:0};
 let split=0,removed=0,pieces=0;
 map.roads=map.roads.flatMap(road=>{
  if(road.gameplay||!Array.isArray(road.p)||road.p.length<2)return [road];
  const paths=outsideParts(road.p);if(paths.length===1&&paths[0].length===road.p.length&&paths[0].every((p,i)=>same(p,road.p[i])))return [road];
  if(!paths.length){removed++;return [];}
  split++;pieces+=paths.length;
  return paths.map(p=>({...road,p,estateClipped:true}));
 });
 map.gameplay.mandriaPublicRoads={split,removed,pieces,privateLimits:MANDRIA_PRIVATE_LIMITS};
 return map.gameplay.mandriaPublicRoads;
}
export function segmentEntersMandria(a,b){
 const p=areaLocal(VILLA,...a),q=areaLocal(VILLA,...b),m=MANDRIA_PRIVATE_LIMITS;
 let enter=0,exit=1;
 for(const [origin,delta,min,max] of [[p.u,q.u-p.u,m.west,m.east],[p.v,q.v-p.v,m.south,m.north]]){
  if(Math.abs(delta)<1e-10){if(origin<min||origin>max)return false;}
  else{const s=(min-origin)/delta,t=(max-origin)/delta;enter=Math.max(enter,Math.min(s,t));exit=Math.min(exit,Math.max(s,t));}
 }
 return enter+1e-6<exit;
}
