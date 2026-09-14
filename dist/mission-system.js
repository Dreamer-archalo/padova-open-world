import * as THREE from './vendor/three.module.js';
import {dist,project,roadRoute} from './core.js';
import {taxiFare} from './taxi-service.js';

const BIKE_COURSES=[
 {name:'Euganeo Slalom',start:project(45.4352,11.8564)},
 {name:'Zona Est Sprint',start:project(45.4104,11.9390)},
 {name:'Arcella Switchback',start:project(45.4352,11.8825)},
 {name:'Sud / Albignasego Run',start:project(45.3748,11.8695)}
];
const BASE_TARGETS={
 delivery:{name:'Piazza delle Erbe',x:-150,z:-49,requires:'car'},
 race:{name:'Prato della Valle',x:-115,z:960,requires:'car'}
};
function bikeReady(state){const c=state.car;return state.mode==='car'&&!!c&&(!!c.spec?.bike||c.spec?.width<1.2||['motorcycle','scooter','cruiser','trail'].includes(c.style));}
function requirementMet(state,kind){return kind==='bike'?bikeReady(state):kind==='car'?state.mode==='car':true;}
function writeMoney(value){try{const saved=JSON.parse(localStorage.getItem('padova-game-v1')||'{}');saved.money=value;localStorage.setItem('padova-game-v1',JSON.stringify(saved));}catch{}}
function taxiKey(target){return Math.round(target.x)+'|'+Math.round(target.z);}
function sample(path,spacing=78){
 if(path.length<2)return path;const out=[path[0]];let carry=0;
 for(let i=1;i<path.length;i++){let a={...path[i-1]},b=path[i],len=dist(a,b);while(carry+len>=spacing){const need=spacing-carry,t=need/Math.max(.001,len),p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};out.push(p);a=p;len=dist(a,b);carry=0;}carry+=len;}
 out.push(path.at(-1));return out;
}

