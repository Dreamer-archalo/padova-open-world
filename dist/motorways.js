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
 const result=[],gaps=[];
 for(const profile of terrain.roads.profiles.values()){
  const road=profile.road;if(!motorway(road))continue;
  const points=railPoints(profile),lengths=points.slice(1).map((b,i)=>Math.hypot(b[0]-points[i][0],b[1]-points[i][1])),total=lengths.reduce((a,b)=>a+b,0);
  const gap=total>50&&profile.id%13===0&&!road.crossing&&!road.k.endsWith('_link')?[total/2-6,total/2+6]:null;
  let travelled=0;
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],len=lengths[i-1];if(!len)continue;
   const intervals=[[0,len]];
   if(gap&&travelled<gap[1]&&travelled+len>gap[0]){intervals.length=0;if(gap[0]>travelled)intervals.push([0,gap[0]-travelled]);if(gap[1]<travelled+len)intervals.push([gap[1]-travelled,len]);}
   const yaw=Math.atan2(b[0]-a[0],b[1]-a[1]);
   for(const [start,end] of intervals){if(end-start<.1)continue;const t=(start+end)/2/len,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,y=terrain.roads.sample(road,x,z);
    const sides=[-1,1];if(!road.oneway&&!road.one&&road.w>=12)sides.push(0);
    for(const side of sides){const offset=side*(road.w/2+.65),px=x+Math.cos(yaw)*offset,pz=z-Math.sin(yaw)*offset;
     const junction=[...terrain.roads.index.near(px,pz,8)].some(s=>{if(s.profile===profile)return false;const q=nearestOnSegment(px,pz,s.a,s.b),otherYaw=Math.atan2(s.b[0]-s.a[0],s.b[1]-s.a[1]);return Math.abs(Math.sin(yaw-otherYaw))>.25&&Math.hypot(px-q.x,pz-q.z)<s.profile.road.w/2+3&&Math.abs(terrain.roads.segmentHeight(s,q.t)-y)<2;});
     if(junction)continue;
     const p=vehicleFootprint(px,pz,yaw,side===0?.65:.3,end-start+.035),xs=p.map(p=>p[0]),zs=p.map(p=>p[1]);
     result.push({x:px,z:pz,p,y,minY:y,h:side===0?1.05:.85,kind:side===0?'median':'guardrail',color:side===0?'#abb0a8':'#a1afb0',road,solid:true,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)});
    }
   }
   if(gap&&travelled<=gap[0]&&travelled+len>gap[0])gaps.push({road:road.n||road.k,roadId:profile.id,length:12,start:gap[0],end:gap[1]});
   travelled+=len;
  }
 }
 terrain.motorwayAudit={barriers:result.length,gaps};return result;
}
