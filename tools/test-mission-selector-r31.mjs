import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

// Test the real HUD markup/styles/module and activities handler without a 3D world.
const source=fs.readFileSync('dist/game.js','utf8');
const missionTypes=source.match(/^const missionTypes=.*;$/m)?.[0];
const activities=source.match(/^function activities\(\).*$/m)?.[0];
assert(missionTypes&&activities,'production mission entry point available');
const html=fs.readFileSync('dist/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port','4177']);
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
let checks=0;
try{
 for(const hasTouch of [false,true])for(const [width,height] of [[1280,800],[390,844],[360,640],[844,390]]){
  const page=await browser.newPage({hasTouch,viewport:{width,height}});
  await page.route('http://127.0.0.1:4177/',r=>r.fulfill({status:200,contentType:'text/html',body:html}));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.goto('http://127.0.0.1:4177/');
  await page.evaluate(async({missionTypes,activities})=>{
   for(const id of ['initialLoader','intro','characterPicker'])document.getElementById(id)?.remove();
   document.getElementById('playingUI').hidden=false;
   window.hudState={started:true,ready:true,mode:'foot',car:null,mission:null,wanted:0,health:100};
   window.hudModule=await import('./compact-hud.js');
   for(const [id,label] of [['nauticalButton','Barche'],['mandriaHangarButton','Hangar']]){const b=document.createElement('button');b.id=id;b.textContent=label;document.getElementById('hudActions').appendChild(b);}
   // Only the game-world dependencies are replaced; menu creation is production code.
   const install=new Function('state',`const $=id=>document.getElementById(id);${missionTypes}
    function showMenu(title,content){state.paused=true;$('menuTitle').textContent=title;$('menuContent').innerHTML=content;if(!$('menu').open)$('menu').showModal();}
    function closeDialogs(){$('menu').close();state.paused=false;}
    function beginMission(type){state.selected=type;closeDialogs();}
    function toast(){} function cancelMission(){state.mission=null;}
    ${activities}
    $('activityBtn').onclick=activities;$('closeMenu').onclick=closeDialogs;
    $('menu').addEventListener('cancel',e=>{e.preventDefault();closeDialogs();});`);
   install(window.hudState);
  },{missionTypes,activities});
  for(const ui of ['compact','complete'])for(const mode of ['foot','car']){
   await page.evaluate(({ui,mode})=>{
    document.body.dataset.ui=ui;Object.assign(hudState,{mode,car:mode==='car'?{spec:{}}:null,mission:null});hudModule.updateHUDState(hudState,{active:false});
   },{ui,mode});
   const button=page.getByRole('button',{name:'Seleziona missioni'});
   assert(await button.isVisible(),JSON.stringify({hasTouch,width,height,ui,mode}));
   const geometry=await button.evaluate(el=>{
    const a=el.getBoundingClientRect();
    const overlap=s=>{const b=document.querySelector(s).getBoundingClientRect();return b.width&&b.height&&a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;};
    return {contained:a.left>=0&&a.top>=0&&a.right<=innerWidth&&a.bottom<=innerHeight,hit:el.contains(document.elementFromPoint(a.left+a.width/2,a.top+a.height/2)),overlap:['.minimap','.driving','#hudActions','#touchControls'].filter(overlap)};
   });
   assert(geometry.contained&&geometry.hit&&!geometry.overlap.length,'selector reachable '+JSON.stringify({hasTouch,width,height,ui,mode,geometry}));
   await button.click();
   assert(await page.locator('#menu').isVisible());
   assert.equal(await page.locator('[data-mission]').count(),4);
   assert(await page.locator('[data-mission="portavalori"]').isVisible());
   assert(await page.evaluate(()=>hudState.paused));
   await page.keyboard.press('Escape');
   assert(!await page.locator('#menu').isVisible());
   assert(!await page.evaluate(()=>hudState.paused));
   checks++;
  }
  await page.evaluate(()=>{document.body.dataset.ui='compact';hudState.mode='car';hudState.car={spec:{}};hudState.mission={type:'delivery'};hudModule.updateHUDState(hudState,{active:false});});
  assert(await page.getByRole('button',{name:'Seleziona missioni'}).isVisible());
  await page.getByRole('button',{name:'Seleziona missioni'}).click();
  assert(await page.locator('#cancelJob').isVisible(),'active mission remains manageable');
  await page.locator('#closeMenu').click();
  await page.evaluate(()=>{hudState.started=false;document.getElementById('playingUI').hidden=true;hudModule.updateHUDState(hudState,{active:false});});
  assert(!await page.getByRole('button',{name:'Seleziona missioni'}).isVisible(),'selector hidden before playing');
  await page.close();
 }
 console.log(`PASS mission selector: ${checks} desktop/touch, compact/complete, foot/car layouts; real activity menu and Escape/resume; active mission and startup.`);
}finally{await browser.close();server.kill();}
