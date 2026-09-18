import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
await context.addInitScript(()=>{try{localStorage.setItem('padova-game-v1',JSON.stringify({money:5000,quality:'hyper',jobs:0,character:'fede'}));}catch{}});
const page=await context.newPage(),errors=[];let phase='page load';
page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Chromium crashed'));
const status=async()=>{try{return await page.evaluate(()=>({ready:document.documentElement.dataset.initialWorldReady,loaderError:document.getElementById('initialLoaderError')?.textContent,playing:!document.getElementById('playingUI')?.hidden,game:!!globalThis.__airportFlightTest,altitude:globalThis.__airportFlightTest?.state?.y,mode:globalThis.__airportFlightTest?.state?.mode}));}catch(e){return {error:e.message};}};
try{
 const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(response?.status(),200);
 phase='module initialization';await page.waitForFunction(()=>{const b=document.getElementById('playBtn');return b&&!b.disabled&&b.textContent.includes('Carica la mappa');},null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js');const original=ModernGameplay.prototype.populate;ModernGameplay.prototype.populate=function(...args){const result=original.apply(this,args);globalThis.__airportFlightTest=this;return result;};});
 phase='stream world';await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal((await status()).ready,'true','World load failed: '+JSON.stringify(await status()));
 await page.locator('#confirmCharacter').click({timeout:20000});await page.waitForFunction(()=>document.getElementById('playingUI')?.hidden===false,null,{timeout:20000});
 phase='place player alongside actual airport aircraft';const before=await page.evaluate(async()=>{
  const g=globalThis.__airportFlightTest,{AIRPORT,areaPoint,areaLocal}=await import('./gameplay-areas.js');
  const plane=g.cars.find(c=>c.fixedSpawn&&c.style==='libellula'&&c.spec.plane),gl=document.getElementById('world')?.getContext('webgl2');
  if(!plane)return {error:'No playable Libellula aircraft'};
  const start=areaPoint(AIRPORT,0,-470),y=g.terrain.height(start.x,start.z);
  Object.assign(plane,{x:start.x,z:start.z,y,yaw:AIRPORT.yaw,speed:0,health:100,parked:true});g.pose(plane);
  Object.assign(g.state,{mode:'foot',car:null,x:start.x+Math.cos(plane.yaw)*(plane.spec.width/2+1),z:start.z-Math.sin(plane.yaw)*(plane.spec.width/2+1),y,yaw:plane.yaw,speed:0,vy:0,health:100,wanted:0});
  return {plane:plane.style,gl:gl?.getParameter(gl.VERSION)||null,ground:y,local:areaLocal(AIRPORT,start.x,start.z)};
 });
 console.log('AIRPORT_FLIGHT_START '+JSON.stringify(before));assert(before.plane==='libellula'&&before.gl?.includes('WebGL'),'Aircraft or actual WebGL missing');
 await page.waitForTimeout(1100);await page.keyboard.press('e');await page.waitForFunction(()=>{const g=globalThis.__airportFlightTest;return g?.state?.mode==='car'&&g.state.car?.style==='libellula';},null,{timeout:12000});
 await page.screenshot({path:'test-artifacts/airport-before-takeoff.png',timeout:20000});
 phase='actual keyboard takeoff';await page.keyboard.down('w');await page.keyboard.down('Space');
 await page.waitForFunction(()=>{const g=globalThis.__airportFlightTest,s=g?.state;return s?.car?.spec?.plane&&s.y>g.terrain.height(s.x,s.z)+8;},null,{timeout:26000});
 const airborne=await page.evaluate(async()=>{const g=globalThis.__airportFlightTest,s=g.state,{AIRPORT,areaLocal}=await import('./gameplay-areas.js');return {x:s.x,z:s.z,y:s.y,ground:g.terrain.height(s.x,s.z),speed:s.speed,health:s.health,local:areaLocal(AIRPORT,s.x,s.z)};});
 await page.keyboard.up('Space');await page.keyboard.up('w');
 console.log('AIRPORT_FLIGHT_AIRBORNE '+JSON.stringify(airborne));assert(airborne.y-airborne.ground>8&&airborne.health>0,'Aircraft did not fly safely');
 await page.screenshot({path:'test-artifacts/airport-airborne.png',timeout:20000});
 phase='actual keyboard landing';await page.keyboard.down('Control');
 await page.waitForFunction(()=>{const g=globalThis.__airportFlightTest,s=g?.state;return s?.car?.spec?.plane&&s.y<=g.terrain.height(s.x,s.z)+.18;},null,{timeout:30000});
 await page.keyboard.up('Control');
 const landed=await page.evaluate(async()=>{const g=globalThis.__airportFlightTest,s=g.state,{AIRPORT,areaLocal}=await import('./gameplay-areas.js');return {x:s.x,z:s.z,y:s.y,ground:g.terrain.height(s.x,s.z),speed:s.speed,health:s.health,mode:s.mode,style:s.car?.style,local:areaLocal(AIRPORT,s.x,s.z)};});
 console.log('AIRPORT_FLIGHT_LANDING '+JSON.stringify(landed));
 assert(landed.style==='libellula'&&landed.mode==='car'&&landed.health>0,'Player or aircraft lost on landing');
 assert(Math.abs(landed.local.u)<15&&Math.abs(landed.local.v)<540,'Landing outside authored runway');
 assert(Math.abs(landed.y-landed.ground)<.2,'Airplane not supported by runway after landing');
 await page.screenshot({path:'test-artifacts/airport-after-landing.png',timeout:20000});
 assert.equal(errors.length,0,'Browser JS errors: '+errors.join(' | '));
 console.log('PASS actual WebGL keyboard boarding, takeoff and Ctrl landing on runway');
}catch(error){console.error('AIRPORT_FLIGHT_FAIL phase='+phase+' '+(error.stack||error));console.error('AIRPORT_FLIGHT_STATUS '+JSON.stringify(await status()));console.error('AIRPORT_FLIGHT_ERRORS '+JSON.stringify(errors.slice(-15)));try{await page.keyboard.up('w');await page.keyboard.up('Space');await page.keyboard.up('Control');await page.screenshot({path:'test-artifacts/airport-flight-failure.png',timeout:15000});}catch{}process.exitCode=1;}finally{await browser.close();}
