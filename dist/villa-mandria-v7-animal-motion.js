// Preserve autonomous paddock paths even though the legacy life module rewrites
// each animal's displayed position every frame for its old idle animation.
import './villa-mandria-v8-scope-targets.js';
import './villa-mandria-v8-estate-tasks.js';
import './villa-mandria-v8-vtol.js';
import './villa-mandria-v8-grounds-roof.js';
import './villa-mandria-v8-deliveries.js';
import './villa-mandria-v8-perimeter-patrols.js';
import {mandriaV9Update} from './villa-mandria-v9-estate-life.js';
import {mandriaV9Routines} from './villa-mandria-v9-routines.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint,areaLocal} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
const at=(u,v)=>areaPoint(VILLA,u,v);
function move(g,dt){if(!g.state?.started||!g.villaV7Life||!Number.isFinite(dt)||dt<=0)return;
 for(const [farm,patch] of (g.villaLife?.pastures||[]).entries()){
  const centre={u:patch.worker.u+10,v:patch.worker.v-10};
  for(const [i,a] of patch.animals.entries()){
   if(!a.walkPosition)a.walkPosition=a.origin.clone();
   const pos=a.walkPosition;
   // v9 controls grazing pauses, safe targets, legs and smoothly turned heading.
   // Do not add the old motion or snap its yaw on top of that controller.
   if(a.v9){a.a.position.copy(pos);continue;}
   if(!a.walkDestination||Math.hypot(pos.x-a.walkDestination.x,pos.z-a.walkDestination.z)<.25||g.state.elapsed>a.walkUntil){
    const seed=g.state.elapsed*.73+farm*15.1+i*8.2+(a.walkCount||0)*2.77;
    a.walkCount=(a.walkCount||0)+1;const u=centre.u+Math.sin(seed*2.13)*8.8,v=centre.v+Math.cos(seed*1.77)*10.2;
    if(mandriaFree(g,u,v,.6,1.7))a.walkDestination=at(u,v);
    a.walkUntil=g.state.elapsed+7+((farm+i)%5);
   }
   if(a.walkDestination){const dx=a.walkDestination.x-pos.x,dz=a.walkDestination.z-pos.z,d=Math.hypot(dx,dz);
    if(d>.03){const step=Math.min(d,(.35+.12*i+.03*farm)*Math.min(dt,.06)),nx=pos.x+dx/d*step,nz=pos.z+dz/d*step;
     const local=areaLocal(VILLA,nx,nz);
     if(Math.abs(local.u-centre.u)<11&&Math.abs(local.v-centre.v)<12.4&&mandriaFree(g,local.u,local.v,.5,1.6)){
      pos.x=nx;pos.z=nz;pos.y=g.terrain.height(nx,nz);a.a.rotation.y=Math.atan2(dx,dz);
     }else a.walkDestination=null;
    }
   }
   a.a.position.copy(pos);a.a.position.y+=Math.sin(g.state.elapsed*(1.8+i*.6)+farm)*.015;
  }
 }
}
const oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV7AnimalMotion){ModernGameplay.prototype.__mandriaV7AnimalMotion=true;ModernGameplay.prototype.update=function(dt){oldUpdate.call(this,dt);move(this,dt);mandriaV9Update(this,dt);mandriaV9Routines(this);};}
