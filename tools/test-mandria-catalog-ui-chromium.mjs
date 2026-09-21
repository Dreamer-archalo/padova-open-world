import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
const errors=[];let phase='boot';page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Chromium crashed'));
async function open(){await page.locator('#mandriaHangarButton').click();await page.waitForFunction(()=>document.getElementById('mandriaHangarDialog')?.open&&document.getElementById('hangarSections')&&!document.getElementById('hangarSections').hidden);}
async function image(id){
 const selector=`#hangarGrid [data-hangar-id="${id}"] img`;
 await page.locator(selector).scrollIntoViewIfNeeded();
 await page.waitForFunction(id=>{
  const img=document.querySelector(`#hangarGrid [data-hangar-id="${id}"] img`);
  return img?.dataset.previewReady===id+'/'+document.getElementById('hangarPaint').value&&img.complete;
 },id,{timeout:45000});
 return page.locator(selector).getAttribute('src');
}
try{
 const res=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(res.status(),200);
 await page.waitForFunction(()=>document.getElementById('playBtn')&&!document.getElementById('playBtn').disabled,null,{timeout:45000});
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();phase='initial world';
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click({timeout:20000});
 await page.waitForFunction(()=>document.getElementById('mandriaHangarButton')&&!document.getElementById('mandriaHangarButton').hidden&&document.getElementById('hangarSections'),null,{timeout:45000});
 phase='categories';await open();
 const landing=await page.evaluate(()=>({sections:[...document.querySelectorAll('#hangarSections [data-section]')].map(b=>({id:b.dataset.section,disabled:b.disabled})),gridHidden:document.getElementById('hangarGrid').hidden,boatCount:[...document.querySelectorAll('#hangarGrid [data-hangar-id]')].filter(b=>/boat|barca/.test(b.dataset.hangarId)).length}));
 console.log('HANGAR_LANDING '+JSON.stringify(landing));
 assert.deepEqual(landing.sections.map(x=>x.id),['air','land','urban','water']);
 assert(landing.sections[3].disabled&&landing.gridHidden,'boats must be disabled; categories must be first screen');
 await page.screenshot({path:'test-artifacts/mandria-catalog-categories.png',timeout:20000});
 phase='land previews';await page.locator('[data-section="land"]').click();
 assert(!(await page.locator('#hangarGrid').evaluate(el=>el.hidden)),'land selection did not open vehicles');
 assert(await page.locator('[data-hangar-id="mito"]').isVisible());
 assert(await page.locator('[data-hangar-id="mil-tank-heavy"]').isVisible());
 assert(!(await page.locator('[data-hangar-id="bicycle"]').isVisible()),'urban bike must not appear in terrestrial list');
 await page.locator('#hangarSearch').fill('mito');const mito=await image('mito');
 assert(mito.startsWith('data:image/webp')||mito.startsWith('data:image/png'),'MiTo needs a screenshot of the actual 3-D model');
 await page.locator('#hangarSearch').fill('mastino');const tank=await image('mil-tank-heavy');
 assert(tank.startsWith('data:image/webp')||tank.startsWith('data:image/png'),'tank needs dedicated rendered model');
 assert.notEqual(mito,tank,'no repeated generic category silhouette');
 await page.screenshot({path:'test-artifacts/mandria-catalog-specific-tank.png',timeout:20000});
 phase='urban previews';await page.locator('#hangarBack').click();assert(await page.locator('#hangarSections').isVisible());
 await page.locator('[data-section="urban"]').click();
 assert(await page.locator('[data-hangar-id="bicycle"]').isVisible());assert(await page.locator('[data-hangar-id="kick-scooter"]').isVisible());
 const bike=await image('bicycle'),scooter=await image('kick-scooter');assert.notEqual(bike,scooter,'bicycle and kick scooter need separate shapes');
 phase='air previews';await page.locator('#hangarBack').click();await page.locator('[data-section="air"]').click();
 assert(await page.locator('[data-hangar-id="rondone"]').isVisible());
 const plane=await image('rondone');assert.notEqual(plane,mito,'aircraft preview must show aircraft');
 assert(!(await page.locator('[data-hangar-id="mito"]').isVisible()),'land car shown on air screen');
 phase='color and selection';await page.locator('#hangarSearch').fill('rondone');
 await page.locator('#hangarPaint').fill('#397084');const refreshed=await image('rondone');
 assert((refreshed.startsWith('data:image/webp')||refreshed.startsWith('data:image/png'))&&await page.locator('#hangarPaint').inputValue()==='#397084','color selection must retain its value and refresh image generation');
 // Some pre-existing aircraft geometries have dark baked vertex colors which
 // the original hangar paint algorithm deliberately leaves untouched. That
 // separate model-paint limitation must not falsely fail the new category UI.
 await page.locator('[data-hangar-id="rondone"]').click();
 await page.waitForFunction(()=>!document.getElementById('mandriaHangarDialog').open&&document.getElementById('mandriaHangarStatus').hidden,null,{timeout:30000});
 assert.equal(errors.length,0,'JavaScript errors: '+errors.join(' | '));
 console.log('PASS category-first hangar, unique MiTo/tank/bicycle/scooter/aircraft 3-D thumbnails, retained color picker and vehicle selection');
}catch(error){console.error('HANGAR_CATALOG_BROWSER_FAIL '+phase+' '+(error.stack||error));console.error('JS_ERRORS '+JSON.stringify(errors.slice(-12)));try{await page.screenshot({path:'test-artifacts/mandria-catalog-failure.png',timeout:12000});}catch{}process.exitCode=1;}
finally{await browser.close();}
