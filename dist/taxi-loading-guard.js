import {CityStream} from './streaming.js';

const BASE_CORE_READY=CityStream.prototype.coreReady;
const TAXI_CLASS='taxi-transit';
const KICK_INTERVAL=500;
const CENTER_FALLBACK_MS=1200;
const GUARANTEED_RELEASE_MS=2100;
const CHUNK=320;

function sameTarget(a,x,z){return a&&Math.hypot(a.x-x,a.z-z)<1;}
function centerReady(stream,x,z){
 const key=Math.floor(x/CHUNK)+','+Math.floor(z/CHUNK);
 return !!stream.world?.loaded?.get(key)?.userData?.coreReady;
}

if(!CityStream.prototype.__taxiLoadingGuard){
 CityStream.prototype.__taxiLoadingGuard=true;
 CityStream.prototype.coreReady=function(x,z,radius=160){
  const taxiTransit=typeof document!=='undefined'&&document.body?.classList?.contains(TAXI_CLASS);
  if(!taxiTransit){this.__taxiReadyWatch=null;return BASE_CORE_READY.call(this,x,z,radius);}

  const now=this.now?.()??performance.now();
  if(!sameTarget(this.__taxiReadyWatch,x,z))this.__taxiReadyWatch={x,z,startedAt:now,lastKick:-Infinity};
  const watch=this.__taxiReadyWatch,waited=now-watch.startedAt;

  // Taxi travel must never depend indefinitely on the streaming backend. The
  // loading screen in game.js already enforces a 2.3 s cinematic minimum; by
  // 2.1 s this guard reports the destination as usable even if a worker/chunk
  // is still late. The destination stays pinned and continues streaming after
  // arrival, so this removes the deadlock without abandoning the requested area.
  if(waited>=GUARANTEED_RELEASE_MS){
   this.prefetch(x,z,520);
   this.lastPlan='';
   this.__taxiReadyWatch=null;
   console.warn('[Taxi] guaranteed destination release after streaming deadline.');
   return true;
  }

  let ready=BASE_CORE_READY.call(this,x,z,radius);
  if(ready){this.__taxiReadyWatch=null;return true;}

  if(now-watch.lastKick>=KICK_INTERVAL){
   watch.lastKick=now;
   this.prefetch(x,z,Math.max(420,radius+240));
   this.update({x,z,yaw:0,speed:0,aircraft:false,altitude:0},true);
   ready=BASE_CORE_READY.call(this,x,z,Math.min(radius,96));
   if(ready){this.__taxiReadyWatch=null;return true;}
  }

  if(waited>=CENTER_FALLBACK_MS&&centerReady(this,x,z)){
   console.warn('[Taxi] centre chunk ready; releasing destination transit.');
   this.__taxiReadyWatch=null;
   return true;
  }
  return false;
 };
}
