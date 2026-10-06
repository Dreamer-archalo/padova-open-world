// Presentation only; state, input, missions and vehicle physics stay in game.js.
const toggle=globalThis.document?.getElementById?.('hudDetailsBtn');
if(globalThis.document?.body?.dataset)document.body.dataset.playing='false';
let complete=false;
function paint(){
 if(globalThis.document?.body?.dataset)document.body.dataset.ui=complete?'complete':'compact';
 if(toggle){toggle.setAttribute('aria-pressed',String(complete));toggle.textContent=complete?'HUD −':'HUD +';toggle.setAttribute('aria-label',complete?'Riduci i dettagli dell’interfaccia':'Mostra tutti i dettagli dell’interfaccia');}
}
toggle?.addEventListener('click',()=>{complete=!complete;paint();});
paint();
// Reuse the activities entry point, including race and mission extensions.
globalThis.document?.getElementById?.('missionSelectBtn')?.addEventListener('click',()=>{
 globalThis.document?.getElementById?.('activityBtn')?.click();
});
export function updateHUDState(state,water){
 const b=globalThis.document?.body;if(!b)return;b.dataset??={};
 if(state.started&&b.dataset.playing!=='true'){complete=false;paint();}
 b.dataset.playing=String(!!state.started);b.dataset.driving=String(state.mode==='car');
 b.dataset.aircraft=String(!!state.car?.spec.aircraft);b.dataset.missionActive=String(!!state.mission);
 b.dataset.wantedActive=String(state.wanted>0);b.dataset.healthAlert=String(state.health<99||!!water.active);
 if(toggle)toggle.hidden=!state.started;
 const actions=document.getElementById('hudActions');
 for(const [id,label] of [['nauticalButton','Barche']]){
  const button=document.getElementById(id);if(!button?.nodeType||!actions)continue;
  if(button.parentNode!==actions)actions.appendChild(button);
  if(document.body.dataset.ui==='compact'&&button.textContent!==label)button.textContent=label;
 }
}
