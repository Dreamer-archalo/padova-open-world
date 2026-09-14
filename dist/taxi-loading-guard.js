import {CityStream} from './streaming.js';

const BASE_CORE_READY=CityStream.prototype.coreReady;
const TAXI_CLASS='taxi-transit';
const KICK_INTERVAL=650;
const CENTER_FALLBACK_MS=4800;
const HARD_FALLBACK_MS=7500;
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
  const watch=this.__taxiReadyWatch;
  let ready=BASE_CORE_READY.call(this,x,z,radius);
  if(ready){this.__taxiReadyWatch=null;return true;}

  if(now-watch.lastKick>=KICK_INTERVAL){
   watch.lastKick=now;
   this.prefetch(x,z,Math.max(420,radius+240));
   this.update({x,z,yaw:0,speed:0,aircraft:false,altitude:0},true);
   ready=BASE_CORE_READY.call(this,x,z,Math.min(radius,96));
   if(ready){this.__taxiReadyWatch=null;return true;}
  }

  const waited=now-watch.startedAt;
  if(waited>=CENTER_FALLBACK_MS&&centerReady(this,x,z)){
   console.warn('[Taxi] destination core radius incomplete; continuing with centre chunk ready.');
   this.__taxiReadyWatch=null;
   return true;
  }
  if(waited>=HARD_FALLBACK_MS){
   console.warn('[Taxi] destination streaming watchdog released transit after timeout.');
   this.prefetch(x,z,520);
   this.__taxiReadyWatch=null;
   return true;
  }
  return false;
 };
}
