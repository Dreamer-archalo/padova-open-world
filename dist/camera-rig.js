import {angleDiff,clamp} from './core.js';
export class CameraRig{
 constructor(){this.yaw=0;this.pitch=.38;this.dragging=false;this.holdUntil=0;this.signature='';this.movementYaw=0;}
 reset(yaw){this.yaw=yaw;this.movementYaw=yaw;this.signature='';this.dragging=false;this.holdUntil=0;}
 begin(){this.dragging=true;}
 drag(dx,dy){this.yaw-=dx*.006;this.pitch=clamp(this.pitch+dy*.006,-.3,1.3);this.movementYaw=this.yaw;}
 end(time){this.dragging=false;this.holdUntil=time+1.25;this.signature='';}
 basis(forward,side){const signature=forward+','+side;if(signature!==this.signature||this.dragging){this.signature=signature;this.movementYaw=this.yaw;}return this.movementYaw;}
 update(dt,{mode,yaw,speed,time}){if(!this.dragging&&time>=this.holdUntil&&Math.abs(speed)>.2){const target=mode==='car'&&speed<-3?yaw+Math.PI:yaw;this.yaw+=angleDiff(target,this.yaw)*(1-Math.exp(-dt*(mode==='car'?3:2)));}return this.yaw;}
}
