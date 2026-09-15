import {ordinarySurfaceRoad,independentRoadLevel,ORDINARY_ROAD_TOLERANCE,MOTORWAY_ROAD_TOLERANCE} from './road-reality-pass.js';

const finite=Number.isFinite;
export function auditRoadReality(world,{warnLimit=40}={}){
 if(!world?.terrain?.roads)throw new Error('Road reality audit: world is not ready');
 const terrain=world.terrain,report={ok:true,profiles:0,segments:0,samples:0,independentSegments:0,ordinarySegments:0,roadTerrainViolations:0,edgeViolations:0,maxRoadTerrainDelta:0,maxEdgeDelta:0,examples:[]};
 const issue=(type,data)=>{report.ok=false;report[type]++;if(report.examples.length<warnLimit)report.examples.push({type,...data});};
 for(const profile of terrain.roads.profiles.values()){
  report.profiles++;const road=profile.road;
  for(let i=1;i<profile.points.length;i++){
   report.segments++;const a=profile.points[i-1],b=profile.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.01)continue;
   if(independentRoadLevel(road)){report.independentSegments++;continue;}
   if(!ordinarySurfaceRoad(road))continue;report.ordinarySegments++;
   const nx=-dz/length,nz=dx/length,tolerance=/motorway|trunk/.test(road.k||'')?MOTORWAY_ROAD_TOLERANCE:ORDINARY_ROAD_TOLERANCE;
   for(const t of [0,.25,.5,.75,1]){
    const x=a[0]+dx*t,z=a[1]+dz*t,roadY=terrain.roads.sample(road,x,z),natural=terrain.elevation(x,z);report.samples++;
    if(!finite(roadY)||!finite(natural)){issue('roadTerrainViolations',{reason:'nonfinite',road:road.n||road.k,x,z});continue;}
    const delta=Math.abs(roadY-natural);report.maxRoadTerrainDelta=Math.max(report.maxRoadTerrainDelta,delta);if(delta>tolerance+.025)issue('roadTerrainViolations',{road:road.n||road.k,x:+x.toFixed(1),z:+z.toFixed(1),delta:+delta.toFixed(3),limit:+(tolerance+.025).toFixed(3)});
    const side=road.w/2+.9;for(const sign of [-1,1]){const ex=x+nx*side*sign,ez=z+nz*side*sign,edge=terrain.groundHeight(ex,ez),edgeDelta=Math.abs(edge-roadY);report.maxEdgeDelta=Math.max(report.maxEdgeDelta,edgeDelta);if(edgeDelta>.34)issue('edgeViolations',{road:road.n||road.k,x:+ex.toFixed(1),z:+ez.toFixed(1),delta:+edgeDelta.toFixed(3)});}
   }
  }
 }
 report.maxRoadTerrainDelta=+report.maxRoadTerrainDelta.toFixed(4);report.maxEdgeDelta=+report.maxEdgeDelta.toFixed(4);globalThis.__padovaRoadRealityAudit=report;
 if(report.ok)console.log('[Padova road reality audit] A-Z network OK',report);else console.warn('[Padova road reality audit] issues detected',report);
 return report;
}

// IMPORTANT: this is a diagnostics-only full-network audit. Running it from
// CityWorld.installStage used to monopolise the main thread exactly when the
// initial loader entered its first streamed chunk (30%). Keep it available for
// manual diagnostics, but never auto-run it during production startup/gameplay.
if(typeof window!=='undefined'){
 window.__padovaRoadRealityAuditAutoDisabled=true;
 window.auditRoadReality=opts=>auditRoadReality(window.__padovaWorld,opts);
}
