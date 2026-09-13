import {SpatialIndex,nearestOnSegment} from './core.js';

export function subtractIntervals(length,cuts){
 const sorted=cuts.map(([a,b])=>[Math.max(0,a),Math.min(length,b)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
 const parts=[];let at=0;for(const [a,b] of sorted){if(a>at+.05)parts.push([at,a]);at=Math.max(at,b);}if(at<length-.05)parts.push([at,length]);return parts;
}
// Exact line/capsule intersection, including shallow merging ramps and rounded
// road ends. Checking only a rail's midpoint misses both of those cases.
export function capsuleIntervals(a,b,c,d,radius){
 const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<1e-7)return [];
 const vx=dx/length,vz=dz/length,ex=d[0]-c[0],ez=d[1]-c[1],n=Math.hypot(ex,ez),cuts=[];
 const circle=p=>{const x=a[0]-p[0],z=a[1]-p[1],dot=x*vx+z*vz,det=dot*dot-(x*x+z*z-radius*radius);if(det>=0)cuts.push([-dot-Math.sqrt(det),-dot+Math.sqrt(det)]);};
 circle(c);circle(d);if(n<1e-7)return cuts;
 const ux=ex/n,uz=ez/n,x=a[0]-c[0],z=a[1]-c[1];let lo=0,hi=length;
 const clip=(v,d,min,max)=>{if(Math.abs(d)<1e-9)return v>=min&&v<=max;const a=(min-v)/d,b=(max-v)/d;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));return hi>=lo;};
 if(clip(x*ux+z*uz,vx*ux+vz*uz,0,n)&&clip(-x*uz+z*ux,-vx*uz+vz*ux,-radius,radius))cuts.push([lo,hi]);return cuts;
}
export function roadAccessIndex(terrain){
 if(terrain.roads.accessIndex)return terrain.roads.accessIndex;
 const index=new SpatialIndex(100);
 for(const profile of terrain.roads.profiles.values())for(let i=1;i<profile.road.p.length;i++){
  const a=profile.road.p[i-1],b=profile.road.p[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/80));
  for(let j=0;j<n;j++){const p=[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n],q=[a[0]+(b[0]-a[0])*(j+1)/n,a[1]+(b[1]-a[1])*(j+1)/n],pad=profile.road.w/2+3;index.add({a:p,b:q,profile},Math.min(p[0],q[0])-pad,Math.min(p[1],q[1])-pad,Math.max(p[0],q[0])+pad,Math.max(p[1],q[1])+pad);}
 }
 terrain.roads.accessIndex=index;return index;
}
export function clearRailAccess(a,b,profile,terrain,{margin=1.35,gaps=[],side=1}={}){
 const length=Math.hypot(b[0]-a[0],b[1]-a[1]),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,cuts=[];
 if(length<.01)return [];
 for(const other of roadAccessIndex(terrain).near(x,z,length/2+20)){
  if(other.profile===profile&&side===0)continue;
  const pad=other.profile===profile ? .23 : margin;
  for(const [start,end] of capsuleIntervals(a,b,other.a,other.b,other.profile.road.w/2+pad)){
   const lo=Math.max(0,start),hi=Math.min(length,end);if(hi<=lo)continue;
   const deltas=[lo,(lo+hi)/2,hi].map(at=>{const t=at/length,px=a[0]+(b[0]-a[0])*t,pz=a[1]+(b[1]-a[1])*t,q=nearestOnSegment(px,pz,other.a,other.b);return Math.abs(terrain.roads.sample(profile.road,px,pz)-terrain.roads.sample(other.profile.road,q.x,q.z));});
   if(Math.min(...deltas)<4.2)cuts.push([lo,hi]);
  }
 }
 for(const gap of gaps){
  const dx=b[0]-a[0],dz=b[1]-a[1];if(Math.abs((dx*Math.sin(gap.yaw)+dz*Math.cos(gap.yaw))/length)<.85)continue;
  if(Math.abs(terrain.roads.sample(profile.road,x,z)-gap.y)>2.1)continue;
  const u=(x-gap.x)*Math.cos(gap.yaw)-(z-gap.z)*Math.sin(gap.yaw);if(Math.abs(u)>35)continue;
  const v0=(a[0]-gap.x)*Math.sin(gap.yaw)+(a[1]-gap.z)*Math.cos(gap.yaw),rate=(dx*Math.sin(gap.yaw)+dz*Math.cos(gap.yaw))/length;
  if(Math.abs(rate)>.01){const c=(-gap.length/2-v0)/rate,d=(gap.length/2-v0)/rate;cuts.push([Math.min(c,d),Math.max(c,d)]);}
 }
 return subtractIntervals(length,cuts);
}
