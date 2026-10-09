import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=process.env.ROOF_TEST_PORT||'4192';
const dir='test-artifacts/r42';fs.mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port',port]);await new Promise((ok,bad)=>{server.stdout.once('data',ok);server.once('error',bad);});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],results=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE_ERROR',e.message);});
try{
 await page.route('**/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nglobalThis.__roof42={state,cars,keys,addCar,movePlayer,resetGroundMotion,setPaused,closeDialogs,poseVehicle,updateCamera,updateUI,get workshops(){return workshops},get world(){return world},get regional(){return regionalWorld},get terrain(){return terrain},get scene(){return scene},get renderer(){return renderer},get camera(){return camera}};`});});
 await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded'});await page.locator('#initialQuality').selectOption('low');await page.locator('#playBtn').click();await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true',null,{timeout:240000});console.log('Initial world ready');await page.locator('#confirmCharacter').click({timeout:30000});await page.waitForFunction(()=>globalThis.__roof42?.state.started);
 console.log('Game started');for(const type of ['warehouse','pitched','landmark','regional','workshop']){
  const fixture=await page.evaluate(async type=>{
   const q=__roof42;q.closeDialogs();q.setPaused(true);q.keys.clear();for(const c of q.cars)c.mesh.visible=false;
   if(type==='workshop'){const {WORKSHOP_SITES}=await import('./vehicle-workshops.js?v=dealer-handover-r41-2');Object.assign(q.state,{x:WORKSHOP_SITES[0].x,z:WORKSHOP_SITES[0].z,mode:'foot',car:null});q.workshops.update();}
   const {pointInside}=await import('./core.js'),all=[...q.terrain.roofs.buildings];
   const edgeDistance=(b,x,z)=>Math.min(...b.p.map((a,i)=>{const d=b.p[(i+1)%b.p.length],dx=d[0]-a[0],dz=d[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}));
   const point=b=>{const points=[[b.cx,b.cz],...b.roofTriangles.map(t=>[t.reduce((s,v)=>s+v[0],0)/3,t.reduce((s,v)=>s+v[2],0)/3])].filter(p=>p.every(Number.isFinite)&&pointInside(...p,b.p)&&b.roofAt(...p));points.sort((a,c)=>edgeDistance(b,...c)-edgeDistance(b,...a));return points[0]&&edgeDistance(b,...points[0])>(type==='workshop'?3:5)?points[0]:null;};
   const candidates=all.filter(b=>type==='workshop'?/^Officina .* · tetto$/.test(b.n||''):type==='landmark'?b.n==='Palazzo della Ragione':type==='regional'?b.cx>7400&&b.t==='warehouse':type==='warehouse'?b.cx<7000&&b.t==='warehouse':b.cx<7000&&!b.authoredLandmark&&!b.authoredChurch&&b.roofUpgrade?.length).filter(b=>b.maxX-b.minX>(type==='workshop'?8:20)&&b.maxZ-b.minZ>(type==='workshop'?8:20)).sort((a,b)=>(b.maxX-b.minX)*(b.maxZ-b.minZ)-(a.maxX-a.minX)*(a.maxZ-a.minZ));
   let b,location,chunkKey;
   for(const original of candidates.slice(0,30)){
    chunkKey=Math.floor(original.cx/320)+','+Math.floor(original.cz/320);
    if(type!=='regional'&&type!=='landmark'&&type!=='workshop')q.world.build(chunkKey);
    const parts=[...q.terrain.roofs.buildings].filter(p=>p===original||p.roofOriginal===original);
    for(const part of parts){const sample=point(part);if(sample){b=part;location=sample;break;}}
    if(b)break;
   }
   if(!b)throw Error('Missing clear real roof '+type);
   const [x,z]=location,roof=b.roofAt(x,z);
   const c=q.addCar(x,z,0,false,true,'sedan');q.resetGroundMotion(c);c.mesh.visible=true;c.health=100;
   Object.assign(q.state,{mode:'car',car:c,x,z,y:roof.y+.04,yaw:0,speed:0,health:100});c.y=q.state.y;q.poseVehicle(c);
   if(type==='regional'){const key=Math.floor(x/320)+','+Math.floor(z/320);q.regional.quality='low';q.regional.build(key);}
   const THREE=await import('./vendor/three.module.js');q.scene.updateMatrixWorld(true);
   const ray=new THREE.Raycaster(new THREE.Vector3(x,roof.y+.5,z),new THREE.Vector3(0,-1,0),0,1),roots=type==='regional'?[...q.regional.visible.values()]:type==='workshop'?[...q.workshops.active.values()].map(e=>e.group):type==='landmark'?[q.world.landmarks]:[q.world.loaded.get(chunkKey)];
   const hit=ray.intersectObjects(roots.filter(Boolean),true).find(h=>h.object!==c.mesh&&Math.abs(h.point.y-roof.y)<.1);
   if(!hit)throw Error('Physical roof does not match rendered '+type+' at '+JSON.stringify({x,z,roof}));
   globalThis.__roofStart={x,z,y:roof.y+.04};if(!globalThis.__roofRecorder){globalThis.__roofRecorder=true;window.addEventListener('keydown',e=>{if(e.code==='Digit9')__roofStart.y=__roof42.state.y;},{capture:true});}q.state.paused=false;
   return {name:b.n||b.t,x,z,y:roof.y,meshY:hit.point.y};
  },type);
  console.log('Roof fixture',type,fixture);await page.keyboard.press('9');
  const landed=await page.evaluate(()=>{const q=__roof42;q.setPaused(true);const c=q.state.car;let peak=q.state.y;for(let i=0;i<600&&c.jump?.airborne;i++){q.movePlayer(1/60);peak=Math.max(peak,q.state.y);}return {airborne:c.jump?.airborne,x:q.state.x,z:q.state.z,y:q.state.y,support:q.terrain.height(q.state.x,q.state.z,q.state.y),roof:!!q.terrain.roofs.at(q.state.x,q.state.z,q.state.y),health:q.state.health,peak:peak-__roofStart.y};});
  console.log('Roof landing',type,landed);assert.equal(landed.airborne,false);assert.equal(landed.health,99);assert(landed.roof&&Math.abs(landed.y-landed.support)<.01,'land on the roof at the current position');assert(Math.abs(landed.peak-50)<.01);
  await page.evaluate(()=>{__roof42.state.paused=false;});await page.keyboard.down('w');
  const ride=await page.evaluate(type=>{const q=__roof42;q.state.paused=true;if(!q.keys.has('KeyW'))throw Error('W input not received');const before={...q.state};for(let i=0;i<(type==='workshop'?45:60);i++)q.movePlayer(1/60);q.keys.clear();q.poseVehicle(q.state.car);q.updateUI();for(let i=0;i<120;i++)q.updateCamera(1/60);q.renderer.render(q.scene,q.camera);return {metres:Math.hypot(q.state.x-before.x,q.state.z-before.z),speed:q.state.speed,health:q.state.health,y:q.state.y,meshY:q.state.car.mesh.position.y};},type);await page.keyboard.up('w');
  assert(ride.metres>2&&ride.speed>3,type+' must remain driveable after landing');assert.equal(ride.health,99);assert.equal(ride.y,ride.meshY);
  await page.screenshot({path:dir+'/'+type+'-roof-driving.png'});
  await page.evaluate(()=>{__roof42.state.paused=false;});await page.keyboard.press('Numpad9');assert(await page.evaluate(()=>__roof42.state.car.jump?.airborne),'immediate repeat keyboard jump on '+type);
  results.push({type,fixture,landed,ride});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(dir+'/results.json',JSON.stringify({results,errors},null,2));console.log('PASS R42 real Chromium/WebGL: 9 rooftop landings, W driving, immediate Numpad9 jumps and rendered/support equality on warehouse, pitched, authored landmark, regional and workshop roofs.',results);
}catch(e){console.error(e.stack);console.error('Browser errors:',JSON.stringify(errors));console.error('Loader:',await page.locator('#initialLoaderStatus').textContent().catch(()=>''));process.exitCode=1;await page.screenshot({path:dir+'/failure.png',fullPage:true}).catch(()=>{});}finally{await browser.close();server.kill();}
