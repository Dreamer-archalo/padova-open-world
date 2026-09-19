import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1}),errors=[];
page.on('pageerror',error=>errors.push(error.message));page.on('crash',()=>errors.push('Chromium crashed'));
let stage='load';
try{
 const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.getElementById('playBtn')&&!document.getElementById('playBtn').disabled,null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js'),old=ModernGameplay.prototype.populate;ModernGameplay.prototype.populate=function(...args){const result=old.apply(this,args);globalThis.__airHuntTest=this;return result;};});
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click({timeout:20000});await page.waitForFunction(()=>!document.getElementById('playingUI').hidden,null,{timeout:20000});
 stage='activities and runway';await page.locator('#activityBtn').click();
 await page.locator('[data-mission="airhunt"]').waitFor({timeout:10000});await page.locator('[data-mission="airhunt"]').click();
 await page.waitForFunction(()=>globalThis.__airHuntTest?.airHunt?.active&&globalThis.__airHuntTest.state.car?.style==='airport-interceptor'&&!globalThis.__airHuntTest.state.paused,null,{timeout:12000});
 const start=await page.evaluate(async()=>{const g=globalThis.__airHuntTest,{AIRPORT}=await import('./gameplay-areas.js'),s=g.state;return {mission:s.mission?.type,mode:s.mode,wanted:s.wanted,speed:s.speed,airportDistance:Math.hypot(s.x-AIRPORT.x,s.z-AIRPORT.z),military:document.body.dataset.flightMilitary};});
 console.log('AIR_HUNT_START '+JSON.stringify(start));assert.equal(start.mission,'airhunt');assert.equal(start.mode,'car');assert.equal(start.wanted,1);assert(start.airportDistance<550);
 stage='enemy arrows and colors';await page.waitForFunction(()=>{const g=globalThis.__airHuntTest;return (g.airDefenders?.length||0)+(g.extraDogfighters?.length||0)===2&&document.querySelectorAll('#airHuntPointers .airHuntPointer:not([hidden])').length===2;},null,{timeout:15000});
 const indicators=await page.evaluate(()=>{const g=globalThis.__airHuntTest,j=[...g.airDefenders,...g.extraDogfighters];return {colors:j.map(c=>c.airCombatTint),arrows:[...document.querySelectorAll('#airHuntPointers .airHuntPointer:not([hidden])')].map(n=>n.textContent),cockpit:!document.getElementById('flightCockpit').hidden,controls:document.getElementById('fcControls').textContent};});
 console.log('AIR_HUNT_INDICATORS '+JSON.stringify(indicators));assert.equal(new Set(indicators.colors).size,2,'two enemies must have visibly different paint');assert.equal(indicators.arrows.length,2,'all enemy arrows visible');assert(indicators.cockpit&&indicators.controls.includes('TAB ACCELERA')&&indicators.controls.includes('G MISSILE'));
 // SwiftShader may render fewer than 60 physical frames in a real second. Wait
 // for the *simulation* to reach takeoff speed instead of assuming real time.
 stage='pitch and throttle';await page.keyboard.down('Tab');
 await page.waitForFunction(()=>globalThis.__airHuntTest?.state.speed>=25,null,{timeout:20000});await page.keyboard.up('Tab');
 const fast=await page.evaluate(()=>globalThis.__airHuntTest.state.speed);assert(fast>=20,'Tab did not accelerate to takeoff speed: '+fast);
 const initialAltitude=await page.evaluate(()=>globalThis.__airHuntTest.state.y);
 await page.keyboard.down('ArrowUp');
 await page.waitForFunction(y=>{const s=globalThis.__airHuntTest?.state;return s&&s.y>y+.12&&s.flightPitch>.03;},initialAltitude,{timeout:15000});await page.keyboard.up('ArrowUp');
 const climbed=await page.evaluate(()=>({y:globalThis.__airHuntTest.state.y,pitch:globalThis.__airHuntTest.state.flightPitch}));
 console.log('AIR_HUNT_CLIMB '+JSON.stringify({fast,initialAltitude,climbed}));assert(climbed.y>initialAltitude+.05&&climbed.pitch>0,'up arrow did not increase altitude and pitch');
 const beforeBrake=await page.evaluate(()=>globalThis.__airHuntTest.state.speed);
 await page.keyboard.down('Control');
 await page.waitForFunction(v=>globalThis.__airHuntTest.state.speed<v-3,beforeBrake,{timeout:15000});await page.keyboard.up('Control');
 const afterBrake=await page.evaluate(()=>globalThis.__airHuntTest.state.speed);assert(afterBrake<beforeBrake-2,'Ctrl must brake instead of diving');
 stage='guided missile on G';await page.keyboard.press('g');
 await page.waitForFunction(()=>{const g=globalThis.__airHuntTest;return g.state.car.nextAirportMissile>g.state.elapsed;},null,{timeout:8000});
 const weapon=await page.evaluate(()=>({missiles:globalThis.__airHuntTest.airportMissiles.length,controls:document.getElementById('fcControls').textContent}));
 assert(weapon.controls.includes('G MISSILE'),'guided missile HUD lost G label');
 stage='ten actual two-hit kills and paid progression';const finish=await page.evaluate(()=>{
  const g=globalThis.__airHuntTest,s=g.state,initial=s.money;const steps=[];
  for(let i=0;i<10;i++){
   g.update(1/60);
   const defender=[...(g.airDefenders||[]),...(g.extraDogfighters||[])].find(c=>c.health>0&&c.mesh.visible);
   if(!defender)return {error:'No active defender for kill '+(i+1),steps};
   const before=g.confirmedAirKills||0;
   g.hit(defender,s.car,false);const smoke=defender.health>0&&!!defender.flightSmoke;
   g.hit(defender,s.car,false);g.update(1/60);
   steps.push({kill:g.confirmedAirKills-before,smoke,reward:s.money-initial,progress:g.airHunt?.kills||0});
  }
  return {steps,total:s.money-initial,mission:s.mission?.type||null,jobs:s.jobs,notice:g.airHuntNotice?.message||''};
 });
 console.log('AIR_HUNT_REWARD '+JSON.stringify(finish));assert(!finish.error,finish.error);
 assert(finish.steps.every((v,i)=>v.kill===1&&v.smoke&&v.reward===(i+1)*150&&v.progress===i+1),'every enemy requires two hits and pays exactly €150');
 assert.equal(finish.total,1500);assert.equal(finish.mission,null);assert(finish.notice.includes('COMPLETATA'));
 await page.screenshot({path:'test-artifacts/air-hunt-mission.png',timeout:20000});
 assert.equal(errors.length,0,'unhandled JS errors: '+errors.join(' | '));
 console.log('PASS WebGL air hunt mission, colored enemy arrows, Tab throttle, up arrow pitch, Ctrl brake, G missile and ten real rewarded defeats');
}catch(error){console.error('AIR_HUNT_WEBGL_FAIL '+stage+' '+(error.stack||error));console.error('JS_ERRORS '+JSON.stringify(errors.slice(-12)));try{await page.screenshot({path:'test-artifacts/air-hunt-failure.png',timeout:15000});}catch{}process.exitCode=1;}finally{await browser.close();}
