import {project,dist} from './core.js';
import {VEHICLES} from './vehicles.js';
import {DEALER_COLORS} from './dealerships.js';
import {dealerCapabilities,normalizeDealerOptions,dealerBuildSpec,protectionCapacity} from './dealer-customization.js';
import {mountDealerPreview} from './dealer-configurator-preview.js';
import {groundVehicle} from './vehicle-ownership.js';
import {findWorkshopYard,createWorkshopYard,animateWorkshopYard,registerWorkshopWalls} from './workshop-yard.js';

export const WORKSHOP_SITES=[
 ['padova','Officina Padova ZIP',45.4132272,11.9343780],
 ['padova-sud','Officina Padova Sud',45.3868,11.8722],
 ['dolo','Officina Riviera · Dolo',45.4275545,12.0936791],
 ['mira','Officina Mira',45.4342,12.1313],
 ['mirano','Officina Mirano',45.4949474,12.0905977],
 ['mestre','Officina Mestre',45.48175,12.2756],
 ['marghera','Officina Marghera',45.4635,12.2264]
].map(([id,name,lat,lon])=>({id,name,...project(lat,lon),tag:'Officina · prestazioni e sicurezza'}));
const euro=n=>'€'+Math.round(n).toLocaleString('it-IT'),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function workshopQuote(car,options={}){
 if(!groundVehicle(car)||car.health<=0||car.permanentlyDestroyed)return null;
 const old=car.mesh.userData.dealerBuild||{},base={...VEHICLES[car.style],vehicleType:car.style},definitions=dealerCapabilities(base,{workshop:true}),{selected,prices}=normalizeDealerOptions(base,{...old,...options});
 const previous=normalizeDealerOptions(base,old),build={...old,...selected,color:/^#[0-9a-f]{6}$/i.test(options.color||'')?options.color:old.color||'#315979',max:old.max??base.max};
 let amountDue=0;for(const [key,price] of Object.entries(prices))if(selected[key]!==previous.selected[key])amountDue+=Math.max(0,price-previous.prices[key]);
 if(build.color!==(old.color||'#315979'))amountDue+=220;
 const spec=dealerBuildSpec(VEHICLES[car.style],build);return {...build,amountDue,effectiveMax:spec.max,capacity:protectionCapacity(build),definitions};
}
export class VehicleWorkshops{
 constructor(env){Object.assign(this,env);this.active=new Map();this.prompt=null;}
 update(){if(!this.state.started||typeof document==='undefined')return;
  for(const site of WORKSHOP_SITES){
   const existing=this.active.get(site.id);if(existing){existing.visible=dist(existing.at,this.state)<440;if(existing.display?.workshopDisplay&&!existing.display.permanentlyDestroyed)existing.display.mesh.visible=existing.visible;continue;}
   if(dist(site,this.state)>850)continue;
   const layout=findWorkshopYard(site,this.safeRoad,this.terrain,this.clearYard||(()=>true));if(!layout)continue;
   const yard=createWorkshopYard(layout,this.scene,this.terrain,this.createPerson,site),at=layout.service;
   registerWorkshopWalls(layout,this.collision);
   const entry={...yard,site,at,visible:true};this.active.set(site.id,entry);
   // A real parked vehicle occupies one marked bay; the other is kept open
   // for the player's arrival and the repair interaction.
   if(this.addCar){const p=layout.display,car=this.addCar(p.x,p.z,layout.road.yaw,false,true,'compact');car.fixedSpawn=true;car.workshopDisplay=site.id;car.home={...p,yaw:layout.road.yaw};car.y=p.y;this.pose?.(car);entry.display=car;}
  }
  const near=this.nearest();if(!this.prompt){this.prompt=document.createElement('button');this.prompt.id='workshopPrompt';this.prompt.className='workshop-prompt';this.prompt.onclick=()=>this.open();document.getElementById('playingUI')?.append(this.prompt);}
  this.prompt.hidden=!near||this.state.paused;this.prompt.textContent=near?'E · '+near.site.name+' · modifica / ripara':'';
 }
 animate(){for(const entry of this.active.values())animateWorkshopYard(entry,this.state.elapsed,this.terrain);}
 access(site){return this.active.get(site.id)?.layout.road||findWorkshopYard(site,this.safeRoad,this.terrain,this.clearYard||(()=>true))?.road||this.safeRoad(site)||site;}
 nearest(range=13){if(this.state.mode!=='car'||!groundVehicle(this.state.car)||Math.abs(this.state.speed)>1||this.state.car.health<=0)return null;
  return [...this.active.values()].find(e=>e.visible!==false&&dist(e.at,this.state)<range&&Math.abs(e.at.y-this.state.y)<3);
 }
 purchase(car,options){if(!this.nearest()||this.state.car!==car)return null;const q=workshopQuote(car,options);if(!q||this.state.money<q.amountDue)return null;
  this.state.money-=q.amountDue;this.applyBuild(car,q);if(this.garage){this.garage.register(car,car.requestedByPlayer?'purchase':'street');this.garage.sync();}this.save();return q;
 }
 repair(car){if(!this.nearest()||this.state.car!==car||car.health<=0)return false;const price=this.repairPrice(car);if(this.state.money<price)return false;this.state.money-=price;car.health=this.state.health=100;car.crashDisabled=false;this.garage?.sync();this.save();return true;}
 repairPrice(car){return car.health>=100?0:Math.max(150,Math.ceil((100-car.health)*(car.spec.maxHealth||100)*.08));}
 open(){const entry=this.nearest(),car=this.state.car;if(!entry){this.toast('Fermati nella zona officina con un mezzo funzionante.',4);return false;}
  car.health=this.state.health;let options={...car.mesh.userData.dealerBuild},q=workshopQuote(car,options);if(!q)return false;
  const controls=Object.entries(q.definitions).map(([key,def])=>{const section=def.section||(['brakes','response','suspension','tyres'].includes(key)?'Prestazioni':'Estetica');return '<label data-section="'+section+'">'+esc(def.label)+'<select data-workshop-option="'+key+'">'+def.values.map(([v,label,price])=>'<option value="'+v+'">'+esc(label)+(price?' · '+euro(price):' · di serie')+'</option>').join('')+'</select></label>';}).join('');
  this.showMenu(entry.site.name,'<p class="about-copy">'+esc(car.name)+' · integrità '+Math.round(car.health)+'% · '+Math.round(car.health*(car.spec.maxHealth||100)/100)+' / '+(car.spec.maxHealth||100)+' vita</p><div id="workshopPreview" class="dealer-preview"></div><div class="configuration-tabs"><button data-workshop-tab="Estetica">Estetica</button><button data-workshop-tab="Prestazioni">Prestazioni</button><button data-workshop-tab="Sicurezza">Sicurezza</button></div><div class="activities dealer-options" id="workshopOptions"><label data-section="Estetica">Colore carrozzeria<input type="color" id="workshopColor" value="'+(q.color)+'"></label>'+controls+'</div><p class="about-copy" id="workshopTotal" aria-live="polite"></p><p class="about-copy">Le protezioni aumentano la vita e riducono il danno degli urti. Un relitto distrutto non può essere riparato. Le modifiche seguono questo mezzo: riportalo a casa per salvarlo.</p><button class="activity" id="workshopConfirm">Acquista e monta modifiche</button><button class="activity" id="workshopRepair">Ripara · '+euro(this.repairPrice(car))+'</button>');
  const root=document.getElementById('menuContent'),preview=mountDealerPreview(root.querySelector('#workshopPreview'),car.style);
  for(const input of root.querySelectorAll('[data-workshop-option]'))input.value=q[input.dataset.workshopOption];
  const update=()=>{options={color:root.querySelector('#workshopColor').value};for(const el of root.querySelectorAll('[data-workshop-option]'))options[el.dataset.workshopOption]=el.value;q=workshopQuote(car,options);root.querySelector('#workshopTotal').textContent='Da pagare '+euro(q.amountDue)+' · velocità '+Math.round(car.spec.max*3.6)+' → '+Math.round(q.effectiveMax*3.6)+' km/h · vita '+(car.spec.maxHealth||100)+' → '+q.capacity+' · saldo '+euro(this.state.money);root.querySelector('#workshopConfirm').disabled=this.state.money<q.amountDue;preview.update(q);};
  root.querySelectorAll('select,input').forEach(el=>{el.oninput=el.onchange=update;});root.querySelectorAll('[data-workshop-tab]').forEach(button=>button.onclick=()=>{for(const label of root.querySelectorAll('[data-section]'))label.hidden=label.dataset.section!==button.dataset.workshopTab;for(const b of root.querySelectorAll('[data-workshop-tab]'))b.setAttribute('aria-pressed',String(b===button));});root.querySelector('[data-workshop-tab]').click();update();
  root.querySelector('#workshopConfirm').onclick=()=>{const paid=this.purchase(car,options);if(!paid)return;this.closeDialogs();this.toast('Modifiche montate · '+Math.round(paid.effectiveMax*3.6)+' km/h · '+paid.capacity+' vita · '+euro(paid.amountDue),5);};
  root.querySelector('#workshopRepair').disabled=this.state.money<this.repairPrice(car)||car.health>=100;root.querySelector('#workshopRepair').onclick=()=>{if(this.repair(car)){this.closeDialogs();this.toast('Mezzo riparato in officina.',4);}};return true;
 }
}
