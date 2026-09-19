// Preserve a real fighter silhouette for dynamically spawned dogfight interceptors.
// The generic addCar() factory does not construct airport-interceptor meshes.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {installVehicleDamage} from './vehicle-damage.js';
const geo=new THREE.BoxGeometry();
const skin=new THREE.MeshStandardMaterial({color:'#768e9c',roughness:.66});
const wings=new THREE.MeshStandardMaterial({color:'#9ab0b9',roughness:.68});
const glass=new THREE.MeshStandardMaterial({color:'#315468',roughness:.35});
function box(root,x,y,z,w,h,l,material){const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,l);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
function fallbackFighter(){
 const root=new THREE.Group();root.name='JET INSEGUITORE · INTERCETTORE';
 box(root,0,2,0,2,1.7,14,skin);
 box(root,0,2.25,1.1,14,.3,3.3,wings);
 box(root,0,2.25,-5.5,5,.22,1.6,wings);
 box(root,0,3.15,3,1.25,.7,2.6,glass);
 for(const side of [-1,1]){box(root,side*.8,3,-5.5,.2,2.3,2.4,skin);box(root,side*.85,1.38,-3.8,.75,.8,3.1,skin);}
 return root;
}
const populate=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__dogfightJetModels){
 ModernGameplay.prototype.__dogfightJetModels=true;
 ModernGameplay.prototype.populate=function(...args){
  const result=populate.apply(this,args);if(this.__dogfightJetFactory)return result;
  this.__dogfightJetFactory=true;
  const add=this.addCar;
  this.addCar=(...options)=>{
   const c=add(...options);
   if(options[5]!=='airport-interceptor'||options[4]!==false||!this.state?.car?.spec?.aircraft)return c;
   const source=this.interactiveAirport?.extras.find(actor=>actor.style==='airport-interceptor'&&actor.mesh?.visible)?.mesh;
   const fighter=source?.clone(true)||fallbackFighter();
   const old=c.mesh;this.scene.remove(old);c.mesh=fighter;this.scene.add(fighter);
   c.damageVisual=null;installVehicleDamage(c);
   this.pose(c);
   return c;
  };
  return result;
 };
}
