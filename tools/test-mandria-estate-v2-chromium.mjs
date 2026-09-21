import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
const errors=[];let phase='boot';
page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Browser crashed'));
try{
 const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>!document.getElementById('playBtn')?.disabled,null,{timeout:45000});
 await page.evaluate(async()=>{
  const {ModernGameplay}=await import('./modern-gameplay.js'),populate=ModernGameplay.prototype.populate;
  ModernGameplay.prototype.populate=function(...args){const result=populate.apply(this,args);globalThis.__mandriaWalkthrough=this;return result;};
 });
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();phase='load city';
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||!document.getElementById('initialLoaderError')?.hidden,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click({timeout:20000});
 phase='estate expansion';
 await page.waitForFunction(()=>!!globalThis.__mandriaWalkthrough?.villaLife?.expansion&&globalThis.__mandriaWalkthrough?.villaLife?.root?.visible,null,{timeout:45000});
 const start=await page.evaluate(()=>{
  const g=globalThis.__mandriaWalkthrough,l=g.villaLife,e=l.expansion;
  return {barns:e.barns.length,fieldTools:e.fieldTools.length,lanes:e.lanes,perimeter:e.perimeter,recruits:e.recruits.length,guards:l.people.filter(p=>p.role==='gate'&&p.obj.userData.armed).length,bodyguards:l.people.filter(p=>p.role==='bodyguard').length,cars:l.cars.length,movingEscort:!!e.escort,carPosition:e.escort?.car.position.toArray(),workerPosition:l.fields[0]?.worker.obj.position.toArray()};
 });
 console.log('ESTATE_EXPANSION '+JSON.stringify(start));
 assert(start.barns>=1&&start.fieldTools>=1,'farm and fields not populated in real world');
 assert(start.lanes>0&&start.perimeter>0,'estate service-lane and boundary detail absent');
 // V4 deliberately replaces the second tactical gate guard with a suited bodyguard.
 // The old requirement of exactly two armed gate guards conflicts with the new brief.
 assert(start.recruits>=1&&start.guards>=1&&start.bodyguards>=1&&start.cars===2&&start.movingEscort,'private security deployment incomplete');
 await page.waitForTimeout(1600);
 const motion=await page.evaluate(()=>{const g=globalThis.__mandriaWalkthrough,e=g.villaLife.expansion;return {car:e.escort?.car.position.toArray(),worker:g.villaLife.fields[0]?.worker.obj.position.toArray()};});
 assert.notDeepEqual(motion.car,start.carPosition,'black security car did not move');
 assert.notDeepEqual(motion.worker,start.workerPosition,'agricultural worker did not resume work');
 await page.screenshot({path:'test-artifacts/mandria-estate-v2.png',timeout:25000});
 phase='staff respect and resumption';
 const greeting=await page.evaluate(()=>{
  const g=globalThis.__mandriaWalkthrough,p=g.villaLife.people.find(p=>p.role==='servant');
  g.state.x=p.obj.position.x;g.state.z=p.obj.position.z;return {name:p.obj.name};
 });
 await page.waitForFunction(()=>globalThis.__mandriaWalkthrough?.villaLife.people.some(p=>p.role==='servant'&&p.until>globalThis.__mandriaWalkthrough.state.elapsed),null,{timeout:12000});
 assert(greeting.name.includes('servant'));
 phase='aircraft thumbnails';
 // The public HANGAR button is intentionally proximity-gated. Return from the
 // servant outside the gate to the villa spawn before attempting to open it.
 await page.evaluate(async()=>{
  const g=globalThis.__mandriaWalkthrough,{HOME}=await import('./gameplay-areas.js');
  Object.assign(g.state,{x:HOME.x,z:HOME.z,y:g.terrain.height(HOME.x,HOME.z),mode:'foot',car:null,speed:0,vy:0});
 });
 await page.waitForFunction(()=>document.getElementById('mandriaHangarButton')&&!document.getElementById('mandriaHangarButton').hidden,null,{timeout:20000});
 await page.locator('#mandriaHangarButton').click();
 await page.waitForFunction(()=>document.getElementById('mandriaHangarDialog')?.open&&document.getElementById('hangarSections')&&!document.getElementById('hangarSections').hidden,null,{timeout:20000});
 await page.locator('[data-section="air"]').click();
 const ids=await page.locator('#hangarGrid [data-hangar-id]:visible').evaluateAll(cards=>cards.map(c=>c.dataset.hangarId));
 assert.equal(ids.length,16,'the aircraft selection must contain all 16 models');
 const thumbnails=[];
 for(const id of ids){
  const selector=`#hangarGrid [data-hangar-id="${id}"] img`;
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForFunction(id=>{const img=document.querySelector(`#hangarGrid [data-hangar-id="${id}"] img`);return img?.complete&&img.dataset.previewReady===id+'/'+document.getElementById('hangarPaint').value;},id,{timeout:50000});
  thumbnails.push(await page.locator(selector).evaluate(img=>({id:img.closest('[data-hangar-id]').dataset.hangarId,src:img.getAttribute('src'),alt:img.alt,w:img.naturalWidth})));
 }
 assert(thumbnails.every(t=>t.w>0&&(t.src.startsWith('data:image/webp')||t.src.startsWith('data:image/png')||t.src.startsWith('data:image/svg+xml'))),'blank thumbnails in aircraft category');
 assert(new Set(thumbnails.map(t=>t.src)).size>=14,'aircraft thumbnails incorrectly repeated');
 assert(thumbnails.every(t=>t.alt.includes('modello')||t.alt.includes('elicottero')),'aircraft card has wrong accessible label');
 assert.equal(errors.length,0,'JavaScript errors '+errors.join(' | '));
 await page.screenshot({path:'test-artifacts/mandria-aircraft-v2.png',timeout:25000});
 console.log('PASS WebGL Mandria estate, patrol motion, servants and '+ids.length+' correctly associated aircraft images');
}catch(error){console.error('ESTATE_V2_WEBGL_FAIL '+phase+' '+(error.stack||error));console.error('JS_ERRORS '+JSON.stringify(errors.slice(-10)));try{await page.screenshot({path:'test-artifacts/mandria-v2-failure.png',timeout:12000});}catch{}process.exitCode=1;}
finally{await browser.close();}
