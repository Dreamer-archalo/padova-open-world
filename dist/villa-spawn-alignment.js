import {ModernGameplay} from './modern-gameplay.js';

const populate=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__villaSpawnSurfaceAlignment){
 ModernGameplay.prototype.__villaSpawnSurfaceAlignment=true;
 ModernGameplay.prototype.populate=function(...args){
  const result=populate.apply(this,args);
  for(const c of this.cars){
   if(!c.fixedSpawn||c.home?.name!=='Villa Treves')continue;
   const platform=this.terrain.platformAt?.(c.x,c.z);const reference=platform?.height??c.y;
   const y=this.terrain.height(c.x,c.z,reference);
   c.y=y;c.speed=0;c.parked=true;c.home={...c.home,y};c.mesh.visible=true;
   this.pose(c);this.forget?.(c);
  }
  return result;
 };
}
