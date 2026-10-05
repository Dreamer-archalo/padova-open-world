import {TangenzialeRace} from './tangenziale-race.js';

// Only the three AI cars in race ONE change. Race 2 keeps its separate,
// equal-performance seven-car rules; the player and remote human cars never
// receive altered specifications or artificial acceleration.
export const RACE_ONE_DIFFICULTIES=Object.freeze({
 easy:Object.freeze({name:'FACILE',skills:[.70,.72,.74],turbo:0,accel:9.4,turn:1.55,boost:0,corner:.72,laneRate:2.8}),
 medium:Object.freeze({name:'MEDIO',skills:[.94,.97,1],turbo:3,accel:14.4,turn:1.78,boost:6.2,corner:1,laneRate:3.8}),
 hard:Object.freeze({name:'DIFFICILE',skills:[1.10,1.14,1.18],turbo:3,accel:18.5,turn:2.15,boost:9.2,corner:1.13,laneRate:4.5})
});
export const raceOneDifficulty=value=>Object.hasOwn(RACE_ONE_DIFFICULTIES,value)?value:'medium';
export function applyRaceOneDifficulty(race,mode){
 if(!race||race.__secondRace||race.__nextRaceMode==='second')return false;
 const key=raceOneDifficulty(mode),settings=RACE_ONE_DIFFICULTIES[key];
 race.difficulty=key;
 for(const [i,car] of race.ai.entries()){
  car.raceTuning=settings;
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
  label.innerHTML='<strong>DIFFICOLTÀ BOT · GARA 1</strong><br><select id="raceOneDifficulty" style="width:100%;margin-top:8px;padding:9px"><option value="easy">FACILE · avversari più lenti, senza turbo</option><option value="medium" selected>MEDIO · avversari competitivi</option><option value="hard">DIFFICILE · velocità, turbo e sorpassi aggressivi</option></select>';
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
// All three modes use the obstacle-aware, bridge-aware race controller.
// Difficulty changes real driving parameters; no catch-up teleport or fake time.
const previousAI=TangenzialeRace.prototype.updateAI;
TangenzialeRace.prototype.updateAI=function(dt){
 const r=this.race;
 if(r&&!r.__secondRace&&!r.difficulty)applyRaceOneDifficulty(r,'medium');
 return previousAI.call(this,dt);
};
const previousResults=TangenzialeRace.prototype.resolveIfReady;
TangenzialeRace.prototype.resolveIfReady=function(){
 const r=this.race;
 if(!r||r.__secondRace)return previousResults.call(this);
 // Wait for every bot to physically finish. A player who has finished can use X
 // to return immediately; an unfinished player keeps the usual result grace.
 if(r.ai.some(car=>!car.raceFinished))return false;
 return previousResults.call(this);
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
