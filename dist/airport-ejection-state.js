// Keep the most recent controlled aircraft across the event-loop gap before F
// changes state.car to null. The physics extension consumes this snapshot on
// the next frame to simulate an actual falling/landing aircraft.
import {ModernGameplay} from './modern-gameplay.js';
const previous=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__airportEjectionSnapshot){
 ModernGameplay.prototype.__airportEjectionSnapshot=true;
 ModernGameplay.prototype.update=function(dt){
  previous.call(this,dt);
  const s=this.state;
  if(s?.mode==='car'&&s.car?.spec?.aircraft){
   this.flightLastPilot=s.car;
   this.flightLastSpeed=s.speed;
  }else if(!s?.parachuting){
   this.flightLastPilot=null;
  }
 };
}
