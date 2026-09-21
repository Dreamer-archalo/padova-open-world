// Only mapped public roads are clipped: the authored private driveway stays intact.
// Route around the property with obstacle-tested, rounded turns rather than zigzags.
import {pointInside,nearestOnSegment} from './core.js';
import {VILLA,areaLocal,areaPoint} from './gameplay-areas-implementation.js';
export const MANDRIA_PRIVATE_LIMITS=Object.freeze({west:-132,east:132,south:-97,north:62});
// A road is a ribbon, not a zero-width line. Clip its centre several metres
// outside the estate so shoulders never enter the boundary at the junction.
export const MANDRIA_PUBLIC_EXCLUSION=Object.freeze({west:-139,east:139,south:-104,north:69});
const same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<.025;
const length=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const world=([u,v])=>{const p=areaPoint(VILLA,u,v);return [p.x,p.z];};
function outsideParts(points,limits=MANDRIA_PUBLIC_EXCLUSION){
 const paths=[];let current=[];
 const flush=()=>{if(current.length>=2)paths.push(current);current=[];};
 const append=(a,b)=>{if(same(a,b))return;if(current.length&&!same(current.at(-1),a))flush();if(!current.length)current.push(a);current.push(b);};
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],p=areaLocal(VILLA,...a),q=areaLocal(VILLA,...b);let lo=0,hi=1;
  for(const [origin,delta,min,max] of [[p.u,q.u-p.u,limits.west,limits.east],[p.v,q.v-p.v,limits.south,limits.north]]){
   if(Math.abs(delta)<1e-10){if(origin<min||origin>max){lo=1;hi=0;break;}}
   else{const s=(min-origin)/delta,t=(max-origin)/delta;lo=Math.max(lo,Math.min(s,t));hi=Math.min(hi,Math.max(s,t));}
  }
  if(lo>=hi){append(a,b);continue;}
  const at=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  if(lo>0)append(a,at(lo));flush();if(hi<1)append(at(hi),b);
 }flush();return paths;
}
export function segmentEntersMandria(a,b,limits=MANDRIA_PUBLIC_EXCLUSION){
 const p=areaLocal(VILLA,...a),q=areaLocal(VILLA,...b);let enter=0,exit=1;
 for(const [origin,delta,min,max] of [[p.u,q.u-p.u,limits.west,limits.east],[p.v,q.v-p.v,limits.south,limits.north]]){
  if(Math.abs(delta)<1e-10){if(origin<min||origin>max)return false;}
  else{const s=(min-origin)/delta,t=(max-origin)/delta;enter=Math.max(enter,Math.min(s,t));exit=Math.min(exit,Math.max(s,t));}
 }return enter+1e-6<exit;
}
function anchor(p,b){const loc=areaLocal(VILLA,...p),m=MANDRIA_PUBLIC_EXCLUSION;
 const sides=[['west',Math.abs(loc.u-m.west)],['east',Math.abs(loc.u-m.east)],['south',Math.abs(loc.v-m.south)],['north',Math.abs(loc.v-m.north)]];
 const side=sides.sort((a,b)=>a[1]-b[1])[0][0];
 return side==='west'?[b.west,Math.max(b.south,Math.min(b.north,loc.v))]:
  side==='east'?[b.east,Math.max(b.south,Math.min(b.north,loc.v))]:
  side==='south'?[Math.max(b.west,Math.min(b.east,loc.u)),b.south]:
  [Math.max(b.west,Math.min(b.east,loc.u)),b.north];
}
function boundaryPosition(p,b){const w=b.east-b.west,h=b.north-b.south;
 if(Math.abs(p[1]-b.north)<.02)return p[0]-b.west;
 if(Math.abs(p[0]-b.east)<.02)return w+b.north-p[1];
 if(Math.abs(p[1]-b.south)<.02)return w+h+b.east-p[0];
 return 2*w+h+p[1]-b.south;
}
function ringPoint(s,b){const w=b.east-b.west,h=b.north-b.south,P=2*(w+h),t=((s%P)+P)%P;
 if(t<=w)return [b.west+t,b.north];if(t<=w+h)return [b.east,b.north-(t-w)];
 if(t<=2*w+h)return [b.east-(t-w-h),b.south];return [b.west,b.south+(t-2*w-h)];
}
function surround(a,c,b,clockwise){const w=b.east-b.west,h=b.north-b.south,P=2*(w+h),from=boundaryPosition(a,b),to=boundaryPosition(c,b),corners=[0,w,w+h,2*w+h,P],stops=[];
 if(clockwise){const end=to<from?to+P:to;
  for(const k of [...corners,...corners.map(x=>x+P)])if(k>from+.01&&k<end-.01)stops.push(k);
  stops.sort((x,y)=>x-y);
 }else{const end=to>from?to-P:to;
  for(const k of [...corners,...corners.map(x=>x-P)])if(k<from-.01&&k>end+.01)stops.push(k);
  stops.sort((x,y)=>y-x);
 }return [a,...stops.map(s=>ringPoint(s,b)),c];
}
const obstacleIndex=new WeakMap();
function obstacles(map){let index=obstacleIndex.get(map);if(index)return index;
 const all=[...(map.buildings||[]),...(map.water||[]),...(map.areas||[]).filter(o=>o.k==='water'||o.k==='cemetery'||o.k==='grave_yard')];
 index=[];const limit={minX:VILLA.x-475,maxX:VILLA.x+475,minZ:VILLA.z-475,maxZ:VILLA.z+475};
 for(const o of all){const poly=o.p;if(!Array.isArray(poly)||poly.length<3)continue;
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const vertex of poly){if(!Array.isArray(vertex))continue;minX=Math.min(minX,vertex[0]);maxX=Math.max(maxX,vertex[0]);minZ=Math.min(minZ,vertex[1]);maxZ=Math.max(maxZ,vertex[1]);}
  if(!Number.isFinite(minX)||maxX<limit.minX||minX>limit.maxX||maxZ<limit.minZ||minZ>limit.maxZ)continue;
  index.push({poly,minX,maxX,minZ,maxZ});
 }obstacleIndex.set(map,index);return index;
}
function obstacleClear(map,p,r){for(const {poly,minX,maxX,minZ,maxZ} of obstacles(map)){
  if(p[0]+r<minX||p[0]-r>maxX||p[1]+r<minZ||p[1]-r>maxZ)continue;
  if(pointInside(p[0],p[1],poly))return false;
  for(let i=0;i<poly.length;i++){const q=nearestOnSegment(p[0],p[1],poly[i],poly[(i+1)%poly.length]);
   if(Math.hypot(p[0]-q.x,p[1]-q.z)<r)return false;
  }
 }return true;}
