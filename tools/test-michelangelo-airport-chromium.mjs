import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const context=await browser.newContext({viewport:{width:1200,height:760},deviceScaleFactor:1});
await context.addInitScript(()=>{try{localStorage.setItem('padova-game-v1',JSON.stringify({quality:'hyper',money:5000,jobs:0,character:'fede'}));}catch{}});
const page=await context.newPage(),errors=[];let phase='load game';
page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('browser crashed'));
try{
 const r=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(r?.status(),200);
 await page.waitForFunction(()=>{const b=document.getElementById('playBtn');return b&&!b.disabled;},null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js');const populate=ModernGameplay.prototype.populate;ModernGameplay.prototype.populate=function(...args){const out=populate.apply(this,args);globalThis.__michelangeloFullTest=this;return out;};});
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true','Padova OSM scene failed to load');
 await page.locator('#confirmCharacter').click({timeout:20000});
 await page.waitForFunction(()=>document.getElementById('playingUI')?.hidden===false,null,{timeout:20000});
 phase='airport parked Michelangelo';
 const result=await page.evaluate(async()=>{
  const g=globalThis.__michelangeloFullTest,{AIRPORT,areaPoint}=await import('./gameplay-areas.js');
  const p=areaPoint(AIRPORT,105,-475),y=g.terrain.height(p.x,p.z);
  Object.assign(g.state,{mode:'foot',car:null,x:p.x,z:p.z,y,speed:0,vy:0,health:100,wanted:0});
  for(let i=0;i<8;i++)g.update(1/60);
  const c=g.michelangelo;
  return {found:!!c,style:c?.style,airport:!!c&&Math.hypot(c.x-AIRPORT.x,c.z-AIRPORT.z)<1000,visible:c?.mesh.visible,maxKmh:(c?.spec?.max||0)*3.6,
   extras:g.interactiveAirport?.extras?.map(c=>c.style)||[],position:c&&{x:c.x,y:c.y,z:c.z,yaw:c.yaw,width:c.spec.width},
   darsene:g.nautical?.docks?.map(d=>({name:d.name,width:d.width}))||[]};
 });
 console.log('PADOVA_MARINE_AIRPORT '+JSON.stringify(result));
 assert(result.found&&result.airport&&result.visible&&result.style==='airport-michelangelo','Michelangelo not parked at mapped Padova airport');
 assert(Math.abs(result.maxKmh-1000)<.01,'Michelangelo flight maximum wrong');
 assert(result.darsene.length>=2,'Padova river docks failed to initialize');
 phase='board actual airport airplane';
 await page.evaluate(()=>{const g=globalThis.__michelangeloFullTest,c=g.michelangelo,s=g.state,l=c.spec.width/2+1.03,x=c.x+Math.cos(c.yaw)*l,z=c.z-Math.sin(c.yaw)*l,y=g.terrain.height(x,z,c.y);
  Object.assign(s,{x,z,y,mode:'foot',car:null,speed:0,vy:0,health:100,wanted:0,paused:false});});
 await page.keyboard.press('e');
 await page.waitForFunction(()=>{const g=globalThis.__michelangeloFullTest;return g?.state?.mode==='car'&&g.state.car?.style==='airport-michelangelo';},null,{timeout:11000});
 const boarded=await page.evaluate(()=>{const g=globalThis.__michelangeloFullTest;return {mode:g.state.mode,style:g.state.car?.style,ready:!!document.getElementById('michelangeloVeniceTransfer')&&!document.getElementById('michelangeloVeniceTransfer').hidden};});
 assert(boarded.style==='airport-michelangelo','Michelangelo boarding failed');
 console.log('PASS MICHELANGELO_AIRPORT_BOARDING '+JSON.stringify(boarded));
 await page.screenshot({path:'test-artifacts/michelangelo-padova-airport.png',timeout:20000});
 assert.equal(errors.length,0,'Full-world browser errors: '+errors.join(' | '));
 console.log('PASS PADOVA MARINE DARSENE AND MICHELANGELO AIRPORT');
}catch(error){console.error('MICHELANGELO_AIRPORT_FAIL '+phase+' '+(error.stack||error));console.error('MICHELANGELO_AIRPORT_ERRORS '+JSON.stringify(errors));try{await page.screenshot({path:'test-artifacts/michelangelo-airport-fail.png',timeout:15000});}catch{}process.exitCode=1;}finally{await browser.close();}
