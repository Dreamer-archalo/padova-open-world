// Estate-only interaction and presentation corrections. Main world inputs remain unchanged.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint} from './gameplay-areas.js';
let current=null,scope=null,down=null;
const bgeo=new THREE.BoxGeometry(1,1,1),cgeo=new THREE.CylinderGeometry(1,1,1,12);
const mats=new Map();function material(c){if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,metalness:.25,roughness:.57}));return mats.get(c);}
function part(parent,geo,color,x,y,z,w,h,d){const o=new THREE.Mesh(geo,material(color));o.position.set(x,y,z);o.scale.set(w,h,d);parent.add(o);return o;}
function setup(){if(scope)return;
 const css=document.createElement('style');css.textContent=`
 #mandriaSniperScope[hidden]{display:none!important}#mandriaSniperScope{position:fixed;inset:0;z-index:650;pointer-events:none;background:radial-gradient(circle 129px at 50% 50%,transparent 0 127px,#050708 130px 100%)}
 #mandriaSniperScope .scope-ring{position:absolute;left:50%;top:50%;width:258px;height:258px;transform:translate(-50%,-50%);border:2px solid #191e20;border-radius:50%;box-shadow:inset 0 0 18px #000a,0 0 0 1px #687370}
 #mandriaSniperScope .scope-ring:before,#mandriaSniperScope .scope-ring:after{content:'';position:absolute;background:#111c1e;opacity:.85}
 #mandriaSniperScope .scope-ring:before{width:1px;height:90%;left:50%;top:5%}#mandriaSniperScope .scope-ring:after{height:1px;width:90%;top:50%;left:5%}
 #mandriaSniperScope .scope-dot{position:absolute;left:50%;top:50%;width:5px;height:5px;transform:translate(-50%,-50%);background:#d85036;border-radius:50%;box-shadow:0 0 0 1px #111}
 #mandriaSniperScope .scope-info{position:absolute;top:calc(50% + 143px);left:50%;transform:translateX(-50%);color:#e9e5d8;white-space:nowrap;font:700 12px system-ui;letter-spacing:.06em}
 body.mandria-sniper #playingUI .hud,body.mandria-sniper .topbar,body.mandria-sniper #credits,body.mandria-sniper #interact,body.mandria-sniper #targetDistance,body.mandria-sniper #mandriaRangeHud,body.mandria-sniper #mandriaHangarButton,body.mandria-sniper #mandriaMountPrompt,body.mandria-sniper #mandriaLadderPrompt,body.mandria-sniper #mandriaWorkerPrompt,body.mandria-sniper #touchControls{visibility:hidden!important}
 #mandriaRoofDescend:not([hidden]){position:fixed;left:50%;top:42%;transform:translateX(-50%);z-index:72;background:#243a3bf5;color:#fbe6b8;border:2px solid #f0c573;border-radius:12px;padding:11px 17px;font:700 15px system-ui;cursor:pointer}
 `;document.head.appendChild(css);
 scope=document.createElement('div');scope.id='mandriaSniperScope';scope.hidden=true;scope.setAttribute('aria-label','Mirino circolare');scope.innerHTML='<div class="scope-ring"></div><div class="scope-dot"></div><span class="scope-info">TAB · ESCI DALLA MIRA &nbsp; INVIO · SPARA</span>';document.body.appendChild(scope);
 down=document.createElement('button');down.type='button';down.id='mandriaRoofDescend';down.textContent='E · SCENDI DALL’ELIPORTO';down.hidden=true;down.addEventListener('click',()=>{if(current)descend(current);});document.body.appendChild(down);
}
function addRifle(g){const p=g.villaV4Polish;if(!p?.gun||p.gun.userData.v5Rifle)return;
 const gun=p.gun;gun.userData.v5Rifle=true;
 // Distinct stock, fore-end, barrel, magazine, sight and scope, not a rectangular baton.
 part(gun,bgeo,'#754f33',.27,1.24,-.47,.24,.23,.68);
 part(gun,bgeo,'#20292e',.27,1.29,.65,.145,.135,1.3);
 const barrel=part(gun,cgeo,'#111b21',.27,1.29,1.30,.052,.75,.052);barrel.rotation.x=Math.PI/2;
 part(gun,bgeo,'#584632',.27,1.22,.28,.19,.17,.47);
 const magazine=part(gun,bgeo,'#1d2427',.27,1.00,.13,.15,.45,.24);magazine.rotation.x=-.22;
 part(gun,bgeo,'#11181b',.27,1.46,.38,.10,.14,.56);
 const optic=part(gun,cgeo,'#181f23',.27,1.59,.39,.13,.41,.13);optic.rotation.x=Math.PI/2;
 part(gun,bgeo,'#131b20',.27,1.29,1.66,.09,.17,.08);
 for(const person of g.villaRange?.shooters||[]){if(person.userData.v5Rifle)continue;person.userData.v5Rifle=true;
  part(person,bgeo,'#6e4c31',.35,1.08,-.10,.18,.19,.62);
  const tube=part(person,cgeo,'#182328',.35,1.08,.80,.07,1.05,.07);tube.rotation.x=Math.PI/2;
  part(person,bgeo,'#1c2328',.35,1.21,.32,.1,.17,.33);
 }
}
function smallerTargets(g){const r=g.villaRange;if(!r?.ready||r.v5SmallTargets)return;r.v5SmallTargets=true;
 for(const t of r.targets){const [stand,bottle,neck]=t.group.children;if(!stand||!bottle||!neck)continue;
  bottle.scale.x*=.58;bottle.scale.z*=.58;bottle.scale.y*=.80;
  neck.scale.x*=.57;neck.scale.z*=.57;neck.scale.y*=.78;neck.position.y=1.43;
 }
}
const topPosition=()=>areaPoint(VILLA,16,-11.2);
function topNearby(g){const r=g.villaRoof,s=g.state;if(!r||s.mode!=='foot'||s.paused||!s.started||r.climbing)return false;
 const p=topPosition();return Math.abs(s.y-r.top)<2.2&&Math.hypot(s.x-p.x,s.z-p.z)<4.2;}
