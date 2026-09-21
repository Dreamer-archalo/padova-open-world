// Preserve traffic on original public streets by adding only obstacle-cleared
// detours OUTSIDE the private Mandria border. Unsafe alternatives stay blocked.
import {pointInside,nearestOnSegment} from './core.js';
import {VILLA,areaLocal,areaPoint} from './gameplay-areas-implementation.js';
export const MANDRIA_PRIVATE_LIMITS=Object.freeze({west:-132,east:132,south:-97,north:62});
const same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<.025;
function outsideParts(points,limits=MANDRIA_PRIVATE_LIMITS){
 const paths=[];let current=[];
 const flush=()=>{if(current.length>=2)paths.push(current);current=[];};
 const append=(a,b)=>{if(same(a,b))return;if(current.length&&!same(current.at(-1),a))flush();if(!current.length)current.push(a);current.push(b);};
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],p=areaLocal(VILLA,...a),q=areaLocal(VILLA,...b);
  let start=0,end=1;
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
export function segmentEntersMandria(a,b){
 const p=areaLocal(VILLA,...a),q=areaLocal(VILLA,...b),m=MANDRIA_PRIVATE_LIMITS;
 let enter=0,exit=1;
 for(const [origin,delta,min,max] of [[p.u,q.u-p.u,m.west,m.east],[p.v,q.v-p.v,m.south,m.north]]){
  if(Math.abs(delta)<1e-10){if(origin<min||origin>max)return false;}
  else{const s=(min-origin)/delta,t=(max-origin)/delta;enter=Math.max(enter,Math.min(s,t));exit=Math.min(exit,Math.max(s,t));}
 }
 return enter+1e-6<exit;
}
const length=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const world=([u,v])=>{const p=areaPoint(VILLA,u,v);return [p.x,p.z];};
function anchor(p,b){
 const loc=areaLocal(VILLA,...p),m=MANDRIA_PRIVATE_LIMITS;
 const edges=[['west',Math.abs(loc.u-m.west)],['east',Math.abs(loc.u-m.east)],['south',Math.abs(loc.v-m.south)],['north',Math.abs(loc.v-m.north)]];
 const side=edges.sort((a,b)=>a[1]-b[1])[0][0];
 return side==='west'?[b.west,Math.max(b.south,Math.min(b.north,loc.v))]:
  side==='east'?[b.east,Math.max(b.south,Math.min(b.north,loc.v))]:
  side==='south'?[Math.max(b.west,Math.min(b.east,loc.u)),b.south]:
  [Math.max(b.west,Math.min(b.east,loc.u)),b.north];
}
function boundaryPosition(p,b){const width=b.east-b.west,depth=b.north-b.south;
 if(Math.abs(p[1]-b.north)<.02)return p[0]-b.west;
 if(Math.abs(p[0]-b.east)<.02)return width+b.north-p[1];
 if(Math.abs(p[1]-b.south)<.02)return width+depth+b.east-p[0];
 return 2*width+depth+p[1]-b.south;
}
function ringPoint(s,b){const w=b.east-b.west,h=b.north-b.south,p=2*(w+h),t=((s%p)+p)%p;
 if(t<=w)return [b.west+t,b.north];if(t<=w+h)return [b.east,b.north-(t-w)];
 if(t<=2*w+h)return [b.east-(t-w-h),b.south];return [b.west,b.south+(t-2*w-h)];
}
function surround(a,c,b,clockwise){const w=b.east-b.west,h=b.north-b.south,P=2*(w+h);
 const from=boundaryPosition(a,b),to=boundaryPosition(c,b),corners=[0,w,w+h,2*w+h,P];let stops=[];
 if(clockwise){const end=to<from?to+P:to;
  for(const corner of [...corners,...corners.map(x=>x+P)])if(corner>from+.01&&corner<end-.01)stops.push(corner);
  stops.sort((x,y)=>x-y);
 }else{const end=to>from?to-P:to;
  for(const corner of [...corners,...corners.map(x=>x-P)])if(corner<from-.01&&corner>end+.01)stops.push(corner);
  stops.sort((x,y)=>y-x);
 }
 return [a,...stops.map(s=>ringPoint(s,b)),c];
}
// Construct the polygon bounding boxes ONCE instead of thousands of times
// during the 3-metre clearance sampling of candidate bypass routes.
const obstacleIndex=new WeakMap();
function obstacles(map){let index=obstacleIndex.get(map);if(index)return index;
 const all=[...(map.buildings||[]),...(map.water||[]),...(map.areas||[]).filter(o=>o.k==='water'||o.k==='cemetery'||o.k==='grave_yard')];
 index=[];const limit={minX:VILLA.x-435,maxX:VILLA.x+435,minZ:VILLA.z-435,maxZ:VILLA.z+435};
 for(const o of all){const poly=o.p;if(!Array.isArray(poly)||poly.length<3)continue;
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const vertex of poly){if(!Array.isArray(vertex))continue;minX=Math.min(minX,vertex[0]);maxX=Math.max(maxX,vertex[0]);minZ=Math.min(minZ,vertex[1]);maxZ=Math.max(maxZ,vertex[1]);}
  if(!Number.isFinite(minX)||maxX<limit.minX||minX>limit.maxX||maxZ<limit.minZ||minZ>limit.maxZ)continue;
  index.push({poly,minX,maxX,minZ,maxZ});
 }
 obstacleIndex.set(map,index);return index;
}
function obstacleClear(map,p,r){
 for(const {poly,minX,maxX,minZ,maxZ} of obstacles(map)){
  if(p[0]+r<minX||p[0]-r>maxX||p[1]+r<minZ||p[1]-r>maxZ)continue;
  if(pointInside(p[0],p[1],poly))return false;
  for(let i=0;i<poly.length;i++){const q=nearestOnSegment(p[0],p[1],poly[i],poly[(i+1)%poly.length]);
   if(Math.hypot(p[0]-q.x,p[1]-q.z)<r)return false;
  }
 }
 return true;
}
function safeDetour(map,path,width){for(let i=1;i<path.length;i++){
 const a=path[i-1],b=path[i],steps=Math.max(1,Math.ceil(length(a,b)/3));
 if(segmentEntersMandria(a,b))return false;
 for(let n=0;n<=steps;n++){
  const t=n/steps,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  if((i===1&&n===0||i===path.length-1&&n===steps))continue;
  if(!obstacleClear(map,p,Math.max(2.5,width*.5+1.4)))return false;
 }
 }return true;}
