// Estate-specific solid geometry: scenic meshes must no longer be pass-through.
// Register only VISIBLE permanent props in the same SpatialIndex used by driving.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA} from './gameplay-areas.js';
import {vehicleBlocked} from './movement.js';
const box3=new THREE.Box3(),corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
const actorGroup=/\b(worker|gate|bodyguard|servant|guardia|contadino|pattuglia|soldat|pecora|bovino|cavallo|ape car|scorta)\b/i;
function movableAncestor(mesh,root){let p=mesh.parent;while(p&&p!==root){if(actorGroup.test(p.name||''))return true;p=p.parent;}return false;}
function visibleGeometry(mesh,root){let p=mesh;while(p&&p!==root){if(p.visible===false)return false;p=p.parent;}return true;}
function footprint(mesh){const geo=mesh.geometry;if(!geo.boundingBox)geo.computeBoundingBox();const bound=geo.boundingBox;
 const x=(bound.min.x+bound.max.x)/2,z=(bound.min.z+bound.max.z)/2,rx=(bound.max.x-bound.min.x)/2,rz=(bound.max.z-bound.min.z)/2;
 return corners.map(([sx,sz])=>{const p=mesh.localToWorld(new THREE.Vector3(x+sx*rx,0,z+sz*rz));return [p.x,p.z];});}
