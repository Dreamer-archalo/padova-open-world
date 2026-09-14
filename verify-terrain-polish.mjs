import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const terrain=read('./dist/phase4-terrain-fixes.js');
const historic=read('./dist/historic-center.js');
const runtime=read('./dist/phase2-runtime.js');
const checks={
 wired:runtime.includes("import './phase4-terrain-fixes.js'"),
 signori:terrain.includes("id:'piazza-signori'"),
 erbe:terrain.includes("id:'piazza-erbe'"),
 frutta:terrain.includes("id:'piazza-frutta'"),
 duomo:terrain.includes("id:'piazza-duomo'"),
 prato:terrain.includes("id:'prato'")&&terrain.includes('phase4-prato-canal-edges'),
 southPlain:terrain.includes("id:'bassanello'")&&terrain.includes("id:'guizza'")&&terrain.includes("id:'albignasego'"),
 feathered:terrain.includes('r<=core?1:smooth((1-r)/(1-core))'),
 globalShoulders:terrain.includes('__phase4HarmonicShoulders')&&terrain.includes('SHOULDER_FEATHER=7.5'),
 waterProtected:terrain.includes('this.waterDistance(x,z)<1.25'),
 noPorticos:!historic.includes('makePorticos')&&!historic.includes('passablePortico')&&!historic.includes('localColonnade')
};
const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([k])=>k);
if(failed.length)throw new Error('Terrain polish verification failed: '+failed.join(', '));
console.log(JSON.stringify({ok:true,checks},null,2));
