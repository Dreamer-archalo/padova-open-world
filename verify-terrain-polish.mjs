import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const terrain=read('./dist/phase4-terrain-fixes.js');
const historic=read('./dist/historic-center.js');
const historicLevel=read('./dist/historic-terrain-level.js');
const runtime=read('./dist/phase2-runtime.js');
const checks={
 wired:runtime.includes("import './phase4-terrain-fixes.js'")&&runtime.includes("import './historic-terrain-level.js'"),
 signori:terrain.includes("id:'piazza-signori'"),
 erbe:terrain.includes("id:'piazza-erbe'"),
 frutta:terrain.includes("id:'piazza-frutta'"),
 duomo:terrain.includes("id:'piazza-duomo'"),
 prato:terrain.includes("id:'prato'")&&terrain.includes('phase4-prato-canal-edges'),
 southPlain:terrain.includes("id:'bassanello'")&&terrain.includes("id:'guizza'")&&terrain.includes("id:'albignasego'"),
 feathered:terrain.includes('r<=core?1:smooth((1-r)/(1-core))'),
 globalShoulders:terrain.includes('__phase4HarmonicShoulders')&&terrain.includes('SHOULDER_FEATHER=7.5'),
 waterProtected:terrain.includes('this.waterDistance(x,z)<1.25'),
 historicPlain:historicLevel.includes('HISTORIC_CENTER_PLAIN')&&historicLevel.includes('strength:.985')&&historicLevel.includes('__historicCenterLevelPlane'),
 riverIndependent:historicLevel.includes('HISTORIC_RIVER_HARD_BUFFER=2.5')&&historicLevel.includes('HISTORIC_RIVER_FEATHER=12')&&historicLevel.includes('waterDistance<=HISTORIC_RIVER_HARD_BUFFER?0'),
 historicRoadPlane:historicLevel.includes("import {RoadSurfaces}")&&historicLevel.includes('__historicCenterRoadPlane')&&historicLevel.includes('road.crossing||road.tunnel||road.b||Number(road.layer)')&&historicLevel.includes('this.updateSlopes()'),
 historicAudit:historicLevel.includes('historicCenterLevelReport'),
 noPorticos:!historic.includes('makePorticos')&&!historic.includes('passablePortico')&&!historic.includes('localColonnade')
};
const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([k])=>k);
if(failed.length)throw new Error('Terrain polish verification failed: '+failed.join(', '));
console.log(JSON.stringify({ok:true,checks},null,2));
