import {roofClearance} from './roof-clearance.js';
import {vehicleFootprint,polygonsOverlap,vehicleBlocked} from './movement.js';
import {clamp} from './core.js';

// Minimum separating axis, oriented from B towards A. This is the actual
// contacted surface normal, not the vehicle's total speed or a world axis.
export function polygonContact(a,b){
 let depth=Infinity,normal=null;const centre=p=>p.reduce((q,v)=>({x:q.x+v[0]/p.length,z:q.z+v[1]/p.length}),{x:0,z:0}),ca=centre(a),cb=centre(b);
 for(const p of [a,b])for(let i=0;i<p.length;i++){
  const edge=p[(i+1)%p.length],dx=edge[0]-p[i][0],dz=edge[1]-p[i][1],len=Math.hypot(dx,dz);if(len<1e-8)continue;let nx=-dz/len,nz=dx/len;
  const project=q=>q.reduce((r,v)=>{const d=v[0]*nx+v[1]*nz;r[0]=Math.min(r[0],d);r[1]=Math.max(r[1],d);return r;},[Infinity,-Infinity]),pa=project(a),pb=project(b),overlap=Math.min(pa[1]-pb[0],pb[1]-pa[0]);if(overlap< -1e-7)return null;
  if(overlap<depth){depth=overlap;if((ca.x-cb.x)*nx+(ca.z-cb.z)*nz<0){nx=-nx;nz=-nz;}normal={x:nx,z:nz};}
 }
 return normal?{normal,depth:Math.max(0,depth)}:null;
}
export function vehicleContact(x,z,yaw,index,spec,y){
 const shape=vehicleFootprint(x,z,yaw,spec.width,spec.length);let best=null;
 for(const b of index.near(x,z,Math.hypot(spec.width,spec.length)/2)){
  if(roofClearance(b,x,z,y))continue;
  if(b.driveTopMin!==undefined&&y!==undefined&&y>=b.driveTopMin-spec.length*.045-.15)continue;
  if(y!==undefined&&(y+(spec.height||1.6)<=(b.minY||0)||y>=(b.minY||0)+b.h))continue;
  if(!polygonsOverlap(shape,b.p))continue;const hit=polygonContact(shape,b.p);if(hit&&(!best||hit.depth<best.depth))best={...hit,obstacle:b};
 }return best;
}
export function wallResponse(vx,vz,normal,dt=1/60){
 const into=Math.min(0,vx*normal.x+vz*normal.z),speed=Math.hypot(vx,vz),impact=-into,glancing=impact<speed*.38;
 const tx=vx-into*normal.x,tz=vz-into*normal.z,retain=glancing?1:Math.exp(-dt*.3),restitution=glancing?0:impact>6?.18:.07;
 return {vx:tx*retain-into*restitution*normal.x,vz:tz*retain-into*restitution*normal.z,impact,glancing,normal};
}
export function setVehicleVelocity(actor,car,vx,vz){
 const sx=Math.sin(actor.yaw),sz=Math.cos(actor.yaw);actor.speed=vx*sx+vz*sz;car.slideX=vx-sx*actor.speed;car.slideZ=vz-sz*actor.speed;car.speed=actor.speed;
}
// The largest safe fraction keeps the whole rotated chassis outside the wall.
export function safeVehicleFraction(actor,to,index,spec){let lo=0,hi=1;for(let i=0;i<14;i++){const t=(lo+hi)/2,x=actor.x+(to.x-actor.x)*t,z=actor.z+(to.z-actor.z)*t,y=actor.y+(to.y-actor.y)*t;if(vehicleBlocked(x,z,actor.yaw,index,spec,y))hi=t;else lo=t;}return Math.max(0,lo-1e-4);}
export function carPairResponse(actorA,carA,carB,collision){
 const shape=c=>vehicleFootprint(c.x,c.z,c.yaw,c.spec.width,c.spec.length),hit=polygonContact(shape({...actorA,spec:carA.spec}),shape(carB));if(!hit)return null;
 const a={x:Math.sin(actorA.yaw)*actorA.speed+(carA.slideX||0),z:Math.cos(actorA.yaw)*actorA.speed+(carA.slideZ||0)},b={x:Math.sin(carB.yaw)*carB.speed+(carB.slideX||0),z:Math.cos(carB.yaw)*carB.speed+(carB.slideZ||0)},n=hit.normal,closing=Math.max(0,-((a.x-b.x)*n.x+(a.z-b.z)*n.z)),ma=Math.max(.45,carA.spec.mass||1),mb=Math.max(.45,carB.spec.mass||1),impulse=closing*1.2/(1/ma+1/mb);
 setVehicleVelocity(actorA,carA,a.x+n.x*impulse/ma,a.z+n.z*impulse/ma);setVehicleVelocity(carB,carB,b.x-n.x*impulse/mb,b.z-n.z*impulse/mb);
 const separation=Math.min(hit.depth+.025,Math.max(carA.spec.width,carB.spec.width)+.1);
 for(const [actor,car,sign,fraction] of [[actorA,carA,1,mb/(ma+mb)],[carB,carB,-1,ma/(ma+mb)]]){const x=actor.x+n.x*separation*sign*fraction,z=actor.z+n.z*separation*sign*fraction;if(!vehicleBlocked(x,z,actor.yaw,collision,car.spec,actor.y)){actor.x=x;actor.z=z;}}
 return {impact:closing,normal:n,glancing:closing<Math.hypot(a.x-b.x,a.z-b.z)*.38,damageA:clamp(mb/(ma+mb)*1.65,.35,1.35),damageB:clamp(ma/(ma+mb)*1.65,.35,1.35)};
}
