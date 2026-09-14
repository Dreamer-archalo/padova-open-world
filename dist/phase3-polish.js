import {ModernGameplay} from './modern-gameplay.js';

const TOUR_KEY='padova-tour-mode-v1';
const play=document.getElementById('playBtn');
// A direct click on the normal Play button always returns to the standard game.
// The VISITA CITTÀ button triggers play programmatically, so its click is not trusted.
play?.addEventListener('click',event=>{if(event.isTrusted)sessionStorage.removeItem(TOUR_KEY);},true);
const keybar=document.querySelector('.hud.keybar');if(keybar&&!keybar.querySelector('[data-phase3-horn]')){const s=document.createElement('span');s.dataset.phase3Horn='true';s.innerHTML='<kbd>H</kbd> clacson';keybar.appendChild(s);}

let last=0;
const original=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__phase3Polish){ModernGameplay.prototype.__phase3Polish=true;ModernGameplay.prototype.update=function(dt){original.call(this,dt);const now=this.state.elapsed;if(now-last<.08)return;last=now;
 // Small event animation only for visible nearby props. No new actors are spawned.
 for(const root of this.scene.children){if(!root.userData?.phase3Event||!root.visible)continue;const phase=now*.8+root.id;root.rotation.y=Math.sin(phase*.23)*.025;for(const child of root.children){if(child.isMesh&&root.userData.phase3Event==='pigeons')child.position.y=Math.max(.12,child.position.y+Math.sin(phase+child.id)*.002);}}
 // Reactions deliberately differ: some people flee, some stop and look, others
 // keep moving. This avoids every NPC responding identically to a horn/siren.
 for(const p of this.people){if((p.phase3ReactionUntil||0)<=now||!p.mesh?.visible)continue;const mode=(p.seed??p.mesh.id)%3;if(mode===0){p.speed=Math.min(p.speed||0,.4);p.mesh.rotation.y+=Math.sin(now*2+p.mesh.id)*.02;}else if(mode===1){p.speed=Math.max(p.speed||0,1.8);}else p.speed=Math.min(p.speed||0,.8);}
};}
