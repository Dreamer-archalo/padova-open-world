import {CityWorld} from './world.js';
import {Terrain} from './terrain.js';
import {modernFootprints} from './modern-map.js';
import {HOME} from './gameplay-areas.js';

const debug=globalThis.__padovaLoaderDebug||{mark:message=>{const el=document.getElementById('initialLoaderStatus');if(el)el.textContent=message;},fail:(kind,error)=>console.error(kind,error)};
debug.mark('initial-loader.js caricato · inizializzazione loader…');

// CityWorld used to synchronously carve every one of the ~88k building footprints
// and query road/water-aware ground heights before the first frame. That work is
// now deferred to streamed chunks. During bootstrap groundHeight is deliberately
// the cheap natural DEM lookup; full road/water blending is restored before any
// mandatory spawn chunk is generated.
globalThis.__padovaFastStartup=true;
const fullGroundHeight=Terrain.prototype.groundHeight;
if(!Terrain.prototype.__padovaFastGround){
 Terrain.prototype.__padovaFastGround=true;
 Terrain.prototype.groundHeight=function(x,z){
  if(globalThis.__padovaFastStartup!==false)return this.elevation(x,z);
  return fullGroundHeight.call(this,x,z);
 };
}

// Prepare expensive road/building clipping lazily, once per visible chunk rather
// than once globally. The generator remains time-sliced by the normal loader.
const fullBuildStageSteps=CityWorld.prototype.buildStageSteps;
if(!CityWorld.prototype.__padovaLazyFootprints){
 CityWorld.prototype.__padovaLazyFootprints=true;
 CityWorld.prototype.buildStageSteps=function*(key,stage){
  const ch=this.chunks.get(key);
  if(this.terrain?.modern&&ch&&!ch.footprintsPrepared){
   debug.mark(`Preparo edifici chunk ${key}…`);
   ch.buildings=modernFootprints(ch.buildings,this.terrain,{force:true});
   ch.footprintsPrepared=true;
   yield;
  }
  yield* fullBuildStageSteps.call(this,key,stage);
 };
}

const CHUNK=320;
const BOOTSTRAP_SHARE=30;
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));

function createOverlayUI(){
 const overlay=document.getElementById('initialLoader'),bar=document.getElementById('initialLoaderBar'),percent=document.getElementById('initialLoaderPercent'),status=document.getElementById('initialLoaderStatus'),legacyBar=document.getElementById('loadingBar'),legacyText=document.getElementById('loadingText');
 // IMPORTANT: the map is loaded only after the user presses #playBtn. Keeping
 // this overlay visible before that click used to cover the intro while a capture
 // listener also cancelled the same click, creating a permanent 0% deadlock.
 if(overlay)overlay.hidden=true;
 let gateActive=false,lastPercent=0;
 const show=(text='Avvio caricamento città…')=>{if(overlay){overlay.hidden=false;overlay.classList.remove('initial-loader-done','initial-loader-error');}if(status&&text)status.textContent=text;};
 const paint=(value,text)=>{const p=Math.max(lastPercent,Math.min(100,Math.max(0,value)));lastPercent=p;if(bar)bar.style.width=p.toFixed(2)+'%';if(percent)percent.textContent=Math.round(p)+'%';if(status&&text)status.textContent=text;};
 const mirrorBootstrap=()=>{if(gateActive)return;const raw=parseFloat(legacyBar?.style.width)||0,text=legacyText?.textContent?.trim()||'Preparazione dati città…';paint(raw/100*BOOTSTRAP_SHARE,text);};
 if(legacyBar||legacyText){const observer=new MutationObserver(mirrorBootstrap);if(legacyBar)observer.observe(legacyBar,{attributes:true,attributeFilter:['style']});if(legacyText)observer.observe(legacyText,{childList:true,subtree:true,characterData:true});mirrorBootstrap();}
 return {
  show,
  begin(){show('Generazione area iniziale · 9 chunk · 18 stadi');gateActive=true;paint(Math.max(lastPercent,BOOTSTRAP_SHARE),'Generazione area iniziale · 9 chunk · 18 stadi');},
  update({completed,totalStages,current,stage}){show();const p=BOOTSTRAP_SHARE+(completed/Math.max(1,totalStages))*(100-BOOTSTRAP_SHARE),label=stage==='detail'?'DETTAGLIO':stage==='core'?'BASE':'COMPLETO';paint(p,`Chunk ${current}/9 · ${label} · stadi ${completed}/${totalStages}`);},
  ready(){paint(100,'Città pronta');document.documentElement.dataset.initialWorldReady='true';if(overlay){overlay.classList.add('initial-loader-done');setTimeout(()=>overlay.hidden=true,260);}},
  fail(error){show('ERRORE NEL LOADER');debug.fail('INITIAL LOADER',error?.stack||error?.message||error);if(status)status.textContent='ERRORE NEL LOADER';if(overlay)overlay.classList.add('initial-loader-error');console.error('[Padova initial loader]',error);}
 };
}
const sharedUI=createOverlayUI();
debug.mark('Bootstrap pronto · premi Carica la mappa');

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
  debug.mark(`Generazione ${stage==='core'?'BASE':'DETTAGLIO'} chunk ${key}…`);
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
  debug.mark('CityWorld creato · attivo terreno completo…');
  globalThis.__padovaFastStartup=false;
  debug.mark('Calcolo anello iniziale 3×3…');
  const keys=ringKeys(this.world,x,z);if(keys.length!==9)throw new Error('Initial ring incomplete: expected 9 chunks, found '+keys.length);
  debug.mark('Anello 3×3 trovato · preparo generazione cooperativa…');
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
   debug.mark('CityWorld disponibile · avvio loader iniziale…');
   this.__initialLoader=new GameLoaderManager(this,{onProgress:s=>sharedUI.update(s)});globalThis.__padovaInitialLoader=this.__initialLoader;
   globalThis.__padovaInitialReadyPromise=this.__initialLoader.loadInitialRing(HOME.x,HOME.z).then(result=>{sharedUI.ready();return result;}).catch(error=>{sharedUI.fail(error);throw error;});
  }
  return result;
 };
 debug.mark('Loader agganciato · pronto ad avviare il caricamento');
}

// Show the blocking overlay when the user actually starts init(), but DO NOT
// cancel this click: game.js owns #playBtn and needs it to start downloading data.
document.getElementById('playBtn')?.addEventListener('click',()=>{
 if(document.documentElement.dataset.initialWorldReady==='true')return;
 sharedUI.show('Avvio caricamento dati città…');
},true);

// Only entry into the 3D world is gated. The initial "Carica la mappa" action
// must always be allowed or init() can never run.
document.addEventListener('click',event=>{
 if(document.documentElement.dataset.initialWorldReady==='true')return;
 if(event.target.closest?.('#confirmCharacter')){event.preventDefault();event.stopImmediatePropagation();}
},true);
