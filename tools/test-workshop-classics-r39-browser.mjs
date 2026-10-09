import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port','4199']);await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']}),page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('test-artifacts/r39',{recursive:true});
try{
 await page.goto('http://127.0.0.1:4199/');
 await page.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),{DEALER_CATALOG,createDealerVehicle,dealerQuote}=await import('./dealerships.js'),{VEHICLES}=await import('./vehicles.js');
  document.body.innerHTML='<style>body{margin:0;overflow:auto;background:#d7dfe5;color:#1c2c37;font:16px Arial}h1{font:28px Arial;margin:20px}#grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:12px}figure{background:#c9d5dd;margin:0;padding:5px}img{width:100%}figcaption{padding:8px}</style><h1>Spider 66 · Stradale 33 storica</h1><main id="grid"></main>';
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(600,380);renderer.setClearColor('#c9d5dd');const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,600/380,.1,200);scene.add(new T.HemisphereLight('#fff','#667787',2.3));const sun=new T.DirectionalLight('#fff4de',3);sun.position.set(5,9,6);scene.add(sun);
  for(const id of ['collector-nebula','collector-stradale33'])for(const view of ['front','rear','side']){const root=createDealerVehicle(id),box=new T.Box3().setFromObject(root),c=box.getCenter(new T.Vector3()),d=box.getSize(new T.Vector3());scene.add(root);camera.position.copy(c).add(new T.Vector3(view==='side'?d.z*1.8:d.z*1.15,d.z*.5,view==='front'?d.z*1.2:view==='rear'?-d.z*1.2:.1));camera.lookAt(c);renderer.render(scene,camera);const f=document.createElement('figure');f.innerHTML='<img src="'+renderer.domElement.toDataURL()+'"><figcaption>'+DEALER_CATALOG[id].name+' · '+view+'</figcaption>';document.querySelector('#grid').append(f);scene.remove(root);}
  globalThis.__r39={T,createDealerVehicle,dealerQuote,VEHICLES,DEALER_CATALOG};
 });await page.screenshot({path:'test-artifacts/r39/classics.png',fullPage:true});
 // The workshop uses the real controller, renderer and quote logic in a small harness.
 await page.goto('http://127.0.0.1:4199/');
 await page.evaluate(async()=>{
  const {VehicleWorkshops}=await import('./vehicle-workshops.js'),{VEHICLES}=await import('./vehicles.js'),{createDealerVehicle,dealerQuote}=await import('./dealerships.js');
  document.body.innerHTML='<dialog id="menu"><div class="dialog-head"><h2>Autofficina</h2><button>×</button></div><div id="menuContent"></div></dialog>';
  const car={style:'collector-nebula',name:VEHICLES['collector-nebula'].name,spec:VEHICLES['collector-nebula'],mesh:createDealerVehicle('collector-nebula'),health:90},state={health:90,money:400000,car};
  const shop=new VehicleWorkshops({state,toast(){},showMenu(title,html){document.querySelector('#menuContent').innerHTML=html;document.querySelector('#menu').showModal();}});shop.nearest=()=>({site:{name:'Officina · prova'}});if(!shop.open())throw Error('Workshop did not open');globalThis.__r39={shop,car,state};
 });await page.waitForTimeout(300);
 const preview=page.locator('#workshopPreview'),panel=page.locator('.configurator-controls'),start=await preview.boundingBox();
 await page.locator('[data-workshop-option="wheelDesign"]').selectOption('mesh');await page.locator('[data-workshop-option="wheels"]').selectOption('bronze');
 await page.locator('[data-workshop-option="exhaust"]').selectOption('dual');await page.locator('[data-workshop-option="chromeMirrors"]').selectOption('black');await page.locator('[data-workshop-option="grille"]').selectOption('mesh');
 await panel.evaluate(el=>el.scrollTop=el.scrollHeight);const end=await preview.boundingBox();assert(Math.abs(start.y-end.y)<1&&end.height===start.height,'preview stays fixed while options scroll');assert(await page.locator('#workshopConfirm').isVisible());assert((await page.locator('#configurationChanges').textContent()).includes('Rete Sport'));await page.screenshot({path:'test-artifacts/r39/workshop-desktop.png'});
 const bounds=await page.locator('#workshopConfirm').boundingBox();assert(bounds.y+bounds.height<950,'confirm remains within viewport');
 await page.locator('[data-workshop-tab="Sicurezza"]').click();await page.locator('[data-workshop-option="frontGuard"]').selectOption('heavy');assert((await page.locator('#configurationChanges').textContent()).includes('Push bar pesante'));
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await panel.evaluate(el=>el.scrollTop=el.scrollHeight);const mobile=await preview.boundingBox(),confirm=await page.locator('#workshopConfirm').boundingBox();assert(mobile.y>=0&&mobile.y+mobile.height<844);assert(confirm.y+confirm.height<844);assert.equal(await page.evaluate(()=>document.querySelector('#menu').scrollWidth<=document.querySelector('#menu').clientWidth),true);await page.screenshot({path:'test-artifacts/r39/workshop-mobile.png'});
 // Presets disclose their exact compatible changes and have an explicit undo action.
 await page.setViewportSize({width:1440,height:950});
 await page.evaluate(async()=>{const {mountConfigurationPresets}=await import('./configurator-layout.js'),{dealerCapabilities}=await import('./dealer-customization.js');const root=document.querySelector('.configurator-controls'),defs=dealerCapabilities(__r39.car.spec);const old=document.createElement('div');old.innerHTML='<button data-dealer-preset="elegant">Elegante</button>';root.prepend(old);for(const el of root.querySelectorAll('[data-workshop-option]'))el.dataset.dealerOption=el.dataset.workshopOption;globalThis.__oldRim=root.querySelector('[data-dealer-option="wheelDesign"]').value;mountConfigurationPresets(document.querySelector('#menuContent'),defs,()=>{});});
 await page.locator('.configuration-packages summary').click();await page.locator('[data-dealer-preset="sport"]').click();assert.equal(await page.locator('[data-dealer-option="wheelDesign"]').inputValue(),'sport');await page.locator('#dealerPresetUndo').click();assert.equal(await page.locator('[data-dealer-option="wheelDesign"]').inputValue(),'mesh');await page.screenshot({path:'test-artifacts/r39/packages.png'});
 assert.deepEqual(errors,[]);fs.writeFileSync('test-artifacts/r39/browser-results.json',JSON.stringify({desktop:{start,end,bounds},mobile:{preview:mobile,confirm},errors},null,2));console.log('PASS R39 browser: classics views, live workshop controls, fixed preview, visible checkout, mobile layout, package disclosure and undo.');
}catch(e){console.error(e.stack);process.exitCode=1;await page.screenshot({path:'test-artifacts/r39/failure.png',fullPage:true}).catch(()=>{});}finally{await browser.close();server.kill();}
