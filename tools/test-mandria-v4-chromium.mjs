import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
const errors=[];let phase='startup';page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Browser crash'));
try{
 const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.getElementById('playBtn')&&!document.getElementById('playBtn').disabled,null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js'),previous=ModernGameplay.prototype.populate;ModernGameplay.prototype.populate=function(...a){const result=previous.apply(this,a);globalThis.__mandriaV4=this;return result;};});
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click({timeout:20000});
 phase='estate initialization';await page.waitForFunction(()=>!!globalThis.__mandriaV4?.villaV4&&!!globalThis.__mandriaV4?.villaRoof&&!!globalThis.__mandriaV4?.villaRange,null,{timeout:45000});
 const report=await page.evaluate(()=>{const g=globalThis.__mandriaV4,v=g.villaV4,r=g.villaRange,roof=g.villaRoof;
  const privateRoads=g.graph.segments.filter(s=>/^(Accesso Villa della Mandria|Viale Villa della Mandria)$/.test(s.road.n||''));
  const center=g.cars.filter(c=>c.fixedSpawn&&/Villa della Mandria/.test(c.name||''));
  return {privateRoads:privateRoads.length,privateAccess:privateRoads.every(s=>s.road.access==='private'),trees:v.planted,flowers:v.planters,farms:v.farm,corral:v.corral,apes:g.villaV3.patrols.filter(c=>c.mandriaPatrol==='ape').length,horses:g.villaV3.patrols.filter(c=>c.estateHorse).length,roofTop:roof.top,helicopters:roof.helicopters.map(c=>({style:c.style,y:c.y,onRoof:c.estateHelipad})),range:r.ready,bottles:r.targets.length,parking:g.villaParkingV4,tank:center.filter(c=>c.style==='tank').length,ordinaryCars:g.cars.filter(c=>!c.fixedSpawn&&!c.parked&&c.mesh.visible&&Math.hypot(c.x-g.state.x,c.z-g.state.z)<22).length};
 });
 console.log('MANDRIA_V4 '+JSON.stringify(report));
 assert(report.privateRoads>=2&&report.privateAccess,'both estate authored roads must be private');
 assert(report.apes>=2,'mobile patrols must use Ape cars');
 assert(report.parking?.removedVillaTank&&report.tank===0,'remove only Mandria tank');
 assert(report.parking.racers===2&&report.parking.bikes>=3,'keep two racers and three grouped bikes');
 assert(report.helicopters.length===2&&report.helicopters.every(c=>c.onRoof&&c.y>report.roofTop),'two villa helicopters must stand above deck');
 assert(report.range&&report.bottles===5,'shooting area must be instantiated with five bottles');
 phase='civilian exclusion';await page.evaluate(async()=>{const g=globalThis.__mandriaV4,{VILLA,areaPoint}=await import('./gameplay-areas.js');const inside=areaPoint(VILLA,0,44);for(const c of g.cars.filter(c=>!c.fixedSpawn&&!c.parked&&!c.mandriaPatrol).slice(0,2)){c.x=inside.x;c.z=inside.z;c.mesh.visible=true;c.road=g.graph.segments.find(s=>s.road?.n==='Accesso Villa della Mandria')?.road;}for(const p of g.people.slice(0,3)){p.x=inside.x;p.z=inside.z;p.mesh.visible=true;p.budgetSleeping=false;p.at=g.state.elapsed+30;} });
 await page.waitForTimeout(500);
 const privateCheck=await page.evaluate(async()=>{const g=globalThis.__mandriaV4,{VILLA,areaLocal}=await import('./gameplay-areas.js');const central=p=>{const q=areaLocal(VILLA,p.x,p.z);return Math.abs(q.u)<20&&q.v>30&&q.v<60;};return {cars:g.cars.filter(c=>!c.fixedSpawn&&!c.mandriaPatrol&&!c.parked&&c.mesh.visible&&central(c)).length,people:g.people.filter(p=>p.mesh.visible&&central(p)).length};});
 assert.equal(privateCheck.cars,0,'civilian vehicles cannot stay in the private drive');assert.equal(privateCheck.people,0,'generic urban pedestrians cannot cluster at entrance');
 phase='bottle mission';
 await page.evaluate(()=>{const g=globalThis.__mandriaV4,r=g.villaRange,s=g.state;s.mode='foot';s.car=null;s.paused=false;s.mission=null;s.x=r.station.x;s.z=r.station.z;s.y=g.terrain.height(s.x,s.z);s.speed=0;s.vy=0;});
 await page.waitForTimeout(140);await page.keyboard.press('e');
 await page.waitForFunction(()=>globalThis.__mandriaV4.villaRange.active,null,{timeout:6500});
 await page.keyboard.press('Tab');
 const before=await page.evaluate(()=>globalThis.__mandriaV4.state.money);
 for(let i=0;i<5;i++){
  await page.evaluate(i=>{const g=globalThis.__mandriaV4,t=g.villaRange.targets[i],s=g.state;s.yaw=Math.atan2(t.x-s.x,t.z-s.z);},i);
  await page.waitForTimeout(420);await page.keyboard.press('Enter');
  await page.waitForFunction(i=>globalThis.__mandriaV4.villaRange.targets[i].hit,i,{timeout:5000});
 }
 const mission=await page.evaluate(()=>{const g=globalThis.__mandriaV4,r=g.villaRange;return {hits:r.hitCount,reward:r.reward,remaining:r.targets.filter(t=>!t.hit).length,active:r.active,money:g.state.money};});
 console.log('RANGE_MISSION '+JSON.stringify(mission));assert.equal(mission.hits,5);assert.equal(mission.reward,125);assert.equal(mission.money-before,125);assert(!mission.active&&mission.remaining===0,'mission must finish and remove bottles');
 await page.screenshot({path:'test-artifacts/mandria-v4-range.png',timeout:20000});
 phase='roof access';await page.evaluate(()=>{const g=globalThis.__mandriaV4,r=g.villaRoof,s=g.state;s.mode='foot';s.car=null;s.x=r.bottom.x;s.z=r.bottom.z;s.y=r.base;s.speed=0;});
 await page.keyboard.press('e');await page.waitForFunction(()=>!!globalThis.__mandriaV4.villaRoof.climbing,null,{timeout:5500});
 await page.waitForFunction(()=>!globalThis.__mandriaV4.villaRoof.climbing&&Math.abs(globalThis.__mandriaV4.state.y-globalThis.__mandriaV4.villaRoof.top)<1,null,{timeout:11000});
 await page.screenshot({path:'test-artifacts/mandria-v4-roof.png',timeout:20000});
 phase='horse jump';await page.evaluate(()=>{const g=globalThis.__mandriaV4,h=g.villaV3.patrols.find(c=>c.estateHorse);if(!h)throw new Error('No corral horse');g.state.mode='car';g.state.car=h;g.state.x=h.x;g.state.z=h.z;g.state.y=h.y;g.state.yaw=h.yaw;g.state.speed=7;h.speed=7;h.parked=false;h.jump=null;});
 await page.keyboard.press('q');const airborne=await page.evaluate(()=>globalThis.__mandriaV4.state.car.jump?.airborne||false);assert(airborne,'Q must launch a ridden paddock horse');
 assert.equal(errors.length,0,'Unhandled page errors '+errors.join(' | '));
 console.log('PASS MANDRIA V4 private roads, cleared traffic/crowd, fleet, helis, accessible roof, 5-bottle mission and horse jump');
}catch(error){console.error('MANDRIA_V4_FAIL '+phase+' '+(error.stack||error));console.error('JS_ERRORS '+JSON.stringify(errors.slice(-15)));try{await page.screenshot({path:'test-artifacts/mandria-v4-failure.png',timeout:15000});}catch{}process.exitCode=1;}
finally{await browser.close();}
