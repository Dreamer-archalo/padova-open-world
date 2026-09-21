// Final estate acceptance: test the actual game objects in a WebGL browser.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
let phase='startup';page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('browser crash'));
try{
 const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(response.status(),200);
 await page.waitForFunction(()=>!document.getElementById('playBtn')?.disabled,null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js'),old=ModernGameplay.prototype.populate;
  ModernGameplay.prototype.populate=function(...args){const ret=old.apply(this,args);globalThis.__mandriaV8=this;return ret;};});
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||!document.getElementById('initialLoaderError')?.hidden,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click({timeout:20000});
 phase='estate loading';await page.waitForFunction(()=>{
  const g=globalThis.__mandriaV8;return !!(g?.villaV7Life&&g.villaV3&&g.villaRoof&&g.villaRange?.ready&&g.villaV8Grounds&&g.villaV8PatrolReport);
 },null,{timeout:65000});
 const estate=await page.evaluate(()=>{const g=globalThis.__mandriaV8;
  return {boards:g.villaRange.v8Boards?.length||0,trees:g.villaV8Grounds.trees,sheep:g.villaV8Grounds.sheep,
   helis:g.villaRoof.helicopters.map(c=>c.name),vtol:g.villaRoof.v8Vtol?.plane?.name,
   vtolAirplaneShape:g.villaRoof.v8Vtol?.plane?.mesh?.name,
   patrols:g.villaV8PatrolReport,publicRoads:g.map?.gameplay?.mandriaPublicRoads||g.city?.gameplay?.mandriaPublicRoads||null};
 });console.log('MANDRIA_V8_ESTATE '+JSON.stringify(estate));
 assert.equal(estate.boards,2,'two independent round practice targets must exist');
 assert(estate.trees>=4,'estate boundary needs additional trees');
 assert.equal(estate.helis.length,1,'the roof must contain exactly one helicopter');
 assert(estate.vtol?.includes('VTOL')&&estate.vtolAirplaneShape?.includes('Rondone'),'roof needs a visually recognizable VTOL airplane');
 assert(estate.patrols.horses>=1&&estate.patrols.apes>=1,'mounted guards and Ape Cars must both be routed around the property');
 phase='scope vertical arrows and mouse drag';
 await page.evaluate(()=>{const g=globalThis.__mandriaV8,r=g.villaRange;
  Object.assign(g.state,{x:r.station.x,z:r.station.z,y:g.terrain.height(r.station.x,r.station.z),mode:'foot',car:null,speed:0,vy:0,mission:null});
  r.active=true;r.aiming=true;r.v8Pitch=0;});
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(450);await page.keyboard.up('ArrowUp');
 const up=await page.evaluate(()=>globalThis.__mandriaV8.villaRange.v8Pitch);assert(up>.05,'up arrow must tilt the scope vertically');
 await page.mouse.move(620,440);await page.mouse.down();await page.mouse.move(674,398,{steps:5});await page.mouse.up();
 const moved=await page.evaluate(()=>({pitch:globalThis.__mandriaV8.villaRange.v8Pitch,yaw:globalThis.__mandriaV8.state.yaw}));
 assert(Math.abs(moved.pitch-up)>.01,'dragging the cursor must tilt the scope');
 assert.equal(await page.evaluate(()=>globalThis.__mandriaV8.mandriaScopeFrame?.fov),22,'scope must be genuinely first-person');
 await page.screenshot({path:'test-artifacts/mandria-v8-scope.png',timeout:25000});
 await page.keyboard.press('KeyX');
 phase='worker choices and actionable assignment';
 const workerReady=await page.evaluate(()=>{const g=globalThis.__mandriaV8,p=g.villaLife.people.find(p=>p.role==='worker'&&p.obj?.visible);if(!p)return false;
  Object.assign(g.state,{mode:'foot',car:null,x:p.obj.position.x,z:p.obj.position.z,y:g.terrain.height(p.obj.position.x,p.obj.position.z),speed:0,vy:0});p.v7NextTalkAt=0;return true;});assert(workerReady);
 await page.waitForFunction(()=>!document.getElementById('mandriaWorkerPrompt')?.hidden,null,{timeout:12000});
 await page.locator('#mandriaWorkerPrompt').click();
 assert.equal(await page.locator('#mwChoices button').count(),3,'worker must offer approve, alternative, and refuse');
 await page.locator('#mwChoices button').first().click();
 const assigned=await page.evaluate(()=>globalThis.__mandriaV8.villaLife.people.some(p=>!!p.v8Job));
 console.log('MANDRIA_V8_ASSIGNMENT '+JSON.stringify({assigned}));
 await page.locator('.mw-next').click();
 phase='supplier authorization';
 await page.evaluate(()=>{const g=globalThis.__mandriaV8;g.villaV8Delivery.nextAt=g.state.elapsed-1;});
 await page.waitForFunction(()=>!!globalThis.__mandriaV8.villaV8Delivery?.active,null,{timeout:15000});
 const supplier=await page.evaluate(()=>{const d=globalThis.__mandriaV8.villaV8Delivery.active;return {phase:d.phase,name:d.truck.name};});
 assert(supplier.name.includes('fornitore'),'supplier truck must actually spawn');
 await page.screenshot({path:'test-artifacts/mandria-v8-estate.png',timeout:25000});
 assert.deepEqual(errors,[],'final estate cannot throw uncaught browser errors');
 console.log('PASS Mandria v8: roof VTOL+one heli, targets, trees, perimeter actors, two-axis aim, workers, permission-based supplier');
}catch(error){console.error('MANDRIA_V8_FAIL '+phase+' '+(error.stack||error));console.error('JS_ERRORS '+JSON.stringify(errors.slice(-15)));
 try{await page.screenshot({path:'test-artifacts/mandria-v8-failure.png',timeout:14000});}catch{}
 process.exitCode=1;
}finally{await browser.close();}
