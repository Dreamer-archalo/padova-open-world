import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
await context.addInitScript(()=>{try{localStorage.setItem('padova-game-v1',JSON.stringify({money:5000,quality:'hyper',jobs:0,character:'fede'}));}catch{}});
const page=await context.newPage(),errors=[];let phase='navigation';
page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Chromium crashed'));
try{
 const res=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(res?.status(),200);
 phase='capture gameplay instance';await page.waitForFunction(()=>{const b=document.getElementById('playBtn');return b&&!b.disabled&&b.textContent.includes('Carica la mappa');},null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js'),populate=ModernGameplay.prototype.populate;ModernGameplay.prototype.populate=function(...args){const value=populate.apply(this,args);globalThis.__heliRoofGame=this;return value;};});
 phase='load city';await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true','City bootstrap failed');
 await page.locator('#confirmCharacter').click({timeout:20000});await page.waitForFunction(()=>document.getElementById('playingUI')?.hidden===false,null,{timeout:20000});
 phase='position helicopter above verified helipad';const placed=await page.evaluate(async()=>{
  const g=globalThis.__heliRoofGame,{resolveHospital,findLayout}=await import('./hospital-rooftop-easter-egg.js'),site=resolveHospital(g);
  if(!site)throw Error('Exact Monoblocco roof not found');const layout=findLayout(site.polygon,site.building);if(!layout)throw Error('Helipad not found');
  const h=g.addCar(layout.helipad.x,layout.helipad.z,0,false,false,'falco');
  Object.assign(h,{x:layout.helipad.x,z:layout.helipad.z,y:site.roofY+5.5,yaw:0,speed:0,parked:false,fixedSpawn:false,missionUnit:true,health:100});h.mesh.visible=true;
  Object.assign(g.state,{mode:'car',car:h,x:h.x,z:h.z,y:h.y,yaw:0,speed:0,vy:0,health:100,wanted:0});g.pose(h);globalThis.__heliRoofLanding={heli:h,y:site.roofY,polygon:site.polygon};
  return {roofY:site.roofY,helicopterY:g.state.y,helipad:layout.helipad};
 });console.log('HELI_BROWSER_INITIAL '+JSON.stringify(placed));
 phase='descend using actual keyboard physics';await page.keyboard.down('Shift');
 try{await page.waitForFunction(()=>{const o=globalThis.__heliRoofLanding,g=globalThis.__heliRoofGame;return g?.state.y<=o.y+.20;},null,{timeout:35000});}finally{await page.keyboard.up('Shift');}
 const landed=await page.evaluate(()=>{const g=globalThis.__heliRoofGame,o=globalThis.__heliRoofLanding;return {y:g.state.y,roofY:o.y,mode:g.state.mode,carVisible:o.heli.mesh.visible,carY:o.heli.y};});
 console.log('HELI_BROWSER_LANDED '+JSON.stringify(landed));assert(landed.y>=landed.roofY-.3&&landed.y<=landed.roofY+.20,'Helicopter failed roof contact');
 await page.screenshot({path:'test-artifacts/monoblocco-heli-landed.png',timeout:20000});
 phase='exit actual parked helicopter with E';await page.keyboard.press('e');await page.waitForFunction(()=>globalThis.__heliRoofGame?.state.mode==='foot',null,{timeout:12000});await page.waitForTimeout(600);
 const exited=await page.evaluate(async()=>{const g=globalThis.__heliRoofGame,o=globalThis.__heliRoofLanding,{pointInside}=await import('./core.js');return {mode:g.state.mode,playerY:g.state.y,roofY:o.y,insideRoof:pointInside(g.state.x,g.state.z,o.polygon),helicopterVisible:o.heli.mesh.visible,helicopterParked:o.heli.parked,rooftopParked:o.heli.rooftopParked===true,fixedSpawn:o.heli.fixedSpawn,helicopterY:o.heli.y,stillInCars:g.cars.includes(o.heli)};});
 console.log('HELI_BROWSER_EXIT '+JSON.stringify(exited));assert.equal(exited.mode,'foot');assert(exited.insideRoof&&exited.playerY>=exited.roofY-.3,'Exited into air or off roof');assert(exited.helicopterVisible&&exited.helicopterParked&&exited.rooftopParked&&exited.stillInCars,'Landed helicopter not retained visibly');assert.equal(exited.fixedSpawn,false);
 await page.screenshot({path:'test-artifacts/monoblocco-heli-parked.png',timeout:20000});
 assert.deepEqual(errors,[],'Browser uncaught errors');console.log('PASS live Chromium helicopter descent, E roof exit, persistent visible parked helicopter');
}catch(e){console.error('HELI_BROWSER_FAIL phase='+phase+' '+(e.stack||e));console.error('HELI_BROWSER_ERRORS '+JSON.stringify(errors));try{await page.screenshot({path:'test-artifacts/monoblocco-heli-failure.png',timeout:10000});}catch{}process.exitCode=1;}finally{await browser.close();}
