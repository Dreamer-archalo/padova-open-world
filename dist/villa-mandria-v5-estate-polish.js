// Additional estate-only detail after v4; no changes to the airport or public city actors.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
import {safeEstateSegments} from './villa-mandria-estate-v2.js';
import {ESTATE_BORDER} from './villa-mandria-estate-v3.js';
import {vehicleBlocked} from './movement.js';
import {resetGroundMotion} from './vehicle-dynamics.js';
import {nearestOnSegment} from './core.js';
const at=(u,v)=>areaPoint(VILLA,u,v),CUBE=new THREE.BoxGeometry(1,1,1),CONE=new THREE.ConeGeometry(1,1,7),CYL=new THREE.CylinderGeometry(1,1,1,8);
const materials=new Map();function mat(c){if(!materials.has(c))materials.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.84}));return materials.get(c);}
function box(parent,c,x,y,z,w,h,d){const o=new THREE.Mesh(CUBE,mat(c));o.position.set(x,y,z);o.scale.set(w,h,d);parent.add(o);return o;}
function correctRoofs(g){let corrected=0;
 for(const parent of [g.villaV3?.root,g.villaLife?.expansion?.root]){
  parent?.traverse(o=>{if(!o.isGroup||o.userData.roofCorrectionDone||!(/casa dei lavoratori agricoli|stalla e fienile/.test(o.name||'')))return;
   for(const p of o.children){if(!p.isMesh)continue;const hex=p.material?.color?.getHexString();
    if(hex==='975d3d'||hex==='574739'){p.rotation.z=-Math.sign(p.position.x)*Math.abs(p.rotation.z);corrected++;}
   }o.userData.roofCorrectionDone=true;
  });
 }return corrected;
}
function staticSecurity(g){const life=g.villaLife,source=life.people.find(p=>p.role==='bodyguard');if(!source)return 0;
 let count=0;const guards=[[-12,54],[12,54],[-48,36],[49,37],[-48,-32],[49,-32],[-58,-60],[58,-72],[-108,-80],[107,-78]];
 for(const [u,v] of guards){if(!mandriaFree(g,u,v,1.05,3))continue;
  const p=at(u,v),obj=source.obj.clone(true),groups=obj.children.filter(c=>c.isGroup);obj.position.set(p.x,g.terrain.height(p.x,p.z),p.z);obj.name='Mandria · guardia privata in abito · '+(count+1);
  obj.rotation.y=VILLA.yaw;life.root.add(obj);
  life.people.push({obj,left:groups[0]||new THREE.Group(),right:groups[1]||new THREE.Group(),role:'bodyguard',home:{x:p.x,z:p.z},u,v,helloAt:-100,until:0,lastText:'',phase:0,v5Guard:true});count++;
 }
 return count;
}
function segmentClear(g,a,b,width=1.8){const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/5);
 return safeEstateSegments(g,[a,b],width).length>=n;
}
function routeClear(g,route){return route.length>3&&route.every(([u,v])=>mandriaFree(g,u,v,1.12,3))&&route.every((p,i)=>i===0||segmentClear(g,route[i-1],p));}
function placePatrol(g,c,route){const p=at(...route[0]);c.route=route;c.routeIndex=1;c.x=p.x;c.z=p.z;c.y=g.terrain.height(p.x,p.z);c.yaw=VILLA.yaw;c.speed=0;c.patrolSlot=0;c.estateAuthorized=true;c.home={x:c.x,z:c.z,y:c.y,yaw:c.yaw};g.pose(c);}
function newApe(g,source,route,index){if(!routeClear(g,route))return null;
 const p=at(...route[0]),c=g.addCar(p.x,p.z,VILLA.yaw,false,true,'mito'),old=c.mesh;
 g.scene.remove(old);g.forget?.(c);const i=source.mesh.children.indexOf(source.guardModel);c.mesh=source.mesh.clone(true);c.guardModel=c.mesh.children[i];if(!c.guardModel){g.remove(c);return null;}
 c.mesh.userData={};c.spec={...source.spec};c.name='Ape Car · ronda '+index;c.mandriaPatrol='ape';c.fixedSpawn=true;c.parked=true;c.estateAuthorized=true;c.health=100;c.patrolSlot=0;c.lastHello=-100;c.speechActor=null;
 g.scene.add(c.mesh);g.villaV3.patrols.push(c);placePatrol(g,c,route);return c;
}
function securityRoutes(g){const apes=g.villaV3.patrols.filter(c=>c.mandriaPatrol==='ape'),range=g.villaRange;
 const west=[[-54,43],[-54,-30],[-49,-36],[-49,36],[-54,43]],westShort=[[-55,42],[-55,25],[-49,25],[-49,42],[-55,42]];
 const east=[[58,43],[58,-37],[70,-37],[70,36],[58,43]],eastShort=[[59,40],[59,15],[70,15],[70,40],[59,40]];
 let rerouted=0,added=0;
 if(apes[0])for(const route of [east,eastShort])if(routeClear(g,route)){placePatrol(g,apes[0],route);rerouted++;break;}
 if(apes[1])for(const route of [west,westShort])if(routeClear(g,route)){placePatrol(g,apes[1],route);rerouted++;break;}
 // The old western straight patrol intersects the target range's east wall.
 // If no alternative is collision-free, park it rather than drive through it.
 if(apes[1]&&!apes[1].estateAuthorized&&range?.ready){apes[1].mesh.visible=false;apes[1].route=[[1000,1000]];apes[1].routeIndex=0;apes[1].speed=0;}
 if(apes[0])for(const [index,route] of [
  [[52,42],[52,-28],[61,-34],[67,-28],[67,34],[52,42]],
  [[-57,43],[-57,-28],[-51,-33],[-50,38],[-57,43]],
  [[73,40],[73,-33],[79,-33],[79,36],[73,40]]
 ].entries())if(newApe(g,apes[0],route,index+3))added++;
 return {rerouted,added,apeTotal:g.villaV3.patrols.filter(c=>c.mandriaPatrol==='ape'&&c.route.length>1).length};
}
function ovalTrack(g,root){const c=g.villaV4.corral;if(!c)return null;const {u,v}=c,rx=6,rz=7.4;
 const points=Array.from({length:16},(_,i)=>[u+Math.cos(i*Math.PI/8)*rx,v+Math.sin(i*Math.PI/8)*rz]);
 if(!points.every(p=>mandriaFree(g,...p,1.1,3)))return null;
 for(const radius of [1,1.10])for(let i=0;i<32;i++){
  const a=i*Math.PI/16,b=(i+1)*Math.PI/16,p=at(u+Math.cos(a)*rx*radius,v+Math.sin(a)*rz*radius),q=at(u+Math.cos(b)*rx*radius,v+Math.sin(b)*rz*radius);
  const centre=[(p.x+q.x)/2,(p.z+q.z)/2],mesh=box(root,'#b9a077',centre[0],g.terrain.height(...centre)+.032,centre[1],.12,.065,Math.hypot(p.x-q.x,p.z-q.z));mesh.rotation.y=Math.atan2(q.x-p.x,q.z-p.z);
 }
 const horses=g.villaV3.patrols.filter(c=>c.estateHorse);for(const [i,h] of horses.entries()){
  const start=i*8%16,route=[...points.slice(start),...points.slice(0,start),points[start]];placePatrol(g,h,route);
  h.patrolSlot=0;h.v5Cowboy=i%2===0;
  if(h.v5Cowboy&&h.guardModel&&!h.guardModel.userData.cowboyHat){
   box(h.guardModel,'#5c3720',0,1.52,0,.68,.07,.62);box(h.guardModel,'#76502b',0,1.69,0,.36,.29,.36);
   h.guardModel.userData.cowboyHat=true;
  }
 }
 return {waypoints:points.length,horses:horses.length,cowboys:horses.filter(h=>h.v5Cowboy).length};
}
function publicStreetNearby(g,x,z,r=4){for(const seg of g.graph?.index?.near(x,z,r+9)||[]){if(seg.road?.gameplay||seg.road?.access==='private')continue;const a=g.graph.nodes[seg.a],b=g.graph.nodes[seg.b];if(!a||!b)continue;
  const p=nearestOnSegment(x,z,[a.x,a.z],[b.x,b.z]);if(Math.hypot(x-p.x,z-p.z)<r+(seg.road.w||5)/2)return true;
 }return false;}
