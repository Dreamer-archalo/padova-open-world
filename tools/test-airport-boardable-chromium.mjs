import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Chromium crashed'));
let phase='boot';
try{
 const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(response?.status(),200);
 await page.waitForFunction(()=>{const b=document.getElementById('playBtn');return b&&!b.disabled;},null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js');const original=ModernGameplay.prototype.populate;ModernGameplay.prototype.populate=function(...args){const result=original.apply(this,args);globalThis.__airportBoarding=this;return result;};});
 phase='load world';await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click({timeout:20000});await page.waitForFunction(()=>document.getElementById('playingUI')?.hidden===false,null,{timeout:20000});
 phase='instantiate native airport actors';const actors=await page.evaluate(async()=>{
  const g=globalThis.__airportBoarding,{AIRPORT,areaPoint}=await import('./gameplay-areas.js');
  const p=areaPoint(AIRPORT,100,325),y=g.terrain.height(p.x,p.z);
  Object.assign(g.state,{mode:'foot',car:null,x:p.x,z:p.z,y,speed:0,health:100,vy:0,wanted:0});
  g.update(1/60);
  const ops=g.interactiveAirport,sim=g.airTraffic;
  const summary={planes:ops?.planes?.size,extraStyles:ops?.extras.map(c=>c.style),carts:ops?.carts?.size,staff:ops?.staff?.length,
   parkedCargo:!!ops?.planes?.get('cargo-d'),parkedJet:!!ops?.planes?.get('jet-b'),
   staffedCarts:[...ops?.carts?.values()||[]].filter(c=>!!c.mesh.getObjectByName('airport-cart-driver')).length,
   inAir:sim?.aircraft?.filter(a=>a.phase==='cruise').length};
  return summary;
 });
 console.log('AIRPORT_BOARDABLE_ACTORS '+JSON.stringify(actors));
 assert(actors.planes>=8&&actors.parkedCargo&&actors.parkedJet,'native cargo or jets not registered');
 for(const style of ['airport-interceptor','airport-strike','airport-airliner','airport-trainer'])assert(actors.extraStyles.includes(style),'missing extra aircraft '+style);
 assert(actors.carts>=5&&actors.staffedCarts===actors.carts&&actors.staff>=5,'airport carts lack physical drivers or staff');
 await page.screenshot({path:'test-artifacts/airport-boardable-fleet.png',timeout:20000});
 const targets=[['cargo-d','airport-cargo'],['jet-b','airport-jet'],['airport-interceptor','airport-interceptor'],['airport-strike','airport-strike'],['airport-airliner','airport-airliner'],['airport-trainer','airport-trainer'],['cart:0','airport-golf']];
 for(const [id,style] of targets){
  phase='board '+id;
  const positioned=await page.evaluate(async id=>{
   const g=globalThis.__airportBoarding,ops=g.interactiveAirport;
   const c=id.startsWith('cart:')?ops.carts.get(+id.split(':')[1]):ops.planes.get(id)||ops.extras.find(c=>c.style===id);
   if(!c)return {error:'Missing vehicle '+id};
   const lateral=c.spec.width/2+1.08,y=g.terrain.height(c.x+Math.cos(c.yaw)*lateral,c.z-Math.sin(c.yaw)*lateral,c.y);
   Object.assign(g.state,{mode:'foot',car:null,x:c.x+Math.cos(c.yaw)*lateral,z:c.z-Math.sin(c.yaw)*lateral,y,speed:0,vy:0,health:100,wanted:0});
   c.speed=0;c.parked=true;c.health=100;c.mesh.visible=true;
   return {style:c.style,position:[c.x,c.y,c.z],size:[c.spec.width,c.spec.length],driver:!!c.mesh.getObjectByName('airport-cart-driver')};
  },id);
  assert(!positioned.error&&positioned.style===style,'incorrect boarding fixture '+JSON.stringify(positioned));
  await page.keyboard.press('e');
  await page.waitForFunction(expected=>{const s=globalThis.__airportBoarding?.state;return s?.mode==='car'&&s.car?.style===expected;},style,{timeout:12000});
  const boarded=await page.evaluate(()=>{const s=globalThis.__airportBoarding.state;return {style:s.car.style,name:s.car.name,plane:!!s.car.spec.plane,health:s.health};});
  assert.equal(boarded.style,style);assert(boarded.health>0);
  console.log('AIRPORT_E_BOARD '+JSON.stringify({id,...boarded}));
 }
 phase='real golf cart keyboard drive';const start=await page.evaluate(()=>{const s=globalThis.__airportBoarding.state;return {x:s.x,z:s.z};});
 await page.keyboard.down('w');await page.waitForTimeout(1800);await page.keyboard.up('w');
 const driven=await page.evaluate(()=>{const s=globalThis.__airportBoarding.state;return {x:s.x,z:s.z,mode:s.mode,style:s.car?.style,health:s.health};});
 const metres=Math.hypot(driven.x-start.x,driven.z-start.z);
 console.log('AIRPORT_CART_DRIVE '+JSON.stringify({metres,...driven}));
 assert(driven.style==='airport-golf'&&metres>1&&driven.health>0,'golf cart did not drive under player keyboard input');
 assert.equal(errors.length,0,'browser JS errors '+errors.join(' | '));
 console.log('PASS WebGL E boarding of seven aircraft/cart types, seated drivers and physical golf-cart steering');
}catch(e){console.error('AIRPORT_BOARDING_FAIL phase='+phase+' '+(e.stack||e));console.error('AIRPORT_BOARDING_ERRORS '+JSON.stringify(errors.slice(-15)));try{await page.screenshot({path:'test-artifacts/airport-boarding-failure.png',timeout:15000});}catch{}process.exitCode=1;}finally{await browser.close();}
