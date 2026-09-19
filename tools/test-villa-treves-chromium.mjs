import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
const errors=[];let phase='boot';
page.on('pageerror',error=>errors.push(error.message));page.on('crash',()=>errors.push('Chromium crashed'));
try{
 const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.getElementById('playBtn')&&!document.getElementById('playBtn').disabled,null,{timeout:45000});
 await page.evaluate(async()=>{
  const {ModernGameplay}=await import('./modern-gameplay.js'),before=ModernGameplay.prototype.populate;
  ModernGameplay.prototype.populate=function(...args){const out=before.apply(this,args);globalThis.__villaTest=this;return out;};
 });
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();phase='initial world';
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click({timeout:20000});
 await page.waitForFunction(()=>!document.getElementById('playingUI').hidden&&!!globalThis.__villaTest,null,{timeout:30000});
 phase='restored Treves park';
 const park=await page.evaluate(async()=>{
  const g=globalThis.__villaTest,{TREVES_PUBLIC_PARK}=await import('./villa-mandria-relocation.js');
  const {VILLA}=await import('./gameplay-areas.js');
  const authored=g.collision.near(TREVES_PUBLIC_PARK.x,TREVES_PUBLIC_PARK.z,125);
  return {separation:Math.hypot(VILLA.x-TREVES_PUBLIC_PARK.x,VILLA.z-TREVES_PUBLIC_PARK.z),
    oldPatch:g.terrain.platformAt(TREVES_PUBLIC_PARK.x,TREVES_PUBLIC_PARK.z),
    villaStructures:[...authored].filter(b=>b.kind==='gameplay').length};
 });
 console.log('TREVES_PARK_RESTORED '+JSON.stringify(park));
 assert(park.separation>2000&&!park.oldPatch&&park.villaStructures===0,'old public park must contain no fictional villa, garage, fence or terrain platform');
 // Go to the ONE relocated home/respawn.
 await page.evaluate(async()=>{
  const g=globalThis.__villaTest,{HOME}=await import('./gameplay-areas.js');
  Object.assign(g.state,{x:HOME.x,z:HOME.z,y:g.terrain.height(HOME.x,HOME.z),yaw:HOME.yaw,mode:'foot',car:null,speed:0,vy:0});
 });
 await page.waitForFunction(()=>globalThis.__villaTest?.villaEstate?.root?.visible,null,{timeout:60000});
 phase='relocated villa scene';
 const view=await page.evaluate(async()=>{
  const g=globalThis.__villaTest,{VILLA,HOME,areaPoint}=await import('./gameplay-areas.js');
  const {vehicleBlocked}=await import('./movement.js');
  const {VILLA_PUBLIC_NAME}=await import('./villa-mandria-relocation.js');
  const garage=areaPoint(VILLA,30,26),entrance=areaPoint(VILLA,20,26),gate=areaPoint(VILLA,0,49);
  const car={width:2.1,length:4.6,height:1.85};
  const clear=[entrance,garage,gate].map(p=>!vehicleBlocked(p.x,p.z,Math.PI/2,g.collision,car,g.terrain.height(p.x,p.z)));
  return {ready:!!g.villaEstate,visible:g.villaEstate.root.visible,assets:g.villaEstate.root.children.length,
   rootY:g.villaEstate.root.position.y,terrainY:g.terrain.height(VILLA.x,VILLA.z),
   clearance:clear,spawn:HOME.name,oldCars:g.cars.filter(c=>c.fixedSpawn&&c.home?.name===VILLA_PUBLIC_NAME).length};
 });
 console.log('MANDRIA_VILLA_WEBGL_SCENE '+JSON.stringify(view));
 assert(view.ready&&view.visible&&view.assets>30&&Math.abs(view.rootY-view.terrainY)<.01,'villa detail not aligned or missing');
 assert(view.clearance.every(Boolean),'garage, entrance or estate gate blocked in real world');
 assert(view.spawn==='Villa della Mandria'&&view.oldCars>=7,'new spawn or existing villa vehicles missing');
 await page.screenshot({path:'test-artifacts/villa-mandria-entrance.png',timeout:25000});
 phase='garage approach';
 await page.evaluate(async()=>{
  const g=globalThis.__villaTest,{VILLA,areaPoint}=await import('./gameplay-areas.js');const p=areaPoint(VILLA,12,26);
  Object.assign(g.state,{x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),yaw:Math.PI/2});
 });
 await page.waitForTimeout(500);
 await page.screenshot({path:'test-artifacts/villa-mandria-garage.png',timeout:25000});
 assert(await page.evaluate(()=>globalThis.__villaTest.villaEstate.root.visible),'estate disappeared near garage');
 assert.equal(errors.length,0,'JS errors: '+errors.join(' | '));
 console.log('PASS WebGL: Treves restored; ONE relocated Mandria villa, seven vehicles and clear gate/garage');
}catch(error){console.error('MANDRIA_VILLA_WEBGL_FAIL '+phase+' '+(error.stack||error));console.error('JS_ERRORS '+JSON.stringify(errors.slice(-15)));try{await page.screenshot({path:'test-artifacts/villa-mandria-failure.png',timeout:15000});}catch{}process.exitCode=1;}
finally{await browser.close();}
