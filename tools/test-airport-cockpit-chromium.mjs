import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1}),errors=[];let phase='boot';
page.on('pageerror',error=>errors.push(error.message));page.on('crash',()=>errors.push('Chromium crashed'));
try{
 const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.getElementById('playBtn')&&!document.getElementById('playBtn').disabled,null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js'),before=ModernGameplay.prototype.populate;ModernGameplay.prototype.populate=function(...args){const result=before.apply(this,args);globalThis.__cockpitTest=this;return result;};});
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();phase='world loading';
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click({timeout:20000});await page.waitForFunction(()=>!document.getElementById('playingUI').hidden,null,{timeout:20000});
 phase='real plane boarding';const staged=await page.evaluate(async()=>{
  const g=globalThis.__cockpitTest,s=g.state,{AIRPORT,areaPoint}=await import('./gameplay-areas.js'),plane=g.cars.find(c=>c.fixedSpawn&&c.style==='libellula'&&c.spec.plane),p=areaPoint(AIRPORT,0,-470);
  if(!plane)return {error:'No playable fixed-spawn plane'};
  Object.assign(plane,{x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),yaw:AIRPORT.yaw,speed:0,health:100,parked:true});plane.mesh.visible=true;g.pose(plane);
  Object.assign(s,{mode:'foot',car:null,x:p.x+Math.cos(plane.yaw)*(plane.spec.width/2+1),z:p.z-Math.sin(plane.yaw)*(plane.spec.width/2+1),y:plane.y,yaw:plane.yaw,speed:0,vy:0,health:100,wanted:0});
  return {style:plane.style,start:{x:p.x,z:p.z},yaw:plane.yaw};
 });assert(!staged.error,JSON.stringify(staged));await page.keyboard.press('e');
 await page.waitForFunction(()=>globalThis.__cockpitTest?.state?.car?.style==='libellula',null,{timeout:12000});
 await page.waitForFunction(()=>!document.getElementById('flightCockpit')?.hidden,null,{timeout:12000});
 const cockpit=await page.evaluate(()=>{const g=globalThis.__cockpitTest;return {visible:!document.getElementById('flightCockpit').hidden,speed:document.getElementById('fcSpeed')?.textContent,health:document.getElementById('fcLife')?.textContent,minimap:!document.getElementById('minimap')?.hidden,brake:g.state.car.spec.brake,oldPanelDisplay:getComputedStyle(document.getElementById('flightPanel')).display};});
 console.log('COCKPIT_BOARD '+JSON.stringify(cockpit));assert(cockpit.visible&&cockpit.minimap&&cockpit.health==='100'&&cockpit.brake>=30&&cockpit.oldPanelDisplay==='none','cockpit, map or adapted brake missing');
 await page.screenshot({path:'test-artifacts/airport-cockpit-after-boarding.png',timeout:20000});
 phase='S reverse from standstill';await page.keyboard.down('s');await page.waitForTimeout(1350);await page.keyboard.up('s');
 const reversed=await page.evaluate(()=>{const g=globalThis.__cockpitTest,s=g.state;return {x:s.x,z:s.z,yaw:s.yaw,speed:s.speed,reverse:s.car.groundReverse,brake:s.car.spec.brake};});
 const distance=(reversed.x-staged.start.x)*Math.sin(staged.yaw)+(reversed.z-staged.start.z)*Math.cos(staged.yaw);
 console.log('AIRCRAFT_REAL_REVERSE '+JSON.stringify({distance,reversed}));assert(distance< -2,'pressing S from standstill did not move the aircraft backwards');
 phase='civilian missile safety';const safety=await page.evaluate(async()=>{
  const g=globalThis.__cockpitTest,s=g.state,THREE=await import('./vendor/three.module.js');Object.assign(s,{wanted:0,health:100,speed:0});s.car.health=100;
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(.4,.4,.7),new THREE.MeshBasicMaterial());g.scene.add(mesh);
  g.airStrikes=4;g.incomingMissiles.push({mesh,p:new THREE.Vector3(s.x,s.y+1,s.z),dir:new THREE.Vector3(0,0,1),speed:110,age:0,owner:null});g.update(1/60);
  return {wanted:s.wanted,health:s.health,missiles:g.incomingMissiles.length,hostiles:g.airDefenders.length,warning:document.getElementById('flightWarning')?.hidden};
 });console.log('COCKPIT_CIVILIAN_SAFETY '+JSON.stringify(safety));assert(safety.wanted===0&&safety.health===100&&safety.missiles===0&&safety.hostiles===0&&safety.warning,'zero-star civilian got an incoming missile');
 phase='turbo speed smoothness';await page.evaluate(()=>{const g=globalThis.__cockpitTest,s=g.state;s.speed=32;s.car.speed=32;s.car.parked=false;});
 await page.keyboard.down('Shift');const samples=[];for(let i=0;i<8;i++){await page.waitForTimeout(90);samples.push(await page.evaluate(()=>{const s=globalThis.__cockpitTest.state;return {speed:s.speed,pitch:s.flightPitch,rotation:s.car.mesh.rotation.x};}));}
 await page.keyboard.up('Shift');const maximumSpeedJump=Math.max(...samples.slice(1).map((p,i)=>Math.abs(p.speed-samples[i].speed))),bad=!samples.every(s=>Number.isFinite(s.speed)&&Number.isFinite(s.pitch)&&Number.isFinite(s.rotation));
 console.log('TURBO_SMOOTHNESS '+JSON.stringify({samples,maximumSpeedJump}));assert(!bad&&maximumSpeedJump<16,'flight speed or orientation spikes when using turbo');
 assert.equal(errors.length,0,'browser JS errors '+errors.join(' | '));console.log('PASS WebGL cockpit, minimap, air brake, S reverse, zero-star safety and turbo speed sanity');
}catch(error){console.error('COCKPIT_WEBGL_FAIL '+phase+' '+(error.stack||error));console.error('JS_ERRORS '+JSON.stringify(errors.slice(-15)));try{await page.screenshot({path:'test-artifacts/airport-cockpit-failure.png',timeout:15000});}catch{}process.exitCode=1;}finally{await browser.close();}
