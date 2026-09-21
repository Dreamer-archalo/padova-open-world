import {chromium} from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('test-artifacts',{recursive:true});
const url='https://dreamer-archalo.github.io/padova-open-world/preview/pr-51/';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1180,height:760},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push('PAGE: '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE: '+m.text().slice(0,400));});
page.on('requestfailed',r=>errors.push('REQUEST: '+r.url()+' '+r.failure()?.errorText));
page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url());});
try {
 const res=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 console.log('NAVIGATE '+res.status()+' '+page.url());
 await page.waitForFunction(()=>!document.getElementById('playBtn')?.disabled,{timeout:35000});
 console.log('BUTTON '+JSON.stringify(await page.locator('#playBtn').textContent()));
 await page.locator('#initialQuality').selectOption('hyper');
 await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false||document.querySelector('#loadingText.fatal'),null,{timeout:205000});
 const result=await page.evaluate(()=>({ready:document.documentElement.dataset.initialWorldReady,status:document.getElementById('initialLoaderStatus')?.textContent,error:document.getElementById('initialLoaderError')?.textContent,loading:document.getElementById('loadingText')?.textContent,percent:document.getElementById('initialLoaderPercent')?.textContent}));
 console.log('MAP_BOOTSTRAP '+JSON.stringify(result));
 console.log('BROWSER_ERRORS '+JSON.stringify(errors.slice(-20)));
 if(result.ready!=='true'||errors.length)process.exitCode=1;
}catch(e){console.log('BOOTSTRAP_EXCEPTION '+(e.stack||e));console.log('BROWSER_ERRORS '+JSON.stringify(errors.slice(-30)));console.log('VISIBLE '+JSON.stringify(await page.evaluate(()=>({status:document.getElementById('initialLoaderStatus')?.textContent,error:document.getElementById('initialLoaderError')?.textContent,loading:document.getElementById('loadingText')?.textContent})).catch(()=>null)));process.exitCode=1;}
finally{try{await page.screenshot({path:'test-artifacts/public-pages-loading.png',timeout:15000});}catch{}await browser.close();}
