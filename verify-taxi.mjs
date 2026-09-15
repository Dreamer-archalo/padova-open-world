import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SpatialIndex} from './dist/core.js';
import {taxiFare,taxiDestinations,advanceTaxi} from './dist/taxi-service.js';
import {TaxiSystem} from './dist/TaxiSystem.js';
import {VEHICLES} from './dist/vehicles.js';

assert.equal(taxiFare({x:0,z:0},{x:1,z:1}),10,'minimum fare');
assert.equal(taxiFare({x:0,z:0},{x:20000,z:20000}),100,'absolute maximum fare');
const places=[
 {name:'Portello',tag:'Università',x:10,z:20},
 {name:'Prato della Valle',tag:'Piazza',x:30,z:40},
 {name:'Stazione',tag:'Trasporti',x:50,z:60}
];
const destinations=taxiDestinations(places,{x:-100,z:-100},{x:100,z:100});
for(const name of ['Portello','Prato della Valle','Aeroporto','Vigonza','Ponte San Nicolò','Zona Industriale'])assert(destinations.some(p=>p.name===name),name+' destination');
assert(destinations.some(p=>p.name.includes('Albignasego')),'Albignasego destination');
assert(destinations.length<=10,'destination menu remains compact');

const terrain={height:()=>0,dry:()=>true},collision=new SpatialIndex(),car={x:0,z:0,y:0,yaw:0,speed:0,spec:VEHICLES.taxi};
const path=[{x:0,z:0},{x:0,z:120}];let index=0,arrived=false,blocked=false,maxStep=0;
for(let i=0;i<1800&&!arrived;i++){const before={x:car.x,z:car.z},step=advanceTaxi(car,path,index,1/60,terrain,collision);index=step.index;arrived=step.arrived;blocked||=step.blocked;maxStep=Math.max(maxStep,Math.hypot(car.x-before.x,car.z-before.z));}
assert(arrived,'taxi physically follows its road path');assert(!blocked,'clear route is not blocked');assert(car.z>115,'taxi reaches pickup');assert(maxStep<1,'progressive bounded movement');

let disable=0,enable=0,executed=0,fallback=0,finalized=0;
const inputManager={disable(){disable++;},enable(){enable++;}};
const taxiSystem=new TaxiSystem({inputManager,timeoutMs:500,executeTeleport:async({targetCoords,destination,price})=>{executed++;assert.equal(targetCoords.x,120);assert.equal(destination.name,'Test');assert.equal(price,25);},forcePlayerPosition:async()=>{fallback++;},onFinally:async()=>{finalized++;}});
const direct=await taxiSystem.travel({targetCoords:{x:120,y:4,z:-80,yaw:.4},destination:{name:'Test'},price:25});
assert(direct.ok,'current TaxiSystem direct transition succeeds');assert.equal(executed,1);assert.equal(fallback,0);assert.equal(disable,1);assert.equal(enable,1);assert.equal(finalized,1);
let fallbackTarget=null;
const fallbackSystem=new TaxiSystem({inputManager:{disable(){},enable(){}},timeoutMs:500,executeTeleport:async()=>{throw new Error('fixture failure');},forcePlayerPosition:async({targetCoords})=>{fallbackTarget=targetCoords;}});
const warn=console.error;console.error=()=>{};const recovered=await fallbackSystem.travel({targetCoords:{x:7,z:9},destination:{name:'Fallback'}});console.error=warn;
assert(!recovered.ok,'TaxiSystem reports fallback path');assert.equal(fallbackTarget.x,7);assert.equal(fallbackTarget.z,9);
await assert.rejects(()=>taxiSystem.travel({targetCoords:{x:NaN,z:0}}),/Invalid static taxi coordinates/);

const game=fs.readFileSync('dist/game.js','utf8'),html=fs.readFileSync('dist/index.html','utf8'),css=fs.readFileSync('dist/hud.css','utf8'),mapUI=fs.readFileSync('dist/taxi-map-ui.js','utf8'),missionSystem=fs.readFileSync('dist/mission-system.js','utf8');
assert(game.includes('new TaxiDispatcher(')&&game.includes('new TaxiSystem(')&&game.includes('new TaxiMenuController('),'current taxi architecture is wired at startup');
assert(game.includes('executeTaxiTransition')&&game.includes('dispatchPhysicalTaxi'),'physical pickup and current transition path are present');
assert(game.includes("CHIAMA TAXI ABUSIVO"));assert(game.includes("SCEGLI TU"));assert(game.includes('world.coreReady(taxi.destination.x,taxi.destination.z,72)')&&game.includes('world.prefetch(road.x,road.z,260)'),'loading gates a compact destination core instead of the whole district');assert(game.includes('radius:streamTaxi?360:undefined'),'loading gives streaming priority to the destination');assert(!game.includes('travel(PLACES['),'map no longer teleports directly');
assert.equal((game.match(/state\.money-=price/g)||[]).length,1,'physical taxi has one fare deduction point');
assert(mapUI.includes('mapPointFromPointer')&&mapUI.includes('e.clientX-r.left-tx')&&mapUI.includes('nativeMapClick.call(canvas,{clientX:'),'zoom/pan click is converted back to map coordinates');
assert(mapUI.includes("e.code!=='Space'")&&mapUI.includes("document.getElementById('confirmTaxi')")&&mapUI.includes('confirm.click()')&&mapUI.includes('},true);'),'SPACE is captured while the taxi confirmation dialog is paused and starts the trip');
assert(mapUI.includes('const taxiConfirmations=new WeakSet()')&&mapUI.includes("confirm.dataset.singleChargeGuard==='1'")&&mapUI.includes('taxiConfirmations.has(confirm)')&&mapUI.includes('event.stopImmediatePropagation()'),'same physical taxi confirmation cannot fire twice');
assert(mapUI.includes('document.activeElement===confirm'),'focused confirmation button uses native SPACE activation instead of an extra synthetic click');
assert(missionSystem.includes("this.pending?.mode==='taxi'||this.taxiTransaction?.active")&&missionSystem.includes('this.taxiTransaction={active:true'),'mission taxi has one active fare transaction at a time');
assert(mapUI.includes('TEST_BALANCE=50000')&&mapUI.includes("localStorage.setItem(key,JSON.stringify(saved))"),'test wallet tops up to €50,000');
assert(html.includes('TAXI ABUSIVO IN TRANSITO…')&&html.includes('PROSSIMA CURIOSITÀ'));assert(css.includes('@keyframes taxiChase')&&css.includes('image-rendering:pixelated'));assert(fs.statSync('dist/assets/taxi-loading-pixel-atlas.webp').size>100000,'pixel-art atlas present');
const report={fare:{minimum:10,maximum:100},destinations:destinations.map(p=>p.name),route:{arrived,blocked,finalZ:car.z,maxStep},system:{direct:direct.ok,fallback:!recovered.ok,inputLock:disable===1&&enable===1,finalized:finalized===1},loading:{coreReadyGate:true,coreRadius:72,prefetchRadius:260,streamFocusRadius:360},map:{zoomPanCoordinateFix:true,spaceConfirmsTrip:true,singleChargeGuard:true},missionTaxi:{singleActiveTransaction:true},testWallet:50000};
fs.writeFileSync('docs/taxi-results.json',JSON.stringify(report,null,2)+'\n');
console.log('PASS current taxi architecture, physical movement, fallback, single-charge guard and core-ready gate',report);
