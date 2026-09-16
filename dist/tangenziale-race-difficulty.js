import {TangenzialeRace} from './tangenziale-race.js';
import {dist,clamp} from './core.js';
import {followRoad} from './chase-routing.js';
import {respawnCheckpoint} from './tangenziale-race-rules.js';

// Only the three AI cars in race ONE change. Race 2 keeps its separate,
// equal-performance seven-car rules; the player and remote human cars never
// receive altered specifications or artificial acceleration.
export const RACE_ONE_DIFFICULTIES=Object.freeze({
 easy:Object.freeze({name:'FACILE',skills:[.72,.76,.80],turbo:0,accel:9.4,turn:1.55,boost:0}),
 medium:Object.freeze({name:'MEDIO',skills:[.975,.995,1.012],turbo:3,accel:14.4,turn:1.78,boost:6.2}),
 hard:Object.freeze({name:'DIFFICILE',skills:[1.045,1.075,1.105],turbo:3,accel:16.5,turn:2.02,boost:7.5})
});
export const raceOneDifficulty=value=>Object.hasOwn(RACE_ONE_DIFFICULTIES,value)?value:'medium';
export function applyRaceOneDifficulty(race,mode){
 if(!race||race.__secondRace||race.__nextRaceMode==='second')return false;
 const key=raceOneDifficulty(mode),settings=RACE_ONE_DIFFICULTIES[key];
 race.difficulty=key;
 for(const [i,car] of race.ai.entries()){
  car.raceSkill=settings.skills[i]??settings.skills.at(-1);
  car.raceTurbo=settings.turbo;
  car.raceTurboUntil=0;
  car.raceTurboIndex=0;
 }
 return true;
}
const previousConfirmation=TangenzialeRace.prototype.openConfirmation;
TangenzialeRace.prototype.openConfirmation=function(...args){
 const out=previousConfirmation.apply(this,args);
 const content=typeof document==='undefined'?null:document.getElementById('menuContent');
 const actions=content?.querySelector?.('.menu-actions');
 if(actions&&!content.querySelector('#raceOneDifficulty')){
  const label=document.createElement('label');label.style.cssText='display:block;margin:14px 0;padding:12px;border:1px solid #b5a58c;border-radius:8px';
  label.setAttribute('for','raceOneDifficulty');
  label.innerHTML='<strong>DIFFICOLTÀ BOT · GARA 1</strong><br><select id="raceOneDifficulty" style="width:100%;margin-top:8px;padding:9px"><option value="easy">FACILE · avversari più lenti, senza turbo</option><option value="medium" selected>MEDIO · comportamento attuale</option><option value="hard">DIFFICILE · avversari più veloci e reattivi</option></select>';
  actions.before(label);
 }
 return out;
};
const previousStart=TangenzialeRace.prototype.start;
TangenzialeRace.prototype.start=function(...args){
 const isSecond=this.__nextRaceMode==='second';
 const selected=!isSecond&&typeof document!=='undefined'?document.getElementById('raceOneDifficulty')?.value:null;
 const out=previousStart.apply(this,args);
 if(!isSecond&&this.race&&!this.race.__secondRace)applyRaceOneDifficulty(this.race,selected||'medium');
 return out;
};
function nearestSample(actor,samples,hint){
 let best=clamp(hint,0,samples.length-1),bestD=Infinity;
 for(let i=Math.max(0,best-10);i<=Math.min(samples.length-1,best+14);i++){
  const p=samples[i],d=Math.hypot(actor.x-p.x,actor.z-p.z,(Number.isFinite(actor.y)&&Number.isFinite(p.y)?(actor.y-p.y)*4:0));
  if(d<bestD){bestD=d;best=i;}
 }
 if(bestD>72)for(let i=0;i<samples.length;i+=3){
  const p=samples[i],d=Math.hypot(actor.x-p.x,actor.z-p.z,(Number.isFinite(actor.y)&&Number.isFinite(p.y)?(actor.y-p.y)*4:0));
  if(d<bestD){bestD=d;best=i;}
 }
 return {index:best,d:bestD};
}
const previousAI=TangenzialeRace.prototype.updateAI;
TangenzialeRace.prototype.updateAI=function(dt){
 const r=this.race;
 if(!r||r.__secondRace||!r.difficulty||r.difficulty==='medium')return previousAI.call(this,dt);
 const settings=RACE_ONE_DIFFICULTIES[raceOneDifficulty(r.difficulty)],traffic=[r.playerCar,...r.ai,...r.obstacles];
 // Do not invoke the standard catch-up AI: its rubberband teleports trailing
 // opponents near the player and would make EASY indistinguishable from HARD.
 for(const [i,c] of r.ai.entries()){
  this.ensureRacer(c,i+1,c.raceOffset??[-1.2,0,1.2][i]);
  if(c.raceFinished){c.speed=0;c.parked=true;this.game.pose(c);continue;}
  const p=nearestSample(c,r.samples,c.raceHint??r.startIndex);
  this.updateCheckpoint(c,p,'raceHint','raceCheckpoint');
  c.raceProgress=Math.max(c.raceProgress||0,Math.max(0,(r.samples.cumulative[p.index]||0)-r.startDistance));
  if(c.raceProgress>=r.total-28||dist(c,r.finish)<18){this.markFinished(i+1,c);continue;}
  const turboPlan=[[.18,.49,.79],[.23,.55,.83],[.15,.45,.74]][i]||[.2,.5,.8];
  if(c.raceTurbo>0&&c.raceTurboIndex<turboPlan.length&&c.raceProgress/r.total>=turboPlan[c.raceTurboIndex]){
   c.raceTurbo--;c.raceTurboIndex++;c.raceTurboUntil=this.game.state.elapsed+2.6;
  }
  c.raceSkill=settings.skills[i]??settings.skills.at(-1);
  const max=c.spec.max*c.raceSkill+(this.game.state.elapsed<c.raceTurboUntil?settings.boost:0);
  followRoad(c,dt,this.game.graph,this.game.terrain,this.game.collision,{max,accel:settings.accel+i*.3,turnRate:settings.turn,traffic:traffic.filter(o=>o!==c)});
  this.game.pose(c);
  if(p.d>72||c.stuck>4.2)this.respawnActor(c,respawnCheckpoint(r.startIndex,c.raceCheckpoint,r.samples.length),c.raceOffset);
 }
};
const previousPaint=TangenzialeRace.prototype.paintHud;
TangenzialeRace.prototype.paintHud=function(...args){
 const out=previousPaint.apply(this,args);
 const race=this.race;
 if(race&&!race.__secondRace&&race.difficulty&&typeof document!=='undefined')queueMicrotask(()=>{
  if(this.race!==race)return;
  const desc=document.getElementById('missionDesc');
  if(desc&&!desc.textContent.includes('DIFFICOLTÀ BOT'))desc.textContent+=' · DIFFICOLTÀ BOT '+RACE_ONE_DIFFICULTIES[race.difficulty].name;
 });
 return out;
};
