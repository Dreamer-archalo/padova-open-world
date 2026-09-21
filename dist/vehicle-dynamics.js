import {clamp,angleDiff} from './core.js';
import {vehicleBlocked} from './movement.js';

export const JUMP_GRAVITY=18;
export const MAX_CONTACT_RISE=.28;
export function resetGroundMotion(car){if(car){car.jump=null;car.steerInput=0;car.pitch=0;}}

// Ground height is authoritative for physics, but a noisy height lookup must not
// act as a one-frame elevator. Tiny road-grade changes snap to the solved surface;
// larger legal changes are exponentially tracked and hard vertical faces are
// rejected by groundVehicleStep before this helper is called.
export function smoothGroundY(current,target,dt,speed){
 if(!Number.isFinite(current))return target;if(!Number.isFinite(target))return current;
 const delta=target-current,horizontal=Math.max(.001,Math.abs(speed)*dt),snap=Math.max(.055,horizontal*.12);
 if(Math.abs(delta)<=snap)return target;
 const alpha=1-Math.exp(-18*dt),maxStep=Math.max(.075,horizontal*.2+.025),tracked=current+clamp(delta*alpha,-maxStep,maxStep);
 // Never bury the chassis deeply inside an uphill surface while smoothing.
 return delta>0?Math.max(target-.08,tracked):tracked;
}

// Yaw authority has a floor even beyond the normal top speed. Bikes remain
// quicker to correct than cars; tracked vehicles retain their stationary pivot.
export function steeringRate(spec,speed,handbrake=false){
 const v=Math.abs(speed),bike=spec.bike||spec.width<1.15;
 if(spec.tracked)return spec.steer;
 const softness=1/(1+(v/(bike?45:38))**1.35);
 return spec.steer*(1.08+(bike?.48:.42)*softness)*Math.min(1,v/5)*(handbrake?1.45:1);
}
export function groundContact(terrain,x,z,reference){
 let y=terrain.height(x,z,reference),ramp=null,pitch=null;
 for(const r of terrain.arcadeRamps||[]){
  const dx=x-r.x,dz=z-r.z,u=dx*Math.cos(r.yaw)-dz*Math.sin(r.yaw),v=dx*Math.sin(r.yaw)+dz*Math.cos(r.yaw);
  if(Math.abs(u)>r.width/2||Math.abs(v)>r.length/2)continue;
  const a=clamp(u/r.width+.5,0,1),b=clamp(v/r.length+.5,0,1),back=r.topY[0]+(r.topY[1]-r.topY[0])*a,front=r.topY[3]+(r.topY[2]-r.topY[3])*a,top=back+(front-back)*b;
  if(top>=y-.03){y=Math.max(y,top);ramp=r;pitch=-Math.atan2(front-back,r.length);}
 }
 return {y,ramp,pitch};
}

