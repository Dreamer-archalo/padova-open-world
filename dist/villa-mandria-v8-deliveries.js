// An occasional private supplier enters by the approved gate, asks permission,
// physically unloads three boxes and leaves. Never uses public-road AI routing.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
const at=(u,v)=>areaPoint(VILLA,u,v);
const ENTRY={u:-3,v:55},BAY={u:-3,v:42},DRIVER={u:-7,v:41},STORAGE={u:-13,v:36};
let game=null,button=null,dialog=null;
function clearPath(g,start,end,r=.8){const n=Math.max(1,Math.ceil(Math.hypot(end.u-start.u,end.v-start.v)));
 let previous=null;for(let i=0;i<=n;i++){const u=start.u+(end.u-start.u)*i/n,v=start.v+(end.v-start.v)*i/n,p=at(u,v),h=g.terrain.height(p.x,p.z);
  if(!mandriaFree(g,u,v,r,4.2)||!Number.isFinite(h)||previous!==null&&Math.abs(h-previous)>.5)return false;previous=h;
 }return true;}
function createDriver(g){const p=at(DRIVER.u,DRIVER.v),o=new THREE.Group();o.position.set(p.x,g.terrain.height(p.x,p.z),p.z);
 const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.85});
 for(const [x,y,z,w,h,d,color] of [[0,1.1,0,.55,.82,.4,'#4b5960'],[0,1.7,0,.32,.33,.3,'#c4a183'],[-.17,.38,0,.20,.75,.2,'#34383a'],[.17,.38,0,.20,.75,.2,'#34383a']]){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);o.add(m);
 }
 const cargo=new THREE.Mesh(new THREE.BoxGeometry(.68,.55,.60),mat('#a37c4d'));cargo.position.set(0,1.1,.48);cargo.visible=false;o.add(cargo);
 o.name='Mandria · autista fornitore';g.scene.add(o);return {obj:o,cargo};}
function install(){if(button)return;
 const css=document.createElement('style');css.textContent=`#mandriaDeliveryPrompt:not([hidden]){position:fixed;z-index:82;left:50%;bottom:29%;transform:translateX(-50%);background:#223e3cf2;color:#fff3d7;border:2px solid #ddbc78;border-radius:11px;padding:12px 17px;font:700 14px system-ui;cursor:pointer}#mandriaDeliveryDialog{max-width:min(480px,90vw);background:#f7ebd2;color:#213938;border:2px solid #bd915c;border-radius:14px;padding:20px;font:16px/1.4 system-ui}#mandriaDeliveryDialog::backdrop{background:#06151cce}#mandriaDeliveryDialog button{display:block;width:100%;margin-top:10px;padding:11px;border:1px solid #9c794d;border-radius:8px;background:#fff;color:#213938;font:600 14px system-ui;cursor:pointer}`;document.head.appendChild(css);
 button=document.createElement('button');button.id='mandriaDeliveryPrompt';button.type='button';button.hidden=true;button.textContent='E · AUTISTA: AUTORIZZI LO SCARICO?';button.onclick=open;document.body.appendChild(button);
 dialog=document.createElement('dialog');dialog.id='mandriaDeliveryDialog';dialog.innerHTML='<h2>Forniture della tenuta</h2><p>Patrón, porto tre casse già registrate. Mi autorizza a scaricarle nella zona di servizio?</p><button data-choice="yes">Sì. Scarica le casse nel deposito.</button><button data-choice="later">Aspetta: torna a chiedermelo.</button><button data-choice="no">No. Riporta la merce al fornitore.</button><button data-choice="close">Chiudi</button>';document.body.appendChild(dialog);
 dialog.addEventListener('click',e=>{const action=e.target?.dataset?.choice;if(!action)return;const d=game?.villaV8Delivery?.active;
  if(d&&action==='yes'){d.phase='unload';d.trip=0;d.progress=0;d.driver.cargo.visible=true;game.toast?.('Scarico autorizzato: tre casse verranno trasferite.',3);}
  if(d&&action==='no'){d.phase='exit';d.progress=0;game.toast?.('Consegna respinta: il camion lascia la proprietà.',2.5);}
  if(d&&action==='later')game.toast?.('L’autista aspetta il suo permesso.',2.5);
  dialog.close();});}
function nearDriver(g){const d=g?.villaV8Delivery?.active,s=g?.state;
 return !!(d?.phase==='permission'&&s?.started&&s.mode==='foot'&&!s.paused&&Math.hypot(s.x-d.driver.obj.position.x,s.z-d.driver.obj.position.z)<4.2);}
