import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('test-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--js-flags=--max-old-space-size=3072']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
const errors=[];let stage='boot';
page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('Chromium crashed'));
async function enterLand(){
 await page.locator('#hangarSections [data-section="land"]').click();
 await page.locator('#hangarSearch').waitFor({state:'visible'});
}
try{
 const response=await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.getElementById('playBtn')&&!document.getElementById('playBtn').disabled,null,{timeout:45000});
 await page.evaluate(async()=>{
  const {ModernGameplay}=await import('./modern-gameplay.js'),before=ModernGameplay.prototype.populate;
  ModernGameplay.prototype.populate=function(...args){const result=before.apply(this,args);globalThis.__militaryTest=this;return result;};
 });
 await page.locator('#initialQuality').selectOption('hyper');
 await page.locator('#playBtn').click();stage='world startup';
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true'||document.getElementById('initialLoaderError')?.hidden===false,null,{timeout:220000});
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.initialWorldReady),'true');
 await page.locator('#confirmCharacter').click({timeout:20000});
 await page.waitForFunction(()=>globalThis.__militaryTest?.mandriaHangar&&!!document.getElementById('mandriaHangarButton')&&!document.getElementById('mandriaHangarButton').hidden,null,{timeout:45000});
 stage='parked vehicles';
 const airport=await page.evaluate(async()=>{
  const g=globalThis.__militaryTest,{MILITARY_FLEET,MILITARY_PARKING}=await import('./airport-military-fleet.js');
  const {AIRPORT,areaLocal}=await import('./gameplay-areas.js');
  const {vehicleBlocked}=await import('./movement.js');
  return {total:g.militaryFleetParking?.length||0,ids:g.militaryFleetParking?.map(c=>c.style),
   catalogued:Object.keys(MILITARY_FLEET).every(id=>g.cars.some(c=>c.style===id)),
   models:g.militaryFleetParking?.map(c=>({id:c.style,meshes:c.mesh.children.filter(v=>v.isMesh).length,
     tank:!!c.spec.tracked,turret:!!c.mesh.userData.turret,parked:c.parked,
     inAirport:Math.hypot(c.x-AIRPORT.x,c.z-AIRPORT.z)<600,
     clear:!vehicleBlocked(c.x,c.z,c.yaw,g.collision,c.spec,c.y),
     original:!!c.fixedSpawn,area:areaLocal(AIRPORT,c.x,c.z)})),slots:MILITARY_PARKING.length,
     regularTanks:g.cars.filter(c=>c.style==='tank'&&c.fixedSpawn).length};
 });
 console.log('MILITARY_AIRPORT '+JSON.stringify(airport));
 assert.equal(airport.total,7,'all seven new units must spawn at military airport');
 assert.equal(new Set(airport.ids).size,7,'all models must be different');
 assert(airport.catalogued&&airport.models.every(m=>m.meshes>0&&m.tank===m.turret&&m.parked&&m.inAirport&&m.clear&&m.original),'real airport model, collision or spawn failure');
 assert(airport.regularTanks>=3,'keep original three tanks');
 stage='catalogue';await page.locator('#mandriaHangarButton').click();
 await enterLand();
 await page.locator('#hangarSearch').fill('militare');
 const catalogue=await page.evaluate(()=>[...document.querySelectorAll('#hangarGrid [data-hangar-id]')].filter(b=>!b.hidden).map(b=>b.dataset.hangarId));
 console.log('MILITARY_CATALOGUE '+JSON.stringify(catalogue));
 assert.equal(catalogue.filter(id=>id.startsWith('mil-')).length,7,'seven user-selectable entries with names and illustrations');
 await page.screenshot({path:'test-artifacts/military-catalogue.png',timeout:25000});
 stage='unowned military catalogue refuses duplication';
 await page.locator('#hangarPaint').fill('#778855');
 const before=await page.evaluate(()=>globalThis.__militaryTest.cars.filter(c=>c.style==='mil-tank-heavy').length);
 await page.locator('[data-hangar-id="mil-tank-heavy"]').click();
 await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>globalThis.__militaryTest.cars.filter(c=>c.style==='mil-tank-heavy').length),before,'unowned military model must not be recreated by the catalogue');
 assert.equal(await page.locator('#mandriaHangarDialog').evaluate(d=>d.open),true,'unowned selection keeps acquisition notice accessible');
 await page.locator('#hangarClose').click();
 stage='board actual airport heavy tank';
 await page.evaluate(()=>{const g=__militaryTest,c=g.militaryFleetParking.find(c=>c.style==='mil-tank-heavy');globalThis.__parkedHeavy=c;globalThis.__villaState={x:g.state.x,y:g.state.y,z:g.state.z,yaw:g.state.yaw};Object.assign(g.state,{x:c.x+Math.cos(c.yaw)*(c.spec.width/2+.6),z:c.z-Math.sin(c.yaw)*(c.spec.width/2+.6),y:c.y,yaw:c.yaw,mode:'foot',car:null,speed:0,paused:false});});
 await page.keyboard.press('e');
 await page.waitForFunction(()=>__militaryTest.state.car===__parkedHeavy,null,{timeout:10000});
 const origin=await page.evaluate(()=>({x:__militaryTest.state.x,z:__militaryTest.state.z}));await page.keyboard.down('w');await page.waitForTimeout(1200);await page.keyboard.up('w');
 const heavy=await page.evaluate(()=>{const g=__militaryTest,c=g.state.car;return {style:c.style,turret:!!c.mesh.userData.turret,tracked:c.spec.tracked,inScene:g.scene.children.includes(c.mesh),meshCount:c.mesh.children.filter(m=>m.isMesh).length,units:g.militaryFleetParking.length,x:g.state.x,z:g.state.z};});
 console.log('MILITARY_HEAVY '+JSON.stringify(heavy));assert(heavy.turret&&heavy.tracked&&heavy.inScene&&heavy.meshCount>=2&&heavy.units===7);assert(Math.hypot(heavy.x-origin.x,heavy.z-origin.z)>.4,'actual airport tank must drive');
 await page.screenshot({path:'test-artifacts/military-heavy-tank.png',timeout:25000});
 stage='stored military truck preview preserves damage and physical inventory';
 await page.evaluate(()=>{const g=__militaryTest,c=g.state.car;c.parked=true;c.speed=0;Object.assign(g.state,{...__villaState,mode:'foot',car:null,speed:0,health:100,paused:false});
  // A persisted owned truck is the entry condition for catalogue staging.
  g.vehicleGarage.records.set('military-carrier-fixture',{token:'military-carrier-fixture',style:'mil-truck-carrier',health:73,build:null,everStored:true,status:'stored',source:'street'});g.vehicleGarage.persist();});
 await page.waitForTimeout(500);await page.locator('#mandriaHangarButton').click();await enterLand();await page.locator('#hangarSearch').fill('militare');await page.locator('[data-hangar-id="mil-truck-carrier"]').click();
 await page.waitForFunction(()=>__militaryTest.mandriaHangar.staged?.style==='mil-truck-carrier'&&!__militaryTest.mandriaHangar.busy,null,{timeout:30000});
 const swap=await page.evaluate(()=>{const g=__militaryTest,c=g.mandriaHangar.staged;return {truck:c.style,health:c.health,truckModel:c.mesh.name,staging:g.cars.filter(v=>v.hangarInventory).length,allParked:g.militaryFleetParking.filter(v=>g.cars.includes(v)).length,token:c.garageToken};});
 console.log('MILITARY_STORED '+JSON.stringify(swap));assert(swap.staging===1&&swap.allParked===7&&swap.truckModel.includes('Trasporto'));assert.equal(swap.health,73);assert.equal(swap.token,'military-carrier-fixture');
 await page.screenshot({path:'test-artifacts/military-truck.png',timeout:25000});
 assert.equal(errors.length,0,'JS errors: '+errors.join(' | '));
 console.log('PASS military fleet WebGL: seven original-airport new spawns, seven catalogue cards, driveable actual heavy tank, unowned duplication blocked and damaged owned truck staging');
}catch(e){console.error('MILITARY_WEBGL_FAIL '+stage+' '+(e.stack||e));console.error('JS_ERRORS '+JSON.stringify(errors.slice(-15)));try{await page.screenshot({path:'test-artifacts/military-error.png',timeout:15000});}catch{}process.exitCode=1;}
finally{await browser.close();}
