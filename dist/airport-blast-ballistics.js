// Vehicle poseVehicle() normally grounds the chassis every fixed tick. Preserve
// independent ballistic height for temporary blast wrecks without changing
// normal driving, road alignment or the existing collision controller.
import {ModernGameplay} from './modern-gameplay.js';
export function ballisticHeight(previous,velocity,dt,ground){
 const y=Math.max(ground,previous+velocity*Math.min(.12,Math.max(0,dt)));
 return Number.isFinite(y)?y:ground;
}
const update=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__airportBlastBallistics){
 ModernGameplay.prototype.__airportBlastBallistics=true;
 ModernGameplay.prototype.update=function(dt){
  const before=(this.megaBlastBodies||[]).map(body=>({body,y:body.ballisticY??body.mesh.position.y}));
  update.call(this,dt);
  if(!Number.isFinite(dt)||dt<=0)return;
  for(const {body,y} of before){
   if(!(this.megaBlastBodies||[]).includes(body))continue;
   const a=body.actor,ground=this.terrain.height(a.x,a.z,a.y);
   body.ballisticY=ballisticHeight(y,body.vy,dt,ground);
   a.y=body.ballisticY;
   body.mesh.position.y=body.ballisticY;
  }
 };
}
