import {RoadSurfaces} from './road-surfaces.js';
import {SpatialIndex, nearestOnSegment, pointInside, clamp, safeRoadPoint} from './core.js';
import {vehicleBlocked} from './movement.js';
import {gameplayElevation,areaLocal} from './gameplay-areas.js';
import {ensureSurfaceResolver,SURFACE_CONFIG} from './world-surface-resolver.js';

const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export const SAFE_MIN_Y=-10,SAFE_MAX_Y=100,ROAD_FADE_DISTANCE=9;
export const PRATO={x:-35,z:858,yaw:-.23,outer:[90,135],inner:[81,126]};
export function pratoLocal(x,z){const dx=x-PRATO.x,dz=z-PRATO.z,c=Math.cos(PRATO.yaw),s=Math.sin(PRATO.yaw);return {x:c*dx-s*dz,z:s*dx+c*dz};}
export function safeTerrainHeight(value,fallback=0){const f=Number.isFinite(fallback)&&fallback>=SAFE_MIN_Y&&fallback<=SAFE_MAX_Y?fallback:0;return Number.isFinite(value)&&value>=SAFE_MIN_Y&&value<=SAFE_MAX_Y?value:f;}
export function roadTerrainFactor(distanceFromCentre,roadWidth,fade=ROAD_FADE_DISTANCE){const half=Math.max(0,roadWidth/2),t=(distanceFromCentre-half)/Math.max(.001,fade);return 1-smooth(t);}

