// Fictional arcade range: visual ray test against five bottles, no live NPC targets.
// TAB aims and ENTER fires only while the range challenge is active on foot.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
import {angleDiff} from './core.js';
const GEO={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,9),sphere:new THREE.SphereGeometry(1,9,6)};
const MAT=new Map();
function mat(c){if(!MAT.has(c))MAT.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.76}));return MAT.get(c);}
function obj(root,type,color,x,y,z,w,h,d){const m=new THREE.Mesh(GEO[type],mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=false;m.receiveShadow=false;root.add(m);return m;}
const box=(...a)=>obj(a[0],'box',...a.slice(1));
const point=(u,v)=>areaPoint(VILLA,u,v);
let activeGame=null;
function clearArea(g,u,v){for(const x of [-9,-5,0,5,9])for(const z of [-17,0,17])if(!mandriaFree(g,u+x,v+z,1.2,3))return false;return true;}
function actor(root,u,y,v){const person=new THREE.Group();const p=point(u,v);person.position.set(p.x,y,p.z);person.rotation.y=VILLA.yaw+Math.PI;
 box(person,'#272d31',0,1.2,0,.55,.8,.35);box(person,'#e9e0d0',0,1.3,.185,.18,.31,.03);box(person,'#29242d',0,1.3,.22,.06,.28,.03);
 box(person,'#b89b83',0,1.72,0,.31,.32,.29);for(const x of [-.17,.17])box(person,'#252a2e',x,.4,0,.19,.8,.21);
 box(person,'#252a2e',.38,1.12,.23,.15,.65,.16);box(person,'#43494a',.35,1.08,.51,.10,.11,.83);person.name='Mandria · guardia addestramento al tiro';root.add(person);return person;}
function build(g){const root=new THREE.Group();root.name='Mandria · poligono sportivo e bersagli';g.villaV4.root.add(root);
 const candidate=[[-76,18],[-77,17],[-74,15],[-79,16]].find(([u,v])=>clearArea(g,u,v));if(!candidate)return {root,ready:false,targets:[],hitCount:0,reward:0,active:false};
 const [u,v]=candidate,base=g.terrain.height(point(u,v).x,point(u,v).z);
 for(const du of [-9,9]){const a=point(u+du,v-15),b=point(u+du,v+16),length=Math.hypot(b.x-a.x,b.z-a.z);
  const line=box(root,'#9a8056',(a.x+b.x)/2,base+.72,(a.z+b.z)/2,.14,1.44,length);line.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);
 }
 for(const dz of [-15,16]){const p=point(u,v+dz);box(root,'#a4895b',p.x,base+.30,p.z,18,.6,.18);}
 const back=point(u,v-14.4);box(root,'#6d624d',back.x,base+1.95,back.z,18.1,3.9,.6);
 const board=point(u,v+13);box(root,'#845d40',board.x,base+1.1,board.z,4.8,2.2,.3);
 box(root,'#e2cc93',board.x,base+1.55,board.z+.2,3.9,.52,.09);
 const station=point(u,v+10),standY=g.terrain.height(station.x,station.z);
 box(root,'#6b4c32',station.x,standY+.58,station.z,2.5,.88,.9);
 box(root,'#292e30',station.x,standY+1.08,station.z,.18,.15,1.6);
 const targets=[];for(let i=0;i<5;i++){const offset=(i-2)*3.05,p=point(u+offset,v-10),y=g.terrain.height(p.x,p.z),group=new THREE.Group();group.position.set(p.x,y,p.z);
  box(group,'#7e6040',0,.62,0,2.1,.2,.8);
  box(group,'#326b59',0,1.03,0,.42,.86,.39);obj(group,'cylinder','#639d8d',0,1.53,0,.30,.28,.30);
  group.name='Mandria · bottiglia bersaglio '+(i+1);root.add(group);targets.push({group,x:p.x,z:p.z,index:i,hit:false});
 }
 const shooters=[];for(const du of [-6.5,6.5]){const p=point(u+du,v+9.5);shooters.push(actor(root,u+du,g.terrain.height(p.x,p.z),v+9.5));}
 const hud=createHud();return {root,ready:true,u,v,station,targets,shooters,hud,hitCount:0,reward:0,active:false,aiming:false,wind:0,lastShot:-100,started:0,shots:0};
}
function createHud(){let e=document.getElementById('mandriaRangeHud');if(e)return e;
 const style=document.createElement('style');style.textContent='#mandriaRangeHud:not([hidden]){position:fixed;left:14px;bottom:12%;z-index:66;max-width:min(430px,90vw);padding:13px 17px;border:2px solid #dabb74;border-radius:12px;color:#f8ebce;background:#152529f2;font:600 14px/1.5 system-ui;box-shadow:0 8px 28px #0009}#mandriaRangeHud b{color:#ffe5a6}';document.head.appendChild(style);
 e=document.createElement('div');e.id='mandriaRangeHud';e.hidden=true;e.setAttribute('role','status');document.body.appendChild(e);return e;
}
function persist(state){try{const saved=JSON.parse(localStorage.getItem('padova-game-v1')||'{}');localStorage.setItem('padova-game-v1',JSON.stringify({...saved,money:state.money,jobs:state.jobs}));}catch{}}
function near(g,r,range=4){return g.state.mode==='foot'&&Math.hypot(g.state.x-r.station.x,g.state.z-r.station.z)<range&&Math.abs(g.state.y-g.terrain.height(r.station.x,r.station.z))<4;}
function start(g){const r=g?.villaRange;if(!r?.ready||!g.state.started||g.state.paused||g.state.mode!=='foot'||g.state.mission||!near(g,r,4.5))return false;
 for(const target of r.targets){target.hit=false;target.group.visible=true;}
 r.active=true;r.aiming=false;r.hitCount=0;r.reward=0;r.shots=0;r.started=g.state.elapsed;r.lastShot=-100;r.wind=Math.sin(g.state.elapsed*.17)*.8;
 const first=r.targets[2];g.state.yaw=Math.atan2(first.x-g.state.x,first.z-g.state.z);
 g.toast?.('MISSIONE · Tiro al bersaglio: 5 bottiglie, €25 ciascuna. TAB mira · INVIO spara.',5);return true;
}
function fire(g){const r=g?.villaRange;if(!r?.active||!r.aiming||g.state.mode!=='foot'||g.state.paused)return false;
 if(g.state.elapsed-r.lastShot<.28)return true;r.lastShot=g.state.elapsed;r.shots++;
 // The crosswind has a small, predictable arcade influence on horizontal aim.
 const wind=Math.sin(g.state.elapsed*.31+r.started*.3)*.8;r.wind=wind;
 const direction=g.state.yaw+wind*.008,ranges=r.targets.filter(t=>!t.hit).map(t=>({target:t,angle:Math.abs(angleDiff(Math.atan2(t.x-g.state.x,t.z-g.state.z),direction)),distance:Math.hypot(t.x-g.state.x,t.z-g.state.z)})).filter(t=>t.distance<48).sort((a,b)=>a.angle-b.angle);
 const hit=ranges[0];if(hit&&hit.angle<.053){hit.target.hit=true;hit.target.group.visible=false;r.hitCount++;r.reward+=25;g.state.money+=25;persist(g.state);
  g.toast?.('Bottiglia '+r.hitCount+'/5 · +€25',1.4);
  if(r.hitCount===5){r.active=false;r.aiming=false;r.completedAt=g.state.elapsed;g.state.jobs++;persist(g.state);g.toast?.('MISSIONE COMPLETATA · 5 bottiglie · +€125',5);}
 }else if(r.shots%3===0)g.toast?.('Mancato! Correggi la mira con A/D.',1.3);
 return true;
}
function tick(g,dt){if(!g.state?.started||!g.villaV4||!Number.isFinite(dt)||dt<=0)return;
 const d=Math.hypot(g.state.x-VILLA.x,g.state.z-VILLA.z);
 if(!g.villaRange){if(d>240)return;g.villaRange=build(g);}const r=g.villaRange;if(!r.ready)return;
 r.root.visible=d<360;
 if(g.state.mode!=='foot'||g.state.paused){r.active=false;r.aiming=false;}
 // Cosmetic target-practice motions for two employees (no damage or projectiles).
 for(const [i,shooter] of r.shooters.entries())shooter.rotation.y=VILLA.yaw+Math.PI+Math.sin(g.state.elapsed*.35+i)*.04;
 const nearby=near(g,r,5.6),show=nearby||r.active;
 r.hud.hidden=!show||g.state.paused||!!document.querySelector('dialog[open]');
 if(show){const wind=r.wind>=0?'→':'←';r.hud.innerHTML=r.active?`<b>MISSIONE · TIRO AL BERSAGLIO</b><br>Bottiglie: ${r.hitCount}/5 · Guadagno: €${r.reward}<br>Vento: ${wind} ${Math.abs(r.wind).toFixed(1)} · TAB ${r.aiming?'mira attiva':'mira'} · INVIO spara · A/D ruota`:nearby?'<b>POLIGONO DELLA TENUTA</b><br>Premi E per prendere il fucile e iniziare la missione. 5 bottiglie · €25 ciascuna.':'';}
}
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV4Range){ModernGameplay.prototype.__mandriaV4Range=true;
 ModernGameplay.prototype.populate=function(...args){if(this.villaRange){this.villaRange.root.parent?.remove(this.villaRange.root);this.villaRange=null;}const out=oldPopulate.apply(this,args);activeGame=this;return out;};
 ModernGameplay.prototype.update=function(dt){oldUpdate.call(this,dt);activeGame=this;tick(this,dt);};
}
if(typeof window!=='undefined')window.addEventListener('keydown',event=>{
 const g=activeGame,r=g?.villaRange,s=g?.state;if(!r?.ready||!s?.started||s.paused||event.repeat||document.querySelector('dialog[open]'))return;
 if(event.code==='KeyE'&&near(g,r,4.5)&&!r.active){if(start(g)){event.preventDefault();event.stopImmediatePropagation();}return;}
 if(!r.active)return;
 if(event.code==='Tab'){event.preventDefault();event.stopImmediatePropagation();r.aiming=!r.aiming;return;}
 if(event.code==='Enter'){event.preventDefault();event.stopImmediatePropagation();fire(g);}
},true);
