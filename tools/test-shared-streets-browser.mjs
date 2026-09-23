import fs from 'node:fs';
import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port','4174']);
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const timer=setTimeout(()=>process.exit(2),540000);
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:4174/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!document.getElementById('playBtn')?.disabled,null,{timeout:45000});
 await page.evaluate(async()=>{
  const {ModernGameplay}=await import('./modern-gameplay.js'),old=ModernGameplay.prototype.populate;
  ModernGameplay.prototype.populate=function(...args){globalThis.__streetGame=this;return old.apply(this,args);};
  const {CityWorld}=await import('./world.js'),update=CityWorld.prototype.update;
  CityWorld.prototype.update=function(...args){globalThis.__streetWorld=this;return update.apply(this,args);};
 });
 await page.locator('#initialQuality').selectOption('medium');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true',null,{timeout:240000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click();
 console.log('STARTUP_OK');
 for(const [name,x,z,yaw] of [['santo',145,673,0],['ponte-corvo',545,535,3.55],['milani',403,-522,-.7],['tadi',-653,-48,Math.PI/2],['tram',140,-645,0]]){
  await page.evaluate(async({x,z,yaw})=>{const g=__streetGame,s=g.state,t=g.terrain;
   const r=t.roads.rawCandidates(x,z,25).filter(r=>!/footway|path|steps|tram|cycleway/.test(r.road.k)).sort((a,b)=>a.d-b.d)[0];
   const {nearestOnSegment}=await import('./core.js'),q=r?nearestOnSegment(x,z,r.segment.a,r.segment.b):{x,z};
   x=q.x;z=q.z;Object.assign(s,{mode:'foot',car:null,x,z,y:t.height(x,z),yaw,vy:0,speed:0,wanted:0,paused:true});
   const w=__streetWorld,cx=Math.floor(x/320),cz=Math.floor(z/320);
   // Build only the tested chunk; streaming fills its neighbours. Yield by
   // elapsed time so software WebGL does not stall behind huge generator batches.
   const key=cx+','+cz;
   for(const stage of ['core','detail']){const steps=w.buildStageSteps(key,stage);let done=false;while(!done){const start=performance.now();do{done=steps.next().done;}while(!done&&performance.now()-start<8);if(!done)await new Promise(r=>setTimeout(r,0));}}
  },{x,z,yaw});
  await page.evaluate(()=>{__streetGame.state.paused=false;});
  await page.waitForTimeout(3500);await page.screenshot({path:'test-artifacts/streets-'+name+'.png',timeout:25000});
  const result=await page.evaluate(({x,z})=>{const t=__streetGame.terrain;return {player:{x:__streetGame.state.x,z:__streetGame.state.z,y:__streetGame.state.y},y:t.height(x,z),ground:t.groundHeight(x,z),roads:t.roads.candidates(x,z,12).map(r=>({n:r.road.n,k:r.road.k,y:r.height}))};},{x,z});console.log(name,JSON.stringify(result));
 }
 const driving=await page.evaluate(async()=>{
  const g=__streetGame,t=g.terrain,{groundVehicleStep}=await import('./vehicle-dynamics.js'),{VEHICLES}=await import('./vehicles.js'),THREE=await import('./vendor/three.module.js');
  g.state.paused=true;const results=[];
  for(const name of ['Ponte Corvo','Ponte Antonio Milani','Ponte dei Tadi']){
   const p=[...t.roads.profiles.values()].find(p=>p.road.n===name&&p.road.b&&!/tram|path|footway/.test(p.road.k));
   if(!p)throw new Error('Missing '+name);
   for(const reverse of [false,true]){
    const first=reverse?p.points.at(-1):p.points[0],last=reverse?p.points[0]:p.points.at(-1),dx=last[0]-first[0],dz=last[1]-first[1],length=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);
    const state={x:first[0],z:first[1],y:t.height(...first),yaw,speed:8},car={spec:VEHICLES.mito};let hits=0,launches=0,maxGap=0;
    for(let i=0;i<Math.floor(length/8*60);i++){const result=groundVehicleStep(state,car,{turn:0,handbrake:false},1/60,t,g.collision);hits+=Number(result.hitSpeed>0);launches+=Number(result.launched);maxGap=Math.max(maxGap,Math.abs(state.y-t.height(state.x,state.z,state.y)));}
    results.push({name,reverse,hits,launches,maxGap,travelled:Math.hypot(state.x-first[0],state.z-first[1]),length});
   }
   const x=(p.points[0][0]+p.points.at(-1)[0])/2,z=(p.points[0][1]+p.points.at(-1)[1])/2,y=t.roads.sample(p.road,x,z)+.075;
   const ray=new THREE.Raycaster(new THREE.Vector3(x,y+.4,z),new THREE.Vector3(0,-1,0),0,1);
   g.scene.updateMatrixWorld(true);const meshes=[];for(const root of __streetWorld.loaded.values())root.traverse(o=>{if(o.isMesh&&o.userData.streamRoads)meshes.push(o);});
   const intersection=ray.intersectObjects(meshes,false)[0];results.push({name,renderedGap:intersection?Math.abs(intersection.point.y-y):null});
  }
  return results;
 });
 console.log('STREET_DRIVING '+JSON.stringify(driving));
 for(const r of driving){if('renderedGap' in r){assert(r.renderedGap!==null&&r.renderedGap<.08,'Visible bridge/contact disagreement '+JSON.stringify(r));continue;}assert.equal(r.hits,0,'Bridge blocks car '+JSON.stringify(r));assert.equal(r.launches,0,'Slow bridge crossing launches car');assert(r.travelled>r.length-.4,'Car must cross the bridge');assert(r.maxGap<.15,'Car loses contact with road');}
 assert.deepEqual(errors,[]);
} catch(e){console.error(e);console.error('errors',errors);console.error(await page.evaluate(()=>document.getElementById('initialLoaderStatus')?.textContent).catch(()=>''));process.exitCode=1;}
finally{clearTimeout(timer);await browser.close();server.kill();}