function denserTrees(g,root){const sites=[];
 for(let u=ESTATE_BORDER.west+10;u<=ESTATE_BORDER.east-10;u+=9)for(const v of [ESTATE_BORDER.south-8,ESTATE_BORDER.north+8])sites.push([u,v]);
 for(let v=ESTATE_BORDER.south+10;v<=ESTATE_BORDER.north-10;v+=9)for(const u of [ESTATE_BORDER.west-8,ESTATE_BORDER.east+8])sites.push([u,v]);
 const positions=[];for(const [u,v] of sites){if(v>ESTATE_BORDER.north&&Math.abs(u)<18)continue;
  const p=at(u,v);if(!mandriaFree(g,u,v,1.5,11)||publicStreetNearby(g,p.x,p.z,2.8))continue;
  positions.push({x:p.x,y:g.terrain.height(p.x,p.z),z:p.z,h:11+positions.length%4});
 }
 if(!positions.length)return 0;
 const stems=new THREE.InstancedMesh(CYL,mat('#765b42'),positions.length),crowns=new THREE.InstancedMesh(CONE,mat('#3c6847'),positions.length),crowns2=new THREE.InstancedMesh(CONE,mat('#527b43'),positions.length),o=new THREE.Object3D();
 for(const [i,p] of positions.entries()){
  o.position.set(p.x,p.y+p.h*.29,p.z);o.scale.set(.22,p.h*.58,.22);o.updateMatrix();stems.setMatrixAt(i,o.matrix);
  o.position.y=p.y+p.h*.71;o.scale.set(1.5,p.h*.60,1.5);o.updateMatrix();crowns.setMatrixAt(i,o.matrix);
  o.position.y=p.y+p.h*.93;o.scale.set(1.10,p.h*.43,1.10);o.updateMatrix();crowns2.setMatrixAt(i,o.matrix);
 }
 for(const item of [stems,crowns,crowns2]){item.instanceMatrix.needsUpdate=true;item.frustumCulled=false;item.castShadow=false;item.receiveShadow=false;root.add(item);}
 return positions.length;
}
function raceParking(g){const racers=g.cars.filter(c=>c.fixedSpawn&&['saetta','fulmine'].includes(c.style)&&/Villa della Mandria/.test(c.name||''));if(racers.length<2)return {aligned:false,count:racers.length};
 const [a,b]=racers,space=(a.spec.width+b.spec.width)/2+.36,spots=[[-19,16],[-19+space,16]];
 for(const [i,[u,v]] of spots.entries()){
  const p=at(u,v),c=racers[i];if(!mandriaFree(g,u,v,c.spec.width*.49,c.spec.height+.4)||vehicleBlocked(p.x,p.z,VILLA.yaw,g.collision,c.spec,g.terrain.height(p.x,p.z)))return {aligned:false,count:racers.length};
  for(const other of g.cars){if(other===a||other===b||!other.fixedSpawn||!other.mesh.visible||other.spec.aircraft)continue;
   if(Math.hypot(other.x-p.x,other.z-p.z)<(other.spec.length+c.spec.length)/2+.4)return {aligned:false,count:racers.length};}
 }
 for(const [i,[u,v]] of spots.entries()){const c=racers[i],p=at(u,v),y=g.terrain.height(p.x,p.z);Object.assign(c,{x:p.x,z:p.z,y,yaw:VILLA.yaw,speed:0,parked:true,health:100});resetGroundMotion(c);c.home={x:p.x,z:p.z,y,yaw:VILLA.yaw};g.pose(c);}
 return {aligned:true,count:2,gap:.36};
}
function init(g){const root=new THREE.Group();root.name='Mandria · pattuglie ragionate, scuderie e privacy';g.villaV4.root.add(root);
 const guards=staticSecurity(g),routes=securityRoutes(g),track=ovalTrack(g,root),trees=denserTrees(g,root),racers=raceParking(g),roofs=correctRoofs(g);
 return {root,guards,routes,track,trees,racers,roofs};
}
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV5EstatePolish){ModernGameplay.prototype.__mandriaV5EstatePolish=true;
 ModernGameplay.prototype.populate=function(...args){if(this.villaV5Estate){for(const c of this.villaV5Estate.extraPatrols||[])this.remove(c);this.villaV5Estate.root.parent?.remove(this.villaV5Estate.root);this.villaV5Estate=null;}return oldPopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){oldUpdate.call(this,dt);
  if(!this.state?.started||!this.villaV4?.root||!this.villaV3?.patrols||!this.villaLife?.expansion)return;
  if(!this.villaV5Estate)this.villaV5Estate=init(this);
  correctRoofs(this);
  for(const horse of this.villaV3.patrols.filter(c=>c.estateHorse&&c.v5Cowboy)){if(horse.guardModel)horse.guardModel.visible=horse!==this.state.car&&horse.mesh.visible;}
 };
}
