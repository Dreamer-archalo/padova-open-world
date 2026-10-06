import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port','4182']);
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,executablePath:process.env.PADOVA_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('test-artifacts/r32',{recursive:true});
try{
 await page.route('**/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
 globalThis.__club={state,keys,cars,movePlayer,simulate,activities,updateUI,updateMissionUI,cancelMission,requestRecover,addCar,poseVehicle,deliverVehicle,get club(){return bikerClub},get world(){return world},get terrain(){return terrain},get scene(){return scene},get gameplay(){return gameplay},get renderer(){return renderer},get camera(){return camera}};
 const __sim=simulate;simulate=function(dt){if(!globalThis.__club.manual)__sim(dt)};
 `});});
 await page.goto('http://127.0.0.1:4182/',{waitUntil:'domcontentloaded'});await page.locator('#initialQuality').selectOption('low');await page.locator('#playBtn').click();await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true',null,{timeout:240000});await page.locator('#confirmCharacter').click({timeout:20000});
 await page.evaluate(()=>{__club.manual=true;__club.state.paused=false;});
 const locked=await page.evaluate(async()=>{const {hangarCatalogue}=await import('./villa-mandria-hangar.js');return hangarCatalogue().filter(c=>c.spec.clubReward).length;});assert.equal(locked,0);
 await page.keyboard.press('j');await page.locator('#bikerClubBtn').click();assert(await page.locator('#clubRide').isDisabled());assert.equal(await page.locator('[data-biker-trial]').count(),3);
 await page.locator('[data-biker-trial="formation"]').click();assert.equal(await page.evaluate(()=>__club.state.mission.phase),'travel','accept on foot does not teleport/start');
 assert(await page.evaluate(()=>Math.hypot(__club.state.x-__club.club.course.start.x,__club.state.z-__club.club.course.start.z)>200));
 const runs=[];
 for(const id of ['formation','wheelie','jumps']){
  await page.evaluate(async id=>{const q=__club,{clubPoint}=await import('./biker-club.js');q.cancelMission(false);for(const c of q.cars)c.mesh.visible=false;const p=clubPoint(q.club.course,0),bike=q.addCar(p.x,p.z,p.yaw,false,true,'naked');Object.assign(q.state,{x:bike.x,z:bike.z,y:bike.y,yaw:bike.yaw,speed:0,health:100,mode:'car',car:bike,wanted:0,spin:0,knockX:0,knockZ:0});q.keys.clear();},id);
  await page.keyboard.press('j');await page.locator('#bikerClubBtn').click();await page.locator(`[data-biker-trial="${id}"]`).click();
  // Real key binding for B remains held during the scored wheelie run.
  if(id==='wheelie')await page.keyboard.down('b');
  console.log('BROWSER TRIAL',id);
  const result=await page.evaluate(async id=>{
   const q=__club,{clubCoordinates}=await import('./biker-club.js'),dt=1/60;let air=0,maxY=q.state.y,minY=q.state.y,ramps=0;
   for(let i=0;i<60*82&&q.club.run;i++){
    q.state.elapsed+=dt;const r=q.club.run;q.keys.delete('KeyW');q.keys.delete('KeyS');
    if(r.mission.phase==='running'){const target=id==='formation'?12:18;if(q.state.speed<target)q.keys.add('KeyW');if(q.state.speed>target+1)q.keys.add('KeyS');}
    q.movePlayer(dt);q.club.update(dt);if(i%12===0)q.updateUI();if(q.state.car.jump?.airborne)air++;maxY=Math.max(maxY,q.state.y);ramps=Math.max(ramps,q.terrain.arcadeRamps.filter(r=>r.bikerClub).length);
    if(i%60===0)await new Promise(r=>setTimeout(r,0));
   }
   q.keys.clear();return {id,completed:q.club.progress.completed.includes(id),air,maxHeight:maxY-minY,ramps,remaining:q.club.crew.length,mission:q.state.mission?.phase||null,health:q.state.health,toast:document.getElementById('toast').textContent};
  },id);if(id==='wheelie')await page.keyboard.up('b');assert(result.completed,JSON.stringify(result));assert.equal(result.remaining,0);if(id==='jumps')assert(result.air>0&&result.ramps===2);runs.push(result);console.log('BROWSER RESULT',JSON.stringify(result));
 }
 const rewards=await page.evaluate(async()=>{const {hangarCatalogue}=await import('./villa-mandria-hangar.js');return hangarCatalogue().filter(c=>c.spec.clubReward).map(c=>c.id);});assert.equal(rewards.length,3);
 await page.keyboard.press('v');for(const id of rewards)assert(await page.locator(`[data-vehicle="${id}"]`).count());await page.locator('#closeMenu').click();
 await page.keyboard.press('j');await page.locator('#bikerClubBtn').click();assert(await page.locator('#clubRide').isEnabled());await page.screenshot({path:'test-artifacts/r32/club-rewards.png'});await page.locator('#closeMenu').click();
 // Verify compact HUD and physical ramp geometry with the mission active.
 await page.evaluate(async()=>{const q=__club,{clubPoint}=await import('./biker-club.js');for(const c of q.cars)c.mesh.visible=false;const p=clubPoint(q.club.course,0),bike=q.addCar(p.x,p.z,p.yaw,false,true,'club_supersport');Object.assign(q.state,{x:bike.x,z:bike.z,y:bike.y,yaw:bike.yaw,speed:0,health:100,car:bike,mode:'car'});q.club.accept('jumps');q.club.update(1/60);for(let i=0;i<10;i++)q.simulate(1/60);q.updateUI();q.world.update(q.state.x,q.state.z,true);});
 assert(await page.locator('.hud.mission').isVisible());assert.equal(await page.locator('#missionType').textContent(),'BANDA DELLE IMPENNATE');
 const geometry=await page.evaluate(async()=>{const q=__club,THREE=await import('./vendor/three.module.js'),{groundContact}=await import('./vehicle-dynamics.js');let samples=0;for(const r of q.club.ramps)for(const v of [-4,0,4]){const x=r.x+Math.sin(r.yaw)*v,z=r.z+Math.cos(r.yaw)*v,ray=new THREE.Raycaster(new THREE.Vector3(x,20,z),new THREE.Vector3(0,-1,0));q.club.root.updateMatrixWorld(true);const hits=ray.intersectObject(q.club.root,true).filter(h=>h.object.name==='club-ramp-surface');if(!hits.length||Math.abs(hits[0].point.y-groundContact(q.terrain,x,z).y)>.002)throw Error('Ramp visual/physics mismatch');samples++;}return samples;});assert.equal(geometry,6);await page.screenshot({path:'test-artifacts/r32/club-mission.png'});
 await page.keyboard.press('r');assert.equal(await page.evaluate(()=>__club.state.mission),null,'R cancels qualification');assert.equal(await page.evaluate(()=>__club.club.crew.length),0);
 // Genuine menu call/dismiss, gated progress survives a browser reload.
 await page.evaluate(async()=>{const q=__club,{clubPoint}=await import('./biker-club.js');for(const c of q.cars)c.mesh.visible=false;const p=clubPoint(q.club.course,0),bike=q.addCar(p.x,p.z,p.yaw,false,true,'club_naked');Object.assign(q.state,{x:bike.x,z:bike.z,y:bike.y,yaw:bike.yaw,speed:0,health:100,mode:'car',car:bike});q.state.waypoint=null;});
 await page.keyboard.press('j');await page.locator('#bikerClubBtn').click();await page.locator('#clubRide').click();assert.equal(await page.evaluate(()=>__club.club.crew.length),3);
 await page.keyboard.press('j');await page.locator('#bikerClubBtn').click();await page.locator('#clubRide').click();assert.equal(await page.evaluate(()=>__club.club.crew.length),0);
 await page.reload({waitUntil:'domcontentloaded'});const persisted=await page.evaluate(async()=>{const {readClubProgress}=await import('./biker-club-progress.js'),{hangarCatalogue}=await import('./villa-mandria-hangar.js');return {progress:readClubProgress(),rewards:hangarCatalogue().filter(c=>c.spec.clubReward).map(c=>c.id)};});assert.equal(persisted.progress.completed.length,3);assert.equal(persisted.rewards.length,3);assert.deepEqual(errors,[]);
 fs.writeFileSync('docs/biker-club-browser-results.json',JSON.stringify({runs,rewards,geometry,persisted,errors},null,2));console.log('PASS BIKER CLUB CHROMIUM',JSON.stringify({runs,rewards,geometry,errors}));
}catch(e){console.error(e.stack);console.error('JS_ERRORS',JSON.stringify(errors));await page.screenshot({path:'test-artifacts/r32/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();server.kill();}
