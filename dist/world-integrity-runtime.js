import {CityWorld} from './world.js';
import {WorldSelfTester,scheduleWorldSelfTest} from './world-self-tester.js';
import {ensureCollisionManager} from './building-collision-manager.js';

const baseInstall=CityWorld.prototype.installStage;
if(!CityWorld.prototype.__worldIntegrityInstall){
  CityWorld.prototype.__worldIntegrityInstall=true;
  CityWorld.prototype.installStage=function(key,g,stage){const out=baseInstall.call(this,key,g,stage);globalThis.__padovaWorld=this;ensureCollisionManager(this);scheduleWorldSelfTest(this,key,stage);return out;};
}

const baseUpdate=CityWorld.prototype.update;
if(!CityWorld.prototype.__worldIntegrityUpdate){
  CityWorld.prototype.__worldIntegrityUpdate=true;
  CityWorld.prototype.update=function(x,z,force=false,motion={}){this.__lastSurfacePosition={x,z};const out=baseUpdate.call(this,x,z,force,motion);if(force&&this.loaded?.size){const run=()=>{try{WorldSelfTester.auditActiveArea(this,{x,z});}catch(error){console.warn('[Padova travel self-test] failed',error);}};(globalThis.requestIdleCallback||((fn)=>setTimeout(fn,120)))(run,{timeout:2200});}return out;};
}

if(typeof document!=='undefined'&&!globalThis.__padovaTaxiSurfaceAudit){
  globalThis.__padovaTaxiSurfaceAudit=true;let wasTaxi=document.body.classList.contains('taxi-transit');
  new MutationObserver(()=>{const now=document.body.classList.contains('taxi-transit');if(wasTaxi&&!now){const world=globalThis.__padovaWorld,p=world?.__lastSurfacePosition;if(world&&p)setTimeout(()=>{try{WorldSelfTester.auditActiveArea(world,p);}catch(error){console.warn('[Padova taxi self-test] failed',error);}},120);}wasTaxi=now;}).observe(document.body,{attributes:true,attributeFilter:['class']});
}
