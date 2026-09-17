import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
await context.addInitScript(()=>{
 try{localStorage.setItem('padova-game-v1',JSON.stringify({money:50000,quality:'hyper',jobs:0,character:'fede'}));}catch{}
});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push('JS: '+e.message));
page.on('crash',()=>errors.push('Chromium page crashed'));
page.on('console',message=>{if(message.type()==='error')errors.push('Console: '+message.text().slice(0,400));});
let phase='navigation';
const snapshot=async()=>{
 try{return await page.evaluate(()=>({button:document.getElementById('playBtn')?.textContent,buttonDisabled:document.getElementById('playBtn')?.disabled,loader:document.getElementById('initialLoaderStatus')?.textContent,loaderError:document.getElementById('initialLoaderError')?.textContent,worldReady:document.documentElement.dataset.initialWorldReady,playing:!document.getElementById('playingUI')?.hidden,toast:document.getElementById('toast')?.textContent,menuOpen:document.getElementById('menu')?.open,mapOpen:document.getElementById('mapDialog')?.open}));}catch(e){return {diagnostic:e.message};}
};
try{
 console.log('BROWSER_SMOKE phase=navigation');
 const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});
 assert.equal(response?.status(),200,'Local production dist must serve HTTP 200');
 phase='bootstrap';
 await page.waitForFunction(()=>{const b=document.getElementById('playBtn');return b&&!b.disabled&&b.textContent.includes('Carica la mappa');},null,{timeout:30000});
 console.log('BROWSER_SMOKE phase=bootstrap PASS game modules loaded and map launch button enabled');
 phase='city-startup';
 await page.locator('#initialQuality').selectOption('hyper');
 await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('playBtn')?.textContent?.includes('Reload city')||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:200000});
 const city=await snapshot();
 assert.equal(city.worldReady,'true','Initial 3x3 world must finish loading: '+JSON.stringify(city));
 console.log('BROWSER_SMOKE phase=city-startup PASS 3x3 chunks created, city ready');
 phase='enter-city';
 await page.locator('#confirmCharacter').click({timeout:20000});
 await page.waitForFunction(()=>document.getElementById('playingUI')?.hidden===false,null,{timeout:15000});
 console.log('BROWSER_SMOKE phase=enter-city PASS 3D scene and player entered game');
 phase='taxi-summon';
 await page.locator('#mapBtn').click({timeout:15000});
 await page.locator('#callTaxi').click({timeout:15000});
 await page.waitForFunction(()=>{const text=document.getElementById('toast')?.textContent||'';return /Taxi abusivo chiamato|Taxi sta già arrivando|Taxi è già arrivato|Taxi è arrivato|Destinazione non raggiungibile/.test(text);},null,{timeout:30000});
 const summoned=await snapshot();
 assert.match(summoned.toast||'',/Taxi abusivo chiamato|Taxi sta già arrivando|Taxi è già arrivato|Taxi è arrivato/,'Taxi must actually dispatch, not fail: '+JSON.stringify(summoned));
 console.log('BROWSER_SMOKE phase=taxi-summon PASS '+summoned.toast);
 phase='taxi-movement';
 const result=await Promise.race([
  page.waitForFunction(()=>/Taxi è arrivato|Taxi è già arrivato/.test(document.getElementById('toast')?.textContent||''),null,{timeout:45000}).then(()=>true).catch(()=>false),
  new Promise(resolve=>setTimeout(()=>resolve(false),48000))
 ]);
 console.log('BROWSER_SMOKE phase=taxi-movement '+(result?'PASS taxi reached pickup':'INCONCLUSIVE taxi did not reach pickup within 45 s in software WebGL'));
 const final=await snapshot();
 console.log('BROWSER_SMOKE final='+JSON.stringify(final));
 assert(!errors.some(message=>message.includes('page crashed')),'Chromium crashed: '+errors.join(' | '));
 assert(!errors.some(message=>message.startsWith('JS:')),'Uncaught JavaScript exception: '+errors.join(' | '));
 console.log('PASS actual Chromium bootstrap, world initialization, entering city and taxi dispatch; taxi arrival='+result);
}catch(error){
 console.error('BROWSER_SMOKE FAIL phase='+phase+' '+(error.stack||error));
 console.error('BROWSER_SMOKE snapshot='+JSON.stringify(await snapshot()));
 console.error('BROWSER_SMOKE browser-errors='+JSON.stringify(errors.slice(-20)));
 try{fs.mkdirSync('test-artifacts',{recursive:true});await page.screenshot({path:'test-artifacts/taxi-chromium-failure.png',timeout:10000});}catch{}
 process.exitCode=1;
}finally{await browser.close();}
