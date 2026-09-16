import {CityStream} from './streaming.js';

const BASE_CORE_READY=CityStream.prototype.coreReady;
const BASE_UPDATE=CityStream.prototype.update;
const TAXI_CLASS='taxi-transit';

function taxiTransit(){
 return typeof document!=='undefined'&&document.body?.classList?.contains(TAXI_CLASS);
}

if(!CityStream.prototype.__taxiLoadingGuard){
 CityStream.prototype.__taxiLoadingGuard=true;

 // Never wait on worker/chunk readiness while the taxi travel screen is open.
 // Prefetch once per destination: re-requesting every frame can requeue work and
 // recreate the freeze that the original guard was intended to eliminate.
 CityStream.prototype.coreReady=function(x,z,radius=160){
  if(!taxiTransit()){
   this.__taxiTransitTarget=null;
   return BASE_CORE_READY.call(this,x,z,radius);
  }
  const target=this.__taxiTransitTarget;
  if(!target||Math.hypot(target.x-x,target.z-z)>1){
   this.__taxiTransitTarget={x,z};
   this.prefetch(x,z,520);
  }
  this.lastPlan='';
  return true;
 };

 CityStream.prototype.update=function(p,force=false){
  if(!taxiTransit())return BASE_UPDATE.call(this,p,force);
  // No cooperative or worker chunk generation/unloading during transit.
  if(this.metrics){
   this.metrics.pressure=true;
   this.metrics.coreQueued=0;
   this.metrics.detailQueued=0;
   this.metrics.queued=0;
  }
  return 0;
 };
}
