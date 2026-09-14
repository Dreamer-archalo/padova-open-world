import {angleDiff,clamp} from './core.js';
export class CameraRig{
 constructor(){this.yaw=0;this.pitch=.38;this.dragging=false;this.holdUntil=0;this.signature='';this.movementYaw=0;this.footYaw=0;this.footActive=false;}
 reset(yaw){this.footYaw=yaw;this.footActive=false;this.yaw=yaw;this.movementYaw=yaw;this.signature='';this.dragging=false;this.holdUntil=0;}
 begin(){this.dragging=true;}
 drag(dx,dy){this.yaw-=dx*.0055;this.pitch=clamp(this.pitch+dy*.005,-.3,1.3);this.movementYaw=this.yaw;}
 end(time){this.dragging=false;this.holdUntil=time+1.65;this.signature='';}
 basis(forward,side){const signature=forward+','+side;if(signature!==this.signature||this.dragging){this.signature=signature;this.movementYaw=this.yaw;}return this.movementYaw;}
 update(dt,{mode,yaw,speed,time}){
  if(this.dragging)return this.yaw;
  const magnitude=Math.abs(speed);if(time<this.holdUntil||magnitude<=.2)return this.yaw;
  const reversing=mode==='car'&&speed<-3.5,target=reversing?yaw+Math.PI:yaw;
  const rate=mode==='car'?(reversing?4.8:clamp(1.8+magnitude*.055,2.1,4.5)):1.9;
  this.yaw+=angleDiff(target,this.yaw)*(1-Math.exp(-dt*rate));
  return this.yaw;
 }
}
