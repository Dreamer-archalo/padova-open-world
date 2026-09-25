// Padova river marinas: snap only to real navigable OSM water segments.
// Never turn city roads into rivers or create boats in Prato della Valle.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {project} from './core.js';
import {BOAT_SPECS,createBoatModel} from './nautical-catalog.js';
const DOCK_CANDIDATES=[
 {name:'Portello · Piovego',lat:45.4095,lon:11.8929},
 {name:'Ponte Molino · centro',lat:45.4117,lon:11.8738},
 {name:'Bassanello · Bacchiglione',lat:45.3902,lon:11.8755},
 {name:'Brusegana · fluviale',lat:45.4008,lon:11.8495},
 {name:'Stanga · Piovego',lat:45.4210,lon:11.9005}
];
const piers=new WeakMap();let live=null,menu=null,button=null;
export function nearestWaterSegment(waters,p,minWidth=7,maxDistance=550){
 let best=null,score=Infinity;
 for(const w of waters||[]){if(w.tunnel||w.layer<0||w.w<minWidth||!Array.isArray(w.p))continue;
  for(let i=1;i<w.p.length;i++){
   const a=w.p[i-1],b=w.p[i],dx=b[0]-a[0],dz=b[1]-a[1],len2=dx*dx+dz*dz;if(len2<16)continue;
   const t=Math.max(.12,Math.min(.88,((p.x-a[0])*dx+(p.z-a[1])*dz)/len2));
   const x=a[0]+dx*t,z=a[1]+dz*t,d=Math.hypot(x-p.x,z-p.z);
   const rank=d+Math.abs(w.w-17)*.16;
   if(d<=maxDistance&&rank<score){score=rank;best={x,z,yaw:Math.atan2(dx,dz),width:w.w,distance:d};}
  }
 }
 return best;
}
function dockModel(g,dock){
 const root=new THREE.Group();root.name='DARSENA · '+dock.name;
 const make=(col,x,y,z,w,h,l)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),new THREE.MeshStandardMaterial({color:col,roughness:.89}));m.position.set(x,y,z);root.add(m);return m;};
 const x=dock.x,z=dock.z,y=dock.y,side=dock.width*.48;
 const sx=Math.cos(dock.yaw),sz=-Math.sin(dock.yaw),pierX=x+sx*side,pierZ=z+sz*side;
 const pier=make('#977451',pierX,y+.16,pierZ,3.5,.32,10);pier.rotation.y=dock.yaw;
 for(const off of [-4.2,4.2])for(const across of [-1.4,1.4])make('#635341',pierX+Math.sin(dock.yaw)*off+sx*across,y-.25,pierZ+Math.cos(dock.yaw)*off+sz*across,.18,1.4,.18);
 for(const off of [-3.6,3.6]){const buoy=new THREE.Mesh(new THREE.SphereGeometry(.5,8,6),new THREE.MeshBasicMaterial({color:'#e9b853'}));buoy.position.set(x+Math.sin(dock.yaw)*off,y+.20,z+Math.cos(dock.yaw)*off);root.add(buoy);}
 root.userData.pier={x:pierX,z:pierZ};g.scene.add(root);return root;
}
function makeDocks(g){
 if(piers.has(g))return piers.get(g);
 const docks=[];
 for(const place of DOCK_CANDIDATES){
  const p=project(place.lat,place.lon),q=nearestWaterSegment(g.data.water,p,7,420);
  if(!q)continue;
  const sample=g.terrain.waterSample(q.x,q.z);
  if(sample.distance>-.9)continue;
  const d={...q,name:place.name,y:g.terrain.waterHeight(q.x,q.z),id:docks.length};
  d.root=dockModel(g,d);docks.push(d);
 }
 piers.set(g,docks);return docks;
}
function safeShore(g,dock){
 for(let radius=3;radius<=27;radius+=2)for(let step=0;step<24;step++){
  const a=step*Math.PI/12,x=dock.x+Math.sin(a)*radius,z=dock.z+Math.cos(a)*radius,y=g.terrain.height(x,z);
  if(g.terrain.dry(x,z,.6,y)&&!g.collision?.near?.(x,z,2)?.some?.(b=>b.minX<=x&&b.maxX>=x&&b.minZ<=z&&b.maxZ>=z&&b.h>1))return {x,z,y};
 }
 return null;
}
function character(g){return g.scene.children.find(o=>o.userData?.character===g.state.character);}
export function launchPadovaBoat(g,id,dock,color='#f2dfc1'){
 const s=BOAT_SPECS[id],d=g.nautical?.docks?.[dock];if(!s||!d||!s.places.includes('padova'))return false;
 if(d.width<s.minChannel+1){g.toast?.('Canale troppo stretto per '+s.name+'. Cambia darsena o barca.',4);return false;}
 const old=g.nautical.playerBoat;if(old&&old!==g.state.car){g.remove(old);}
 const car=g.addCar(d.x,d.z,d.yaw,false,true,id),former=car.mesh,mesh=createBoatModel(id,color);
 g.scene.remove(former);g.scene.add(mesh);
 Object.assign(car,{mesh,name:s.name,style:id,spec:{...car.spec},x:d.x,z:d.z,y:d.y+.10,yaw:d.yaw,speed:0,health:100,damageVisual:null,missionUnit:true,fixedSpawn:true,budgetSleeping:false,parked:false,waterDock:d.id,waterColor:color});
 if(g.state.car&&g.state.car!==car){g.state.car.speed=0;g.state.car.parked=true;}
 const st=g.state;Object.assign(st,{mode:'car',car,x:car.x,z:car.z,y:car.y,yaw:car.yaw,speed:0,health:100,vy:0,parachuting:false,waypoint:null,route:[]});
 const p=character(g);if(p)p.visible=false;g.nautical.playerBoat=car;g.nautical.activeDock=d.id;g.nautical.lastWarning=0;
 g.toast?.(s.name+' · '+d.name+' · W/S motore · A/D timone · SHIFT velocità.',5);
 return true;
}
function nearDock(g,dist=25){
 const s=g.state,ds=g.nautical?.docks||[];return ds.map(d=>({d,meters:Math.hypot(d.x-s.x,d.z-s.z)})).filter(v=>v.meters<dist).sort((a,b)=>a.meters-b.meters)[0]?.d||null;
}
function disembark(g){
 const s=g.state,d=nearDock(g,23),shore=d&&safeShore(g,d);if(!shore){g.toast?.('Attracca vicino a una darsena per scendere.',3);return false;}
 if(Math.abs(s.speed)>2){g.toast?.('Riduci la velocità prima di scendere.',3);return false;}
 const car=s.car;if(car){car.speed=0;car.parked=true;}
 Object.assign(s,{...shore,mode:'foot',car:null,speed:0,vy:0});const p=character(g);if(p){p.visible=true;p.position.set(s.x,s.y+.08,s.z);p.rotation.y=s.yaw;}
 g.toast?.('Sbarcato: '+d.name,3);return true;
}
function close(){if(menu?.open)menu.close();if(live)live.state.paused=false;}
function show(g){
 if(!g?.state?.started||g.state.paused||document.querySelector('dialog[open]'))return;
 setup();live=g;
 const ds=g.nautical?.docks||[];if(!ds.length){g.toast?.('Nessuna darsena navigabile rilevata.',4);return;}
 const boats=Object.entries(BOAT_SPECS).filter(([,b])=>b.places.includes('padova'));
 menu.querySelector('#nauticalDock').innerHTML=ds.map(d=>'<option value="'+d.id+'">'+d.name+' · '+Math.round(d.width)+' m</option>').join('');
 menu.querySelector('#nauticalCraft').innerHTML=boats.map(([id,b])=>'<option value="'+id+'">'+b.name+' · '+b.maxKmh+' km/h · larghezza '+b.width+' m</option>').join('');
 const closest=nearDock(g,Infinity);if(closest)menu.querySelector('#nauticalDock').value=String(closest.id);
 menu.showModal();g.state.paused=true;
}
function setup(){
 if(menu||typeof document==='undefined')return;
 const style=document.createElement('style');style.textContent='#nauticalButton{position:fixed;bottom:158px;left:16px;z-index:54;background:#154c59;color:white;border:1px solid #b1d9d9;padding:11px;border-radius:11px;font:700 13px system-ui}#nauticalMenu{color:white;background:#153442;border:1px solid #d6b977;border-radius:15px;width:min(560px,92vw);padding:24px}#nauticalMenu::backdrop{background:#00121bd9}#nauticalMenu select,#nauticalMenu button{display:block;width:100%;padding:12px;margin:12px 0;background:#2b4a56;color:white;border:1px solid #a9c1c9;border-radius:9px;font:600 15px system-ui}#nauticalMenu button{cursor:pointer}';document.head.appendChild(style);
 button=document.createElement('button');button.id='nauticalButton';button.hidden=true;button.textContent='B · DARSENE / BARCHE';document.body.appendChild(button);button.onclick=()=>show(live);
 menu=document.createElement('dialog');menu.id='nauticalMenu';menu.innerHTML='<h2>NAVIGAZIONE · PADOVA</h2><p>Darsene posizionate sui veri corsi d’acqua. Le imbarcazioni più grandi richiedono canali larghi.</p><label>Darsena<select id="nauticalDock"></select></label><label>Imbarcazione<select id="nauticalCraft"></select></label><label>Colore<input id="nauticalColor" type="color" value="#e0c7a5"></label><button id="nauticalLaunch">PREPARA E SALI A BORDO</button><button id="nauticalClose">CHIUDI</button>';document.body.appendChild(menu);
 menu.querySelector('#nauticalLaunch').onclick=()=>{const id=menu.querySelector('#nauticalCraft').value,d=+menu.querySelector('#nauticalDock').value,color=menu.querySelector('#nauticalColor').value;close();launchPadovaBoat(live,id,d,color);};
 menu.querySelector('#nauticalClose').onclick=close;menu.addEventListener('close',()=>{if(live)live.state.paused=false;});
 document.addEventListener('keydown',event=>{
  if(event.code==='KeyB'&&!event.repeat&&live?.state.started&&!document.querySelector('dialog[open]')){event.preventDefault();event.stopImmediatePropagation();show(live);}
 },true);
}
const populate=ModernGameplay.prototype.populate,update=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__padovaNavigableFleet){
 ModernGameplay.prototype.__padovaNavigableFleet=true;
 ModernGameplay.prototype.populate=function(...args){const result=populate.apply(this,args);const docks=makeDocks(this);this.nautical={docks,playerBoat:null,activeDock:null,nearDock:()=>nearDock(this),disembark:()=>disembark(this),launch:(id,d,color)=>launchPadovaBoat(this,id,d,color),lastWarning:0};live=this;setup();return result;};
 ModernGameplay.prototype.update=function(dt){update.call(this,dt);if(!this.nautical)return;if(button)button.hidden=!this.state.started;};
}