function safeDetour(map,path,width){for(let i=1;i<path.length;i++){
 const a=path[i-1],b=path[i],n=Math.max(1,Math.ceil(length(a,b)/2.4));
 if(segmentEntersMandria(a,b))return false;
 for(let k=0;k<=n;k++){
  if(i===1&&k===0||i===path.length-1&&k===n)continue;
  const t=k/n,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  if(!obstacleClear(map,p,Math.max(2.5,width*.5+1.4)))return false;
 }
 }return true;}
function simplify(map,points,width){if(points.length<3)return points;
 const result=[points[0]];let i=0;
 while(i<points.length-1){let next=i+1;
  for(let j=points.length-1;j>i+1;j--)if(safeDetour(map,[points[i],points[j]],width)){next=j;break;}
  result.push(points[next]);i=next;
 }return result;
}
function rounded(map,points,width){if(points.length<3)return points;const result=[points[0]];
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],p=points[i],b=points[i+1],da=length(a,p),db=length(p,b),cut=Math.min(12,da*.30,db*.30);
  if(cut<1.5){result.push(p);continue;}
  const inP=[p[0]+(a[0]-p[0])*cut/da,p[1]+(a[1]-p[1])*cut/da],outP=[p[0]+(b[0]-p[0])*cut/db,p[1]+(b[1]-p[1])*cut/db];
  const arc=[inP];for(let n=1;n<=5;n++){const t=n/5,one=1-t;arc.push([one*one*inP[0]+2*one*t*p[0]+t*t*outP[0],one*one*inP[1]+2*one*t*p[1]+t*t*outP[1]]);}
  if(safeDetour(map,[result.at(-1),...arc,b],width))result.push(...arc);
  else result.push(p);
 }
 result.push(points.at(-1));return safeDetour(map,result,width)?result:points;
}
function cost(points){let total=0;for(let i=1;i<points.length;i++)total+=length(points[i-1],points[i]);
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],p=points[i],b=points[i+1],x=p[0]-a[0],y=p[1]-a[1],z=b[0]-p[0],w=b[1]-p[1],den=Math.hypot(x,y)*Math.hypot(z,w);
  if(den>1e-4)total+=8*(1-(x*z+y*w)/den);
 }return total;
}
function bypass(map,start,end,width){if(same(start,end))return null;const options=[];
 for(const pad of [8,12,18,25,34,45,60]){
  const m=MANDRIA_PUBLIC_EXCLUSION,b={west:m.west-pad,east:m.east+pad,south:m.south-pad,north:m.north+pad};
  const a=anchor(start,b),c=anchor(end,b);
  for(const clockwise of [true,false]){
   const raw=[start,...surround(a,c,b,clockwise).map(world),end].filter((p,i,arr)=>i===0||!same(p,arr[i-1]));
   if(!safeDetour(map,raw,width))continue;
   const direct=simplify(map,raw,width),smooth=rounded(map,direct,width);
   if(!safeDetour(map,smooth,width))continue;
   options.push({points:smooth,cost:cost(smooth)});
  }
 }options.sort((a,b)=>a.cost-b.cost);return options[0]?.points||null;
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
  split++;pieces+=paths.length;const parts=paths.map(p=>({...road,p,estateClipped:true}));
  for(let i=0;i<paths.length-1;i++){
   const route=bypass(map,paths[i].at(-1),paths[i+1][0],road.w||5);
   if(route){parts.push({...road,p:route,estateBypass:true,estateSmoothBypass:true});bypasses++;}
   else bypassRejected++;
  }return parts;
 });
 map.gameplay.mandriaPublicRoads={split,removed,pieces,bypasses,bypassRejected,privateDriveways:privateAccess.length,privateLimits:MANDRIA_PRIVATE_LIMITS,publicExclusion:MANDRIA_PUBLIC_EXCLUSION};
 return map.gameplay.mandriaPublicRoads;
}
