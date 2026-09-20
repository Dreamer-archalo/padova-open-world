// An actual oval sand course inside the existing safe rectangular paddock:
// preserve the 16-point rider and riderless horse loops, distinguish the ring visually.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint} from './gameplay-areas.js';
const point=(u,v)=>areaPoint(VILLA,u,v),geo=new THREE.BoxGeometry(1,1,1);
const material=color=>new THREE.MeshStandardMaterial({color,roughness:.98});
function ring(g,root,u,v,rx,rz,scale,width,color,height=.07){const count=64,instanced=new THREE.InstancedMesh(geo,material(color),count),dummy=new THREE.Object3D();
 for(let i=0;i<count;i++){const a=i*Math.PI*2/count,b=(i+1)*Math.PI*2/count;
  const p=point(u+Math.cos(a)*rx*scale,v+Math.sin(a)*rz*scale),q=point(u+Math.cos(b)*rx*scale,v+Math.sin(b)*rz*scale);
  dummy.position.set((p.x+q.x)/2,(g.terrain.height(p.x,p.z)+g.terrain.height(q.x,q.z))/2+height,(p.z+q.z)/2);
  dummy.rotation.set(0,Math.atan2(q.x-p.x,q.z-p.z),0);dummy.scale.set(width,.10,Math.hypot(q.x-p.x,q.z-p.z)+.10);dummy.updateMatrix();instanced.setMatrixAt(i,dummy.matrix);
 }instanced.instanceMatrix.needsUpdate=true;instanced.castShadow=false;instanced.receiveShadow=false;instanced.frustumCulled=false;root.add(instanced);return instanced;}
function build(g){const corral=g.villaV4?.corral;if(!corral||!g.villaV5Estate?.track)return null;
 const {u,v}=corral,root=new THREE.Group();root.name='Mandria · pista ovale in sabbia · circuiti cavalli';g.villaV5Estate.root.add(root);
 // Broad sand ring: the horses are on its centre line, not on the old rectangular fence.
 const bands=[ring(g,root,u,v,6,7.4,.85,1.45,'#a88a5d'),ring(g,root,u,v,6,7.4,1,1.75,'#cfb789'),ring(g,root,u,v,6,7.4,1.15,1.45,'#b69b6b')];
 const rails=[ring(g,root,u,v,6,7.4,1.29,.15,'#624c31',.78),ring(g,root,u,v,6,7.4,1.29,.15,'#8a704b',1.32)];
 const postGeo=new THREE.CylinderGeometry(.105,.115,1.45,7),posts=new THREE.InstancedMesh(postGeo,material('#73583d'),32),o=new THREE.Object3D();
 for(let i=0;i<32;i++){const a=i*Math.PI/16,p=point(u+Math.cos(a)*6*1.29,v+Math.sin(a)*7.4*1.29);
  o.position.set(p.x,g.terrain.height(p.x,p.z)+.72,p.z);o.rotation.set(0,0,0);o.scale.set(1,1,1);o.updateMatrix();posts.setMatrixAt(i,o.matrix);
 }posts.instanceMatrix.needsUpdate=true;posts.castShadow=false;posts.frustumCulled=false;root.add(posts);
 return {root,segments:64,bands:bands.length,rails:rails.length,posts:32,mounted:g.villaV3.patrols.filter(h=>h.estateHorse&&h.v5Cowboy).length,unmounted:g.villaV3.patrols.filter(h=>h.estateHorse&&!h.v5Cowboy).length};
}
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV6HorseTrack){ModernGameplay.prototype.__mandriaV6HorseTrack=true;
 ModernGameplay.prototype.populate=function(...args){if(this.villaV6HorseTrack){this.villaV6HorseTrack.root.parent?.remove(this.villaV6HorseTrack.root);this.villaV6HorseTrack=null;}return oldPopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){oldUpdate.call(this,dt);if(this.state?.started&&this.villaV6&&!this.villaV6HorseTrack)this.villaV6HorseTrack=build(this);};
}