// Swept motion shares the regular height-aware collision index. Only a player
// vehicle owns this tiny state; parked vehicles have no gravity/AI update.
export function groundVehicleStep(actor,car,input,dt,terrain,collision){
 const spec=car.spec,bike=spec.bike||spec.width<1.15;
 let j=car.jump;if(!j)j=car.jump={airborne:false,vx:0,vz:0,vy:0,ramp:null,groundVy:0};
 // A teleport or a recovered vehicle must never inherit a stale ballistic arc.
 if(j.lastX!==undefined&&Math.hypot(actor.x-j.lastX,actor.z-j.lastZ)>10){resetGroundMotion(car);return groundVehicleStep(actor,car,input,dt,terrain,collision);}
 car.steerInput=(car.steerInput||0)+(input.turn-(car.steerInput||0))*(1-Math.exp(-dt*(bike?12:9)));
 const yaw=actor.yaw+car.steerInput*steeringRate(spec,actor.speed,input.handbrake)*dt*(actor.speed>=0?1:-1)*(j.airborne?.28:1);
 if(!vehicleBlocked(actor.x,actor.z,yaw,collision,spec,actor.y))actor.yaw=yaw;
 let hitSpeed=0,landingSpeed=0,launched=false,landed=false;
 const count=Math.max(1,Math.ceil(Math.max(Math.abs(actor.speed),Math.hypot(j.vx,j.vz))*dt/.65)),step=dt/count;
 for(let i=0;i<count;i++){
  const old=groundContact(terrain,actor.x,actor.z,actor.y);
  let vx=Math.sin(actor.yaw)*actor.speed,vz=Math.cos(actor.yaw)*actor.speed,ny=actor.y;
  if(j.airborne){
   // Steering trims the flight path gradually. Throttle and the handbrake do
   // not rotate or stop momentum in mid-air.
   const magnitude=Math.hypot(j.vx,j.vz),heading=Math.atan2(j.vx,j.vz),wanted=actor.yaw+(actor.speed<0?Math.PI:0),angle=heading+clamp(angleDiff(wanted,heading),-.24*step,.24*step);
   vx=j.vx=Math.sin(angle)*magnitude;vz=j.vz=Math.cos(angle)*magnitude;
   ny+=j.vy*step-.5*JUMP_GRAVITY*step*step;j.vy-=JUMP_GRAVITY*step;
   actor.speed=magnitude*(actor.speed<0?-1:1);
  }
  const nx=actor.x+vx*step,nz=actor.z+vz*step,next=groundContact(terrain,nx,nz,actor.y),horizontal=Math.hypot(nx-actor.x,nz-actor.z);
  if(!j.airborne){
   const alignment=old.ramp?Math.cos(actor.yaw-old.ramp.yaw)*(actor.speed>=0?1:-1):0;
   const drop=actor.y-next.y,rise=next.y-actor.y;
   const leavesRamp=old.ramp&&old.ramp!==next.ramp&&alignment>.65&&drop>.25&&Math.abs(actor.speed)>8;
   // At a fast convex crest the road falls away faster than gravity can pull
   // the car down. Preserve its uphill velocity instead of gluing it to the
   // next height sample. Small kerbs/noisy centimetre changes cannot launch it.
   const ballisticY=actor.y+j.groundVy*step-.5*JUMP_GRAVITY*step*step;
   const crests=!old.ramp&&!next.ramp&&Math.abs(actor.speed)>16&&j.groundVy>1.2
    &&j.climbDistance>=Math.max(2,spec.wheelbase||2.5)&&Math.abs(next.y-old.y)<Math.max(.12,horizontal*.3)
    &&ballisticY-next.y>Math.max(.0001,JUMP_GRAVITY*step*step*.1)
    &&j.groundVy-(next.y-old.y)/step>JUMP_GRAVITY*step*1.2;
   // Any genuine ledge is ballistic. Previously slow vehicles could be snapped
   // downward by half a metre or more in one fixed tick.
   const drops=drop>.48&&Math.abs(actor.speed)>1.5;
   if(leavesRamp||drops||crests){
    j.airborne=true;j.climbDistance=0;j.vx=vx;j.vz=vz;j.vy=leavesRamp?Math.max(2,j.groundVy):clamp(j.groundVy,-4,12);ny=actor.y+j.vy*step-.5*JUMP_GRAVITY*step*step;j.vy-=JUMP_GRAVITY*step;launched=true;
   }else{
    // Reject impossible vertical elevators even when both contacts are ordinary
    // terrain (the old test only caught a transition into/out of a ramp).
    const allowedRise=Math.max(MAX_CONTACT_RISE,horizontal*.22);
    if(rise>allowedRise){hitSpeed=Math.abs(actor.speed);actor.speed*=-.15;break;}
    const followsGrade=Math.abs(next.y-old.y)<=Math.max(.025,horizontal*.24)&&Math.abs(actor.y-old.y)<.15;
    ny=followsGrade?next.y:smoothGroundY(actor.y,next.y,step,actor.speed);j.groundVy=(ny-actor.y)/step;j.ramp=next.ramp;
    j.climbDistance=next.y-old.y>horizontal*.015?(j.climbDistance||0)+horizontal:0;
   }
  }
  if(j.airborne&&ny<=next.y&&j.vy<=0){landingSpeed=Math.max(landingSpeed,-j.vy);j.airborne=false;landed=true;ny=next.y;j.vy=0;j.ramp=next.ramp;}
  if(vehicleBlocked(nx,nz,actor.yaw,collision,spec,ny)){
   hitSpeed=Math.hypot(vx,vz);actor.speed*=-.15;
   if(j.airborne){j.vx*=-.15;j.vz*=-.15;j.vy=Math.min(0,j.vy);}
   break;
  }
  actor.x=nx;actor.z=nz;actor.y=ny;
  if(!j.airborne&&terrain.waterAt?.(nx,nz,0,ny)!==null&&terrain.waterAt?.(nx,nz,0,ny)!==undefined)break;
 }
 const support=groundContact(terrain,actor.x,actor.z,actor.y);
 const pitch=j.airborne?-Math.atan2(j.vy,Math.max(8,Math.hypot(j.vx,j.vz))):support.pitch===null?terrain.slope(actor.x,actor.z,actor.yaw,spec.wheelbase,actor.y):support.pitch*Math.cos(actor.yaw-support.ramp.yaw);
 car.pitch=(car.pitch||0)+(pitch-(car.pitch||0))*(1-Math.exp(-dt*12));
 j.lastX=actor.x;j.lastZ=actor.z;
 return {hitSpeed,landingSpeed,launched,landed,airborne:j.airborne};
}
