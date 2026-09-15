import {clamp,nearestOnSegment} from './core.js';
import {resolveRiverbedHeight,riverSurfaceInfo} from './river-builder.js';

export const SURFACE_CONFIG=Object.freeze({
  roadSurfaceOffset:.05,
  roadRenderOffset:.075,
  terrainContactOffset:.05,
  curbHeight:.14,
  tramEmbeddedOffset:.035,
  surfaceEpsilon:.035,
  roadAlignmentTolerance:.12,
  physicsRenderTolerance:.18,
  seamTolerance:.02,
  skirtDepth:.7,
  shoulderBlend:5.5,
  underRoadDepth:.06,
  maxOrdinaryGrade:.055,
  maxApproachLength:140,
  minApproachLength:18
});

const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export const isStructuralRoad=road=>!!road&&(!!road.crossing||!!road.b||!!road.tunnel||Math.abs(Number(road.layer)||0)>0||road.k==='steps'||road.surfaceType==='bridge'||road.surfaceType==='tunnel');
export const isPedestrianRoad=road=>!!road&&/^(footway|path|cycleway|pedestrian)$/.test(road.k||'');
export const isTramRoad=road=>!!road&&(road.k==='tram'||road.isTram===true||road.surfaceType==='tram');

function rawSegmentHeight(roads,s,t){
  const a=roads.nodes[s.ia],b=roads.nodes[s.ib];if(!a||!b)return NaN;
  if(!roads.modern||!s.profile?.slopes)return a.h*(1-t)+b.h*t;
  const d=Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1]),m0=s.profile.slopes[s.i]*d,m1=s.profile.slopes[s.i+1]*d;
  const value=(2*t*t*t-3*t*t+1)*a.h+(t*t*t-2*t*t+t)*m0+(-2*t*t*t+3*t*t)*b.h+(t*t*t-t*t)*m1;
  return clamp(value,Math.min(a.h,b.h),Math.max(a.h,b.h));
}

