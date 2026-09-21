import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];let phase='boot';
page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Browser crashed'));
try{
 const res=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(res.status(),200);
 await page.waitForFunction(()=>!document.getElementById('playBtn')?.disabled,null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js'),original=ModernGameplay.prototype.populate;
  ModernGameplay.prototype.populate=function(...args){const result=original.apply(this,args);globalThis.__mandriaV5EstateTest=this;return result;};});
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();phase='world';
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click({timeout:20000});phase='estate init';
 await page.waitForFunction(()=>!!globalThis.__mandriaV5EstateTest?.villaV5Estate,null,{timeout:60000});
 const report=await page.evaluate(()=>{const g=globalThis.__mandriaV5EstateTest,e=g.villaV5Estate,r=g.villaRange;
  return {guards:e.guards,routes:e.routes,track:e.track,trees:e.trees,racers:e.racers,roofs:e.roofs,actualApes:g.villaV3.patrols.filter(c=>c.mandriaPatrol==='ape'&&c.mesh?.visible).length,
   actualGuards:g.villaLife.people.filter(p=>p.role==='bodyguard').length,range:r?.ready?{u:r.u,v:r.v}:null,
   apeRoutes:g.villaV3.patrols.filter(c=>c.mandriaPatrol==='ape'&&c.route?.length>1).map(c=>c.route),
   horses:g.villaV3.patrols.filter(c=>c.estateHorse).map(c=>({route:c.route,cowboy:c.v5Cowboy})),
   initialWorldReady:document.documentElement.dataset.initialWorldReady};
 });
 console.log('MANDRIA_V5_ESTATE '+JSON.stringify(report));
 assert(report.guards>=2,'fewer than two additional fitted static guards');
 assert(report.actualGuards>=4,'tenuta lacks suited static security');
 assert(report.routes.rerouted>=1,'no Ape Car assigned meaningful new loop');
 assert(report.routes.apeTotal>=2,'private patrol count was reduced');
 assert(report.trees>=10,'privacy trees failed to grow');
 assert(report.roofs>=2,'house roof panels are still reversed');
 assert(report.track?.horses>=2&&report.track.cowboys>=1,'oval horse track needs mounted and riderless horses');
 assert(report.racers.aligned,'sports cars are not parked side by side with less than half-meter gap');
 if(report.range)for(const route of report.apeRoutes)for(const [u,v] of route){assert(!(Math.abs(u-report.range.u)<10.5&&Math.abs(v-report.range.v)<17.5),'Ape route crosses target-range perimeter');}
 assert.deepEqual(errors,[],'game JavaScript errors');
 await page.screenshot({path:'test-artifacts/mandria-v5-estate-overview.png',timeout:25000});
 console.log('PASS Mandria v5 WebGL estate guards, Ape safe patrols, roofs, aligned racers, horses and perimeter landscaping');
}catch(e){console.error('MANDRIA_V5_ESTATE_FAIL '+phase+' '+(e.stack||e));console.error('JS_ERRORS '+JSON.stringify(errors.slice(-10)));try{await page.screenshot({path:'test-artifacts/mandria-v5-estate-failure.png',timeout:12000});}catch{}process.exitCode=1;}finally{await browser.close();}
