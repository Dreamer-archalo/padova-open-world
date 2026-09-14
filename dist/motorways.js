import {clearRailAccess,roadAccessIndex} from './guardrail-access.js';
import {vehicleFootprint} from './movement.js';
import {nearestOnSegment} from './core.js';
export const motorway=road=>/^(motorway|trunk)(?:_link)?$/.test(road.k);

// Guardrails are regular collision prisms, shared with the camera/projectiles.
// Gaps are cut in metres along a way, never implemented as disabled collisions.
function railPoints(profile){
 const points=profile.points,out=[points[0]];let last=0;
 for(let i=2;i<points.length;i++){
  const a=points[last],b=points[i];let error=0;
  for(let j=last+1;j<i;j++){const q=nearestOnSegment(...points[j],a,b);error=Math.max(error,Math.hypot(q.x-points[j][0],q.z-points[j][1]));}
  if(Math.hypot(b[0]-a[0],b[1]-a[1])>24||error>.3){out.push(points[i-1]);last=i-1;}
 }
 if(out.at(-1)!==points.at(-1))out.push(points.at(-1));return out;
}
export function motorwayBarriers(terrain){
 const result=[],gaps=[],rampSites=[],profiles=[...terrain.roads.profiles.values()].filter(p=>motorway(p.road)),index=roadAccessIndex(terrain);
 const paths=profiles.map(profile=>{const points=railPoints(profile),lengths=points.slice(1).map((b,i)=>Math.hypot(b[0]-points[i][0],b[1]-points[i][1]));return {profile,points,lengths,total:lengths.reduce((a,b)=>a+b,0)};});
 // Shared world-space openings line up across the parallel carriageways. Their
 // separation is measured in metres, independent of OSM way fragmentation.
 for(const path of [...paths].sort((a,b)=>b.total-a.total)){
  const {profile,points,lengths,total}=path,road=profile.road;if(road.crossing||road.k.endsWith('_link')||total<35)continue;
  for(let at=Math.min(total/2,150);at<total-12;at+=650){let travelled=0,i=0;while(i<lengths.length-1&&travelled+lengths[i]<at)travelled+=lengths[i++];
   const a=points[i],b=points[i+1],t=(at-travelled)/lengths[i],x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,yaw=Math.atan2(b[0]-a[0],b[1]-a[1]),y=terrain.roads.sample(road,x,z);
   if(gaps.some(g=>Math.hypot(g.x-x,g.z-z)<850)||terrain.waterDistance(x,z)<25)continue;
   const junction=[...index.near(x,z,35)].some(s=>{if(s.profile===profile)return false;const q=nearestOnSegment(x,z,s.a,s.b),angle=Math.atan2(s.b[0]-s.a[0],s.b[1]-s.a[1]);return Math.abs(Math.sin(yaw-angle))>.2&&Math.hypot(q.x-x,q.z-z)<road.w/2+s.profile.road.w/2+15&&Math.abs(terrain.roads.sample(s.profile.road,q.x,q.z)-y)<2.1;});
   if(!junction)gaps.push({x,z,y,yaw,length:12,road:road.n||road.k,roadId:profile.id,start:at-6,end:at+6});
  }
 }
 // A handful of short outer-shoulder openings are reserved for authored jump
 // ramps. Prefer the side with less parallel road infrastructure beyond it.
 for(const path of [...paths].sort((a,b)=>b.total-a.total)){
  if(rampSites.length>=12)break;
  const {profile,points,lengths,total}=path,road=profile.road;if(road.crossing||road.k.endsWith('_link')||total<70)continue;
  const at=total*.52;let travelled=0,i=0;while(i<lengths.length-1&&travelled+lengths[i]<at)travelled+=lengths[i++];
  const a=points[i],b=points[i+1],t=(at-travelled)/lengths[i],x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,yaw=Math.atan2(b[0]-a[0],b[1]-a[1]),y=terrain.roads.sample(road,x,z);
  if(x<-5900||x>7200||z<-6400||z>6200||Math.hypot(x,z)<1700||terrain.waterDistance(x,z)<35||rampSites.some(r=>Math.hypot(r.x-x,r.z-z)<1400)||gaps.some(g=>Math.hypot(g.x-x,g.z-z)<90))continue;
  let best=null;for(const side of [-1,1]){const ox=x+Math.cos(yaw)*side*(road.w/2+18),oz=z-Math.sin(yaw)*side*(road.w/2+18);let traffic=0;for(const s of index.near(ox,oz,18)){if(s.profile===profile)continue;const q=nearestOnSegment(ox,oz,s.a,s.b);if(Math.hypot(q.x-ox,q.z-oz)<s.profile.road.w/2+8&&Math.abs(terrain.roads.sample(s.profile.road,q.x,q.z)-y)<3)traffic++;}if(!best||traffic<best.traffic)best={side,traffic};}
  if(!best||best.traffic>1)continue;const side=best.side,rx=x+Math.cos(yaw)*side*(road.w/2+.65),rz=z-Math.sin(yaw)*side*(road.w/2+.65),site={x:rx,z:rz,y,yaw,side,road,profileId:profile.id,length:12,kind:'ramp'};rampSites.push(site);gaps.push(site);
 }
 let accessCuts=0;
 for(const {profile,points,lengths} of paths){const road=profile.road;
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],len=lengths[i-1];if(!len)continue;const yaw=Math.atan2(b[0]-a[0],b[1]-a[1]),sides=[-1,1];if(!road.oneway&&!road.one&&road.w>=12)sides.push(0);
   for(const side of sides){const offset=side*(road.w/2+.65),dx=Math.cos(yaw)*offset,dz=-Math.sin(yaw)*offset,p0=[a[0]+dx,a[1]+dz],p1=[b[0]+dx,b[1]+dz],parts=clearRailAccess(p0,p1,profile,terrain,{gaps,side});
    if(parts.length!==1||Math.abs((parts[0]?.[1]||0)-len)>.01||(parts[0]?.[0]||0)>.01)accessCuts++;
    for(const [start,end] of parts){if(end-start<1)continue;const t=(start+end)/2/len,x=p0[0]+(p1[0]-p0[0])*t,z=p0[1]+(p1[1]-p0[1])*t,p=vehicleFootprint(x,z,yaw,side===0?.65:.3,end-start),cornerY=p.map(q=>terrain.roads.sample(road,...q)),y=Math.min(...cornerY),drawHeight=side===0?.9:.85,xs=p.map(p=>p[0]),zs=p.map(p=>p[1]);
     result.push({x,z,p,y,minY:y,h:Math.max(...cornerY)-y+drawHeight,cornerY,drawHeight,kind:side===0?'median':'guardrail',color:side===0?'#abb0a8':'#a1afb0',road,profileId:profile.id,side,solid:true,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)});
    }
   }
  }
 }
 terrain.motorwayAudit={barriers:result.length,gaps:gaps.filter(g=>g.kind!=='ramp'),rampSites,accessCuts};return result;
}
