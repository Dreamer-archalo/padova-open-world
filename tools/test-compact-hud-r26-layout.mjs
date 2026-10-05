import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
// CSS layout matrix on the actual game markup, without loading a second world.
const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port','4176']);
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const html=fs.readFileSync('dist/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
fs.mkdirSync('test-artifacts/r26',{recursive:true});
try{
 for(const hasTouch of [false,true])for(const [width,height] of [[1280,800],[390,844],[360,640],[844,390]]){
  const page=await browser.newPage({hasTouch,viewport:{width,height}});
  await page.route('http://127.0.0.1:4176/',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.goto('http://127.0.0.1:4176/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.minimap')).position==='fixed');
  await page.evaluate(()=>{
   for(const id of ['initialLoader','intro','characterPicker'])document.getElementById(id)?.remove();
   document.getElementById('playingUI').hidden=false;
   Object.assign(document.body.dataset,{ui:'compact',playing:'true',driving:'true',aircraft:'false',healthAlert:'false',missionActive:'false',wantedActive:'false'});
   document.getElementById('vehicleName').textContent='PERLA IMPERIALE';
   for(const [id,label] of [['nauticalButton','Barche'],['mandriaHangarButton','Hangar']]){const b=document.createElement('button');b.id=id;b.textContent=label;document.getElementById('hudActions').appendChild(b);}
  });
  const layout=await page.evaluate(()=>{
   const names=['.minimap','.driving','#hudActions',...(matchMedia('(pointer:coarse)').matches?['#touchControls']:[])];
   return {coarse:matchMedia('(pointer:coarse)').matches,rects:names.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {s,x:r.x,y:r.y,w:r.width,h:r.height};}),overflow:document.documentElement.scrollWidth>innerWidth,wide:[...document.body.querySelectorAll('*')].map(el=>({id:el.id,tag:el.tagName,right:el.getBoundingClientRect().right})).filter(r=>r.right>innerWidth+.5)};
  });
  console.log('HUD_LAYOUT',JSON.stringify({width,height,hasTouch,...layout}));
  assert.equal(layout.coarse,hasTouch);assert(!layout.overflow);
  const modes=await page.evaluate(async()=>{
   const {updateHUDState}=await import('./compact-hud.js');
   const state={started:true,mode:'foot',car:null,mission:null,wanted:0,health:50};
   const measure=()=>{const map=document.querySelector('.minimap').getBoundingClientRect(),canvas=document.getElementById('minimap').getBoundingClientRect();return [map.width,map.height,canvas.width,canvas.height];};
   const hidden=s=>getComputedStyle(document.querySelector(s)).display==='none';
   const snapshots=[];
   for(const mode of ['compact','complete']){
    document.body.dataset.ui=mode;updateHUDState(state,{active:true});
    snapshots.push({mode,map:measure(),footHidden:hidden('.driving'),noStars:hidden('#wanted')});
    updateHUDState({...state,mode:'car',car:{spec:{}},wanted:2},{active:false});
    snapshots.at(-1).carVisible=!hidden('.driving');snapshots.at(-1).starsVisible=!hidden('#wanted');
   }
   document.body.dataset.ui='compact';updateHUDState({...state,mode:'car',car:{spec:{}},health:100},{active:false});
   return snapshots;
  });
  assert.deepEqual(modes[0].map,modes[1].map,'HUD toggle must keep minimap dimensions');
  for(const mode of modes)assert(mode.footHidden&&mode.noStars&&mode.carVisible&&mode.starsVisible,'contextual vehicle panel and wanted stars '+JSON.stringify(mode));
  for(const r of layout.rects)assert(r.x>=0&&r.y>=0&&r.x+r.w<=width+.5&&r.y+r.h<=height+.5,'HUD contained in viewport '+JSON.stringify({hasTouch,width,height,r}));
  for(let i=0;i<layout.rects.length;i++)for(let j=i+1;j<layout.rects.length;j++){
   const a=layout.rects[i],b=layout.rects[j];
   assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'HUD areas must not overlap '+JSON.stringify({hasTouch,width,height,a,b}));
  }
  if(hasTouch&&width===390)await page.screenshot({path:'test-artifacts/r26/touch-layout.png'});
  if(!hasTouch&&width===1280){
   // Exercise the production delivery UI without loading a second 3D world.
   await page.clock.install({time:new Date('2026-10-05T12:00:00Z')});
   await page.clock.pauseAt(new Date('2026-10-05T12:00:01Z'));
   await page.evaluate(async()=>{
    const {mandriaV9Update}=await import('./villa-mandria-v9-estate-life.js'),{VILLA}=await import('./gameplay-areas.js');
    const current={phase:'permission',truck:{mesh:{userData:{mandriaV9Decor:true}}},driver:{obj:{position:{x:0,z:0}}}};
    const g={state:{started:true,mode:'foot',x:VILLA.x+1000,z:VILLA.z,elapsed:0},villaV7Life:{},villaV3:{},villaV8Delivery:{active:current},villaV9:{delivery:{active:null,phase:null},report:{deliveryNotices:0}}};
    window.deliveryTest={g,update:()=>mandriaV9Update(g,.02)};window.deliveryTest.update();
   });
   const notice=page.locator('#mandriaV9DeliveryNotice');
   assert(await notice.isVisible());assert((await notice.textContent()).includes('CAMION PRONTO PER LO SCARICO'));
   assert((await notice.textContent()).includes('torna alla villa'));
   await page.screenshot({path:'test-artifacts/r26/delivery-notification.png'});
   await page.clock.runFor(5900);assert(await notice.isVisible(),'notification visible until six seconds');
   await page.clock.runFor(100);assert(!(await notice.isVisible()),'notification expires at six seconds');
   await page.evaluate(()=>deliveryTest.update());assert(!(await notice.isVisible()),'frame update cannot restore expired notice');
   await page.evaluate(()=>{deliveryTest.g.villaV8Delivery.active.phase='unload';deliveryTest.update();});
   assert(await notice.isVisible(),'new delivery phase creates one new notification');
   await page.getByRole('button',{name:'Chiudi notifica'}).click();
   await page.evaluate(()=>deliveryTest.update());assert(!(await notice.isVisible()),'dismissal persists across updates');
   assert.equal(await page.evaluate(()=>deliveryTest.g.villaV8Delivery.active.phase),'unload','closing notification does not cancel delivery');
   await page.evaluate(()=>{deliveryTest.g.villaV8Delivery.active={...deliveryTest.g.villaV8Delivery.active};deliveryTest.update();});
   assert(await notice.isVisible(),'next truck can notify even with the same phase');
   console.log('PASS contextual HUD, stable minimap size and dismissible six-second delivery notifications');
  }
  await page.close();
 }
}finally{await browser.close();server.kill();}
