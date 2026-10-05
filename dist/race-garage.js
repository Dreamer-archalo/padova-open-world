import * as THREE from './vendor/three.module.js';
import {VEHICLES,createVehicle} from './vehicles.js';
import {SPECIAL_VEHICLES,createSpecialVehicle} from './special-vehicles.js';
import {NPC_VEHICLES,createNPCCar} from './modern-vehicles.js';

const thumbnails=new Map();
// Render the real game models, using one temporary context for all 30 pictures.
async function renderThumbnails(content,choices){
 const missing=choices.filter(c=>!thumbnails.has(c.id));if(!missing.length)return;
 let renderer;
 try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setSize(280,170);renderer.setPixelRatio(1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,280/170,.1,100);
  scene.add(new THREE.HemisphereLight('#e2f4ff','#716354',3));const light=new THREE.DirectionalLight('#fff4dc',3);light.position.set(3,7,5);scene.add(light);
  for(const c of missing){
   if(!content.isConnected||!content.querySelector('#raceGarage'))break;
   const color=c.id==='taxi'?'#e5c657':c.id==='cinquecento'?'#e6554a':'#4bb5c8';
   const model=SPECIAL_VEHICLES[c.id]?createSpecialVehicle(c.id):NPC_VEHICLES[c.id]?createNPCCar(c.id,color):createVehicle(c.id,color);
   scene.add(model);const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),span=Math.max(size.x,size.z,size.y*1.6);
   camera.position.set(center.x+span*1.06,center.y+span*.58,center.z+span*1.16);camera.lookAt(center);renderer.render(scene,camera);
   const src=renderer.domElement.toDataURL('image/png');thumbnails.set(c.id,src);const img=content.querySelector(`[data-vehicle="${c.id}"] img`);if(img)img.src=src;
   const hero=content.querySelector('#raceGaragePreview');if(hero?.dataset.vehicle===c.id)hero.src=src;
   // Model geometry/materials are shared with live cars: renderer cleanup only.
   scene.remove(model);await new Promise(resolve=>setTimeout(resolve,0));
  }
 }catch(error){console.warn('Garage preview:',error.message);const hint=content.querySelector('#raceGarageImageHint');if(hint)hint.textContent='Anteprime 3D non disponibili su questo dispositivo.';}
 finally{renderer?.dispose();renderer?.forceContextLoss();}
}
export function openRaceGarage(manager,mode,catalogue){
 const content=document.getElementById('menuContent');if(!content)return;
 const {choices,spec,stats,profiles,profile}=catalogue;
 let selected=choices.some(c=>c.id===manager.selectedRaceVehicle)?manager.selectedRaceVehicle:'fulmine';
 document.getElementById('menuTitle').textContent='Scegli il tuo mezzo';
 content.innerHTML=`<style>
 #menu:has(#raceGarage){width:min(940px,94vw)}
 .race-garage-head{display:grid;grid-template-columns:1fr 1fr;gap:22px;align-items:center;padding:14px 18px;background:#20313d;border:1px solid #526575;border-radius:12px}
 .race-garage-head img{width:100%;height:170px;object-fit:contain;background:radial-gradient(ellipse,#47606d,transparent 68%)}
 .race-garage-head h3{margin:2px 0 7px;font-size:24px}.race-garage-head p{font-size:13px;color:#bdcdd4;margin:6px 0}
 .race-stat-label{display:flex;justify-content:space-between;font-size:12px;margin:9px 0 4px}.race-stat-track{height:9px;border-radius:8px;background:#101c27;overflow:hidden}.race-stat-track i{display:block;height:100%;background:linear-gradient(90deg,#32c7b2,#dbef6d);border-radius:8px;transition:width .3s}.race-stat-track small{display:none}
 .race-vehicle-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;max-height:30vh;overflow:auto;padding:4px;margin-top:16px}
 .race-vehicle-card{text-align:left;padding:7px;border-radius:9px;background:#192a36;min-width:0}.race-vehicle-card[aria-pressed=true]{border:2px solid #e1f47b;background:#344839;padding:6px}.race-vehicle-card img{display:block;width:100%;height:77px;object-fit:contain}.race-vehicle-card b{display:block;font-size:12px;line-height:1.3}.race-vehicle-card small{font-size:10px;color:#aabfc9}
 .race-garage-actions{position:sticky;bottom:-30px;background:#101e28;padding:10px 0;margin-top:12px}.race-garage-actions .primary{flex:1}
 @media(max-width:600px){.race-garage-head{grid-template-columns:1fr;padding:12px;gap:3px}.race-garage-head img{height:110px}.race-garage-head h3{font-size:20px}.race-vehicle-grid{grid-template-columns:repeat(3,minmax(0,1fr));max-height:26vh}.race-vehicle-card img{height:55px}.race-stat-label{margin-top:6px}}
 @media(prefers-reduced-motion:reduce){.race-stat-track i{transition:none}}
 </style><div id="raceGarage"><p class="about-copy" style="margin-top:0">${{easy:'Facile',medium:'Medio',hard:'Difficile'}[mode]} · <strong>30 mezzi, scegli il tuo.</strong> Tre turbo SHIFT, prestazioni bilanciate per la gara.</p>
 <div class="race-garage-head"><div><img id="raceGaragePreview" alt=""><small id="raceGarageImageHint">Il modello che guiderai in gara</small></div><div><h3 id="raceGarageName"></h3><p id="raceGarageDescription"></p><div id="raceGarageStats"></div></div></div>
 <div class="race-vehicle-grid" aria-label="Mezzi disponibili">${choices.map(c=>`<button type="button" class="race-vehicle-card" data-vehicle="${c.id}" aria-pressed="false"><img alt="${c.name}" ${thumbnails.has(c.id)?`src="${thumbnails.get(c.id)}"`:''}><b>${c.name}</b><small>${profiles[c.profile].label}</small></button>`).join('')}</div>
 <div class="menu-actions race-garage-actions"><button id="confirmRaceVehicle" class="primary">CORRI CON QUESTO MEZZO</button><button id="backRaceDifficulty">INDIETRO</button></div></div>`;
 const paint=()=>{
  const s=spec(selected),p=profiles[selected==='fulmine'?'balanced':profile(VEHICLES[selected])],hero=document.getElementById('raceGaragePreview');
  document.getElementById('raceGarageName').textContent=s.name;document.getElementById('raceGarageDescription').textContent=p.description;hero.dataset.vehicle=selected;hero.alt=s.name;if(thumbnails.has(selected))hero.src=thumbnails.get(selected);else hero.removeAttribute('src');
  document.getElementById('raceGarageStats').innerHTML=stats(selected).map(stat=>`<div class="race-stat-label"><span>${stat.label}</span><strong>${stat.value}%</strong></div><div class="race-stat-track" role="progressbar" aria-label="${stat.label}" aria-valuenow="${stat.value}" aria-valuemin="0" aria-valuemax="100" aria-valuetext="${stat.detail}" title="${stat.detail}"><i style="width:0" data-fill="${stat.value}"></i></div>`).join('');
  requestAnimationFrame(()=>{for(const fill of content.querySelectorAll('[data-fill]'))fill.style.width=fill.dataset.fill+'%';});
  for(const button of content.querySelectorAll('[data-vehicle]'))button.setAttribute('aria-pressed',String(button.dataset.vehicle===selected));
 };
 for(const button of content.querySelectorAll('[data-vehicle]'))button.onclick=()=>{selected=button.dataset.vehicle;paint();};
 document.getElementById('confirmRaceVehicle').onclick=()=>{manager.selectedRaceVehicle=selected;manager.start({difficulty:mode,vehicle:selected});};
 document.getElementById('backRaceDifficulty').onclick=()=>manager.openConfirmation();paint();
 renderThumbnails(content,choices);document.getElementById('confirmRaceVehicle').focus();
}
