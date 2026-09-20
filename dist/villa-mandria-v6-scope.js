// The range is fictional target practice. Only estate-bound aiming alters the camera.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
let game=null,holsterButton=null;
function aiming(g){return !!(g?.state?.started&&g.villaRange?.active&&g.villaRange.aiming&&g.state.mode==='foot'&&!g.state.paused&&!document.querySelector('dialog[open]'));}
function putAway(g){const r=g?.villaRange;if(!r?.active)return false;r.active=false;r.aiming=false;r.lastShot=-100;
 if(g.villaV4Polish?.gun)g.villaV4Polish.gun.visible=false;
 document.body.classList.remove('mandria-sniper');const s=document.getElementById('mandriaSniperScope');if(s)s.hidden=true;
 if(r.hud){r.hud.hidden=true;}g.toast?.('Fucile riposto · torna al poligono e premi E per riprendere.',2.8);return true;}
function install(){if(holsterButton)return;
 const style=document.createElement('style');style.textContent=`
 body.mandria-sniper #mandriaSniperScope{background:radial-gradient(circle min(24vmin,175px) at 50% 50%,transparent 0 98%,#000 100%)!important}
 body.mandria-sniper #mandriaSniperScope .scope-ring{width:min(48vmin,350px)!important;height:min(48vmin,350px)!important;border:3px solid #181e1d!important;box-shadow:inset 0 0 26px #0009,0 0 0 2px #7b8983!important}
 body.mandria-sniper #mandriaSniperScope .scope-info{top:calc(50% + min(25vmin,185px))!important;font-size:13px!important;text-shadow:0 2px 3px #000}
 #mandriaHolster:not([hidden]){position:fixed;z-index:710;top:calc(50% + min(29vmin,220px));left:50%;transform:translateX(-50%);border:1px solid #cfbd96;border-radius:9px;background:#152b2de8;color:#fff3d8;font:700 13px system-ui;padding:9px 17px;cursor:pointer}
 body.mandria-sniper #playingUI .hud,body.mandria-sniper #playingUI .mission,body.mandria-sniper #playingUI .minimap,body.mandria-sniper #playingUI .driving{visibility:hidden!important}
 `;document.head.appendChild(style);
 holsterButton=document.createElement('button');holsterButton.id='mandriaHolster';holsterButton.type='button';holsterButton.textContent='X · METTI GIÙ IL FUCILE';holsterButton.hidden=true;holsterButton.addEventListener('click',()=>putAway(game));document.body.appendChild(holsterButton);
 const label=document.querySelector('#mandriaSniperScope .scope-info');if(label)label.textContent='TAB · ESCI DALLA MIRA   ·   INVIO · SPARA   ·   X · RIPONI';
}
const oldRender=THREE.WebGLRenderer.prototype.render;
if(!THREE.WebGLRenderer.prototype.__mandriaV6Scope){THREE.WebGLRenderer.prototype.__mandriaV6Scope=true;
 THREE.WebGLRenderer.prototype.render=function(scene,camera){const g=game;if(scene!==g?.scene||!g?.state?.started||!camera?.isPerspectiveCamera)return oldRender.call(this,scene,camera);
  if(!aiming(g)){if(camera.userData.mandriaOriginalFov!==undefined){camera.fov=camera.userData.mandriaOriginalFov;delete camera.userData.mandriaOriginalFov;camera.updateProjectionMatrix();}return oldRender.call(this,scene,camera);}
  if(camera.userData.mandriaOriginalFov===undefined)camera.userData.mandriaOriginalFov=camera.fov;
  camera.fov=22;camera.updateProjectionMatrix();const s=g.state,eye=s.y+1.69;
  // The existing third-person camera is overwritten *after* the ordinary camera update,
  // exactly for this render. The crosshair is centered along the same yaw used by the target ray.
  camera.position.set(s.x,eye,s.z);camera.lookAt(s.x+Math.sin(s.yaw)*85,eye,s.z+Math.cos(s.yaw)*85);
  const avatars=scene.children.filter(o=>o.userData?.character&&o.visible),gun=g.villaV4Polish?.gun,gunShown=gun?.visible;
  for(const avatar of avatars)avatar.visible=false;if(gun)gun.visible=false;
  try{return oldRender.call(this,scene,camera);}finally{for(const avatar of avatars)avatar.visible=true;if(gun)gun.visible=gunShown;}
 };
}
const previousPopulate=ModernGameplay.prototype.populate,previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV6Scope){ModernGameplay.prototype.__mandriaV6Scope=true;
 ModernGameplay.prototype.populate=function(...args){const out=previousPopulate.apply(this,args);game=this;document.body.classList.remove('mandria-sniper');if(holsterButton)holsterButton.hidden=true;return out;};
 ModernGameplay.prototype.update=function(dt){previousUpdate.call(this,dt);game=this;install();holsterButton.hidden=!this.villaRange?.active||this.state.mode!=='foot'||this.state.paused;
  if(aiming(this)){const scope=document.getElementById('mandriaSniperScope');if(scope){scope.hidden=false;document.body.classList.add('mandria-sniper');}}
 };
}
window.addEventListener('keydown',event=>{if(event.code!=='KeyX'||event.repeat||!game?.villaRange?.active||game.state.paused||document.querySelector('dialog[open]'))return;
 event.preventDefault();event.stopImmediatePropagation();putAway(game);},true);
