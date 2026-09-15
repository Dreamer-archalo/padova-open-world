import './multiplayer-live.js';

const speedEl=document.getElementById('speed');
const vehicleName=document.getElementById('vehicleName');
const driving=document.querySelector('.hud.driving');
const chute=document.getElementById('touchChute');
const cannon=document.getElementById('cannonStatus');

let enabled=false,target=70,wHeld=false,sHeld=false,lastStep=0;
const control=document.createElement('div');
control.className='cruise-control';
control.innerHTML='<span>VELOCITÀ AUTOMATICA</span><div><button type="button" data-cruise="down" aria-label="Riduci velocità automatica">−5</button><button type="button" data-cruise="toggle"><strong>CRUISE OFF</strong><small>K · MEMORIZZA</small></button><button type="button" data-cruise="up" aria-label="Aumenta velocità automatica">+5</button></div>';
driving?.appendChild(control);
const main=control.querySelector('[data-cruise="toggle"]'),label=main?.querySelector('strong');

function kmh(){return Number(speedEl?.textContent)||0;}
function carEligible(){return vehicleName?.textContent!=='ON FOOT'&&chute?.hidden!==false&&cannon?.hidden!==false;}
function emit(code,down){window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true,cancelable:true}));}
function hold(code,on){if(code==='KeyW'){if(on){wHeld=true;emit(code,true);return;}if(!wHeld)return;wHeld=false;}else{if(on){sHeld=true;emit(code,true);return;}if(!sHeld)return;sHeld=false;}emit(code,false);}
function release(){hold('KeyW',false);hold('KeyS',false);}
function paint(){if(!label)return;label.textContent=enabled?'CRUISE '+target+' KM/H':'CRUISE OFF';control.dataset.active=enabled?'true':'false';}
function note(message){const toast=document.getElementById('toast');if(toast){toast.textContent=message;toast.hidden=false;}}
function disable(message=''){if(!enabled&&!wHeld&&!sHeld)return;enabled=false;release();paint();if(message)note(message);}
function toggle(){if(enabled){disable('Velocità automatica disattivata.');return;}if(!carEligible())return;const current=kmh();if(current<8){note('Portati alla velocità desiderata e premi K per memorizzarla.');return;}target=Math.max(10,Math.min(180,Math.round(current)));enabled=true;paint();note('Cruise · '+target+' km/h memorizzati.');}
function adjust(delta){if(!carEligible())return;if(!enabled){const current=kmh();if(current<8){note('Prima raggiungi la velocità desiderata.');return;}target=Math.round(current);enabled=true;}target=Math.max(10,Math.min(180,target+delta));paint();}

control.querySelector('[data-cruise="down"]')?.addEventListener('click',()=>adjust(-5));
control.querySelector('[data-cruise="up"]')?.addEventListener('click',()=>adjust(5));
main?.addEventListener('click',toggle);
window.addEventListener('keydown',e=>{if(!e.isTrusted||e.repeat)return;if(e.code==='KeyK'){e.preventDefault();toggle();return;}if(enabled&&['KeyW','KeyS','Space','Escape'].includes(e.code))disable(e.code==='Escape'?'':'Controllo manuale · cruise disattivato.');});
window.addEventListener('blur',()=>disable());
document.addEventListener('visibilitychange',()=>{if(document.hidden)disable();});

function step(t){requestAnimationFrame(step);if(t-lastStep<90)return;lastStep=t;if(!enabled)return;if(!carEligible()){disable();return;}const speed=kmh(),error=target-speed;
 // The same W/S controller is used, but with a wider dead-band so it does not
 // chatter around the memorised speed.
 if(error>2.2){hold('KeyS',false);hold('KeyW',true);}else if(error<-3.2){hold('KeyW',false);hold('KeyS',true);}else if(error>.9){hold('KeyS',false);hold('KeyW',true);}else{release();}
}
paint();requestAnimationFrame(step);