export class MissionSystem{
 constructor(){this.game=null;this.pending=null;this.guideRoot=null;this.bound=false;this.taxiTransaction=null;this.bind();}
 bind(){
  if(this.bound)return;this.bound=true;
  document.addEventListener('click',event=>{
   const button=event.target?.closest?.('[data-bike-course],[data-mission]');if(!button||!this.game||this.pending?.bypass)return;
   const info=this.infoFor(button);if(!info||dist(this.game.state,info.target)<32)return;
   event.preventDefault();event.stopImmediatePropagation();
   const action=typeof button.onclick==='function'?button.onclick.bind(button):null;
   this.openTravelChoice(info,action);
  },true);
 }
 infoFor(button){
  if(button.dataset.bikeCourse!==undefined){const i=Number(button.dataset.bikeCourse),course=BIKE_COURSES[i];if(!course)return null;return {target:{...course.start,name:'START · '+course.name},label:course.name,requires:'bike'};}
  const target=BASE_TARGETS[button.dataset.mission];return target?{target,label:target.name,requires:target.requires}:null;
 }
 openTravelChoice(info,action){
  const game=this.game,menu=document.getElementById('menu'),title=document.getElementById('menuTitle'),content=document.getElementById('menuContent');if(!menu||!content)return;
  const d=dist(game.state,info.target),fare=taxiFare(game.state,info.target);
  if(title)title.textContent='Raggiungi la missione';
  content.innerHTML=`<p class="about-copy"><strong>${info.label}</strong><br>${Math.round(d)} m dalla posizione attuale.</p><div class="activities"><button class="activity" id="missionTaxi"><span><b>TAXI</b><small>Corsa automatica · stima €${fare}</small></span></button><button class="activity" id="missionDrive"><span><b>GUIDA AUTONOMA</b><small>Percorso su minimappa + waypoint 3D</small></span></button></div>`;
  document.getElementById('missionTaxi').onclick=()=>this.startTaxi(info,action,fare);
  document.getElementById('missionDrive').onclick=()=>this.startGuide(info,action);
 }
 startGuide(info,action){
  const game=this.game,path=roadRoute(game.state,info.target,game.graph);
  if(path.length<2){game.toast('Percorso stradale non disponibile per questa missione.',4);return;}
  game.state.waypoint={...info.target,missionGuide:true};game.state.route=path;this.buildGuides(path);
  document.getElementById('menu')?.close();game.state.paused=false;
  this.pending={mode:'drive',target:info.target,action,requires:info.requires};
  game.toast('Navigatore attivo · segui la linea e i waypoint 3D.',4);
 }
 startTaxi(info,action,fare){
  const game=this.game,key=taxiKey(info.target);
  if(this.pending?.mode==='taxi'||this.taxiTransaction?.active){game.toast('Taxi già in partenza · il prezzo viene addebitato una sola volta.',2);return;}
  if(game.state.money<fare){game.toast('Fondi insufficienti per il taxi.',4);return;}
  this.taxiTransaction={active:true,key,fare,chargedAt:game.state.elapsed};
  game.state.money-=fare;writeMoney(game.state.money);
  document.getElementById('menu')?.close();game.state.paused=false;
  this.clearGuides();this.pending={mode:'taxi',target:info.target,action,requires:info.requires,arriveAt:game.state.elapsed+2.4,transaction:key};
  game.toast('Taxi · €'+fare+' · trasferimento verso '+info.label+'.',3);
 }
 transfer(game,target){
  const spec=game.state.car?.spec||null,road=game.safeRoad(target,spec,game.state.car),p=road||target;
  const y=p.y??game.terrain.height(p.x,p.z),yaw=p.yaw??game.state.yaw;
  Object.assign(game.state,{x:p.x,z:p.z,y,yaw,speed:0,vy:0,waypoint:null,route:[]});
  if(game.state.car){Object.assign(game.state.car,{x:p.x,z:p.z,y,yaw,speed:0});game.pose(game.state.car);}
 }
 invoke(action){if(!action)return;this.pending.bypass=true;try{action();}finally{queueMicrotask(()=>{if(this.pending)this.pending.bypass=false;});}}
 buildGuides(path){
  this.clearGuides();const game=this.game,points=sample(path).slice(1,-1).slice(0,48);if(!points.length)return;
  const geo=new THREE.TorusGeometry(1.25,.13,6,12),mat=new THREE.MeshBasicMaterial({color:'#ffc56a',transparent:true,opacity:.78,depthWrite:false}),inst=new THREE.InstancedMesh(geo,mat,points.length),dummy=new THREE.Object3D();
  for(let i=0;i<points.length;i++){const p=points[i];dummy.position.set(p.x,game.terrain.height(p.x,p.z)+1.45,p.z);dummy.rotation.x=Math.PI/2;dummy.scale.setScalar(i%3===0?1.25:1);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);}
  const root=new THREE.Group();root.name='mission-navigation-waypoints';root.add(inst);game.scene.add(root);this.guideRoot=root;
 }
 clearGuides(){if(this.guideRoot&&this.game){this.game.scene.remove(this.guideRoot);this.guideRoot.traverse(o=>{if(o.isMesh){o.geometry?.dispose?.();o.material?.dispose?.();}});}this.guideRoot=null;}
 update(game){
  this.game=game;const p=this.pending;if(!p)return;
  if(p.mode==='taxi'&&game.state.elapsed>=p.arriveAt){
   this.transfer(game,p.target);const action=p.action,ready=requirementMet(game.state,p.requires);this.pending=null;this.taxiTransaction=null;
   if(ready){this.pending={bypass:false};this.invoke(action);this.pending=null;}else game.toast('Arrivato alla missione. Preparati con il veicolo richiesto e selezionala di nuovo.',5);
   return;
  }
  if(p.mode==='drive'&&dist(game.state,p.target)<22){
   const action=p.action,ready=requirementMet(game.state,p.requires);this.clearGuides();
   if(game.state.waypoint?.missionGuide){game.state.waypoint=null;game.state.route=[];}
   this.pending=null;
   if(ready){this.pending={bypass:false};this.invoke(action);this.pending=null;}else game.toast('Destinazione raggiunta. Usa il veicolo richiesto per avviare la missione.',4);
  }
 }
}
