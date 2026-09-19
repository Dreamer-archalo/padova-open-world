// Two active, culled airport cargo yards. No extra city-wide update or road collision.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {AIRPORT,areaPoint} from './gameplay-areas.js';
const cube=new THREE.BoxGeometry(),material=new Map();
function mat(color){if(!material.has(color))material.set(color,new THREE.MeshStandardMaterial({color,roughness:.78}));return material.get(color);}
function block(root,x,y,z,w,h,d,color){const mesh=new THREE.Mesh(cube,mat(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.receiveShadow=true;root.add(mesh);return mesh;}
const boxGeo=new THREE.BoxGeometry(1.5,1.35,1.5);
function yard(g,centreU,centreV,index){
 const anchor=areaPoint(AIRPORT,centreU,centreV),root=new THREE.Group();
 root.position.set(anchor.x,g.terrain.height(anchor.x,anchor.z),anchor.z);root.rotation.y=AIRPORT.yaw;
 root.name='Aeroporto · carico in movimento '+(index+1);
 const crateMat=mat(index?'#c5a06a':'#b38c5a'),crates=new THREE.InstancedMesh(boxGeo,crateMat,25),dummy=new THREE.Object3D();
 for(let i=0;i<25;i++){
  const column=i%5,row=Math.floor(i/5),x=-10+column*2.3,z=2+row*2.3;
  dummy.position.set(x,.7,z);dummy.rotation.set(0,(i%3)*.1,0);dummy.scale.setScalar(.8+(i%4)*.08);dummy.updateMatrix();crates.setMatrixAt(i,dummy.matrix);
 }
 crates.instanceMatrix.needsUpdate=true;crates.castShadow=false;crates.receiveShadow=true;root.add(crates);
 // A visible warehouse-loading machine, not just a stationary decoration.
 const forklift=new THREE.Group();forklift.position.set(6,0,-7);
 block(forklift,0,.7,0,2.3,1.1,3,'#cf9e38');
 block(forklift,0,1.6,-.75,1.8,1.25,.25,'#667a70');
 for(const x of [-1,1])for(const z of [-.95,.95])block(forklift,x,.33,z,.55,.65,.7,'#2e393b');
 const fork=new THREE.Group();fork.position.set(0,.5,1.65);
 for(const x of [-.68,.68])block(fork,x,0,.7,.2,.16,2.7,'#555f61');
 block(fork,0,.25,1.55,1.7,.18,.3,'#6a7475');forklift.add(fork);
 const load=block(fork,0,1,1.15,1.45,1.35,1.45,'#b59a73');root.add(forklift);
 // Lightweight tented storage, located away from the service road.
 const tent=new THREE.Group();tent.position.set(-1,0,-17);
 for(const x of [-7,7])for(const z of [-5,5])block(tent,x,2.1,z,.16,4.2,.16,'#6b7776');
 const roof=new THREE.Mesh(new THREE.ConeGeometry(10,3,4,1),mat('#a8b5ab'));
 roof.position.y=4.9;roof.rotation.y=Math.PI/4;tent.add(roof);
 block(tent,0,.09,0,15,.18,11,'#83928b');root.add(tent);
 g.scene.add(root);
 return {root,forklift,fork,load,index};
}
const previousPopulate=ModernGameplay.prototype.populate,previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__airportActiveCargo){
 ModernGameplay.prototype.__airportActiveCargo=true;
 ModernGameplay.prototype.populate=function(...args){const result=previousPopulate.apply(this,args);this.airportCargoYards=null;return result;};
 ModernGameplay.prototype.update=function(dt){
  previousUpdate.call(this,dt);
  if(!this.state?.started||!Number.isFinite(dt)||dt<=0)return;
  const distance=Math.hypot(this.state.x-AIRPORT.x,this.state.z-AIRPORT.z);
  if(distance>850){for(const yard of this.airportCargoYards||[])yard.root.visible=false;return;}
  if(!this.airportCargoYards)this.airportCargoYards=[yard(this,177,343,0),yard(this,175,-346,1)];
  const time=this.state.elapsed;
  for(const place of this.airportCargoYards){
   place.root.visible=true;
   const t=time*.72+place.index*2.1;
   // Forklift shuttles the crate between the loading platform and a stack;
   // the fork and the attached physical mesh visibly rise, travel and descend.
   place.forklift.position.x=6+Math.sin(t)*4;
   place.forklift.position.z=-7+Math.cos(t)*2;
   place.forklift.rotation.y=Math.cos(t)*.24;
   place.fork.position.y=.5+1.55*(.5+.5*Math.sin(t+1));
   place.load.rotation.y=.08*Math.sin(t);
  }
 };
}
