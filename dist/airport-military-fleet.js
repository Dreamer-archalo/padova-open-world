// Fictional military fleet: three new tanks, two armored vehicles and two
// military trucks. Uses the established vehicle, combat and hangar systems.
// Vehicles are parked in the EXISTING military apron; no terrain or road edits.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VEHICLES} from './vehicles.js';
import {SPECIAL_VEHICLES} from './special-vehicles.js';
import {AIRPORT,areaPoint} from './gameplay-areas.js';
import {vehicleBlocked} from './movement.js';
import {installVehicleDamage} from './vehicle-damage.js';

export const MILITARY_FLEET=Object.freeze({
 'mil-tank-scout':{name:'Militare · Saetta C1 · carro leggero',family:'military',military:true,tracked:true,width:2.85,length:6.5,height:2.7,wheelbase:3.9,accel:7.8,brake:16,max:23,boost:25,reverse:8,steer:1.08,mass:7.5,armor:.36},
 'mil-tank-heavy':{name:'Militare · Mastino M8 · carro pesante',family:'military',military:true,tracked:true,width:3.55,length:8.65,height:3.45,wheelbase:5.1,accel:3.5,brake:13,max:13,boost:15,reverse:5.5,steer:.48,mass:17,armor:.11},
 'mil-tank-fast':{name:'Militare · Falange T4 · carro rapido',family:'military',military:true,tracked:true,width:3.15,length:7.35,height:2.95,wheelbase:4.4,accel:6.4,brake:15,max:20,boost:22,reverse:7.5,steer:.84,mass:10,armor:.25},
 'mil-armored-4x4':{name:'Militare · Guardiano 4×4 · blindato',family:'military',military:true,width:2.5,length:5.8,height:2.75,wheelbase:3.35,accel:7.4,brake:18,max:32,boost:36,reverse:8,steer:.95,mass:4.5,armor:.38},
 'mil-apc-8x8':{name:'Militare · Scudo 8×8 · trasporto truppe',family:'military',military:true,width:2.95,length:7.65,height:2.95,wheelbase:5.1,accel:5.2,brake:15,max:25,boost:28,reverse:6,steer:.71,mass:9,armor:.26},
 'mil-truck-supply':{name:'Militare · Rifornimento 6×6 · camion',family:'freight',military:true,width:2.65,length:8.6,height:3.55,wheelbase:5.1,accel:4.4,brake:15,max:25,boost:28,reverse:5.5,steer:.61,mass:6,armor:.55},
 'mil-truck-carrier':{name:'Militare · Trasporto 8×8 · camion',family:'freight',military:true,width:2.8,length:11.8,height:3.85,wheelbase:7.4,accel:3.7,brake:14,max:22,boost:25,reverse:5,steer:.48,mass:9,armor:.48}
});
Object.assign(VEHICLES,MILITARY_FLEET);
Object.assign(SPECIAL_VEHICLES,MILITARY_FLEET);

// These positions are separated from runway/taxiway (u<=72), helicopter pad
// (115,-345), 3 original tanks (u139..159,v-260..-223), service lanes and
// the walls of both existing military hangars (u148..200).
export const MILITARY_PARKING=Object.freeze([
 Object.freeze({id:'mil-tank-scout',u:96,v:-311}),
 Object.freeze({id:'mil-tank-heavy',u:96,v:-270}),
 Object.freeze({id:'mil-tank-fast',u:96,v:-230}),
 Object.freeze({id:'mil-armored-4x4',u:96,v:-190}),
 Object.freeze({id:'mil-apc-8x8',u:116,v:-190}),
 Object.freeze({id:'mil-truck-supply',u:96,v:-151}),
 Object.freeze({id:'mil-truck-carrier',u:116,v:-151})
]);

