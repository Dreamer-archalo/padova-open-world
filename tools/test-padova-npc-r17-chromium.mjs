import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts/r17-browser',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));page.on('crash',()=>errors.push('browser crash'));
try{
 await page.goto(process.env.NPC_R17_URL||'http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>document.getElementById('playBtn')&&!document.getElementById('playBtn').disabled,null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js');const populate=ModernGameplay.prototype.populate;ModernGameplay.prototype.populate=function(...args){const out=populate.apply(this,args);globalThis.__npcR17Test=this;return out;};});
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:240000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click({timeout:20000});
 await page.waitForFunction(()=>globalThis.__npcR17Test?.urbanSitesR17?.bars.length===6,null,{timeout:60000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.padovaNpcVersion),'r17');
 const site=await page.evaluate(()=>{const g=globalThis.__npcR17Test,b=g.urbanSitesR17.bars.find(b=>b.id==='signori');Object.assign(g.state,{paused:true,mode:'foot',car:null,x:b.door.x+8,z:b.door.z,y:g.terrain.height(b.door.x+8,b.door.z),wanted:0});const p=g.people.find(p=>!p.dog&&!p.driverPoolR17&&!p.budgetSleeping);g.intelligentNPC.reset(p);Object.assign(p,{x:b.door.x,z:b.door.z,y:g.state.y,speed:0,health:100,at:Infinity});p.mesh.visible=true;g.intelligentNPC.attach(p);g.intelligentNPC.routeAt=-Infinity;const planned=g.intelligentNPC.plan(p,b.door,'approach-bar',b);const reserved=g.intelligentNPC.reserve(p,b);globalThis.__npcR17Ped=p;return {planned,reserved,bars:g.urbanSitesR17.bars.length,benches:g.urbanSitesR17.benches.length};});
 assert(site.planned&&site.reserved);assert(site.benches>=3);
 const states=await page.evaluate(()=>{const g=globalThis.__npcR17Test,p=globalThis.__npcR17Ped,seen=new Set();for(let i=0;i<300;i++){g.state.elapsed+=1/30;g.intelligentNPC.update();g.intelligentNPC.personStep(p,1/30);seen.add(p.aiR17.state);if(p.aiR17.state==='bar-seated')break;}return {seen:[...seen],state:p.aiR17.state,visible:p.mesh.visible,seat:p.aiR17.seat?.owner===p};});
 assert(states.seen.includes('entering-bar'));assert.equal(states.state,'bar-seated');assert(states.visible&&states.seat);
 // Resume real rendering for evidence, then pause and advance a bounded exit.
 await page.evaluate(()=>{globalThis.__npcR17Test.state.paused=false;});
 await page.screenshot({path:'test-artifacts/r17-browser/bar-seated.png',timeout:30000});
 const exit=await page.evaluate(()=>{const g=globalThis.__npcR17Test,p=globalThis.__npcR17Ped,site=p.aiR17.site;g.state.paused=true;g.intelligentNPC.transition(p,'bar-seated',.05);const seen=new Set();for(let i=0;i<360&&site.seats.some(s=>s.owner===p);i++){g.state.elapsed+=1/30;g.intelligentNPC.update();g.intelligentNPC.personStep(p,1/30);seen.add(p.aiR17.state);}return {seen:[...seen],released:site.seats.every(s=>s.owner!==p),distance:Math.hypot(p.x-site.door.x,p.z-site.door.z),visible:p.mesh.visible};});
 assert(exit.seen.includes('leaving-bar'));assert(exit.released&&exit.distance<.8&&exit.visible);
 assert.deepEqual(errors,[]);const report={version:'r17',site,states,exit,errors};fs.writeFileSync('test-artifacts/r17-browser/report.json',JSON.stringify(report,null,2));console.log('PASS actual Chromium R17 startup/visible bar entry/seat/release/door exit',JSON.stringify(report));
}finally{await browser.close();}
