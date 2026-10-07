// The guide describes the active controls; it never changes input or physics.
let guide=null,list=null,title=null,lastSignature='';
const military=new Set(['airport-jet','airport-interceptor','airport-strike','airport-blackbird']);
export function commandSet(state,water={}){
 const car=state.mode==='car'?state.car:null,spec=car?.spec||{},race=!!car?.raceOneRules;
 const commands=[];
 const add=(key,label)=>commands.push([key,label]);
 let name='A piedi';
 if(water.swimming){name='Nuoto';add('W A S D','Nuota');add('SPAZIO','Immergiti');add('SHIFT','Nuota veloce');}
 else if(spec.aircraft){
  name=spec.plane?'Aereo':'Elicottero';
  if(military.has(car.style)||car.style==='airport-michelangelo'){
   add('TAB','Accelera');add('CTRL','Frena');add('↑ / ↓','Sali / scendi');add('A / D','Sterza');
   if(military.has(car.style)){add('G','Missile');add('Q','Mega missile');}
  }else{add('W / S','Velocità');add('A / D','Sterza');add('SPAZIO','Sali / decolla');add('SHIFT','Scendi');}
  add('F','Paracadute');add('E','Esci a terra');
 }else if(car){
  name=race?'Gara':spec.watercraft||spec.boat?'Barca':spec.tracked?'Carro armato':/motorcycle|scooter|bike/.test(car.style)?'Moto':'Auto';
  add('W / S','Accelera / retro');add('A / D','Sterza');add('SPAZIO','Frena');
  add('SHIFT',race?'Turbo gara':'Boost');add('H','Clacson');
  if(spec.tracked)add('TAB','Cannone');
  else if(car.style==='cinquecento'&&!race)add('TAB','Turbo · max 6 s');
  if(!race){add('E',water.vehicle?'Esci e nuota':'Scendi');if(!spec.watercraft&&!spec.boat)add('K','Cruise control');}
 }else{add('W A S D','Muoviti');add('SPAZIO','Salta');add('SHIFT','Corri');add('E','Sali / interagisci');add('T','Saluta');}
 add('C','Telecamera');add(race?'ESC':'X / ESC','Pausa');
 if(race)add('X','Abbandona gara');
 else{add('M','Mappa');add('J','Attività');add('V','Veicoli');add('B','Barche');}
 if(!car||car.testingVehicle||car.raceOneRules||spec.aircraft||spec.watercraft)add('R',car?.testingVehicle?'Ripara · testing':'Recupera personaggio');
 return {name,commands};
}
function ensureGuide(){
 if(guide||!globalThis.document?.body)return !!guide;
 guide=document.createElement('details');guide.id='commandGuide';guide.hidden=true;
 guide.open=globalThis.matchMedia?.('(min-width:801px) and (min-height:501px) and (pointer:fine)').matches??true;
 title=document.createElement('summary');list=document.createElement('dl');
 guide.append(title,list);document.getElementById('playingUI')?.appendChild(guide);
 const measure=()=>document.body.style.setProperty('--command-guide-height',guide.hidden?'0px':`${Math.ceil(guide.getBoundingClientRect().height)}px`);
 if(globalThis.ResizeObserver)new ResizeObserver(measure).observe(guide);
 guide.addEventListener('toggle',measure);return true;
}
export function updateCommandGuide(state,water){
 if(!ensureGuide())return;
 guide.hidden=!state.started||!!state.paused;
 const set=commandSet(state,water);
 if(document.body.classList.contains('mandria-sniper')){
  set.name='Poligono';set.commands=[['CLICK','Spara'],['X','Riponi arma'],['ESC','Pausa'],['W A S D','Muoviti']];
 }
 for(const [id,key,label] of [['mandriaHangarButton','H','Hangar'],['dealerBtn','G','Concessionario']]){
  const action=document.getElementById(id);
  if(action&&!action.hidden&&action.textContent.trim()&&!set.commands.some(([k])=>k===key))set.commands.push([key,label]);
 }
 const signature=JSON.stringify(set);if(signature===lastSignature)return;lastSignature=signature;
 title.textContent=`Comandi · ${set.name}`;list.replaceChildren();
 for(const [key,label] of set.commands){const term=document.createElement('dt'),kbd=document.createElement('kbd'),description=document.createElement('dd');kbd.textContent=key;term.append(kbd);description.textContent=label;list.append(term,description);}
}
