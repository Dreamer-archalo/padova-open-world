import fs from 'node:fs';
const source=fs.readFileSync(new URL('./dist/taxi-loading-guard.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8');
const checks=[
 ['taxi-only scope',source.includes("classList?.contains(TAXI_CLASS)")],
 ['destination prefetch renewal',source.includes('this.prefetch(x,z,Math.max(420')],
 ['urgent destination streaming',source.includes('this.update({x,z,yaw:0,speed:0,aircraft:false,altitude:0},true)')],
 ['centre chunk fallback',source.includes('CENTER_FALLBACK_MS=1200')&&source.includes('centerReady(this,x,z)')],
 ['guaranteed release deadline',source.includes('GUARANTEED_RELEASE_MS=2100')&&source.includes('waited>=GUARANTEED_RELEASE_MS')],
 ['deadline checked before backend readiness',source.indexOf('waited>=GUARANTEED_RELEASE_MS')<source.indexOf('BASE_CORE_READY.call(this,x,z,radius)')],
 ['destination remains prefetched on forced release',source.includes("this.prefetch(x,z,520)")&&source.includes("this.lastPlan=''" )],
 ['runtime import',runtime.includes("import './taxi-loading-guard.js';")]
];
for(const [name,ok] of checks){if(!ok)throw new Error('Taxi loading guard failed: '+name);}
console.log('Taxi loading guard checks passed:',checks.length);
