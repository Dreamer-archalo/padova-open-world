// Mandria v10: repair the horse arena, separate patrol corridors and spread farm life.
// This module does not edit public roads, city traffic, airport or saved games.
import * as THREE from './vendor/three.module.js';
import {VILLA,areaPoint,areaLocal} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
const at=(u,v)=>areaPoint(VILLA,u,v),dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function safe(g,u,v,r=.8){return u>-125&&u<125&&v>-90&&v<55&&mandriaFree(g,u,v,r,3.1);}
function clearLine(g,a,b,r=.8){const n=Math.max(1,Math.ceil(dist(a,b)/1.1));let height=null;
 for(let i=0;i<=n;i++){const u=a[0]+(b[0]-a[0])*i/n,v=a[1]+(b[1]-a[1])*i/n;if(!safe(g,u,v,r))return false;
  const p=at(u,v),h=g.terrain.height(p.x,p.z);if(height!==null&&Math.abs(h-height)>.45)return false;height=h;
 }return true;}
const safeRoute=(g,points,r=.8)=>points.length>1&&points.every((p,i)=>i===0?safe(g,...p,r):clearLine(g,points[i-1],p,r));
const worldDistance=(p,q)=>Math.hypot(p.x-q.x,p.z-q.z);
function arena(g,report){const corral=g.villaV4?.corral,track=g.villaV5Estate?.track;
 if(!corral||!track)return null;
 const {u,v}=corral,points=Array.from({length:32},(_,i)=>[u+Math.cos(i*Math.PI/16)*5.85,v+Math.sin(i*Math.PI/16)*7.20]);
 if(!safeRoute(g,[...points,points[0]],.65))return null;
 const horses=(g.villaV3?.patrols||[]).filter(c=>c.estateHorse&&c.mandriaPatrol==='mounted');
 let restored=0;
 for(const [i,horse] of horses.entries()){
  if(horse===g.state.car)continue;const shift=Math.floor(points.length*i/horses.length),route=[...points.slice(shift),...points.slice(0,shift),points[shift]],p=at(...route[0]);
  Object.assign(horse,{route,routeIndex:1,x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),speed:0,parked:false,estateAuthorized:true,mandriaArenaHorse:true});
  horse.home={x:horse.x,y:horse.y,z:horse.z,yaw:horse.yaw};g.pose(horse);restored++;
 }
 report.arenaHorses=restored;return {corral,source:horses[0],points};
}
function parallel(g,base,offset){const route=[],N=base.length;
 for(let i=0;i<N;i++){
  const a=base[(i+N-1)%N],b=base[(i+1)%N],p=base[i],du=b[0]-a[0],dv=b[1]-a[1],l=Math.hypot(du,dv)||1;
  const q=[p[0]-dv/l*offset,p[1]+du/l*offset];route.push(q);
 }
 return safeRoute(g,[...route,route[0]],1.0)?[...route,route[0]]:null;
}
function lanes(g,report){const apes=(g.villaV3?.patrols||[]).filter(c=>c.mandriaPatrol==='ape'&&c.route?.length>30),base=apes[0]?.route.slice(0,-1);
 if(!base)return [];
 // Parallel service corridors are accepted only if their full swept path is clear.
 const alternatives=[parallel(g,base,3),parallel(g,base,-3),parallel(g,base,5),parallel(g,base,-5)].filter(Boolean);
 const circuits=[[...base,base[0]],...alternatives];
 for(const [i,c] of apes.entries()){
  if(c===g.state.car)continue;const selected=circuits[i%circuits.length],points=selected.slice(0,-1),shift=Math.floor(i*points.length/apes.length);
  const route=[...points.slice(shift),...points.slice(0,shift),points[shift]],p=at(...route[0]);
  Object.assign(c,{route,routeIndex:1,x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),speed:0,patrolSlot:0,estateAuthorized:true});g.pose(c);
 }
 report.apeLanes=circuits.length;report.apes=apes.length;
 return base;
}
function grazingSpread(g,report){let count=0;
 for(const [farm,patch] of (g.villaLife?.pastures||[]).entries()){
  const centre={u:patch.worker.u+10,v:patch.worker.v-10};
  const positions=[[-7,-8],[7,-7],[-6,6],[6,7],[0,0],[-8,0],[8,1]];
  for(const [i,a] of patch.animals.entries()){
   if(a.v10Spread)continue;
   const [du,dv]=positions[(i+farm)%positions.length],trial=[[du,dv],[du*.75,dv*.75],[du*.4,dv*.4]];
   const loc=trial.map(([x,z])=>[centre.u+x,centre.v+z]).find(p=>safe(g,...p,.43));
   if(!loc)continue;const p=at(...loc);a.a.position.set(p.x,g.terrain.height(p.x,p.z),p.z);
   a.origin.copy(a.a.position);a.walkPosition?.copy(a.a.position);
   if(a.v9){a.v9.target=null;a.v9.phase='graze';a.v9.until=g.state.elapsed+2+i*.37;}
   a.v10Spread=true;count++;
  }
 }
 report.spreadAnimals=count;
}
function spreadRear(g,report){const existing=g.villaV6?.rear?.people||[],used=[],locations=[];
 // Prefer actual free farming areas across the east, west, front and rear.
 const us=[-104,-78,-54,-35,34,54,78,104,-91,-65,-42,42,66,91],vs=[-55,26,-35,-72,5,-18,39,-61];
 for(const u of us)for(const v of vs){
  if(u>0&&u<56&&v>0&&v<48||Math.abs(u)<30&&v>-37&&v<13)continue;
  if(g.villaV4?.corral&&Math.hypot(u-g.villaV4.corral.u,v-g.villaV4.corral.v)<18)continue;
  if((g.villaLife?.pastures||[]).some(p=>Math.hypot(u-(p.worker.u+10),v-(p.worker.v-10))<13))continue;
  if(safe(g,u,v,1.1))locations.push([u,v]);
 }
 let moved=0;for(const [i,p] of existing.entries()){
  if(i%4===0)continue; // Retain a few recognisable workers at the original rear plots.
  const previous=[p.origin.u,p.origin.v],choices=locations.filter(q=>dist(q,previous)>19&&used.every(x=>dist(x,q)>13));
  const site=choices[(i*13+3)%choices.length];if(!site)continue;
  p.origin={u:site[0],v:site[1]};const location=at(...site);p.obj.position.set(location.x,g.terrain.height(location.x,location.z),location.z);
  for(const worker of g.villaLife.people)if(worker.obj===p.obj){worker.u=site[0];worker.v=site[1];worker.home={x:location.x,z:location.z};}
  used.push(site);moved++;
 }
 // Reposition rear-corner sentry separately instead of piling up with the hay.
 for(const guard of g.villaLife.people.filter(p=>p.v5Guard&&p.u<-96&&p.v<-65)){
  const site=locations.find(p=>p[1]>0&&used.every(q=>dist(p,q)>15)&&safe(g,...p,1.2));if(!site)continue;
  const p=at(...site);guard.obj.position.set(p.x,g.terrain.height(p.x,p.z),p.z);guard.home={x:p.x,z:p.z};guard.u=site[0];guard.v=site[1];used.push(site);moved++;
 }
 report.relocatedRear=moved;
}
function roamingHorse(g,source,route,index,root){if(!safeRoute(g,route,1.15))return null;
 const model=source.mesh.clone(true),guardIndex=source.mesh.children.indexOf(source.guardModel);
 if(guardIndex>=0&&model.children[guardIndex])model.children[guardIndex].visible=index%2===0;
 model.name='Mandria · cavallo in passeggiata '+(index+1);root.add(model);
 const start=at(...route[0]);model.position.set(start.x,g.terrain.height(start.x,start.z),start.z);
 return {model,route,index,legModels:model.userData.horseLegs||[],target:1,phase:'walk',until:0,speed:1.23+index*.14};
}
function roaming(g,arenaData,base,root,report){const source=arenaData?.source;if(!source||!base?.length)return [];
 const horses=[];const N=base.length;
 for(let j=0;j<3;j++){
  let found=null;
  for(let attempt=0;attempt<7&&!found;attempt++){
   const start=Math.floor((j*.31+attempt*.07)*N)%N,segment=Array.from({length:35},(_,i)=>base[(start+i)%N]);
   for(const shift of [8,6,4]){
    const points=segment.map(([u,v])=>{const du=-u,dv=-15-v,l=Math.hypot(du,dv)||1;return [u+du/l*shift,v+dv/l*shift];});
    if(safeRoute(g,points,1.15)&&dist(points[0],points.at(-1))>25){found=points;break;}
   }
  }
  if(found){const h=roamingHorse(g,source,found,j,root);if(h)horses.push(h);}
 }
 report.roamingHorses=horses.length;
 return horses;
}
function updateHorses(g,s,dt){const time=g.state.elapsed;
 for(const h of s.roaming){const m=h.model,target=at(...h.route[h.target]),dx=target.x-m.position.x,dz=target.z-m.position.z,d=Math.hypot(dx,dz);
  if(h.phase==='rest'){if(time>=h.until)h.phase='walk';else continue;}
  if(d<.30){if(h.target===h.route.length-1||h.target===0){h.speed*=-1;h.phase='rest';h.until=time+2.5+h.index;}
   h.target+=h.speed<0?-1:1;h.target=Math.max(0,Math.min(h.route.length-1,h.target));continue;}
  const step=Math.min(d,Math.abs(h.speed)*Math.min(dt,.07)),nx=m.position.x+dx/d*step,nz=m.position.z+dz/d*step,l=areaLocal(VILLA,nx,nz);
  if(!safe(g,l.u,l.v,1.0)){h.phase='rest';h.until=time+3;continue;}
  m.position.set(nx,g.terrain.height(nx,nz),nz);
  const yaw=Math.atan2(dx,dz),change=Math.atan2(Math.sin(yaw-m.rotation.y),Math.cos(yaw-m.rotation.y));m.rotation.y+=Math.max(-dt*1.9,Math.min(dt*1.9,change));
  for(const [i,leg] of h.legModels.entries())leg.rotation.x=Math.sin(time*5.3+i*2)*.28;
 }
}
function initialize(g){const root=new THREE.Group();root.name='Mandria v10 · vivibilità e percorsi separati';g.villaV3.root.add(root);
 const report={arenaHorses:0,roamingHorses:0,apeLanes:0,apes:0,spreadAnimals:0,relocatedRear:0};
 const arenaData=arena(g,report),base=lanes(g,report);
 grazingSpread(g,report);spreadRear(g,report);
 const roamingHorses=roaming(g,arenaData,base,root,report);
 return {root,life:g.villaLife,report,roaming:roamingHorses};
}
export function mandriaV10Update(g,dt){if(!g.state?.started||!g.villaV9||!g.villaV8PatrolReport?.complete||!g.villaV4?.corral||!Number.isFinite(dt)||dt<=0)return;
 if(!g.villaV10||g.villaV10.life!==g.villaLife){g.villaV10?.root.parent?.remove(g.villaV10.root);g.villaV10=initialize(g);}
 if(Math.hypot(g.state.x-VILLA.x,g.state.z-VILLA.z)>410){g.villaV10.root.visible=false;return;}
 g.villaV10.root.visible=true;updateHorses(g,g.villaV10,dt);
}
