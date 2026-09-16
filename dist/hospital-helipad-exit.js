import {ModernGameplay} from './modern-gameplay.js';
import {pointInside} from './core.js';
import {resolveHospital} from './hospital-rooftop-easter-egg.js';

// game.js calls terrain.height(x,z) without a reference for its E-to-exit
// altitude guard. Standard roof and flight collision calls DO supply the third
// argument. Recognize this two-argument query only for the player's helicopter
// actually over the Monoblocco; never globally raise ground at the hospital.
const populate=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__hospitalHelipadExit){
 ModernGameplay.prototype.__hospitalHelipadExit=true;
 ModernGameplay.prototype.populate=function(...args){
  const result=populate.apply(this,args),site=resolveHospital(this);
  if(site&&!this.terrain.__hospitalHelipadExit){
   const {polygon,roofY}=site,base=this.terrain.height.bind(this.terrain),game=this;
   this.terrain.height=function(x,z,...rest){
    const s=game.state,c=s?.car;
    if(rest.length===0&&c?.spec?.aircraft&&!c.spec.plane&&s.mode==='car'&&s.y>=roofY-.5&&Math.hypot(s.x-x,s.z-z)<9&&pointInside(x,z,polygon))return Math.max(roofY,base(x,z,s.y));
    return base(x,z,...rest);
   };
   this.terrain.__hospitalHelipadExit=true;
  }
  return result;
 };
}
