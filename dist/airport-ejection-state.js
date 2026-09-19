// Keep aircraft position and ground reference across F parachute ejection.
// The original game hides/parks the aircraft immediately, which can make the
// later airport actor updates overwrite its altitude before falling begins.
import {ModernGameplay} from './modern-gameplay.js';
const previous=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__airportEjectionSnapshot){
 ModernGameplay.prototype.__airportEjectionSnapshot=true;
 ModernGameplay.prototype.update=function(dt){
  const s=this.state,p=this.flightLastPose;
  if(s?.parachuting&&!s.car&&this.flightLastPilot&&p?.car===this.flightLastPilot&&!p.car.flightAbandoned){
   const c=p.car;
   Object.assign(c,{x:p.x,y:p.y,z:p.z,yaw:p.yaw,speed:p.speed*.48,parked:false});
   c.flightAbandoned={startAltitude:Math.max(0,p.y-p.ground),vy:0,speed:Math.min(75,p.speed)*.48,age:0,done:false};
   this.abandonedAircraft??=[];
   if(!this.abandonedAircraft.includes(c))this.abandonedAircraft.push(c);
   c.mesh.visible=true;c.abandonedAt=s.elapsed;
   this.toast?.('Velivolo abbandonato · perdita di controllo',2);
  }
  previous.call(this,dt);
  if(s?.mode==='car'&&s.car?.spec?.aircraft){
   this.flightLastPilot=s.car;
   this.flightLastSpeed=s.speed;
   this.flightLastPose={car:s.car,x:s.x,y:s.y,z:s.z,yaw:s.yaw,speed:s.speed,ground:this.terrain.height(s.x,s.z)};
  }else if(!s?.parachuting){
   this.flightLastPilot=null;this.flightLastPose=null;
  }
  // Legacy AI may toggle a claimed aircraft's mesh back on after a crash.
  for(const c of this.cars||[])if(c.flightAbandoned?.done&&c.health<=0)c.mesh.visible=false;
 };
}
