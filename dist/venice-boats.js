// First drivable Venetian fleet: geographic OSM canal centre-lines, bank and
// low-bridge checks, labelled landing piers and lightweight boat traffic.
// This complements (does not replace) the existing pedestrian Venice renderer.
import * as THREE from './vendor/three.module.js';
import {BOAT_SPECS,createBoatModel} from './nautical-catalog.js';

export const VENICE_DOCK_NAMES=['Piazzale Roma','Ponte di Rialto','Piazza San Marco','Giudecca','Arsenale','Accademia'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function closest(x,z,a,b){
 const dx=b[0]-a[0],dz=b[1]-a[1],len=dx*dx+dz*dz,t=len?clamp(((x-a[0])*dx+(z-a[1])*dz)/len,0,1):0;
 return {x:a[0]+dx*t,z:a[1]+dz*t,t,dist:Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t),yaw:Math.atan2(dx,dz)};
}
export function canalAt(data,x,z,margin=0){
 let best=null;
 for(const w of data.water||[]){
  if(w.w<4||!w.p)continue;
  for(let i=1;i<w.p.length;i++){
   const p=closest(x,z,w.p[i-1],w.p[i]);
   if(!best||p.dist-w.w/2<best.edge)best={...p,width:w.w,edge:p.dist-w.w/2};
  }
 }
 if(best&&best.edge< -margin)return best;
 // A water area without a mapped navigable centre line is usable as an open basin.
 for(const a of data.areas||[])if(a.k==='water'&&pointIn(x,z,a.p))return {...(best||{}),x,z,dist:0,edge:-1000,width:200,basin:true};
 return null;
}
function pointIn(x,z,p){
 let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){
  const a=p[i],b=p[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1]||1e-9)+a[0])yes=!yes;
 }return yes;
}
export function veniceDocks(data){
 const docks=[];
 for(const name of VENICE_DOCK_NAMES){
  const place=data.places.find(p=>p.name===name);if(!place)continue;
  let best=null;
  for(const w of data.water||[]){if(w.w<7||!w.p)continue;
   for(let i=1;i<w.p.length;i++){
    const q=closest(place.x,place.z,w.p[i-1],w.p[i]);if(q.dist>375||best&&q.dist>=best.distance)continue;
    // Don't generate a berth directly on top of a bridge or an endpoint.
    if(q.t<.08||q.t>.92)continue;
    best={x:q.x,z:q.z,yaw:q.yaw,width:w.w,distance:q.dist};
   }
  }
  if(best)docks.push({...best,name,id:docks.length});
 }
 return docks;
}
function dockMesh(scene,d){
 const g=new THREE.Group();g.name='VENEZIA · DARSENA '+d.name;
 const m=new THREE.Mesh(new THREE.BoxGeometry(3.3,.27,7.6),new THREE.MeshStandardMaterial({color:'#98795b',roughness:.9}));
 const px=d.x+Math.cos(d.yaw)*Math.min(d.width*.40,7),pz=d.z-Math.sin(d.yaw)*Math.min(d.width*.40,7);
 m.position.set(px,.35,pz);m.rotation.y=d.yaw;g.add(m);
 for(const side of [-1,1])for(const end of [-3,3]){
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.1,.14,1.7,8),new THREE.MeshStandardMaterial({color:'#5d5148'}));
  post.position.set(px+Math.cos(d.yaw)*side*1.5+Math.sin(d.yaw)*end,.15,pz-Math.sin(d.yaw)*side*1.5+Math.cos(d.yaw)*end);g.add(post);
 }
 scene.add(g);return g;
}
export function installVeniceBoats({data,scene,state,keys,player,blocked,nearby,bridgeGrid,toast,safePlace,camera}){
 const docks=veniceDocks(data),models=[],boats=Object.entries(BOAT_SPECS).filter(([,b])=>b.places.includes('venice'));
 let active=null,menu=null,action=null,info=null,warningAt=0;
 for(const d of docks)d.model=dockMesh(scene,d);
 function show(){
  if(document.querySelector('dialog[open]'))return;
  if(!menu){menu=document.createElement('dialog');menu.id='veniceBoatsDialog';menu.setAttribute('aria-label','Darsene e barche Venezia');menu.innerHTML='<h2>VENEZIA · DARSENE</h2><p>Scegli un pontile e un mezzo adatto ai canali. Gondole nei rii stretti; taxi, motoscafi e vaporetto solo nelle vie d’acqua sufficientemente larghe.</p><label>Partenza<select id="vDock"></select></label><label>Barca<select id="vBoat"></select></label><label>Colore<input type="color" id="vColor" value="#eadcc7"></label><button id="vLaunch">PARTI DAL PONTILE</button><button id="vClose">CHIUDI</button>';document.body.appendChild(menu);
   menu.querySelector('#vClose').onclick=()=>menu.close();
   menu.querySelector('#vLaunch').onclick=()=>{const id=menu.querySelector('#vBoat').value,index=+menu.querySelector('#vDock').value,col=menu.querySelector('#vColor').value;menu.close();launch(id,index,col);};
  }
  const select=menu.querySelector('#vDock'),craft=menu.querySelector('#vBoat');
  select.innerHTML=docks.map(d=>'<option value="'+d.id+'">'+d.name+' · '+Math.round(d.width)+' m</option>').join('');
  craft.innerHTML=boats.map(([id,b])=>'<option value="'+id+'">'+b.name+' · '+b.maxKmh+' km/h</option>').join('');
  if(!docks.length){toast('Nessun pontile generabile sui dati caricati.');return;}
  const nearest=docks.slice().sort((a,b)=>Math.hypot(a.x-state.x,a.z-state.z)-Math.hypot(b.x-state.x,b.z-state.z))[0];select.value=String(nearest.id);
  const pick=()=>{const d=docks[+select.value];for(const option of craft.options){const b=BOAT_SPECS[option.value];option.disabled=b.minChannel+1>d.width;}if(craft.selectedOptions[0]?.disabled)craft.value=[...craft.options].find(o=>!o.disabled)?.value||craft.value;};
  select.onchange=pick;pick();menu.showModal();keys.clear();
 }
 function launch(id,index,color){
  const d=docks[index],s=BOAT_SPECS[id];if(!d||!s||d.width<s.minChannel+1){toast('Darsena troppo stretta per questa imbarcazione.');return false;}
  if(active?.mesh){scene.remove(active.mesh);models.splice(models.indexOf(active.mesh),1);}
  const mesh=createBoatModel(id,color);scene.add(mesh);models.push(mesh);
  active={id,s,mesh,dock:index,x:d.x,z:d.z,yaw:d.yaw,speed:0,color,health:100};state.x=d.x;state.z=d.z;state.speed=0;player.visible=false;
  toast(s.name+' · '+d.name+' · W/S motore · A/D timone · SHIFT velocità · E sbarca.');
  return true;
 }
 function underBridge(x,z,s){
  const found=nearby(bridgeGrid,x,z),tall=s.airDraft>2.1;
  if(!tall)return false;
  for(const b of found){const p=closest(x,z,b.a,b.b);if(p.dist<b.w*.55+s.width*.3)return true;}
  return false;
 }
 function step(dt){
  if(!active)return false;const b=active,s=b.s;
  const f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
  const turn=(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)-(keys.has('KeyD')||keys.has('ArrowRight')?1:0);
  const top=s.maxKmh/3.6*((keys.has('ShiftLeft')||keys.has('ShiftRight'))?1:.77);
  b.speed=clamp(b.speed+(f>0?s.accel:f<0?-s.brake:-Math.sign(b.speed)*Math.min(Math.abs(b.speed),s.brake*.32))*dt,-Math.min(2,s.maxKmh/10),top);
  b.yaw+=turn*s.steer*dt*Math.min(1,Math.abs(b.speed)/3.5)*(b.speed>=0?1:-1);
  const nx=b.x+Math.sin(b.yaw)*b.speed*dt,nz=b.z+Math.cos(b.yaw)*b.speed*dt;
  const water=canalAt(data,nx,nz,s.width/2+.55),canPass=!!water&&!blocked(nx,nz)&&!underBridge(nx,nz,s);
  // Npc traffic is intentionally slow; avoid teleporting through another hull.
  const collision=traffic.some(v=>Math.hypot(v.x-nx,v.z-nz)<(s.length+v.s.length)*.36);
  if(canPass&&!collision){b.x=nx;b.z=nz;}else{b.speed*=.25;if(performance.now()>warningAt+2000){warningAt=performance.now();toast(!water?'Riva troppo vicina: rallenta.':!canPass?'Ponte basso o ostacolo sul canale.':'Lascia passare il traffico acqueo.');}}
  state.x=b.x;state.z=b.z;state.speed=b.speed;player.visible=false;
  b.mesh.position.set(b.x,.30+Math.sin(performance.now()*.0017)*.018,b.z);
  b.mesh.rotation.set(Math.sin(performance.now()*.0012)*.01,b.yaw,turn*Math.min(.075,Math.abs(b.speed)*.004),'YXZ');
  const follow=new THREE.Vector3(b.x-Math.sin(b.yaw)*(11+Math.abs(b.speed)*.28),5.5,b.z-Math.cos(b.yaw)*(11+Math.abs(b.speed)*.28));
  camera.position.lerp(follow,1-Math.exp(-dt*4));camera.lookAt(b.x,.8,b.z);
  if(info)info.textContent=s.name+' · '+Math.round(Math.abs(b.speed)*3.6)+' / '+s.maxKmh+' km/h';
  return true;
 }
 function disembark(){
  if(!active)return;
  const d=docks.map(p=>({...p,r:Math.hypot(p.x-active.x,p.z-active.z)})).sort((a,b)=>a.r-b.r)[0];
  if(!d||d.r>21||Math.abs(active.speed)>2){toast('Ferma la barca vicino a un pontile prima di sbarcare.');return;}
  const perpX=Math.cos(d.yaw),perpZ=-Math.sin(d.yaw);
  const p=safePlace({x:d.x+perpX*d.width*.59,z:d.z+perpZ*d.width*.59,name:d.name});
  state.x=p.x;state.z=p.z;state.speed=0;player.visible=true;active.speed=0;active=null;toast('Sbarcato · '+d.name);
 }
 const style=document.createElement('style');style.textContent='#veniceDocksBtn{position:fixed;right:18px;bottom:85px;z-index:30;background:#b99254;color:#10242d;font:bold 14px system-ui;border:1px solid #fff3c6;padding:13px 17px;border-radius:10px;cursor:pointer}#veniceBoatInfo{position:fixed;right:18px;bottom:148px;z-index:25;color:white;background:#193541df;padding:9px 13px;border-radius:9px;font:700 12px system-ui}#veniceBoatsDialog{color:#fff2d9;background:#142b34;border:1px solid #d5b273;border-radius:14px;width:min(560px,92vw);padding:22px;max-height:85vh;overflow:auto}#veniceBoatsDialog::backdrop{background:#06151fdc}#veniceBoatsDialog select,#veniceBoatsDialog button,#veniceBoatsDialog input{display:block;width:100%;background:#294b59;color:white;padding:12px;border-radius:9px;border:1px solid #9cb2ad;margin:9px 0 18px;box-sizing:border-box}';document.head.appendChild(style);
 action=document.createElement('button');action.id='veniceDocksBtn';action.textContent='B · DARSENE / BARCHE';document.body.appendChild(action);action.onclick=show;
 info=document.createElement('div');info.id='veniceBoatInfo';info.hidden=true;document.body.appendChild(info);
 const traffic=[];
 // A few independent low-speed NPC craft moving on existing mapped canals.
 for(const w of data.water.filter(w=>w.w>=9&&w.p?.length>=2).sort((a,b)=>b.w-a.w).slice(0,7)){
  const a=w.p[0],end=w.p[w.p.length-1],len=Math.hypot(end[0]-a[0],end[1]-a[1]);if(len<45)continue;
  const id=w.w>=17?'boat-water-taxi':'boat-electric',s=BOAT_SPECS[id],mesh=createBoatModel(id,'#cfdfdc');scene.add(mesh);
  traffic.push({s,mesh,p:w.p,x:a[0],z:a[1],progress:Math.random()*.6,reverse:false,speed:Math.min(3,s.maxKmh/3.6)*.60});
  if(traffic.length>=5)break;
 }
 function tickTraffic(dt){
  for(const v of traffic){const first=v.p[0],last=v.p[v.p.length-1],d=Math.hypot(last[0]-first[0],last[1]-first[1]);if(!d)continue;
   v.progress+=v.speed*dt/d*(v.reverse?-1:1);if(v.progress>1){v.progress=1;v.reverse=true;}else if(v.progress<0){v.progress=0;v.reverse=false;}
   v.x=first[0]+(last[0]-first[0])*v.progress;v.z=first[1]+(last[1]-first[1])*v.progress;
   v.mesh.position.set(v.x,.30,v.z);v.mesh.rotation.y=Math.atan2((last[0]-first[0])*(v.reverse?-1:1),(last[1]-first[1])*(v.reverse?-1:1));
  }
 }
 addEventListener('keydown',e=>{if(e.code==='KeyB'&&!e.repeat&&!document.querySelector('dialog[open]')){e.preventDefault();show();}if(e.code==='KeyE'&&!e.repeat&&active&&!document.querySelector('dialog[open]')){e.preventDefault();disembark();}},true);
 return {docks,traffic,get active(){return !!active;},get current(){return active;},launch,show,step(dt){tickTraffic(dt);if(info)info.hidden=!active;return active?step(dt):false;},disembark};
}
