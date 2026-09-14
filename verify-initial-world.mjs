import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const streaming=read('./dist/streaming.js'),loader=read('./dist/initial-loader.js'),terrain=read('./dist/terrain.js'),surface=read('./dist/surface-layers.js'),roads=read('./dist/modern-roads.js'),html=read('./dist/index.html');
const checks={
 ring3x3:streaming.includes('for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)'),
 hardInitialGate:streaming.includes('setInitialGate(keys)')&&streaming.includes('requiredInitial:true'),
 coreThenDetail:streaming.includes("initial.filter(v=>!w.loaded.get(v.key)?.userData.coreReady)")&&streaming.includes("initial.filter(v=>w.loaded.get(v.key)?.userData.coreReady&&!w.loaded.get(v.key)?.userData.detailReady)"),
 sceneInsertionGate:loader.includes('g.parent===this.world.scene')||loader.includes('root.parent===this.world.scene'),
 promiseAll:loader.includes('Promise.all([Promise.all(promises),pump])'),
 exactPercent:loader.includes('loaded/total*100'),
 blockingOverlay:html.includes('id="initialLoader"')&&html.indexOf('./initial-loader.js')<html.indexOf('./game.js'),
 smoothRoadFalloff:terrain.includes('roadTerrainFactor')&&terrain.includes('1-smooth(t)')&&terrain.includes('ROAD_FADE_DISTANCE=9'),
 naturalTerrainReturn:terrain.includes('natural*(1-factor)+roadY*factor'),
 impossibleHeightGuard:terrain.includes('SAFE_MIN_Y=-10')&&terrain.includes('SAFE_MAX_Y=100')&&terrain.includes('safeTerrainHeight'),
 continuousGroundSkin:surface.includes('preserveUnderRoads=!!height&&!pedestrian&&!exclude')&&surface.includes('if(options.preserveUnderRoads)return [poly]'),
 bridgeFascia:roads.includes('road.crossing&&!ped')&&roads.includes('thickness=.58')
};
for(const [name,ok] of Object.entries(checks))assert(ok,'Initial-world regression failed: '+name);
console.log(JSON.stringify({ok:true,checks},null,2));
