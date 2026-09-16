import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Exercise the production hotfix against the v2 race lifecycle: v2 start
// installs the lobby, then the existing second-race callback configures its track.
const source=fs.readFileSync(new URL('./dist/online-race-second-fix.js',import.meta.url),'utf8').replace(/^import .*;\s*$/gm,'');
const menu={open:true,close(){this.open=false;}};
const window={PadovaOnline:{connected:true}};
const document={getElementById:id=>id==='menu'?menu:null};
const car=x=>({x,y:2,z:3,yaw:.1,speed:0});
class TangenzialeRace {
 constructor(){this.race=null;this.game={state:{paused:true,x:0,y:0,z:0,yaw:0,speed:0},pose(){}};}
 start(){this.race={onlineId:'second-session',phase:'lobby',playerCar:car(0),ai:[car(10),car(20),car(30)]};}
 update(){if(this.race?.phase==='countdown'){
   // The production countdown freezes every racer before switching to running.
   this.race.playerCar.x=0;this.race.ai[0].x=10;this.race.phase='running';
 }}
}
vm.runInNewContext(source,{TangenzialeRace,window,document,queueMicrotask},{filename:'online-race-second-fix.js'});
const race=new TangenzialeRace();
race.__nextRaceMode='second';race.start();race.__nextRaceMode=null;
// This is the actual second-race ordering: configureSecond runs after start().
race.race.__secondRace=true;race.race.phase='countdown';
assert.equal(race.race.phase,'countdown');
await new Promise(resolve=>setImmediate(resolve));
assert.equal(race.race.phase,'lobby','second-race setup must not bypass lobby');
assert.equal(race.game.state.paused,false,'setup closes the modal pause');
assert.equal(menu.open,false,'race setup closes the confirmation dialog');
race.race.phase='countdown';race.race.onlineSlot=1;
race.update(.016);
assert.equal(race.race.phase,'running');
assert.equal(race.race.playerCar.x,10,'guest must launch from their grid slot');
assert.equal(race.race.ai[0].x,0,'other slot retains correct car');
assert.equal(race.game.state.x,10,'physics state matches guest vehicle on GO');
const offline=new TangenzialeRace();window.PadovaOnline.connected=false;offline.__nextRaceMode='second';offline.start();offline.race.__secondRace=true;offline.race.phase='countdown';await new Promise(resolve=>setImmediate(resolve));assert.equal(offline.race.phase,'countdown','offline countdown unchanged');
console.log('PASS: race 2 lobby after setup, modal closure, guest grid on GO, offline unchanged');
