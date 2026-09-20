import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];let phase='startup';
page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Browser crashed'));
try{
 const result=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(result.status(),200);
 await page.waitForFunction(()=>!document.getElementById('playBtn')?.disabled,null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js'),old=ModernGameplay.prototype.populate;
  ModernGameplay.prototype.populate=function(...a){const value=old.apply(this,a);globalThis.__estateV6=this;return value;};});
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||!document.getElementById('initialLoaderError')?.hidden,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');await page.locator('#confirmCharacter').click({timeout:20000});
 await page.waitForFunction(()=>!!globalThis.__estateV6?.villaV6&&!!globalThis.__estateV6?.villaV6Stairs,null,{timeout:65000});
 phase='estate / paths';
 const report=await page.evaluate(()=>{const g=globalThis.__estateV6,e=g.villaV6,range=g.villaRange;
  return {roofs:e.roofs,parking:e.parking,ape:e.ape,rearWorkers:e.rear.people.length,rearCrops:e.rear.plants,hay:e.rear.hay,trios:e.rear.trios.length,
   trioSizes:e.rear.trios.map(p=>p.group.children.length),stairs:e.root!==g.villaV6Stairs.root&&g.villaV6Stairs.root.children.length,
   apes:g.villaV3.patrols.filter(c=>c.mandriaPatrol==='ape').map(c=>({route:c.route,name:c.name})),range:range?.ready?{u:range.u,v:range.v}:null};
 });console.log('MANDRIA_V6_REPORT '+JSON.stringify(report));
 assert(report.roofs>=3,'worker cottages and barns need corrected gables');
 assert(report.parking.aligned&&report.parking.againstWall&&report.parking.gap<.5,'Saetta/Fulmine must stand together against hangar wall');
 assert(report.ape.rerouted>=1&&report.ape.apeTotal>=2,'Ape security needs several valid loops');
 assert(report.rearWorkers>=5&&report.rearCrops>=60&&report.hay>=2,'rear farm is underpopulated');
 assert(report.trios>=1&&report.trioSizes.every(n=>n===3),'security team must have one suited leader and two vest guards');
 assert(report.stairs>60,'visible exterior stairs not generated');
 if(report.range)for(const car of report.apes)for(const [u,v] of car.route)assert(!(Math.abs(u-report.range.u)<13&&Math.abs(v-report.range.v)<21),'Ape passes through shooting range');
 phase='scope real first-person camera';
 const r=await page.evaluate(()=>{const g=globalThis.__estateV6,r=g.villaRange;if(!r?.ready)return false;Object.assign(g.state,{x:r.station.x,z:r.station.z,y:g.terrain.height(r.station.x,r.station.z),mode:'foot',car:null,speed:0,vy:0,mission:null});return true;});assert(r);
 await page.keyboard.press('KeyE');await page.waitForFunction(()=>globalThis.__estateV6.villaRange?.active,null,{timeout:12000});
 await page.keyboard.press('Tab');await page.waitForFunction(()=>document.body.classList.contains('mandria-sniper'),null,{timeout:12000});
 await page.evaluate(async()=>{const THREE=await import('./vendor/three.module.js'),old=THREE.WebGLRenderer.prototype.render;
  THREE.WebGLRenderer.prototype.render=function(scene,camera){const out=old.call(this,scene,camera);const g=globalThis.__estateV6;
   if(scene===g?.scene&&g.villaRange?.aiming)globalThis.__scopeCamera={fov:camera.fov,x:camera.position.x,y:camera.position.y,z:camera.position.z,player:g.state};return out;};});
 await page.waitForFunction(()=>globalThis.__scopeCamera?.fov===22,null,{timeout:12000});
 const scope=await page.evaluate(()=>{const c=globalThis.__scopeCamera;return {fov:c.fov,distance:Math.hypot(c.x-c.player.x,c.z-c.player.z),eyeHeight:c.y-c.player.y,reticle:!document.getElementById('mandriaSniperScope').hidden,holster:!document.getElementById('mandriaHolster').hidden};});
 console.log('MANDRIA_V6_SCOPE '+JSON.stringify(scope));assert.equal(scope.fov,22);assert(scope.distance<.03&&scope.eyeHeight>1.5&&scope.eyeHeight<2&&scope.reticle&&scope.holster,'scope still looks toward player rather than from eyes');
 await page.screenshot({path:'test-artifacts/mandria-v6-actual-first-person-scope.png',timeout:25000});
 await page.keyboard.press('KeyX');await page.waitForFunction(()=>!globalThis.__estateV6.villaRange.active,null,{timeout:10000});
 phase='stairs interaction';
 await page.evaluate(()=>{const g=globalThis.__estateV6,e=g.villaV6Stairs;Object.assign(g.state,{mode:'foot',car:null,x:e.bottom.x,z:e.bottom.z,y:e.base,speed:0,vy:0});});
 await page.waitForFunction(()=>!document.getElementById('mandriaV6StairButton')?.hidden,null,{timeout:12000});await page.locator('#mandriaV6StairButton').click();
 assert.equal(await page.evaluate(()=>!!globalThis.__estateV6.villaV6Stairs.travel),true,'E must start exterior staircase ascent');
 assert.deepEqual(errors,[],'game JavaScript errors');console.log('PASS Mandria v6 real scoped camera, X holster, roof and wall parking, Ape routes, rear crops, trio patrols and stair interaction');
}catch(error){console.error('MANDRIA_V6_FAIL '+phase+' '+(error.stack||error));console.error('JS_ERRORS '+JSON.stringify(errors.slice(-10)));try{await page.screenshot({path:'test-artifacts/mandria-v6-failure.png',timeout:14000});}catch{}process.exitCode=1;}
finally{await browser.close();}
