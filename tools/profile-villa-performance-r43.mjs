// Real WebGL draw-submission/CPU profile. SwiftShader timings are diagnostic,
// not a prediction of FPS on the player's GPU. Run before/after on one machine.
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port='4193',dir='test-artifacts/r43';fs.mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port',port]);
await new Promise((ok,bad)=>{server.stdout.once('data',ok);server.once('error',bad);});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']}),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE_ERROR',e.message);});
try{
 await page.route('**/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
globalThis.__perf43={state,cars,people,keys,closeDialogs,setPaused,updateCamera,applyQuality,get gameplay(){return gameplay},get scene(){return scene},get camera(){return camera},get renderer(){return renderer},get world(){return world},get terrain(){return terrain},metrics:{}};
for(const name of ['simulate','updateTraffic','updatePeople','updateCamera']){const original=eval(name);eval(name+' = (...args)=>{const start=performance.now();try{return original(...args)}finally{const m=__perf43.metrics[name]||(__perf43.metrics[name]=[]);m.push(performance.now()-start);if(m.length>1000)m.shift();}}');}
`});});
 const start=Date.now();await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#initialQuality').selectOption(process.env.PERF_QUALITY||'low');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true',null,{timeout:240000});const readyMs=Date.now()-start;console.log('World ready',readyMs);
 await page.locator('#confirmCharacter').click({timeout:30000});
 await page.waitForFunction(()=>!!__perf43.gameplay?.villaV11?.report,null,{timeout:120000});console.log('Villa initialized',Date.now()-start);
 await page.evaluate(()=>{const q=__perf43,r=q.renderer.render.bind(q.renderer);q.renderer.render=(...a)=>{const start=performance.now();try{return r(...a)}finally{const m=q.metrics.render||(q.metrics.render=[]);m.push(performance.now()-start);if(m.length>1000)m.shift();}};q.closeDialogs();});
 if(process.env.PERF_CPU){const client=await page.context().newCDPSession(page);await client.send('Profiler.enable');await client.send('Profiler.start');await page.waitForTimeout(5000);const {profile}=await client.send('Profiler.stop');fs.writeFileSync(dir+'/cpu-'+(process.env.PERF_LABEL||'profile')+'.json',JSON.stringify(profile));const counts=new Map();for(const id of profile.samples)counts.set(id,(counts.get(id)||0)+1);console.log('CPU_SELF',JSON.stringify(profile.nodes.filter(n=>counts.has(n.id)).map(n=>({name:n.callFrame.functionName,url:n.callFrame.url.split('/').at(-1),line:n.callFrame.lineNumber+1,samples:counts.get(n.id)})).sort((a,b)=>b.samples-a.samples).slice(0,25)));}
 const results=[];
 for(const position of ['spawn','entrance','rear','city']){
  await page.evaluate(async position=>{const q=__perf43,{areaPoint,VILLA,HOME}=await import('./gameplay-areas.js'),p=position==='city'?{x:0,z:0}:position==='spawn'?HOME:areaPoint(VILLA,0,position==='rear'?-48:48);q.state.car=null;Object.assign(q.state,{x:p.x,z:p.z,y:q.terrain.height(p.x,p.z),yaw:position==='spawn'?HOME.yaw:VILLA.yaw,mode:'foot',speed:0,vy:0});q.keys.clear();for(let i=0;i<120;i++)q.updateCamera(1/60);},position);
  await page.waitForTimeout(5000);await page.evaluate(()=>{__perf43.metrics={};});await page.waitForTimeout(5000);
  const result=await page.evaluate(position=>{const q=__perf43,count=root=>{let meshes=0,triangles=0,objects=0;root.traverseVisible(o=>{objects++;if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position?.count||0)/3*(o.isInstancedMesh?o.count:1);}});return {name:root.name||root.type,meshes,triangles,objects};};return {position,quality:q.state.quality,render:{...q.renderer.info.render},memory:q.renderer.info.memory,heap:performance.memory?.usedJSHeapSize,roots:q.scene.children.map(count).sort((a,b)=>b.meshes-a.meshes).slice(0,16),villa:q.gameplay.villaLife?count(q.gameplay.villaLife.root):null,performance:q.gameplay.villaPerformance?.report||null,timings:Object.fromEntries(Object.entries(q.metrics).map(([k,v])=>{v.sort((a,b)=>a-b);return [k,{samples:v.length,mean:v.reduce((s,t)=>s+t,0)/v.length,p95:v[Math.floor(v.length*.95)],max:v.at(-1)}];}))};},position);
  if(process.env.PERF_AB&&position!=='city')result.sameView=await page.evaluate(async()=>{const q=__perf43,g=q.gameplay,{optimizeVilla}=await import('./villa-performance.js?v=villa-performance-r43-1');q.state.paused=true;g.villaPerformance.cleanup();g.villaPerformance=null;q.renderer.render(q.scene,q.camera);const before={...q.renderer.info.render};optimizeVilla(g);q.renderer.render(q.scene,q.camera);const after={...q.renderer.info.render};q.state.paused=false;return {before,after};});
  if(process.env.PERF_ASSERT){if(errors.length)throw Error(JSON.stringify(errors));if(result.performance?.savedCalls<1500)throw Error('Villa batching budget regressed');if(result.sameView&&result.sameView.after.calls>=result.sameView.before.calls*.75)throw Error('Same-view draw-call reduction below 25%');}
  results.push(result);console.log('PROFILE',JSON.stringify(result));
  if(position==='rear')await page.screenshot({path:dir+'/'+(process.env.PERF_LABEL||'profile')+'.png'});
 }
 if(errors.length)throw Error(JSON.stringify(errors));fs.writeFileSync(dir+'/'+(process.env.PERF_LABEL||'profile')+'.json',JSON.stringify({readyMs,results,errors},null,2));
}catch(e){console.error(e.stack);process.exitCode=1;}finally{await browser.close();server.kill();}
