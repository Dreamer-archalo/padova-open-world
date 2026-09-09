import * as THREE from './vendor/three.module.js';
import {VEHICLES} from './vehicles.js';
import {clamp,pointInside} from './core.js';
import {vehicleBlocked,slideMove} from './movement.js';

export const SPECIAL_VEHICLES={
 tank:{name:'Bastione · carro cingolato',width:3.25,length:7.8,height:3.1,wheelbase:4.5,accel:4.7,brake:14,max:16,boost:16,reverse:7,steer:.65,mass:12,armor:.18,tracked:true},
 libellula:{name:'Libellula · aereo leggero',width:9.2,length:7.8,height:2.8,wheelbase:3.1,accel:7,brake:8,max:76,boost:76,reverse:3,steer:.6,aircraft:true,plane:true},
 portavalori:{name:'Portavalori · Fortezza',width:2.55,length:6,height:3,wheelbase:3.6,accel:12,brake:24,max:46,boost:50,reverse:8,steer:1.2,mass:3.5,armor:.35}
};
Object.assign(VEHICLES,SPECIAL_VEHICLES);
const cube=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.77}),templates=new Map();
function batch(parts){const p=[],n=[],c=[],v=new THREE.Vector3(),normal=new THREE.Vector3();for(const [x,y,z,w,h,d,color] of parts){const m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion(),new THREE.Vector3(w,h,d)),nm=new THREE.Matrix3().getNormalMatrix(m),col=new THREE.Color(color);for(const i of cube.index.array){v.fromBufferAttribute(cube.attributes.position,i).applyMatrix4(m);normal.fromBufferAttribute(cube.attributes.normal,i).applyMatrix3(nm).normalize();p.push(v.x,v.y,v.z);n.push(normal.x,normal.y,normal.z);c.push(col.r,col.g,col.b);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));const mesh=new THREE.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;return mesh;
}
function template(style){const g=new THREE.Group(),parts=[];
 if(style==='tank'){
  parts.push([0,1,0,2.7,1.1,5.3,'#63734c'],[0,1.65,.1,2.5,.45,4.1,'#768157']);
  for(const x of [-1.4,1.4]){parts.push([x,.66,0,.46,1.02,5.5,'#343c31'],[x,1.18,0,.65,.17,5.7,'#758059']);for(let z=-2;z<=2;z+=.8)parts.push([x,.66,z,.48,.65,.58,'#586045']);}
  const turret=batch([[0,.3,-.15,1.95,.65,2,'#526642'],[0,.75,-.3,.7,.22,.7,'#6c7d52'],[0,.3,2.25,.23,.23,3.2,'#47563b'],[0,.3,3.83,.36,.36,.35,'#394733']]);turret.position.y=1.9;turret.name='turret';g.add(turret);
 }else if(style==='libellula'){
  parts.push([0,1.05,0,1.3,1.2,5.4,'#e5d9b5'],[0,1.7,.3,1.05,.6,1.7,'#3e6979'],[0,1.12,.1,9,.17,1.5,'#d8ceb3'],[0,.85,-2.8,.5,.6,2.3,'#b89c73'],[0,1.0,-3,3.5,.13,.9,'#cfb67c'],[0,1.6,-3.05,.15,1.6,1,'#738d92']);
  for(const x of [-.8,.8])parts.push([x,.35,.6,.25,.65,.6,'#303938']);parts.push([0,.2,-2.8,.2,.35,.4,'#303938']);
  const prop=batch([[0,0,0,.12,2.7,.1,'#464f4e']]);prop.name='propeller';prop.position.set(0,1.15,2.8);g.add(prop);
 }else{
  parts.push([0,.6,0,2.3,.6,5.8,'#3f4846'],[0,1.5,1.65,2.25,1.9,2.1,'#5f827c'],[0,1.85,-.9,2.45,2.25,3.6,'#7c9690'],[0,2.0,2.72,1.9,.65,.06,'#304e5b'],[0,1.8,-2.72,1.5,.8,.08,'#d0c5a3']);
  for(const x of [-1.15,1.15])for(const z of [-1.8,1.7])parts.push([x,.5,z,.32,.86,.9,'#283532']);
  for(const x of [-.85,.85])parts.push([x,1.05,2.73,.35,.22,.08,'#faf0bb']);
 }
 g.add(batch(parts));return g;
}
export function createSpecialVehicle(style){if(!templates.has(style))templates.set(style,template(style));const g=templates.get(style).clone(true);g.userData.turret=g.getObjectByName('turret');g.userData.propeller=g.getObjectByName('propeller');return g;}
export function createParachute(){const g=new THREE.Group(),parts=[[0,5,0,6,.35,3.2,'#cf9d51']];for(const x of [-2.4,2.4])for(const z of [-1.1,1.1])parts.push([x/2,3.5,z/2,.035,3,.035,'#e3ded0']);g.add(batch(parts));g.visible=false;return g;}
export function footSurface(x,z,referenceY,terrain,collision){let height=terrain.height(x,z,referenceY);for(const b of collision.near(x,z,.5)){const top=(b.minY||0)+b.h;if(top<=height||referenceY<top-.25)continue;if([[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3]].every(([dx,dz])=>pointInside(x+dx,z+dz,b.p)))height=top;}return height;}
export function planeStep(actor,input,dt,terrain,collision){
 const spec=actor.spec||actor.car.spec,ground=terrain.height(actor.x,actor.z,actor.y),airborne=actor.y>ground+.3;
 actor.speed=clamp(actor.speed+(input.forward>0?spec.accel:input.forward<0?-spec.brake:-.15)*dt,0,spec.max);
 const turning=airborne?clamp(actor.speed/30,.2,1):clamp(actor.speed/5,0,1);
 actor.yaw+=input.turn*spec.steer*turning*dt;
 const lift=actor.speed>=20?(input.up?9:input.down?-5:0):-7;
 actor.vy=(actor.vy||0)+(lift-(actor.vy||0))*(1-Math.exp(-2.5*dt));
 let ny=clamp(actor.y+actor.vy*dt,ground,terrain.elevation(actor.x,actor.z)+300),crashed=false;
 const steps=Math.max(1,Math.ceil(actor.speed*dt/.5));
 for(let i=0;i<steps;i++){const x=clamp(actor.x+Math.sin(actor.yaw)*actor.speed*dt/steps,-5950,7230),z=clamp(actor.z+Math.cos(actor.yaw)*actor.speed*dt/steps,-6460,6210),base=terrain.height(x,z,ny);
  if(vehicleBlocked(x,z,actor.yaw,collision,spec,Math.min(actor.y,ny))||ny<base-.25||!terrain.dry(x,z,2,ny)&&ny<terrain.waterHeight(x,z)+2){crashed=actor.speed>12||airborne;actor.speed=0;break;}actor.x=x;actor.z=z;
 }
 if(vehicleBlocked(actor.x,actor.z,actor.yaw,collision,spec,ny)){crashed=true;ny=actor.y;}
 if(ny<=ground+.01){if(airborne&&actor.vy<-6)crashed=true;actor.vy=0;}actor.y=ny;return {crashed};
}
export function parachuteStep(actor,input,dt,terrain,collision){
 actor.yaw+=input.turn*1.2*dt;actor.speed=input.forward<0?3:input.forward>0?12:7;
 const next=slideMove(actor,Math.sin(actor.yaw)*actor.speed*dt,Math.cos(actor.yaw)*actor.speed*dt,.4,collision,actor.y);actor.x=clamp(next.x,-5950,7230);actor.z=clamp(next.z,-6460,6210);
 actor.vy=-4;const ground=footSurface(actor.x,actor.z,actor.y,terrain,collision);actor.y=Math.max(ground,actor.y-4*dt);return actor.y<=ground+.01;
}
