import {CityWorld} from './world.js';
import {initialRingKeys} from './streaming.js';
import {HOME} from './gameplay-areas.js';

const sleep=()=>new Promise(resolve=>setTimeout(resolve,0));
const finite=n=>Number.isFinite(n);

export class GameLoaderManager{
 constructor(world,{updateWorld,onProgress,timeout=45000}={}){
  this.world=world;this.updateWorld=updateWorld;this.onProgress=onProgress||(()=>{});this.timeout=timeout;this.resolvers=new Map();this.started=false;this.done=false;
 }
 chunkReady(key){const root=this.world.loaded.get(key);return !!root?.userData.coreReady&&!!root?.userData.detailReady&&root.parent===this.world.scene;}
 report(keys){const loaded=keys.filter(key=>this.chunkReady(key)).length,total=keys.length,percent=total?loaded/total*100:100;this.onProgress({loaded,total,percent});return {loaded,total,percent};}
 async loadInitialRing(x,z){
  if(this.started)return this.promise;this.started=true;
  const keys=initialRingKeys(x,z,key=>this.world.chunks.has(key));
  if(!keys.length)throw new Error('No spawn chunks available');
  this.world.streaming??=null;
  // First update creates CityStream. The hard gate then pins exactly the spawn
  // chunk plus its eight neighbours and gives both CORE and DETAIL absolute priority.
  this.updateWorld.call(this.world,x,z,true,{speed:0,yaw:0,altitude:0});
  const stream=this.world.streaming;if(!stream)throw new Error('City streaming unavailable');
  stream.setInitialGate(keys);
  const promises=keys.map(key=>new Promise(resolve=>{if(this.chunkReady(key))resolve(key);else this.resolvers.set(key,resolve);}));
  const started=performance.now();
  const pump=(async()=>{
   while(this.resolvers.size){
    this.updateWorld.call(this.world,x,z,true,{speed:0,yaw:HOME.yaw||0,altitude:0});
    for(const [key,resolve] of [...this.resolvers])if(this.chunkReady(key)){this.resolvers.delete(key);resolve(key);}
    this.report(keys);
    if(performance.now()-started>this.timeout)throw new Error('Initial 3x3 chunks timed out');
    await sleep();
   }
  })();
  this.promise=Promise.all([Promise.all(promises),pump]).then(()=>{
   const status=this.report(keys);stream.clearInitialGate();this.done=true;return {...status,keys};
  }).catch(error=>{stream.clearInitialGate();throw error;});
  return this.promise;
 }
}

function overlayUI(){
 const overlay=document.getElementById('initialLoader'),bar=document.getElementById('initialLoaderBar'),percent=document.getElementById('initialLoaderPercent'),status=document.getElementById('initialLoaderStatus');
 return {overlay,bar,percent,status,update({loaded,total,percent:value}){const p=Math.max(0,Math.min(100,value));if(bar)bar.style.width=p.toFixed(2)+'%';if(percent)percent.textContent=Math.round(p)+'%';if(status)status.textContent=`Chunk iniziali ${loaded} / ${total} · generazione completa`;},ready(){document.documentElement.dataset.initialWorldReady='true';if(status)status.textContent='Città pronta';if(overlay){overlay.classList.add('initial-loader-done');setTimeout(()=>overlay.hidden=true,260);}},fail(error){if(status)status.textContent='Caricamento iniziale non riuscito · ricarica la pagina';if(overlay)overlay.classList.add('initial-loader-error');console.error(error);}};
}

const originalUpdate=CityWorld.prototype.update;
if(!CityWorld.prototype.__initialLoaderManager){
 CityWorld.prototype.__initialLoaderManager=true;
 CityWorld.prototype.update=function(x,z,force=false,motion={}){
  const result=originalUpdate.call(this,x,z,force,motion);
  if(this.terrain?.modern&&!this.__initialLoader){
   const ui=overlayUI();this.__initialLoader=new GameLoaderManager(this,{updateWorld:originalUpdate,onProgress:s=>ui.update(s)});
   globalThis.__padovaInitialLoader=this.__initialLoader;
   globalThis.__padovaInitialReadyPromise=this.__initialLoader.loadInitialRing(HOME.x,HOME.z).then(result=>{ui.ready();return result;}).catch(error=>{ui.fail(error);throw error;});
  }
  return result;
 };
}

// The overlay is pointer-opaque, but keep a semantic gate too: character/player
// confirmation cannot start while the 3x3 spawn ring is incomplete.
document.addEventListener('click',event=>{
 if(document.documentElement.dataset.initialWorldReady==='true')return;
 if(event.target.closest?.('#confirmCharacter,#playBtn')){event.preventDefault();event.stopImmediatePropagation();}
},true);
