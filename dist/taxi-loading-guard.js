import {CityStream} from './streaming.js';

const BASE_CORE_READY=CityStream.prototype.coreReady;
const BASE_UPDATE=CityStream.prototype.update;
const TAXI_CLASS='taxi-transit';

function taxiTransit(){
 return typeof document!=='undefined'&&document.body?.classList?.contains(TAXI_CLASS);
}

if(!CityStream.prototype.__taxiLoadingGuard){
 CityStream.prototype.__taxiLoadingGuard=true;

 // Taxi travel is now completely decoupled from chunk readiness. The game
 // already provides a short fixed travel/loading interval; making that interval
 // wait on the streaming backend was the source of the recurring destination
 // freeze. While the taxi overlay is active we therefore do not build/unload
 // chunks at all and we report the destination as ready immediately. As soon as
 // the arrival code removes `taxi-transit`, normal streaming resumes at the new
 // player position and fills in the destination in the ordinary frame loop.
 CityStream.prototype.coreReady=function(x,z,radius=160){
  if(!taxiTransit())return BASE_CORE_READY.call(this,x,z,radius);
  this.prefetch(x,z,520);
  this.lastPlan='';
  return true;
 };

 CityStream.prototype.update=function(p,force=false){
  if(!taxiTransit())return BASE_UPDATE.call(this,p,force);
  // Keep detail generation suppressed during the two-second cinematic and do
  // no cooperative/worker chunk work that could stall requestAnimationFrame.
  if(this.metrics){
   this.metrics.pressure=true;
   this.metrics.coreQueued=0;
   this.metrics.detailQueued=0;
   this.metrics.queued=0;
  }
  return 0;
 };
}
