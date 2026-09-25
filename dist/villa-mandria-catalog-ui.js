// Category-first presentation only; the original Mandria hangar still owns
// spawning, shutters, paint controls, replacement and delivery.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VEHICLES,createVehicle} from './vehicles.js';
import {NPC_VEHICLES,createNPCCar,createHelicopter} from './modern-vehicles.js';
import {SPECIAL_VEHICLES,createSpecialVehicle} from './special-vehicles.js';
import {MILITARY_FLEET,militaryFleetModel} from './airport-military-fleet.js';
import {hangarCatalogue,paintHangarVehicle} from './villa-mandria-hangar.js';
import {createBoatModel} from './nautical-catalog.js';
import {createMichelangeloModel} from './airport-michelangelo.js';

export const HANGAR_SECTIONS=Object.freeze([
 {id:'air',title:'Aerei e velivoli',subtitle:'Aerei, jet ed elicotteri',symbol:'✈',enabled:true},
 {id:'land',title:'Terrestri',subtitle:'Auto, moto, camion, blindati e carri',symbol:'▰',enabled:true},
 {id:'urban',title:'Mobilità urbana',subtitle:'Biciclette e monopattini',symbol:'♢',enabled:true},
 {id:'water',title:'Barche',subtitle:'Motoscafi, gommoni e navigazione fluviale',symbol:'≈',enabled:true}
]);
export function hangarSection(id,spec=VEHICLES[id]){
 if(!spec)return null;
 if(spec.watercraft)return 'water';
 if(id==='bicycle'||id==='kick-scooter')return 'urban';
 return spec.aircraft?'air':'land';
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10);
function block(g,x,y,z,w,h,l,color){const m=new THREE.Mesh(cube,new THREE.MeshStandardMaterial({color,roughness:.7}));m.position.set(x,y,z);m.scale.set(w,h,l);g.add(m);return m;}
function urbanModel(id,color){
 const g=new THREE.Group(),kick=id==='kick-scooter',length=kick?1.25:1.85,r=kick?.18:.31;
 for(const z of [-length*.36,length*.36]){const m=new THREE.Mesh(cylinder,new THREE.MeshStandardMaterial({color:'#263137'}));m.position.set(0,r,z);m.rotation.z=Math.PI/2;m.scale.set(r,.09,r);g.add(m);}
 if(kick){block(g,0,.15,0,.24,.09,.9,color);block(g,0,.78,.41,.075,1.12,.07,color);block(g,0,1.33,.41,.65,.07,.1,'#34434c');}
 else{block(g,0,.64,0,.09,.09,1.02,color);block(g,0,.88,-.24,.09,.65,.1,color);block(g,0,.9,.35,.09,.65,.1,color);block(g,0,1.24,.42,.69,.08,.08,'#34434c');block(g,0,1.05,-.29,.48,.08,.22,'#34434c');}
 g.name=id;return g;
}
function groundModel(id,s,color){
 if(s.width<1.2)return urbanModel(id,color);
 const g=new THREE.Group(),w=s.width,l=s.length,h=s.height,truck=l>7||h>2.6;
 block(g,0,h*.3,0,w*.9,h*.38,l*.95,color);
 block(g,0,h*.67,truck?l*.26:-l*.11,w*.79,h*.53,truck?Math.min(2.9,l*.39):l*.53,color);
 block(g,0,h*.72,truck?l*.49:l*.2,w*.65,h*.22,.08,'#345667');
 for(const side of [-1,1])for(const z of [-l*.32,l*.32]){const m=new THREE.Mesh(cylinder,new THREE.MeshStandardMaterial({color:'#222c30'}));m.position.set(side*w*.46,.32,z);m.rotation.z=Math.PI/2;m.scale.set(.34,.18,.34);g.add(m);}
 g.name=s.name;return g;
}
// For an airport variant without an exported model builder, draw its particular
// aircraft shape/dimensions rather than using the generic vehicle-category icon.
function aircraftModel(id,s,color){
 const g=new THREE.Group(),w=s.width,l=s.length,h=s.height;
 if(!s.plane){
  block(g,0,h*.54,l*.08,w*.53,h*.43,l*.44,color);block(g,0,h*.71,l*.28,w*.45,.45,l*.13,'#31576a');
  block(g,0,h*.64,-l*.37,.24,.35,l*.45,color);block(g,0,h*.94,0,Math.max(w,l*.92),.07,.18,'#879a9c');
  block(g,0,h*.95,0,.18,.07,Math.max(w,l*.92),'#879a9c');
  for(const side of [-1,1])block(g,side*w*.24,.19,0,.12,.15,l*.63,'#353f43');
 }else{
  const fighter=/jet|strike|interceptor|blackbird|fighter/i.test(id),cargo=/cargo|transport/i.test(id),bw=Math.min(w*(fighter?.13:.17),cargo?4.8:2.9);
  block(g,0,h*.48,0,bw,h*(fighter?.3:.42),l*.81,color);block(g,0,h*.57,l*.26,bw*.64,h*.2,l*.15,'#31576a');
  block(g,0,h*.43,-l*.04,w*(fighter?.90:.98),.18,l*(fighter?.24:.13),color);
  block(g,0,h*.54,-l*.37,w*.35,.14,l*.1,color);
  for(const side of fighter?[-1,1]:[0]){block(g,side*bw*.27,h*.78,-l*.4,.16,h*.36,l*.11,color);if(fighter)block(g,side*bw*.38,h*.31,-l*.25,.55,.48,l*.16,'#505e66');}
  if(cargo)for(const side of [-1,1])block(g,side*w*.23,h*.32,0,1.3,.65,2.6,'#5b6666');
 }
 g.name=s.name;g.userData.previewCategory='air';return g;
}
export function hangarPreviewModel(id,color='#b52f3d',game=null){
 const spec=VEHICLES[id];if(!spec)return null;
 // Always select an aircraft model before considering any live actor clone:
 // streamed aircraft can be represented by ground placeholder meshes in the world.
 // Preserve the dedicated original models for legacy aeroplanes/helicopters.
 if(spec.watercraft)return createBoatModel(id,color);
 if(spec.aircraft){
  if(id==='airport-michelangelo')return createMichelangeloModel();
  const model=id==='airone'?createHelicopter():SPECIAL_VEHICLES[id]?createSpecialVehicle(id):aircraftModel(id,spec,color);
  model.userData.previewCategory='air';return model;
 }
 if(MILITARY_FLEET[id])return militaryFleetModel(id);
 if(id==='bicycle'||id==='kick-scooter')return urbanModel(id,color);
 if(NPC_VEHICLES[id])return createNPCCar(id,color);
 if(['mito','cinquecento','motorcycle','scooter','truck','taxi'].includes(id))return createVehicle(id,color);
 if(SPECIAL_VEHICLES[id])return createSpecialVehicle(id);
 const live=game?.cars?.find(c=>c.style===id&&c.mesh);
 if(live){const copy=live.mesh.clone(true);copy.position.set(0,0,0);copy.rotation.set(0,0,0);copy.visible=true;copy.traverse(o=>{o.visible=true;});return copy;}
 return groundModel(id,spec,color);
}
const $=id=>document.getElementById(id);
let dialog=null,home=null,nav=null,mode='home',game=null,renderer=null,scene=null,camera=null,observer=null;
let lastColor='',queue=[],working=false;
const cached=new Map(),MAX_CACHE=120;
function picture(id,color){
 const key=id+'/'+color;if(cached.has(key))return cached.get(key);
 let root=null,url=null;
 try{
  if(!renderer){
   renderer=new THREE.WebGLRenderer({canvas:document.createElement('canvas'),antialias:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
   renderer.setPixelRatio(1);renderer.setSize(256,176,false);renderer.setClearColor(0x172532);
   scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,256/176,.1,2000);
   scene.add(new THREE.HemisphereLight(0xffffff,0x657184,2.1));
   const sun=new THREE.DirectionalLight(0xffffff,2.1);sun.position.set(20,30,25);scene.add(sun);
  }
  root=hangarPreviewModel(id,color,game);if(!root)throw new Error('Model unavailable '+id);
  root.visible=true;paintHangarVehicle(root,color);root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);if(bounds.isEmpty())throw new Error('Empty model '+id);
  const centre=bounds.getCenter(new THREE.Vector3()),radius=Math.max(.75,bounds.getSize(new THREE.Vector3()).length()*.5);
  const distance=radius/Math.sin(34*Math.PI/360)*1.18;
  camera.position.copy(centre).add(new THREE.Vector3(distance*.72,distance*.43,distance*.69));
  camera.lookAt(centre);camera.near=Math.max(.01,distance*.004);camera.far=distance*5;camera.updateProjectionMatrix();
  scene.add(root);renderer.render(scene,camera);url=renderer.domElement.toDataURL('image/webp',.84);scene.remove(root);
  // A valid WEBP data URL can still contain nothing but background if a
  // streamed actor is culled or a GPU fails. Do not silently treat it as art.
  const gl=renderer.getContext(),pixels=new Uint8Array(256*176*4);
  gl.readPixels(0,0,256,176,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let occupied=0;
  for(let i=0;i<pixels.length;i+=16){if(Math.abs(pixels[i]-23)+Math.abs(pixels[i+1]-37)+Math.abs(pixels[i+2]-50)>40)occupied++;}
  if(occupied<100)throw new Error('Blank GPU thumbnail: '+id);
 }catch(error){
  if(root?.parent)root.parent.remove(root);
  console.warn('Hangar preview fallback',id,error?.message||error);
  const s=VEHICLES[id];
  const silhouette=s?.aircraft?(s.plane
   ?'<path d="M128 29 140 72 215 100 215 110 141 98 142 128 167 143 167 150 128 141 89 150 89 143 114 128 115 98 41 110 41 100 116 72Z"/>'
   :'<path d="M72 90Q72 64 107 64H148Q184 64 184 90L161 109H92Z"/><path d="M28 48H228V54H28ZM124 48H132V113H124ZM124 100H134V133H124ZM111 134H145V138H111Z"/>')
   :'<path d="M24 105L44 66h168l20 39Z"/>';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="176"><rect width="256" height="176" rx="12" fill="#172532"/><g fill="${color}">${silhouette}</g><text x="128" y="160" fill="#fff" font-family="Arial" font-size="11" text-anchor="middle">${esc(s?.name||id).slice(0,29)}</text></svg>`;
  url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 }
 // Factory models may share cached geometry and materials with live vehicles.
 // Disposing shared resources here corrupts later previews and game objects.
 if(cached.size>=MAX_CACHE)cached.delete(cached.keys().next().value);cached.set(key,url);return url;
}
function enqueue(img,id,color){
 const key=id+'/'+color;if(img.dataset.previewReady===key||img.dataset.previewPending===key)return;
 img.dataset.previewPending=key;queue.push({img,id,color});
 if(!working){working=true;requestAnimationFrame(drain);}
}
function drain(){
 for(let n=0;n<2&&queue.length;n++){
  const {img,id,color}=queue.shift(),key=id+'/'+color;
  if(!img.isConnected||!dialog?.open||mode==='home'||img.dataset.previewPending!==key)continue;
  img.src=picture(id,color);img.alt='Anteprima tridimensionale del modello '+VEHICLES[id].name;img.dataset.previewReady=key;
 }
 if(queue.length)requestAnimationFrame(drain);else working=false;
}
function refresh(){
 if(!dialog||!home)return;
 const grid=$('hangarGrid'),controls=dialog.querySelector('.hangar-controls'),count=$('hangarCount'),isHome=mode==='home';
 home.hidden=!isHome;nav.hidden=isHome;controls.hidden=isHome;count.hidden=isHome;grid.hidden=isHome;
 if(isHome){observer?.disconnect();queue.length=0;return;}
 nav.querySelector('strong').textContent=HANGAR_SECTIONS.find(s=>s.id===mode).title;
 const color=$('hangarPaint').value;
 if(color!==lastColor){lastColor=color;cached.clear();queue.length=0;observer?.disconnect();}
 const category=hangarCatalogue().filter(e=>hangarSection(e.id,e.spec)===mode),ids=new Set(category.map(e=>e.id));
 let matches=0;
 for(const card of grid.querySelectorAll('[data-hangar-id]')){
  const id=card.dataset.hangarId,show=ids.has(id);card.hidden=!show;if(!show)continue;
  matches++;const img=card.querySelector('img');if(!img)continue;
  const key=id+'/'+color;
  if(img.dataset.previewReady===key&&cached.has(key)){img.src=cached.get(key);continue;}
  img.dataset.previewReady='';img.dataset.previewPending='';img.alt='Anteprima tridimensionale del modello '+VEHICLES[id].name;
  if(observer)observer.observe(img);else enqueue(img,id,color);
 }
 count.textContent=`${matches} risultati · ${category.length} mezzi nella categoria`;
}
function goHome(){mode='home';observer?.disconnect();queue.length=0;refresh();}
function enter(id){mode=id;$('hangarSearch').value='';$('hangarFilter').value='all';$('hangarFilter').dispatchEvent(new Event('change',{bubbles:true}));refresh();}
function install(g){
 game=g;if(dialog||typeof document==='undefined')return;
 dialog=$('mandriaHangarDialog');if(!dialog)return;
 const style=document.createElement('style');style.textContent=`
 #mandriaHangarDialog .hangar-sections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin:15px 0}
 #mandriaHangarDialog .hangar-section{display:flex;flex-direction:column;align-items:flex-start;text-align:left;min-height:137px;gap:7px;background:linear-gradient(135deg,#29485b,#19323f);color:#fff;border:1px solid #738d9b;border-radius:12px;padding:16px;cursor:pointer}
 #mandriaHangarDialog .hangar-section:hover:not(:disabled),#mandriaHangarDialog .hangar-section:focus-visible{outline:2px solid #edc677}
 #mandriaHangarDialog .hangar-section:disabled{opacity:.55;cursor:not-allowed;border-style:dashed}
 #mandriaHangarDialog .hangar-section-icon{font-size:29px;line-height:1;color:#e7c184}
 #mandriaHangarDialog .hangar-section strong{font-size:19px}#mandriaHangarDialog .hangar-section small{color:#d3e1e9;font-size:12px}
 @media(max-width:550px){#mandriaHangarDialog .hangar-sections{grid-template-columns:1fr 1fr;gap:8px}#mandriaHangarDialog .hangar-section{min-height:115px;padding:10px}#mandriaHangarDialog .hangar-section strong{font-size:15px}#mandriaHangarDialog .hangar-section-icon{font-size:23px}}
 `;document.head.appendChild(style);
 home=document.createElement('div');home.id='hangarSections';home.className='hangar-sections';home.setAttribute('aria-label','Scegli la tipologia di mezzo');
 home.innerHTML=HANGAR_SECTIONS.map(s=>`<button type="button" class="hangar-section" data-section="${s.id}" ${s.enabled?'':'disabled aria-disabled="true"'}><span class="hangar-section-icon" aria-hidden="true">${s.symbol}</span><strong>${s.title}</strong><small>${s.subtitle}</small></button>`).join('');
 nav=document.createElement('nav');nav.id='hangarNavigation';nav.className='hangar-navigation';nav.hidden=true;
 nav.innerHTML='<button type="button" class="hangar-back" id="hangarBack">← Categorie</button><strong></strong>';
 dialog.querySelector('.hangar-controls').before(home,nav);
 home.querySelectorAll('[data-section]:not(:disabled)').forEach(b=>b.addEventListener('click',()=>enter(b.dataset.section)));
 nav.querySelector('button').addEventListener('click',goHome);
 observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{
  const color=$('hangarPaint').value;for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);const card=e.target.closest('[data-hangar-id]');if(card&&!card.hidden)enqueue(e.target,card.dataset.hangarId,color);}
 },{root:dialog,rootMargin:'80px'});
 new MutationObserver(()=>{if(mode!=='home')refresh();}).observe($('hangarGrid'),{childList:true});
 for(const event of ['input','change'])for(const id of ['hangarSearch','hangarFilter','hangarPaint'])$(id).addEventListener(event,()=>{if(mode!=='home')refresh();});
 new MutationObserver(()=>{if(dialog.open)goHome();else{observer?.disconnect();queue.length=0;}}).observe(dialog,{attributes:true,attributeFilter:['open']});
 goHome();
}
const update=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaCatalogCategories){ModernGameplay.prototype.__mandriaCatalogCategories=true;ModernGameplay.prototype.update=function(dt){update.call(this,dt);if(this.state?.started)install(this);};}
