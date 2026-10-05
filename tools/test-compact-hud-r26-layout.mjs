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
 for(const hasTouch of [false,true])for(const [width,height] of [[390,844],[360,640],[844,390]]){
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
  for(const r of layout.rects)assert(r.x>=0&&r.y>=0&&r.x+r.w<=width+.5&&r.y+r.h<=height+.5,'HUD contained in viewport '+JSON.stringify({hasTouch,width,height,r}));
  for(let i=0;i<layout.rects.length;i++)for(let j=i+1;j<layout.rects.length;j++){
   const a=layout.rects[i],b=layout.rects[j];
   assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'HUD areas must not overlap '+JSON.stringify({hasTouch,width,height,a,b}));
  }
  if(hasTouch&&width===390)await page.screenshot({path:'test-artifacts/r26/touch-layout.png'});
  await page.close();
 }
}finally{await browser.close();server.kill();}