export class WorldSurfaceResolver{
  constructor(terrain){
    this.terrain=terrain;this.profileMeta=new WeakMap();this.roadProfiles=new WeakMap();this.structuralNodes=new Set();
    const roads=terrain.roads;if(!roads)return;
    for(const profile of roads.profiles.values())if(isStructuralRoad(profile.road))for(const id of profile.ids)this.structuralNodes.add(id);
    for(const profile of roads.profiles.values()){
      const cum=[0];for(let i=1;i<profile.points.length;i++)cum.push(cum.at(-1)+Math.hypot(profile.points[i][0]-profile.points[i-1][0],profile.points[i][1]-profile.points[i-1][1]));
      const zones=[];
      if(!isStructuralRoad(profile.road))for(let i=0;i<profile.ids.length;i++)if(this.structuralNodes.has(profile.ids[i])){
        const n=roads.nodes[profile.ids[i]],target=this.getPreciseHeight(n.x,n.z),delta=Math.abs((n?.h??target)-target),radius=clamp(delta/SURFACE_CONFIG.maxOrdinaryGrade+12,SURFACE_CONFIG.minApproachLength,SURFACE_CONFIG.maxApproachLength);
        zones.push({position:cum[i],radius,index:i,delta});
      }
      const meta={profile,cum,zones};this.profileMeta.set(profile,meta);const list=this.roadProfiles.get(profile.road)||[];list.push(profile);this.roadProfiles.set(profile.road,list);
    }
  }
  getPreciseHeight(x,z){return this.terrain.elevation(x,z);}
  getNaturalTerrainHeight(x,z){return this.getPreciseHeight(x,z);}
  getRiverbedHeight(x,z){return resolveRiverbedHeight(this.terrain,x,z,this.getPreciseHeight(x,z));}
  riverInfo(x,z){return riverSurfaceInfo(this.terrain,x,z);}
  approachInfluence(s,t){
    const meta=this.profileMeta.get(s.profile);if(!meta?.zones?.length)return 0;
    const segLength=Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1]),position=(meta.cum[s.i]||0)+segLength*t;let influence=0;
    for(const zone of meta.zones){const d=Math.abs(position-zone.position);if(d>=zone.radius)continue;const edge=zone.radius*.42,core=zone.radius-edge,value=d<=core?1:smooth((zone.radius-d)/Math.max(.001,edge));influence=Math.max(influence,value);}
    return influence;
  }
  resolveRoadSegment(s,t,solved=rawSegmentHeight(this.terrain.roads,s,t)){
    const road=s?.profile?.road;if(!road||!Number.isFinite(solved)||isStructuralRoad(road))return solved;
    const x=s.a[0]+(s.b[0]-s.a[0])*t,z=s.a[1]+(s.b[1]-s.a[1])*t,target=this.getPreciseHeight(x,z),influence=this.approachInfluence(s,t);
    return target*(1-influence)+solved*influence;
  }
  rawRoadDatum(road,x,z){
    let best=null,d=Infinity;
    for(const s of this.terrain.roads.index.near(x,z,(road?.w||6)+10)){if(s.profile?.road!==road)continue;const q=nearestOnSegment(x,z,s.a,s.b),dd=Math.hypot(x-q.x,z-q.z);if(dd<d){d=dd;best={s,q};}}
    return best?rawSegmentHeight(this.terrain.roads,best.s,best.q.t):this.getPreciseHeight(x,z);
  }
  expectedRoadDatum(road,x,z){
    if(!road)return this.getPreciseHeight(x,z);let best=null,d=Infinity;
    for(const s of this.terrain.roads.index.near(x,z,(road.w||6)+10)){if(s.profile?.road!==road)continue;const q=nearestOnSegment(x,z,s.a,s.b),dd=Math.hypot(x-q.x,z-q.z);if(dd<d){d=dd;best={s,q};}}
    if(!best)return this.getPreciseHeight(x,z);return this.resolveRoadSegment(best.s,best.q.t,rawSegmentHeight(this.terrain.roads,best.s,best.q.t));
  }
  roadContext(x,z,referenceY=null,margin=0){return this.terrain.roads?.at(x,z,referenceY,margin)||null;}
  getRoadHeight(x,z,referenceY=null){const s=this.roadContext(x,z,referenceY,0);return s?s.height+SURFACE_CONFIG.roadSurfaceOffset:null;}
  getRoadDatum(x,z,referenceY=null){const s=this.roadContext(x,z,referenceY,0);return s?.height??null;}
  getSidewalkHeight(road,x,z){const datum=road?this.expectedRoadDatum(road,x,z):this.getRoadDatum(x,z);return datum==null?null:datum+SURFACE_CONFIG.roadRenderOffset+SURFACE_CONFIG.curbHeight;}
  getTramHeight(road,x,z,referenceY=null){
    if(road&&isStructuralRoad(road))return this.terrain.roads.sample(road,x,z)+SURFACE_CONFIG.roadSurfaceOffset;
    const datum=road?this.terrain.roads.sample(road,x,z):this.getPreciseHeight(x,z);return datum+SURFACE_CONFIG.tramEmbeddedOffset;
  }
  getGroundHeight(x,z){
    const platform=this.terrain.platformAt?.(x,z);if(platform)return platform.height;
    const prato=this.terrain.prato?.(x,z);if(prato)return this.terrain.pratoHeight+(prato.canal?-3:0);
    let ground=this.getRiverbedHeight(x,z),support=this.roadContext(x,z,null,SURFACE_CONFIG.shoulderBlend+.8);
    if(!support||isStructuralRoad(support.road)||isPedestrianRoad(support.road)||isTramRoad(support.road))return ground;
    if(this.terrain.waterDistance(x,z)<1.25)return ground;
    const outside=Math.max(0,support.d-support.road.w/2);if(outside>=SURFACE_CONFIG.shoulderBlend)return ground;
    const roadGround=support.height-SURFACE_CONFIG.underRoadDepth,t=smooth(outside/SURFACE_CONFIG.shoulderBlend);
    return roadGround*(1-t)+ground*t;
  }
  getWalkableSurfaceHeight(x,z,referenceY=null){
    const platform=this.terrain.platformAt?.(x,z);if(platform)return platform.height+SURFACE_CONFIG.surfaceEpsilon;
    const support=this.roadContext(x,z,referenceY,0);if(support){if(isTramRoad(support.road))return this.getTramHeight(support.road,x,z,referenceY);return support.height+SURFACE_CONFIG.roadSurfaceOffset;}
    const prato=this.terrain.prato?.(x,z);if(prato)return this.terrain.pratoHeight+(prato.bridge?.36:prato.canal?-3:.18);
    return this.getGroundHeight(x,z)+SURFACE_CONFIG.terrainContactOffset;
  }
  getSurfaceType(x,z,referenceY=null){
    const platform=this.terrain.platformAt?.(x,z);if(platform)return 'platform';
    const support=this.roadContext(x,z,referenceY,0);if(support){if(isTramRoad(support.road))return isStructuralRoad(support.road)?'tram-structure':'tram-embedded';if(support.road.tunnel)return'tunnel';if(support.road.crossing||support.road.b||Number(support.road.layer)>0)return'bridge';if(isPedestrianRoad(support.road))return'sidewalk';return'road';}
    if(this.isRiver(x,z))return'river';return'terrain';
  }
  isBridge(x,z,referenceY=null){const s=this.roadContext(x,z,referenceY,0);return !!s&&(!!s.road.crossing||!!s.road.b||Number(s.road.layer)>0);}
  isTunnel(x,z,referenceY=null){return !!this.roadContext(x,z,referenceY,0)?.road?.tunnel;}
  isRiver(x,z){return this.terrain.waterDistance(x,z)<=0;}
  isTramTrack(x,z,referenceY=null){return isTramRoad(this.roadContext(x,z,referenceY,0)?.road);}
}

export const ensureSurfaceResolver=terrain=>terrain.surfaceResolver||(terrain.surfaceResolver=new WorldSurfaceResolver(terrain));
