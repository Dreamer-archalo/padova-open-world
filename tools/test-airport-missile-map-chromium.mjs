import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1}),errors=[];
page.on('pageerror',error=>errors.push(error.message));page.on('crash',()=>errors.push('browser crashed'));
let phase='boot';
try{
 const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.getElementById('playBtn')&&!document.getElementById('playBtn').disabled,null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js');const original=ModernGameplay.prototype.populate;ModernGameplay.prototype.populate=function(...args){const result=original.apply(this,args);globalThis.__airportMissileGame=this;return result;};});
 phase='load world';await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click({timeout:20000});await page.waitForFunction(()=>document.getElementById('playingUI')?.hidden===false,null,{timeout:20000});
 phase='civilian aircraft';const aircraft=await page.evaluate(async()=>{
  const g=globalThis.__airportMissileGame,{AIRPORT,areaPoint}=await import('./gameplay-areas.js'),p=areaPoint(AIRPORT,103,198);
  Object.assign(g.state,{mode:'foot',car:null,x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),speed:0,health:100,vy:0,wanted:0});
  g.update(1/60);
  const ops=g.interactiveAirport;
  return {newModels:ops.civil?.map(c=>c.style)||[],extras:ops.extras.length,jets:ops.planes.size};
 });
 console.log('CIVIL_FLEET_WEBGL '+JSON.stringify(aircraft));
 assert.deepEqual([...aircraft.newModels].sort(),['airport-business','airport-commuter','airport-regional'].sort(),'one or more additional civil models absent from real world');
 phase='board military jet';const ready=await page.evaluate(()=>{
  const g=globalThis.__airportMissileGame,c=g.interactiveAirport.extras.find(c=>c.style==='airport-interceptor');
  if(!c)return {error:'missing military interceptor'};
  const lateral=c.spec.width/2+1.07,x=c.x+Math.cos(c.yaw)*lateral,z=c.z-Math.sin(c.yaw)*lateral;
  Object.assign(g.state,{mode:'foot',car:null,x,z,y:g.terrain.height(x,z,c.y),speed:0,health:100,vy:0,wanted:0});
  c.speed=0;c.parked=true;c.health=100;c.mesh.visible=true;
  return {style:c.style};
 });
 assert(!ready.error,'jet preparation failed '+JSON.stringify(ready));
 await page.keyboard.press('e');
 await page.waitForFunction(()=>globalThis.__airportMissileGame?.state?.car?.style==='airport-interceptor',null,{timeout:12000});
 phase='G guided missile';await page.keyboard.press('g');
 await page.waitForFunction(()=>globalThis.__airportMissileGame?.state?.car?.nextAirportMissile>globalThis.__airportMissileGame?.state?.elapsed,null,{timeout:10000});
 const fired=await page.evaluate(()=>{const g=globalThis.__airportMissileGame;return {style:g.state.car.style,next:g.state.car.nextAirportMissile,time:g.state.elapsed,projectiles:g.airportMissiles?.length||0};});
 console.log('JET_MISSILE_WEBGL '+JSON.stringify(fired));assert(fired.next>fired.time,'G failed to fire guided missile');
 phase='M aircraft map';await page.keyboard.press('m');await page.waitForFunction(()=>document.getElementById('mapDialog')?.open,null,{timeout:10000});
 const map=await page.evaluate(async()=>{
  const {flyingAirportMarkers}=await import('./airport-flight-extras.js'),g=globalThis.__airportMissileGame,c=document.getElementById('fullmap'),ctx=c.getContext('2d');
  const points=flyingAirportMarkers(g),cargo=points.find(p=>p.kind==='C'),heli=points.find(p=>p.kind==='H');
  if(!cargo||!heli)return {count:points.length,cargo:!!cargo,heli:!!heli};
  const x=Math.round((cargo.x+6050)/13400*c.width),y=Math.round((cargo.z+6550)/12900*c.height),rgba=[...ctx.getImageData(x,y,1,1).data];
  return {count:points.length,cargo:true,heli:true,rgba,paused:g.state.paused,dialog:document.getElementById('mapDialog').open};
 });
 console.log('AIRCRAFT_MAP_WEBGL '+JSON.stringify(map));
 assert(map.dialog&&map.paused&&map.cargo&&map.heli&&map.count>=3,'air radar missing initial flying aircraft');
 assert(map.rgba?.[1]>map.rgba?.[0]&&map.rgba?.[1]>map.rgba?.[2],'airborne cargo dot was not painted green on map');
 await page.screenshot({path:'test-artifacts/airport-flight-radar.png',timeout:20000});
 assert.equal(errors.length,0,'WebGL errors '+errors.join(' | '));
 console.log('PASS WebGL new civil fleet, keyboard G guided missile, M-map cargo and helicopter markers');
}catch(error){console.error('AIRPORT_MISSILE_MAP_FAIL phase='+phase+' '+(error.stack||error));console.error('JS_ERRORS '+JSON.stringify(errors.slice(-12)));try{await page.screenshot({path:'test-artifacts/airport-missile-map-failure.png',timeout:15000});}catch{}process.exitCode=1;}finally{await browser.close();}
