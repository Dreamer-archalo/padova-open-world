// Estate-local feedback pass. Never edits the public street graph or the airport.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint,areaLocal} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
import {ESTATE_BORDER} from './villa-mandria-estate-v3.js';
import {vehicleBlocked} from './movement.js';
import {resetGroundMotion} from './vehicle-dynamics.js';
const at=(u,v)=>areaPoint(VILLA,u,v),BOX=new THREE.BoxGeometry(1,1,1),CONE=new THREE.ConeGeometry(1,1,6),CYL=new THREE.CylinderGeometry(1,1,1,8),materials=new Map();
function material(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.84}));return materials.get(color);}
function cube(parent,color,x,y,z,w,h,d){const m=new THREE.Mesh(BOX,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=false;m.receiveShadow=false;parent.add(m);return m;}
function allowed(g,u,v,r=1.2){if(u<ESTATE_BORDER.west+10||u>ESTATE_BORDER.east-10||v<ESTATE_BORDER.south+10||v>ESTATE_BORDER.north-10)return false;
 const range=g.villaRange;if(range?.ready&&Math.abs(u-range.u)<13&&Math.abs(v-range.v)<21)return false;
 const corral=g.villaV4?.corral;if(corral&&Math.abs(u-corral.u)<12&&Math.abs(v-corral.v)<14)return false;
 // The hangar, facade and scripted staircase are not shortcuts for patrols.
 if(u>1&&u<47&&v>4&&v<49||Math.abs(u)<27&&v>-35&&v<2)return false;
 return mandriaFree(g,u,v,r,3.2);
}
function safeLine(g,a,b,r=1.2){const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.6);let h=null;
 for(let i=0;i<=n;i++){const t=i/n,u=a[0]+(b[0]-a[0])*t,v=a[1]+(b[1]-a[1])*t;if(!allowed(g,u,v,r))return false;
  const p=at(u,v),y=g.terrain.height(p.x,p.z);if(h!==null&&Math.abs(y-h)>.5)return false;h=y;}
 return true;
}
function routeOK(g,route){return route.length>=5&&route.every((p,i)=>i===0||safeLine(g,route[i-1],p));}
function possibleLoops(g){const choices=[];
 // Patrol sectors are deliberately distributed across the east/west and rear access strips.
 for(const [u,v] of [[83,24],[-88,28],[88,-12],[-96,-14],[83,-51],[-96,-56],[43,-73],[-42,-73],[104,19],[-111,5],[105,-65],[-112,-64]]){
  for(const [width,depth] of [[16,22],[11,18],[8,12],[6,8]]){
   const route=[[u,v],[u+width,v],[u+width,v-depth],[u,v-depth],[u,v]];
   if(routeOK(g,route))choices.push(route);
  }
 }
 // Broad fallback search follows free farm service corridors, never arbitrary cross-map paths.
 if(choices.length<4)for(const u of [-112,-101,-90,-78,-65,-50,49,63,77,91,107])for(const v of [-72,-49,-24,0,27,43]){
  const route=[[u,v],[u+7,v],[u+7,v-10],[u,v-10],[u,v]];
  if(routeOK(g,route))choices.push(route);
 }
 return choices;
}
function routeCentre(route){return {u:route.reduce((n,p)=>n+p[0],0)/route.length,v:route.reduce((n,p)=>n+p[1],0)/route.length};}
function addApe(g,source,route,index){const p=at(...route[0]),c=g.addCar(p.x,p.z,VILLA.yaw,false,true,'mito'),old=c.mesh;
 g.scene.remove(old);g.forget?.(c);const clone=source.mesh.clone(true),guardIndex=source.mesh.children.indexOf(source.guardModel);
 if(guardIndex<0){g.remove(c);return null;}c.mesh=clone;c.guardModel=clone.children[guardIndex];c.spec={...source.spec};c.rider=null;c.name='Ape Car · ronda perimetrale '+index;
 Object.assign(c,{mandriaPatrol:'ape',route,routeIndex:1,fixedSpawn:true,parked:true,estateAuthorized:true,patrolSlot:0,speed:0,health:100,lastHello:-100,speechActor:null});
 const y=g.terrain.height(p.x,p.z);Object.assign(c,{x:p.x,z:p.z,y,yaw:VILLA.yaw,home:{x:p.x,z:p.z,y,yaw:VILLA.yaw}});
 clone.name='Mandria · Ape Car · pattuglia '+index;g.scene.add(clone);g.pose(c);g.villaV3.patrols.push(c);return c;
}
function rebuildApePatrols(g){const e=g.villaV5Estate,patrols=g.villaV3.patrols,source=patrols.find(c=>c.mandriaPatrol==='ape');if(!source)return {rerouted:0,added:0,apeTotal:0};
 const loops=possibleLoops(g),used=[];let rerouted=0,added=0;
 const separated=route=>{const c=routeCentre(route);return used.every(other=>Math.hypot(other.u-c.u,other.v-c.v)>22);};
 const take=()=>{const i=loops.findIndex(separated);if(i<0)return null;const route=loops.splice(i,1)[0];used.push(routeCentre(route));return route;};
 const first=take();if(first&&source!==g.state.car){const p=at(...first[0]),y=g.terrain.height(p.x,p.z);
  Object.assign(source,{route:first,routeIndex:1,x:p.x,z:p.z,y,yaw:VILLA.yaw,home:{x:p.x,z:p.z,y,yaw:VILLA.yaw},parked:true,speed:0,patrolSlot:0,estateAuthorized:true});g.pose(source);rerouted++;}
 for(const c of [...patrols])if(c!==source&&c.mandriaPatrol==='ape'){
  const route=take();if(route&&c!==g.state.car){const p=at(...route[0]),y=g.terrain.height(p.x,p.z);Object.assign(c,{route,routeIndex:1,x:p.x,z:p.z,y,yaw:VILLA.yaw,speed:0,patrolSlot:0,estateAuthorized:true});g.pose(c);rerouted++;}
  else if(c.route.length<2&&c!==g.state.car){patrols.splice(patrols.indexOf(c),1);g.remove(c);}
 }
 const newly=[];for(let i=0;i<4;i++){const route=take();if(!route)break;const c=addApe(g,source,route,i+1);if(c){newly.push(c);added++;}}
 e.extraPatrols=[...(e.extraPatrols||[]),...newly];const apeTotal=patrols.filter(c=>c.mandriaPatrol==='ape'&&c.route.length>=5).length;
 Object.assign(e.routes,{rerouted:e.routes.rerouted+rerouted,added:e.routes.added+added,apeTotal});return {rerouted,added,apeTotal,candidateLoops:used.length};
}
function rebuildRoofs(g){let corrected=0;
 for(const root of [g.villaLife?.root,g.villaLife?.expansion?.root,g.villaV3?.root])root?.traverse(group=>{
  if(!group.isGroup||group.userData.v6Gable||!/casa dei lavoratori agricoli|stalla e fienile/i.test(group.name||''))return;
  const old=group.children.filter(o=>o.isMesh&&['975d3d','574739'].includes(o.material?.color?.getHexString()));if(old.length<2)return;
  group.userData.v6Gable=true;for(const o of old)o.visible=false;
  const barn=/stalla/.test(group.name),half=barn?1.48:1.85,width=barn?3.73:4.18,depth=barn?7.65:8.12,y=3.94,color=barn?'#72472c':'#a55d3e';
  for(const side of [-1,1]){const panel=cube(group,color,side*half,y,0,width,.32,depth);panel.rotation.z=-side*.42;}
  cube(group,'#d8ae7b',0,4.79,0,.31,.20,depth+.24);
  for(const side of [-1,1])cube(group,'#6b452c',side*3.6,3.06,0,.16,.19,depth+.13);
  corrected++;
 });
 return corrected;
}
function parkingByWall(g,root){const racers=g.cars.filter(c=>c.fixedSpawn&&['saetta','fulmine'].includes(c.style)&&/Villa della Mandria/.test(c.name||''));
 if(racers.length<2)return {aligned:false,againstWall:false,count:racers.length};
 const [a,b]=racers,space=(a.spec.width+b.spec.width)/2+.30;
 // Exterior south wall of the private hangar is at v≈8. Places are parallel to it,
 // with their noses 0.6-1.4 m from the wall; never in the middle of the courtyard.
 for(const baseU of [12,15,18,22,25])for(const v of [5.05,4.45,3.85]){
  const sites=[[baseU,v],[baseU+space,v]];if(sites.some(([u,z],i)=>{
   const c=racers[i],p=at(u,z),y=g.terrain.height(p.x,p.z);
   if(!mandriaFree(g,u,z,c.spec.width*.52,c.spec.height+.4)||vehicleBlocked(p.x,p.z,VILLA.yaw,g.collision,c.spec,y))return true;
   return g.cars.some(other=>other!==a&&other!==b&&other.fixedSpawn&&other.mesh.visible&&!other.spec.aircraft&&Math.hypot(other.x-p.x,other.z-p.z)<(other.spec.length+c.spec.length)*.5+.5);
  }))continue;
  for(const [i,[u,z]] of sites.entries()){const c=racers[i],p=at(u,z),y=g.terrain.height(p.x,p.z);
   Object.assign(c,{x:p.x,z:p.z,y,yaw:VILLA.yaw,speed:0,parked:true,health:100});resetGroundMotion(c);c.home={x:c.x,z:c.z,y,yaw:c.yaw};g.pose(c);
   const marker=at(u,z);cube(root,'#d9caa6',marker.x,y+.06,marker.z,c.spec.width+.34,.045,c.spec.length+.16).material.transparent=true;
  }
  return {aligned:true,againstWall:true,count:2,gap:.30,spots:sites};
 }
 return {aligned:false,againstWall:false,count:racers.length,reason:'no collision-free hangar-wall bays'};
}
function vestGuard(group){const o=new THREE.Group();cube(o,'#343b39',0,1.10,0,.6,.74,.37);cube(o,'#182a2b',0,1.20,.22,.55,.48,.15);cube(o,'#bda083',0,1.72,0,.32,.30,.27);
 for(const side of [-1,1]){cube(o,'#293332',side*.18,.39,0,.20,.75,.21);cube(o,'#313c3c',side*.41,1.13,0,.20,.64,.21);}
 cube(o,'#222b2c',0,1.91,0,.37,.12,.32);group.add(o);return o;}
