import {nearestOnSegment} from './core.js';
// Subtract a convex road corridor from a footprint, retaining the outside pieces.
function clip(poly,a,b,inside){const out=[],side=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],sp=side(p),sq=side(q),ip=inside?sp>=0:sp<=0,iq=inside?sq>=0:sq<=0;if(ip)out.push(p);if(ip!==iq){const t=sp/(sp-sq);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}return out;}
function area(p){return Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;}
export function cutCorridor(poly,rect,minArea=.1){let remainder=poly;const pieces=[];for(let i=0;i<rect.length&&remainder.length>=3;i++){const a=rect[i],b=rect[(i+1)%rect.length],outside=clip(remainder,a,b,false);if(outside.length>=3&&area(outside)>minArea)pieces.push(outside);remainder=clip(remainder,a,b,true);}return pieces;}
export function modernFootprints(buildings,terrain){const result=[];let corrected=0;
 for(const building of buildings){if(building.n||building.authoredLandmark){result.push(building);continue;}
  const xs=building.p.map(p=>p[0]),zs=building.p.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2,radius=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))/2+5;let parts=[building.p];
  for(const s of terrain.roads.index.near(cx,cz,radius)){const road=s.profile.road;if(/footway|path|steps|cycleway|tram|pedestrian/.test(road.k))continue;
   const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],d=Math.hypot(dx,dz);if(d<.01)continue;const q=nearestOnSegment(cx,cz,s.a,s.b);if(Math.hypot(cx-q.x,cz-q.z)>radius+road.w/2)continue;
   const h=terrain.roads.sample(road,q.x,q.z),base=terrain.elevation(cx,cz);if(h>base+building.h+.5||h+2<base)continue;
   const w=road.w/2+.25,nx=-dz/d*w,nz=dx/d*w,ax=s.a[0]-dx/d*2,az=s.a[1]-dz/d*2,bx=s.b[0]+dx/d*2,bz=s.b[1]+dz/d*2;
   const rect=[[ax+nx,az+nz],[ax-nx,az-nz],[bx-nx,bz-nz],[bx+nx,bz+nz]];
   parts=parts.flatMap(p=>cutCorridor(p,rect));if(!parts.length)break;
  }
  if(parts.length!==1||Math.abs(area(parts[0])-area(building.p))>.05)corrected++;
  for(const p of parts)if(area(p)>.5)result.push({...building,p});
 }
 terrain.footprintCorrections=corrected;return result;
}
