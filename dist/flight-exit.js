import {footSurface} from './special-vehicles.js';

export function leaveAircraft(state,time){
 const car=state.car;if(!car?.spec.aircraft)return null;
 car.parked=true;car.speed=0;car.abandonedAt=time;car.mesh.visible=false;
 state.car=null;state.mode='foot';state.parachuting=false;state.freefall=true;
 state.fallSpeed=Math.max(4,Math.min(25,Math.abs(state.speed||0)));state.speed=state.fallSpeed;state.vy=-2;
 return car;
}
export function openChute(state,terrain){
 if(!state.freefall||state.parachuting||state.y-terrain.height(state.x,state.z,state.y)<4)return false;
 state.freefall=false;state.parachuting=true;state.speed=7;state.vy=-4;return true;
}
export function freefallStep(state,input,dt,terrain,collision){
 state.yaw+=input.turn*dt*.8;
 const speed=state.fallSpeed||7;
 state.x+=Math.sin(state.yaw)*speed*dt;state.z+=Math.cos(state.yaw)*speed*dt;
 const ground=footSurface(state.x,state.z,state.y,terrain,collision),impact=-state.vy;
 state.y+=state.vy*dt-9*dt*dt;state.vy=Math.max(-55,state.vy-18*dt);
 if(state.y>ground)return null;
 state.y=ground;state.vy=0;state.speed=0;state.freefall=false;
 return {landed:true,impact};
}
