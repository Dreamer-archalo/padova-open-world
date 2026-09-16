import {Terrain} from './terrain.js';
import {RoadSurfaces} from './road-surfaces.js';
import {VILLA,AIRPORT,areaLocal} from './gameplay-areas.js';

// The historic plain must not overwrite the independently authored elevations of
// Villa Treves and the airport. The old plain raised the Villa roads about 7 m
// above its fixed platform, burying buildings and spawning actors in the ground.
export const HISTORIC_CENTER_PLAIN={x:0,z:100,rx:1210,rz:1350,core:.62,strength:.985,slopeX:.000015,slopeZ:.00003};
export const HISTORIC_RIVER_HARD_BUFFER=2.5;
export const HISTORIC_RIVER_FEATHER=12;
export const AUTHORED_AREA_FEATHER=240;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};

// Zero inside an authored gameplay area, smoothly rising to one only 240 m
// outside it. A 7 m difference across this distance has an ordinary road-grade
// transition instead of a vertical lip at the villa fence or driveway.
export function authoredAreaMask(x,z){
 let mask=1;
 for(const area of [VILLA,AIRPORT]){
  const p=areaLocal(area,x,z),du=Math.max(area.minU-p.u,0,p.u-area.maxU),dv=Math.max(area.minV-p.v,0,p.v-area.maxV);
  const distance=Math.hypot(du,dv);
  if(distance<AUTHORED_AREA_FEATHER)mask=Math.min(mask,smooth(distance/AUTHORED_AREA_FEATHER));
 }
 return mask;
}
export function historicPlainMask(x,z,waterDistance=Infinity){
 const a=HISTORIC_CENTER_PLAIN,dx=(x-a.x)/a.rx,dz=(z-a.z)/a.rz,r=Math.hypot(dx,dz);if(r>=1)return 0;
 const land=r<=a.core?1:smooth((1-r)/(1-a.core));
 const river=waterDistance<=HISTORIC_RIVER_HARD_BUFFER?0:waterDistance>=HISTORIC_RIVER_FEATHER?1:smooth((waterDistance-HISTORIC_RIVER_HARD_BUFFER)/(HISTORIC_RIVER_FEATHER-HISTORIC_RIVER_HARD_BUFFER));
 return land*river*authoredAreaMask(x,z)*a.strength;
}

const baseElevation=Terrain.prototype.elevation;
function historicTarget(terrain,x,z){
 terrain.__historicCenterDatum??=baseElevation.call(terrain,-145,-48);
 const a=HISTORIC_CENTER_PLAIN;
 return terrain.__historicCenterDatum+(x+145)*a.slopeX+(z+48)*a.slopeZ;
}
if(!Terrain.prototype.__historicCenterLevelPlane){
 Terrain.prototype.__historicCenterLevelPlane=true;
 Terrain.prototype.elevation=function(x,z){
  const h=baseElevation.call(this,x,z);if(!this.modern)return h;
  const waterDistance=this.waterIndex?this.waterDistance(x,z):Infinity,influence=historicPlainMask(x,z,waterDistance);if(influence<=0)return h;
  return h*(1-influence)+historicTarget(this,x,z)*influence;
 };
}

// Road heights inherit the same mask as the actual terrain, including the
// authored-area exclusion. Elevated bridges, tunnels and layers stay separate.
const baseRoadSmooth=RoadSurfaces.prototype.smoothProfiles;
if(!RoadSurfaces.prototype.__historicCenterRoadPlane){
 RoadSurfaces.prototype.__historicCenterRoadPlane=true;
 RoadSurfaces.prototype.smoothProfiles=function(){
  baseRoadSmooth.call(this);if(!this.modern||!this.terrain)return;
  const seen=new Set();
  for(const profile of this.profiles.values()){
   const road=profile.road;if(road.crossing||road.tunnel||road.b||Number(road.layer))continue;
   for(const id of profile.ids){if(seen.has(id))continue;seen.add(id);const n=this.nodes[id],waterDistance=this.terrain.waterDistance(n.x,n.z),influence=historicPlainMask(n.x,n.z,waterDistance);if(influence<=0)continue;n.h=n.h*(1-influence)+historicTarget(this.terrain,n.x,n.z)*influence;}
  }
  this.updateSlopes();
 };
}

if(!Terrain.prototype.historicCenterLevelReport){
 Terrain.prototype.historicCenterLevelReport=function(step=60){
  let min=Infinity,max=-Infinity,maxNeighbourDelta=0,samples=0;
  const a=HISTORIC_CENTER_PLAIN;
  for(let z=a.z-a.rz*a.core;z<=a.z+a.rz*a.core;z+=step)for(let x=a.x-a.rx*a.core;x<=a.x+a.rx*a.core;x+=step){
   if(Math.hypot((x-a.x)/a.rx,(z-a.z)/a.rz)>a.core||this.waterDistance(x,z)<HISTORIC_RIVER_FEATHER)continue;
   const h=this.elevation(x,z);if(!Number.isFinite(h))continue;min=Math.min(min,h);max=Math.max(max,h);samples++;
   for(const [dx,dz] of [[step*.5,0],[0,step*.5]]){const qx=x+dx,qz=z+dz;if(this.waterDistance(qx,qz)<HISTORIC_RIVER_FEATHER)continue;maxNeighbourDelta=Math.max(maxNeighbourDelta,Math.abs(this.elevation(qx,qz)-h));}
  }
  return {samples,range:samples?max-min:0,maxNeighbourDelta};
 };
}
