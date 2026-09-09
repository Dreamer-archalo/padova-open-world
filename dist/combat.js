import * as THREE from './vendor/three.module.js';
import {clamp,pointInside} from './core.js';
import {vehicleFootprint} from './movement.js';

export const COMBAT_LIMITS={shells:12,effects:8,particlesPerEffect:12,playerCooldown:1.25,enemyCooldown:2.4,shellSpeed:150};
// Earliest swept intersection with an extruded polygon, including roofs. Cover
// works even when a projectile traverses a thin wall in one simulation tick.
export function segmentPrism(a,b,prism){
 const lo=prism.minY||0,hi=lo+prism.h,dx=b.x-a.x,dz=b.z-a.z,dy=b.y-a.y;
 let hit=Infinity;if(a.y>=lo&&a.y<=hi&&pointInside(a.x,a.z,prism.p))return 0;
 for(let i=0;i<prism.p.length;i++){const p=prism.p[i],q=prism.p[(i+1)%prism.p.length],ex=q[0]-p[0],ez=q[1]-p[1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;
  const px=p[0]-a.x,pz=p[1]-a.z,t=(px*ez-pz*ex)/den,u=(px*dz-pz*dx)/den,y=a.y+dy*t;if(t>=0&&t<=1&&u>=0&&u<=1&&y>=lo&&y<=hi)hit=Math.min(hit,t);
 }
 if(Math.abs(dy)>1e-9)for(const y of [lo,hi]){const t=(y-a.y)/dy;if(t>=0&&t<=1&&pointInside(a.x+dx*t,a.z+dz*t,prism.p))hit=Math.min(hit,t);}
 return hit;
}
export function staticHit(a,b,collision){let t=Infinity,object=null;const r=Math.hypot(b.x-a.x,b.z-a.z)/2+.5;for(const p of collision.near((a.x+b.x)/2,(a.z+b.z)/2,r)){const h=segmentPrism(a,b,p);if(h<t){t=h;object=p;}}return {t,object};}
export function predictiveAim(origin,target,velocity,speed=COMBAT_LIMITS.shellSpeed,muzzleOffset=4.5){
 const r={x:target.x-origin.x,y:target.y-origin.y,z:target.z-origin.z},v=velocity||{x:0,y:0,z:0},a=v.x*v.x+v.y*v.y+v.z*v.z-speed*speed,b=2*(r.x*v.x+r.y*v.y+r.z*v.z),c=r.x*r.x+r.y*r.y+r.z*r.z;
 let time=Math.sqrt(c)/speed;const disc=b*b-4*a*c;if(Math.abs(a)>1e-8&&disc>=0){const roots=[(-b-Math.sqrt(disc))/(2*a),(-b+Math.sqrt(disc))/(2*a)].filter(t=>t>0);if(roots.length)time=Math.min(...roots);}else if(Math.abs(b)>1e-8)time=-c/b;
 time=clamp(time,0,4);const dx=r.x+v.x*time,dy=r.y+v.y*time,dz=r.z+v.z*time,length=Math.hypot(dx,dy,dz)||1;
 // Refine from the muzzle, otherwise its 4.5 m offset over-leads fast targets.
 if(muzzleOffset)return predictiveAim({x:origin.x+dx/length*muzzleOffset,y:origin.y+dy/length*muzzleOffset,z:origin.z+dz/length*muzzleOffset},target,velocity,speed,0);
 return {x:dx/length,y:dy/length,z:dz/length,time};
}
export class Cannon {
 constructor(scene,terrain,collision,onHit){this.terrain=terrain;this.collision=collision;this.onHit=onHit;this.shots=Array.from({length:COMBAT_LIMITS.shells},()=>({active:false}));this.effects=Array.from({length:COMBAT_LIMITS.effects},()=>({active:false}));this.dummy=new THREE.Object3D();this.stats={fired:0,hits:0,coverHits:0};
  const geo=new THREE.IcosahedronGeometry(1,0);this.shellMesh=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial({color:'#fff0ba'}),COMBAT_LIMITS.shells);this.effectMesh=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial({color:'#ffffff',depthWrite:false}),COMBAT_LIMITS.effects*COMBAT_LIMITS.particlesPerEffect);this.shellMesh.frustumCulled=this.effectMesh.frustumCulled=false;this.shellMesh.visible=this.effectMesh.visible=false;scene.add(this.shellMesh,this.effectMesh);
  this.fireColor=new THREE.Color('#ffad3a');this.smokeColor=new THREE.Color('#777a72');
 }
 impact(p,time,size=1){let e=this.effects.find(e=>!e.active);if(!e)e=this.effects.reduce((a,b)=>a.born<b.born?a:b);Object.assign(e,p,{active:true,born:time,size});}
 fire(owner,direction,time,enemy=false){if(time<(owner.fireAt||0))return false;const shot=this.shots.find(s=>!s.active);if(!shot)return false;
  const d=direction||{x:Math.sin(owner.yaw),y:0,z:Math.cos(owner.yaw)},length=Math.hypot(d.x,d.y,d.z)||1,origin={x:owner.x+d.x/length*4.5,y:(owner.y||0)+2.2+d.y/length*4.5,z:owner.z+d.z/length*4.5};
  // Muzzle cannot shoot through a wall that the tank's nose touches.
  const hit=staticHit({x:owner.x,y:(owner.y||0)+2.2,z:owner.z},origin,this.collision);
  owner.fireAt=time+(enemy?COMBAT_LIMITS.enemyCooldown:COMBAT_LIMITS.playerCooldown);this.stats.fired++;
  if(hit.object){this.impact({x:owner.x+(origin.x-owner.x)*hit.t,y:origin.y,z:owner.z+(origin.z-owner.z)*hit.t},time);this.stats.coverHits++;return true;}
  Object.assign(shot,origin,{active:true,owner,enemy,born:time,vx:d.x/length*COMBAT_LIMITS.shellSpeed,vy:d.y/length*COMBAT_LIMITS.shellSpeed,vz:d.z/length*COMBAT_LIMITS.shellSpeed});return true;
 }
 update(dt,time,actors){for(const s of this.shots){if(!s.active)continue;if(time-s.born>5){s.active=false;continue;}const a={x:s.x,y:s.y,z:s.z},b={x:s.x+s.vx*dt,y:s.y+s.vy*dt,z:s.z+s.vz*dt};let {t,object}=staticHit(a,b,this.collision),target=null;
   for(const actor of actors){if(actor===s.owner||actor.car===s.owner||actor===s.owner.car||actor.health<=0||actor.mesh?.visible===false||actor.car?.health<=0)continue;
    if(Math.abs(actor.x-a.x)>Math.abs(b.x-a.x)+12||Math.abs(actor.z-a.z)>Math.abs(b.z-a.z)+12)continue;
    const spec=actor.spec||actor.car?.spec,width=(spec?.width||.65)+.3,length=(spec?.length||.65)+.3,h=spec?.height||1.8,y=actor.y||0;
    const at=segmentPrism(a,b,{p:vehicleFootprint(actor.x,actor.z,actor.yaw||0,width,length),minY:y,h});if(at<t){t=at;target=actor;object=null;}
   }
   const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.75));for(let i=1;i<=steps;i++){const q=i/steps;if(q>=t)break;const x=a.x+(b.x-a.x)*q,z=a.z+(b.z-a.z)*q,y=a.y+(b.y-a.y)*q;if(y<=this.terrain.height(x,z,y)+.04){t=q;target=null;object=null;break;}}
   if(t<=1){s.active=false;this.impact({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t},time,1.6);if(target){this.stats.hits++;this.onHit?.(target,s.owner,s.enemy);}if(object)this.stats.coverHits++;}else Object.assign(s,b);
  }
  let count=0;for(const s of this.shots)if(s.active){this.dummy.position.set(s.x,s.y,s.z);this.dummy.scale.setScalar(.19);this.dummy.updateMatrix();this.shellMesh.setMatrixAt(count++,this.dummy.matrix);}this.shellMesh.count=count;this.shellMesh.visible=count>0;if(count)this.shellMesh.instanceMatrix.needsUpdate=true;
  count=0;for(const e of this.effects){if(!e.active)continue;const age=time-e.born;if(age>1.35){e.active=false;continue;}for(let n=0;n<COMBAT_LIMITS.particlesPerEffect;n++){const a=n*2.3999;this.dummy.position.set(e.x+Math.cos(a)*age*(1+n%3)*e.size,e.y+age*(1+n%4),e.z+Math.sin(a)*age*(1+n%3)*e.size);this.dummy.scale.setScalar(Math.max(.01,(1-age/1.35)*e.size*(.3+n%3*.18)));this.dummy.updateMatrix();this.effectMesh.setMatrixAt(count,this.dummy.matrix);this.effectMesh.setColorAt(count++,age<.45?this.fireColor:this.smokeColor);}}
  this.effectMesh.count=count;this.effectMesh.visible=count>0;if(count){this.effectMesh.instanceMatrix.needsUpdate=true;this.effectMesh.instanceColor.needsUpdate=true;}
 }
 clear(){for(const s of this.shots)s.active=false;for(const e of this.effects)e.active=false;this.shellMesh.visible=this.effectMesh.visible=false;}
}
