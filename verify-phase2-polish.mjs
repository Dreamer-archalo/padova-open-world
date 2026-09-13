import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const gameplay=read('./dist/modern-gameplay.js');
const camera=read('./dist/camera-rig.js');
const driving=read('./dist/modern-driving.js');
const html=read('./dist/index.html');
const css=read('./dist/phase2-ui.css');
const ambience=read('./dist/ambient-audio.js');
const runtime=read('./dist/phase2-runtime.js');
const districts=read('./dist/districts.js');
const details=read('./dist/city-details.js');
const streaming=read('./dist/streaming.js');
const checks={
 roadblocks:gameplay.includes('updateRoadblocks()')&&gameplay.includes('Polizia · Posto di blocco')&&gameplay.includes('roadblockLamp'),
 smartSpawn:gameplay.includes("angleDiff(Math.atan2(x-this.state.x,z-this.state.z),this.state.yaw)"),
 cameraRecenter:camera.includes('magnitude*.055')&&camera.includes('this.holdUntil=time+1.65'),
 pedestrianPanic:driving.includes('wantedPanic')&&driving.includes("profile==='avoid'"),
 ambienceLoaded:html.includes('./ambient-audio.js')&&ambience.includes('zoneProfile()'),
 runtimeLoaded:html.includes('./phase2-runtime.js')&&runtime.includes('damage-edge')&&runtime.includes('CAMERA · '),
 uiPolish:css.includes('.camera-banner')&&css.includes('.damage-edge')&&css.includes('.hud.minimap'),
 airportDistrict:districts.includes("airport:{label:'AEROPORTO DI PADOVA'")&&districts.includes('AIRPORT_DISTRICT'),
 cityIdentity:details.includes("root.userData.poi='central-squares'")&&details.includes("root.userData.poi='venetian-walls'")&&details.includes("root.userData.poi='padova-hill'")&&details.includes("fillText('PADOVA'"),
 taxiStreamingGate:streaming.includes('this.coreTarget')&&streaming.includes('pin.until=now+15000')&&streaming.includes('requiredCore:true')
};
const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);if(failed.length)throw new Error('Phase 2 polish verification failed: '+failed.join(', '));
console.log(JSON.stringify({ok:true,checks},null,2));
