import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port','4181']);
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,executablePath:process.env.PADOVA_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
fs.mkdirSync('test-artifacts/r31',{recursive:true});
try{
 await page.route('**/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
 globalThis.__r31={state,keys,cars,people,movePlayer,updateTraffic,updatePeople,placePerson,placeTraffic,placeParkedCar,poseVehicle,addCar,dryRoad,exitAircraft,ejectParachute,get scene(){return scene},get renderer(){return renderer},get camera(){return camera},get terrain(){return terrain},get graph(){return graph},get world(){return world},get gameplay(){return gameplay},get chute(){return parachute},get player(){return player}};
 const __sim=simulate;simulate=function(dt){if(!globalThis.__r31.manual)__sim(dt)};
 `});});
 await page.goto('http://127.0.0.1:4181/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!document.getElementById('playBtn')?.disabled,null,{timeout:90000});
 // Capture listeners must also tolerate E before gameplay has initialized.
 await page.keyboard.press('e');
 await page.locator('#initialQuality').selectOption('low');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true',null,{timeout:240000});
 await page.locator('#confirmCharacter').click({timeout:20000});await page.evaluate(()=>{__r31.manual=true;__r31.state.paused=false;});
 const populations=await page.evaluate(async()=>{
  const q=__r31,{safePedestrianSpot}=await import('./npc-spawn-policy.js'),out=[];
  for(const [name,x,z] of [['villa',q.state.x,q.state.z],['center',0,100]]){
   Object.assign(q.state,{x,z,y:q.terrain.height(x,z),mode:'foot',car:null,speed:0});
   for(const p of q.people){p.mesh.visible=false;p.retryAt=0;p.cityTask=null;p.driverCar=null;}
   for(let i=0;i<600;i++){q.state.elapsed+=.1;q.updatePeople(.1);if(i%100===0)await new Promise(r=>setTimeout(r,0));}
   const visible=q.people.filter(p=>p.mesh.visible&&!p.driverPool);if(!visible.every(p=>safePedestrianSpot({terrain:q.terrain,graph:q.graph,collision:q.world.collision},p)))throw Error('Unsafe pedestrian');
   out.push({name,count:visible.length});
  }
  return out;
 });assert(populations[1].count>populations[0].count*2);
 // Visual proof of all six added silhouettes, including the real truck ramp.
 const models=await page.evaluate(async()=>{
  const THREE=await import('./vendor/three.module.js'),{createSpecialVehicle}=await import('./special-vehicles.js'),scene=new THREE.Scene();scene.background=new THREE.Color('#9aa9ae');scene.add(new THREE.HemisphereLight('#ffffff','#4b5550',3));
  const styles=['cisterna','camionrampa','supersport','naked','enduro','touring'];
  styles.forEach((style,i)=>{const mesh=createSpecialVehicle(style);mesh.position.set((i%3-1)*11,0,Math.floor(i/3)*10);mesh.rotation.y=-.35;scene.add(mesh);});
  const camera=new THREE.PerspectiveCamera(45,1280/800,.1,200);camera.position.set(23,28,35);camera.lookAt(0,1,5);__r31.modelScene=scene;__r31.modelCamera=camera;const originalRender=__r31.renderer.render.bind(__r31.renderer);__r31.renderer.render=(s,c)=>originalRender(__r31.modelScene||s,__r31.modelCamera||c);__r31.renderer.render(scene,camera);
  const rampModel=createSpecialVehicle('camionrampa');rampModel.updateMatrixWorld(true);
  for(const z of [-3.2,-1,1.2]){const ray=new THREE.Raycaster(new THREE.Vector3(0,6,z),new THREE.Vector3(0,-1,0)),hits=ray.intersectObject(rampModel,true),expected=.12+(z+3.6)/5.2*2.93;if(!hits.some(h=>Math.abs(h.point.y-expected)<.02)||hits[0].point.y>expected+.03)throw Error('Rendered truck ramp disagrees with physical surface at '+z);}
  return styles.map(style=>({style,meshes:createSpecialVehicle(style).children.filter(c=>c.isMesh).length}));
 });await page.screenshot({path:'test-artifacts/r31/new-vehicles.png'});
 await page.evaluate(()=>{
  const q=__r31;q.modelScene=null;q.modelCamera=null;const spot=q.dryRoad({x:-2000,z:500},{width:1,length:2.2,height:1.3,wheelbase:1.48});
  const c=q.addCar(spot.x,spot.z,spot.yaw,false,true,'naked');Object.assign(q.state,{x:c.x,z:c.z,y:c.y,yaw:c.yaw,car:c,mode:'car',speed:15,health:100,freefall:false,parachuting:false});q.keys.clear();
 });
 await page.keyboard.down('b');const wheelie=await page.evaluate(()=>{const q=__r31;for(let i=0;i<60;i++){q.state.elapsed+=1/60;q.movePlayer(1/60);}return {angle:q.state.car.wheelie,pitch:q.state.car.mesh.rotation.x,speed:q.state.speed,health:q.state.health,keys:[...q.keys],paused:q.state.paused,airborne:q.state.car.jump?.airborne};});await page.keyboard.up('b');console.log('WHEELIE',JSON.stringify(wheelie));assert(wheelie.angle>.3&&wheelie.pitch<-.15);
 const lowered=await page.evaluate(()=>{const q=__r31;for(let i=0;i<90;i++){q.state.elapsed+=1/60;q.movePlayer(1/60);}return q.state.car.wheelie;});assert.equal(lowered,0,'releasing B lowers the front wheel');
 await page.evaluate(()=>{
  const q=__r31,c=q.addCar(-2200,500,0,false,true,'rondone');Object.assign(c,{y:q.terrain.height(c.x,c.z)+100,speed:35});
  Object.assign(q.state,{x:c.x,z:c.z,y:c.y,yaw:0,speed:35,health:82,mode:'car',car:c,parachuting:false,freefall:false});q.poseVehicle(c);q.keys.clear();
 });
 await page.keyboard.press('e');let fall=await page.evaluate(()=>{const q=__r31;for(let i=0;i<30;i++){q.state.elapsed+=1/60;q.movePlayer(1/60);}return {freefall:q.state.freefall,chute:q.state.parachuting,visible:q.chute.visible,y:q.state.y};});assert(fall.freefall&&!fall.chute&&!fall.visible);
 await page.keyboard.press('f');assert.equal(await page.evaluate(()=>__r31.state.parachuting),false,'F cannot open chute');
 await page.keyboard.press('0');assert(await page.evaluate(()=>__r31.state.parachuting&&__r31.chute.visible&&!__r31.state.freefall));
 await page.evaluate(()=>{__r31.state.parachuting=false;__r31.state.freefall=true;__r31.chute.visible=false;});
 await page.keyboard.press('Numpad0');assert(await page.evaluate(()=>__r31.state.parachuting&&__r31.chute.visible&&!__r31.state.freefall),'numeric keypad also deploys chute');
 await page.evaluate(()=>{const q=__r31;for(let i=0;i<30;i++){q.state.elapsed+=1/60;q.movePlayer(1/60);}q.renderer.render(q.scene,q.camera);});
 await page.screenshot({path:'test-artifacts/r31/parachute.png'});
 const fuel=await page.evaluate(()=>{
  const q=__r31,p=q.dryRoad({x:-2000,z:400},{width:2,length:4,height:1.6,wheelbase:2.5});
  for(const c of q.cars)c.mesh.visible=false;
  const truck=q.addCar(p.x,p.z,p.yaw,false,true,'cisterna'),car=q.addCar(p.x-Math.sin(p.yaw)*4,p.z-Math.cos(p.yaw)*4,p.yaw,false,true,'sedan');
  Object.assign(q.state,{x:car.x,z:car.z,y:car.y,yaw:car.yaw,speed:8,car,mode:'car',health:100,freefall:false,parachuting:false});q.keys.clear();
  for(let i=0;i<60&&!truck.fuelExploded;i++){q.state.elapsed+=1/60;q.movePlayer(1/60);}
  return {exploded:!!truck.fuelExploded,visible:truck.mesh.visible,health:q.state.health};
 });assert(fuel.exploded&&!fuel.visible,'real player impact explodes tanker');
 assert.deepEqual(errors,[]);fs.writeFileSync('test-artifacts/r31/browser.json',JSON.stringify({populations,models,wheelie,fall,fuel,errors},null,2));console.log('PASS R31 CHROMIUM',JSON.stringify({populations,models,wheelie,fall,fuel}));
}catch(error){console.error(error.stack);console.error('JS_ERRORS',JSON.stringify(errors));await page.screenshot({path:'test-artifacts/r31/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();server.kill();}
