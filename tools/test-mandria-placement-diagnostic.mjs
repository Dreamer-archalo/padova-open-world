import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:800}});
try {
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>document.getElementById('playBtn')&&!document.getElementById('playBtn').disabled,null,{timeout:45000});
 await page.evaluate(async()=>{const {ModernGameplay}=await import('./modern-gameplay.js'),original=ModernGameplay.prototype.populate;ModernGameplay.prototype.populate=function(...args){const result=original.apply(this,args);globalThis.__mandriaDiagnostic=this;return result;};});
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 await page.locator('#confirmCharacter').click({timeout:20000});
 await page.waitForFunction(()=>!!globalThis.__mandriaDiagnostic?.villaV3,null,{timeout:45000});
 const report=await page.evaluate(async()=>{
  const g=globalThis.__mandriaDiagnostic,{VILLA,areaPoint}=await import('./gameplay-areas.js');
  function sample(u,v,r=1.5){const p=areaPoint(VILLA,u,v),y=g.terrain.height(p.x,p.z),dry=g.terrain.dry(p.x,p.z,Math.min(2,r),y),hits=[...(g.collision?.near?.(p.x,p.z,r)||[])],blocked=hits.filter(o=>o.solid!==false&&o.kind!=='road');return {u,v,dry,blocked:blocked.length,classes:blocked.slice(0,3).map(o=>[o.kind,o.color,o.source,o.id,o.minX,o.maxX].filter(x=>x!==undefined)),y:+y.toFixed(2)};}
  const candidates={poplars:[],houses:[],horses:[],apes:[]};
  for(const v of [55,45,35,25,15])for(const u of [-22,-18,-15,-12,-9,9,12,15,18,22])candidates.poplars.push(sample(u,v,1.4));
  for(const v of [-84,-76,-68,-60,-52,-44,0,10,20,30])for(const u of [-110,-95,-80,-70,-58,-48,-36,36,48,58,70,80,95,110])candidates.houses.push(sample(u,v,1.5));
  for(const v of [47,39,30,20,10,-2,-14,-25,-38,-48])for(const u of [-110,-94,-80,-70,-60,-50,-40,40,50,60,70,80,94,110])candidates.horses.push(sample(u,v,.6));
  for(const v of [47,39,30,20,10,-2,-14,-25,-38,-48])for(const u of [-110,-94,-80,-70,-60,-50,-40,40,50,60,70,80,94,110])candidates.apes.push(sample(u,v,.8));
  const condensed=Object.fromEntries(Object.entries(candidates).map(([key,values])=>[key,{safe:values.filter(s=>s.dry&&!s.blocked).map(s=>[s.u,s.v]),blocked:values.filter(s=>s.blocked).slice(0,10),wet:values.filter(s=>!s.dry).slice(0,10)}]));
  return {estate:{fence:g.villaV3.fence,poplars:g.villaV3.poplars,houses:g.villaV3.houses,patrols:g.villaV3.patrols.length,farms:g.villaLife.pastures.length,fields:g.villaLife.fields.length},points:condensed};
 });
 console.log('MANDRIA_PLACEMENT_REPORT '+JSON.stringify(report));
} catch(error){console.error('MANDRIA_PLACEMENT_DIAGNOSTIC_FAIL '+(error.stack||error));process.exitCode=1;}
finally{await browser.close();}
