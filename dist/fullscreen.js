// Keep the native request in the click handler: awaiting work first loses the
// browser's user activation. Embedded viewers may forbid fullscreen entirely.
export function createFullscreenControls(doc,win,{onEnter=()=>{},onResize=()=>{}}={}){
 let ui,operation=null,timer;
 const active=()=>doc.fullscreenElement||doc.webkitFullscreenElement||doc.webkitCurrentFullScreenElement;
 function render(){if(!ui)return;ui.button.disabled=operation!==null;ui.button.textContent=active()?'Esci dallo schermo intero':'Schermo intero';ui.button.setAttribute('aria-pressed',String(!!active()));}
 function finish(error){
  const intent=operation;operation=null;win.clearTimeout(timer);render();
  if(ui){ui.help.hidden=!error;if(error){const embedded=win.top!==win.self;ui.message.textContent=error==='unsupported'?'Questo browser non offre lo schermo intero per il gioco. Aprilo in un browser compatibile.':embedded?'La finestra dell’app blocca lo schermo intero. Apri il gioco nel browser e premi di nuovo Schermo intero.':'Il browser non ha consentito lo schermo intero. Riprova oppure apri il gioco nel browser esterno.';}}
  if(!error&&intent?.exiting===false&&active())onEnter();
  onResize();
 }
 function toggle(){
  if(operation)return;
  const exiting=!!active(),root=doc.documentElement;
  const standard=exiting?doc.exitFullscreen:root.requestFullscreen;
  const method=standard||(exiting?(doc.webkitExitFullscreen||doc.webkitCancelFullScreen):(root.webkitRequestFullscreen||root.webkitRequestFullScreen));
  if(!method){finish('unsupported');return;}
  if(!exiting&&(standard?doc.fullscreenEnabled:doc.webkitFullscreenEnabled)===false){finish('blocked');return;}
  const request={exiting};operation=request;ui.help.hidden=true;render();
  const settle=error=>{if(operation===request)finish(error);};
  timer=win.setTimeout(()=>settle('blocked'),4000);
  try{
   const result=exiting?method.call(doc):standard?method.call(root,{navigationUI:'hide'}):method.call(root);
   if(result?.then)result.then(()=>settle(!!active()===!exiting?null:'blocked'),()=>settle('blocked'));
   else if(!!active()===!exiting)settle();
  }catch{settle('blocked');}
 }
 for(const event of ['fullscreenchange','webkitfullscreenchange'])doc.addEventListener(event,()=>finish());
 for(const event of ['fullscreenerror','webkitfullscreenerror'])doc.addEventListener(event,()=>{if(operation)finish('blocked');});
 return {bind(button,help,message,link){ui={button,help,message};link.href=win.location.href;button.onclick=toggle;help.hidden=true;render();}};
}
