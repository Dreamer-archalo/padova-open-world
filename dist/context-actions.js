// Contextual actions are gameplay affordances, independent of HUD detail level.
const sources=new Map();
const known=['interact','mandriaHangarButton','dealerBtn','mandriaWorkerPrompt','mandriaMountPrompt','mandriaLadderPrompt','mandriaRoofDescend'];
let dock=null,observer=null;

function ensureDock(){
 if(dock||!globalThis.document?.body)return dock;
 dock=document.createElement('aside');dock.id='contextActions';dock.hidden=true;
 dock.setAttribute('aria-label','Azioni disponibili nelle vicinanze');
 document.body.appendChild(dock);return dock;
}

export function registerHUDAction(element){
 if(!element?.nodeType||sources.has(element)||!ensureDock())return;
 // Preserve original handlers, shortcuts, hidden state and element identity.
 const row=document.createElement('div');row.className='context-action';row.hidden=true;
 const close=document.createElement('button');close.type='button';close.className='context-dismiss';
 close.textContent='×';close.setAttribute('aria-label','Chiudi avviso');
 element.dataset.hudAction='';
 if(element.id==='interact'){element.setAttribute('role','status');element.setAttribute('aria-live','polite');}
 dock.appendChild(row);row.append(element,close);
 const entry={row,close,lastText:'',available:false,dismissed:false};sources.set(element,entry);
 close.addEventListener('click',()=>{entry.dismissed=true;row.hidden=true;syncDock();});
 syncAction(element,entry);syncDock();
}

function syncAction(element,entry){
 const text=element.textContent.trim(),available=!element.hidden&&!!text;
 // A different action, leaving its area or returning to it restores the hint.
 if(text!==entry.lastText||available!==entry.available)entry.dismissed=false;
 entry.lastText=text;entry.available=available;
 const hidden=!available||entry.dismissed;
 if(entry.row.hidden!==hidden)entry.row.hidden=hidden;
}

function syncDock(){
 if(!dock)return;
 const hidden=document.body.dataset.playing!=='true'||!!document.querySelector('dialog[open]')||
  ![...sources.values()].some(entry=>!entry.row.hidden);
 if(dock.hidden!==hidden)dock.hidden=hidden;
}

export function refreshContextActions(){
 if(!ensureDock())return;
 for(const id of known)registerHUDAction(document.getElementById(id));
 // Future gameplay controls opt in by using data-hud-action or a *Prompt ID.
 for(const element of document.querySelectorAll('[data-hud-action],button[id$="Prompt"]')){
  if(!element.closest('dialog'))registerHUDAction(element);
 }
 for(const [element,entry] of sources){
  if(!element.isConnected){entry.row.remove();sources.delete(element);continue;}
  syncAction(element,entry);
 }
 syncDock();
}

if(globalThis.document?.body){
 refreshContextActions();
 observer=new MutationObserver(refreshContextActions);
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','open','data-playing','data-hud-action']});
}
