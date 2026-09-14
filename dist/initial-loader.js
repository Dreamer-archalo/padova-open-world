import {CityWorld} from './world.js';
import {initialRingKeys} from './streaming.js';
import {HOME} from './gameplay-areas.js';

const sleep=()=>new Promise(resolve=>setTimeout(resolve,0));
const BOOTSTRAP_SHARE=30;

function createOverlayUI(){
 const overlay=document.getElementById('initialLoader'),bar=document.getElementById('initialLoaderBar'),percent=document.getElementById('initialLoaderPercent'),status=document.getElementById('initialLoaderStatus'),legacyBar=document.getElementById('loadingBar'),legacyText=document.getElementById('loadingText');
 let gateActive=false,lastPercent=0;
 const paint=(value,text)=>{const p=Math.max(lastPercent,Math.min(100,Math.max(0,value)));lastPercent=p;if(bar)bar.style.width=p.toFixed(2)+'%';if(percent)percent.textContent=Math.round(p)+'%';if(status&&text)status.textContent=text;};
 const mirrorBootstrap=()=>{if(gateActive)return;const raw=parseFloat(legacyBar?.style.width)||0,text=legacyText?.textContent?.trim()||'Preparazione dati città…';paint(raw/100*BOOTSTRAP_SHARE,text);};
 if(legacyBar||legacyText){const obs=new MutationObserver(mirrorBootstrap);if(legacyBar)obs.observe(legacyBar,{attributes:true,attributeFilter:['style']});if(legacyText)obs.observe(legacyText,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});mirrorBootstrap();}
 return {
  beginGate(){gateActive=true;paint(Math.max(lastPercent,BOOTSTRAP_SHARE),'Generazione chunk iniziali · avvio 3×3');},
  update({core,detail,total,current,stage}){const stages=core+detail,totalStages=Math.max(1,total*2),p=BOOTSTRAP_SHARE+(stages/totalStages)*(100-BOOTSTRAP_SHARE),label=stage==='detail'?'DETTAGLIO':stage==='core'?'BASE':'COMPLETO';paint(p,`Chunk ${current||Math.min(detail+1,total)} / ${total} · ${label} · CORE ${core}/${total} · DETAIL ${detail}/${total}`);},
  ready(){paint(100,'Città pronta');document.documentElement.dataset.initialWorldReady='true';if(overlay){overlay.classList.add('initial-loader-done');setTimeout(()=>overlay.hidden=true,260);}},
  fail(error){if(status)status.textContent='Caricamento iniziale non riuscito · ricarica la pagina';if(overlay)overlay.classList.add('initial-loader-error');console.error(error);}
 };
}
const sharedUI=createOverlayUI();

