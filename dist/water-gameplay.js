// Same-water physics in Padova rivers, the Brenta and the lagoon.
// All timing is simulation dt; renderer/terrain remain external.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const BLEND=3.2,DELAY=4.5;
export class WaterGameplay {
 constructor(){this.vehicle=null;this.swimming=false;this.swimDepth=0;this.underwater=0;this.abandoned=new Map();}
 get active(){return !!this.vehicle||this.swimming;}
 reset(){this.vehicle=null;this.swimming=false;this.swimDepth=0;this.underwater=0;}
 enterVehicle(state,waterY){
  if(this.vehicle||!state.car)return false;
  this.vehicle={car:state.car,waterY,elapsed:0,enteredY:state.y,sink:0,warning:false};
  state.speed=Math.min(5,Math.max(-2,state.speed));
  state.vy=0;
  return true;
 }
 sinkDepth(t){
  const duration=Math.max(0,t-DELAY);
  return duration<=0?0:duration<5?.14*duration*duration/2:1.75+(duration-5)*.75;
 }
 vehiclePose(phase,dt,state,waterY){
  phase.elapsed+=dt;phase.waterY=Number.isFinite(waterY)?waterY:phase.waterY;
  const float=phase.waterY+.14,blend=clamp(phase.elapsed/BLEND,0,1);
  phase.sink=this.sinkDepth(phase.elapsed);
  // Initial splash becomes buoyancy, followed by a distinct slow sink.
  state.y=phase.enteredY+(float-phase.enteredY)*(blend*blend*(3-2*blend))-phase.sink;
  state.speed*=Math.exp(-1.9*dt);
  state.x+=Math.sin(state.yaw)*state.speed*dt;
  state.z+=Math.cos(state.yaw)*state.speed*dt;
  state.vy=0;
  return {sink:phase.sink,submerged:phase.sink>.8,elapsed:phase.elapsed};
 }
 stepVehicle(state,dt,waterY){
  const phase=this.vehicle;
  if(!phase||state.car!==phase.car)return null;
  const result=this.vehiclePose(phase,dt,state,waterY);
  const c=phase.car;
  Object.assign(c,{x:state.x,z:state.z,y:state.y,yaw:state.yaw,speed:state.speed,waterSinking:true,health:state.health});
  c.mesh.position.set(c.x,c.y,c.z);
  c.mesh.rotation.set(Math.sin(phase.elapsed*2)*.028,phase.car.yaw,Math.sin(phase.elapsed*1.6)*.045+result.sink*.045,'YXZ');
  if(result.submerged)state.health=Math.max(0,state.health-dt*(result.sink>2?17:9));
  if(result.sink>9)state.health=0;
  return result;
 }
 leaveVehicle(state,waterY){
  const phase=this.vehicle;
  if(!phase)return null;
  const car=phase.car;
  this.abandoned.set(car,phase);
  this.vehicle=null;this.swimming=true;this.swimDepth=0;this.underwater=0;
  // Swimmer starts alongside the vehicle, free to move immediately.
  state.mode='foot';state.car=null;state.speed=0;state.vy=0;
  state.x+=Math.cos(state.yaw)*Math.max(1.2,(car.spec?.width||2)/2+.8);
  state.z-=Math.sin(state.yaw)*Math.max(1.2,(car.spec?.width||2)/2+.8);
  state.y=(Number.isFinite(waterY)?waterY:phase.waterY)-.33;
  car.parked=true;car.waterSinking=true;car.speed=0;
  return car;
 }
 startSwimming(state,waterY){
  if(this.swimming)return false;
  this.swimming=true;this.swimDepth=0;this.underwater=0;
  state.speed=0;state.vy=0;state.y=waterY-.33;return true;
 }
 stepSwim(state,{dx=0,dz=0,dive=false,boost=false}={},dt,terrain,clear){
  if(!this.swimming)return null;
  const waterY=terrain.waterAt(state.x,state.z,0,state.y);
  const level=waterY??terrain.waterHeight(state.x,state.z);
  this.swimDepth=clamp(this.swimDepth+(dive?.75:-1.45)*dt,0,2.5);
  const scale=boost?1.32:.84,tx=state.x+dx*scale,tz=state.z+dz*scale;
  const dry=terrain.waterAt(tx,tz,0,level-.35)===null&&terrain.dry(tx,tz,.3,level-.35);
  const shore=terrain.height(tx,tz,level);
  if(dry&&Number.isFinite(shore)&&shore>=level-.8&&shore<=level+1.7&&clear(tx,tz,shore)){
   Object.assign(state,{x:tx,z:tz,y:shore,vy:0,speed:0});
   this.swimming=false;this.swimDepth=0;this.underwater=0;
   return {landed:true,submerged:false,waterY:level};
  }
  // A wall, cliff or too-high quay must not turn into a teleporting ladder.
  if(!dry&&clear(tx,tz,level-.35)){state.x=tx;state.z=tz;}
  state.speed=Math.hypot(dx,dz)/Math.max(dt,1e-5)*scale;
  state.y=level-.33-this.swimDepth+Math.sin((state.elapsed||0)*3.5)*.045;
  state.vy=0;
  this.underwater=this.swimDepth>.85?this.underwater+dt:0;
  if(this.underwater>4)state.health=Math.max(0,state.health-dt*11);
  return {landed:false,submerged:this.swimDepth>.85,waterY:level,oxygen:Math.max(0,4-this.underwater)};
 }
 updateAbandoned(dt,terrain){
  for(const [car,phase] of this.abandoned){
   phase.elapsed+=dt;phase.sink=this.sinkDepth(phase.elapsed);
   car.speed=0;car.y=phase.enteredY+(phase.waterY+.14-phase.enteredY)*clamp(phase.elapsed/BLEND,0,1)-phase.sink;
   if(car.mesh?.visible){
    car.mesh.position.set(car.x,car.y,car.z);
    car.mesh.rotation.z=Math.sin(phase.elapsed)*.035+phase.sink*.045;
   }
   if(phase.sink>9){car.health=0;car.mesh.visible=false;car.waterSinking=false;this.abandoned.delete(car);}
  }
 }
}
