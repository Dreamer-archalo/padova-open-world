import fs from 'node:fs';
import assert from 'node:assert/strict';

globalThis.window=globalThis;
globalThis.document={body:{classList:{contains:()=>false},dataset:{}},createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};
globalThis.__padovaFastStartup=false;

await import('./dist/phase4-terrain-fixes.js');
await import('./dist/historic-terrain-level.js');
await import('./dist/historic-plaza-alignment.js');
await import('./dist/surface-authority-runtime.js');
const [{Terrain},{applyCityData},{prepareGameplayMap},{SURFACE_CONFIG,isStructuralRoad,isPedestrianRoad,isTramRoad}]=await Promise.all([
  import('./dist/terrain.js'),import('./dist/districts.js'),import('./dist/gameplay-areas.js'),import('./dist/world-surface-resolver.js')
]);
const read=name=>JSON.parse(fs.readFileSync(new URL('./dist/data/'+name+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);
const terrain=new Terrain(read('terrain'),map,{modern:true}),resolver=terrain.surfaceResolver;
assert(resolver,'WorldSurfaceResolver missing');

const report={
  profiles:0,segments:0,ordinarySamples:0,ordinaryFreeSamples:0,maxOrdinaryDatumError:0,maxFreeRoadTerrainDelta:0,
  bridgeSamples:0,minBridgeWaterClearance:Infinity,bridgeIndependentSamples:0,
  sidewalkSamples:0,maxCurbError:0,tramSamples:0,maxEmbeddedTramDelta:0,
  riverSamples:0,minRiverbedDepth:Infinity,physicsSamples:0,maxPhysicsResolverDelta:0,
  seamSamples:0,maxTerrainSeamDelta:0,invalidNumbers:0
};
const examples={ordinary:[],bridge:[],sidewalk:[],tram:[],river:[],physics:[],seam:[]};
const finite=(...v)=>v.every(Number.isFinite);
const ex=(type,data)=>{if(examples[type].length<12)examples[type].push(data);};

for(const profile of terrain.roads.profiles.values()){
  report.profiles++;const road=profile.road;
  for(let i=1;i<profile.points.length;i++){
    report.segments++;const a=profile.points[i-1],b=profile.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.01)continue;
    const s={a,b,ia:profile.ids[i-1],ib:profile.ids[i],profile,i:i-1};
    for(const t of [.25,.5,.75]){
      const x=a[0]+dx*t,z=a[1]+dz*t,actual=terrain.roads.sample(road,x,z),expected=resolver.expectedRoadDatum(road,x,z),natural=resolver.getPreciseHeight(x,z);
      if(!finite(actual,expected,natural)){report.invalidNumbers++;continue;}
      const physics=terrain.height(x,z,actual+SURFACE_CONFIG.roadSurfaceOffset),walkable=resolver.getWalkableSurfaceHeight(x,z,actual+SURFACE_CONFIG.roadSurfaceOffset),pDelta=Math.abs(physics-walkable);report.physicsSamples++;report.maxPhysicsResolverDelta=Math.max(report.maxPhysicsResolverDelta,pDelta);if(pDelta>1e-6)ex('physics',{road:road.n||road.k,x,z,pDelta});
      if(!isStructuralRoad(road)&&!isPedestrianRoad(road)&&!isTramRoad(road)){
        report.ordinarySamples++;const err=Math.abs(actual-expected);report.maxOrdinaryDatumError=Math.max(report.maxOrdinaryDatumError,err);if(err>SURFACE_CONFIG.roadAlignmentTolerance)ex('ordinary',{road:road.n||road.k,x,z,err});
        const influence=resolver.approachInfluence(s,t);if(influence<.02){const delta=Math.abs(actual-natural);report.ordinaryFreeSamples++;report.maxFreeRoadTerrainDelta=Math.max(report.maxFreeRoadTerrainDelta,delta);if(delta>.035)ex('ordinary',{road:road.n||road.k,x,z,delta,influence});}
        const sidewalk=resolver.getSidewalkHeight(road,x,z),curb=sidewalk-(actual+SURFACE_CONFIG.roadRenderOffset),curbError=Math.abs(curb-SURFACE_CONFIG.curbHeight);report.sidewalkSamples++;report.maxCurbError=Math.max(report.maxCurbError,curbError);if(curbError>1e-6)ex('sidewalk',{road:road.n||road.k,x,z,curb,curbError});
      }
      if((road.crossing||road.b||Number(road.layer)>0)&&terrain.waterDistance(x,z)<0){const clearance=actual-terrain.waterHeight(x,z);report.bridgeSamples++;report.minBridgeWaterClearance=Math.min(report.minBridgeWaterClearance,clearance);if(Math.abs(actual-natural)>.35)report.bridgeIndependentSamples++;if(clearance<.5)ex('bridge',{road:road.n||road.k,x,z,clearance});}
      if(isTramRoad(road)&&!isStructuralRoad(road)){const tramY=resolver.getTramHeight(road,x,z),delta=Math.abs(tramY-natural);report.tramSamples++;report.maxEmbeddedTramDelta=Math.max(report.maxEmbeddedTramDelta,delta);if(delta>.15)ex('tram',{road:road.n||road.k,x,z,delta});}
    }
  }
}

for(const r of map.water||[])for(let i=1;i<r.p.length;i+=Math.max(1,Math.floor(r.p.length/18))){const a=r.p[i-1],b=r.p[i],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;if(terrain.waterDistance(x,z)>0)continue;const info=resolver.riverInfo(x,z),depth=info.waterHeight-info.bedHeight;if(!finite(info.waterHeight,info.bedHeight,depth)){report.invalidNumbers++;continue;}report.riverSamples++;report.minRiverbedDepth=Math.min(report.minRiverbedDepth,depth);if(depth<.45)ex('river',{x,z,depth});}

const g=terrain.grid,maxX=g.x0+g.step*(g.width-1),maxZ=g.z0+g.step*(g.height-1),eps=.01;
for(let x=Math.ceil(g.x0/320)*320;x<maxX;x+=320)for(let z=g.z0+40;z<maxZ;z+=160){const a=resolver.getPreciseHeight(x-eps,z),b=resolver.getPreciseHeight(x+eps,z),delta=Math.abs(a-b);if(!finite(a,b)){report.invalidNumbers++;continue;}report.seamSamples++;report.maxTerrainSeamDelta=Math.max(report.maxTerrainSeamDelta,delta);if(delta>SURFACE_CONFIG.seamTolerance)ex('seam',{axis:'x',x,z,delta});}
for(let z=Math.ceil(g.z0/320)*320;z<maxZ;z+=320)for(let x=g.x0+40;x<maxX;x+=160){const a=resolver.getPreciseHeight(x,z-eps),b=resolver.getPreciseHeight(x,z+eps),delta=Math.abs(a-b);if(!finite(a,b)){report.invalidNumbers++;continue;}report.seamSamples++;report.maxTerrainSeamDelta=Math.max(report.maxTerrainSeamDelta,delta);if(delta>SURFACE_CONFIG.seamTolerance)ex('seam',{axis:'z',x,z,delta});}

for(const key of ['maxOrdinaryDatumError','maxFreeRoadTerrainDelta','minBridgeWaterClearance','maxCurbError','maxEmbeddedTramDelta','minRiverbedDepth','maxPhysicsResolverDelta','maxTerrainSeamDelta'])if(Number.isFinite(report[key]))report[key]=+report[key].toFixed(5);
if(!Number.isFinite(report.minBridgeWaterClearance))report.minBridgeWaterClearance=null;
if(!Number.isFinite(report.minRiverbedDepth))report.minRiverbedDepth=null;

assert(report.segments>10000,'map-wide road coverage too small');
assert(report.ordinarySamples>10000,'ordinary road coverage too small');
assert.equal(report.invalidNumbers,0,'non-finite surface values detected');
assert(report.maxOrdinaryDatumError<=SURFACE_CONFIG.roadAlignmentTolerance+1e-6,'ordinary road authority mismatch: '+JSON.stringify(examples.ordinary));
assert(report.maxFreeRoadTerrainDelta<=.035,'ordinary roads detached from corrected terrain: '+JSON.stringify(examples.ordinary));
assert.equal(report.maxCurbError,0,'sidewalk hierarchy mismatch: '+JSON.stringify(examples.sidewalk));
assert(report.maxPhysicsResolverDelta<=1e-6,'physics and surface resolver disagree: '+JSON.stringify(examples.physics));
assert(report.maxTerrainSeamDelta<=SURFACE_CONFIG.seamTolerance,'terrain chunk seam tolerance exceeded: '+JSON.stringify(examples.seam));
assert(report.riverSamples>0&&report.minRiverbedDepth>=.45,'riverbed carve invalid: '+JSON.stringify(examples.river));
if(report.bridgeSamples)assert(report.minBridgeWaterClearance>=.5,'bridge/water clearance invalid: '+JSON.stringify(examples.bridge));
if(report.tramSamples)assert(report.maxEmbeddedTramDelta<=.15,'embedded tram detached from street datum: '+JSON.stringify(examples.tram));
report.ok=true;
fs.writeFileSync(new URL('./docs/world-surface-authority-audit.json',import.meta.url),JSON.stringify({...report,examples},null,2)+'\n');
console.log(JSON.stringify({...report,examples},null,2));
