import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {PadovaUrbanDirector,PADOVA_NPC_LIMIT} from './dist/urban-life.js';
import * as THREE from './dist/vendor/three.module.js';
import {curbParkingTarget} from './dist/traffic.js';

const person=(seed,x,z,driverPool=false)=>({seed,x,z,y:0,yaw:0,at:0,role:'walker',driverPool,mesh:Object.assign(new THREE.Group(),{visible:!driverPool})});
const state={x:100,z:0,elapsed:20,quality:'medium',mode:'foot',paused:false};
const game={state,people:[],cars:[],signals:{junctions:new Map(),allowed:()=>false},terrain:{height:()=>0,dry:()=>true},collision:{near:()=>[]},pose(){},toast(){}};
const bar={id:'test',p:{x:6,z:18}};
const npc=new PadovaUrbanDirector(game,{bars:[bar],benches:[{x:12,z:10}]});
const p=person(1,11,11),q=person(2,12,11),driver=person(25,0,0,true);game.people.push(p,q,driver);
assert.equal(npc.limit(),8);assert.deepEqual(Object.keys(PADOVA_NPC_LIMIT),['hyper','low','medium','high']);
const seat=npc.reserve(p,npc.benches);assert(seat);assert.equal(npc.reserve(q,npc.benches),null,'one seat, one actor');
npc.start(p,'to-bench',seat);p.x=seat.x;p.z=seat.z;npc.afterMove(p,20);assert.equal(p.cityTask.state,'seated');
state.elapsed=27;npc.afterMove(p,27);assert(!p.cityTask);assert.equal(npc.occupied.size,0,'bench released');
const barSeat=npc.reserve(q,npc.bars[0].seats);assert(barSeat);q.cityBar=npc.bars[0];npc.start(q,'to-bar',q.cityBar.door);
for(const [before,x,z,after] of [['to-bar',q.cityBar.door.x,q.cityBar.door.z,'enter-bar'],['enter-bar',q.cityBar.inside.x,q.cityBar.inside.z,'to-table'],['to-table',barSeat.x,barSeat.z,'at-bar']]){assert.equal(q.cityTask.state,before);q.x=x;q.z=z;state.elapsed++;npc.afterMove(q,state.elapsed);assert.equal(q.cityTask.state,after);}
state.elapsed=40;npc.afterMove(q,40);assert.equal(q.cityTask.state,'exit-bar');q.x=q.cityBar.door.x;q.z=q.cityBar.door.z;npc.afterMove(q,41);assert.equal(q.cityTask,null);assert.equal(npc.occupied.size,0,'bar seat released after door exit');
q.mesh.visible=true;npc.alarm({x:q.x-1,z:q.z},10,2);assert.equal(q.cityTask.state,'flee');const flee=npc.intent(q,{speed:1,yaw:0},41);assert(flee.speed>2);state.elapsed=44;npc.afterMove(q,44);assert.equal(q.cityTask.state,'recover');state.elapsed=46;npc.afterMove(q,46);assert.equal(q.cityTask,null);
state.quality='hyper';assert.equal(npc.limit(),2);state.quality='medium';
const stripe={id:1,yaw:0,a:{x:-4,z:5},b:{x:4,z:5}};p.cityCross={...stripe,to:stripe.b};npc.start(p,'to-crosswalk',stripe.a);p.x=stripe.a.x;p.z=stripe.a.z;npc.afterMove(p,state.elapsed);assert.equal(p.cityTask.state,'crosswalk');
game.signals.allowed=()=>true;assert.equal(npc.intent(p,{speed:1},state.elapsed,[]).speed,0,'vehicles have green: pedestrian waits at stripes');
game.signals.allowed=()=>false;assert(npc.intent(p,{speed:1},state.elapsed,[]).crossing);p.x=stripe.b.x;p.z=stripe.b.z;npc.afterMove(p,state.elapsed);assert.equal(p.cityTask,null,'crosswalk traversal completes');
for(let i=0;i<20;i++)game.people.push(person(100+i,10+i*.2,10));state.x=40;state.elapsed=47;npc.assign();assert(npc.count()<=npc.limit(),'population cap');
for(const other of game.people)if(other.cityTask)npc.clear(other);state.x=100;game.signals.allowed=()=>true;
const c={x:0,z:0,y:0,yaw:0,speed:4,road:{w:8,k:'tertiary'},spec:{width:2,length:4,height:1.6,steer:2},mesh:{visible:true}};game.cars.push(c);
const node={x:0,z:40};assert(curbParkingTarget(c,node,game.terrain,game.collision,[c]));
state.elapsed=50;npc.maybePark(c,node,[c]);assert.equal(c.cityCycle?.state,'approach');assert.equal(npc.driverPool(),0,'pooled driver reserved');
for(let i=0;i<600&&c.cityCycle?.state==='approach';i++){state.elapsed+=.1;npc.drive(c,.1);}
assert.equal(c.cityCycle?.state,'parked','driver parks without teleporting');assert(driver.mesh.visible,'driver exits as existing pooled pedestrian');
const visit=driver.cityTask;assert.equal(visit.state,'to-bar');
for(const [x,z,after] of [[driver.cityBar.door.x,driver.cityBar.door.z,'enter-bar'],[driver.cityBar.inside.x,driver.cityBar.inside.z,'to-table'],[driver.citySeat.x,driver.citySeat.z,'at-bar']]){driver.x=x;driver.z=z;state.elapsed+=.1;npc.afterMove(driver,state.elapsed);assert.equal(driver.cityTask.state,after);}
state.elapsed=driver.cityTask.until+.1;npc.afterMove(driver,state.elapsed);assert.equal(driver.cityTask.state,'exit-bar');driver.x=driver.cityBar.door.x;driver.z=driver.cityBar.door.z;npc.afterMove(driver,state.elapsed);assert.equal(driver.cityTask.state,'return-car');driver.x=driver.driverExit.x;driver.z=driver.driverExit.z;npc.afterMove(driver,state.elapsed);assert.equal(c.cityCycle.state,'depart');assert.equal(driver.mesh.visible,false);
for(let i=0;i<600&&c.cityCycle;i++){state.elapsed+=.1;npc.drive(c,.1);}
assert.equal(c.cityCycle,null,'driver departs and cycle finishes');assert.equal(npc.drivers.size,0);assert.equal(npc.driverPool(),1,'driver returned to pool');assert.equal(npc.occupied.size,0);
npc.start(p,'to-bench',{x:1000,z:1000});state.elapsed+=30;npc.afterMove(p,state.elapsed);assert.equal(p.cityTask,null,'blocked trip has bounded timeout');
state.x=8000;npc.assign(state.elapsed+100);assert.equal(npc.drivers.size,0,'regional systems remain outside Padova director');
execFileSync(process.execPath,['verify-taxi-wallet.mjs'],{stdio:'pipe'});
execFileSync(process.execPath,['verify-hangar-air.mjs'],{stdio:'pipe'});
console.log('PASS R17: pedestrian states, crossing/venue seats, danger, parking and return, bounded pool, taxi wallet, safe hangar');
