// In-world vehicle showroom for the ONLY fictional villa (Mandria).
// Deliberately leaves public Parco Treves, city traffic and existing missions alone.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VEHICLES,createRider} from './vehicles.js';
import {VILLA,AIRPORT,HOME,areaPoint,areaLocal} from './gameplay-areas.js';
import {VILLA_GARAGE} from './villa-treves-layout.js';
import {vehicleBlocked} from './movement.js';
import {installVehicleDamage} from './vehicle-damage.js';

// Rideable versions of the bicycles and standing electric scooters already
// found as NPC scenery in Padova. They use the standard ground driving physics.
Object.assign(VEHICLES,{
 bicycle:{name:'Bicicletta urbana',family:'bicycle',width:.65,length:1.85,height:1.45,wheelbase:1.16,max:8.3,boost:10,reverse:1,accel:3,brake:9,steer:1.5,mass:.15,bike:true},
 'kick-scooter':{name:'Monopattino elettrico',family:'scooter',width:.62,length:1.25,height:1.28,wheelbase:.87,max:7,boost:8.3,reverse:1,accel:4,brake:10,steer:1.65,mass:.12,bike:true}
});

const COLORS=Object.freeze(['#b52f3d','#e9e4d5','#252b36','#397084','#c5a257','#477b53','#bd7041','#8a70a8']);
const CAT=Object.freeze({watercraft:'Barche',aircraft:'Aerei',helicopter:'Elicotteri',bicycle:'Bici e monopattini',motorcycle:'Moto e scooter',tracked:'Carri armati',freight:'Camion e mezzi pesanti',car:'Auto e altri mezzi'});
const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function hangarCategory(id,s){
 if(s.watercraft)return 'watercraft';if(s.plane)return 'aircraft';if(s.aircraft)return 'helicopter';if(id==='bicycle'||id==='kick-scooter')return 'bicycle';
 if(s.tracked)return 'tracked';if(s.bike||['motorcycle','scooter'].includes(id)||s.family==='motorcycle')return 'motorcycle';
 if(['freight','work','van','pickup'].includes(s.family)||s.length>=7&&!s.aircraft)return 'freight';return 'car';
}
export function hangarCatalogue(){return Object.entries(VEHICLES).filter(([id,s])=>
 (!s?.watercraft||s.places?.includes('padova'))&&s&&typeof s.name==='string'&&Number.isFinite(s.width)&&Number.isFinite(s.length)&&s.width>0&&s.length>0)
 .map(([id,s])=>({id,name:s.name,spec:s,category:hangarCategory(id,s)}))
 .sort((a,b)=>Object.keys(CAT).indexOf(a.category)-Object.keys(CAT).indexOf(b.category)||a.name.localeCompare(b.name,'it'));
}
// All thumbnails are locally generated SVG images, not external/stock photos.
export function hangarThumbnail(category,color){
 const ink='#172532',stroke='#91a3af';let silhouette='';
 if(category==='watercraft')silhouette='<path d="M29 99 L192 99 L170 127 L52 127Z M81 96 L91 63 L137 63 L151 96Z"/><path d="M17 140 Q31 127 47 140 T78 140 T109 140 T140 140 T171 140 T205 140" fill="none" stroke="'+color+'" stroke-width="4"/>';
 else if(category==='aircraft')silhouette='<path d="M105 10 L117 62 L190 90 L190 103 L121 94 L119 135 L145 154 L145 162 L111 153 L77 162 L77 154 L103 135 L101 94 L32 103 L32 90 L105 62 Z"/>';
 else if(category==='helicopter')silhouette='<path d="M22 86h180v5H22zM107 33h8v50h-8zM60 95q3-29 39-31h27q33 2 38 29l-15 20H83zM160 95h41v7h-42zM73 121h82v5H73z"/>';
 else if(category==='bicycle'||category==='motorcycle')silhouette='<circle cx="57" cy="116" r="28" fill="none" stroke="'+color+'" stroke-width="7"/><circle cx="163" cy="116" r="28" fill="none" stroke="'+color+'" stroke-width="7"/><path d="M57 116L90 75l36 41H57l32-41h34l40 41M124 75l-10-17h-19M161 116l-20-55" fill="none" stroke="'+color+'" stroke-width="7"/>';
 else if(category==='tracked')silhouette='<rect x="23" y="96" width="174" height="34" rx="16"/><path d="M48 95L69 68h91l19 27zM108 68V45h11v23M115 49l85-11v7l-85 14z"/>';
 else if(category==='freight')silhouette='<path d="M19 65h115v52H19zM134 82h38l28 24v11h-66z"/><circle cx="52" cy="120" r="12" fill="'+ink+'"/><circle cx="169" cy="120" r="12" fill="'+ink+'"/>';
 else silhouette='<path d="M19 98l18-29h44l20-19h67l25 48v26H19z"/><path d="M79 70l16-17h68l18 26H70z" fill="'+ink+'"/><circle cx="54" cy="124" r="15" fill="'+ink+'"/><circle cx="169" cy="124" r="15" fill="'+ink+'"/>';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="222" height="174" viewBox="0 0 222 174"><rect width="222" height="174" rx="17" fill="${ink}"/><path d="M16 142h190" stroke="${stroke}" opacity=".7"/> <g fill="${color}" stroke-linejoin="round">${silhouette}</g></svg>`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
const box=new THREE.BoxGeometry(1,1,1),cyl=new THREE.CylinderGeometry(1,1,1,12);
function panel(root,x,y,z,w,h,d,color){const m=new THREE.Mesh(box,new THREE.MeshStandardMaterial({color,roughness:.7}));m.position.set(x,y,z);m.scale.set(w,h,d);root.add(m);return m;}
function microModel(style,color){
 const root=new THREE.Group(),kick=style==='kick-scooter',wheelZ=kick?.4:.7;
 for(const z of [-wheelZ,wheelZ]){
  const wheel=new THREE.Mesh(cyl,new THREE.MeshStandardMaterial({color:'#222c32'}));wheel.rotation.z=Math.PI/2;wheel.position.set(0,kick?.22:.39,z);wheel.scale.set(kick?.21:.34,.12,kick?.21:.34);root.add(wheel);
 }
 if(kick){panel(root,0,.18,0,.21,.11,.95,color);panel(root,0,.79,.43,.075,1.2,.075,color);panel(root,0,1.33,.43,.7,.07,.08,'#293942');}
 else{panel(root,0,.66,0,.10,.08,1.03,color);panel(root,0,.93,-.19,.1,.65,.1,color).rotation.x=-.42;panel(root,0,.93,.32,.1,.62,.1,color).rotation.x=.45;panel(root,0,.91,.05,.09,.08,.78,color);panel(root,0,1.22,.45,.65,.08,.08,'#293942');panel(root,0,1.04,-.25,.46,.08,.2,'#293942');}
 root.name=style;return root;
}
function airportModel(style,s,color){
 const g=new THREE.Group(),w=s.width,l=s.length,he=s.height;
 const fuselage=Math.min(4.8,w*.2),bodyY=he*.43;
 panel(g,0,bodyY,0,fuselage,Math.min(he*.45,2.4),l*.8,color);
 panel(g,0,bodyY+.24,l*.43,fuselage*.7,he*.28,l*.13,color);
 panel(g,0,bodyY-.32,0,w,.21,Math.max(2.6,l*.18),color);
 panel(g,0,bodyY+.25,-l*.38,w*.37,.17,Math.max(1.3,l*.09),color);
 panel(g,0,he*.68,-l*.37,.2,he*.54,Math.max(1.4,l*.1),color);
 panel(g,0,bodyY+.62,l*.19,fuselage*.64,.44,Math.max(2,l*.12),'#325c73');
 for(const side of [-1,1]){panel(g,side*fuselage*.56,.45,l*.15,.23,.8,.55,'#2c3540');if(w>16)panel(g,side*w*.24,bodyY-.48,0,Math.max(.7,w*.06),.8,l*.17,'#42515b');}
 g.name=s.name;return g;
}
const savedMesh=new WeakSet(),baseVerts=new WeakMap(),baseMaterial=new WeakMap();
export function paintHangarVehicle(root,hex){
 const paint=new THREE.Color(hex);
 root.traverse(o=>{
  if(!o.isMesh)return;
  if(!savedMesh.has(o)){o.geometry=o.geometry.clone();o.material=o.material.clone();savedMesh.add(o);if(o.geometry.attributes.color)baseVerts.set(o,o.geometry.attributes.color.array.slice());baseMaterial.set(o,o.material.color?.clone());}
  const colors=o.geometry.attributes.color,baseline=baseVerts.get(o);
  if(colors&&baseline){for(let i=0;i<baseline.length;i+=3){const r=baseline[i],g=baseline[i+1],b=baseline[i+2],v=(r+g+b)/3;
   const glass=b>r*1.2&&b>g*1.04;
   if(v>.23&&v<.94&&!glass){const shade=Math.min(1.25,Math.max(.43,v/.56));colors.array[i]=paint.r*shade;colors.array[i+1]=paint.g*shade;colors.array[i+2]=paint.b*shade;}
   else{colors.array[i]=r;colors.array[i+1]=g;colors.array[i+2]=b;}
  }colors.needsUpdate=true;}
  else if(o.material.color){const base=baseMaterial.get(o),v=(base.r+base.g+base.b)/3,glass=base.b>base.r*1.2&&base.b>base.g*1.04;
   if(v>.23&&v<.94&&!glass)o.material.color.copy(paint).multiplyScalar(Math.min(1.23,Math.max(.5,v/.56)));else o.material.color.copy(base);
  }
 });
 return root;
}
function character(g){return g.scene.children.find(o=>o.userData?.character===g.state.character);}
const bay=()=>areaPoint(VILLA,VILLA_GARAGE.u,VILLA_GARAGE.v);
export const hangarInBay=car=>!!car&&(()=>{const a=areaLocal(VILLA,car.x,car.z);return a.u>5&&a.u<43&&a.v>5&&a.v<47;})();
function unobstructed(g,p,spec,yaw,ignore=null){
 const y=g.terrain.height(p.x,p.z);
 return g.terrain.dry(p.x,p.z,spec.width/2,y)&&!vehicleBlocked(p.x,p.z,yaw,g.collision,spec,y)&&
  !g.cars.some(c=>c!==ignore&&c.mesh.visible&&Math.hypot(c.x-p.x,c.z-p.z)<Math.max(5,(c.spec.length+spec.length)*.4));
}
function teleportFoot(g,spec){
 const u=Math.max(7.2,VILLA_GARAGE.u-spec.length/2-1.3),v=VILLA_GARAGE.v+Math.min(1.7,spec.width/2+1);
 const p=areaPoint(VILLA,u,v),s=g.state;
 Object.assign(s,{x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),yaw:VILLA.yaw-Math.PI/2,speed:0,vy:0,mode:'foot',car:null,parachuting:false});
 const player=character(g);if(player){player.visible=true;player.position.set(s.x,s.y+.08,s.z);player.rotation.y=s.yaw;}
}
function removeOccupant(g){
 const c=g.mandriaHangar?.staged;if(!c||!hangarInBay(c)){if(g.mandriaHangar)g.mandriaHangar.staged=null;return;}
 if(g.state.car===c)teleportFoot(g,c.spec);
 g.remove(c);g.mandriaHangar.staged=null;
}
function createInBay(g,id,color){
 const s=VEHICLES[id];if(!s)return null;
 const p=bay(),yaw=VILLA.yaw-Math.PI/2;
 if(!unobstructed(g,p,s,yaw))return null;
 const micro=id==='bicycle'||id==='kick-scooter',c=g.addCar(p.x,p.z,yaw,false,true,micro?'motorcycle':id);
 if(micro||id.startsWith('airport-')){
  const old=c.mesh;g.scene.remove(old);c.mesh=micro?microModel(id,color):airportModel(id,s,color);
  c.style=id;c.spec=s;c.name=s.name;c.rider=null;
  if(micro&&id==='bicycle'){c.rider=createRider();c.mesh.add(c.rider);}
  g.scene.add(c.mesh);installVehicleDamage(c);
 }
 c.style=id;c.spec=s;c.name=s.name;c.fixedSpawn=true; // Hold staged object; never recycle as ambient traffic.
 c.hangarInventory=true;c.parked=true;c.speed=0;c.health=100;c.y=g.terrain.height(p.x,p.z);
 paintHangarVehicle(c.mesh,color);g.pose(c);g.forget?.(c);g.mandriaHangar.staged=c;
 teleportFoot(g,s);return c;
}
function departurePoint(g,c){
 const places=c.spec.aircraft?c.spec.plane?[[0,-420],[0,-350],[0,-260],[0,-175],[0,95]].map(([u,v])=>areaPoint(AIRPORT,u,v))
 :[[125,395],[125,325],[105,375],[85,365]].map(([u,v])=>areaPoint(AIRPORT,u,v))
 :[[0,26],[0,29],[0,23],[0,32]].map(([u,v])=>areaPoint(VILLA,u,v));
 const yaw=c.spec.aircraft?AIRPORT.yaw:VILLA.yaw;
 return places.find(p=>unobstructed(g,p,c.spec,yaw,c))?{...places.find(p=>unobstructed(g,p,c.spec,yaw,c)),yaw}:null;
}
function dispatch(g){
 const c=g.mandriaHangar?.staged;if(!c||!g.cars.includes(c))return;
 const p=departurePoint(g,c);if(!p){g.toast?.('Uscita occupata. Libera il viale o il piazzale e riprova.',5);return;}
 if(g.state.car&&g.state.car!==c){g.toast?.('Scendi prima dal mezzo attuale.',4);return;}
 const s=g.state,player=character(g);
 Object.assign(c,{x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),yaw:p.yaw,speed:0,health:100,parked:true,fixedSpawn:false,hangarInventory:false});
 c.mesh.visible=true;g.pose(c);g.forget?.(c);
 Object.assign(s,{x:c.x,z:c.z,y:c.y,yaw:c.yaw,mode:'car',car:c,health:100,speed:0,vy:0,parachuting:false,waypoint:null,route:[]});
 if(player)player.visible=false;
 g.mandriaHangar.staged=null;
 g.toast?.(c.spec.aircraft?'Velivolo consegnato in aeroporto: pista e decollo davanti a te.':'Mezzo pronto nel viale della villa. Buona guida.',5);
}
function shutter(g,closed){
 if(!g.mandriaHangar?.door)return Promise.resolve();
 const door=g.mandriaHangar.door,ground=g.mandriaHangar.ground,h=VILLA_GARAGE.roofHeight;
 const start=door.position.y,target=ground+(closed?h/2:h*1.6),beg=performance.now();
 return new Promise(resolve=>{function frame(now){const t=Math.min(1,(now-beg)/370);door.position.y=start+(target-start)*(t*t*(3-2*t));if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
}
function ensureHangar(g){
 if(g.mandriaHangar)return;
 const p=areaPoint(VILLA,VILLA_GARAGE.entranceU-.14,VILLA_GARAGE.v),ground=g.terrain.height(p.x,p.z),h=VILLA_GARAGE.roofHeight;
 const door=new THREE.Mesh(new THREE.BoxGeometry(.12,h-.7,VILLA_GARAGE.d-2.4),new THREE.MeshStandardMaterial({color:'#445b68',roughness:.64,metalness:.35,transparent:true,opacity:.84}));
 door.name='Mandria hangar · animated non-colliding shutter';door.rotation.y=VILLA.yaw;door.position.set(p.x,ground+h*1.6,p.z);door.castShadow=door.receiveShadow=false;g.scene.add(door);
 g.mandriaHangar={staged:null,door,ground,busy:false};
}
let live=null,dialog=null,openButton=null,status=null;
function closeDialog(g){if(dialog?.open)dialog.close();if(g?.state)g.state.paused=false;}
function renderCatalogue(g){
 const entries=hangarCatalogue(),selectedColor=$('hangarPaint')?.value||COLORS[0],text=($('hangarSearch')?.value||'').trim().toLocaleLowerCase('it'),cat=$('hangarFilter')?.value||'all';
 const filtered=entries.filter(v=>(cat==='all'||cat===v.category)&&(!text||(v.name+' '+v.id).toLocaleLowerCase('it').includes(text)));
 const grid=$('hangarGrid');if(!grid)return;
 grid.innerHTML=filtered.length?filtered.map(v=>`<button type="button" class="hangar-card" data-hangar-id="${escapeHTML(v.id)}"><img alt="Sagoma indicativa di ${escapeHTML(v.name)}" src="${hangarThumbnail(v.category,selectedColor)}"><strong>${escapeHTML(v.name)}</strong><small>${CAT[v.category]} · ${Math.round(v.spec.max*3.6)} km/h</small></button>`).join(''):'<p>Nessun mezzo corrispondente alla ricerca.</p>';
 grid.querySelectorAll('[data-hangar-id]').forEach(b=>b.onclick=()=>void choose(g,b.dataset.hangarId,$('hangarPaint').value));
 $('hangarCount').textContent=`${filtered.length} mezzi · ${entries.length} nel catalogo`;
}
async function choose(g,id,color){
 if(g.mandriaHangar.busy)return;
 const s=VEHICLES[id],p=bay();if(!s||!g.state.started||!hangarCatalogue().some(e=>e.id===id))return;
 if(s.watercraft){const d=g.nautical?.docks?.find(d=>d.width>=s.minChannel+1);closeDialog(g);if(!d){g.toast?.('Nessuna darsena compatibile con questa barca nella mappa di Padova.',4);return;}g.nautical.launch(id,d.id,color);return;}
 // Never erase an occupied/mission vehicle; the only replaceable object is our
 // own staged vehicle, and only while it is physically still inside the bay.
 const old=g.mandriaHangar.staged;
 if(old&&hangarInBay(old)&&old!==g.state.car){/* replaced after shutter closes */}
 const blocked=!unobstructed(g,p,s,VILLA.yaw-Math.PI/2,old&&hangarInBay(old)?old:null);
 if(blocked){g.toast?.('Hangar occupato: sposta altri mezzi dall’area di esposizione.',5);return;}
 g.mandriaHangar.busy=true;closeDialog(g);g.state.paused=true;
 try{
  if(status){status.hidden=false;status.textContent='HANGAR · CHIUSURA E SOSTITUZIONE DEL MEZZO…';}
  await shutter(g,true);removeOccupant(g);
  const c=createInBay(g,id,color);
  await shutter(g,false);
  if(c){g.toast?.(s.name+' · Colore applicato. Avvicinati e premi E; oppure scegli «Porta fuori».',6);}
  else g.toast?.('Area non libera. Nessun nuovo mezzo generato.',5);
 }catch(error){console.error('Mandria hangar',error);g.toast?.('Errore di caricamento del mezzo.',5);}
 finally{g.mandriaHangar.busy=false;g.state.paused=false;if(status)status.hidden=true;}
}
function showCatalog(g){
 if(!g?.state?.started||g.mandriaHangar?.busy||document.querySelector('dialog[open]'))return;
 ensureUI();live=g;
 const label=g.mandriaHangar.staged?.name||'nessuno';
 dialog.querySelector('.hangar-current').textContent='Mezzo attualmente nell’hangar: '+label+'. Un nuovo caricamento lo sostituisce soltanto se è ancora all’interno.';
 dialog.showModal();g.state.paused=true;
 renderCatalogue(g);$('hangarSearch').focus();
}
function ensureUI(){
 if(dialog||typeof document==='undefined')return;
 const styles=document.createElement('style');styles.textContent=`
 #mandriaHangarButton{position:fixed;bottom:103px;left:16px;z-index:55;padding:12px 16px;border-radius:12px;background:#193846;color:#fff;border:1px solid #e7bb69;font:700 13px system-ui;cursor:pointer;box-shadow:0 6px 20px #0007}#mandriaHangarButton[hidden]{display:none}
 #mandriaHangarDialog{width:min(1030px,94vw);max-height:88vh;overflow:auto;background:#132330;color:#f5f1e8;border:1px solid #d0b57f;border-radius:16px;padding:20px;box-shadow:0 20px 70px #000c}#mandriaHangarDialog::backdrop{background:#020912d6}
 #mandriaHangarDialog .hangar-header{display:flex;align-items:center;justify-content:space-between;gap:12px}#mandriaHangarDialog h2{margin:4px 0 8px;font-size:clamp(20px,4vw,31px)}#mandriaHangarDialog button,#mandriaHangarDialog select,#mandriaHangarDialog input{font:inherit}#mandriaHangarDialog .hangar-close{background:transparent;color:#fff;border:1px solid #778995;padding:8px 12px;border-radius:8px;cursor:pointer}
 #mandriaHangarDialog .hangar-controls{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:16px 0}#mandriaHangarDialog input[type=search],#mandriaHangarDialog select{background:#233949;color:#fff;border:1px solid #718696;border-radius:8px;padding:10px;min-width:145px}#mandriaHangarDialog input[type=color]{width:56px;height:43px;background:transparent;border:0;cursor:pointer}
 #hangarGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;margin-top:16px}#mandriaHangarDialog .hangar-card{display:flex;flex-direction:column;align-items:stretch;gap:6px;text-align:left;border:1px solid #536978;color:#fff;border-radius:11px;background:#203544;padding:8px;cursor:pointer}#mandriaHangarDialog .hangar-card:hover,#mandriaHangarDialog .hangar-card:focus-visible{outline:2px solid #e7bb69}#mandriaHangarDialog .hangar-card img{width:100%;aspect-ratio:222/174;object-fit:cover;border-radius:6px}#mandriaHangarDialog .hangar-card strong{font-size:13px;line-height:1.3}#mandriaHangarDialog .hangar-card small{font-size:11px;color:#cfdeeb}#mandriaHangarDialog .hangar-current{font-size:13px;color:#e7c990;line-height:1.4}#hangarCount{font-size:12px;color:#d7e2eb}#mandriaHangarDialog .hangar-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}#mandriaHangarDialog .hangar-actions button{border-radius:8px;padding:9px 12px;border:1px solid #c2a676;background:#2a485a;color:#fff;cursor:pointer}#mandriaHangarStatus{position:fixed;top:43%;left:50%;transform:translateX(-50%);z-index:999;padding:17px;background:#102734;color:#f3dfae;border:1px solid #d9bc7b;border-radius:12px;max-width:90vw;text-align:center}`;
 document.head.appendChild(styles);
 openButton=document.createElement('button');openButton.id='mandriaHangarButton';openButton.type='button';openButton.hidden=true;openButton.textContent='H · HANGAR / CATALOGO';document.body.appendChild(openButton);
 openButton.onclick=()=>{if(live)showCatalog(live);};
 status=document.createElement('div');status.id='mandriaHangarStatus';status.hidden=true;status.setAttribute('role','status');document.body.appendChild(status);
 dialog=document.createElement('dialog');dialog.id='mandriaHangarDialog';dialog.setAttribute('aria-label','Catalogo mezzi Villa della Mandria');
 dialog.innerHTML=`<div class="hangar-header"><div><small>VILLA DELLA MANDRIA · HANGAR</small><h2>Scegli qualsiasi mezzo</h2></div><button type="button" class="hangar-close" id="hangarClose">Chiudi ×</button></div><p class="hangar-current"></p><div class="hangar-controls"><input type="search" id="hangarSearch" placeholder="Cerca per nome" aria-label="Cerca mezzo"><select id="hangarFilter" aria-label="Categoria"><option value="all">Tutti i mezzi</option>${Object.entries(CAT).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><label for="hangarPaint">Colore</label><input type="color" id="hangarPaint" value="${COLORS[0]}"></div><div id="hangarCount" role="status"></div><div id="hangarGrid"></div><div class="hangar-actions"><button type="button" id="hangarDeliver">Porta fuori il mezzo attuale</button><button type="button" id="hangarCloseBottom">Torna al gioco</button></div><p class="hangar-current">Il portone si chiude durante la sostituzione e poi si riapre. I mezzi già usciti rimangono fuori. Gli aerei vengono trasferiti su una piazzola sicura dell’aeroporto per il decollo.</p>`;
 document.body.appendChild(dialog);
 $('hangarClose').onclick=$('hangarCloseBottom').onclick=()=>closeDialog(live);
 dialog.addEventListener('cancel',()=>{if(live?.state)live.state.paused=false;});
 $('hangarSearch').addEventListener('input',()=>renderCatalogue(live));$('hangarFilter').addEventListener('change',()=>renderCatalogue(live));$('hangarPaint').addEventListener('input',()=>{renderCatalogue(live);if(live?.mandriaHangar?.staged&&hangarInBay(live.mandriaHangar.staged))paintHangarVehicle(live.mandriaHangar.staged.mesh,$('hangarPaint').value);});
 $('hangarDeliver').onclick=()=>{if(!live)return;dispatch(live);closeDialog(live);};
 document.addEventListener('keydown',e=>{if(e.code==='KeyH'&&!e.repeat&&live?.state.started&&openButton&&!openButton.hidden&&!dialog.open&&!document.querySelector('dialog[open]')){e.preventDefault();showCatalog(live);}},true);
}
export function hangarUpdate(g){
 if(!g?.state?.started||!g.terrain?.modern)return;
 ensureHangar(g);ensureUI();live=g;
 if(g.mandriaHangar.staged&&!hangarInBay(g.mandriaHangar.staged))g.mandriaHangar.staged=null;
 const pos=areaLocal(VILLA,g.state.x,g.state.z);
 const byDoor=Math.hypot(pos.u,pos.v-VILLA_GARAGE.v)<14;
 const inside=pos.u>=4&&pos.u<=43&&pos.v>=5&&pos.v<=47;
 openButton.hidden=g.mandriaHangar.busy||(!byDoor&&!inside)||!g.state.started;
}
const previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaHangarCatalog){
 ModernGameplay.prototype.__mandriaHangarCatalog=true;
 ModernGameplay.prototype.update=function(dt){previousUpdate.call(this,dt);hangarUpdate(this);};
}
