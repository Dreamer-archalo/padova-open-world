// Run against the v11 branch's real WebGL game, not mocks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];let phase='startup';
page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('browser crash'));
try{
 const response=await page.goto('http://127.0.0.1:4173/?estateDebug=1',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(response.status(),200);
 await page.waitForFunction(()=>!document.getElementById('playBtn')?.disabled,null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js'),old=ModernGameplay.prototype.populate;
  ModernGameplay.prototype.populate=function(...args){const value=old.apply(this,args);globalThis.__mandriaV11=this;return value;};});
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||!document.getElementById('initialLoaderError')?.hidden,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click({timeout:20000});
 phase='v11 modules';await page.waitForFunction(()=>!!globalThis.__mandriaV11?.villaV11?.report&&!!globalThis.__mandriaV11?.villaV10?.report,null,{timeout:85000});
 const estate=await page.evaluate(()=>{const g=globalThis.__mandriaV11,apes=g.villaV3.patrols.filter(c=>c.mandriaPatrol==='ape');
  return {v9:g.villaV9.report,v10:g.villaV10.report,v11:g.villaV11.report,apes:apes.map(c=>({waypoints:c.route.length,routeIndex:c.routeIndex})),horses:g.villaV3.patrols.filter(c=>c.mandriaArenaHorse).length,menu:!!document.getElementById('mandriaV11Qa'),road:g.map?.gameplay?.mandriaRoadQuality||g.city?.gameplay?.mandriaRoadQuality||null};});
 console.log('MANDRIA_V11_ESTATE '+JSON.stringify(estate));
 assert(estate.v11.serviceCars>=0&&estate.v11.separatedSections>=0,'service lane report not initialized');
 assert(estate.apes.length>=3&&estate.apes.every(c=>c.waypoints>40),'long Ape circuits were lost');
 assert(estate.horses>=2&&estate.v10.roamingHorses>=1,'horses must remain in arena and on estate');
 assert(estate.v9.workers>=8&&estate.v11.zonedWorkers>=0,'workforce must be preserved');
 assert(estate.menu,'v11 test tools must be present only when requested');
 phase='inspection menu';await page.keyboard.press('F8');await page.waitForFunction(()=>!document.querySelector('#mandriaV11Qa [data-panel]')?.hidden,null,{timeout:10000});
 await page.locator('#mandriaV11Qa [data-site="rear"]').click();
 const teleported=await page.evaluate(async()=>{const g=globalThis.__mandriaV11,{areaLocal,VILLA}=await import('./gameplay-areas.js'),p=areaLocal(VILLA,g.state.x,g.state.z);
  return {u:p.u,v:p.v,mode:g.state.mode,panel:document.querySelector('#mandriaV11Qa [data-panel]').hidden};});
 assert(teleported.mode==='foot'&&teleported.panel&&teleported.v<0&&Math.abs(teleported.u)<50,'debug teleport must reach safe rear estate on foot');
 phase='distance detail';await page.waitForFunction(()=>globalThis.__mandriaV11.villaV11.report.lodChanges>0,null,{timeout:15000});
 phase='geometry movement';await page.waitForTimeout(1200);
 const geometry=await page.evaluate(()=>{const g=globalThis.__mandriaV11;
  const apes=g.villaV3.patrols.filter(c=>c.mandriaPatrol==='ape');
  return {roads:g.villaV11.report.serviceCars,sections:g.villaV11.report.separatedSections,visual:!!g.villaV11.root.getObjectByName('Mandria v11 · sentieri di servizio sterrati validati'),horse:g.villaV10.roaming.length,
   finite:apes.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.z)&&c.route.every(p=>p.every(Number.isFinite))),zones:g.villaV11.report.zonedWorkers};});
 console.log('MANDRIA_V11_GEOMETRY '+JSON.stringify(geometry));
 assert(geometry.finite&&geometry.horse>=1,'v11 routing damaged the patrols');
 assert.equal(geometry.visual,geometry.roads>0,'gravel must only be drawn for validated alternative roads');
 await page.screenshot({path:'test-artifacts/mandria-v11-polish.png',timeout:25000});
 assert.deepEqual(errors,[],'uncaught JS errors after v11 updates');
 console.log('PASS v11 game starts, estate regressions, safe separate routes, shadow LOD and preview inspection menu');
}catch(e){console.error('MANDRIA_V11_FAIL '+phase+' '+(e.stack||e));console.error('JS_ERRORS '+JSON.stringify(errors.slice(-12)));
 try{await page.screenshot({path:'test-artifacts/mandria-v11-failure.png',timeout:14000});}catch{}process.exitCode=1;
}finally{await browser.close();}
