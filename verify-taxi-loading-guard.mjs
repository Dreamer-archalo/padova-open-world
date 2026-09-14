import fs from 'node:fs';
const source=fs.readFileSync(new URL('./dist/taxi-loading-guard.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8');
const checks=[
 ['taxi-only scope',source.includes("classList?.contains(TAXI_CLASS)")],
 ['core readiness bypassed in taxi transit',source.includes('if(!taxiTransit())return BASE_CORE_READY.call(this,x,z,radius)')&&source.includes('return true;')],
 ['destination stays prefetched',source.includes('this.prefetch(x,z,520)')],
 ['streaming backend bypassed during transit',source.includes('if(!taxiTransit())return BASE_UPDATE.call(this,p,force)')],
 ['worker/cooperative pressure held during transit',source.includes('this.metrics.pressure=true')],
 ['normal streaming resumes after transit',source.includes('BASE_UPDATE.call(this,p,force)')],
 ['runtime import',runtime.includes("import './taxi-loading-guard.js';")]
];
for(const [name,ok] of checks){if(!ok)throw new Error('Taxi loading guard failed: '+name);}
console.log('Taxi loading guard checks passed:',checks.length);
