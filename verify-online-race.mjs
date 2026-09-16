import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('./dist/online-race-v2.js',import.meta.url),'utf8').replace(/^import .*;\s*$/gm,'');
const players={};let clock=100000,dropNextStart=false;
function instance(name){
 const nodes=new Map(),events=new Map(),body={appendChild(el){nodes.set(el.id,el);el.parentNode=body;},append(el){this.appendChild(el);}};
 const menu={open:true,close(){this.open=false;}};nodes.set('menu',menu);
 const document={body,scripts:[],head:{append(){}},createElement(tag){return {tag,id:'',style:{},userData:{},children:[],append(...els){this.children.push(...els);},replaceChildren(...els){this.children=[...els];},remove(){nodes.delete(this.id);},setAttribute(){},insertAdjacentElement(){},querySelector(){return null;}};},getElementById(id){return nodes.get(id)||null;},querySelectorAll(){return [];}};
 const window={PadovaOnline:{user:name,connected:true,peers:[],broadcastWorldPatch(packet){if(packet.op==='start'&&dropNextStart){dropNextStart=false;return;}for(const [other,recipient] of Object.entries(players))if(other!==name)recipient.events.get('padova-online-world-patch')?.({detail:{user:name,patch:packet}});}},addEventListener(event,fn){events.set(event,fn);}};
 class TangenzialeRace{
  constructor(){this.game={state:{elapsed:0,paused:false,mode:'foot',x:0,y:0,z:0,yaw:0,speed:0},scene:{children:[]},pose(){},toast(){}};this.race=null;}
  start(){const car=()=>({mesh:{userData:{secondRaceName:'ROSSA'}},x:0,y:0,z:0,yaw:0,speed:0,parked:true,raceProgress:0});this.race={phase:'countdown',start:{x:0,z:0},finish:{x:1000,z:0},total:1000,ai:[car(),car(),car()],playerCar:car(),finishTimes:[null,null,null,null],finishOrder:[],playerProgress:0};}
  update(dt){this.game.state.elapsed+=dt;}
  freezeGrid(){}keyDown(){}
  updateAI(){for(const a of this.race.ai)if(!a.raceFinished)a.moves=(a.moves||0)+1;}
  raceBoard(){return 'OFFLINE';}
  markFinished(i,c){this.race.finishTimes[i]=this.game.state.elapsed;this.race.finishOrder.push(i);c.raceFinished=true;}
  restoreSnapshot(){this.race=null;}abort(){this.restoreSnapshot();}
 }
 const context=vm.createContext({TangenzialeRace,formatRaceTime:t=>String(t),document,window,setInterval(){},Date:{now:()=>clock},Math,console});
 vm.runInContext(source,context,{filename:'online-race-v2.js'});
 const race=new TangenzialeRace();players[name]={context,race,events,window,nodes,menu};return players[name];
}
const a=instance('Matt'),b=instance('Milo');a.window.PadovaOnline.peers=['Milo'];b.window.PadovaOnline.peers=['Matt'];
b.race.update(.016);a.race.start();assert.equal(a.race.race.phase,'lobby');assert.equal(a.menu.open,false,'original confirmation closes at lobby');
vm.runInContext("joinOffer(currentOffer('one'))",b.context);
assert.equal(b.race.race.phase,'lobby');assert.equal(vm.runInContext('session.roster.length',a.context),2);
assert.equal(vm.runInContext('session.ready.size',a.context),0,'joining does not mean loaded');
clock+=1000;b.race.update(.016);assert.equal(vm.runInContext("session.ready.has('Milo')",a.context),true);
const lobby=a.nodes.get('onlineRaceLobby'),button=lobby.children.find(child=>child.tag==='button');a.race.update(.016);assert.strictEqual(lobby.children.find(child=>child.tag==='button'),button,'button must remain mounted until lobby state changes');
dropNextStart=true;vm.runInContext('startRace()',a.context);
assert.equal(a.race.race.phase,'countdown');assert.equal(b.race.race.phase,'lobby','dropped start packet is simulated');
clock+=800;a.race.update(.016);assert.equal(b.race.race.phase,'countdown','host retries start until guest ACK');assert.equal(b.race.race.onlineSlot,1);
assert.equal(vm.runInContext("session.acks.has('Milo')",a.context),true);
assert.equal(b.nodes.has('onlineRaceLobby'),false,'guest lobby must be removed on start');
a.race.race.phase='running';b.race.race.phase='running';b.race.game.state.x=33;b.race.race.playerProgress=140;vm.runInContext('sendPose(manager)',b.context);
assert.equal(a.race.race.ai[0].x,33);assert.equal(a.race.race.ai[0].raceProgress,140);
a.race.race.ai[1].x=45;a.race.race.ai[1].raceProgress=70;vm.runInContext('sendPose(manager)',a.context);
assert.equal(b.race.race.ai[1].x,45);assert.equal(b.race.race.ai[1].raceProgress,70);
a.race.updateAI(.1);assert.equal(a.race.race.ai[0].moves,undefined);assert.equal(a.race.race.ai[1].moves,1);
const solo=instance('Scando');solo.race.start();assert.equal(solo.race.race.phase,'lobby');vm.runInContext('startRace()',solo.context);
assert.equal(solo.race.race.phase,'countdown');assert.equal(vm.runInContext('session.roster.length',solo.context),1);
console.log('PASS: readiness, stable lobby buttons, modal closure, dropped-start retry/ACK, 2 players, host BOT simulation and solo skip');