function createTrio(g,root,route,index){const leaderBase=g.villaLife.people.find(p=>p.role==='bodyguard')?.obj;if(!leaderBase)return null;
 const group=new THREE.Group();root.add(group);const leader=leaderBase.clone(true);leader.position.set(0,0,0);group.add(leader);
 const wing=[vestGuard(group),vestGuard(group)];group.name='Mandria · pattuglia a piedi · capo con cravatta + due giubbotti';
 return {group,leader,wing,route,index,progress:index*4};
}
function moveTrio(g,p,dt){p.progress+=Math.min(dt,.08)*1.35;const way=p.route;let remaining=p.progress;let i=0;
 for(;i<way.length-1;i++){const len=Math.hypot(way[i+1][0]-way[i][0],way[i+1][1]-way[i][1]);if(remaining<=len)break;remaining-=len;}
 if(i===way.length-1){p.progress=0;i=0;remaining=0;}
 const a=way[i],b=way[i+1],length=Math.max(.01,Math.hypot(b[0]-a[0],b[1]-a[1]));const u=a[0]+(b[0]-a[0])*remaining/length,v=a[1]+(b[1]-a[1])*remaining/length,heading=Math.atan2(b[0]-a[0],b[1]-a[1]);
 const anchor=at(u,v);p.group.position.set(anchor.x,g.terrain.height(anchor.x,anchor.z),anchor.z);p.group.rotation.y=heading;
 p.leader.position.set(0,0,.95);p.wing[0].position.set(-1.35,0,-.9);p.wing[1].position.set(1.35,0,-.9);
}
function rearLife(g,root,loops){const people=[],trios=[];const workerSource=g.villaLife.people.find(p=>p.role==='worker');
 if(workerSource){let count=0;for(const u of [-109,-95,-78,-58,-38,38,55,79,97,111])for(const v of [-83,-66]){
  if(count>=15)break;if(!allowed(g,u,v,1.35))continue;
  const w=workerSource.obj.clone(true),p=at(u,v);w.position.set(p.x,g.terrain.height(p.x,p.z),p.z);w.name='Mandria · contadino · '+(['zappa','innaffiatura','raccolta','trasporto'][count%4]);root.add(w);
  const job=count%4;if(job===0){cube(w,'#614b32',.42,.94,.12,.09,1.60,.10).rotation.z=.25;}
  if(job===1){cube(w,'#486b72',.43,.35,.18,.57,.33,.4);}
  if(job===2){cube(w,'#90723f',.48,.50,.22,.65,.39,.47);}
  if(job===3){cube(w,'#a27b4f',-.56,.35,-.15,.84,.65,1.03);}
  const info={obj:w,origin:{u,v},phase:count*.8,job,dialogue:count%4===0};people.push(info);
  if(info.dialogue){const arms=w.children.filter(o=>o.isGroup);g.villaLife.people.push({obj:w,left:arms[0]||new THREE.Group(),right:arms[1]||new THREE.Group(),role:'worker',home:{x:p.x,z:p.z},u,v,helloAt:-100,until:0,lastText:'',phase:0,v6Worker:true});}
  count++;
 }}
 for(const [i,route] of loops.slice(0,2).entries()){const trio=createTrio(g,root,route,i);if(trio)trios.push(trio);}
 // Extra rows, hay and irrigation at the rear: mesh instances keep draw calls limited.
 const positions=[];for(const u0 of [-94,78])for(let row=0;row<8;row++)for(let col=0;col<11;col++){
  const u=u0+col*2.15,v=-86+row*2.2;if(!allowed(g,u,v,.3))continue;const p=at(u,v);positions.push({x:p.x,y:g.terrain.height(p.x,p.z),z:p.z});
 }
 if(positions.length){const plants=new THREE.InstancedMesh(CONE,material('#52783a'),positions.length),dummy=new THREE.Object3D();
  for(const [i,p] of positions.entries()){dummy.position.set(p.x,p.y+.48,p.z);dummy.scale.set(.34,.95,.34);dummy.updateMatrix();plants.setMatrixAt(i,dummy.matrix);}plants.instanceMatrix.needsUpdate=true;plants.castShadow=false;root.add(plants);
 }
 let hay=0;for(const [u,v] of [[-88,-87],[-67,-85],[88,-81],[107,-87],[-48,-86],[43,-85]])if(allowed(g,u,v,1.8)){
  const p=at(u,v),y=g.terrain.height(p.x,p.z);for(let j=0;j<3;j++)cube(root,'#b49455',p.x+j*1.2,y+.55,p.z,1.1,1.05,1.7);hay++;}
 return {people,trios,plants:positions.length,hay};
}
function update(g,dt){const e=g.villaV6;if(!e)return;
 for(const p of e.rear.people){const t=g.state.elapsed+p.phase,home=at(p.origin.u,p.origin.v),walking=p.job===3;
  p.obj.position.x=home.x+(walking?Math.sin(t*.38)*2.8:Math.sin(t*.42)*.24);
  p.obj.position.z=home.z+(walking?Math.sin(t*.38)*1.2:Math.cos(t*.25)*.13);
  p.obj.rotation.y=walking?Math.sin(t*.38)>0?0:Math.PI:VILLA.yaw+Math.sin(t*.31)*.17;
  p.obj.position.y=g.terrain.height(p.obj.position.x,p.obj.position.z)+Math.abs(Math.sin(t*(walking?4:1.9)))*(walking?.045:.07);
  const arms=p.obj.children.filter(o=>o.isGroup);if(arms[0])arms[0].rotation.x=Math.sin(t*(walking?5:2))*.24;
  if(arms[1])arms[1].rotation.x=-Math.sin(t*(walking?5:2))*.24;
 }
 for(const trio of e.rear.trios)moveTrio(g,trio,dt);
}
function initialize(g){const root=new THREE.Group();root.name='Mandria · v6 sicurezza, tetti, parcheggio e fattoria';g.villaV5Estate.root.add(root);
 const roofs=rebuildRoofs(g),parking=parkingByWall(g,root),ape=rebuildApePatrols(g);
 const loops=g.villaV3.patrols.filter(c=>c.mandriaPatrol==='ape'&&c.route?.length>=5).map(c=>c.route);
 const rear=rearLife(g,root,loops);
 return {root,roofs,parking,ape,rear};
}
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV6Estate){ModernGameplay.prototype.__mandriaV6Estate=true;
 ModernGameplay.prototype.populate=function(...args){if(this.villaV6){this.villaV6.root.parent?.remove(this.villaV6.root);this.villaV6=null;}return oldPopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){oldUpdate.call(this,dt);if(!this.state?.started||!this.villaV5Estate||!this.villaV3?.patrols||!this.villaLife)return;
  if(!this.villaV6)this.villaV6=initialize(this);update(this,dt);
 };
}
