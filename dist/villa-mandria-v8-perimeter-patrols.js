// An estate-wide perimeter circuit, accepted only after sampling every edge for
// dry terrain, real colliders and gentle height changes. No teleports or paths
// across the city's public streets if the route proves unsafe.
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
const point=(u,v)=>areaPoint(VILLA,u,v);
function validSegment(g,a,b,r){const distance=Math.hypot(a[0]-b[0],a[1]-b[1]),count=Math.ceil(distance/1.4);let old=null;
 for(let k=0;k<=count;k++){const t=k/count,u=a[0]+(b[0]-a[0])*t,v=a[1]+(b[1]-a[1])*t;
  if(!mandriaFree(g,u,v,r,3.2))return false;
  const p=point(u,v),height=g.terrain.height(p.x,p.z);
  if(!Number.isFinite(height)||old!==null&&Math.abs(height-old)>.43)return false;old=height;
 }return true;}
function perimeter(g,r=1){
 // Service corridors lie inside the walls and leave the inner farm, mansion,
 // arena and shooting range clear. Try each ring only when it is wholly open.
 for(const [west,east,south,north] of [[-111,111,-77,44],[-105,105,-70,40],[-97,97,-63,35],[-90,90,-58,31]]){
  const route=[[west,north],[west,0],[west,south],[0,south],[east,south],[east,0],[east,north],[0,north],[west,north]];
  if(route.every((next,i)=>i===0||validSegment(g,route[i-1],next,r)))return route;
 }
 return null;
}
const shift=(loop,index)=>{const corners=loop.slice(0,-1),n=corners.length,offset=index*2%n;
 const route=[...corners.slice(offset),...corners.slice(0,offset)];return [...route,[...route[0]]];};
function install(g){const candidates=(g.villaV3?.patrols||[]).filter(c=>c.mandriaPatrol==='mounted'||c.mandriaPatrol==='ape');
 if(!candidates.length)return {complete:false,reason:'no active patrol actors'};
 const mounted=candidates.filter(c=>c.mandriaPatrol==='mounted'),apes=candidates.filter(c=>c.mandriaPatrol==='ape');
 // An entire closed loop must be driveable by the wider Ape Car as well.
 const broad=perimeter(g,1.4),horse=perimeter(g,.9);
 if(!broad&&!horse)return {complete:false,reason:'no completely collision-free perimeter ring'};
 let horses=0,vehicles=0;
 for(const [i,c] of mounted.entries()){
  if(c===g.state.car||!horse)continue;const route=shift(horse,i);
  const p=point(...route[0]);Object.assign(c,{route,routeIndex:1,x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),speed:0,patrolSlot:0,estateAuthorized:true});g.pose(c);horses++;
 }
 for(const [i,c] of apes.entries()){
  if(c===g.state.car||!broad)continue;const route=shift(broad,i);
  const p=point(...route[0]);Object.assign(c,{route,routeIndex:1,x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),speed:0,patrolSlot:0,estateAuthorized:true});g.pose(c);vehicles++;
 }
 return {complete:horses>0&&vehicles>0,horses,apes:vehicles,horseRoute:horse?.length||0,apeRoute:broad?.length||0};
}
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV8PerimeterPatrols){
 ModernGameplay.prototype.__mandriaV8PerimeterPatrols=true;
 ModernGameplay.prototype.populate=function(...args){this.villaV8PatrolReport=null;return oldPopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){
  const oldPositions=new Map((this.villaV3?.patrols||[]).filter(c=>c.mandriaPatrol==='mounted'||c.mandriaPatrol==='ape').map(c=>[c,{x:c.x,z:c.z}]));
  oldUpdate.call(this,dt);
  if(!this.state?.started||!this.villaV7Life||!this.villaV3||Math.hypot(this.state.x-VILLA.x,this.state.z-VILLA.z)>330)return;
  if(!this.villaV8PatrolReport)this.villaV8PatrolReport=install(this);
  // The old actor controller moves at 3.1–3.7 m/s. Reduce actual physical
  // movement after its safety checks, without touching player-controlled mounts.
  for(const [c,old] of oldPositions){if(c===this.state.car||!this.cars.includes(c)||!c.route?.length)continue;
   const factor=c.mandriaPatrol==='mounted'?.51:.59,dx=c.x-old.x,dz=c.z-old.z;
   if(Math.hypot(dx,dz)>3.2)continue;
   c.x=old.x+dx*factor;c.z=old.z+dz*factor;c.y=this.terrain.height(c.x,c.z);c.speed=Math.hypot(c.x-old.x,c.z-old.z)/Math.max(.001,dt);this.pose(c);
  }
 };
}
