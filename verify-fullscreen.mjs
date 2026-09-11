import {createFullscreenControls} from './dist/fullscreen.js';
const check=(condition,message)=>{if(!condition)throw Error(message);};
function fixture(){
 const listeners=new Map(),doc={documentElement:{},fullscreenEnabled:true,addEventListener(name,fn){const list=listeners.get(name)||[];list.push(fn);listeners.set(name,list);}};
 const timers=new Map();let serial=0,entered=0,resized=0;
 const win={location:{href:'https://example.test/?era=2026'},setTimeout(fn){timers.set(++serial,fn);return serial;},clearTimeout(id){timers.delete(id);}};win.self=win;win.top=win;
 const button={setAttribute(k,v){this[k]=v;}},help={},message={},link={};
 createFullscreenControls(doc,win,{onEnter(){entered++;},onResize(){resized++;}}).bind(button,help,message,link);
 return {doc,win,root:doc.documentElement,button,help,message,link,timers,event(name){for(const fn of listeners.get(name)||[])fn();},entered:()=>entered,resized:()=>resized};
}
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
{
 const f=fixture();let calls=0;
 f.root.requestFullscreen=function(options){calls++;check(this===f.root,'fullscreen includes the entire game');check(options.navigationUI==='hide','hide navigation UI');f.doc.fullscreenElement=f.root;f.event('fullscreenchange');return Promise.resolve();};
 f.doc.exitFullscreen=()=>{f.doc.fullscreenElement=null;f.event('fullscreenchange');return Promise.resolve();};
 f.button.onclick();check(calls===1,'request must be synchronous with the click');await flush();check(f.entered()===1,'event and promise must resume only once');check(f.button['aria-pressed']==='true'&&f.help.hidden,'native fullscreen state');check(f.timers.size===0,'timer cleanup');
 f.button.onclick();await flush();check(f.button['aria-pressed']==='false'&&f.entered()===1,'exit fullscreen');check(f.resized()>=2,'resize on transitions');
 f.doc.fullscreenElement=f.root;f.event('fullscreenchange');f.doc.fullscreenElement=null;f.event('fullscreenchange');check(f.button.textContent==='Schermo intero','Escape updates the button');
}
{
 const f=fixture();f.doc.webkitFullscreenEnabled=true;
 f.root.webkitRequestFullscreen=()=>{f.doc.webkitFullscreenElement=f.root;f.event('webkitfullscreenchange');};
 f.doc.webkitExitFullscreen=()=>{f.doc.webkitFullscreenElement=null;f.event('webkitfullscreenchange');};
 f.button.onclick();check(f.entered()===1,'WebKit entry without a promise');f.button.onclick();check(f.button['aria-pressed']==='false'&&f.timers.size===0,'WebKit exit');
}
{
 const f=fixture();let calls=0;f.win.top={};f.doc.fullscreenEnabled=false;f.root.requestFullscreen=()=>calls++;
 f.button.onclick();check(calls===0,'respect embedding permission');check(f.help.hidden===false&&f.message.textContent.includes('finestra dell’app'),'visible embedding error');check(f.link.href===f.win.location.href&&f.entered()===0,'external link retains the selected game mode');
}
{
 const f=fixture();f.button.onclick();check(f.help.hidden===false&&f.message.textContent.includes('non offre'),'unsupported browser');
 f.root.requestFullscreen=()=>Promise.reject(new Error('denied'));f.button.onclick();await flush();check(f.help.hidden===false&&!f.button.disabled&&f.entered()===0,'rejected permission leaves a usable menu');
 f.root.requestFullscreen=()=>{throw Error('denied');};f.button.onclick();check(f.help.hidden===false&&f.timers.size===0,'synchronous API failure');
}
{
 const f=fixture();let rejectOld,calls=0;
 f.root.requestFullscreen=()=>{calls++;return new Promise((_,reject)=>rejectOld=reject);};
 f.button.onclick();f.button.onclick();check(calls===1,'ignore repeated clicks');[...f.timers.values()][0]();check(!f.button.disabled,'recover from a missing browser event');
 let finishNew;f.root.requestFullscreen=()=>new Promise(resolve=>finishNew=resolve);f.button.onclick();rejectOld(new Error('late denial'));await flush();check(f.button.disabled,'an old rejection must not cancel the next request');
 f.doc.fullscreenElement=f.root;finishNew();await flush();check(f.entered()===1&&!f.button.disabled&&f.timers.size===0,'retry succeeds');
}
console.log('PASS fullscreen: native/WebKit entry and exit, activation, Escape, embedded/unsupported browsers, errors, repeated clicks and late promises');
