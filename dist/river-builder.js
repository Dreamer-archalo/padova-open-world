import {clamp} from './core.js';

export const RIVER_CONFIG=Object.freeze({
  bankWidth:11,
  bedDepth:1.5,
  bankFreeboard:.8,
  waterSurfaceEpsilon:.02
});

const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};

// River geometry is resolved in world metres against Terrain.waterHeight().
// The water datum is therefore the DEM-derived regional hydraulic plane already
// stored in terrain.json, not a hard-coded world Y value.
export function resolveRiverbedHeight(terrain,x,z,naturalHeight){
  const d=terrain.waterDistance(x,z);if(d>RIVER_CONFIG.bankWidth)return naturalHeight;
  const water=terrain.waterHeight(x,z),bed=water-RIVER_CONFIG.bedDepth,bank=Math.max(naturalHeight,water+RIVER_CONFIG.bankFreeboard);
  const t=smooth((d+1)/(RIVER_CONFIG.bankWidth+1));
  return bed+(bank-bed)*t;
}

export function riverSurfaceInfo(terrain,x,z){
  const distance=terrain.waterDistance(x,z),waterHeight=terrain.waterHeight(x,z),naturalHeight=terrain.elevation(x,z),bedHeight=resolveRiverbedHeight(terrain,x,z,naturalHeight);
  return {distance,waterHeight,naturalHeight,bedHeight,isRiver:distance<=0,bank:distance>0&&distance<=RIVER_CONFIG.bankWidth};
}