function open(){if(!game||!nearDriver(game)||dialog.open||document.querySelector('dialog[open]'))return;dialog.showModal();}
function place(g,c,u,v,yaw=VILLA.yaw){const p=at(u,v);c.x=p.x;c.z=p.z;c.y=g.terrain.height(p.x,p.z);c.yaw=yaw;c.speed=0;g.pose(c);}
function spawn(g){if(!clearPath(g,ENTRY,BAY,1.6)||!clearPath(g,DRIVER,STORAGE,.65))return false;
 const p=at(ENTRY.u,ENTRY.v),truck=g.addCar(p.x,p.z,VILLA.yaw,false,true,'truck');
 Object.assign(truck,{name:'Mandria · camion fornitore autorizzato',fixedSpawn:true,estateAuthorized:true,parked:true,speed:0});
 place(g,truck,ENTRY.u,ENTRY.v);const driver=createDriver(g);driver.obj.visible=false;
 g.villaV8Delivery.active={truck,driver,phase:'enter',progress:0,trip:0};return true;}
function advance(g,c,a,b,progress){
 const start=at(a.u,a.v),end=at(b.u,b.v);
 // areaPoint returns {x,z}, not a THREE.Vector3. Interpolate its actual
 // world coordinates; the former start.clone().lerp() crashed every frame.
 c.x=start.x+(end.x-start.x)*progress;
 c.z=start.z+(end.z-start.z)*progress;
 c.y=g.terrain.height(c.x,c.z);
 c.yaw=Math.atan2(end.x-start.x,end.z-start.z);c.speed=0;g.pose(c);
}
function progress(g,d,dt){const safe=Math.min(dt,.08);
 if(d.phase==='enter'||d.phase==='exit'){
  const from=d.phase==='enter'?ENTRY:BAY,to=d.phase==='enter'?BAY:ENTRY;
  const distance=Math.hypot(from.u-to.u,from.v-to.v);d.progress=Math.min(1,d.progress+safe*2.15/distance);
  advance(g,d.truck,from,to,d.progress);
  if(d.progress>=1){if(d.phase==='enter'){d.phase='permission';d.progress=0;d.driver.obj.visible=true;}
   else{g.remove(d.truck);d.driver.obj.parent?.remove(d.driver.obj);g.villaV8Delivery.active=null;g.villaV8Delivery.nextAt=g.state.elapsed+155;}}
  return;
 }
 if(d.phase!=='unload')return;
 const walkingOut=d.progress<1,from=walkingOut?DRIVER:STORAGE,to=walkingOut?STORAGE:DRIVER;
 const t=walkingOut?d.progress:d.progress-1,p=at(from.u+(to.u-from.u)*t,from.v+(to.v-from.v)*t);
 d.driver.obj.position.set(p.x,g.terrain.height(p.x,p.z),p.z);d.driver.obj.rotation.y=Math.atan2(at(to.u,to.v).x-at(from.u,from.v).x,at(to.u,to.v).z-at(from.u,from.v).z);
 d.driver.cargo.visible=walkingOut;
 d.progress+=safe*.95/Math.hypot(DRIVER.u-STORAGE.u,DRIVER.v-STORAGE.v);
 if(d.progress>=1&&walkingOut){d.driver.cargo.visible=false;g.toast?.('Cassa '+(d.trip+1)+'/3 scaricata.',1.6);}
 if(d.progress>=2){d.progress=0;d.trip++;if(d.trip>=3){d.phase='exit';d.driver.obj.visible=false;d.driver.cargo.visible=false;d.progress=0;g.toast?.('Scarico terminato. Il camion riparte.',2.5);}}
}
const beforePopulate=ModernGameplay.prototype.populate,beforeUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV8Deliveries){
 ModernGameplay.prototype.__mandriaV8Deliveries=true;
 ModernGameplay.prototype.populate=function(...args){if(this.villaV8Delivery?.active){this.villaV8Delivery.active.driver.obj.parent?.remove(this.villaV8Delivery.active.driver.obj);}this.villaV8Delivery=null;return beforePopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){beforeUpdate.call(this,dt);game=this;
  if(!this.state?.started||!this.villaV3)return;
  // An already approaching supplier keeps moving when the player leaves the
  // villa: the permission notification must be able to arrive anywhere in game.
  const close=Math.hypot(this.state.x-VILLA.x,this.state.z-VILLA.z)<=330;
  if(!close&&!this.villaV8Delivery?.active){if(button)button.hidden=true;return;}
  install();this.villaV8Delivery??={active:null,nextAt:this.state.elapsed+30};const manager=this.villaV8Delivery;
  if(close&&!manager.active&&this.state.elapsed>=manager.nextAt){if(!spawn(this))manager.nextAt=this.state.elapsed+70;}
  if(manager.active&&Number.isFinite(dt)&&dt>0)progress(this,manager.active,dt);
  button.hidden=!nearDriver(this)||dialog.open||!!document.querySelector('dialog[open]');
 };
}
window.addEventListener('keydown',event=>{if(event.code!=='KeyE'||event.repeat||!nearDriver(game))return;
 if(!document.querySelector('dialog[open]')){event.preventDefault();event.stopImmediatePropagation();open();}
},true);
