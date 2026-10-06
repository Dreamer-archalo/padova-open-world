// Presentation only; state, input, missions and vehicle physics stay in game.js.
import {updateCommandGuide} from './command-guide.js';
if(globalThis.document?.body?.dataset)document.body.dataset.playing='false';
function paint(){if(globalThis.document?.body?.dataset)document.body.dataset.ui='compact';}
paint();
// Reuse the activities entry point, including race and mission extensions.
globalThis.document?.getElementById?.('missionSelectBtn')?.addEventListener('click',()=>{
 globalThis.document?.getElementById?.('activityBtn')?.click();
});
export function updateHUDState(state,water){
 const b=globalThis.document?.body;if(!b)return;b.dataset??={};
 paint();
 b.dataset.playing=String(!!state.started);b.dataset.driving=String(state.mode==='car');
 b.dataset.aircraft=String(!!state.car?.spec.aircraft);b.dataset.missionActive=String(!!state.mission);
 b.dataset.wantedActive=String(state.wanted>0);b.dataset.healthAlert=String(state.health<99||!!water.active);
 updateCommandGuide(state,water);
 const actions=document.getElementById('hudActions');
 for(const [id,label] of [['nauticalButton','Barche']]){
  const button=document.getElementById(id);if(!button?.nodeType||!actions)continue;
  if(button.parentNode!==actions)actions.appendChild(button);
  if(document.body.dataset.ui==='compact'&&button.textContent!==label)button.textContent=label;
 }
}
