import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const html=fs.readFileSync('dist/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port','4178']);
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
let layouts=0;
try{
 for(const hasTouch of [false,true])for(const [width,height] of [[1280,800],[390,844],[360,640],[844,390]]){
  const page=await browser.newPage({hasTouch,viewport:{width,height}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://127.0.0.1:4178/',r=>r.fulfill({status:200,contentType:'text/html',body:html}));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.goto('http://127.0.0.1:4178/');
  await page.evaluate(async()=>{
   for(const id of ['initialLoader','intro','characterPicker'])document.getElementById(id)?.remove();
   document.getElementById('playingUI').hidden=false;
   localStorage.setItem('padova-hud-layout','complete');
   window.hud=await import('./compact-hud.js');
   window.context=await import('./context-actions.js');
   window.state={started:false,mode:'foot',car:null,mission:null,wanted:0,health:100};
   window.calls={};
   window.addAction=(id,text)=>{const b=document.createElement('button');b.id=id;b.textContent=text;b.hidden=true;b.addEventListener('click',()=>calls[id]=(calls[id]||0)+1);document.body.appendChild(b);return b;};
   for(const [id,text] of [['mandriaHangarButton','H · HANGAR / CATALOGO'],['mandriaWorkerPrompt','E · PARLA CON IL CONTADINO'],['dealerBtnFixturePrompt','G · PARLA CON IL DIPENDENTE']])addAction(id,text);
   document.getElementById('interact').hidden=false;document.getElementById('interact').textContent='E · SALI SUL TAXI';
   hud.updateHUDState(state,{active:false});context.refreshContextActions();
  });
  assert(!await page.locator('#contextActions').isVisible(),'no alerts before gameplay');
  await page.evaluate(()=>{state.started=true;hud.updateHUDState(state,{active:false});});
  assert.equal(await page.evaluate(()=>document.body.dataset.ui),'compact','stored complete preference cannot enable extra HUD at entry');
  assert.equal(await page.locator('#hudDetailsBtn').textContent(),'HUD +');
  assert(await page.locator('#interact').isVisible(),'vehicle E hint appears in compact HUD');
  for(const ui of ['compact','complete']){
   if(ui==='complete')await page.locator('#hudDetailsBtn').click();
   assert.equal(await page.evaluate(()=>document.body.dataset.ui),ui);
   for(const id of ['mandriaHangarButton','mandriaWorkerPrompt','dealerBtnFixturePrompt']){
    await page.evaluate(id=>{
     document.getElementById('interact').hidden=true;
     for(const key of ['mandriaHangarButton','mandriaWorkerPrompt','dealerBtnFixturePrompt'])document.getElementById(key).hidden=key!==id;
    },id);
    const action=page.locator('#'+id);assert(await action.isVisible(),id+' must be visible with '+ui);
    const geometry=await action.evaluate(el=>{const r=el.getBoundingClientRect();return {inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,clickable:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
    assert(geometry.inside&&geometry.clickable,'context action reachable '+JSON.stringify({hasTouch,width,height,ui,id,geometry}));
    await action.click();assert.equal(await page.evaluate(id=>calls[id],id),ui==='compact'?1:2,'original action handler is preserved');
    await action.locator('..').getByRole('button',{name:'Chiudi avviso'}).click();
    assert(!await action.isVisible(),'X hides the current hint');
    assert(!await action.evaluate(el=>el.hidden),'X does not disable the real gameplay action');
    await page.evaluate(()=>context.refreshContextActions());
    assert(!await action.isVisible(),'refresh cannot restore a dismissed hint');
    await page.evaluate(id=>document.getElementById(id).hidden=true,id);
    await page.waitForTimeout(0);
    await page.evaluate(id=>document.getElementById(id).hidden=false,id);
    assert(await action.isVisible(),'leaving and returning restores the action');
    await page.evaluate(()=>document.getElementById('menu').showModal());
    assert(!await page.locator('#contextActions').isVisible(),'alerts hidden while choosing in a dialog');
    await page.evaluate(()=>document.getElementById('menu').close());
    assert(await action.isVisible(),'alerts return after closing dialog');
    layouts++;
   }
  }
  await page.evaluate(()=>{
   for(const key of ['mandriaHangarButton','mandriaWorkerPrompt','dealerBtnFixturePrompt'])document.getElementById(key).hidden=true;
   const hint=document.getElementById('interact');hint.hidden=false;hint.textContent='E · SALI SUL TAXI';
  });
  await page.locator('#interact').locator('..').getByRole('button',{name:'Chiudi avviso'}).click();
  await page.evaluate(()=>document.getElementById('interact').textContent='E · SALI SULLA MOTO');
  assert(await page.locator('#interact').isVisible(),'a different nearby action resets dismissal');
  await page.evaluate(()=>{const b=addAction('futureDoor','E · APRI LA PORTA');b.dataset.hudAction='';b.hidden=false;});
  assert(await page.locator('#futureDoor').isVisible(),'future registered action appears automatically');
  assert.equal(await page.locator('#futureDoor').evaluate(el=>el.closest('aside').id),'contextActions');
  await page.locator('#futureDoor').click();assert.equal(await page.evaluate(()=>calls.futureDoor),1);
  await page.evaluate(()=>{state.started=false;hud.updateHUDState(state,{active:false});});
  assert(!await page.locator('#contextActions').isVisible());
  await page.evaluate(()=>{state.started=true;hud.updateHUDState(state,{active:false});});
  assert.equal(await page.evaluate(()=>document.body.dataset.ui),'compact','new session resets HUD without reload');
  await page.locator('#hudDetailsBtn').click();
  assert.equal(await page.evaluate(()=>document.body.dataset.ui),'complete');
  await page.reload();
  await page.evaluate(async()=>{await import('./compact-hud.js');});
  assert.equal(await page.evaluate(()=>document.body.dataset.ui),'compact','page reload always starts compact');
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log(`PASS ${layouts} contextual action layouts: mouse/touch, compact/complete, original callbacks, dismissal and re-entry, future controls, dialogs, fresh session and reload defaults.`);
}finally{await browser.close();server.kill();}
