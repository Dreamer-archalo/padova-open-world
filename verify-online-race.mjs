import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('./dist/online-race.js',import.meta.url),'utf8').replace(/^import .*;\s*$/gm,'');
const players={};let clock=100000;
function instance(name){
  const nodes=new Map();
  const body={append(el){nodes.set(el.id,el);el.parentNode=body;},appendChild(el){this.append(el);}};
  const document={body,createElement(tag){return {tag,style:{},userData:{},children:[],append(...els){this.children.push(...els);},replaceChildren(...els){this.children=[...els];},remove(){nodes.delete(this.id);},setAttribute(){},insertAdjacentElement(){}};},getElementById(id){return nodes.get(id)||null;},querySelectorAll(){return []}};
  const events=new Map();
  const window={PadovaOnline:{user:name,connected:true,peers:[],broadcastWorldPatch(packet){for(const [other,recipient] of Object.entries(players))if(other!==name)recipient.events.get('padova-online-world-patch')?.({detail:{user:name,patch:packet}});}},addEventListener(event,fn){events.set(event,fn);}};
  class TangenzialeRace{
    constructor(){this.game={state:{elapsed:0,mode:'foot',x:0,y:0,z:0,yaw:0,speed:0},scene:{children:[]},pose(){},toast(){}};this.race=null;}
    start(){const car=()=>({mesh:{userData:{secondRaceName:'ROSSA'}},x:0,y:0,z:0,yaw:0,speed:0,parked:true,raceProgress:0});this.race={phase:'countdown',start:{x:0,z:0},finish:{x:1000,z:0},total:1000,ai:[car(),car(),car()],playerCar:car(),finishTimes:[null,null,null,null],finishOrder:[],playerProgress:0};}
    update(dt){this.game.state.elapsed+=dt;}
    freezeGrid(){}
    keyDown(){}
    updateAI(){for(const a of this.race.ai)if(!a.raceFinished)a.moves=(a.moves||0)+1;}
    raceBoard(){return 'OFFLINE';}
    markFinished(i,c){this.race.finishTimes[i]=this.game.state.elapsed;this.race.finishOrder.push(i);c.raceFinished=true;}
    restoreSnapshot(){this.race=null;}
    abort(){this.restoreSnapshot();}
  }
  const ctx=vm.createContext({TangenzialeRace,formatRaceTime:t=>String(t),document,window,setInterval(){},Date:{now:()=>clock},Math,console});
  vm.runInContext(source,ctx,{filename:'online-race.js'});
  const race=new TangenzialeRace();players[name]={ctx,race,events,window};return players[name];
}
const a=instance('Matt'),b=instance('Milo');a.window.PadovaOnline.peers=['Milo'];b.window.PadovaOnline.peers=['Matt'];
b.race.update(.016);a.race.start();assert.equal(a.race.race.phase,'lobby');
vm.runInContext("joinOffer(currentOffer('one'))",b.ctx);
assert.equal(b.race.race.phase,'lobby');
assert.equal(vm.runInContext('session.roster.length',a.ctx),2);
vm.runInContext('startRace()',a.ctx);
assert.equal(a.race.race.phase,'countdown');assert.equal(b.race.race.phase,'countdown');
assert.equal(b.race.race.onlineSlot,1);
a.race.race.phase='running';b.race.race.phase='running';
b.race.game.state.x=33;b.race.race.playerProgress=140;
vm.runInContext('sendPose(manager)',b.ctx);
assert.equal(a.race.race.ai[0].x,33);assert.equal(a.race.race.ai[0].raceProgress,140);
a.race.race.ai[1].x=45;a.race.race.ai[1].raceProgress=70;
vm.runInContext('sendPose(manager)',a.ctx);
assert.equal(b.race.race.ai[1].x,45);assert.equal(b.race.race.ai[1].raceProgress,70);
a.race.updateAI(.1);assert.equal(a.race.race.ai[0].moves,undefined);assert.equal(a.race.race.ai[1].moves,1);
const solo=instance('Scando');solo.race.start();assert.equal(solo.race.race.phase,'lobby');vm.runInContext('startRace()',solo.ctx);assert.equal(solo.race.race.phase,'countdown');assert.equal(vm.runInContext('session.roster.length',solo.ctx),1);
console.log('PASS: two-client lobby/countdown, unique grid slots, human substitution, host-authoritative bots and solo skip');
