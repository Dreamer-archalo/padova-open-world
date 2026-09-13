const speedEl=document.getElementById('speed');
const vehicleName=document.getElementById('vehicleName');
const driving=document.querySelector('.hud.driving');
const chute=document.getElementById('touchChute');
const cannon=document.getElementById('cannonStatus');

let enabled=false,target=70,wHeld=false,sHeld=false,lastStep=0;
const control=document.createElement('div');
control.className='cruise-control';
control.innerHTML='<span>VELOCITÀ AUTOMATICA</span><div><button type="button" data-cruise="down" aria-label="Riduci velocità automatica">−10</button><button type="button" data-cruise="toggle"><strong>CRUISE OFF</strong><small>K</small></button><button type="button" data-cruise="up" aria-label="Aumenta velocità automatica">+10</button></div>';
driving?.appendChild(control);
const main=control.querySelector('[data-cruise="toggle"]'),label=main?.querySelector('strong');

function kmh(){return Number(speedEl?.textContent)||0;}
function carEligible(){return vehicleName?.textContent!=='ON FOOT'&&chute?.hidden!==false&&cannon?.hidden!==false;}
function emit(code,down){window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true,cancelable:true}));}
function hold(code,on){if(code==='KeyW'){if(on===wHeld)return;wHeld=on;}else{if(on===sHeld)return;sHeld=on;}emit(code,on);}
function release(){hold('KeyW',false);hold('KeyS',false);}
function paint(){if(!label)return;label.textContent=enabled?'CRUISE '+target+' KM/H':'CRUISE OFF';control.dataset.active=enabled?'true':'false';}
function disable(message=''){if(!enabled&&!wHeld&&!sHeld)return;enabled=false;release();paint();if(message){const toast=document.getElementById('toast');if(toast){toast.textContent=message;toast.hidden=false;}}}
function toggle(){if(enabled){disable('Velocità automatica disattivata.');return;}if(!carEligible())return;const current=kmh();target=current>=25?Math.max(30,Math.min(160,Math.round(current/10)*10)):70;enabled=true;paint();}
function adjust(delta){target=Math.max(30,Math.min(160,target+delta));if(!enabled&&carEligible())enabled=true;paint();}

control.querySelector('[data-cruise="down"]')?.addEventListener('click',()=>adjust(-10));
control.querySelector('[data-cruise="up"]')?.addEventListener('click',()=>adjust(10));
main?.addEventListener('click',toggle);
window.addEventListener('keydown',e=>{if(!e.isTrusted||e.repeat)return;if(e.code==='KeyK'){e.preventDefault();toggle();return;}if(enabled&&['KeyW','KeyS','Space'].includes(e.code))disable('Controllo manuale · cruise disattivato.');});
window.addEventListener('blur',()=>disable());
document.addEventListener('visibilitychange',()=>{if(document.hidden)disable();});

function step(t){requestAnimationFrame(step);if(t-lastStep<90)return;lastStep=t;if(!enabled)return;if(!carEligible()){disable();return;}const speed=kmh(),error=target-speed;
 // Synthetic W/S events feed the same controller as the normal pedals. A small
 // dead-band prevents constant brake/throttle chatter around the chosen speed.
 if(error>3){hold('KeyS',false);hold('KeyW',true);}else if(error<-4){hold('KeyW',false);hold('KeyS',true);}else if(error>0.7){hold('KeyS',false);hold('KeyW',true);}else{release();}
}
paint();requestAnimationFrame(step);
