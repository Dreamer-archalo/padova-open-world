// Lightweight district-entry banner driven by the HUD the game already owns.
// This deliberately does not touch controller state, keeping the feature
// independent from movement, saves and streaming.
const district=document.getElementById('district');
const locationName=document.getElementById('location');
const playing=document.getElementById('playingUI');

const banner=document.createElement('div');
banner.id='zoneBanner';banner.className='zone-banner';banner.hidden=true;banner.setAttribute('aria-live','polite');
banner.innerHTML='<span class="zone-banner-kicker">PADOVA / ZONA</span><strong class="zone-banner-name"></strong><small class="zone-banner-subtitle"></small>';
document.body.appendChild(banner);
const nameEl=banner.querySelector('.zone-banner-name'),subtitleEl=banner.querySelector('.zone-banner-subtitle');
let lastKey='',timer=0;

function currentZone(){
 const loc=(locationName?.textContent||'').trim(),raw=(district?.textContent||'PADOVA').trim();
 if(/portello/i.test(loc))return {key:'portello',name:'PORTELLO',subtitle:'QUARTIERE UNIVERSITARIO'};
 if(/aeroporto|airport/i.test(loc)||/aeroporto|airport/i.test(raw))return {key:'airport',name:'AEROPORTO',subtitle:'ZONA AEROPORTUALE'};
 const name=raw||'PADOVA';
 return {key:name.toLowerCase(),name,subtitle:loc&&loc.toLowerCase()!==name.toLowerCase()?loc:'PADOVA'};
}
function showZone(force=false){
 if(!playing||playing.hidden)return;
 const zone=currentZone();if(!force&&zone.key===lastKey)return;lastKey=zone.key;
 nameEl.textContent=zone.name;subtitleEl.textContent=zone.subtitle;
 banner.hidden=false;banner.classList.remove('zone-banner-show');void banner.offsetWidth;banner.classList.add('zone-banner-show');
 clearTimeout(timer);timer=setTimeout(()=>{banner.classList.remove('zone-banner-show');timer=setTimeout(()=>banner.hidden=true,420);},2600);
}
const observer=new MutationObserver(()=>showZone(false));
if(district)observer.observe(district,{childList:true,subtree:true,characterData:true});
if(locationName)observer.observe(locationName,{childList:true,subtree:true,characterData:true});
if(playing)observer.observe(playing,{attributes:true,attributeFilter:['hidden']});
setTimeout(()=>showZone(true),0);

export {showZone};
