import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];let phase='startup';page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Browser crashed'));
try{
 const r=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(r.status(),200);
 await page.waitForFunction(()=>!document.getElementById('playBtn')?.disabled,null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js'),old=ModernGameplay.prototype.populate;ModernGameplay.prototype.populate=function(...args){const out=old.apply(this,args);globalThis.__mandriaV7=this;return out;};});
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||!document.getElementById('initialLoaderError')?.hidden,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');await page.locator('#confirmCharacter').click({timeout:20000});
 phase='solid geometry';await page.waitForFunction(()=>!!globalThis.__mandriaV7?.villaV7Physics?.count&&!!globalThis.__mandriaV7?.villaV7Life&&!!globalThis.__mandriaV7?.villaV7Stairs,null,{timeout:65000});
 const report=await page.evaluate(async()=>{const g=globalThis.__mandriaV7,{collides}=await import('./core.js'),{areaPoint,VILLA}=await import('./gameplay-areas.js'),wall=areaPoint(VILLA,g.villaRange.u,g.villaRange.v-14.4),fence=g.villaV3.root.children.find(o=>o.name==='Estate boundary post');
  return {physics:g.villaV7Physics,parking:g.villaV7Life.parking,smoothed:g.villaV7Life.smoothPatrols,horseVariants:g.villaV7Life.staggeredHorses,
   rangeWall:!!collides(wall.x,wall.z,.4,g.collision,g.terrain.height(wall.x,wall.z)),fence:!!fence&&!!collides(fence.position.x,fence.position.z,.2,g.collision,g.terrain.height(fence.position.x,fence.position.z)),
   stairParts:g.villaV7Stairs.root.children.length,workerMarkers:g.villaLife.people.filter(p=>p.role==='worker'&&p.v7Marker).length,
   apeRoutes:g.villaV3.patrols.filter(c=>c.mandriaPatrol==='ape').map(c=>c.route.length)};
 });console.log('MANDRIA_V7_REPORT '+JSON.stringify(report));
 assert(report.physics.count>60,'visual walls, fences and bales need physical colliders');
 assert(report.rangeWall&&report.fence,'shooting range wall and estate fence are pass-through');
 assert(report.parking.nearFountain&&report.parking.gap<.5,'two sports cars must move to fountain-side bays');
 assert(report.smoothed>=1,'Ape patrols still use only square paths');
 assert(report.workerMarkers>=3,'workers must have optional dialogue markers');
 assert(report.stairParts>45,'front staircase missing');
 phase='worker conversation cooldown';
 const worker=await page.evaluate(()=>{const g=globalThis.__mandriaV7,p=g.villaLife.people.find(p=>p.role==='worker'&&p.v7Marker);if(!p)return false;
  Object.assign(g.state,{mode:'foot',car:null,x:p.obj.position.x,z:p.obj.position.z,y:g.terrain.height(p.obj.position.x,p.obj.position.z),speed:0,vy:0});globalThis.__v7Worker=p;return true;});assert(worker);
 await page.waitForFunction(()=>globalThis.__v7Worker.v7Marker.visible&&!document.getElementById('mandriaWorkerPrompt')?.hidden,null,{timeout:15000});
 await page.locator('#mandriaWorkerPrompt').click();assert(await page.locator('#mandriaWorkerDialog').evaluate(d=>d.open));
 await page.locator('#mwChoices button').first().click();await page.locator('.mw-next').click();
 await page.waitForFunction(()=>globalThis.__v7Worker.v7NextTalkAt>globalThis.__mandriaV7.state.elapsed,null,{timeout:10000});
 assert.equal(await page.evaluate(()=>globalThis.__v7Worker.v7Marker.visible),false,'answered worker must hide dialogue bubble during cooldown');
 await page.keyboard.press('KeyE');assert.equal(await page.locator('#mandriaWorkerDialog').evaluate(d=>d.open),false,'E must respect cooldown');
 await page.evaluate(()=>{const g=globalThis.__mandriaV7;globalThis.__v7Worker.v7NextTalkAt=g.state.elapsed-1;});
 await page.waitForFunction(()=>globalThis.__v7Worker.v7Marker.visible,null,{timeout:10000});
 phase='animal movement';
 const first=await page.evaluate(()=>{const a=globalThis.__mandriaV7.villaLife.pastures[0]?.animals[1]?.a;return a&&[a.position.x,a.position.z];});assert(first);
 await page.waitForTimeout(1800);const next=await page.evaluate(()=>{const a=globalThis.__mandriaV7.villaLife.pastures[0].animals[1].a;return [a.position.x,a.position.z];});
 assert(Math.hypot(next[0]-first[0],next[1]-first[1])>.12,'sheep must walk around within their paddock');
 phase='scoped camera';
 await page.evaluate(()=>{const g=globalThis.__mandriaV7,r=g.villaRange;Object.assign(g.state,{x:r.station.x,z:r.station.z,y:g.terrain.height(r.station.x,r.station.z),mode:'foot',car:null,speed:0,vy:0,mission:null});});
 await page.keyboard.press('KeyE');await page.waitForFunction(()=>globalThis.__mandriaV7.villaRange.active,null,{timeout:12000});await page.keyboard.press('Tab');
 await page.waitForFunction(()=>globalThis.__mandriaV7.mandriaScopeFrame?.hiddenAvatars>0,null,{timeout:12000});
 const scope=await page.evaluate(()=>globalThis.__mandriaV7.mandriaScopeFrame);assert.equal(scope.fov,22);
 await page.screenshot({path:'test-artifacts/mandria-v7-first-person.png',timeout:25000});await page.keyboard.press('KeyX');
 phase='new entry staircase';
 await page.evaluate(()=>{const g=globalThis.__mandriaV7,e=g.villaV7Stairs;Object.assign(g.state,{mode:'foot',car:null,x:e.bottom.x,z:e.bottom.z,y:e.base,speed:0,vy:0});});
 await page.waitForFunction(()=>!document.getElementById('mandriaV7EntryStairs')?.hidden,null,{timeout:12000});
 await page.locator('#mandriaV7EntryStairs').click();assert.equal(await page.evaluate(()=>globalThis.__mandriaV7.villaV7Stairs.travel?.direction),'up');
 await page.evaluate(()=>{const g=globalThis.__mandriaV7,e=g.villaV7Stairs;e.travel=null;Object.assign(g.state,{x:e.top.x,z:e.top.z,y:e.high,speed:0,vy:0});});
 await page.waitForFunction(()=>document.getElementById('mandriaV7EntryStairs')?.textContent.includes('SCENDI')&&!document.getElementById('mandriaV7EntryStairs').hidden,null,{timeout:12000});
 await page.locator('#mandriaV7EntryStairs').click();assert.equal(await page.evaluate(()=>globalThis.__mandriaV7.villaV7Stairs.travel?.direction),'down');
 assert.deepEqual(errors,[],'no uncaught JS errors');console.log('PASS Mandria v7: physical range wall/fence, fountain cars, varied Ape routes, workers, cooldown, sheep animation, first-person scope and reversible entry stairs');
}catch(e){console.error('MANDRIA_V7_FAIL '+phase+' '+(e.stack||e));console.error('JS_ERRORS '+JSON.stringify(errors.slice(-12)));try{await page.screenshot({path:'test-artifacts/mandria-v7-failure.png',timeout:14000});}catch{}process.exitCode=1;}finally{await browser.close();}
