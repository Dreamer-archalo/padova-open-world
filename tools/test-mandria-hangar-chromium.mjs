import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
const errors=[];let phase='boot';
page.on('pageerror',error=>errors.push(error.message));page.on('crash',()=>errors.push('Chromium crashed'));
const state=()=>page.evaluate(()=>{const g=globalThis.__hangarTest,h=g.mandriaHangar;return {
 paused:g.state.paused,mode:g.state.mode,playerStyle:g.state.car?.style||null,
 staged:h?.staged?.style||null,stagedCount:g.cars.filter(c=>c.hangarInventory).length,cars:g.cars.length,
 styles:g.cars.filter(c=>['mito','bicycle','kick-scooter','libellula'].includes(c.style)).map(c=>c.style),
 displayed:h?.staged?.name||null,x:g.state.x,z:g.state.z,doorY:h?.door?.position.y};});
try{
 const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.getElementById('playBtn')&&!document.getElementById('playBtn').disabled,null,{timeout:45000});
 await page.evaluate(async()=>{
  const {ModernGameplay}=await import('./modern-gameplay.js'),prior=ModernGameplay.prototype.populate;
  ModernGameplay.prototype.populate=function(...args){const out=prior.apply(this,args);globalThis.__hangarTest=this;return out;};
 });
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();phase='initial world';
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click({timeout:20000});
 await page.waitForFunction(()=>!!globalThis.__hangarTest&&!!globalThis.__hangarTest.mandriaHangar&&document.getElementById('mandriaHangarButton')&&!document.getElementById('mandriaHangarButton').hidden,null,{timeout:45000});
 phase='open menu';await page.locator('#mandriaHangarButton').click();
 await page.waitForFunction(()=>document.getElementById('mandriaHangarDialog')?.open,null,{timeout:10000});
 const menu=await page.evaluate(()=>({cards:document.querySelectorAll('#hangarGrid [data-hangar-id]').length,
 hasBicycle:!!document.querySelector('[data-hangar-id="bicycle"]'),
 hasScooter:!!document.querySelector('[data-hangar-id="kick-scooter"]'),
 hasAircraft:!!document.querySelector('[data-hangar-id="libellula"]'),
 thumbnails:[...document.querySelectorAll('#hangarGrid img')].every(i=>i.src.startsWith('data:image/svg+xml'))}));
 console.log('HANGAR_MENU '+JSON.stringify(menu));
 assert(menu.cards>=35&&menu.hasBicycle&&menu.hasScooter&&menu.hasAircraft&&menu.thumbnails,'catalogue image/name or category incomplete');
 await page.screenshot({path:'test-artifacts/mandria-hangar-menu.png',timeout:25000});
 phase='stage first car';await page.locator('#hangarSearch').fill('mito');
 await page.locator('[data-hangar-id="mito"]').first().click();
 await page.waitForFunction(()=>globalThis.__hangarTest?.mandriaHangar?.staged?.style==='mito'&&!globalThis.__hangarTest.mandriaHangar.busy,null,{timeout:30000});
 const first=await state();console.log('FIRST_CAR '+JSON.stringify(first));
 assert(first.staged==='mito'&&!first.paused&&first.mode==='foot','first car must be visible and player must be nearby on foot');
 await page.evaluate(()=>{globalThis.__originalHangarObject=globalThis.__hangarTest.mandriaHangar.staged;});
 phase='swap to bicycle';await page.locator('#mandriaHangarButton').click();
 await page.locator('#hangarPaint').fill('#397084');
 await page.locator('#hangarSearch').fill('bicicletta');
 await page.locator('[data-hangar-id="bicycle"]').click();
 await page.waitForFunction(()=>globalThis.__hangarTest?.mandriaHangar?.staged?.style==='bicycle'&&!globalThis.__hangarTest.mandriaHangar.busy,null,{timeout:30000});
 const swapped=await page.evaluate(()=>({oldRemoved:!globalThis.__hangarTest.cars.some(c=>c===globalThis.__originalHangarObject),
 bike:globalThis.__hangarTest.mandriaHangar.staged.style,mode:globalThis.__hangarTest.state.mode,
 stagedCount:globalThis.__hangarTest.cars.filter(c=>c.hangarInventory).length,paused:globalThis.__hangarTest.state.paused}));
 console.log('SWAPPED '+JSON.stringify(swapped));
 assert(swapped.oldRemoved&&swapped.bike==='bicycle'&&swapped.stagedCount===1&&!swapped.paused,'swap left duplicate or paused player');
 phase='deliver bicycle';await page.locator('#mandriaHangarButton').click();
 await page.locator('#hangarDeliver').click();
 const bike=await state();console.log('BIKE_DELIVERED '+JSON.stringify(bike));
 assert(bike.playerStyle==='bicycle'&&bike.staged===null&&!bike.paused,'delivered bicycle must be rideable and leave hangar');
 phase='new selection keeps departed bicycle';await page.locator('#mandriaHangarButton').click();
 await page.locator('#hangarSearch').fill('monopattino');await page.locator('[data-hangar-id="kick-scooter"]').click();
 await page.waitForFunction(()=>globalThis.__hangarTest?.mandriaHangar?.staged?.style==='kick-scooter'&&!globalThis.__hangarTest.mandriaHangar.busy,null,{timeout:30000});
 const retained=await state();console.log('RETAINED_BICYCLE '+JSON.stringify(retained));
 assert(retained.styles.includes('bicycle')&&retained.styles.includes('kick-scooter'),'departed bicycle got deleted or scooter failed');
 phase='stage and deliver aircraft';await page.locator('#mandriaHangarButton').click();
 await page.locator('#hangarSearch').fill('libellula');await page.locator('[data-hangar-id="libellula"]').click();
 await page.waitForFunction(()=>globalThis.__hangarTest?.mandriaHangar?.staged?.style==='libellula'&&!globalThis.__hangarTest.mandriaHangar.busy,null,{timeout:30000});
 await page.screenshot({path:'test-artifacts/mandria-hangar-aircraft.png',timeout:25000});
 await page.locator('#mandriaHangarButton').click();await page.locator('#hangarDeliver').click();
 const flight=await page.evaluate(async()=>{const g=globalThis.__hangarTest,{VILLA,AIRPORT}=await import('./gameplay-areas.js');return {
 mode:g.state.mode,style:g.state.car?.style,staged:g.mandriaHangar.staged,
 fromVilla:Math.hypot(g.state.x-VILLA.x,g.state.z-VILLA.z),
 fromAirport:Math.hypot(g.state.x-AIRPORT.x,g.state.z-AIRPORT.z),
 retainedBike:g.cars.some(c=>c.style==='bicycle'),paused:g.state.paused};});
 console.log('AIRCRAFT_DELIVERED '+JSON.stringify(flight));
 // Mandria and airport are about 2 km apart; the suitable runway pad is
 // 420 m from airport centre and 1,980 m from the villa, not >2,000 m.
 assert(flight.style==='libellula'&&flight.staged===null&&flight.fromAirport<650&&flight.fromVilla>1500&&flight.retainedBike&&!flight.paused,'aircraft must go to runway without deleting ridden-out vehicles');
 assert.equal(errors.length,0,'Browser page errors: '+errors.join(' | '));
 console.log('PASS Chromium: illustrated catalogue, color control, in-hangar replacement, bicycle and scooter, departed vehicle retained, aircraft delivered to runway');
}catch(e){console.error('HANGAR_WEBGL_FAIL '+phase+' '+(e.stack||e));console.error('JS_ERRORS '+JSON.stringify(errors.slice(-15)));try{await page.screenshot({path:'test-artifacts/mandria-hangar-failure.png',timeout:15000});}catch{}process.exitCode=1;}
finally{await browser.close();}
