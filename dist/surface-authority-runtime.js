import {Terrain,safeTerrainHeight} from './terrain.js';
import {RoadSurfaces} from './road-surfaces.js';
import {WorldSurfaceResolver,ensureSurfaceResolver} from './world-surface-resolver.js';

// A single resolver belongs to each Terrain instance, not to a chunk or a
// renderer. Construction is deferred until the complete RoadSurfaces graph
// has been assigned by Terrain's constructor.
if(!Object.getOwnPropertyDescriptor(Terrain.prototype,'surfaceResolver')){
  Object.defineProperty(Terrain.prototype,'surfaceResolver',{
    configurable:true,
    get(){if(!this.__surfaceResolver&&this.roads)this.__surfaceResolver=new WorldSurfaceResolver(this);return this.__surfaceResolver;},
    set(value){this.__surfaceResolver=value;}
  });
}

// Preserve the existing DEM/profile solver. Rendering and physics both
// sample the resolved result, after the topology of the road graph is final.
const nativeSegmentHeight=RoadSurfaces.prototype.segmentHeight;
if(!RoadSurfaces.prototype.__worldSurfaceAuthority){
  RoadSurfaces.prototype.__worldSurfaceAuthority=true;
  RoadSurfaces.prototype.segmentHeight=function(segment,t){
    const solved=nativeSegmentHeight.call(this,segment,t);
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
