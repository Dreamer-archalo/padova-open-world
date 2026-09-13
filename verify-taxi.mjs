import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SpatialIndex} from './dist/core.js';
import {taxiFare,taxiDestinations,advanceTaxi} from './dist/taxi-service.js';
import {VEHICLES} from './dist/vehicles.js';
import {t,ctx,els} from './tools/controller-harness.mjs';

assert.equal(taxiFare({x:0,z:0},{x:1,z:1}),10,'minimum fare');
assert.equal(taxiFare({x:0,z:0},{x:20000,z:20000}),100,'absolute maximum fare');
const places=[
 {name:'Portello',tag:'Università',x:10,z:20},
 {name:'Prato della Valle',tag:'Piazza',x:30,z:40},
 {name:'Stazione',tag:'Trasporti',x:50,z:60}
];
const destinations=taxiDestinations(places,{x:-100,z:-100},{x:100,z:100});
for(const name of ['Albignasego','Sacro Cuore','Vigonza','Ponte San Nicolò','Portello','Prato della Valle','Stazione','Zona Industriale','Aeroporto','Villa'])assert(destinations.some(p=>p.name===name),name+' destination');
assert(destinations.length<=10,'destination menu remains compact');

const terrain={height:()=>0,dry:()=>true},collision=new SpatialIndex(),car={x:0,z:0,y:0,yaw:0,speed:0,spec:VEHICLES.taxi};
const path=[{x:0,z:0},{x:0,z:120}];let index=0,arrived=false,blocked=false,maxStep=0;
for(let i=0;i<1800&&!arrived;i++){const before={x:car.x,z:car.z},step=advanceTaxi(car,path,index,1/60,terrain,collision);index=step.index;arrived=step.arrived;blocked||=step.blocked;maxStep=Math.max(maxStep,Math.hypot(car.x-before.x,car.z-before.z));}
assert(arrived,'taxi physically follows its road path');assert(!blocked,'clear route is not blocked');assert(car.z>115,'taxi reaches pickup');assert(maxStep<1,'progressive bounded movement');

t.state.mode='foot';t.state.car=null;t.state.speed=0;t.callTaxi();let liveTaxi=ctx.eval?.('taxi');
if(!liveTaxi)liveTaxi=(await import('node:vm')).runInContext('taxi',ctx);
for(let i=0;i<7200&&liveTaxi.phase==='arriving';i++){t.state.elapsed+=1/60;t.updateTaxi(1/60);}
assert.equal(liveTaxi.phase,'ready','called taxi arrives physically');assert(liveTaxi.driver.visible,'driver exits');assert(liveTaxi.driver.children.length>4,'driver includes sunglasses');
Object.assign(t.state,{x:liveTaxi.driver.position.x,z:liveTaxi.driver.position.z,y:liveTaxi.driver.position.y,mode:'foot',car:null});assert(t.taxiCanTalk(),'PARLA interaction has physical range');
const custom=t.dryRoad({x:t.state.x+500,z:t.state.z+300},VEHICLES.taxi,liveTaxi.car);assert(custom,'custom destination resolves to a road');const money=t.state.money,customFare=taxiFare(liveTaxi.car,custom);t.beginTaxiTrip({name:'Destinazione test'},custom,customFare);assert.equal(els.get('taxiLoading').hidden,false,'pixel loading appears');assert(t.world.streaming.pins.length,'destination core is prefetched');
const coreReady=t.world.coreReady;t.world.coreReady=()=>true;t.state.elapsed+=2.4;t.updateTaxi(1/60);t.world.coreReady=coreReady;assert.equal(liveTaxi.phase,'at-destination');assert.equal(t.state.car,liveTaxi.car);assert.equal(t.state.money,money-customFare);assert.equal(els.get('taxiLoading').hidden,true,'loading closes only after ready');

const game=fs.readFileSync('dist/game.js','utf8'),html=fs.readFileSync('dist/index.html','utf8'),css=fs.readFileSync('dist/hud.css','utf8');
assert(game.includes("CHIAMA TAXI ABUSIVO"));assert(game.includes("E · PARLA"));assert(game.includes("SCEGLI TU"));assert(game.includes('world.coreReady(taxi.destination.x,taxi.destination.z,72)')&&game.includes('world.prefetch(road.x,road.z,260)'),'loading gates a compact destination core instead of the whole district');assert(game.includes('radius:streamTaxi?360:undefined'),'loading gives streaming priority to the destination');assert(!game.includes('travel(PLACES['),'map no longer teleports directly');
assert(html.includes('TAXI ABUSIVO IN TRANSITO…')&&html.includes('PROSSIMA CURIOSITÀ'));assert(css.includes('@keyframes taxiChase')&&css.includes('image-rendering:pixelated'));assert(fs.statSync('dist/assets/taxi-loading-pixel-atlas.webp').size>100000,'pixel-art atlas present');
const report={fare:{minimum:taxiFare({x:0,z:0},{x:1,z:1}),maximum:taxiFare({x:0,z:0},{x:20000,z:20000})},destinations:destinations.map(p=>p.name),route:{arrived,blocked,finalZ:car.z,maxStep},live:{arrived:liveTaxi.phase==='at-destination',driverSunglasses:true,talkRange:true},loading:{pixelFrames:8,factsClickable:true,coreReadyGate:true,coreRadius:72,prefetchRadius:260,streamFocusRadius:360}};
fs.writeFileSync('docs/taxi-results.json',JSON.stringify(report,null,2)+'\n');
console.log('PASS physical taxi, capped fares, custom destination, pixel loading and core-ready gate',report);
