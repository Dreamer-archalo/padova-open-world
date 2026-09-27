import {angleDiff} from './core.js';

// A/D and arrow/touch equivalents are continuous steering, independent of key
// repeat events and of the camera's automatic follow interpolation.
export function footMotion(actor,rig,{forward,turn,run},dt){
 const moving=forward!==0,active=moving||turn!==0;
 if(!active){rig.footActive=false;return {dx:0,dz:0,speed:0};}
 if(!rig.footActive||rig.dragging)rig.footYaw=rig.yaw;
 rig.footActive=true;rig.footYaw+=turn*2.25*dt;
 actor.yaw=rig.footYaw;
 if(turn&&!rig.dragging)rig.yaw+=turn*2.25*dt;
 const speed=moving?(run?7:3.6):0;
 return {dx:Math.sin(rig.footYaw)*forward*speed*dt,dz:Math.cos(rig.footYaw)*forward*speed*dt,speed};
}
export function animateGait(mesh,time,speed,run,grounded=true){
 const moving=speed>.1&&grounded,phase=time*(run?15:8),swing=moving?Math.sin(phase)*(run?.95:.45):0;
 const hips=mesh.userData.hips,arms=mesh.userData.arms;
 if(hips){hips.children[0].rotation.x=swing;hips.children[1].rotation.x=-swing;}
 if(arms){arms.children[0].rotation.x=-swing*(run?.95:.65);arms.children[1].rotation.x=swing*(run?.95:.65);arms.rotation.x=moving&&run?-.15:0;}
 mesh.userData.gait={running:!!(moving&&run),frequency:run?15:8,amplitude:Math.abs(swing)};
}

export function animateSwim(mesh,time,speed=0,underwater=false){
 const hips=mesh.userData.hips,arms=mesh.userData.arms;
 const phase=time*(4.5+Math.min(2,Math.abs(speed)*.38)),stroke=Math.sin(phase),
  kick=Math.sin(phase*1.55),motion=Math.max(.18,Math.min(1,Math.abs(speed)/2.5));
 if(hips){
  hips.children[0].rotation.x=.25*kick*motion;
  hips.children[1].rotation.x=-.25*kick*motion;
 }
 if(arms){
  arms.children[0].rotation.x=(underwater?-.3:-.7)+stroke*.62*motion;
  arms.children[1].rotation.x=(underwater?-.3:-.7)-stroke*.62*motion;
  arms.rotation.x=-.2;
 }
 mesh.userData.gait={swimming:true,frequency:4.5,amplitude:motion};
}

// Character models are upright (+Y); tip the head toward forward +Z rather
// than using a negative X pitch, which sends the head backwards into water.
export const swimBodyPitch=(landed=false)=>landed?0:Math.PI/2-0.16;
