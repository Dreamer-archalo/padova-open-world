const menuContent=document.getElementById('menuContent');
const mapDialog=document.getElementById('mapDialog');
const canvas=document.getElementById('fullmap');
const wrap=canvas?.closest('.fullmap-wrap');

const TEST_BALANCE=50000;
function ensureTestWallet(){
 try{
  const key='padova-game-v1',reloadKey='padova-test-wallet-reloaded';
  const saved=JSON.parse(localStorage.getItem(key)||'{}');
  if(Number.isFinite(saved.money)&&saved.money>=TEST_BALANCE){sessionStorage.removeItem(reloadKey);return false;}
  saved.money=TEST_BALANCE;localStorage.setItem(key,JSON.stringify(saved));
  if(!sessionStorage.getItem(reloadKey)){sessionStorage.setItem(reloadKey,'1');location.reload();return true;}
 }catch(error){console.warn('[Padova test wallet]',error);}
 return false;
}
ensureTestWallet();

function promoteChooseYourself(){
 const choose=document.getElementById('taxiChoose'),activities=choose?.closest('.activities');
 if(choose&&activities&&activities.firstElementChild!==choose)activities.prepend(choose);
}
if(menuContent){new MutationObserver(promoteChooseYourself).observe(menuContent,{childList:true,subtree:true});}

// game.js intentionally ignores gameplay keys while a dialog is paused. The taxi
// confirmation is a UI action instead, so intercept SPACE before that global
// handler and make it equivalent to clicking "Conferma e parti".
window.addEventListener('keydown',e=>{
 if(e.code!=='Space'||e.repeat)return;
 const confirm=document.getElementById('confirmTaxi'),menu=document.getElementById('menu');
 if(!confirm||!menu?.open||confirm.disabled)return;
 e.preventDefault();e.stopImmediatePropagation();confirm.click();
},true);

if(canvas&&wrap){
 wrap.style.overflow='hidden';wrap.style.position='relative';canvas.style.touchAction='none';canvas.style.transformOrigin='0 0';
 let scale=1,tx=0,ty=0,drag=null,moved=false;
 const nativeMapClick=canvas.onclick;
 const controls=document.createElement('div');controls.className='map-zoom-controls';controls.setAttribute('aria-label','Zoom mappa');
 controls.innerHTML='<button type="button" data-map-zoom="out" aria-label="Riduci zoom mappa">−</button><button type="button" data-map-zoom="reset" aria-label="Ripristina zoom mappa">1×</button><button type="button" data-map-zoom="in" aria-label="Aumenta zoom mappa">+</button>';
 Object.assign(controls.style,{position:'absolute',right:'10px',top:'10px',zIndex:'5',display:'flex',gap:'4px'});
 for(const b of controls.querySelectorAll('button'))Object.assign(b.style,{minWidth:'36px',height:'34px',borderRadius:'6px',border:'1px solid rgba(255,255,255,.25)',background:'rgba(12,24,30,.88)',color:'#fff',fontWeight:'800',cursor:'pointer'});
 wrap.appendChild(controls);
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function bounds(){const w=canvas.clientWidth||wrap.clientWidth,h=canvas.clientHeight||wrap.clientHeight;return {w,h,minX:Math.min(0,wrap.clientWidth-w*scale),minY:Math.min(0,wrap.clientHeight-h*scale)};}
 function constrain(){const b=bounds();tx=clamp(tx,b.minX,0);ty=clamp(ty,b.minY,0);if(scale===1){tx=0;ty=0;}}
 function paint(){constrain();canvas.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;controls.querySelector('[data-map-zoom="reset"]').textContent=scale.toFixed(scale%1?1:0)+'×';}
 function zoomAt(next,cx=wrap.clientWidth/2,cy=wrap.clientHeight/2){next=clamp(next,1,4);const ux=(cx-tx)/scale,uy=(cy-ty)/scale;tx=cx-ux*next;ty=cy-uy*next;scale=next;paint();}
 function mapPointFromPointer(e){const r=wrap.getBoundingClientRect(),width=canvas.clientWidth||wrap.clientWidth,height=canvas.clientHeight||wrap.clientHeight;return {u:clamp((e.clientX-r.left-tx)/(Math.max(1,width)*scale),0,1),v:clamp((e.clientY-r.top-ty)/(Math.max(1,height)*scale),0,1)};}
 controls.addEventListener('click',e=>{const mode=e.target.closest('button')?.dataset.mapZoom;if(!mode)return;e.stopPropagation();if(mode==='in')zoomAt(scale+.5);else if(mode==='out')zoomAt(scale-.5);else{scale=1;tx=ty=0;paint();}});
 canvas.addEventListener('wheel',e=>{e.preventDefault();const r=wrap.getBoundingClientRect(),cx=e.clientX-r.left,cy=e.clientY-r.top;zoomAt(scale*(e.deltaY<0?1.22:.82),cx,cy);},{passive:false});
 canvas.addEventListener('pointerdown',e=>{if(scale<=1)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,tx,ty,threshold:e.pointerType==='touch'?12:5};moved=false;canvas.setPointerCapture?.(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>drag.threshold)moved=true;tx=drag.tx+dx;ty=drag.ty+dy;paint();});
 const end=e=>{if(drag?.id===e.pointerId){canvas.releasePointerCapture?.(e.pointerId);drag=null;}};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
 canvas.addEventListener('click',e=>{if(!moved)return;moved=false;e.preventDefault();e.stopImmediatePropagation();},true);
 if(typeof nativeMapClick==='function')canvas.onclick=e=>{
  if(scale<=1)return nativeMapClick.call(canvas,e);
  const {u,v}=mapPointFromPointer(e),r=canvas.getBoundingClientRect(),size=Math.min(r.width,r.height),offsetX=(r.width-size)/2,offsetY=(r.height-size)/2;
  return nativeMapClick.call(canvas,{clientX:r.left+offsetX+u*size,clientY:r.top+offsetY+v*size});
 };
 if(mapDialog)new MutationObserver(()=>{if(mapDialog.open){scale=1;tx=ty=0;moved=false;paint();}}).observe(mapDialog,{attributes:true,attributeFilter:['open']});
 paint();
}
