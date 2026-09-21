// Estate-only two-axis scope and two optional bullseye targets.
// The original five-bottle challenge and global vehicle controls remain intact.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint} from './gameplay-areas.js';
const at=(u,v)=>areaPoint(VILLA,u,v);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
let game=null,dragging=false,seenShots=-1,seenRound=-1;
const held=new Set();
function aiming(){const g=game,s=g?.state,r=g?.villaRange;return !!(s?.started&&s.mode==='foot'&&!s.paused&&r?.active&&r.aiming&&!document.querySelector('dialog[open]'));}
function bullseyeTexture(){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,256,256);
 const rings=[['#141414',119],['#f4eee3',105],['#c82d30',86],['#f4eee3',65],['#161616',47],['#c82d30',26],['#151515',8]];
 for(const [color,radius] of rings){ctx.beginPath();ctx.arc(128,128,radius,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
let targetTexture=null;
function setupTargets(g){const r=g.villaRange;if(!r?.ready||r.v8Boards)return;
 targetTexture??=bullseyeTexture();const boards=[];
 for(const [i,u] of [-7.65,7.65].entries()){
  const pos=at(r.u+u,r.v-11.5),y=g.terrain.height(pos.x,pos.z),group=new THREE.Group();
  group.position.set(pos.x,y,pos.z);group.rotation.y=VILLA.yaw;
  const post=new THREE.Mesh(new THREE.BoxGeometry(.11,2.35,.12),new THREE.MeshStandardMaterial({color:0x6e523b}));post.position.y=1.18;group.add(post);
  const face=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.7),new THREE.MeshBasicMaterial({map:targetTexture,transparent:true,side:THREE.DoubleSide}));
  face.position.set(0,1.85,.12);group.add(face);group.name='Mandria · bersaglio circolare '+(i+1);r.root.add(group);
  boards.push({group,x:pos.x,z:pos.z,y:y+1.85,hit:false});
 }
 r.v8Boards=boards;r.v8BoardHits=0;r.v8Pitch=0;}
function resetRound(r){if(r.started===seenRound)return;seenRound=r.started;seenShots=r.shots;
 r.v8Pitch=0;r.v8BoardHits=0;for(const b of r.v8Boards||[]){b.hit=false;b.group.visible=true;}}
function registerBonus(g){const r=g.villaRange;if(!r?.v8Boards||!r.aiming)return;
 const eye=g.state.y+1.69,pitch=r.v8Pitch||0;
 const available=r.v8Boards.filter(b=>!b.hit).map(b=>{
  const distance=Math.hypot(b.x-g.state.x,b.z-g.state.z);
  return {board:b,azimuth:Math.abs(angle(Math.atan2(b.x-g.state.x,b.z-g.state.z),g.state.yaw)),elevation:Math.abs(Math.atan2(b.y-eye,distance)-pitch),distance};
 }).filter(b=>b.distance<55&&b.azimuth<.038&&b.elevation<.049).sort((a,b)=>a.azimuth+a.elevation-b.azimuth-b.elevation);
 if(!available.length)return;
 const board=available[0].board;board.hit=true;board.group.children[1].material=new THREE.MeshBasicMaterial({color:0x438261,side:THREE.DoubleSide});
 r.v8BoardHits++;g.state.money+=20;
 try{const key='padova-game-v1',saved=JSON.parse(localStorage.getItem(key)||'{}');localStorage.setItem(key,JSON.stringify({...saved,money:g.state.money,jobs:g.state.jobs}));}catch{}
 g.toast?.('Centro del bersaglio '+r.v8BoardHits+'/2 · +€20',2.2);
}
// v6 positions the actual game camera on the player's eyes. This additional
// wrapper changes only its vertical look direction, never hangar preview cameras.
const previousProjection=THREE.PerspectiveCamera.prototype.updateProjectionMatrix;
if(!THREE.PerspectiveCamera.prototype.__mandriaV8Pitch){
 THREE.PerspectiveCamera.prototype.__mandriaV8Pitch=true;
 THREE.PerspectiveCamera.prototype.updateProjectionMatrix=function(...args){
  const result=previousProjection.apply(this,args);
  if(!aiming()||this.far<300)return result;
  const s=game.state,pitch=game.villaRange.v8Pitch||0,eye=s.y+1.69;
  this.lookAt(s.x+Math.sin(s.yaw)*Math.cos(pitch)*85,eye+Math.sin(pitch)*85,s.z+Math.cos(s.yaw)*Math.cos(pitch)*85);
  if(game.mandriaScopeFrame)game.mandriaScopeFrame.pitch=pitch;
  return result;
 };
}
window.addEventListener('keydown',event=>{
 if(!aiming()||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))return;
 held.add(event.code);event.preventDefault();event.stopImmediatePropagation();
},true);
window.addEventListener('keyup',event=>{if(held.delete(event.code)){event.preventDefault();event.stopImmediatePropagation();}},true);
window.addEventListener('blur',()=>{held.clear();dragging=false;});
window.addEventListener('pointerdown',event=>{
 if(event.button!==0||event.target?.id!=='world'||!aiming())return;
 dragging=true;event.preventDefault();
},true);
window.addEventListener('pointermove',event=>{
 if(!dragging||!aiming())return;const s=game.state,r=game.villaRange;
 s.yaw+=event.movementX*.0035;r.v8Pitch=clamp((r.v8Pitch||0)-event.movementY*.0035,-.64,.64);
 event.preventDefault();
},true);
window.addEventListener('pointerup',()=>{dragging=false;},true);
window.addEventListener('pointercancel',()=>{dragging=false;},true);
const previousPopulate=ModernGameplay.prototype.populate,previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV8ScopeTargets){
 ModernGameplay.prototype.__mandriaV8ScopeTargets=true;
 ModernGameplay.prototype.populate=function(...args){game=this;seenRound=-1;seenShots=-1;held.clear();dragging=false;return previousPopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){previousUpdate.call(this,dt);game=this;
  const r=this.villaRange;if(!this.state?.started||!r?.ready)return;setupTargets(this);
  if(!r.active){held.clear();dragging=false;return;}
  resetRound(r);
  if(aiming()&&Number.isFinite(dt)&&dt>0){
   const step=Math.min(dt,.07);this.state.yaw+=((held.has('ArrowRight')?1:0)-(held.has('ArrowLeft')?1:0))*step*.95;
   r.v8Pitch=clamp((r.v8Pitch||0)+((held.has('ArrowUp')?1:0)-(held.has('ArrowDown')?1:0))*step*.85,-.64,.64);
  }
  if(r.shots!==seenShots){if(r.shots>seenShots&&r.active)registerBonus(this);seenShots=r.shots;}
  const info=document.querySelector('#mandriaSniperScope .scope-info');
  if(info&&aiming())info.textContent='FRECCE · MIRA ORIZZONTALE/VERTICALE · TRASCINA MOUSE · INVIO SPARA · TAB ESCI · X RIPONI';
 };
}
