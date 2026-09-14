import fs from 'node:fs';
const source=fs.readFileSync(new URL('./dist/taxi-loading-guard.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8');
const checks=[
 ['taxi-only scope',source.includes("classList?.contains(TAXI_CLASS)")],
 ['destination prefetch renewal',source.includes('this.prefetch(x,z,Math.max(420')],
 ['urgent destination streaming',source.includes('this.update({x,z,yaw:0,speed:0,aircraft:false,altitude:0},true)')],
 ['centre chunk fallback',source.includes('CENTER_FALLBACK_MS')&&source.includes('centerReady(this,x,z)')],
 ['hard no-deadlock timeout',source.includes('HARD_FALLBACK_MS')&&source.includes('return true;')],
 ['runtime import',runtime.includes("import './taxi-loading-guard.js';")]
];
for(const [name,ok] of checks){if(!ok)throw new Error('Taxi loading guard failed: '+name);}
console.log('Taxi loading guard checks passed:',checks.length);
