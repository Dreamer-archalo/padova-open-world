import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const legacy=execFileSync('git',['show','ea05ddbd85f887e32850acf51f69ebeba985ba1c:dist/phase4-terrain-fixes.js'],{encoding:'utf8'});
const oldBuilder=legacy.slice(legacy.indexOf('function buildPatchSeal('),legacy.indexOf('function pratoPoint(')).replace('function buildPatchSeal(','function legacyBuildPatchSeal(');
const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port','4177']);
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('test-artifacts/r27',{recursive:true});
try{
 if(process.env.PADOVA_R27_BASELINE)await page.route('**/race-one-immersion.js',route=>route.fulfill({contentType:'application/javascript',body:'// R27 baseline for preserved bridge/difficulty comparison'}));
 await page.route('**/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nglobalThis.__r27={state,get gameplay(){return gameplay},get terrain(){return terrain},get world(){return world},get scene(){return scene},get camera(){return camera},get renderer(){return renderer}};`});});
 await page.route('**/phase4-terrain-fixes.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+oldBuilder+'\nglobalThis.__bridgeQA={legacyBuildPatchSeal,buildPatchSeal,SOUTH_PATCHES};'});});
 await page.goto('http://127.0.0.1:4177/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!document.getElementById('playBtn')?.disabled,null,{timeout:90000});
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true',null,{timeout:240000});
 await page.locator('#confirmCharacter').click({timeout:20000});
 await page.evaluate(async()=>{const {TangenzialeRace}=await import('./tangenziale-race.js');const start=TangenzialeRace.prototype.start;TangenzialeRace.prototype.start=function(...a){const out=start.apply(this,a);globalThis.__raceQA=this;return out;};});
 const times={};
 for(const mode of ['easy','medium','hard']){
  await page.locator('#activityBtn').click();await page.locator('#tangenzialeRaceHubActivity').click();await page.locator('#raceHubOne').click();await page.locator('#raceOneDifficulty').selectOption(mode);await page.locator('#startTangenzialeRace').click();
  const result=await page.evaluate(async()=>{
   const m=__raceQA,r=m.race,g=m.game;g.state.paused=true;r.phase='running';r.startedAt=g.state.elapsed;
   const respawn=m.respawnActor;let recoveries=0;m.respawnActor=function(...a){recoveries++;return respawn.apply(this,a);};
   for(const c of r.ai)c.parked=false;
   for(let tick=0;r.ai.some(c=>!c.raceFinished)&&tick<9000;tick++){
    g.state.elapsed+=1/60;m.updateAI(1/60);if(tick%300===0)await new Promise(resolve=>setTimeout(resolve,0));
   }
   m.respawnActor=respawn;
   return {mode:r.difficulty,total:r.total,times:r.finishTimes.slice(1),finished:r.ai.map(c=>c.raceFinished),recoveries};
  });
  assert.equal(result.mode,mode);assert(result.finished.every(Boolean),mode+': three bots finish in actual browser');assert.equal(result.recoveries,0);times[mode]=result.times;
  console.log('BROWSER_RACE_COMPLETE',JSON.stringify(result));
  if(mode!=='hard')await page.evaluate(()=>{__raceQA.restoreSnapshot();__r27.state.paused=false;});
 }
 for(let i=0;i<3;i++){assert(times.easy[i]>times.medium[i]*1.15);assert(times.medium[i]>times.hard[i]);}
 // Hide temporary race props only for the bridge comparison screenshots.
 await page.evaluate(()=>{for(const root of __raceQA.race.roots)root.visible=false;});
 await page.addStyleTag({content:'body > :not(#world) {visibility:hidden !important;}'});
 for(const name of ['Via San Tommaso','Via Francesco Petrarca','Via Ugo Foscolo']){
  const result=await page.evaluate(async name=>{
   const g=__r27,m=__raceQA,t=g.terrain,w=g.world,THREE=await import('./vendor/three.module.js'),{vehicleBlocked}=await import('./movement.js');
   const crossings=t.roads.gradeCrossings.filter(c=>c.upper.n===name).map(c=>({...c,d:Math.min(...m.race.samples.map(p=>Math.hypot(p.x-c.x,p.z-c.z)))})).sort((a,b)=>a.d-b.d);
   const c=crossings[0];if(!c)throw Error('Missing crossing '+name);
   const lower=t.roads.candidates(c.x,c.z,2).filter(s=>s.road!==c.upper&&s.height<t.roads.sample(c.upper,c.x,c.z)-2.8).sort((a,b)=>a.d-b.d)[0];
   const yaw=Math.atan2(lower.segment.b[0]-lower.segment.a[0],lower.segment.b[1]-lower.segment.a[1]),y=lower.height;
   Object.assign(g.state,{x:c.x,z:c.z,y,mode:'foot',car:null,speed:0,vy:0,paused:true});
   const cx=Math.floor(c.x/320),cz=Math.floor(c.z/320);
   for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const stage of ['core','detail']){
    const steps=w.buildStageSteps((cx+dx)+','+(cz+dz),stage);let done=false;
    while(!done){const start=performance.now();do{done=steps.next().done;}while(!done&&performance.now()-start<8);if(!done)await new Promise(r=>setTimeout(r,0));}
   }
   const patch=__bridgeQA.SOUTH_PATCHES.find(p=>p.id==='albignasego');
   const before=__bridgeQA.legacyBuildPatchSeal(g.gameplay,patch).root,after=__bridgeQA.buildPatchSeal(g.gameplay,patch).root;
   before.visible=true;after.visible=true;g.scene.updateMatrixWorld(true);
   const origin=new THREE.Vector3(c.x-Math.sin(yaw)*24,y+2,c.z-Math.cos(yaw)*24),direction=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
   const ray=new THREE.Raycaster(origin,direction,0,48);
   const oldHits=ray.intersectObject(before,true),newHits=ray.intersectObject(after,true);
   const pier=w.structures.find(s=>s.kind==='underpass-pier'&&s.road===c.upper&&Math.hypot(s.x-c.x,s.z-c.z)<40);
   const pierBlocked=pier&&vehicleBlocked(pier.x,pier.z,yaw,w.collision,m.race.playerCar.spec,pier.y);
   let blocked=0;for(let d=-20;d<=20;d+=.5){const x=c.x+Math.sin(yaw)*d,z=c.z+Math.cos(yaw)*d;const py=t.roads.sample(lower.road,x,z)+.05;if(vehicleBlocked(x,z,yaw,w.collision,m.race.playerCar.spec,py))blocked++;}
   after.parent.remove(after);
   // Compare the old opaque fill in precisely the same scene and camera.
   globalThis.__bridgeShot={before,roots:g.scene.children.filter(o=>o.userData.phase4TerrainSeal&&o!==before)};
   for(const root of __bridgeShot.roots)root.visible=false;
   g.camera.position.copy(origin);g.camera.lookAt(origin.clone().addScaledVector(direction,40));g.renderer.render(g.scene,g.camera);
   return {name,x:c.x,z:c.z,y,oldHits:oldHits.length,newHits:newHits.length,pierBlocked,blocked,deck:w.structures.some(s=>s.kind==='deck'&&s.road===c.upper&&Math.hypot(s.x-c.x,s.z-c.z)<25)};
  },name);
  console.log('BRIDGE_RENDER_CHECK',JSON.stringify(result));
  assert(result.oldHits>0,name+': test reproduces old opaque wall');assert.equal(result.newHits,0,name+': no opaque fill across opening');assert(result.pierBlocked&&result.deck,name+': physical pier and upper deck remain');assert.equal(result.blocked,0,name+': actual Fulmine can pass under bridge');
  const slug=name.toLowerCase().replaceAll(' ','-');await page.screenshot({path:`test-artifacts/r27/${slug}-before.png`});
  await page.evaluate(()=>{const g=__r27;__bridgeShot.before.parent.remove(__bridgeShot.before);for(const root of __bridgeShot.roots)root.visible=true;g.scene.updateMatrixWorld(true);g.renderer.render(g.scene,g.camera);});
  await page.screenshot({path:`test-artifacts/r27/${slug}-after.png`});
 }
 assert.deepEqual(errors,[],'no browser runtime exceptions');console.log('PASS R27 browser: all three modes, real bridge apertures, intact pier collisions',JSON.stringify(times));
}catch(e){console.error(e.stack);console.error('JS_ERRORS',JSON.stringify(errors));await page.screenshot({path:'test-artifacts/r27/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();server.kill();}
