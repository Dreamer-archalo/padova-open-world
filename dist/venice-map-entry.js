const mapDialog=document.getElementById('mapDialog');
const mapPlaces=document.getElementById('mapPlaces');

function installVeniceButton(){
 if(!mapPlaces||document.getElementById('goVenice'))return;
 const button=document.createElement('button');
 button.id='goVenice';
 button.className='primary';
 button.type='button';
 button.innerHTML='<b>VAI A VENEZIA →</b><small>Nuova mappa · calli, ponti e canali</small>';
 button.addEventListener('click',event=>{
  event.preventDefault();
  event.stopPropagation();
  location.href='./venice.html';
 });
 mapPlaces.prepend(button);
}
if(mapDialog&&mapPlaces){
 const observer=new MutationObserver(()=>installVeniceButton());
 observer.observe(mapPlaces,{childList:true});
 mapDialog.addEventListener('toggle',()=>{if(mapDialog.open)installVeniceButton();});
 document.getElementById('mapBtn')?.addEventListener('click',()=>queueMicrotask(installVeniceButton));
 installVeniceButton();
}
