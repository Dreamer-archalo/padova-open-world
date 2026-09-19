// Reticle-first targeting; installed last so older interceptor helpers cannot
// change the choice on the frame after launch.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {steerGuidedMissile} from './airport-flight-refinement.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const combat=c=>['airport-jet','airport-interceptor','airport-strike','airport-blackbird'].includes(c?.style);
export function selectReticleTarget(g){
 const s=g.state,c=s.car;if(!combat(c))return null;
 const pitch=s.flightPitch||0,origin=new THREE.Vector3(s.x,s.y+c.spec.height*.5,s.z),
 forward=new THREE.Vector3(Math.sin(s.yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(s.yaw)*Math.cos(pitch));
 let aimed=null,assisted=null,aimScore=Infinity,assistedScore=Infinity;
 for(const target of g.cars||[]){
  if(target===c||!target.spec?.aircraft||target.health<=0||!target.mesh?.visible)continue;
  const point=new THREE.Vector3(target.x,target.y+target.spec.height*.5,target.z),offset=point.sub(origin),length=offset.length();
  if(length<20||length>1350)continue;
  const cosine=offset.dot(forward)/length;if(cosine<=0)continue;
  const radians=Math.acos(clamp(cosine,-1,1)),score=radians*850+length*.045;
  // 0.18 rad gives the pilot a forgiving aiming window, but the smallest
  // reticle angle wins. A side helicopter cannot steal an aimed jet.
  if(radians<.18&&score<aimScore){aimScore=score;aimed=target;}
  const fallback=score-(target.airDefender?58:0);
  if(radians<.42&&fallback<assistedScore){assistedScore=fallback;assisted=target;}
 }
 return aimed||assisted;
}
const update=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__airportLockUpgrade){
 ModernGameplay.prototype.__airportLockUpgrade=true;
 ModernGameplay.prototype.update=function(dt){
  const s=this.state,c=s.car;
  if(s.mode==='car'&&combat(c)&&Number.isFinite(dt)&&dt>0){
   for(const missile of this.airportMissiles||[]){
    if(missile.owner!==c||missile.special)continue;
    if(!missile.reticleSelected&&missile.life<.075){
     missile.reticleSelected=true;
     missile.target=selectReticleTarget(this);
    }
    if(missile.target?.health<=0)missile.target=null;
    steerGuidedMissile(missile,dt);
   }
  }
  update.call(this,dt);
 };
}
