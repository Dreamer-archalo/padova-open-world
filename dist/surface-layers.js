import {nearestOnSegment,SpatialIndex} from './core.js';
import {cutCorridor} from './modern-map.js';

export const isCarriageway = road => !/^(footway|path|steps|cycleway|tram|pedestrian)$/.test(road.k);

// Rendering and collision share the solved road profile. Cutting the actual
// triangles (rather than changing only DEM vertices) prevents interpolation
// through asphalt between samples. Elevated decks leave ground below intact.
export function roadCorridors(poly, terrain, {pedestrian=false, exclude=null}={}) {
  const xs=poly.map(p=>p[0]), zs=poly.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const x=(minX+maxX)/2,z=(minZ+maxZ)/2,r=Math.hypot(maxX-minX,maxZ-minZ)/2;
  // Use the original mapped segments for planar clipping. The 6 m physics
  // samples carry identical XY lines and would repeatedly cut the same polygon.
  if(!terrain.roads.renderIndex&&terrain.roads.profiles){
    const index=new SpatialIndex(100);
    for(const profile of terrain.roads.profiles.values())for(let i=1;i<profile.road.p.length;i++){
      const a=profile.road.p[i-1],b=profile.road.p[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.max(1,Math.ceil(length/100));
      for(let j=0;j<count;j++){const p=[a[0]+(b[0]-a[0])*j/count,a[1]+(b[1]-a[1])*j/count],q=[a[0]+(b[0]-a[0])*(j+1)/count,a[1]+(b[1]-a[1])*(j+1)/count],w=profile.road.w/2+1;
        index.add({a:p,b:q,profile,render:true},Math.min(p[0],q[0])-w,Math.min(p[1],q[1])-w,Math.max(p[0],q[0])+w,Math.max(p[1],q[1])+w);
      }
    }
    terrain.roads.renderIndex=index;
  }
  const result=[];
  for(const s of (terrain.roads.renderIndex||terrain.roads.index).near(x,z,r+12)) {
    const road=s.profile.road;
    if(road===exclude || pedestrian&&!isCarriageway(road))continue;
    const q=nearestOnSegment(x,z,s.a,s.b),w=road.w/2+.08;
    if(Math.hypot(q.x-x,q.z-z)>r+w)continue;
    const y=s.render?terrain.roads.sample(road,q.x,q.z):terrain.roads.segmentHeight(s,q.t),base=terrain.elevation(q.x,q.z);
    if(!pedestrian && road.crossing && y>base+1.4)continue;
    if(pedestrian && exclude && Math.abs(y-terrain.roads.sample(exclude,q.x,q.z))>3)continue;
    const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],len=Math.hypot(dx,dz);if(len<1e-6)continue;
    const ux=dx/len,uz=dz/len,nx=-uz*w,nz=ux*w;
    const ax=s.a[0]-ux*.08,az=s.a[1]-uz*.08,bx=s.b[0]+ux*.08,bz=s.b[1]+uz*.08;
    const theta=Math.atan2(dz,dx),rect=[];
    for(let i=0;i<=6;i++){const a=theta+Math.PI/2+i*Math.PI/6;rect.push([ax+Math.cos(a)*w,az+Math.sin(a)*w]);}
    for(let i=0;i<=6;i++){const a=theta-Math.PI/2+i*Math.PI/6;rect.push([bx+Math.cos(a)*w,bz+Math.sin(a)*w]);}
    result.push({rect,road});
  }
  return result;
}

export function clearRoadSurface(poly,terrain,options={}) {
  let parts=[poly];
  for(const {rect} of roadCorridors(poly,terrain,options)) {
    parts=parts.flatMap(p=>cutCorridor(p,rect,1e-8));
    if(!parts.length)break;
  }
  return parts;
}

export function surfaceBatch(batch,terrain,{pedestrian=false,exclude=null,height=null}={}) {
  return {
    tri(a,b,c,color) {
      const poly=[a,b,c].map(p=>[p[0],p[2]]),parts=clearRoadSurface(poly,terrain,{pedestrian,exclude});
      const den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
      if(Math.abs(den)<1e-9)return;
      const y=p=>{if(height)return height(...p);const u=((b[2]-c[2])*(p[0]-c[0])+(c[0]-b[0])*(p[1]-c[2]))/den,v=((c[2]-a[2])*(p[0]-c[0])+(a[0]-c[0])*(p[1]-c[2]))/den;return u*a[1]+v*b[1]+(1-u-v)*c[1];};
      for(const p of parts)for(let i=1;i<p.length-1;i++)batch.tri([p[0][0],y(p[0]),p[0][1]],[p[i][0],y(p[i]),p[i][1]],[p[i+1][0],y(p[i+1]),p[i+1][1]],color);
    },
    quad(a,b,c,d,color){this.tri(a,b,c,color);this.tri(a,c,d,color);}
  };
}
