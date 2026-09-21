// Private estate-only pass: arena horses, alternative Ape lanes, distributed farm life.
import * as THREE from './vendor/three.module.js';
import {VILLA,areaPoint,areaLocal} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
const at=(u,v)=>areaPoint(VILLA,u,v),distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function safe(g,u,v,r=.8){return u>-125&&u<125&&v>-90&&v<55&&mandriaFree(g,u,v,r,3.1);}
function segment(g,a,b,r=.8){const n=Math.max(1,Math.ceil(distance(a,b)/1.15));let last=null;
 for(let k=0;k<=n;k++){const u=a[0]+(b[0]-a[0])*k/n,v=a[1]+(b[1]-a[1])*k/n;if(!safe(g,u,v,r))return false;
  const p=at(u,v),height=g.terrain.height(p.x,p.z);if(last!==null&&Math.abs(height-last)>.46)return false;last=height;
 }return true;}
const routeSafe=(g,route,r=.8)=>route.length>1&&route.every((p,i)=>i===0?safe(g,...p,r):segment(g,route[i-1],p,r));
function ring(g,report){const pen=g.villaV4?.corral;if(!pen||!g.villaV5Estate?.track)return null;
 const {u,v}=pen,oval=Array.from({length:32},(_,i)=>[u+Math.cos(i*Math.PI/16)*5.85,v+Math.sin(i*Math.PI/16)*7.2]);
 if(!routeSafe(g,[...oval,oval[0]],.65))return null;
 const horses=g.villaV3.patrols.filter(c=>c.mandriaPatrol==='mounted'&&c.estateHorse);
 for(const [i,c] of horses.entries()){
  if(c===g.state.car)continue;const shift=Math.floor(i*oval.length/horses.length),points=[...oval.slice(shift),...oval.slice(0,shift)],route=[...points,points[0]],p=at(...route[0]);
  Object.assign(c,{route,routeIndex:1,x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),speed:0,estateAuthorized:true,mandriaArenaHorse:true});
  c.home={x:c.x,z:c.z,y:c.y,yaw:c.yaw};g.pose(c);
 }
 report.arenaHorses=horses.length;return horses[0]||null;
}
function parallel(g,points,side){const N=points.length,shifted=[];
 for(let i=0;i<N;i++){
  const a=points[(i+N-1)%N],b=points[(i+1)%N],p=points[i],du=b[0]-a[0],dv=b[1]-a[1],len=Math.hypot(du,dv)||1;
  shifted.push([p[0]-dv/len*side,p[1]+du/len*side]);
 }return routeSafe(g,[...shifted,shifted[0]],1.05)?shifted:null;
}
function apes(g,report){const actors=g.villaV3.patrols.filter(c=>c.mandriaPatrol==='ape'&&c.route?.length>30),base=actors[0]?.route.slice(0,-1);
 if(!base)return [];
 const candidates=[parallel(g,base,3),parallel(g,base,-3),parallel(g,base,4.7),parallel(g,base,-4.7)].filter(Boolean),lanes=[base,...candidates];
 for(const [i,c] of actors.entries()){
  if(c===g.state.car)continue;const points=lanes[i%lanes.length],shift=Math.floor(i*points.length/actors.length),ordered=[...points.slice(shift),...points.slice(0,shift)],route=[...ordered,ordered[0]],p=at(...route[0]);
  Object.assign(c,{route,routeIndex:1,x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),speed:0,patrolSlot:0,estateAuthorized:true});g.pose(c);
 }
 report.apes=actors.length;report.apeLanes=lanes.length;return base;
}
function distributeFarm(g,report){let count=0;
 const offsets=[[-8,-8],[7,-7],[-7,6],[7,7],[0,0],[-8,0],[8,0]];
 for(const [farm,patch] of (g.villaLife?.pastures||[]).entries()){
  const u=patch.worker.u+10,v=patch.worker.v-10;
  for(const [i,a] of patch.animals.entries()){
   if(a.v10Spread)continue;const [dx,dz]=offsets[(i+farm)%offsets.length];
   const site=[[u+dx,v+dz],[u+dx*.7,v+dz*.7],[u+dx*.4,v+dz*.4]].find(p=>safe(g,...p,.47));
   if(!site)continue;const p=at(...site);a.a.position.set(p.x,g.terrain.height(p.x,p.z),p.z);a.origin.copy(a.a.position);a.walkPosition?.copy(a.a.position);
   if(a.v9){a.v9.target=null;a.v9.phase='graze';a.v9.until=g.state.elapsed+2+i*.4;}a.v10Spread=true;count++;
  }
 }report.spreadAnimals=count;
}
function distributeStaff(g,report){const rear=g.villaV6?.rear?.people||[],chosen=[];
 const sites=[];for(const u of [-105,-79,-55,-36,35,55,78,104,-91,-65,-43,43,67,91])for(const v of [-56,27,-35,-74,4,-18,39,-62]){
  if(u>0&&u<56&&v>0&&v<48||Math.abs(u)<30&&v>-37&&v<13)continue;
  if(g.villaV4?.corral&&Math.hypot(u-g.villaV4.corral.u,v-g.villaV4.corral.v)<19)continue;
  if(g.villaLife.pastures.some(p=>Math.hypot(u-p.worker.u-10,v-p.worker.v+10)<14))continue;
  if(safe(g,u,v,1.2))sites.push([u,v]);
 }
 let moved=0;for(const [i,person] of rear.entries()){
  if(i%4===0)continue;const options=sites.filter(site=>distance(site,[person.origin.u,person.origin.v])>20&&chosen.every(p=>distance(site,p)>13));
  if(!options.length)continue;const site=options[(i*13+3)%options.length],p=at(...site);
  person.origin={u:site[0],v:site[1]};person.obj.position.set(p.x,g.terrain.height(p.x,p.z),p.z);
  for(const worker of g.villaLife.people)if(worker.obj===person.obj){worker.u=site[0];worker.v=site[1];worker.home={x:p.x,z:p.z};}
  chosen.push(site);moved++;
 }
 for(const guard of g.villaLife.people.filter(p=>p.v5Guard&&p.u<-96&&p.v<-65)){
  const site=sites.find(p=>p[1]>0&&chosen.every(q=>distance(p,q)>16));if(!site)continue;
  const p=at(...site);guard.obj.position.set(p.x,g.terrain.height(p.x,p.z),p.z);guard.home={x:p.x,z:p.z};guard.u=site[0];guard.v=site[1];chosen.push(site);moved++;
 }
 report.relocatedRear=moved;
}
function cloneHorse(source){
 // THREE.Object3D.clone JSON-serializes userData; horseLegs stores circular
 // THREE.Group references. Temporarily remove just that metadata for cloning.
 const userData=source.mesh.userData;let copy;
 try{source.mesh.userData={};copy=source.mesh.clone(true);}finally{source.mesh.userData=userData;}
 copy.userData.horseLegs=(userData.horseLegs||[]).map(leg=>copy.children[source.mesh.children.indexOf(leg)]).filter(Boolean);
 return copy;
}
function roaming(g,source,base,root,report){const herd=[];if(!source||base.length<45)return herd;
 const N=base.length;
 for(let index=0;index<3;index++){
  let course=null;
  for(let attempt=0;attempt<8&&!course;attempt++){
   const start=Math.floor((index*.32+attempt*.07)*N)%N,segmentPoints=Array.from({length:37},(_,i)=>base[(start+i)%N]);
   for(const inset of [8,6,4]){
    const shifted=segmentPoints.map(([u,v])=>{const dx=-u,dz=-15-v,len=Math.hypot(dx,dz)||1;return [u+dx/len*inset,v+dz/len*inset];});
    if(distance(shifted[0],shifted.at(-1))>25&&routeSafe(g,shifted,1.15)){course=shifted;break;}
   }
  }
  if(!course)continue;const model=cloneHorse(source),guardIndex=source.mesh.children.indexOf(source.guardModel);
  if(guardIndex>=0&&model.children[guardIndex])model.children[guardIndex].visible=index%2===0;
  const p=at(...course[0]);model.name='Mandria · cavallo libero nei sentieri '+(index+1);model.position.set(p.x,g.terrain.height(p.x,p.z),p.z);root.add(model);
  herd.push({model,route:course,target:1,speed:1.1+index*.15,pause:0,index,legs:model.userData.horseLegs});
 }
 report.roamingHorses=herd.length;return herd;
}
function moveHorses(g,herd,dt){for(const h of herd){if(g.state.elapsed<h.pause)continue;
 const m=h.model,target=at(...h.route[h.target]),dx=target.x-m.position.x,dz=target.z-m.position.z,d=Math.hypot(dx,dz);
 if(d<.28){if(h.target===0||h.target===h.route.length-1){h.speed*=-1;h.pause=g.state.elapsed+2.3+h.index;}
  h.target=Math.max(0,Math.min(h.route.length-1,h.target+(h.speed<0?-1:1)));continue;}
 const step=Math.min(d,Math.abs(h.speed)*Math.min(dt,.07)),x=m.position.x+dx/d*step,z=m.position.z+dz/d*step,p=areaLocal(VILLA,x,z);
 if(!safe(g,p.u,p.v,1.05)){h.pause=g.state.elapsed+3;continue;}m.position.set(x,g.terrain.height(x,z),z);
 const yaw=Math.atan2(dx,dz),turn=Math.atan2(Math.sin(yaw-m.rotation.y),Math.cos(yaw-m.rotation.y));m.rotation.y+=Math.max(-dt*1.9,Math.min(dt*1.9,turn));
 for(const [i,leg] of h.legs.entries())leg.rotation.x=Math.sin(g.state.elapsed*5.4+i*2.1)*.26;
 }}
function initialise(g){const root=new THREE.Group();root.name='Mandria v10 · cavalli nel circuito e percorsi distribuiti';g.villaV3.root.add(root);
 const report={arenaHorses:0,roamingHorses:0,apeLanes:0,apes:0,spreadAnimals:0,relocatedRear:0};
 const source=ring(g,report),base=apes(g,report);distributeFarm(g,report);distributeStaff(g,report);
 return {root,life:g.villaLife,report,roaming:roaming(g,source,base,root,report)};
}
export function mandriaV10Update(g,dt){if(!g.state?.started||!g.villaV9||!g.villaV8PatrolReport?.complete||!g.villaV4?.corral||!Number.isFinite(dt)||dt<=0)return;
 if(!g.villaV10||g.villaV10.life!==g.villaLife){g.villaV10?.root.parent?.remove(g.villaV10.root);g.villaV10=initialise(g);}
 g.villaV10.root.visible=Math.hypot(g.state.x-VILLA.x,g.state.z-VILLA.z)<430;
 if(g.villaV10.root.visible)moveHorses(g,g.villaV10.roaming,dt);
}
