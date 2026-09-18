// Preserve pilot identity across the F-key event before the game clears car.
// Apply after the flight extension so its snapshot cannot be cleared midflight.
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
  // Legacy AI occasionally toggles claimed mesh visibility before this step.
  for(const c of this.cars||[])if(c.flightAbandoned?.done&&c.health<=0)c.mesh.visible=false;
 };
}
