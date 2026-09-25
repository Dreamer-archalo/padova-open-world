const mapSide=document.querySelector('#mapDialog .map-side');
const goPadova=document.getElementById('goPadova');
if(mapSide&&goPadova&&!document.getElementById('drivePadova')){
 const button=document.createElement('button');button.id='drivePadova';button.type='button';
 button.innerHTML='<b>PADOVA VIA STRADA</b><small>Mondo continuo · Ponte della Libertà, Mestre e Riviera</small>';
 button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();location.href='./continuous-world.html?spawn=venice';});
 goPadova.insertAdjacentElement('afterend',button);
}
