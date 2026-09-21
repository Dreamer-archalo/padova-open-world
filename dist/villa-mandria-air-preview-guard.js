// The catalogue renders individual GPU thumbnails asynchronously. A reused
// card must never display a truck while loading; identical GPU frames from
// differently named aircraft must not silently pass as model-specific images.
import {ModernGameplay} from './modern-gameplay.js';
import {VEHICLES} from './vehicles.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function aircraftPlaceholder(id,color='#b52f3d'){
 const spec=VEHICLES[id];if(!spec?.aircraft)return null;
 const rotor=!spec.plane,heavy=/cargo|transport|albatros|atlas/i.test(id),fast=/jet|fighter|strike|blackbird|interceptor|rondone/i.test(id);
 const silhouette=rotor
  ?'<path d="M64 93Q64 66 109 66H147Q183 66 188 90L159 112H88Z"/><path d="M21 48H234V54H21ZM126 49H132V117H126ZM127 109H136V138H127ZM112 137H149V142H112Z"/><path d="M80 115H166V122H80Z"/>'
  :fast
   ?'<path d="M128 22 141 69 222 102 222 113 142 96 144 125 165 141 165 150 128 139 91 150 91 141 112 125 114 96 34 113 34 102 115 69Z"/>'
   :heavy
    ?'<path d="M128 18 140 64 229 90 229 111 140 98 140 127 162 142 162 150 128 140 94 150 94 142 116 127 116 98 27 111 27 90 116 64Z"/>'
    :'<path d="M128 26 141 79 223 105 223 113 142 105 141 129 158 141 158 148 128 140 98 148 98 141 115 129 114 105 33 113 33 105 115 79Z"/>';
 const name=esc(spec.name||id).slice(0,38),code=esc(id).slice(0,38);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="176" viewBox="0 0 256 176"><rect width="256" height="176" rx="12" fill="#172532"/><g fill="${/^#[0-9a-f]{6}$/i.test(color)?color:'#b52f3d'}">${silhouette}</g><text x="128" y="153" fill="#fff" font-size="11" text-anchor="middle" font-family="Arial">${name}</text><text x="128" y="168" fill="#d5be8e" font-size="9" text-anchor="middle" font-family="Arial">${code}</text></svg>`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function repair(dialog){
 const nav=dialog.querySelector('#hangarNavigation'),paint=dialog.querySelector('#hangarPaint');
 if(!dialog.open||nav?.hidden||nav?.querySelector('strong')?.textContent!=='Aerei e velivoli')return;
 const color=paint?.value||'#b52f3d',seen=new Map();
 for(const card of dialog.querySelectorAll('#hangarGrid [data-hangar-id]:not([hidden])')){
  const id=card.dataset.hangarId,img=card.querySelector('img'),spec=VEHICLES[id];
  if(!img||!spec?.aircraft)continue;
  const key=id+'/'+color,ready=img.dataset.previewReady===key;
  if(ready&&img.src?.startsWith('data:image/')){
   const other=seen.get(img.src);
   if(other&&other!==id){
    // When the GPU returns the same pixel image for two models, preserve
    // the first render and replace the duplicate with this model's correctly
    // typed, distinctly named aircraft artwork. Never show a terrestrial SVG.
    const distinct=aircraftPlaceholder(id,color);
    if(distinct&&img.src!==distinct){img.src=distinct;img.alt='Aereo o elicottero: '+spec.name;img.dataset.airFallback=key;}
   }
   seen.set(img.src,id);
   continue;
  }
  if(img.dataset.airFallback===key)continue;
  const fallback=aircraftPlaceholder(id,color);
  if(fallback){img.src=fallback;img.dataset.airFallback=key;img.alt='Aereo o elicottero: '+spec.name;}
 }
}
let dialog=null,observer=null;
function install(){
 if(dialog||typeof document==='undefined')return;
 const element=document.getElementById('mandriaHangarDialog');if(!element||!element.querySelector('#hangarNavigation'))return;
 dialog=element;observer=new MutationObserver(()=>repair(dialog));
 observer.observe(dialog,{attributes:true,attributeFilter:['open'],subtree:false});
 const grid=dialog.querySelector('#hangarGrid');if(grid)observer.observe(grid,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','src','data-preview-ready','data-preview-pending']});
 const nav=dialog.querySelector('#hangarNavigation');if(nav)observer.observe(nav,{attributes:true,attributeFilter:['hidden'],subtree:true,childList:true,characterData:true});
 dialog.querySelector('#hangarPaint')?.addEventListener('input',()=>queueMicrotask(()=>repair(dialog)));
 dialog.querySelector('#hangarPaint')?.addEventListener('change',()=>queueMicrotask(()=>repair(dialog)));
 repair(dialog);
}
const original=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaAirPreviewGuard){ModernGameplay.prototype.__mandriaAirPreviewGuard=true;ModernGameplay.prototype.update=function(dt){original.call(this,dt);if(this.state?.started)install();};}
