import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const base=process.env.PADOVA_ROAD_PREVIEW_URL||'http://127.0.0.1:4173/';
const server=process.env.PADOVA_ROAD_PREVIEW_URL?null:spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port','4173']);
if(server)await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,executablePath:process.env.PADOVA_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
fs.mkdirSync('test-artifacts/r25',{recursive:true});
try{
 // Expose existing module state only inside this intercepted test response.
 // Production game.js never gains a debug or teleport API.
 await page.route('**/game.js*',async route=>{
  const response=await route.fetch();
  await route.fulfill({response,body:await response.text()+`\nglobalThis.__roadQA={state,get terrain(){return terrain},get world(){return world},get scene(){return scene},get camera(){return camera},get renderer(){return renderer}};`});
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!document.getElementById('playBtn')?.disabled,null,{timeout:90000});
 await page.locator('#initialQuality').selectOption('low');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true',null,{timeout:240000});
 await page.locator('#confirmCharacter').click({timeout:20000});
 console.log('R25_BROWSER_STARTUP_OK');
 await page.addStyleTag({content:'body > :not(#world) {visibility:hidden !important;}'});
 for(const [name,x,z,yaw,lift] of [
  ['darwin',4220,-1290,.65,32],['serenissima-irlanda',3705,-2240,1.2,45],
  ['bassette',3775,-2567,1.6,27],['santo-entry',3998,-3575,2.85,30],
  ['santo-ground',3533,-5569,3.2,32]]){
  const result=await page.evaluate(async({x,z,yaw,lift})=>{
   const g=__roadQA,t=g.terrain,w=g.world,THREE=await import('./vendor/three.module.js');
   Object.assign(g.state,{x,z,y:t.height(x,z),mode:'foot',car:null,speed:0,vy:0,wanted:0,paused:true});
   const cx=Math.floor(x/320),cz=Math.floor(z/320);
   for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
    const key=(cx+dx)+','+(cz+dz);
    for(const stage of ['core','detail']){
     const steps=w.buildStageSteps(key,stage);let done=false;
     while(!done){const start=performance.now();do{done=steps.next().done;}while(!done&&performance.now()-start<8);if(!done)await new Promise(r=>setTimeout(r,0));}
    }
   }
   const y=t.roads.candidates(x,z,8).filter(r=>!/footway|track|path|cycleway/.test(r.road.k)).sort((a,b)=>a.d-b.d)[0]?.height??t.height(x,z);
   g.camera.position.set(x-Math.sin(yaw)*lift*1.5,y+lift,z-Math.cos(yaw)*lift*1.5);g.camera.lookAt(x,y,z);
   g.scene.updateMatrixWorld(true);g.renderer.render(g.scene,g.camera);
   const rays=[];let checked=0;
   const meshes=[];for(const root of w.loaded.values())root.traverse(o=>{if(o.isMesh&&o.userData.streamRoads)meshes.push(o);});
   for(const p of t.roads.profiles.values())if(['Corso Irlanda','Cavalcavia Charles Darwin','Via Bassette','Nuova Strada del Santo','Autostrada Serenissima'].includes(p.road.n))for(const q of p.points){
    if(Math.hypot(q[0]-x,q[1]-z)>45)continue;
    const y=t.roads.sample(p.road,...q)+.075;
    const ray=new THREE.Raycaster(new THREE.Vector3(q[0],y+.025,q[1]),new THREE.Vector3(0,-1,0),0,.2),hit=ray.intersectObjects(meshes,false)[0];
    if(!hit||Math.abs(hit.point.y-y)>.09)rays.push({road:p.road.n,p:q,y,hit:hit?.point.y});checked++;
   }
   return {checked,rays,context:g.renderer.getContext().getParameter(g.renderer.getContext().VERSION)};
  },{x,z,yaw,lift});
  assert(result.checked>5,`${name}: road meshes tested`);assert.equal(result.rays.length,0,`${name}: rendered asphalt and driving surface disagree: ${JSON.stringify(result.rays.slice(0,3))}`);
  await page.screenshot({path:`test-artifacts/r25/${name}.png`,timeout:30000});console.log(name,JSON.stringify(result));
 }
 assert.deepEqual(errors,[],'no browser runtime exceptions');
}finally{await browser.close();server?.kill();}
