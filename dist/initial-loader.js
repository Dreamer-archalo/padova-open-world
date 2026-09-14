import {CityWorld} from './world.js';
import {HOME} from './gameplay-areas.js';

const CHUNK=320;
const BOOTSTRAP_SHARE=30;
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));

function createOverlayUI(){
 const overlay=document.getElementById('initialLoader'),bar=document.getElementById('initialLoaderBar'),percent=document.getElementById('initialLoaderPercent'),status=document.getElementById('initialLoaderStatus'),legacyBar=document.getElementById('loadingBar'),legacyText=document.getElementById('loadingText');
 let gateActive=false,lastPercent=0;
 const paint=(value,text)=>{const p=Math.max(lastPercent,Math.min(100,Math.max(0,value)));lastPercent=p;if(bar)bar.style.width=p.toFixed(2)+'%';if(percent)percent.textContent=Math.round(p)+'%';if(status&&text)status.textContent=text;};
 const mirrorBootstrap=()=>{if(gateActive)return;const raw=parseFloat(legacyBar?.style.width)||0,text=legacyText?.textContent?.trim()||'Preparazione dati città…';paint(raw/100*BOOTSTRAP_SHARE,text);};
 if(legacyBar||legacyText){const observer=new MutationObserver(mirrorBootstrap);if(legacyBar)observer.observe(legacyBar,{attributes:true,attributeFilter:['style']});if(legacyText)observer.observe(legacyText,{childList:true,subtree:true,characterData:true});mirrorBootstrap();}
 return {
  begin(){gateActive=true;paint(Math.max(lastPercent,BOOTSTRAP_SHARE),'Generazione area iniziale · 9 chunk · 18 stadi');},
  update({completed,totalStages,current,stage}){const p=BOOTSTRAP_SHARE+(completed/Math.max(1,totalStages))*(100-BOOTSTRAP_SHARE),label=stage==='detail'?'DETTAGLIO':stage==='core'?'BASE':'COMPLETO';paint(p,`Chunk ${current}/9 · ${label} · stadi ${completed}/${totalStages}`);},
  ready(){paint(100,'Città pronta');document.documentElement.dataset.initialWorldReady='true';if(overlay){overlay.classList.add('initial-loader-done');setTimeout(()=>overlay.hidden=true,260);}},
  fail(error){if(status)status.textContent='Errore nel caricamento iniziale · ricarica la pagina';if(overlay)overlay.classList.add('initial-loader-error');console.error('[Padova initial loader]',error);}
 };
}
const sharedUI=createOverlayUI();

function ringKeys(world,x,z){
 const cx=Math.floor(x/CHUNK),cz=Math.floor(z/CHUNK),keys=[];
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const key=(cx+dx)+','+(cz+dz);if(world.chunks.has(key))keys.push(key);}
 return keys.sort((a,b)=>{const [ax,az]=a.split(',').map(Number),[bx,bz]=b.split(',').map(Number);return Math.hypot(ax-cx,az-cz)-Math.hypot(bx-cx,bz-cz);});
}

export class GameLoaderManager{
 constructor(world,{onProgress=()=>{},timeout=120000,sliceMs=7}={}){this.world=world;this.onProgress=onProgress;this.timeout=timeout;this.sliceMs=sliceMs;this.started=false;this.done=false;}
 chunkState(key){const root=this.world.loaded.get(key),attached=root?.parent===this.world.scene;return {core:!!root?.userData.coreReady&&attached,detail:!!root?.userData.detailReady&&attached};}
 async buildStage(key,stage,startedAt){
  const before=this.chunkState(key);if(stage==='core'&&before.core||stage==='detail'&&before.detail)return;
  const steps=this.world.buildStageSteps(key,stage);let done=false;
  while(!done){
   const deadline=performance.now()+this.sliceMs;let loops=0;
   do{const next=steps.next();done=!!next.done;loops++;}while(!done&&loops<96&&performance.now()<deadline);
   if(performance.now()-startedAt>this.timeout){steps.return?.();throw new Error('Initial 3x3 build timed out during '+stage+' '+key);}
   if(!done)await nextFrame();
  }
  const after=this.chunkState(key);if(stage==='core'&&!after.core)throw new Error('Core chunk not installed: '+key);if(stage==='detail'&&!after.detail)throw new Error('Detail chunk not installed: '+key);
 }
 async loadInitialRing(x,z){
  if(this.started)return this.promise;this.started=true;
  const keys=ringKeys(this.world,x,z);if(keys.length!==9)throw new Error('Initial ring incomplete: expected 9 chunks, found '+keys.length);
  // Do not make startup depend on Worker scheduling. Cancel any speculative job
  // started by the first world.update(), build the mandatory 3x3 directly with
  // cooperative generators, then let normal streaming restart after the gate.
  this.world.streaming?.dispose?.();this.world.streaming=null;this.world.queue=[];this.world.pendingBuild=null;
  sharedUI.begin();const totalStages=keys.length*2,startedAt=performance.now();let completed=0;
  this.promise=(async()=>{
   for(let index=0;index<keys.length;index++){
    const key=keys[index],current=index+1;
    this.onProgress({completed,totalStages,current,stage:'core'});await this.buildStage(key,'core',startedAt);completed++;this.onProgress({completed,totalStages,current,stage:'core'});await nextFrame();
    this.onProgress({completed,totalStages,current,stage:'detail'});await this.buildStage(key,'detail',startedAt);completed++;this.onProgress({completed,totalStages,current,stage:'detail'});await nextFrame();
   }
   const invalid=keys.filter(key=>!this.chunkState(key).detail);if(invalid.length)throw new Error('Initial chunks missing from scene: '+invalid.join(', '));
   this.done=true;return {keys,completed,totalStages,percent:100};
  })();
  return this.promise;
 }
}

const originalUpdate=CityWorld.prototype.update;
if(!CityWorld.prototype.__initialLoaderManager){
 CityWorld.prototype.__initialLoaderManager=true;
 CityWorld.prototype.update=function(x,z,force=false,motion={}){
  const result=originalUpdate.call(this,x,z,force,motion);
  if(this.terrain?.modern&&!this.__initialLoader){
   this.__initialLoader=new GameLoaderManager(this,{onProgress:s=>sharedUI.update(s)});globalThis.__padovaInitialLoader=this.__initialLoader;
   globalThis.__padovaInitialReadyPromise=this.__initialLoader.loadInitialRing(HOME.x,HOME.z).then(result=>{sharedUI.ready();return result;}).catch(error=>{sharedUI.fail(error);throw error;});
  }
  return result;
 };
}

document.addEventListener('click',event=>{if(document.documentElement.dataset.initialWorldReady==='true')return;if(event.target.closest?.('#confirmCharacter,#playBtn')){event.preventDefault();event.stopImmediatePropagation();}},true);