// Heights are metres, without vertical exaggeration. Hydrology is a continuous
// regional approximation; the source map has no surveyed water levels / locks.
export class Terrain {
  constructor(grid, map, {modern=false}={}){
    this.modern=modern;
    if(!grid||grid.version!==1||grid.width<2||grid.height<2||!(grid.step>0)||grid.heights.length!==grid.width*grid.height||!grid.heights.every(Number.isFinite)||grid.waterPlane?.length!==3||!grid.waterPlane.every(Number.isFinite))throw new Error('Invalid terrain data');
    this.grid=grid;this.gameplayPatches=modern?(map.gameplay?.areas||[]).map(a=>({...a,height:this.rawElevation(a.x,a.z)})):[];this.fountains=[];this.waterIndex=new SpatialIndex(80);this.bridgeIndex=new SpatialIndex(80);
    const add=(index,item,p,pad=0)=>{const xs=p.map(v=>v[0]),zs=p.map(v=>v[1]);index.add(item,Math.min(...xs)-pad,Math.min(...zs)-pad,Math.max(...xs)+pad,Math.max(...zs)+pad);};
    for(const r of map.water.filter(r=>!r.tunnel&&r.layer>=0||!r.tunnel&&r.layer===undefined))for(let i=1;i<r.p.length;i++){
      const a=r.p[i-1],b=r.p[i],count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/80));
      for(let j=0;j<count;j++){const p=[a[0]+(b[0]-a[0])*j/count,a[1]+(b[1]-a[1])*j/count],q=[a[0]+(b[0]-a[0])*(j+1)/count,a[1]+(b[1]-a[1])*(j+1)/count];add(this.waterIndex,{a:p,b:q,w:r.w},[p,q],r.w/2+12);}
    }
    for(const a of map.areas)if(a.k==='water'){const area=Math.abs(a.p.reduce((sum,p,i)=>{const q=a.p[(i+1)%a.p.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;if(area<150&&pointInside(-77.6,-41.7,a.p)){a.fountain=true;this.fountains.push(a);}else {a.shallow=area<150;const cx=a.p.reduce((s,p)=>s+p[0],0)/a.p.length,cz=a.p.reduce((s,p)=>s+p[1],0)/a.p.length;add(this.waterIndex,{p:a.p,level:a.shallow?this.elevation(cx,cz)-.35:undefined},a.p,12);}}
    for(const road of map.roads)if(road.b){
      const lengths=road.p.slice(1).map((p,i)=>Math.hypot(p[0]-road.p[i][0],p[1]-road.p[i][1])),total=lengths.reduce((a,b)=>a+b,0);let offset=0;
      for(let i=1;i<road.p.length;i++){const a=road.p[i-1],b=road.p[i];add(this.bridgeIndex,{a,b,w:road.w,offset,length:lengths[i-1],total},[a,b],road.w/2+2);offset+=lengths[i-1];}
    }
    this.pratoHeight=safeTerrainHeight(this.elevation(PRATO.x,PRATO.z),this.rawElevation(PRATO.x,PRATO.z));this.roads=new RoadSurfaces(map,this);this.surfaceResolver=ensureSurfaceResolver(this);
  }
  rawElevation(x,z){const g=this.grid,u=clamp((x-g.x0)/g.step,0,g.width-1),v=clamp((z-g.z0)/g.step,0,g.height-1),i=Math.min(g.width-2,Math.floor(u)),j=Math.min(g.height-2,Math.floor(v)),a=u-i,b=v-j,h=(i,j)=>g.heights[j*g.width+i],value=h(i,j)*(1-a)*(1-b)+h(i+1,j)*a*(1-b)+h(i,j+1)*(1-a)*b+h(i+1,j+1)*a*b;return safeTerrainHeight(value,h(i,j));}
  elevation(x,z){const raw=this.rawElevation(x,z),value=this.gameplayPatches?.length?gameplayElevation(x,z,raw,this.gameplayPatches):raw;return safeTerrainHeight(value,raw);}
  getPreciseHeight(x,z){return this.surfaceResolver?.getPreciseHeight(x,z)??this.elevation(x,z);}
  getTerrainHeight(x,z){return this.surfaceResolver?.getGroundHeight(x,z)??this.elevation(x,z);}
  getRoadHeight(x,z,referenceY=null){return this.surfaceResolver?.getRoadHeight(x,z,referenceY)??null;}
  getWalkableSurfaceHeight(x,z,referenceY=null){return this.surfaceResolver?.getWalkableSurfaceHeight(x,z,referenceY)??this.height(x,z,referenceY);}
  getSurfaceType(x,z,referenceY=null){return this.surfaceResolver?.getSurfaceType(x,z,referenceY)??'terrain';}
  isBridge(x,z,referenceY=null){return this.surfaceResolver?.isBridge(x,z,referenceY)??false;}
  isTunnel(x,z,referenceY=null){return this.surfaceResolver?.isTunnel(x,z,referenceY)??false;}
  isRiver(x,z){return this.surfaceResolver?.isRiver(x,z)??this.waterDistance(x,z)<=0;}
  isTramTrack(x,z,referenceY=null){return this.surfaceResolver?.isTramTrack(x,z,referenceY)??false;}
  platformAt(x,z){for(const a of this.gameplayPatches){if(!a.platform)continue;const p=areaLocal(a,x,z),b=a.platform;if(p.u>=b.minU&&p.u<=b.maxU&&p.v>=b.minV&&p.v<=b.maxV)return a;}return null;}
  waterHeight(x,z){const p=this.grid.waterPlane,base=safeTerrainHeight(this.elevation(x,z)-1.8,0),value=this.waterSample(x,z).level??(p[0]+p[1]*x+p[2]*z-1.8);return safeTerrainHeight(value,base);}
  prato(x,z){const p=pratoLocal(x,z);if((p.x/115)**2+(p.z/163)**2>1)return null;const canal=(p.x/90)**2+(p.z/135)**2<1&&(p.x/81)**2+(p.z/126)**2>1;return {canal,bridge:Math.abs(p.x)<5.5||Math.abs(p.z)<4.5};}
  waterSample(x,z){let distance=Infinity,level;for(const r of this.waterIndex.near(x,z)){
    let d=Infinity;if(r.p){for(let i=0;i<r.p.length;i++){const q=nearestOnSegment(x,z,r.p[i],r.p[(i+1)%r.p.length]);d=Math.min(d,Math.hypot(q.x-x,q.z-z));}if(pointInside(x,z,r.p))d=-Math.max(.01,d);}
    else{const q=nearestOnSegment(x,z,r.a,r.b);d=Math.hypot(q.x-x,q.z-q.z)-r.w/2;}
    if(d<distance){distance=d;level=r.level;}
  }return {distance,level};}
  waterDistance(x,z){return this.waterSample(x,z).distance;}
  bridge(x,z,margin=0,referenceY=null){return this.roads?.bridge(x,z,referenceY)||null;}
  waterAt(x,z,margin=0,referenceY=null){if(this.platformAt(x,z))return null;if(this.modern){const support=this.roads.at(x,z,referenceY,margin);if(support&&safeTerrainHeight(support.height,this.elevation(x,z))>this.waterHeight(x,z)+.5)return null;}const prato=this.prato(x,z);if(prato)return prato.canal&&!prato.bridge?this.pratoHeight-1.5:null;if(this.bridge(x,z,margin,referenceY))return null;return this.waterDistance(x,z)<margin?this.waterHeight(x,z):null;}
  groundHeight(x,z){
    if(this.modern&&this.surfaceResolver)return safeTerrainHeight(this.surfaceResolver.getGroundHeight(x,z),this.rawElevation(x,z));
    const platform=this.platformAt(x,z);if(platform)return safeTerrainHeight(platform.height,this.rawElevation(x,z));
    const prato=this.prato(x,z);if(prato)return safeTerrainHeight(this.pratoHeight+(prato.canal?-3:0),this.pratoHeight);
    const natural=safeTerrainHeight(this.elevation(x,z),this.rawElevation(x,z));let raw=natural;
    const support=this.roads?.at(x,z,null,ROAD_FADE_DISTANCE);
    if(support&&!support.road.crossing&&!support.road.tunnel&&!support.road.b&&!(Number(support.road.layer)>0)){
      const roadY=safeTerrainHeight(support.height-.05,natural),factor=roadTerrainFactor(support.d,support.road.w,ROAD_FADE_DISTANCE);raw=safeTerrainHeight(natural*(1-factor)+roadY*factor,natural);if(support.d<=support.road.w/2)return raw;
    }
    const d=this.waterDistance(x,z);if(d>10)return raw;const water=this.waterHeight(x,z),channel=safeTerrainHeight(water-1.5,natural),bank=safeTerrainHeight(Math.max(raw,water+.8),natural);return safeTerrainHeight(channel+(bank-channel)*smooth((d+1)/11),natural);
  }
  height(x,z,referenceY=null){
    if(this.modern&&this.surfaceResolver)return safeTerrainHeight(this.surfaceResolver.getWalkableSurfaceHeight(x,z,referenceY),this.rawElevation(x,z));
    const base=this.rawElevation(x,z),platform=this.platformAt(x,z);if(platform){const road=this.roads?.at(x,z,referenceY),roadY=road?safeTerrainHeight(road.height+.05,platform.height+.05):SAFE_MIN_Y;return safeTerrainHeight(Math.max(platform.height+.05,roadY),base);}const prato=this.prato(x,z);if(prato)return safeTerrainHeight(this.pratoHeight+(prato.bridge?.36:prato.canal?-3:.18),base);const road=this.roads?.at(x,z,referenceY);return safeTerrainHeight(road?road.height+.05:this.groundHeight(x,z)+.05,base);
  }
  slope(x,z,yaw,wheelbase=2.5,referenceY=null){const dx=Math.sin(yaw)*wheelbase/2,dz=Math.cos(yaw)*wheelbase/2,a=this.height(x+dx,z+dz,referenceY),b=this.height(x-dx,z-dz,referenceY);return -Math.atan2(safeTerrainHeight(a,b)-b,wheelbase);}
  dry(x,z,radius=.4,referenceY=null){for(const [dx,dz] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]])if(this.waterAt(x+dx,z+dz,0,referenceY)!==null)return false;return true;}
}