// One batched mesh per hull and one per tank turret. This keeps draw calls
// bounded, produces distinct silhouettes and permits independent hangar paint.
const cube=new THREE.BoxGeometry(1,1,1);
function merged(parts){
 const positions=[],normals=[],colors=[],p=new THREE.Vector3(),n=new THREE.Vector3(),c=new THREE.Color();
 for(const [x,y,z,w,h,d,color] of parts){
  const transform=new THREE.Matrix4().makeScale(w,h,d).setPosition(x,y,z);
  const normalMatrix=new THREE.Matrix3().getNormalMatrix(transform);c.set(color);
  for(const index of cube.index.array){
   p.fromBufferAttribute(cube.attributes.position,index).applyMatrix4(transform);
   n.fromBufferAttribute(cube.attributes.normal,index).applyMatrix3(normalMatrix).normalize();
   positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);colors.push(c.r,c.g,c.b);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82}));
 mesh.castShadow=mesh.receiveShadow=true;return mesh;
}
export function militaryFleetModel(id){
 const spec=MILITARY_FLEET[id];if(!spec)throw new Error('Unknown military style '+id);
 const root=new THREE.Group(),parts=[],turret=[];
 const add=(x,y,z,w,h,d,color)=>parts.push([x,y,z,w,h,d,color]);
 const w=spec.width,l=spec.length,h=spec.height,heavy=id==='mil-tank-heavy',scout=id==='mil-tank-scout',tank=!!spec.tracked;
 const olive=heavy?'#4d5941':scout?'#687951':id==='mil-tank-fast'?'#566c48':'#596b56';
 const armor=heavy?'#6b7456':'#778467',dark='#343d35',metal='#9ca58f';
 if(tank){
  add(0,.78,0,w*.73,1.02,l*.84,olive);
  add(0,1.37,l*.02,w*.86,.55,l*.67,armor);
  // Three recognizable silhouettes: compact recon, broad heavy or tapered fast.
  if(heavy){add(0,1.36,-l*.32,w*.87,.53,l*.17,dark);for(const side of [-1,1])add(side*w*.39,1.25,0,.24,.48,l*.68,olive);}
  if(scout)add(0,1.68,l*.18,w*.48,.26,l*.2,metal);
  if(id==='mil-tank-fast')add(0,1.63,l*.30,w*.62,.28,l*.15,'#879370');
  for(const side of [-1,1]){
   add(side*w*.43,.61,0,w*.14,.86,l*.92,dark);
   add(side*w*.43,1.1,0,w*.2,.16,l*.91,olive);
   const n=scout?5:heavy?7:6;
   for(let i=0;i<n;i++)add(side*w*.435,.5,-l*.38+i*l*.76/(n-1),w*.145,.58,.42,'#505a48');
  }
  turret.push([0,.10,-.26,w*(heavy?.67:.59),heavy?.84:.63,l*(heavy?.31:.26),olive]);
  turret.push([0,.6,-.43,w*.28,.21,l*.12,armor]);
  const barrel=heavy?3.7:scout?2.35:3.15;
  turret.push([0,.18,l*.13+barrel*.37,heavy?.33:.24,.25,barrel,'#414b3e']);
  turret.push([0,.18,l*.13+barrel*.88,.42,.37,.43,'#303a31']);
  if(heavy)for(const side of [-1,1])turret.push([side*w*.27,.14,-.15,.19,.42,l*.23,armor]);
  if(scout)turret.push([w*.22,.51,-.25,.12,.37,.12,'#3c4938']);
  const t=merged(turret);t.name='turret';t.position.y=1.66;root.add(t);root.userData.turret=t;
 }else{
  const apc=id==='mil-apc-8x8',truck=id.startsWith('mil-truck-'),carrier=id==='mil-truck-carrier';
  const cabin=truck?l*.26:apc?l*.38:l*.49,front=l*.5-cabin*.5;
  add(0,.62,0,w*.82,.38,l*.94,dark);
  add(0,1.7,front,w*.86,2.0,cabin,olive);
  add(0,2.05,l*.49,w*.64,.58,.06,'#324e58');
  for(const side of [-1,1]){
   add(side*w*.44,1.78,front,.045,.53,cabin*.62,'#334d57');
   add(side*w*.38,.89,l*.49,.25,.21,.08,'#ddd7b0');
  }
  if(apc){
   add(0,1.55,-l*.14,w*.91,1.9,l*.55,olive);
   add(0,2.55,-l*.12,w*.68,.22,l*.46,armor);
   add(0,2.92,l*.05,.55,.35,.7,dark);
   for(const side of [-1,1])add(side*w*.47,1.42,-l*.13,.14,1.02,l*.43,armor);
  }else if(truck){
   const bed=l-cabin-.52,centre=-l*.5+bed*.5+.12;
   add(0,1.04,centre,w*.91,.23,bed,'#404c3e');
   if(carrier){
    for(const side of [-1,1])add(side*w*.43,1.42,centre,.12,.64,bed,armor);
    add(0,1.58,-l*.5+.14,w*.86,.53,.16,olive);
    for(let z=-l*.43;z<-1;z+=1.6)add(0,1.19,z,w*.75,.08,.08,metal);
   }else{
    add(0,2.35,centre,w*.91,2.5,bed*.94,armor);
    add(0,3.55,centre,w*.96,.18,bed,'#424c3c');
    for(const side of [-1,1])add(side*w*.47,2.55,centre,.045,.28,bed*.8,olive);
   }
  }else{
   add(0,1.17,-l*.25,w*.74,.55,l*.31,armor);
   add(0,2.7,-.15,w*.69,.14,l*.34,armor);
   add(0,2.95,-.4,.42,.32,.57,dark);
   for(const side of [-1,1])add(side*w*.45,1.3,-l*.28,.18,.78,l*.29,olive);
  }
  const count=apc||carrier?4:id==='mil-truck-supply'?3:2;
  for(const side of [-1,1])for(let i=0;i<count;i++){
   const z=-l*.37+i*l*.74/(count-1);
   add(side*w*.43,.51,z,.30,.86,.91,'#252d29');
   add(side*w*.59,.51,z,.07,.44,.48,metal);
  }
 }
 root.add(merged(parts));root.name=spec.name;root.userData.vehicleType=id;return root;
}

