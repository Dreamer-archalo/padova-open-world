// Airport-specific arcade kart tuning. Retains existing driving physics and clearance tests.
import {VEHICLES} from './vehicles.js';
import {SPECIAL_VEHICLES} from './special-vehicles.js';
import {ModernGameplay} from './modern-gameplay.js';
for(const spec of new Set([VEHICLES['airport-golf'],SPECIAL_VEHICLES['airport-golf']])){
 if(!spec)continue;
 Object.assign(spec,{max:20,boost:23,accel:12,brake:17,steer:1.65,reverse:6});
}
const previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__airportFastCarts){
 ModernGameplay.prototype.__airportFastCarts=true;
 ModernGameplay.prototype.update=function(dt){
  previousUpdate.call(this,dt);
  if(!Number.isFinite(dt)||dt<=0||!this.interactiveAirport?.carts)return;
  // AI clock controls the original route interpolation: advance its clock only
  // after collision checks, never when the cart stopped or has been boarded.
  for(const c of this.interactiveAirport.carts.values()){
   if(c===this.state.car||c.airportClaimed||c.parked||!c.mesh?.visible)continue;
   c.airportClock+=Math.min(dt,.12)*.85; // 7.4 m/s along original 4 m/s route
   c.speed=7.4;
  }
 };
}
