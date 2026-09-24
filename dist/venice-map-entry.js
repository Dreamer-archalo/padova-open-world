const mapDialog=document.getElementById('mapDialog');
const mapPlaces=document.getElementById('mapPlaces');

function travelButton(id,className,html,href){
 let button=document.getElementById(id);
 if(button)return button;
 button=document.createElement('button');button.id=id;button.className=className;button.type='button';button.innerHTML=html;
 button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();location.href=href;});
 return button;
}
function installVeniceButtons(){
 if(!mapPlaces)return;
 const fast=travelButton('goVenice','primary','<b>VAI A VENEZIA →</b><small>Fast travel · calli, ponti e canali</small>','./venice.html');
 const drive=travelButton('driveVenice','','<b>VENEZIA VIA STRADA</b><small>Mondo continuo · Padova, Riviera, Mestre, Ponte della Libertà</small>','./continuous-world.html');
 if(!fast.parentNode)mapPlaces.prepend(fast);
 if(!drive.parentNode)fast.insertAdjacentElement('afterend',drive);
}
if(mapDialog&&mapPlaces){
 const observer=new MutationObserver(()=>installVeniceButtons());
 observer.observe(mapPlaces,{childList:true});
 mapDialog.addEventListener('toggle',()=>{if(mapDialog.open)installVeniceButtons();});
 document.getElementById('mapBtn')?.addEventListener('click',()=>queueMicrotask(installVeniceButtons));
 installVeniceButtons();
}