function descend(g){if(!topNearby(g)||g.villaV5Descent)return false;const r=g.villaRoof,s=g.state;
 g.villaV5Descent={started:s.elapsed,from:{x:s.x,z:s.z,y:s.y},to:{x:r.bottom.x,z:r.bottom.z,y:g.terrain.height(r.bottom.x,r.bottom.z)}};
 s.speed=0;s.vy=0;down.hidden=true;g.toast?.('Scala di discesa · ritorno al giardino.',2);return true;
}
function update(g,dt){if(!g.state?.started)return;setup();const r=g.villaRange;
 smallerTargets(g);addRifle(g);
 const aiming=!!r?.active&&r.aiming&&g.state.mode==='foot'&&!g.state.paused&&!document.querySelector('dialog[open]');
 scope.hidden=!aiming;document.body.classList.toggle('mandria-sniper',aiming);
 if(down)down.hidden=!topNearby(g)||!!g.villaV5Descent||!!document.querySelector('dialog[open]');
 const travel=g.villaV5Descent;if(travel&&Number.isFinite(dt)&&dt>0){if(g.state.mode!=='foot'){g.villaV5Descent=null;return;}
  const t=Math.min(1,Math.max(0,(g.state.elapsed-travel.started)/3.5)),ease=t*t*(3-2*t);
  g.state.x=travel.from.x+(travel.to.x-travel.from.x)*ease;g.state.z=travel.from.z+(travel.to.z-travel.from.z)*ease;
  g.state.y=travel.from.y+(travel.to.y-travel.from.y)*ease;g.state.speed=0;g.state.vy=0;
  if(t>=1){g.state.y=g.terrain.height(g.state.x,g.state.z);g.villaV5Descent=null;g.toast?.('Sei tornato nel giardino.',2);}
 }
}
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV5Controls){ModernGameplay.prototype.__mandriaV5Controls=true;
 ModernGameplay.prototype.populate=function(...args){const out=oldPopulate.apply(this,args);this.villaV5Descent=null;current=this;document.body.classList.remove('mandria-sniper');if(scope)scope.hidden=true;return out;};
 ModernGameplay.prototype.update=function(dt){oldUpdate.call(this,dt);current=this;update(this,dt);};
}
if(typeof window!=='undefined')window.addEventListener('keydown',event=>{
 const g=current,s=g?.state;if(!s?.started||s.paused||event.repeat||document.querySelector('dialog[open]'))return;
 if(event.code==='KeyE'&&topNearby(g)){event.preventDefault();event.stopImmediatePropagation();descend(g);return;}
 if(event.code!=='Space'||s.mode!=='car'||s.car?.mandriaPatrol!=='mounted'||!s.car?.estateHorse||s.health<=0)return;
 event.preventDefault();event.stopImmediatePropagation();const c=s.car,j=c.jump??={airborne:false,vx:0,vz:0,vy:0,ramp:null,groundVy:0};
 if(j.airborne||Math.abs(s.speed)<.2)return;
 j.airborne=true;j.vx=Math.sin(s.yaw)*s.speed;j.vz=Math.cos(s.yaw)*s.speed;j.vy=6.7;j.lastX=s.x;j.lastZ=s.z;
 s.y+=.12;c.jump=j;c.y=s.y;g.toast?.('Cavallo · salto',1.4);
},true);
