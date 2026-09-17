import {Terrain,safeTerrainHeight} from './terrain.js';
import {RoadSurfaces} from './road-surfaces.js';
import {ensureSurfaceResolver} from './world-surface-resolver.js';

// Keep the existing DEM/profile construction. Only the completed world's
// geometric queries are routed through the same authoritative resolver.
const nativeSegmentHeight=RoadSurfaces.prototype.segmentHeight;
if(!RoadSurfaces.prototype.__worldSurfaceAuthority){
  RoadSurfaces.prototype.__worldSurfaceAuthority=true;
  RoadSurfaces.prototype.segmentHeight=function(segment,t){
    const solved=nativeSegmentHeight.call(this,segment,t);
    // During the RoadSurfaces constructor terrain.roads is not yet assigned.
    // Initialising the resolver then would observe an incomplete graph.
    if(!this.modern||this.terrain?.roads!==this)return solved;
    return ensureSurfaceResolver(this.terrain).resolveRoadSegment(segment,t,solved);
  };
}

const nativeGroundHeight=Terrain.prototype.groundHeight;
if(!Terrain.prototype.__worldSurfaceAuthority){
  Terrain.prototype.__worldSurfaceAuthority=true;
  Terrain.prototype.groundHeight=function(x,z){
    // Preserve the existing fast boot path until the initial ring is requested.
    if(!this.modern||!this.roads||globalThis.__padovaFastStartup!==false)
      return nativeGroundHeight.call(this,x,z);
    return safeTerrainHeight(ensureSurfaceResolver(this).getGroundHeight(x,z),this.rawElevation(x,z));
  };
  const nativeHeight=Terrain.prototype.height;
  Terrain.prototype.height=function(x,z,referenceY=null){
    if(!this.modern||!this.roads||globalThis.__padovaFastStartup!==false)
      return nativeHeight.call(this,x,z,referenceY);
    return safeTerrainHeight(ensureSurfaceResolver(this).getWalkableSurfaceHeight(x,z,referenceY),this.rawElevation(x,z));
  };
}
