import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Chromium crashed'));
let phase='page load';
try{
 const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(response?.status(),200);
 await page.waitForFunction(()=>{const b=document.getElementById('playBtn');return b&&!b.disabled;},null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js');const original=ModernGameplay.prototype.populate;ModernGameplay.prototype.populate=function(...args){const result=original.apply(this,args);globalThis.__ambientAirportTest=this;return result;};});
 phase='load map';await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true','world failed to load');
 await page.locator('#confirmCharacter').click({timeout:20000});await page.waitForFunction(()=>document.getElementById('playingUI')?.hidden===false,null,{timeout:20000});
 phase='render actual aircraft fleet';const fleet=await page.evaluate(async()=>{
  const g=globalThis.__ambientAirportTest,{AIRPORT,areaPoint}=await import('./gameplay-areas.js');
  const point=areaPoint(AIRPORT,100,320),y=g.terrain.height(point.x,point.z);
  Object.assign(g.state,{mode:'foot',car:null,x:point.x,z:point.z,y,speed:0,health:100,wanted:0});
  g.update(1/60);
  const sim=g.airTraffic,visual=g.airTrafficVisual,gl=document.getElementById('world')?.getContext('webgl2');
  return {gl:gl?.getParameter(gl.VERSION),aircraft:sim?.aircraft?.length,cargo:sim?.aircraft.filter(a=>a.type==='cargo').length,
   cargoAirborne:sim?.aircraft.filter(a=>a.type==='cargo'&&a.phase==='cruise').length,
   visuals:visual?.planes?.size,visible:[...visual?.planes?.values()||[]].filter(m=>m.visible).length,
   guards:visual?.guards?.length,carts:visual?.carts?.length,helicopters:visual?.helis?.length};
 });
 console.log('AIRPORT_TRAFFIC_WEBGL '+JSON.stringify(fleet));
 assert(fleet.gl?.includes('WebGL')&&fleet.aircraft===10&&fleet.cargo===4&&fleet.cargoAirborne===2,'aircraft fleet not loaded in actual browser');
 assert(fleet.visuals>=8&&fleet.visible>=7&&fleet.guards>=5&&fleet.carts===3&&fleet.helicopters===2,'aircraft and airport ground actors not rendered');
 await page.screenshot({path:'test-artifacts/airport-live-traffic.png',timeout:20000});
 phase='actual airborne aircraft collision';const collision=await page.evaluate(async()=>{
  const g=globalThis.__ambientAirportTest,{AIRPORT,areaPoint}=await import('./gameplay-areas.js');
  const plane=g.cars.find(c=>c.fixedSpawn&&c.spec?.plane),target=g.airTraffic.aircraft.find(a=>a.id==='jet-a');
  if(!plane||!target)return {error:'No controllable plane or ambient jet'};
  const pos=areaPoint(AIRPORT,target.u,target.v),altitude=g.terrain.height(pos.x,pos.z);
  Object.assign(plane,{x:pos.x+46,z:pos.z,y:altitude,yaw:AIRPORT.yaw,speed:40,health:100});g.pose(plane);
  Object.assign(g.state,{mode:'car',car:plane,x:plane.x,z:plane.z,y:plane.y,yaw:plane.yaw,speed:40,health:100,wanted:0});
  const before=target.phase;g.update(1/60);
  const separated=target.phase===before;
  Object.assign(plane,{x:pos.x,z:pos.z,y:altitude,speed:40,health:100});g.pose(plane);
  Object.assign(g.state,{x:pos.x,z:pos.z,y:altitude,speed:40,health:100});
  g.update(1/60);
  return {separated,after:target.phase,playerHealth:g.state.health,planeHealth:plane.health,recovery:g.state.mode,collisionTime:target.collisionAt};
 });
 console.log('AIRPORT_TRAFFIC_COLLISION '+JSON.stringify(collision));
 assert(collision.separated&&collision.after==='wrecked'&&collision.planeHealth===0,'aircraft collision / safe separation failed');
 assert.equal(errors.length,0,'browser errors: '+errors.join(' | '));
 console.log('PASS actual WebGL airport fleet, cargo pairs, helicopters, golf carts, soldiers and collision');
}catch(e){console.error('AIRPORT_TRAFFIC_WEBGL_FAIL phase='+phase+' '+(e.stack||e));console.error('AIRPORT_TRAFFIC_WEBGL_ERRORS '+JSON.stringify(errors));try{await page.screenshot({path:'test-artifacts/airport-traffic-failure.png',timeout:12000});}catch{}process.exitCode=1;}finally{await browser.close();}
