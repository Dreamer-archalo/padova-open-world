import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {commandSet} from '../dist/command-guide.js';
const state={started:true,mode:'car',car:{style:'cinquecento',spec:{}},health:100};
const has=(s,key,label)=>commandSet(s).commands.some(([k,l])=>k===key&&l===label);
assert(has(state,'H','Clacson'));assert(has(state,'TAB','Turbo · max 6 s'));
assert(has({...state,car:{...state.car,raceOneRules:{}}},'X','Abbandona gara'));
assert(has({...state,car:{style:'airport-michelangelo',spec:{aircraft:true,plane:true}}},'CTRL','Frena'));
assert(has({...state,car:{style:'airport-jet',spec:{aircraft:true,plane:true}}},'G','Missile'));
assert.equal(commandSet({...state,mode:'foot'},{swimming:true}).name,'Nuoto');
const html=fs.readFileSync('dist/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port','4179']);
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
let checks=0;
try{
 for(const hasTouch of [false,true])for(const [width,height] of [[1280,800],[390,844],[360,640],[844,390]]){
  const page=await browser.newPage({hasTouch,viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://127.0.0.1:4179/',r=>r.fulfill({status:200,contentType:'text/html',body:html}));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.goto('http://127.0.0.1:4179/');
  await page.evaluate(async()=>{
   for(const id of ['initialLoader','intro','characterPicker'])document.getElementById(id)?.remove();
   document.getElementById('playingUI').hidden=false;window.hud=await import('./compact-hud.js');
   window.state={started:true,mode:'car',car:{style:'cinquecento',spec:{}},health:100};hud.updateHUDState(state,{});
  });
  assert.equal(await page.locator('#hudDetailsBtn').count(),0);
  assert(await page.locator('#commandGuide').isVisible());
  await page.evaluate(()=>document.getElementById('commandGuide').open=true);
  await page.waitForTimeout(60);
  const geometry=await page.evaluate(()=>{
   const g=document.getElementById('commandGuide').getBoundingClientRect(),d=document.querySelector('.driving').getBoundingClientRect(),t=document.getElementById('touchControls').getBoundingClientRect();
   return {contained:g.x>=0&&g.y>=0&&g.right<=innerWidth&&g.bottom<=innerHeight,drivingAbove:d.bottom<=g.top,aboveTouch:!t.height||g.bottom<=t.top};
  });
  assert(geometry.contained&&geometry.drivingAbove&&geometry.aboveTouch,JSON.stringify({hasTouch,width,height,geometry}));
  assert.match(await page.locator('#commandGuide').textContent(),/HClacson/);
  await page.evaluate(()=>{state.car={style:'airone',spec:{aircraft:true}};hud.updateHUDState(state,{});});
  assert.match(await page.locator('#commandGuide').textContent(),/FParacadute/);
  assert(!/Clacson/.test(await page.locator('#commandGuide').textContent()));
  await page.evaluate(()=>{state.mode='foot';state.car=null;hud.updateHUDState(state,{swimming:true});});
  assert.match(await page.locator('#commandGuide').textContent(),/Nuoto/);
  await page.evaluate(()=>{state.paused=true;hud.updateHUDState(state,{});});assert(!await page.locator('#commandGuide').isVisible());
  assert.deepEqual(errors,[]);checks++;await page.close();
 }
 console.log(`PASS command guide: ${checks} mouse/touch layouts, active vehicle controls, compact only, pause and no driving/touch overlap.`);
}finally{await browser.close();server.kill();}