function bypass(map,start,end,width){
 if(same(start,end))return null;
 const options=[];
 for(const pad of [9,13,18,25,34]){
  const b={west:MANDRIA_PRIVATE_LIMITS.west-pad,east:MANDRIA_PRIVATE_LIMITS.east+pad,south:MANDRIA_PRIVATE_LIMITS.south-pad,north:MANDRIA_PRIVATE_LIMITS.north+pad};
  const a=anchor(start,b),c=anchor(end,b);
  for(const clockwise of [true,false]){
   const points=[start,...surround(a,c,b,clockwise).map(world),end].filter((p,i,arr)=>i===0||!same(p,arr[i-1]));
   if(!safeDetour(map,points,width))continue;
   options.push({points,length:points.slice(1).reduce((total,p,i)=>total+length(p,points[i]),0)});
  }
 }
 options.sort((a,b)=>a.length-b.length);return options[0]?.points||null;
}
export function privatizeMandriaRoads(map){
 if(!map?.gameplay?.villaRelocation||!Array.isArray(map.roads))return {split:0,removed:0,pieces:0};
 const privateAccess=map.gameplay.roads.filter(r=>/^(Accesso Villa della Mandria|Viale Villa della Mandria)$/.test(r.n||''));
 for(const road of privateAccess){road.access='private';road.estateAuthorized=true;if(road.n==='Accesso Villa della Mandria')road.w=5.5;}
 let split=0,removed=0,pieces=0,bypasses=0,bypassRejected=0;
 map.roads=map.roads.flatMap(road=>{
  if(road.gameplay||!Array.isArray(road.p)||road.p.length<2)return [road];
  const paths=outsideParts(road.p);
  if(paths.length===1&&paths[0].length===road.p.length&&paths[0].every((p,i)=>same(p,road.p[i])))return [road];
  if(!paths.length){removed++;return [];}
  split++;pieces+=paths.length;
  const parts=paths.map(p=>({...road,p,estateClipped:true}));
  for(let i=0;i<paths.length-1;i++){
   const way=bypass(map,paths[i].at(-1),paths[i+1][0],road.w||5);
   if(way){parts.push({...road,p:way,estateBypass:true});bypasses++;}
   else bypassRejected++;
  }
  return parts;
 });
 map.gameplay.mandriaPublicRoads={split,removed,pieces,bypasses,bypassRejected,privateDriveways:privateAccess.length,privateLimits:MANDRIA_PRIVATE_LIMITS};
 return map.gameplay.mandriaPublicRoads;
}
