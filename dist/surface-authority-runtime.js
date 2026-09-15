import {Terrain} from './terrain.js';
import {RoadSurfaces} from './road-surfaces.js';
import {ensureSurfaceResolver} from './world-surface-resolver.js';

// Final adapter installed after the historical terrain/profile patches. Those
// patches may prepare DEM/profile source data, but all runtime surface queries
// leave through WorldSurfaceResolver. This removes the former late road-reality
// correction path that changed visuals without changing gameplay support.
const baseSegmentHeight=RoadSurfaces.prototype.segmentHeight;
if(!RoadSurfaces.prototype.__worldSurfaceAuthority){
  RoadSurfaces.prototype.__worldSurfaceAuthority=true;
  RoadSurfaces.prototype.segmentHeight=function(s,t){
    const solved=baseSegmentHeight.call(this,s,t),resolver=this.terrain?.surfaceResolver;
    return resolver?resolver.resolveRoadSegment(s,t,solved):solved;
  };
}

const fallbackGroundHeight=Terrain.prototype.groundHeight;
if(!Terrain.prototype.__worldSurfaceAuthority){
  Terrain.prototype.__worldSurfaceAuthority=true;
  Terrain.prototype.groundHeight=function(x,z){
    // Preserve the loader's intentionally cheap pre-world path. Once the initial
    // build begins, the resolver is the sole authority for urban/river/road blend.
    if(globalThis.__padovaFastStartup!==false)return this.elevation(x,z);
    if(this.modern&&this.roads)return ensureSurfaceResolver(this).getGroundHeight(x,z);
    return fallbackGroundHeight.call(this,x,z);
  };
}
