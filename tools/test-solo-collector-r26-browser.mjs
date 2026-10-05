import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {COLLECTOR_IDS} from '../dist/collector-cars.js';

const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port','4175']);
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],network=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/mqtt|emqx|broker/i.test(r.url()))network.push(r.url());});
fs.mkdirSync('test-artifacts/r26',{recursive:true});let phase='startup';
async function openCollection(){
 await page.locator('#mandriaHangarButton').click();
 await page.locator('#hangarSections [data-section="collector"]').click();
 await page.waitForFunction(()=>document.querySelectorAll('#hangarGrid [data-hangar-id]:not([hidden])').length===15);
}
try{
 await page.route('**/game.js*',async route=>{
  const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nglobalThis.__r26={state,cars,get gameplay(){return gameplay},get terrain(){return terrain},get world(){return world},get scene(){return scene},get camera(){return camera},get renderer(){return renderer},updateUI,poseVehicle};`});
 });
 await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!document.getElementById('playBtn')?.disabled,null,{timeout:60000});
 assert.equal(await page.locator('#onlineBtn').count(),0);assert.equal(await page.locator('#onlineDialog').count(),0);
 await page.screenshot({path:'test-artifacts/r26/solo-start.png'});
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true',null,{timeout:240000});
 await page.locator('#confirmCharacter').click({timeout:20000});
 await page.waitForFunction(()=>document.body.dataset.playing==='true');
 phase='compact HUD';
 const hud=await page.evaluate(()=>{
  const hidden=s=>getComputedStyle(document.querySelector(s)).display==='none';
  return {layout:document.body.dataset.ui,keybar:hidden('.keybar'),telemetry:hidden('.telemetry'),mission:hidden('.mission'),map:!hidden('.minimap'),actions:!hidden('#hudActions'),driving:document.body.dataset.driving};
 });
 assert.equal(hud.layout,'compact');assert(hud.keybar&&hud.telemetry&&hud.mission&&hud.map&&hud.actions);
 await page.screenshot({path:'test-artifacts/r26/compact-on-foot.png'});
 await page.locator('#hudDetailsBtn').click();
 assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.telemetry')).display==='none'),false);
 await page.locator('#hudDetailsBtn').click();
 // Check contextual warnings even when ordinary telemetry is collapsed.
 const contextual=await page.evaluate(async()=>{
  const {updateHUDState}=await import('./compact-hud.js'),s=__r26.state;
  updateHUDState({...s,mission:{},wanted:2,health:50},{active:false});
  const result={mission:getComputedStyle(document.querySelector('.mission')).display!=='none',wanted:getComputedStyle(document.getElementById('wanted')).display!=='none',health:getComputedStyle(document.querySelector('.driving')).display!=='none'};
  updateHUDState(s,{active:false});return result;
 });assert(contextual.mission&&contextual.wanted&&contextual.health);
 phase='hangar access';
 await page.evaluate(async()=>{
  const {VILLA,areaPoint}=await import('./gameplay-areas.js'),{VILLA_GARAGE}=await import('./villa-treves-layout.js');
  const p=areaPoint(VILLA,VILLA_GARAGE.u-9,VILLA_GARAGE.v),g=__r26,s=g.state;
  Object.assign(s,{x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),mode:'foot',car:null,speed:0,vy:0,paused:false});
  const cx=Math.floor(p.x/320),cz=Math.floor(p.z/320);
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const stage of ['core','detail']){
   const steps=g.world.buildStageSteps((cx+dx)+','+(cz+dz),stage);let done=false;
   while(!done){const start=performance.now();do{done=steps.next().done;}while(!done&&performance.now()-start<8);if(!done)await new Promise(r=>setTimeout(r,0));}
  }
 });
 await page.waitForFunction(()=>document.getElementById('mandriaHangarButton')&&!document.getElementById('mandriaHangarButton').hidden,null,{timeout:30000});
 await openCollection();
 const images=[];
 for(const id of COLLECTOR_IDS){
  const img=page.locator(`[data-hangar-id="${id}"] img`);await img.scrollIntoViewIfNeeded();
  await page.waitForFunction(id=>{const i=document.querySelector(`[data-hangar-id="${id}"] img`);return i?.dataset.previewReady===id+'/null'&&i.complete;},id,{timeout:45000});
  const src=await img.getAttribute('src');assert(src.startsWith('data:image/webp'),id+': rendered original livery');images.push(src);
 }
 assert.equal(new Set(images).size,15,'distinct rendered thumbnails');
 await page.locator('#mandriaHangarDialog').evaluate(el=>el.scrollTop=0);await page.screenshot({path:'test-artifacts/r26/collector-catalogue.png'});
 await page.locator('#hangarClose').click();
 let stagedCount=null;
 for(const id of COLLECTOR_IDS){
  phase='stage '+id;await openCollection();await page.locator(`[data-hangar-id="${id}"]`).click();
  await page.waitForFunction(id=>__r26.gameplay?.mandriaHangar?.staged?.style===id&&!__r26.gameplay.mandriaHangar.busy,id,{timeout:30000});
  const result=await page.evaluate(async()=>{
   const g=__r26,h=g.gameplay.mandriaHangar,c=h.staged,{vehicleBlocked}=await import('./movement.js');
   const meshes=c.mesh.children.filter(o=>o.isMesh&&o.visible).length;
   return {style:c.style,meshId:c.mesh.userData.collectorCar,parked:c.parked,health:c.health,paused:g.state.paused,blocked:vehicleBlocked(c.x,c.z,c.yaw,g.world.collision,c.spec,c.y),staged:g.cars.filter(c=>c.hangarInventory).length,meshes};
  });
  console.log('COLLECTOR_STAGED',JSON.stringify(result));
  assert.equal(result.style,id);assert.equal(result.meshId,id);assert(result.parked&&result.health===100&&!result.paused&&!result.blocked&&result.meshes===1,id+': staged, playable and clear of collisions');
  if(stagedCount===null)stagedCount=result.staged;else assert.equal(result.staged,stagedCount,'replacement does not accumulate previous models');
 }
 phase='delivery and driving';await openCollection();await page.locator('#hangarDeliver').click();
 await page.waitForFunction(()=>__r26.state.mode==='car'&&__r26.state.car?.style==='collector-magnete');
 const before=await page.evaluate(()=>({x:__r26.state.x,z:__r26.state.z}));
 await page.keyboard.down('KeyW');await page.waitForFunction(()=>Math.abs(__r26.state.speed)>1,null,{timeout:10000});await page.keyboard.up('KeyW');
 const after=await page.evaluate(()=>({x:__r26.state.x,z:__r26.state.z,health:__r26.state.health,style:__r26.state.car.style}));
 assert(Math.hypot(after.x-before.x,after.z-before.z)>.05&&after.health>0,'new car follows the ordinary driving controller');
 await page.screenshot({path:'test-artifacts/r26/collector-driving.png'});
 phase='mobile layout';await page.setViewportSize({width:390,height:844});
 const mobile=await page.evaluate(()=>{
  const sels=['.minimap','.driving','#hudActions'],rects=sels.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {s,x:r.x,y:r.y,w:r.width,h:r.height};});
  return {rects,overflow:document.documentElement.scrollWidth>innerWidth};
 });assert(!mobile.overflow);assert(mobile.rects.every(r=>r.x>=0&&r.x+r.w<=390+.5),'HUD inside phone viewport');
 await page.screenshot({path:'test-artifacts/r26/compact-mobile.png'});
 assert.deepEqual(network,[],'no online broker or MQTT activity');assert.deepEqual(errors,[],'no runtime exceptions');
 console.log('PASS R26 browser',JSON.stringify({startup:'solo',hud,contextual,thumbnails:15,staged:15,driving:after,mobile}));
}catch(error){console.error('R26_BROWSER_FAIL',phase,error.stack||error);console.error('JS_ERRORS',JSON.stringify(errors));try{await page.screenshot({path:'test-artifacts/r26/failure.png',timeout:15000});}catch{}process.exitCode=1;}
finally{await browser.close();server.kill();}
