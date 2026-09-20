// One conversation, one choice, one reply, then close: not a forced chain of 25.
// Existing authored 25 four-option dialogues are reused without touching missions or saves.
import {ModernGameplay} from './modern-gameplay.js';
import {MANDRIA_CONVERSATIONS} from './villa-mandria-v5-dialogues.js';
let game=null,configured=false;
const visits=new WeakMap();
function workerNearby(g){if(!g?.villaLife||!g.state||g.state.mode!=='foot')return null;let best=null,d=4.6;
 for(const p of g.villaLife.people){if(p.role!=='worker'||!p.obj.visible)continue;const a=Math.hypot(p.obj.position.x-g.state.x,p.obj.position.z-g.state.z);if(a<d){best=p;d=a;}}
 return best;
}
function flow(dialog){const worker=workerNearby(game);if(!worker)return;
 const workers=game.villaLife.people.filter(p=>p.role==='worker'),index=Math.max(0,workers.indexOf(worker)),visitsSoFar=visits.get(worker)||0;
 // A worker remembers their own topic sequence; it is not a global 1-to-25 slideshow.
 const topic=(index*7+visitsSoFar*11)%MANDRIA_CONVERSATIONS.length;visits.set(worker,visitsSoFar+1);
 const [question,...choices]=MANDRIA_CONVERSATIONS[topic];dialog.querySelector('#mwName').textContent=['Mateo','Lucía','Rafael','Inés','Diego','Camila'][index%6]+' · '+(worker.v6Worker?'squadra agricola':'personale');
 dialog.querySelector('#mwQuestion').textContent=question;
 const list=dialog.querySelector('#mwChoices'),reply=dialog.querySelector('#mwReply');list.replaceChildren();list.hidden=false;reply.hidden=true;
 let done=dialog.querySelector('.mw-next');if(done){const replacement=done.cloneNode(false);replacement.textContent='Concludi ✓';done.replaceWith(replacement);done=replacement;done.hidden=true;done.addEventListener('click',()=>dialog.close());}
 for(const [n,[label,response]] of choices.entries()){const b=document.createElement('button');b.type='button';b.textContent=(n+1)+'. '+label;b.addEventListener('click',()=>{
  list.hidden=true;reply.textContent=response;reply.hidden=false;done.hidden=false;done.focus();
 });list.appendChild(b);}
}
function install(){if(configured)return;const dialog=document.getElementById('mandriaWorkerDialog');if(!dialog)return;configured=true;
 const original=dialog.showModal.bind(dialog);
 dialog.showModal=function(...args){const result=original(...args);flow(dialog);return result;};
 dialog.addEventListener('cancel',()=>dialog.close());
 window.addEventListener('keydown',e=>{if(!dialog.open||e.code!=='KeyX'||e.repeat)return;e.preventDefault();e.stopImmediatePropagation();dialog.close();},true);
}
const previousPopulate=ModernGameplay.prototype.populate,previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV6DialogueFlow){ModernGameplay.prototype.__mandriaV6DialogueFlow=true;
 ModernGameplay.prototype.populate=function(...args){const out=previousPopulate.apply(this,args);game=this;return out;};
 ModernGameplay.prototype.update=function(dt){previousUpdate.call(this,dt);game=this;install();};
}
