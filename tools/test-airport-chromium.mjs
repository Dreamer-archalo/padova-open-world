import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
await context.addInitScript(()=>{try{localStorage.setItem('padova-game-v1',JSON.stringify({money:5000,quality:'hyper',jobs:0,character:'fede'}));}catch{}});
const page=await context.newPage(),errors=[];let phase='page load';
page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Chromium crashed'));
const diagnostic=async()=>{try{return await page.evaluate(()=>({ready:document.documentElement.dataset.initialWorldReady,loaderError:document.getElementById('initialLoaderError')?.textContent,playing:!document.getElementById('playingUI')?.hidden,game:!!globalThis.__airportBrowserTest}));}catch(e){return {error:e.message};}};
try{
 const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(response?.status(),200);
 phase='game module';await page.waitForFunction(()=>{const b=document.getElementById('playBtn');return b&&!b.disabled&&b.textContent.includes('Carica la mappa');},null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js');const original=ModernGameplay.prototype.populate;ModernGameplay.prototype.populate=function(...args){const result=original.apply(this,args);globalThis.__airportBrowserTest=this;return result;};});
 phase='world load';await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal((await diagnostic()).ready,'true','World load failed: '+JSON.stringify(await diagnostic()));
 await page.locator('#confirmCharacter').click({timeout:20000});await page.waitForFunction(()=>document.getElementById('playingUI')?.hidden===false,null,{timeout:20000});
 phase='real WebGL and airport world';const airport=await page.evaluate(async()=>{
  const g=globalThis.__airportBrowserTest,{AIRPORT,AIRPORT_GATE,gameplayStructures}=await import('./gameplay-areas.js');
  const gl=document.getElementById('world')?.getContext('webgl2');
  const c=g.cars.find(c=>c.fixedSpawn&&c.style==='utility'&&Math.hypot(c.x-AIRPORT_GATE.x,c.z-AIRPORT_GATE.z)<500);
  const planes=g.cars.filter(c=>c.fixedSpawn&&c.spec?.plane).length,helicopters=g.cars.filter(c=>c.fixedSpawn&&c.spec?.aircraft&&!c.spec?.plane).length;
  const structures=gameplayStructures(g.terrain);const runway=structures.filter(s=>s.color==='#454e54').length;
  if(c){Object.assign(g.state,{mode:'foot',car:null,x:c.x+Math.cos(c.yaw)*(c.spec.width/2+1),z:c.z-Math.sin(c.yaw)*(c.spec.width/2+1),y:c.y,speed:0,wanted:0,vy:0});}
  return {gl:gl?.getParameter(gl.VERSION)||null,utility:!!c,planes,helicopters,structures:structures.length,runway,gate:[AIRPORT_GATE.x,AIRPORT_GATE.z],center:[AIRPORT.x,AIRPORT.z]};
 });
 console.log('AIRPORT_WEBGL_SCENE '+JSON.stringify(airport));
 assert(airport.gl?.includes('WebGL')&&airport.utility&&airport.planes>=3&&airport.helicopters>=2&&airport.runway>10,'Airport renderer, vehicle spawns or runway missing');
 phase='board airport service vehicle';await page.waitForTimeout(1400);await page.keyboard.press('e');
 await page.waitForFunction(()=>{const g=globalThis.__airportBrowserTest;return g?.state?.mode==='car'&&g.state.car?.style==='utility';},null,{timeout:12000});
 phase='approach and drive through gate';const from=await page.evaluate(async()=>{
  const g=globalThis.__airportBrowserTest,{AIRPORT,areaPoint,areaLocal}=await import('./gameplay-areas.js');
  const start=areaPoint(AIRPORT,225,250),gate=areaPoint(AIRPORT,205,250),car=g.state.car,yaw=Math.atan2(gate.x-start.x,gate.z-start.z),y=g.terrain.height(start.x,start.z);
  Object.assign(car,{x:start.x,z:start.z,y,yaw,speed:0});Object.assign(g.state,{x:start.x,z:start.z,y,yaw,speed:0,health:100});g.pose(car);
  return {x:start.x,y,z:start.z,local:areaLocal(AIRPORT,start.x,start.z)};
 });
 await page.waitForTimeout(1600);await page.screenshot({path:'test-artifacts/airport-before-gate.png',timeout:20000});
 await page.keyboard.down('w');await page.waitForTimeout(2900);await page.keyboard.up('w');await page.waitForTimeout(200);
 const after=await page.evaluate(async()=>{const g=globalThis.__airportBrowserTest,s=g.state,{AIRPORT,areaLocal}=await import('./gameplay-areas.js');return {x:s.x,y:s.y,z:s.z,speed:s.speed,local:areaLocal(AIRPORT,s.x,s.z),ground:g.terrain.height(s.x,s.z),vehicle:s.car?.style,mode:s.mode};});
 const metres=Math.hypot(after.x-from.x,after.z-from.z);console.log('AIRPORT_WEBGL_GATE_DRIVE '+JSON.stringify({from,after,metres}));
 assert.equal(after.vehicle,'utility','Lost airport car');assert.equal(after.mode,'car','Exited car during gate traversal');
 assert(metres>5,'Actual keyboard input did not move airport vehicle');
 assert(after.local.u<215,'Actual keyboard driving did not pass through the fence opening');
 assert(Math.abs(after.y-after.ground)<1.5,'Airport car is not supported by the terrain');
 await page.screenshot({path:'test-artifacts/airport-after-gate.png',timeout:20000});
 assert.equal(errors.length,0,'Browser errors: '+errors.join(' | '));
 console.log('PASS Chromium WebGL2 airport scene, usable service vehicle and keyboard crossing of gate; full city drive, Taxi ride and aircraft flight still require separate browser validation.');
}catch(error){console.error('AIRPORT_BROWSER_FAIL phase='+phase+' '+(error.stack||error));console.error('AIRPORT_BROWSER_STATUS '+JSON.stringify(await diagnostic()));console.error('AIRPORT_BROWSER_ERRORS '+JSON.stringify(errors.slice(-15)));try{await page.screenshot({path:'test-artifacts/airport-failure.png',timeout:15000});}catch{}process.exitCode=1;}finally{await browser.close();}
