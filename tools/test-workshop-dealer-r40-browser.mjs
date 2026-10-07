import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port','4198']);await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']}),page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('test-artifacts/r40',{recursive:true});
try{
 await page.goto('http://127.0.0.1:4198/');
 await page.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),{createDealerVehicle,dealerQuote}=await import('./dealerships.js'),{DEALER_OPTIONS}=await import('./dealer-customization.js');
  document.querySelectorAll('link[rel=stylesheet],style').forEach(o=>o.remove());document.body.innerHTML='<style>body{margin:0;overflow:auto;background:#d7dfe5;color:#1c2c37;font:16px Arial}h1{margin:20px}#grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:12px}figure{background:#c9d5dd;margin:0;padding:5px}img{width:100%}figcaption{padding:8px}</style><h1>11 disegni di cerchioni</h1><main id="grid"></main>';
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(480,300);renderer.setClearColor('#c9d5dd');const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,480/300,.1,200);scene.add(new T.HemisphereLight('#fff','#667787',2.3));const sun=new T.DirectionalLight('#fff4de',3);sun.position.set(5,9,6);scene.add(sun);
  for(const [wheelDesign,label] of DEALER_OPTIONS.wheelDesign.values){const q=dealerQuote('collector-nebula',{wheelDesign,wheels:'bronze'}),root=createDealerVehicle(q.id,q.color,q.wheels,q);scene.add(root);camera.position.set(5,1.8,.3);camera.lookAt(0,.6,0);renderer.render(scene,camera);const f=document.createElement('figure');f.innerHTML='<img src="'+renderer.domElement.toDataURL()+'"><figcaption>'+label+'</figcaption>';document.querySelector('#grid').append(f);scene.remove(root);}
  renderer.dispose();renderer.forceContextLoss();
 });await page.screenshot({path:'test-artifacts/r40/wheel-designs.png',fullPage:true});
 await page.goto('http://127.0.0.1:4198/');
 await page.evaluate(async()=>{
  const {mountCatalogPreviews}=await import('./catalog-previews.js');document.body.innerHTML='<dialog id="menu"><h2>Anteprime prima della selezione</h2><div id="menuContent" class="activities vehicle-catalog"></div></dialog>';
  document.querySelector('#menuContent').innerHTML=['nido','collector-nebula','collector-stradale33','naked','truck','ape'].map(id=>'<button class="activity"><img data-catalog-preview="'+id+'" alt="Anteprima '+id+'"><span>'+id+'</span></button>').join('');document.querySelector('#menu').showModal();mountCatalogPreviews(document.querySelector('#menuContent'));
 });await page.waitForFunction(()=>[...document.querySelectorAll('[data-catalog-preview]')].every(img=>img.dataset.previewReady===img.dataset.catalogPreview),null,{timeout:30000});assert.equal(await page.locator('[data-catalog-preview]').count(),6);assert(await page.locator('[data-catalog-preview]').evaluateAll(imgs=>imgs.every(img=>img.src.startsWith('data:image/webp')&&img.naturalWidth===280)));await page.screenshot({path:'test-artifacts/r40/catalogue-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-artifacts/r40/catalogue-mobile.png'});
 await page.goto('http://127.0.0.1:4198/');await page.evaluate(async()=>{
  const {VehicleWorkshops}=await import('./vehicle-workshops.js'),{VEHICLES}=await import('./vehicles.js'),{createDealerVehicle}=await import('./dealerships.js');
  document.body.innerHTML='<dialog id="menu"><div class="dialog-head"><h2>Autofficina</h2></div><div id="menuContent"></div></dialog>';
  const car={style:'nido',name:VEHICLES.nido.name,spec:VEHICLES.nido,mesh:createDealerVehicle('nido'),health:100},state={health:100,money:400000,car};
  const shop=new VehicleWorkshops({state,toast(){},showMenu(title,html){document.querySelector('#menuContent').innerHTML=html;document.querySelector('#menu').showModal();}});shop.nearest=()=>({site:{name:'Officina'}});shop.open();
 });assert.equal(await page.locator('[data-workshop-option="interior"]').count(),0);await page.locator('[data-workshop-tab="Sicurezza"]').click();for(const [key,value] of Object.entries({frontGuard:'heavy',rearGuard:'heavy',tyreGuard:'runflat',safetyGlass:'ballistic',chassis:'armored'}))await page.locator('[data-workshop-option="'+key+'"]').selectOption(value);
 const total=await page.locator('#workshopTotal').textContent();await page.locator('[data-workshop-option="protectionVisibility"]').selectOption('hidden');assert.equal(await page.locator('#workshopTotal').textContent(),total);assert(total.includes('525')&&total.includes('+425'));assert((await page.locator('#configurationChanges').textContent()).includes('Invisibili'));await page.screenshot({path:'test-artifacts/r40/invisible-protection-mobile.png'});
 await page.setViewportSize({width:1440,height:950});await page.screenshot({path:'test-artifacts/r40/invisible-protection-desktop.png'});
 assert.deepEqual(errors,[]);console.log('PASS R40 browser: eleven wheels, real catalogue images before selection, mobile/desktop, hidden protection costs and 525 life, omitted hidden interiors.');
}catch(e){console.error(e.stack);process.exitCode=1;await page.screenshot({path:'test-artifacts/r40/failure.png',fullPage:true}).catch(()=>{});}finally{await browser.close();server.kill();}
