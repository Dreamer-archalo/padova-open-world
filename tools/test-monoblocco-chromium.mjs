import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
await context.addInitScript(()=>{try{localStorage.setItem('padova-game-v1',JSON.stringify({money:5000,quality:'hyper',jobs:0,character:'fede'}));}catch{}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('crash',()=>errors.push('Chromium page crashed'));
let phase='navigation';
const status=async()=>{try{return await page.evaluate(()=>({ready:document.documentElement.dataset.initialWorldReady,loader:document.getElementById('initialLoaderStatus')?.textContent,error:document.getElementById('initialLoaderError')?.textContent,playing:!document.getElementById('playingUI')?.hidden,mode:globalThis.__monobloccoTest?.state?.mode}));}catch(e){return {error:e.message};}};
try{
 const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});
 assert.equal(response?.status(),200);
 phase='module initialization';
 await page.waitForFunction(()=>{const b=document.getElementById('playBtn');return b&&!b.disabled&&b.textContent.includes('Carica la mappa');},null,{timeout:45000});
 // Observe the actual ModernGameplay instance during the normal startup path.
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js');const original=ModernGameplay.prototype.populate;ModernGameplay.prototype.populate=function(...args){const value=original.apply(this,args);globalThis.__monobloccoTest=this;return value;};});
 phase='world streaming';
 await page.locator('#initialQuality').selectOption('hyper');
 await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal((await status()).ready,'true','World did not initialize: '+JSON.stringify(await status()));
 phase='player entry';
 await page.locator('#confirmCharacter').click({timeout:20000});
 await page.waitForFunction(()=>document.getElementById('playingUI')?.hidden===false,null,{timeout:20000});
 phase='real WebGL roof scene';
 const rooftop=await page.evaluate(()=>{
  const game=globalThis.__monobloccoTest;if(!game)return {error:'ModernGameplay instance not captured'};
  const root=game.scene.children.find(o=>o.name==='ospedale-monoblocco-entire-roof-trial');
  const roof=root?.children.find(o=>o.name==='monoblocco-whole-footprint-flat-roof');
  const bikes=game.cars.filter(c=>c.hospitalRoofBike),fans=[];root?.traverse(o=>{if(o.userData?.roofSpectator)fans.push(o);});
  const gl=document.getElementById('world')?.getContext('webgl2');
  const ramps=game.terrain.arcadeRamps||[];
  return {root:!!root,roof:!!roof,bikes:bikes.length,moving:bikes.filter(c=>!c.parked).length,fans:fans.length,gl:gl?.getParameter(gl.VERSION)||null,roofY:(roof?.position.y??0)-.035,available:bikes.some(c=>c.parked),positions:bikes.map(c=>[c.x,c.y,c.z]),coursePolish:root?.userData.coursePolish||null,extraRamps:ramps.filter(r=>r.kind==='hospital-rooftop-jump').length,realGapBridges:ramps.filter(r=>r.realGapBridge).length};
 });
 console.log('ROOF_BROWSER_SCENE '+JSON.stringify(rooftop));
 assert.equal(rooftop.root,true,'Whole Monoblocco roof missing from rendered scene');
 assert.equal(rooftop.roof,true,'Full footprint roof mesh missing');
 assert.equal(rooftop.bikes,3);assert.equal(rooftop.moving,2);assert(rooftop.fans>=4);
 assert(rooftop.gl?.includes('WebGL'),'Actual WebGL2 context missing');
 assert.equal(rooftop.available,true);
 assert.equal(rooftop.coursePolish?.rooftopSpikesCleaned,true,'Targeted rooftop cleanup must initialize in the browser');
 assert(rooftop.extraRamps>=2,'Two or more additional driveable ramps must spawn in the browser');
 assert.equal(rooftop.extraRamps,rooftop.coursePolish.extraRamps,'Visual ramp count must match physical contact ramps');
 assert.equal(rooftop.realGapBridges,rooftop.coursePolish.realGapBridges,'Visual bridge count must match physical contact bridges');
 phase='rooftop camera and rider';
 await page.evaluate(()=>{const g=globalThis.__monobloccoTest,b=g.cars.find(c=>c.hospitalRoofBike&&c.parked),s=g.state;Object.assign(s,{x:b.x+.8,z:b.z,y:b.y,yaw:b.yaw,mode:'foot',car:null,speed:0,vy:0,wanted:0});});
 await page.waitForTimeout(1200);
 await page.screenshot({path:'test-artifacts/monoblocco-before-ride.png',timeout:20000});
 await page.keyboard.press('e');
 await page.waitForFunction(()=>{const g=globalThis.__monobloccoTest;return g?.state?.mode==='car'&&g.state.car?.hospitalRoofBike===true;},null,{timeout:12000});
 const before=await page.evaluate(()=>{const s=globalThis.__monobloccoTest.state;return {x:s.x,y:s.y,z:s.z};});
 phase='real keyboard ride';
 await page.keyboard.down('w');await page.waitForTimeout(1400);await page.keyboard.up('w');await page.waitForTimeout(250);
 const after=await page.evaluate(async()=>{const g=globalThis.__monobloccoTest,s=g.state,{pointInside}=await import('./core.js'),b=[...g.collision.near(s.x,s.z,260)].find(o=>o.n==='Ospedale Civile - Monoblocco - Casse - Prenotazioni');return {x:s.x,y:s.y,z:s.z,speed:s.speed,mode:s.mode,roofInside:!!b&&pointInside(s.x,s.z,b.p),vehicle:g.state.car?.hospitalRoofBike===true};});
 const metres=Math.hypot(after.x-before.x,after.z-before.z);
 console.log('ROOF_BROWSER_RIDE '+JSON.stringify({before,after,metres,roofY:rooftop.roofY}));
 assert(after.vehicle&&after.mode==='car','Roof bike failed to remain driveable');
 assert(metres>.4,'W input did not physically move trial bike');
 assert(after.roofInside,'Test bike fell outside the real Monoblocco polygon');
 assert(after.y>=rooftop.roofY-.8,'Bike fell through the roof');
 await page.screenshot({path:'test-artifacts/monoblocco-after-ride.png',timeout:20000});
 assert.equal(errors.length,0,'Browser errors: '+errors.join(' | '));
 console.log('PASS real WebGL2 roof loaded, '+rooftop.extraRamps+' extra ramps, '+rooftop.realGapBridges+' actual gap bridges, 3 motorcycles, spectators, ride-by-keyboard and roof contact');
}catch(error){
 console.error('ROOF_BROWSER_FAIL phase='+phase+' '+(error.stack||error));
 console.error('ROOF_BROWSER_STATUS '+JSON.stringify(await status()));
 console.error('ROOF_BROWSER_ERRORS '+JSON.stringify(errors.slice(-12)));
 try{await page.screenshot({path:'test-artifacts/monoblocco-failure.png',timeout:15000});}catch{}
 process.exitCode=1;
}finally{await browser.close();}
