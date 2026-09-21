// The rooftop needs one helicopter AND one aircraft capable of vertical launch.
// Reuse the game's existing, working helicopter lift physics for a distinctive
// fixed-wing-looking VTOL. This avoids falsely assigning a runway-only plane
// to a roof that has no runway or inventing untested global flight controls.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {createSpecialVehicle} from './special-vehicles.js';
let labelMaterial=null;
function install(g){const roof=g.villaRoof;if(!roof||roof.v8Vtol)return;
 const helicopter=roof.helicopters.find(c=>c.style==='levante');
 if(!helicopter||helicopter===g.state.car)return;
 const originalMesh=helicopter.mesh,originalSpec=helicopter.spec;
 const plane=createSpecialVehicle('rondone');plane.name='Mandria · Rondone VTOL · aereo a decollo verticale';
 plane.userData.vtol=true;
 g.scene.remove(originalMesh);g.forget?.(helicopter);
 helicopter.mesh=plane;
 helicopter.name='Rondone VTOL · aereo a decollo verticale';
 // Preserve Levante's proven vertical-lift logic: aircraft=true, plane=false.
 // Adapt collision bounds to the visible wings rather than hiding a rotorcraft
 // under the aircraft mesh. Catalog Levante remains the normal helicopter.
 helicopter.spec={...originalSpec,name:helicopter.name,width:8.4,length:7.2,height:2.8,wheelbase:3,aircraft:true,plane:false};
 helicopter.estateHelipad=true;helicopter.estateVtol=true;helicopter.parked=true;helicopter.speed=0;helicopter.vy=0;
 g.scene.add(plane);g.pose(helicopter);
 roof.helicopters.splice(roof.helicopters.indexOf(helicopter),1);
 roof.v8Vtol={plane:helicopter,render:'Rondone airplane',flight:'vertical lift (existing rotorcraft dynamics)'};
 const sign=new THREE.Group();const block=new THREE.Mesh(new THREE.BoxGeometry(5.3,.08,1.1),new THREE.MeshBasicMaterial({color:0x283f45}));block.position.set(helicopter.x,roof.top+.045,helicopter.z+5.1);sign.add(block);
 labelMaterial??=new THREE.MeshBasicMaterial({color:0xf4e5bb,side:THREE.DoubleSide});
 const marking=new THREE.Mesh(new THREE.BoxGeometry(3.6,.09,.15),labelMaterial);marking.position.set(helicopter.x,roof.top+.1,helicopter.z+5.1);sign.add(marking);
 sign.name='Mandria · parcheggio Rondone VTOL';roof.root.add(sign);
}
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV8Vtol){
 ModernGameplay.prototype.__mandriaV8Vtol=true;
 ModernGameplay.prototype.populate=function(...args){if(this.villaRoof?.v8Vtol)this.villaRoof.v8Vtol=null;return oldPopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){oldUpdate.call(this,dt);
  if(this.state?.started&&this.villaRoof&&Math.hypot(this.state.x-this.villaRoof.root.position.x,this.state.z-this.villaRoof.root.position.z)<Infinity)install(this);
 };
}
