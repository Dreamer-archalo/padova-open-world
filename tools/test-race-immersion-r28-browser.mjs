import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port','4178']);
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,executablePath:process.env.PADOVA_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('test-artifacts/r28',{recursive:true});
try{
 await page.route('**/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nglobalThis.__r28={state,get gameplay(){return gameplay},get terrain(){return terrain},get scene(){return scene},get camera(){return camera},get renderer(){return renderer}};`});});
 await page.goto('http://127.0.0.1:4178/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!document.getElementById('playBtn')?.disabled,null,{timeout:90000});await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true',null,{timeout:240000});await page.locator('#confirmCharacter').click({timeout:20000});
 await page.evaluate(async()=>{const {TangenzialeRace}=await import('./tangenziale-race.js');const start=TangenzialeRace.prototype.start;TangenzialeRace.prototype.start=function(...a){const out=start.apply(this,a);globalThis.__raceQA=this;return out;};});
 for(const [mode,vehicle] of [['easy','scooter'],['medium','collector-limone'],['hard','collector-fiamma']]){
  await page.locator('#activityBtn').click();await page.locator('#tangenzialeRaceHubActivity').click();await page.locator('#raceHubOne').click();await page.locator('#raceOneDifficulty').selectOption(mode);await page.locator('#raceOneVehicle').selectOption(vehicle);
  assert((await page.locator('#raceOneVehicle option').count())>=40);await page.screenshot({path:`test-artifacts/r28/${mode}-selector.png`});
  await page.locator('#startTangenzialeRace').click();
  const sceneCheck=await page.evaluate(async()=>{
   const m=__raceQA,r=m.race,g=m.game,THREE=await import('./vendor/three.module.js');g.state.paused=true;g.scene.updateMatrixWorld(true);
   // Every physical ramp is rendered at its real slope and base, using ray tests.
   const ramps=r.ramps.map(e=>{const ray=new THREE.Raycaster(new THREE.Vector3(e.x,e.baseY+5,e.z),new THREE.Vector3(0,-1,0),0,8),hits=ray.intersectObject(r.immersion.root,true);return {index:e.index,rendered:hits.some(h=>Math.abs(h.point.y-(e.baseY+e.rise/2+.07))<.12)};});
   const e=r.ramps[0];g.camera.position.set(e.x-16,e.baseY+9,e.z-18);g.camera.lookAt(e.x,e.baseY+1,e.z);g.renderer.render(g.scene,g.camera);
   return {mode:r.difficulty,style:r.playerCar.style,models:r.ai.map(c=>c.style),counts:r.immersion.counts,drawCalls:r.immersion.root.children.length,ramps};
  });assert.equal(sceneCheck.mode,mode);assert.equal(sceneCheck.style,vehicle);assert(sceneCheck.ramps.every(r=>r.rendered),'ramp render matches physical height');assert.equal(sceneCheck.drawCalls,1);
  await page.screenshot({path:`test-artifacts/r28/${mode}-track.png`});
  const result=await page.evaluate(async()=>{
   const m=__raceQA,r=m.race,g=m.game;r.phase='running';r.startedAt=g.state.elapsed;r.playerFinished=true;r.finishTimes[0]=1;r.firstFinishAt=g.state.elapsed-20;
   let recoveries=0;const old=m.respawnActor;m.respawnActor=function(...a){recoveries++;return old.apply(this,a);};
   for(let tick=0;r.ai.some(c=>!c.raceFinished)&&tick<12000;tick++){g.state.elapsed+=1/60;m.updateAI(1/60);if(tick%300===0)await new Promise(resolve=>setTimeout(resolve,0));}
   m.respawnActor=old;const out={times:r.finishTimes.slice(1),finished:r.ai.map(c=>c.raceFinished),recoveries,movingEvents:r.immersion.events.filter(e=>e.kind==='moving').map(e=>e.activated)};
   // Exit removes all temporary actors, ramps and props, and returns to prior state.
   const actors=[r.playerCar,...r.ai,...r.obstacles],x=r.snapshot.x,z=r.snapshot.z;m.abort();out.restored=g.state.x===x&&g.state.z===z&&actors.every(c=>!g.cars.includes(c))&&!g.terrain.arcadeRamps.some(e=>e.tangenzialeRace);g.state.paused=false;return out;
  });assert(result.finished.every(Boolean));assert.equal(result.recoveries,0);assert(result.restored);assert(result.movingEvents.every(Boolean));results.push({sceneCheck,result});console.log('R28_BROWSER_RACE',JSON.stringify(results.at(-1)));
 }
 // Second race must continue to bypass the new first-race selector and tuning.
 await page.locator('#activityBtn').click();await page.locator('#tangenzialeRaceHubActivity').click();await page.locator('#raceHubTwo').click();assert.equal(await page.locator('#raceOneVehicle').count(),0);await page.locator('#startTangenzialeRaceSecond').click();
 const second=await page.evaluate(()=>{const m=__raceQA,r=m.race;const result={second:r.__secondRace,ai:r.ai.length,immersion:!!r.immersion,specs:[r.playerCar,...r.ai].map(c=>c.spec.max)};m.abort();return result;});assert(second.second&&second.ai===6&&!second.immersion);assert.equal(new Set(second.specs).size,1);
 assert.deepEqual(errors,[]);fs.writeFileSync('test-artifacts/r28/browser.json',JSON.stringify({results,second,errors},null,2));console.log('PASS R28 browser, three selectable models, genuine ramp surfaces, complete AI races and second-race preservation');
}catch(e){console.error(e.stack);console.error('JS_ERRORS',JSON.stringify(errors));await page.screenshot({path:'test-artifacts/r28/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();server.kill();}