export function safeDryRoad(pos,graph,collision,terrain,spec=null,allowed=()=>true){
  const radius=spec?spec.width/2:.4,contact=SURFACE_CONFIG.roadSurfaceOffset;
  const point=safeRoadPoint(pos,graph,collision,radius,p=>allowed(p)&&p.x>-5960&&p.x<7240&&p.z>-6470&&p.z<6220&&terrain.dry(p.x,p.z,spec?spec.length/2+.3:1)&&(!spec||!vehicleBlocked(p.x,p.z,p.yaw,collision,spec,terrain.roads.sample(p.segment.road,p.x,p.z)+contact)),p=>safeTerrainHeight(terrain.roads.sample(p.segment.road,p.x,p.z)+contact,terrain.elevation(p.x,p.z)));
  if(point&&terrain.modern)point.y=safeTerrainHeight(terrain.roads.sample(point.segment.road,point.x,point.z)+contact,terrain.elevation(point.x,point.z));return point;
}

// Independent from rendering, so falling/recovery remains deterministic at 60 Hz.
export class WaterRecovery {
  constructor(){this.active=false;this.lastDry=null;this.elapsed=0;}
  remember(pose,terrain){if(!this.active&&terrain.dry(pose.x,pose.z,3))this.lastDry={x:pose.x,z:pose.z,yaw:pose.yaw};}
  enter(y,waterY){if(this.active)return false;this.active=true;this.elapsed=0;this.y=Math.max(safeTerrainHeight(y,waterY+.6),safeTerrainHeight(waterY+.6,0));this.waterY=safeTerrainHeight(waterY,0);this.vy=0;return true;}
  step(dt){this.elapsed+=dt;this.vy-=12*dt;this.y=safeTerrainHeight(this.y+this.vy*dt,this.waterY+.6);return this.elapsed>=1.35;}
  reset(){this.active=false;this.elapsed=0;}
}
