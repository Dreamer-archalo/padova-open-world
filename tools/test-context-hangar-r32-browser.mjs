import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

fs.mkdirSync('test-artifacts/hud-r32',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('padova-hud-layout','complete'));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>!document.getElementById('playBtn')?.disabled,null,{timeout:45000});
 await page.evaluate(async()=>{
  const {ModernGameplay}=await import('./modern-gameplay.js'),prior=ModernGameplay.prototype.populate;
  ModernGameplay.prototype.populate=function(...args){const out=prior.apply(this,args);globalThis.__contextGame=this;return out;};
 });
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click({timeout:20000});
 await page.waitForFunction(()=>!!globalThis.__contextGame?.mandriaHangar,null,{timeout:45000});
 assert.equal(await page.evaluate(()=>document.body.dataset.ui),'compact');
 // Stand at the actual hangar doorway, then use the unchanged H shortcut.
 await page.evaluate(async()=>{
  const {VILLA,areaPoint}=await import('./gameplay-areas.js');
  const {VILLA_GARAGE}=await import('./villa-treves-layout.js');
  const g=__contextGame,p=areaPoint(VILLA,0,VILLA_GARAGE.v);
  Object.assign(g.state,{mode:'foot',car:null,x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),speed:0});
 });
 const hangar=page.locator('#mandriaHangarButton');
 await hangar.waitFor({state:'visible',timeout:10000});
 assert.equal(await hangar.evaluate(el=>el.closest('aside')?.id),'contextActions');
 await page.screenshot({path:'test-artifacts/hud-r32/compact-hangar-prompt.png'});
 await page.keyboard.press('h');
 await page.waitForFunction(()=>document.getElementById('mandriaHangarDialog')?.open,null,{timeout:10000});
 assert(await page.locator('#hangarGrid [data-hangar-id]').count()>0,'real hangar catalogue opens');
 assert(!await page.locator('#contextActions').isVisible());
 await page.locator('#hangarClose').click();
 await hangar.waitFor({state:'visible'});
 await page.locator('#hudDetailsBtn').click();
 assert.equal(await page.evaluate(()=>document.body.dataset.ui),'complete');
 await hangar.click();
 await page.waitForFunction(()=>document.getElementById('mandriaHangarDialog')?.open);
 await page.locator('#hangarClose').click();
 await page.locator('#hudDetailsBtn').click();
 await hangar.locator('..').getByRole('button',{name:'Chiudi avviso'}).click();
 assert(!await hangar.isVisible());
 await page.keyboard.press('h');
 await page.waitForFunction(()=>document.getElementById('mandriaHangarDialog')?.open);
 assert(await page.locator('#hangarGrid [data-hangar-id]').count()>0,'dismissal does not disable the H shortcut');
 await page.locator('#hangarClose').click();
 assert.deepEqual(errors,[],'no real-world JavaScript errors');
 console.log('PASS real game: compact default despite saved complete preference; contextual hangar, H catalogue, complete HUD click, and H after dismissing the alert.');
}finally{await browser.close();}
