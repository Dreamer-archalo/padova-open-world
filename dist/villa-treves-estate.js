// Single fictional Mandria estate: lazily instantiated, culled visual detailing.
// Structural garage colliders live in villa-treves-layout.js, never in these ornaments.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA} from './gameplay-areas.js';

const cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(.095,.15,1,8);
const sphere=new THREE.SphereGeometry(1,10,8),materials=new Map();
function mat(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.78}));return materials.get(color);}
function box(g,x,y,z,w,h,d,color){
 const m=new THREE.Mesh(cube,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);
 m.castShadow=false;m.receiveShadow=false;g.add(m);return m;
}
function lamp(g,x,z){
 const pole=new THREE.Mesh(cylinder,mat('#505653'));pole.scale.set(1,3,1);pole.position.set(x,1.5,z);g.add(pole);
 box(g,x,3.08,z,.64,.18,.64,'#3e4c47');
 const light=new THREE.Mesh(sphere,mat('#f4deb0'));light.position.set(x,3.34,z);light.scale.set(.27,.31,.27);g.add(light);
 box(g,x,3.61,z,.75,.13,.75,'#4a4f4a');
}
function buildEstate(g){
 const root=new THREE.Group();root.name='Villa della Mandria · architettura, giardino e rimessa';
 root.position.set(VILLA.x,g.terrain.height(VILLA.x,VILLA.z),VILLA.z);root.rotation.y=VILLA.yaw;
 // The fictional mansion, garage and perimeter already have real world colliders.
 // This set only adds visual facade details, not ghost walls in the driveway.
 box(root,0,13.25,-7.78,45,.48,1.05,'#f1dfb9');
 box(root,0,12.58,-7.84,44,.26,.9,'#9e8468');
 for(const u of [-17,-10,10,17]){
  box(root,u,7.0,-7.77,3.25,4.1,.22,'#37535d');
  box(root,u,7,-7.60,.19,4.1,.25,'#dbc9ac');
  box(root,u,7,-7.59,3.27,.16,.25,'#dbc9ac');
  box(root,u,9.2,-7.62,3.62,.22,.4,'#f1dfb9');
 }
 box(root,0,3.2,-7.67,3.8,6.15,.22,'#544c3d');
 box(root,0,6.25,-7.58,4.5,.34,.44,'#f3e5c5');
 for(const u of [-18,-12,-6,0,6,12,18]){
  box(root,u,.22,-3,1.6,.4,1.6,'#e8d6b1');
  box(root,u,7.55,-3,1.62,.44,1.6,'#e8d6b1');
 }
 // Two pitched roof planes replace the box-like silhouette at eye level.
 for(const side of [-1,1]){
  const tile=box(root,side*11,15.2,-19,23,.65,23.6,'#91573f');
  tile.rotation.z=-side*.215;
 }
 for(const u of [-29,29]){
  box(root,u,9.6,-10,15.2,.55,37,'#945c42');
  box(root,u,9.06,8.12,14.5,.35,.48,'#f0dfbf');
  for(const x of [u-4.25,u+4.25]){
   box(root,x,5.1,8.13,2.65,3.75,.2,'#375764');
   box(root,x,3.3,8.30,3.08,.24,.44,'#e7d4ac');
  }
 }
 // Fronton at the open colonnade: a flat gable, no invisible collision plane.
 const pediment=new THREE.BufferGeometry();
 pediment.setAttribute('position',new THREE.Float32BufferAttribute([-20.2,8.03,1.08,20.2,8.03,1.08,0,12.25,1.08],3));
 pediment.computeVertexNormals();
 root.add(new THREE.Mesh(pediment,new THREE.MeshStandardMaterial({color:'#e1cca8',side:THREE.DoubleSide,roughness:.95})));
 box(root,0,8.04,1.13,42,.38,.65,'#f1dfbf');
 // The existing basin is at (-27,29), off the central 10 m drive corridor.
 const fountain=new THREE.Group();fountain.position.set(-27,.22,29);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(2.6,.19,6,32),mat('#d9ccab'));
 rim.rotation.x=-Math.PI/2;fountain.add(rim);
 for(let j=0;j<6;j++){
  const a=j*Math.PI/3,points=[];
  for(let i=0;i<=12;i++){
   const t=i/12;points.push(new THREE.Vector3(Math.cos(a)*2.3*t,1.55+1.3*Math.sin(Math.PI*t)-1.45*t,Math.sin(a)*2.3*t));
  }
  fountain.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
   new THREE.LineBasicMaterial({color:'#9cdae2',transparent:true,opacity:.82})));
 }
 root.add(fountain);
 for(const u of [-36,36])for(const v of [9,43])lamp(root,u,v);
 for(const u of [-35,-30,-25]){
  box(root,u,.24,41,2.2,.42,2.5,'#3d6747');
  box(root,u,.58,41,1.5,.12,1.5,'#bd8a63');
 }
 // Garage signage and roof trim: west entrance is entirely open.
 box(root,30,5.43,26,18.5,.25,26.5,'#414d44');
 box(root,21.48,4.69,26,.16,.54,8.3,'#dbbd86');
 box(root,30,5.58,26,17,.15,24,'#9d674a');
 root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
 g.scene.add(root);
 return {root,fountain};
}
export function villaEstateUpdate(g,dt){
 if(!g?.state?.started||!g.terrain?.modern||!Number.isFinite(dt)||dt<=0)return;
 const distance=Math.hypot(g.state.x-VILLA.x,g.state.z-VILLA.z);
 if(distance>430){if(g.villaEstate)g.villaEstate.root.visible=false;return;}
 if(!g.villaEstate){
  if(distance>260||!g.terrain.gameplayPatches?.length)return;
  g.villaEstate=buildEstate(g);
 }
 const estate=g.villaEstate;estate.root.visible=true;
 // Fountain motion stays extremely cheap; no extra collision or shadow passes.
 estate.fountain.rotation.y+=Math.min(dt,.05)*.16;
 if(!g.villaTrevesWelcome&&distance<68){
  g.villaTrevesWelcome=true;
  g.toast?.('VILLA DELLA MANDRIA · Rimessa a destra, giardino e fontana a sinistra.',4);
 }
}
const previousPopulate=ModernGameplay.prototype.populate,previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__villaTrevesEstatePhase1){
 ModernGameplay.prototype.__villaTrevesEstatePhase1=true;
 ModernGameplay.prototype.populate=function(...args){
  if(this.villaEstate){this.scene.remove(this.villaEstate.root);this.villaEstate=null;}
  this.villaTrevesWelcome=false;
  return previousPopulate.apply(this,args);
 };
 ModernGameplay.prototype.update=function(dt){
  previousUpdate.call(this,dt);
  villaEstateUpdate(this,dt);
 };
}
