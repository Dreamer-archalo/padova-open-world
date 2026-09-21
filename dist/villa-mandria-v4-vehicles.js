// Rearrange only the villa's own parked fleet; the airport and hangar stay intact.
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
import {vehicleBlocked} from './movement.js';
import {resetGroundMotion} from './vehicle-dynamics.js';
let current=null;
const point=(u,v)=>areaPoint(VILLA,u,v);
function position(g,c,u,v){const p=point(u,v),y=g.terrain.height(p.x,p.z);
 if(!mandriaFree(g,u,v,Math.max(1.1,c.spec.width*.64),c.spec.height+1)||vehicleBlocked(p.x,p.z,VILLA.yaw,g.collision,c.spec,y))return false;
 if(g.cars.some(o=>o!==c&&o.mesh?.visible&&o.fixedSpawn&&!o.spec?.aircraft&&Math.hypot(o.x-p.x,o.z-p.z)<(o.spec.length+c.spec.length)/2+1.2))return false;
 Object.assign(c,{x:p.x,z:p.z,y,yaw:VILLA.yaw,speed:0,parked:true,health:100});resetGroundMotion(c);c.home={x:p.x,z:p.z,y,yaw:VILLA.yaw};g.pose(c);return true;
}
function fleet(g){const cars=g.cars.filter(c=>c.fixedSpawn&&/Villa della Mandria/.test(c.name||''));
 const tank=cars.find(c=>c.style==='tank');if(tank&&tank!==g.state.car)g.remove(tank);
 const racers=cars.filter(c=>['saetta','fulmine'].includes(c.style)),bikes=cars.filter(c=>['motorcycle','cruiser','trail'].includes(c.style));
 let parkedRacers=0,parkedBikes=0;
 for(const [i,c] of racers.entries())for(const [u,v] of [[-17,14+i*8],[-15,14+i*8],[-14,15+i*9]])if(position(g,c,u,v)){parkedRacers++;break;}
 for(const [i,c] of bikes.entries())for(const [u,v] of [[-8,13+i*8],[-10,13+i*8],[-8,15+i*9]])if(position(g,c,u,v)){parkedBikes++;break;}
 if(!g.cars.some(c=>c.name==='Moto trail · Mandria')){
  for(const [u,v] of [[-8,33],[-10,33],[-7,38]]){
   const p=point(u,v),y=g.terrain.height(p.x,p.z),spec={width:.86,length:2.25,height:1.55};
   if(!mandriaFree(g,u,v,1.3,2.6)||vehicleBlocked(p.x,p.z,VILLA.yaw,g.collision,spec,y))continue;
   if(g.cars.some(c=>c.fixedSpawn&&!c.spec.aircraft&&c.mesh.visible&&Math.hypot(c.x-p.x,c.z-p.z)<(c.spec.length+spec.length)/2+1.2))continue;
   const c=g.addCar(p.x,p.z,VILLA.yaw,false,true,'trail');c.fixedSpawn=true;c.name='Moto trail · Mandria';c.home={x:p.x,z:p.z,y,yaw:VILLA.yaw};c.y=y;g.pose(c);bikes.push(c);parkedBikes++;break;
  }
 }
 return {removedVillaTank:!g.cars.some(c=>c.style==='tank'&&c.fixedSpawn&&/Villa della Mandria/.test(c.name||'')),racers:racers.length,racersAligned:parkedRacers,bikes:bikes.length,bikesAligned:parkedBikes};
}
function jump(g){const s=g?.state,c=s?.car;if(!s?.started||s.paused||s.mode!=='car'||c?.mandriaPatrol!=='mounted'||!c.estateHorse||s.health<=0)return false;
 const j=c.jump??={airborne:false,vx:0,vz:0,vy:0,ramp:null,groundVy:0};if(j.airborne||Math.abs(s.speed)<.2)return false;
 j.airborne=true;j.vx=Math.sin(s.yaw)*s.speed;j.vz=Math.cos(s.yaw)*s.speed;j.vy=6.7;j.lastX=s.x;j.lastZ=s.z;s.y+=.12;c.jump=j;c.y=s.y;g.toast?.('Cavallo · salto',1.4);return true;
}
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV4Parking){ModernGameplay.prototype.__mandriaV4Parking=true;
 ModernGameplay.prototype.populate=function(...args){const result=oldPopulate.apply(this,args);this.villaParkingV4=fleet(this);current=this;return result;};
 ModernGameplay.prototype.update=function(dt){oldUpdate.call(this,dt);current=this;
  if(this.state?.car?.mandriaPatrol==='mounted'&&this.state.car.estateHorse){const mount=document.getElementById('mandriaMountPrompt');if(mount)mount.hidden=true;}
 };
}
if(typeof window!=='undefined')window.addEventListener('keydown',event=>{if(event.code!=='KeyQ'||event.repeat||document.querySelector('dialog[open]'))return;if(jump(current)){event.preventDefault();event.stopImmediatePropagation();}},true);
