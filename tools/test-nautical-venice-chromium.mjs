import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const context=await browser.newContext({viewport:{width:1200,height:760},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];let phase='start';
page.on('pageerror',e=>errors.push(e.message));
page.on('crash',()=>errors.push('browser page crashed'));
try{
 phase='Venice OSM scene';
 const v=await page.goto('http://127.0.0.1:4173/venice.html',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(v?.status(),200);
 await page.waitForFunction(()=>globalThis.__veniceWorld?.boats?.docks?.length>=3,null,{timeout:140000});
 const stats=await page.evaluate(()=>{
  const w=globalThis.__veniceWorld,d=w.boats.docks.find(d=>d.width>=8.5);
  if(!d)return {error:'no compatible Venice dock',docks:w.boats.docks};
  return {docks:w.boats.docks.map(x=>({name:x.name,width:x.width})),traffic:w.boats.traffic.length,launch:w.boats.launch('boat-electric',d.id,'#dbc49d'),id:d.id};
 });
 assert.equal(stats.launch,true,'Unable to launch Venice canal boat: '+JSON.stringify(stats));
 assert(stats.traffic>=2,'Venice must include moving canal NPCs');
 const start=await page.evaluate(()=>{const s=globalThis.__veniceWorld.boats.current;return {x:s.x,z:s.z};});
 await page.keyboard.down('w');await page.waitForTimeout(1200);await page.keyboard.up('w');await page.waitForTimeout(250);
 const end=await page.evaluate(()=>{const s=globalThis.__veniceWorld.boats.current;return {x:s.x,z:s.z,speed:s.speed};});
 assert(end.speed>0,'Venice boat did not respond to throttle');
 assert(Math.hypot(end.x-start.x,end.z-start.z)>.3,'Venice boat did not move along water');
 console.log('PASS VENICE_BOATS '+JSON.stringify({docks:stats.docks,traffic:stats.traffic,start,end}));
 await page.screenshot({path:'test-artifacts/venice-navigable-boats.png',timeout:15000});
 phase='Michelangelo streamed flight';
 const flight=await page.goto('http://127.0.0.1:4173/continuous-world.html?vehicle=michelangelo&spawn=padova&x=0&z=0&y=140&yaw=1.5708&speed=75',{waitUntil:'domcontentloaded',timeout:50000});assert.equal(flight?.status(),200);
 await page.waitForFunction(()=>globalThis.__continuousWorld?.state?.vehicle==='michelangelo',null,{timeout:125000});
 const before=await page.evaluate(()=>({...globalThis.__continuousWorld.state}));
 await page.keyboard.down('Tab');await page.waitForTimeout(1700);await page.keyboard.up('Tab');await page.waitForTimeout(100);
 const after=await page.evaluate(()=>({...globalThis.__continuousWorld.state}));
 assert(after.speed>before.speed+5,'Michelangelo Tab thrust failed');
 assert(after.speed<=1000/3.6+.01,'Michelangelo exceeded 1000 km/h');
 assert(after.x>before.x+2,'Michelangelo did not cross streamed map');
 await page.evaluate(()=>{const g=globalThis.__continuousWorld,v=g.venicePoint();Object.assign(g.state,{x:v.x-200,z:v.z,y:140,yaw:Math.PI/2});});
 await page.waitForFunction(()=>document.getElementById('enterVenice')?.hidden===false,null,{timeout:12000});
 console.log('PASS MICHELANGELO '+JSON.stringify({before:{x:before.x,y:before.y,speed:before.speed},after:{x:after.x,y:after.y,speed:after.speed},destinationVisible:true}));
 await page.screenshot({path:'test-artifacts/michelangelo-continuous-world.png',timeout:15000});
 assert.equal(errors.length,0,'Browser errors: '+errors.join(' | '));
 console.log('PASS MARINE_BROWSERS first drivable Venice fleet plus connected Michelangelo flight');
}catch(err){
 console.error('MARINE_BROWSER_FAIL '+phase+' '+(err.stack||err));
 console.error('MARINE_BROWSER_ERRORS '+JSON.stringify(errors));
 try{await page.screenshot({path:'test-artifacts/marine-failure.png',timeout:12000});}catch{}
 process.exitCode=1;
}finally{await browser.close();}