function register(g){const index=g.collision;if(!index?.add)return {count:0,reason:'collision index missing'};
 if(index.__mandriaV7ColliderReport)return index.__mandriaV7ColliderReport;
 const roots=[g.villaEstate?.root,g.villaLife?.root,g.villaV3?.root,g.villaV4?.root,g.villaV5Estate?.root].filter(Boolean);
 let count=0,skippedHidden=0;const byRoot={},seen=new Set();g.scene.updateMatrixWorld(true);
 for(const root of roots){let subtotal=0;root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.geometry?.type!=='BoxGeometry'||movableAncestor(mesh,root)||seen.has(mesh))return;
  // Retired perimeter rails and posts were hidden visually by v3 but used to
  // become invisible solid colliders in v7. Keep them non-solid throughout.
  if(!visibleGeometry(mesh,root)){skippedHidden++;return;}
  seen.add(mesh);box3.setFromObject(mesh);const w=box3.max.x-box3.min.x,h=box3.max.y-box3.min.y,d=box3.max.z-box3.min.z;
  if(!Number.isFinite(w+h+d)||h<.09||w<.09||d<.09||h<.19&&w>3&&d>3||w>85||d>85)return;
  const mx=(box3.min.x+box3.max.x)/2,mz=(box3.min.z+box3.max.z)/2;
  if(Math.hypot(mx-VILLA.x,mz-VILLA.z)>280)return;
  const ground=g.terrain.height(mx,mz);
  if(box3.max.y<ground-.4||box3.min.y>ground+25)return;
  const p=footprint(mesh),xs=p.map(a=>a[0]),zs=p.map(a=>a[1]);
  const obstacle={p,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:box3.min.y,h:Math.max(.12,h),kind:'mandria-solid',solid:true};
  index.add(obstacle,obstacle.minX,obstacle.minZ,obstacle.maxX,obstacle.maxZ);subtotal++;count++;
 });byRoot[root.name||'estate']=subtotal;}
 // SpatialIndex.near yields entire 60 m buckets, not exact geometric hits.
 // Filter only our additional obstacles by their true AABB; preserve the
 // original index results and moving worker/escort behavior.
 if(!index.__mandriaPreciseAddedObjects){const near=index.near.bind(index);
  index.near=function(x,z,r=0){const candidates=near(x,z,r);let filtered=null;
   for(const b of candidates){if(b.kind!=='mandria-solid')continue;
    if(x+r<b.minX||x-r>b.maxX||z+r<b.minZ||z-r>b.maxZ){if(!filtered)filtered=new Set(candidates);filtered.delete(b);}
   }return filtered||candidates;};index.__mandriaPreciseAddedObjects=true;
 }
 const report={count,byRoot,skippedHidden};index.__mandriaV7ColliderReport=report;return report;
}
function nearActor(g,x,z,y,r,exclude=null){
 for(const c of g.cars||[]){if(c===exclude||!c.mesh?.visible||c.spec?.aircraft||Math.abs(c.y-y)>2.6)continue;
  if(Math.hypot(c.x-x,c.z-z)<r+Math.max(.65,(c.spec.width||1.4)*.44))return c;
 }
 for(const p of g.villaLife?.people||[]){if(!p.obj?.visible||Math.abs(p.obj.position.y-y)>2.6)continue;
  if(Math.hypot(p.obj.position.x-x,p.obj.position.z-z)<r+.42)return p;
 }
 for(const p of g.villaV6?.rear.people||[]){if(!p.obj?.visible||Math.abs(p.obj.position.y-y)>2.6)continue;
  if(Math.hypot(p.obj.position.x-x,p.obj.position.z-z)<r+.42)return p;
 }
 for(const group of g.villaV6?.rear.trios||[]){const o=group.group;if(!o?.visible||Math.abs(o.position.y-y)>2.6)continue;
  if(Math.hypot(o.position.x-x,o.position.z-z)<r+2.1)return group;
 }
 for(const shooter of g.villaRange?.shooters||[]){if(!shooter.visible||Math.abs(shooter.position.y-y)>2.6)continue;
  if(Math.hypot(shooter.position.x-x,shooter.position.z-z)<r+.55)return shooter;
 }
 for(const patch of g.villaLife?.pastures||[])for(const animal of patch.animals||[]){if(!animal.a?.visible||Math.abs(animal.a.position.y-y)>2.6)continue;
  if(Math.hypot(animal.a.position.x-x,animal.a.position.z-z)<r+.62)return animal;
 }
 return null;
}
function contact(g,before){const s=g.state;
 if(s.mode==='foot'&&!g.villaV6Stairs?.travel&&!g.villaV7Stairs?.travel){
  const old=nearActor(g,before.x,before.z,before.y,.36),now=nearActor(g,s.x,s.z,s.y,.36);
  if(now&&!old){s.x=before.x;s.z=before.z;s.speed=0;}
 }else if(s.mode==='car'&&s.car&&!s.car.spec?.aircraft){
  const c=s.car,old=nearActor(g,before.x,before.z,before.y,Math.max(.65,c.spec.width*.42),c),now=nearActor(g,c.x,c.z,c.y,Math.max(.65,c.spec.width*.42),c);
  if(now&&!old){Object.assign(s,{x:before.x,z:before.z,y:before.y,speed:0});Object.assign(c,{x:before.x,z:before.z,y:before.y,speed:0});g.pose(c);}
 }
}
function patrolSafety(g,previous){for(const [c,b] of previous){if(!g.cars.includes(c)||c===g.state.car||!c.mesh.visible)continue;
  const hittingStatic=vehicleBlocked(c.x,c.z,c.yaw,g.collision,c.spec,c.y);
  const other=nearActor(g,c.x,c.z,c.y,Math.max(.65,c.spec.width*.43),c);
  if((hittingStatic||other)&&!vehicleBlocked(b.x,b.z,b.yaw,g.collision,c.spec,b.y)){
   Object.assign(c,{x:b.x,z:b.z,y:b.y,yaw:b.yaw,routeIndex:b.index,speed:0});g.pose(c);
  }
 }}
const priorPopulate=ModernGameplay.prototype.populate,priorUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV7Physics){ModernGameplay.prototype.__mandriaV7Physics=true;
 ModernGameplay.prototype.populate=function(...args){this.villaV7Physics=null;return priorPopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){const s=this.state,before={x:s.x,z:s.z,y:s.y};
  const previous=(this.villaV3?.patrols||[]).filter(c=>c.mandriaPatrol==='ape').map(c=>[c,{x:c.x,z:c.z,y:c.y,yaw:c.yaw,index:c.routeIndex}]);
  priorUpdate.call(this,dt);
  if(!s?.started||!this.villaV6?.root||!this.villaV4?.root||!this.villaLife||Math.hypot(s.x-VILLA.x,s.z-VILLA.z)>330)return;
  if(!this.villaV7Physics)this.villaV7Physics=register(this);
  contact(this,before);if(this.villaV7Physics.count)patrolSafety(this,previous);
 };
}
