import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port','4183']);
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,executablePath:process.env.PADOVA_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],warnings=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('Hangar preview'))warnings.push(m.text());});fs.mkdirSync('test-artifacts/r33',{recursive:true});
let phase='boot';
async function openSection(section){await page.locator('#mandriaHangarButton').click();await page.locator(`#hangarSections [data-section="${section}"]`).click();}
async function thumbnails(section){
 await openSection(section);const cards=page.locator('#hangarGrid [data-hangar-id]:visible'),rows=[];
 for(let i=0;i<await cards.count();i++){
  const card=cards.nth(i),id=await card.getAttribute('data-hangar-id');await card.scrollIntoViewIfNeeded();
  await page.waitForFunction(id=>{const img=document.querySelector(`[data-hangar-id="${id}"] img`);return img?.dataset.previewReady?.startsWith(id+'/')&&img.complete;},id,{timeout:30000});
  const row=await card.evaluate(e=>({id:e.dataset.hangarId,name:e.querySelector('strong').textContent,src:e.querySelector('img').src}));assert(row.src.startsWith('data:image/webp'),id+' must show an actual GPU render');rows.push(row);
 }
 assert.equal(new Set(rows.map(r=>r.src)).size,rows.length,section+' models must have individual images');
 const sheet=await browser.newPage({viewport:{width:900,height:700}});await sheet.setContent(`<style>body{background:#101c29;color:#e8edef;font:14px sans-serif;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:16px}figure{margin:0;background:#172532;border-radius:12px;padding:10px}img{width:100%}figcaption{padding:5px}</style>`+rows.map(r=>`<figure><img src="${r.src}"><figcaption>${r.name}</figcaption></figure>`).join(''));await sheet.screenshot({path:`test-artifacts/r33/${section}-models.png`,fullPage:true});await sheet.close();await page.locator('#hangarClose').click();return rows.map(({src,...r})=>r);
}
try{
 await page.route('**/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
 globalThis.__r33={state,keys,cars,movePlayer,simulate,updateUI,poseVehicle,addCar,dryRoad,requestRecover,toggleVehicle,clearCooldown(){collisionCooldown=0},get world(){return world},get terrain(){return terrain},get gameplay(){return gameplay},get scene(){return scene},get incidents(){return incidents}};
 const __sim=simulate;simulate=function(dt){if(!globalThis.__r33.manual)__sim(dt)};
 `});});
 await page.goto('http://127.0.0.1:4183/',{waitUntil:'domcontentloaded'});await page.locator('#initialQuality').selectOption('low');await page.locator('#playBtn').click();await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true',null,{timeout:240000});await page.locator('#confirmCharacter').click({timeout:20000});await page.waitForFunction(()=>!!__r33.gameplay?.mandriaHangar&&document.getElementById('mandriaHangarButton')?.hidden===false);await page.evaluate(()=>{__r33.manual=true;__r33.state.paused=false;});
 phase='aircraft GPU catalogue';const aircraft=await thumbnails('air');console.log('AIRCRAFT THUMBNAILS',aircraft.length);
 phase='boat GPU catalogue';const boats=await thumbnails('water');assert.equal(boats.length,13);console.log('BOAT THUMBNAILS',boats.length);
 // Launch a formerly truck-shaped aircraft through the genuine hangar card.
 phase='aircraft delivery';await openSection('air');await page.locator('#hangarSearch').fill('airport-airliner');await page.locator('[data-hangar-id="airport-airliner"]').click();await page.waitForFunction(()=>__r33.state.car?.style==='airport-airliner'&&!__r33.gameplay.mandriaHangar.busy);
 const delivered=await page.evaluate(async()=>{const q=__r33,THREE=await import('./vendor/three.module.js'),{hangarPreviewModel}=await import('./villa-mandria-catalog-ui.js'),model=q.state.car.mesh.clone(true);model.position.set(0,0,0);model.rotation.set(0,0,0);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),preview=new THREE.Box3().setFromObject(hangarPreviewModel(q.state.car.style)).getSize(new THREE.Vector3());return {id:q.state.car.style,width:size.x,length:size.z,previewWidth:preview.x,previewLength:preview.z,roof:q.state.car.hangarRoofDeparture,paused:q.state.paused};});assert(delivered.width>25&&delivered.length>25&&delivered.roof&&!delivered.paused);assert(Math.abs(delivered.width-delivered.previewWidth)<.001&&Math.abs(delivered.length-delivered.previewLength)<.001);
 // All faster boats must be selectable and launch on mapped water at a compatible dock.
 phase='fast boat launch';const launches=[];
 for(const id of ['boat-speedster','boat-catamaran','boat-jetski-race']){
  await page.evaluate(()=>{const q=__r33;q.state.car.speed=0;q.state.car.parked=true;Object.assign(q.state,{mode:'foot',car:null,speed:0,freefall:false,parachuting:false});});await openSection('water');await page.locator('#hangarSearch').fill(id);await page.locator(`[data-hangar-id="${id}"]`).click();await page.waitForFunction(id=>__r33.state.car?.style===id,id,{timeout:15000});
  const launch=await page.evaluate(()=>{const q=__r33,s=q.state;return {id:s.car.style,water:q.terrain.waterAt(s.x,s.z,0,s.y),maxKmh:s.car.spec.max*3.6,revision:s.car.mesh.userData.modelRevision,dock:s.car.waterDock};});assert(launch.water!==null&&launch.revision===33);await page.keyboard.down('w');await page.keyboard.down('Shift');const navigation=await page.evaluate(()=>{const q=__r33,x=q.state.x,z=q.state.z;for(let i=0;i<120;i++){q.state.elapsed+=1/60;q.movePlayer(1/60);}return {distance:Math.hypot(q.state.x-x,q.state.z-z),speed:q.state.speed,water:q.terrain.waterAt(q.state.x,q.state.z,0,q.state.y)};});await page.keyboard.up('Shift');await page.keyboard.up('w');assert(navigation.distance>3&&navigation.water!==null,id+' can really drive from its mapped dock '+JSON.stringify(navigation));launches.push({...launch,navigation});
 }
 // Actual controller and damage system on a controlled flat surface. Only the
 // terrain/collider fixture is replaced; driving, car bodies and damage stay real.
 phase='controller impacts';const impacts=await page.evaluate(async()=>{
  const q=__r33,{SpatialIndex}=await import('./core.js'),{resetGroundMotion}=await import('./vehicle-dynamics.js'),{vehicleBlocked}=await import('./movement.js');
  for(const car of q.cars)car.mesh.visible=false;const p=q.dryRoad({x:-2000,z:500},{width:2,length:4.2,height:1.6,wheelbase:2.5}),car=q.addCar(p.x,p.z,0,false,true,'sedan'),origin={x:car.x,z:car.z,y:car.y};
  const saved={height:q.terrain.height,slope:q.terrain.slope,waterAt:q.terrain.waterAt,waterSample:q.terrain.waterSample,collision:q.world.collision};q.terrain.height=()=>origin.y;q.terrain.slope=()=>0;q.terrain.waterAt=()=>null;q.terrain.waterSample=()=>({distance:100});
  const index=new SpatialIndex(20),wall={p:[[origin.x+2,origin.z-100],[origin.x+2.1,origin.z-100],[origin.x+2.1,origin.z+100],[origin.x+2,origin.z+100]],minY:origin.y,h:10};index.add(wall,origin.x+2,origin.z-100,origin.x+2.1,origin.z+100);q.world.collision=index;
  function reset(kind,health=100){resetGroundMotion(car);Object.assign(car,{health,crashDisabled:false});car.contactScuff=null;Object.assign(q.state,{x:origin.x+(kind==='glance'?0:-2),z:origin.z,y:origin.y,yaw:kind==='glance'?.10:Math.PI/2,speed:kind==='glance'?30:35,health,car,mode:'car',freefall:false,parachuting:false,wanted:0,spin:0,knockX:0,knockZ:0});q.state.elapsed+=1;q.clearCooldown();q.keys.clear();}
  function run(frames){for(let i=0;i<frames;i++){q.state.elapsed+=1/60;q.movePlayer(1/60);if(vehicleBlocked(q.state.x,q.state.z,q.state.yaw,index,car.spec,q.state.y))throw Error('Controller penetrated wall');}}
  reset('front');run(10);const front={health:q.state.health,speed:q.state.speed,visible:car.mesh.visible,recovery:!!q.incidents.recovery};
  reset('glance');q.keys.add('KeyW');run(90);q.keys.clear();const glance={health:q.state.health,speed:q.state.speed,distance:q.state.z-origin.z,scuff:!!car.contactScuff,scuffVisible:car.damageVisual.scuff.visible,brokenGlass:car.damageVisual.glass.visible,yaw:q.state.yaw};
  q.world.collision=new SpatialIndex(20);reset('front');Object.assign(q.state,{x:origin.x,z:origin.z-1.8,yaw:0,speed:22});const other=q.addCar(origin.x,origin.z+1.8,Math.PI,false,true,'sedan');Object.assign(other,{speed:22,y:origin.y,health:100});q.state.elapsed+=1/60;q.movePlayer(1/60);const pair={health:q.state.health,otherHealth:other.health,speed:q.state.speed,otherSpeed:other.speed,visible:car.mesh.visible&&other.mesh.visible,recovery:!!q.incidents.recovery};
  // A damage cooldown may suppress damage, but cannot suppress physical contact.
  Object.assign(q.state,{x:origin.x,z:origin.z-1.8,yaw:0,speed:22});Object.assign(other,{x:origin.x,z:origin.z+1.8,yaw:Math.PI,speed:22});q.state.elapsed+=1/60;q.movePlayer(1/60);pair.cooldownPhysical=q.state.speed<0&&other.speed<0&&q.state.health===pair.health;other.mesh.visible=false;q.world.collision=index;
  let health=100,hits=0;while(health>0&&hits<10){reset('front',health);run(10);health=q.state.health;hits++;}const disabled={health,hits,visible:car.mesh.visible,recovery:!!q.incidents.recovery,flag:car.crashDisabled};
  q.toggleVehicle();q.state.elapsed+=1/60;q.movePlayer(1/60);const exit={mode:q.state.mode,health:q.state.health,recovery:!!q.incidents.recovery};
  Object.assign(q.state,{mode:'car',car,x:car.x,z:car.z,y:car.y,yaw:car.yaw,speed:0,health:0});
  Object.assign(q.terrain,{height:saved.height,slope:saved.slope,waterAt:saved.waterAt,waterSample:saved.waterSample});q.world.collision=saved.collision;
  // R must repair the same disabled car and clear cosmetic scrape state.
  const repaired=q.requestRecover();const repair={repaired,health:q.state.health,carHealth:car.health,visible:car.mesh.visible,scuff:!!car.contactScuff};
  return {front,glance,pair,disabled,exit,repair};
 });console.log('CONTROLLER IMPACTS',JSON.stringify(impacts));assert(impacts.front.health>65&&impacts.front.speed<0&&impacts.front.visible&&!impacts.front.recovery);assert(impacts.glance.health>99&&impacts.glance.distance>35&&impacts.glance.speed>25&&impacts.glance.scuff&&impacts.glance.scuffVisible&&!impacts.glance.brokenGlass);assert(impacts.pair.speed<0&&impacts.pair.otherSpeed<0&&impacts.pair.health>30&&impacts.pair.otherHealth>30&&impacts.pair.visible&&!impacts.pair.recovery&&impacts.pair.cooldownPhysical);assert(impacts.disabled.hits>=3&&impacts.disabled.health===0&&impacts.disabled.visible&&impacts.disabled.flag&&!impacts.disabled.recovery);assert(impacts.exit.mode==='foot'&&impacts.exit.health>0&&!impacts.exit.recovery,'driver survives leaving the disabled car');assert(impacts.repair.repaired&&impacts.repair.health===100&&impacts.repair.carHealth===100&&impacts.repair.visible&&!impacts.repair.scuff);
 assert.deepEqual(warnings,[]);assert.deepEqual(errors,[]);fs.writeFileSync('docs/boats-hangar-collisions-browser-results.json',JSON.stringify({aircraft,boats,delivered,launches,impacts,errors,warnings},null,2));console.log('PASS R33 CHROMIUM',JSON.stringify({aircraft:aircraft.length,boats:boats.length,delivered,launches,impacts}));
}catch(e){console.error('R33 BROWSER FAIL',phase,e.stack);console.error('JS_ERRORS',JSON.stringify(errors));console.error('PREVIEW_WARNINGS',JSON.stringify(warnings));await page.screenshot({path:'test-artifacts/r33/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();server.kill();}
