import {Terrain} from './terrain.js';

// The historic centre of Padova is a very flat urban plain. Keep the river and
// canal geometry independent: the level correction fades out at the water edge,
// while streets, piazzas and pavements away from the bank share one gentle plane.
export const HISTORIC_CENTER_PLAIN={x:0,z:100,rx:1210,rz:1350,core:.62,strength:.92,slopeX:.000015,slopeZ:.00003};
export const HISTORIC_RIVER_HARD_BUFFER=3.5;
export const HISTORIC_RIVER_FEATHER=18;

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function historicPlainMask(x,z,waterDistance=Infinity){
 const a=HISTORIC_CENTER_PLAIN,dx=(x-a.x)/a.rx,dz=(z-a.z)/a.rz,r=Math.hypot(dx,dz);if(r>=1)return 0;
 const land=r<=a.core?1:smooth((1-r)/(1-a.core));
 const river=waterDistance<=HISTORIC_RIVER_HARD_BUFFER?0:waterDistance>=HISTORIC_RIVER_FEATHER?1:smooth((waterDistance-HISTORIC_RIVER_HARD_BUFFER)/(HISTORIC_RIVER_FEATHER-HISTORIC_RIVER_HARD_BUFFER));
 return land*river*a.strength;
}

const baseElevation=Terrain.prototype.elevation;
if(!Terrain.prototype.__historicCenterLevelPlane){
 Terrain.prototype.__historicCenterLevelPlane=true;
 Terrain.prototype.elevation=function(x,z){
  const h=baseElevation.call(this,x,z);if(!this.modern)return h;
  const waterDistance=this.waterIndex?this.waterDistance(x,z):Infinity,influence=historicPlainMask(x,z,waterDistance);if(influence<=0)return h;
  // Piazza delle Erbe is a stable central datum. A tiny longitudinal slope keeps
  // drainage believable without reproducing DEM bumps as ramps or urban walls.
  this.__historicCenterDatum??=baseElevation.call(this,-145,-48);
  const a=HISTORIC_CENTER_PLAIN,target=this.__historicCenterDatum+(x+145)*a.slopeX+(z+48)*a.slopeZ;
  return h*(1-influence)+target*influence;
 };
}

// Diagnostic used when checking future terrain changes. It intentionally ignores
// the river corridor because water level/banks are a separate vertical system.
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
