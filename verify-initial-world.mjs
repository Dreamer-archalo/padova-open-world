import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const loader=read('./dist/initial-loader.js'),terrain=read('./dist/terrain.js'),surface=read('./dist/surface-layers.js'),roads=read('./dist/modern-roads.js'),modernMap=read('./dist/modern-map.js'),html=read('./dist/index.html');
const checks={
 ring3x3:loader.includes('for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)')&&loader.includes("keys.length!==9"),
 directCooperativeBuild:loader.includes("this.world.buildStageSteps(key,stage)")&&loader.includes("await this.buildStage(key,'core'")&&loader.includes("await this.buildStage(key,'detail'"),
 noStartupWorkerDependency:loader.includes("this.world.streaming?.dispose?.()")&&loader.includes('this.world.streaming=null'),
 sceneInsertionGate:loader.includes('root?.parent===this.world.scene')&&loader.includes("Initial chunks missing from scene"),
 stagedPercent:loader.includes('totalStages=keys.length*2')&&loader.includes('completed/Math.max(1,totalStages)'),
 timeSliced:loader.includes('performance.now()+this.sliceMs')&&loader.includes('requestAnimationFrame'),
 bootstrapMirroring:loader.includes('MutationObserver')&&loader.includes('legacyBar')&&loader.includes('legacyText'),
 blockingOverlay:html.includes('id="initialLoader"')&&html.indexOf('./initial-loader.js')<html.indexOf('./game.js'),
 startupDiagnostics:html.includes("window.addEventListener('error'")&&html.includes("window.addEventListener('unhandledrejection'")&&html.includes('initialLoaderError'),
 corridorModuleContract:surface.includes("import {cutCorridor} from './modern-map.js'")&&modernMap.includes('export function cutCorridor('),
 smoothRoadFalloff:terrain.includes('roadTerrainFactor')&&terrain.includes('1-smooth(t)')&&terrain.includes('ROAD_FADE_DISTANCE=9'),
 naturalTerrainReturn:terrain.includes('natural*(1-factor)+roadY*factor'),
 impossibleHeightGuard:terrain.includes('SAFE_MIN_Y=-10')&&terrain.includes('SAFE_MAX_Y=100')&&terrain.includes('safeTerrainHeight'),
 continuousGroundSkin:surface.includes('preserveUnderRoads=!!height&&!pedestrian&&!exclude')&&surface.includes('if(options.preserveUnderRoads)return [poly]'),
 bridgeFascia:roads.includes('road.crossing&&!ped')&&roads.includes('thickness=.58')
};
for(const [name,ok] of Object.entries(checks))assert(ok,'Initial-world regression failed: '+name);
console.log(JSON.stringify({ok:true,checks},null,2));
