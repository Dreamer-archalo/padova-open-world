// Raised villa helipads and an interactive wall ladder. No city geometry is edited.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint,areaLocal} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
const geo=new THREE.BoxGeometry(1,1,1),mats=new Map();
function mat(c){if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.79}));return mats.get(c);}
function box(parent,color,x,y,z,w,h,d){const o=new THREE.Mesh(geo,mat(color));o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=false;o.receiveShadow=false;parent.add(o);return o;}
const point=(u,v)=>areaPoint(VILLA,u,v);
const LADDER=Object.freeze({u:16,v:-5.6,topV:-11.2});
let current=null;
function localBox(root,color,u,y,v,w,h,d){const p=point(u,v);const o=box(root,color,p.x,y,p.z,w,h,d);o.rotation.y=VILLA.yaw;return o;}
function makeRoof(g){const base=g.terrain.height(VILLA.x,VILLA.z),top=base+18.5,root=new THREE.Group();root.name='Mandria · eliporto sul tetto e scala a muro';g.scene.add(root);
 // Low physical deck: above both pitched roof sections, with a stable foot surface.
 localBox(root,'#ae7957',0,top-.14,-19,44,.28,23);
 for(const u of [-19,19])for(const v of [-28,-10])localBox(root,'#d8be91',u,base+15.7,v,.65,5.2,.65);
 for(const u of [-12,12]){
  localBox(root,'#646f67',u,top+.018,-19,14,.04,14);
  for(const [du,dv,w,d] of [[0,0,7,.23],[0,0,.23,7]])localBox(root,'#f7e4ba',u+du,top+.05,-19+dv,w,.035,d);
  for(const side of [-1,1])localBox(root,'#d1b98e',u+side*6.8,top+.30,-19,.18,.42,13.1);
 }
 for(const v of [-30,-8])localBox(root,'#d5bc95',0,top+.48,v,43,.95,.16);
 for(const u of [-22,22])localBox(root,'#d5bc95',u,top+.48,-19,.16,.95,22);
 // A visibly continuous wall ladder: E at the bottom ascends to the deck.
 const bottom=point(LADDER.u,LADDER.v),wall=point(LADDER.u,-7.9);
 for(const du of [-.54,.54])localBox(root,'#515d59',LADDER.u+du,base+9.1,-7.6,.12,18.2,.14);
 for(let h=.6;h<=18;h+=.42)localBox(root,'#d4bb84',LADDER.u,base+h,-7.6,1.12,.075,.19);
 for(const du of [-.7,.7])localBox(root,'#e4cf9f',LADDER.u+du,top+.32,-9.6,.14,.72,3.1);
 const corners=[point(-22,-30.5),point(22,-30.5),point(22,-7.5),point(-22,-7.5)],poly=corners.map(p=>[p.x,p.z]);
 if(!g._mandriaRoofCollider){const collider={p:poly,x:VILLA.x,z:point(0,-19).z,minY:top-.28,y:top-.28,h:.28,solid:true,kind:'gameplay',minX:Math.min(...poly.map(p=>p[0])),maxX:Math.max(...poly.map(p=>p[0])),minZ:Math.min(...poly.map(p=>p[1])),maxZ:Math.max(...poly.map(p=>p[1]))};
  g.collision.add(collider,collider.minX,collider.minZ,collider.maxX,collider.maxZ);g._mandriaRoofCollider=collider;
 }
 const helicopters=[];for(const [u,style] of [[-12,'falco'],[12,'levante']]){
  const c=g.cars.find(c=>c.style===style&&c.fixedSpawn&&/Villa della Mandria/.test(c.name||''));if(!c)continue;
  const p=point(u,-19);Object.assign(c,{x:p.x,z:p.z,y:top+.32,yaw:VILLA.yaw,parked:true,speed:0,estateHelipad:true,vy:0});
  c.home={x:c.x,z:c.z,y:c.y,yaw:c.yaw};g.pose(c);helicopters.push(c);
 }
 return {root,top,base,bottom,wall,helicopters,climbing:null,pendingExit:false,step:0};
}
function prompt(){let button=document.getElementById('mandriaLadderPrompt');if(button)return button;
 const css=document.createElement('style');css.textContent='#mandriaLadderPrompt:not([hidden]){position:fixed;z-index:70;left:50%;top:42%;transform:translateX(-50%);background:#1b2e30f2;color:#fff5d5;border:2px solid #e6c47d;border-radius:12px;padding:11px 18px;font:700 15px system-ui;cursor:pointer;max-width:94vw}';document.head.appendChild(css);
 button=document.createElement('button');button.id='mandriaLadderPrompt';button.type='button';button.textContent='E · SALI ALL’ELIPORTO';button.hidden=true;button.onclick=()=>{if(current)beginClimb(current);};document.body.appendChild(button);return button;
}
function nearLadder(g,roof){return g.state.mode==='foot'&&!g.state.paused&&g.state.y<roof.base+3&&Math.hypot(g.state.x-roof.bottom.x,g.state.z-roof.bottom.z)<3.4;}
function beginClimb(g){const r=g.villaRoof;if(!r||!nearLadder(g,r)||!mandriaFree(g,LADDER.u,LADDER.v,.42,2.5))return false;
 r.climbing={started:g.state.elapsed,from:r.bottom,to:point(LADDER.u,LADDER.topV)};
 g.state.speed=0;g.state.vy=0;g.toast?.('Scala a muro · raggiungi il tetto.',2);return true;
}
function roofStep(g,dt){if(!g.state?.started||!g.villaV4||!g.terrain||!Number.isFinite(dt)||dt<=0)return;
 const distance=Math.hypot(g.state.x-VILLA.x,g.state.z-VILLA.z);
 if(!g.villaRoof){if(distance>260)return;g.villaRoof=makeRoof(g);}const r=g.villaRoof;r.root.visible=distance<410;
 const button=prompt();button.hidden=!nearLadder(g,r)||!!r.climbing||!!document.querySelector('dialog[open]');
 if(r.climbing){if(g.state.mode!=='foot'){r.climbing=null;return;}
  const t=Math.min(1,(g.state.elapsed-r.climbing.started)/3.5),smooth=t*t*(3-2*t),from=r.climbing.from,to=r.climbing.to;
  g.state.x=from.x+(to.x-from.x)*smooth;g.state.z=from.z+(to.z-from.z)*smooth;
  g.state.y=r.base+(r.top-r.base+.12)*smooth;g.state.vy=0;g.state.speed=0;
  if(t>=1){g.state.y=r.top+.12;r.climbing=null;g.toast?.('Eliporto raggiunto · avvicinati all’elicottero e premi E.',3);}
 }
 if(r.pendingExit&&g.state.mode==='foot'){
  const heli=r.helicopters.find(c=>Math.hypot(c.x-g.state.x,c.z-g.state.z)<12);
  if(heli){const side=areaLocal(VILLA,heli.x,heli.z).u<0?-1:1,p=point(side*12,-14);
   g.state.x=p.x;g.state.z=p.z;g.state.y=r.top+.16;g.state.vy=0;g.state.speed=0;
  }r.pendingExit=false;
 }
}
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV4Roof){ModernGameplay.prototype.__mandriaV4Roof=true;
 ModernGameplay.prototype.populate=function(...args){if(this.villaRoof){this.villaRoof.root.parent?.remove(this.villaRoof.root);this.villaRoof=null;}const out=oldPopulate.apply(this,args);current=this;return out;};
 ModernGameplay.prototype.update=function(dt){oldUpdate.call(this,dt);current=this;roofStep(this,dt);};
}
if(typeof window!=='undefined')window.addEventListener('keydown',event=>{
 const g=current,r=g?.villaRoof,s=g?.state;if(!r||!s?.started||s.paused||event.repeat||event.code!=='KeyE'||document.querySelector('dialog[open]'))return;
 if(nearLadder(g,r)){event.preventDefault();event.stopImmediatePropagation();beginClimb(g);return;}
 // The base exit handler otherwise mistakes an elevated pad for mid-air flight.
 // Let it perform the ordinary exit and then lift the player onto the physical deck.
 if(s.mode==='car'&&s.car?.estateHelipad&&Math.abs(s.speed)<1.5&&Math.abs(s.y-r.top)<1.1&&Math.hypot(s.x-VILLA.x,s.z-VILLA.z)<45){
  s.y=g.terrain.height(s.x,s.z);r.pendingExit=true;
 }
},true);
