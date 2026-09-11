import * as THREE from './vendor/three.module.js';
import {VEHICLES} from './vehicles.js';
import {clamp,pointInside} from './core.js';
import {vehicleBlocked,slideMove} from './movement.js';

export const SPECIAL_VEHICLES={
 falco:{name:'Falco · elicottero scout',width:2.5,length:6.6,height:3,wheelbase:2.6,max:55,boost:55,reverse:18,accel:10,brake:10,steer:1.25,aircraft:true},
 levante:{name:'Levante · elicottero utility',width:3.2,length:10,height:3.7,wheelbase:4,max:45,boost:45,reverse:14,accel:7,brake:9,steer:.85,aircraft:true},
 rondone:{name:'Rondone · sportivo ad ala bassa',width:8.4,length:7.2,height:2.6,wheelbase:3,accel:8.5,brake:10,max:90,boost:90,reverse:3,steer:.8,aircraft:true,plane:true},
 albatros:{name:'Albatros · bimotore',width:13.2,length:10.4,height:3.4,wheelbase:4.1,accel:6.5,brake:10,max:96,boost:96,reverse:3,steer:.5,aircraft:true,plane:true},
 tank:{name:'Bastione · carro cingolato',width:3.25,length:7.8,height:3.1,wheelbase:4.5,accel:4.7,brake:14,max:16,boost:16,reverse:7,steer:.65,mass:12,armor:.18,tracked:true},
 libellula:{name:'Libellula · aereo leggero',width:9.2,length:7.8,height:2.8,wheelbase:3.1,accel:7,brake:8,max:76,boost:76,reverse:3,steer:.6,aircraft:true,plane:true},
 portavalori:{name:'Portavalori · Fortezza',width:2.55,length:6,height:3,wheelbase:3.6,accel:12,brake:24,max:46,boost:50,reverse:8,steer:1.2,mass:3.5,armor:.35}
};
export const EXTRA_TRAFFIC={
 tir:{name:'Cargo 16 · autoarticolato',family:'freight',width:2.55,length:16.2,height:3.9,wheelbase:10,accel:4,brake:16,max:29,boost:31,reverse:5,steer:.4,mass:6,armor:.55,npcOnly:true},
 autotreno:{name:'Cargo Duo · due rimorchi',family:'freight',width:2.55,length:22.6,height:3.9,wheelbase:15,accel:3.4,brake:15,max:26,boost:28,reverse:4,steer:.3,mass:8,armor:.45,npcOnly:true},
 cantiere:{name:'Cava · ribaltabile',family:'work',width:2.5,length:7.6,height:3.3,wheelbase:4.7,accel:4.5,brake:18,max:24,boost:27,reverse:6,steer:.7,mass:4,npcOnly:true},
 betoniera:{name:'Impasto · betoniera',family:'work',width:2.5,length:8.2,height:3.8,wheelbase:5,accel:4,brake:18,max:24,boost:26,reverse:6,steer:.65,mass:5,npcOnly:true},
 soccorso:{name:'Recupero · carro attrezzi',family:'work',width:2.3,length:6.8,height:2.9,wheelbase:4.2,accel:6,brake:20,max:31,boost:34,reverse:7,steer:.85,mass:3,npcOnly:true},
 trail:{name:'Sentiero · moto trail',family:'motorcycle',width:.86,length:2.25,height:1.55,wheelbase:1.53,accel:14,brake:24,max:43,boost:49,reverse:4,steer:1.6,mass:.6,npcOnly:true,bike:true},
 cruiser:{name:'Notturna · moto cruiser',family:'motorcycle',width:.97,length:2.55,height:1.28,wheelbase:1.8,accel:12,brake:22,max:46,boost:51,reverse:4,steer:1.25,mass:.8,npcOnly:true,bike:true}
};
Object.assign(SPECIAL_VEHICLES,EXTRA_TRAFFIC);Object.assign(VEHICLES,SPECIAL_VEHICLES);
const cube=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.77}),templates=new Map();
function batch(parts){const p=[],n=[],c=[],v=new THREE.Vector3(),normal=new THREE.Vector3();for(const [x,y,z,w,h,d,color] of parts){const m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion(),new THREE.Vector3(w,h,d)),nm=new THREE.Matrix3().getNormalMatrix(m),col=new THREE.Color(color);for(const i of cube.index.array){v.fromBufferAttribute(cube.attributes.position,i).applyMatrix4(m);normal.fromBufferAttribute(cube.attributes.normal,i).applyMatrix3(nm).normalize();p.push(v.x,v.y,v.z);n.push(normal.x,normal.y,normal.z);c.push(col.r,col.g,col.b);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));const mesh=new THREE.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;return mesh;
}
function template(style){const g=new THREE.Group(),parts=[];
 if(style==='tank'){
  parts.push([0,1,0,2.7,1.1,5.3,'#63734c'],[0,1.65,.1,2.5,.45,4.1,'#768157']);
  for(const x of [-1.4,1.4]){parts.push([x,.66,0,.46,1.02,5.5,'#343c31'],[x,1.18,0,.65,.17,5.7,'#758059']);for(let z=-2;z<=2;z+=.8)parts.push([x,.66,z,.48,.65,.58,'#586045']);}
  const turret=batch([[0,.3,-.15,1.95,.65,2,'#526642'],[0,.75,-.3,.7,.22,.7,'#6c7d52'],[0,.3,2.25,.23,.23,3.2,'#47563b'],[0,.3,3.83,.36,.36,.35,'#394733']]);turret.position.y=1.9;turret.name='turret';g.add(turret);
 }else if(SPECIAL_VEHICLES[style]?.aircraft&&!SPECIAL_VEHICLES[style].plane){
  const utility=style==='levante',w=utility?2.9:2.2,l=utility?4.8:3.2,tail=utility?-4.1:-2.9,c=utility?'#69765a':'#d39149';
  parts.push([0,1.6,.65,w,1.55,l,c],[0,1.95,l/2+.25,w*.88,.85,.5,'#375566'],[0,1.7,tail*.62,.36,.38,Math.abs(tail)*1.15,c],[0,2.2,tail,.18,1.55,.8,c]);
  for(const x of [-w/2,w/2]){parts.push([x,.18,.4,.13,.18,l+.4,'#344342']);for(const z of [-.8,1.3])parts.push([x,.62,z,.12,1,.12,'#728179']);}
  if(utility)for(const x of [-1.47,1.47])parts.push([x,1.7,.2,.03,.65,2.4,'#304a51']);
  const rotor=new THREE.Group();rotor.position.y=utility?3.15:2.85;rotor.add(batch([[0,0,0,utility?11:8,.07,.25,'#303a3c'],[0,0,0,.25,.07,utility?11:8,'#303a3c']]));rotor.name='rotor';g.add(rotor);
  const tailRotor=new THREE.Group();tailRotor.position.set(.28,2,tail);tailRotor.add(batch([[0,0,0,.08,1.45,.13,'#354348'],[0,0,0,.08,.13,1.45,'#354348']]));tailRotor.name='tailRotor';g.add(tailRotor);
 }else if(style==='rondone'||style==='albatros'){
  const twin=style==='albatros',w=twin?13.1:8.3,l=twin?9.8:6.8,c=twin?'#d7ddd5':'#b64a42';
  parts.push([0,1.35,0,twin?1.7:1.2,1.35,l*.76,c],[0,2,.8,twin?1.4:1,.65,1.6,'#3b626f'],[0,.95,.1,w,.18,twin?2:1.45,c],[0,1.15,-l*.37,.5,.65,l*.25,c],[0,1.23,-l*.4,w*.34,.15,1.1,c],[0,2,-l*.4,.18,1.9,1.15,'#668898']);
  for(const x of [-.9,.9])parts.push([x,.4,1,.25,.7,.55,'#283536']);parts.push([0,.25,-l*.33,.2,.4,.4,'#283536']);
  const prop=new THREE.Group();prop.name='propeller';prop.position.set(0,1.4,0);
  for(const x of twin?[-2.6,2.6]:[0]){const z=twin?1.7:l*.4;parts.push([x,1.25,z-.4,twin?.8:.6,.65,1.4,'#596d76']);const rotor=new THREE.Group();rotor.name='engine-prop';rotor.position.set(x,0,z);rotor.add(batch([[0,0,0,.1,2.6,.1,'#354246']]));prop.add(rotor);}
  g.add(prop);
 }else if(style==='libellula'){
  parts.push([0,1.05,0,1.3,1.2,5.4,'#e5d9b5'],[0,1.7,.3,1.05,.6,1.7,'#3e6979'],[0,1.12,.1,9,.17,1.5,'#d8ceb3'],[0,.85,-2.8,.5,.6,2.3,'#b89c73'],[0,1.0,-3,3.5,.13,.9,'#cfb67c'],[0,1.6,-3.05,.15,1.6,1,'#738d92']);
  for(const x of [-.8,.8])parts.push([x,.35,.6,.25,.65,.6,'#303938']);parts.push([0,.2,-2.8,.2,.35,.4,'#303938']);
  const prop=batch([[0,0,0,.12,2.7,.1,'#464f4e']]);prop.name='propeller';prop.position.set(0,1.15,2.8);g.add(prop);
 }else if(EXTRA_TRAFFIC[style]){
  const spec=EXTRA_TRAFFIC[style],l=spec.length;
  if(spec.bike){const c=style==='trail'?'#cdb269':'#353f50';parts.push([0,.62,0,.4,.28,l*.6,c],[0,.92,.13,.5,.38,.65,c],[0,1.0,-.42,.47,.1,.6,'#242d32'],[0,1.18,l*.32,.82,.09,.1,'#939e9a']);for(const z of [-spec.wheelbase/2,spec.wheelbase/2])parts.push([0,.35,z,.17,.65,.65,'#263032']);}
  else{const front=l/2-1.5,color=spec.family==='work'?'#c69b48':'#677f8f';parts.push([0,.6,0,2.35,.45,l-.35,'#35403e'],[0,1.8,front,2.35,2.2,2.6,color],[0,2.3,l/2-.17,2.02,.7,.05,'#304e5b']);
   if(spec.family==='freight'){const count=style==='autotreno'?2:1,span=(l-3.4)/count;for(let i=0;i<count;i++){const centre=l/2-3.4-span*(i+.5);parts.push([0,2.4,centre,2.5,2.65,span-.45,i%2?'#abb8af':'#c1c7bf']);for(const z of [centre-span*.29,centre-span*.12])for(const x of [-1.16,1.16])parts.push([x,.48,z,.33,.9,.8,'#293532']);}}
   else if(style==='betoniera'){parts.push([0,2.35,-1,2.1,2.25,3.8,'#ddd3a7'],[0,3.45,-1,1.3,.3,3.1,'#adb2a6'],[0,1.6,-l/2+.35,.6,.4,.7,'#6e766b']);}
   else if(style==='soccorso'){parts.push([0,.99,-1.3,2.2,.22,3.5,'#707c7a'],[0,1.85,-2.2,.25,1.5,.3,'#bf8e39'],[0,2.45,-2.65,.25,.25,1.2,'#b58c41']);}
   else{parts.push([0,1.2,-1.2,2.3,.25,4.1,'#777d60']);for(const x of [-1.1,1.1])parts.push([x,2,-1.2,.16,1.5,4.1,color]);parts.push([0,2,-3.2,2.3,1.5,.14,color]);}
   for(const x of [-1.15,1.15])for(const z of [front,-l/2+1.1])parts.push([x,.48,z,.33,.9,.85,'#293532']);for(const x of [-.83,.83])parts.push([x,1.1,l/2-.15,.32,.2,.08,'#fff0bf']);}
 }else{
  parts.push([0,.6,0,2.3,.6,5.8,'#3f4846'],[0,1.5,1.65,2.25,1.9,2.1,'#5f827c'],[0,1.85,-.9,2.45,2.25,3.6,'#7c9690'],[0,2.0,2.72,1.9,.65,.06,'#304e5b'],[0,1.8,-2.72,1.5,.8,.08,'#d0c5a3']);
  for(const x of [-1.15,1.15])for(const z of [-1.8,1.7])parts.push([x,.5,z,.32,.86,.9,'#283532']);
  for(const x of [-.85,.85])parts.push([x,1.05,2.73,.35,.22,.08,'#faf0bb']);
 }
 g.add(batch(parts));return g;
}
export function createSpecialVehicle(style){if(!templates.has(style))templates.set(style,template(style));const g=templates.get(style).clone(true);g.userData.turret=g.getObjectByName('turret');g.userData.propeller=g.getObjectByName('propeller');g.userData.rotor=g.getObjectByName('rotor');g.userData.tailRotor=g.getObjectByName('tailRotor');return g;}
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
