import {RoadSurfaces} from './road-surfaces.js';

// RoadSurfaces owns the vertical solution for grade-separated infrastructure.
// Ordinary streets, however, must stay on the corrected terrain datum: the
// clearance solver is allowed to shape bridges/tunnels/ramps, not to propagate
// those offsets through the connected street graph.
const STRUCTURAL_NAME=/(?:^|\b)(ponte|cavalcavia|viadott|sovrappass)(?:\b|$)/i;
const STRUCTURAL_KIND=/^(?:motorway|motorway_link|trunk|trunk_link|tram|rail)$/;

export function usesIndependentRoadLevel(road={}){
  return !!road.tunnel||!!road.b||!!road.crossing||Math.abs(Number(road.layer)||0)>0||STRUCTURAL_KIND.test(road.k||'')||STRUCTURAL_NAME.test(road.n||'');
}

const nativeSegmentHeight=RoadSurfaces.prototype.segmentHeight;
if(!nativeSegmentHeight.__terrainAuthorityPatched){
  const patched=function(segment,t){
    const profile=segment?.profile,road=profile?.road;
    if(this.modern&&profile&&road&&!usesIndependentRoadLevel(road)){
      const a=this.nodes[segment.ia],b=this.nodes[segment.ib];
      // The node base is sampled from Terrain.elevation at the exact road
      // vertex, so renderer, gameplay and terrain share the same datum.
      return a.base*(1-t)+b.base*t;
    }
    return nativeSegmentHeight.call(this,segment,t);
  };
  patched.__terrainAuthorityPatched=true;
  patched.__native=nativeSegmentHeight;
  RoadSurfaces.prototype.segmentHeight=patched;
}
