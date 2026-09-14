import {nearestOnSegment} from './core.js';
// Subtract a convex road corridor from a footprint, retaining the outside pieces.
function clip(poly,a,b,inside){const out=[],side=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],sp=side(p),sq=side(q),ip=inside?sp>=0:sp<=0,iq=inside?sq>=0:sq<=0;if(ip)out.push(p);if(ip!==iq){const t=sp/(sp-sq);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}return out;}
function area(p){return Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;}
export function cutCorridor(poly,rect,minArea=.1){let remainder=poly;const pieces=[];for(let i=0;i<rect.length&&remainder.length>=3;i++){const a=rect[i],b=rect[(i+1)%rect.length],outside=clip(remainder,a,b,false);if(outside.length>=3&&area(outside)>minArea)pieces.push(outside);remainder=clip(remainder,a,b,true);}return pieces;}
function bounds(p){let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;for(const v of p){if(v[0]<minX)minX=v[0];if(v[0]>maxX)maxX=v[0];if(v[1]<minZ)minZ=v[1];if(v[1]>maxZ)maxZ=v[1];}return {minX,maxX,minZ,maxZ,cx:(minX+maxX)/2,cz:(minZ+maxZ)/2};}
function overlapsSegmentBox(b,s,pad){const minX=Math.min(s.a[0],s.b[0])-pad,maxX=Math.max(s.a[0],s.b[0])+pad,minZ=Math.min(s.a[1],s.b[1])-pad,maxZ=Math.max(s.a[1],s.b[1])+pad;return !(maxX<b.minX||minX>b.maxX||maxZ<b.minZ||minZ>b.maxZ);}
export function modernFootprints(buildings,terrain,{force=false}={}){const result=[];let corrected=0;
 // Startup must never walk ~88k buildings against the road spatial index on the
 // browser main thread. CityWorld calls this once while the bootstrap flag is
 // active; return the source footprints immediately. The loader then prepares
 // only the chunks that are actually streamed, using force:true.
 if(!force&&globalThis.__padovaFastStartup!==false){terrain.footprintCorrections=0;return buildings;}
 for(const building of buildings){if(building.n||building.authoredLandmark){result.push(building);continue;}
  const b=bounds(building.p),width=b.maxX-b.minX,depth=b.maxZ-b.minZ,radius=Math.max(width,depth)/2+5;let parts=[building.p],base=null;
  for(const s of terrain.roads.index.near(b.cx,b.cz,radius)){const road=s.profile.road;if(/footway|path|steps|cycleway|tram|pedestrian/.test(road.k))continue;const pad=road.w/2+2.25;if(!overlapsSegmentBox(b,s,pad))continue;
   const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],d=Math.hypot(dx,dz);if(d<.01)continue;const q=nearestOnSegment(b.cx,b.cz,s.a,s.b);if(Math.hypot(b.cx-q.x,b.cz-q.z)>radius+road.w/2)continue;
   if(road.crossing||road.tunnel||road.b||Number(road.layer)){
    base??=terrain.elevation(b.cx,b.cz);const h=terrain.roads.sample(road,q.x,q.z);if(h>base+building.h+.5||h+2<base)continue;
   }
   const w=road.w/2+.25,nx=-dz/d*w,nz=dx/d*w,ax=s.a[0]-dx/d*2,az=s.a[1]-dz/d*2,bx=s.b[0]+dx/d*2,bz=s.b[1]+dz/d*2;
   const rect=[[ax+nx,az+nz],[ax-nx,az-nz],[bx-nx,bz-nz],[bx+nx,bz+nz]];
   parts=parts.flatMap(p=>cutCorridor(p,rect));if(!parts.length)break;
  }
  if(parts.length!==1||Math.abs(area(parts[0])-area(building.p))>.05)corrected++;
  for(const p of parts)if(area(p)>.5)result.push({...building,p});
 }
 terrain.footprintCorrections=(terrain.footprintCorrections||0)+corrected;return result;
}