export class GameLoaderManager{
 constructor(world,{updateWorld,onProgress,timeout=90000,stallTimeout=5000}={}){
  this.world=world;this.updateWorld=updateWorld;this.onProgress=onProgress||(()=>{});this.timeout=timeout;this.stallTimeout=stallTimeout;this.resolvers=new Map();this.started=false;this.done=false;this.lastStages=-1;this.lastAdvanceAt=0;this.fellBack=false;
 }
 chunkState(key){const root=this.world.loaded.get(key),attached=root?.parent===this.world.scene;return {core:!!root?.userData.coreReady&&attached,detail:!!root?.userData.detailReady&&attached};}
 chunkReady(key){return this.chunkState(key).detail;}
 report(keys,extra={}){let core=0,detail=0;for(const key of keys){const state=this.chunkState(key);if(state.core)core++;if(state.detail)detail++;}const total=keys.length,stages=core+detail,percent=total?stages/(total*2)*100:100,status={core,detail,loaded:detail,total,stages,percent,...extra};this.onProgress(status);return status;}
 forceCooperative(stream,reason){if(this.fellBack||!stream?.worker)return;this.fellBack=true;try{stream.worker.terminate();}catch{}stream.worker=null;stream.workerReady=false;stream.active?.steps?.return?.();stream.active=null;stream.ready.length=0;stream.lastPlan='';if(stream.metrics){stream.metrics.backend='cooperative';stream.metrics.loaderFallback=reason;}console.warn('[Padova loader] worker fallback:',reason);}
 async loadInitialRing(x,z){
  if(this.started)return this.promise;this.started=true;
  const cx=Math.floor(x/320),cz=Math.floor(z/320),keys=initialRingKeys(x,z,key=>this.world.chunks.has(key)).sort((a,b)=>{const [ax,az]=a.split(',').map(Number),[bx,bz]=b.split(',').map(Number);return Math.hypot(ax-cx,az-cz)-Math.hypot(bx-cx,bz-cz);});
  if(!keys.length)throw new Error('No spawn chunks available');
  this.updateWorld.call(this.world,x,z,true,{speed:0,yaw:0,altitude:0});
  const stream=this.world.streaming;if(!stream)throw new Error('City streaming unavailable');
  sharedUI.beginGate();
  const promises=keys.map(key=>new Promise(resolve=>{if(this.chunkReady(key))resolve(key);else this.resolvers.set(key,resolve);}));
  const started=performance.now();this.lastAdvanceAt=started;
  const pump=(async()=>{
   for(let index=0;index<keys.length;index++){
    const key=keys[index];
    if(this.chunkReady(key)){this.resolvers.get(key)?.(key);this.resolvers.delete(key);this.report(keys,{current:index+1,stage:'complete'});continue;}
    // Important: gate one chunk at a time. The previous scheduler prioritised the
    // CORE stage of all nine chunks before any DETAIL stage, so the visible loader
    // could appear frozen. Completing spawn CORE→DETAIL first produces immediate,
    // truthful progress, then expands outwards through the remaining neighbours.
    stream.setInitialGate([key]);
    this.lastStages=-1;this.lastAdvanceAt=performance.now();
    while(!this.chunkReady(key)){
     this.updateWorld.call(this.world,x,z,true,{speed:0,yaw:HOME.yaw||0,altitude:0});
     const state=this.chunkState(key),stage=state.core?'detail':'core',snapshot=this.report(keys,{current:index+1,stage}),now=performance.now();
     if(snapshot.stages!==this.lastStages){this.lastStages=snapshot.stages;this.lastAdvanceAt=now;}
     else if(now-this.lastAdvanceAt>this.stallTimeout&&stream.worker)this.forceCooperative(stream,stream.workerReady?'geometry timeout':'worker init timeout');
     if(now-started>this.timeout)throw new Error('Initial 3x3 chunks timed out');
     await sleep();
    }
    this.resolvers.get(key)?.(key);this.resolvers.delete(key);this.report(keys,{current:index+1,stage:'complete'});await sleep();
   }
  })();
  this.promise=Promise.all([Promise.all(promises),pump]).then(()=>{
   const status=this.report(keys,{current:keys.length,stage:'complete'});stream.clearInitialGate();this.done=true;return {...status,keys};
  }).catch(error=>{stream.clearInitialGate();throw error;});
  return this.promise;
 }
}

const originalUpdate=CityWorld.prototype.update;
if(!CityWorld.prototype.__initialLoaderManager){
 CityWorld.prototype.__initialLoaderManager=true;
 CityWorld.prototype.update=function(x,z,force=false,motion={}){
  const result=originalUpdate.call(this,x,z,force,motion);
  if(this.terrain?.modern&&!this.__initialLoader){
   this.__initialLoader=new GameLoaderManager(this,{updateWorld:originalUpdate,onProgress:s=>sharedUI.update(s)});
   globalThis.__padovaInitialLoader=this.__initialLoader;
   globalThis.__padovaInitialReadyPromise=this.__initialLoader.loadInitialRing(HOME.x,HOME.z).then(result=>{sharedUI.ready();return result;}).catch(error=>{sharedUI.fail(error);throw error;});
  }
  return result;
 };
}

document.addEventListener('click',event=>{
 if(document.documentElement.dataset.initialWorldReady==='true')return;
 if(event.target.closest?.('#confirmCharacter,#playBtn')){event.preventDefault();event.stopImmediatePropagation();}
},true);
