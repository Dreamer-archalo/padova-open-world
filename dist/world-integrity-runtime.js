import {CityWorld} from './world.js';
import {WorldSelfTester,scheduleWorldSelfTest} from './world-self-tester.js';
import {ensureCollisionManager} from './building-collision-manager.js';
import {isStructuralRoad,isTramRoad} from './world-surface-resolver.js';

function annotateChunk(world,key,g,stage){
  const roads=world.chunks.get(key)?.roads?.map(s=>s.road)||[],structural=roads.some(isStructuralRoad),tram=roads.some(isTramRoad);g.userData.chunkId=key;g.userData.stage=stage;
  g.traverse(o=>{if(!o.isMesh)return;if(o.userData.streamRoads){o.userData.surfaceType=structural?'mixed-road-structure':'road';o.userData.isRoad=true;o.userData.isBridge=roads.some(r=>r.crossing||r.b||Number(r.layer)>0);o.userData.isTunnel=roads.some(r=>r.tunnel);o.userData.isTram=tram;o.userData.supportsTerrainSnap=!structural;}else if(o.material===world.groundMat&&!o.userData.streamBuildings){o.userData.surfaceType='terrain';o.userData.supportsTerrainSnap=true;}});
}

const baseInstall=CityWorld.prototype.installStage;
if(!CityWorld.prototype.__worldIntegrityInstall){
  CityWorld.prototype.__worldIntegrityInstall=true;
  CityWorld.prototype.installStage=function(key,g,stage){annotateChunk(this,key,g,stage);const out=baseInstall.call(this,key,g,stage);globalThis.__padovaWorld=this;ensureCollisionManager(this);scheduleWorldSelfTest(this,key,stage);return out;};
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