function installMilitaryConstructor(g){
 if(g.__militaryFleetConstructor)return;
 g.__militaryFleetConstructor=true;
 const standardAddCar=g.addCar;
 g.addCar=function(x,z,yaw=0,police=false,parked=false,style=null){
  const car=standardAddCar(x,z,yaw,police,parked,style);
  if(!style||!MILITARY_FLEET[style]||police)return car;
  const old=car.mesh;
  g.scene.remove(old);
  car.mesh=militaryFleetModel(style);
  car.style=style;car.spec=VEHICLES[style];car.name=car.spec.name;
  car.rider=null;car.damageVisual=null;
  g.scene.add(car.mesh);
  installVehicleDamage(car);
  g.pose(car);g.forget?.(car);
  return car;
 };
}

const previousPopulate=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__militaryFleetExpansion){
 ModernGameplay.prototype.__militaryFleetExpansion=true;
 ModernGameplay.prototype.populate=function(...args){
  installMilitaryConstructor(this);
  const result=previousPopulate.apply(this,args);
  if(this.militaryFleetParking?.length)return result;
  this.militaryFleetParking=[];
  for(const slot of MILITARY_PARKING){
   const spec=VEHICLES[slot.id],p=areaPoint(AIRPORT,slot.u,slot.v),yaw=AIRPORT.yaw-Math.PI/2,y=this.terrain.height(p.x,p.z);
   // Never spawn a giant collision object inside a military building.
   if(vehicleBlocked(p.x,p.z,yaw,this.collision,spec,y)||!this.terrain.dry(p.x,p.z,spec.width/2,y)){
    console.warn('Military apron slot unavailable',slot.id,slot.u,slot.v);continue;
   }
   if(this.cars.some(c=>c.mesh.visible&&Math.hypot(c.x-p.x,c.z-p.z)<(c.spec.length+spec.length)*.57)){
    console.warn('Military apron occupied',slot.id);continue;
   }
   const c=this.addCar(p.x,p.z,yaw,false,true,slot.id);
   c.y=y;c.home={...p,y,yaw,name:'Aeroporto · area militare'};
   c.fixedSpawn=true;c.parked=true;c.speed=0;c.name=spec.name+' · Area militare';
   this.pose(c);this.militaryFleetParking.push(c);
  }
  return result;
 };
}
