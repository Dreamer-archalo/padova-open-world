import {vehicleFootprint,polygonsOverlap} from './movement.js';
import * as THREE from './vendor/three.module.js';

// Arcade handling, SI units; dimensions include mirrors/bumper clearance.
export const VEHICLES={
  cinquecento:{name:'Cinquecento Turbo',width:1.9,length:3.6,height:1.55,wheelbase:2.3,accel:10,brake:23,max:38,boost:48,reverse:8,steer:1.2,turboAccel:65,turboMax:110,critical:97.22},
  mito:{name:'Milano 955 · MiTo inspired',width:2.0,length:4.08,height:1.46,wheelbase:2.51,accel:10.2,brake:20,max:39,boost:48,reverse:8,steer:1.15},
  motorcycle:{name:'Euganea 650 · Motorcycle',width:.98,length:2.2,height:1.3,wheelbase:1.45,accel:14,brake:22,max:43,boost:53,reverse:3,steer:1.65},
  scooter:{name:'Portello 125 · Scooter',width:.82,length:1.9,height:1.3,wheelbase:1.3,accel:7,brake:16,max:24,boost:29,reverse:2,steer:1.85},
  truck:{name:'Brenta Cargo · Truck',width:2.68,length:7.2,height:3.5,wheelbase:4.2,accel:4.3,brake:12,max:24,boost:29,reverse:5,steer:.62},
  sedan:{name:'Berlina 84',width:1.92,length:4.22,height:1.7,wheelbase:2.54,accel:9.5,brake:19,max:37,boost:47,reverse:9,steer:1.08},
  sport:{name:'Riviera GT',width:1.98,length:4.55,height:1.5,wheelbase:2.74,accel:12,brake:21,max:43,boost:53,reverse:9,steer:1.1},
  compact:{name:'Centro Compact',width:1.8,length:3.72,height:1.7,wheelbase:2.24,accel:8,brake:18,max:32,boost:40,reverse:8,steer:1.25},
  wagon:{name:'Laguna Wagon',width:1.92,length:4.22,height:1.75,wheelbase:2.54,accel:8.5,brake:18,max:35,boost:43,reverse:8,steer:1},
  utility:{name:'Euganea Utility',width:2,length:4.64,height:1.95,wheelbase:2.8,accel:7.2,brake:17,max:31,boost:38,reverse:7,steer:.9}
};
export const isBike=type=>type==='motorcycle'||type==='scooter';
const cache=new Map();const material=color=>{if(!cache.has(color))cache.set(color,new THREE.MeshStandardMaterial({color,roughness:.55}));return cache.get(color);};
const cube=new THREE.BoxGeometry(),sphere=new THREE.SphereGeometry(1,12,8),cylinder=new THREE.CylinderGeometry(1,1,1,16);
function mesh(g,geo,color,x,y,z,w,h,d){const o=new THREE.Mesh(geo,material(color));o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
const box=(g,c,x,y,z,w,h,d)=>mesh(g,cube,c,x,y,z,w,h,d);
function wheel(g,x,z,r=.31,y=r,width=.19){mesh(g,cylinder,'#202527',x,y,z,r,width,r).rotation.z=Math.PI/2;mesh(g,cylinder,'#bcc2c2',x+(x<0?-.01:.01),y,z,r*.61,width+.012,r*.61).rotation.z=Math.PI/2;mesh(g,cylinder,'#353c40',x,y,z,r*.2,width+.024,r*.2).rotation.z=Math.PI/2;}
function body(g,color,sections){const p=[];for(let i=1;i<sections.length;i++){const [za,wa,ya,ha]=sections[i-1],[zb,wb,yb,hb]=sections[i],a=[[-wa,ya,za],[wa,ya,za],[wa*.88,ya+ha,za],[-wa*.88,ya+ha,za]],b=[[-wb,yb,zb],[wb,yb,zb],[wb*.88,yb+hb,zb],[-wb*.88,yb+hb,zb]];for(let j=0;j<4;j++){const k=(j+1)%4;p.push(...a[j],...b[j],...b[k],...a[j],...b[k],...a[k]);}if(i===1)p.push(...a[0],...a[1],...a[2],...a[0],...a[2],...a[3]);if(i===sections.length-1)p.push(...b[2],...b[1],...b[0],...b[3],...b[2],...b[0]);}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.computeVertexNormals();const m=new THREE.Mesh(geometry,material(color));m.material.side=THREE.DoubleSide;g.add(m);}
export function createVehicle(type,color){const g=new THREE.Group();
 if(type==='mito'||type==='cinquecento'){
  body(g,color,[[-2.03,.68,.4,.43],[-1.65,.86,.39,.55],[.95,.86,.4,.52],[1.76,.76,.43,.37],[2.03,.60,.43,.30]]);
  body(g,color,[[-1.56,.70,.9,.13],[-1.1,.72,.92,.5],[.37,.68,.92,.52],[1.04,.68,.91,.03]]);
  const windshield=box(g,'#304951',0,1.21,.69,1.27,.55,.035);windshield.rotation.x=.88;
  const rear=box(g,'#304951',0,1.17,-1.34,1.26,.42,.035);rear.rotation.x=-.68;
  for(const side of [-1,1]){box(g,'#344e56',side*.685,1.21,-.29,.025,.34,1.28);box(g,color,side*.713,1.2,-.64,.03,.41,.07);box(g,'#bbc1ba',side*.845,.91,-.2,.022,.045,.17);box(g,color,side*.91,1.03,.62,.16,.12,.25);
    for(const z of [-1.19,1.32])wheel(g,side*.79,z);
    mesh(g,sphere,'#e9f0d8',side*.59,.89,1.69,.17,.25,.08).rotation.x=.48;
    mesh(g,cylinder,'#941f24',side*.58,.85,-1.98,.17,.045,.17).rotation.x=Math.PI/2;
    mesh(g,cylinder,'#e6534a',side*.58,.85,-2.008,.105,.015,.105).rotation.x=Math.PI/2;
  }
  const shape=new THREE.Shape();shape.moveTo(-.23,0);shape.lineTo(.23,0);shape.lineTo(0,-.44);shape.closePath();const grille=new THREE.Mesh(new THREE.ShapeGeometry(shape),material('#20292d'));grille.position.set(0,.88,2.035);if(type==='mito')g.add(grille);else{box(g,'#d3d6c9',0,.77,2.035,.86,.06,.02);mesh(g,sphere,'#fff2c8',-.55,.89,1.84,.20,.20,.09);mesh(g,sphere,'#fff2c8',.55,.89,1.84,.20,.20,.09);box(g,'#e5e0cc',0,1.46,-.36,1.2,.06,1.1);g.scale.set(.93,1.055,.875);}
  box(g,'#303b3c',-.43,.52,1.96,.3,.12,.08);box(g,'#303b3c',.43,.52,1.96,.3,.12,.08);
  box(g,'#ede7cf',-.43,.68,2.00,.28,.11,.02);
 }else if(type==='truck'){
  box(g,'#313b3e',0,.67,0,2.05,.33,6.8);box(g,color,0,1.55,2.40,2.30,1.98,2.1);box(g,'#ece7d8',0,2.12,-1.08,2.40,2.7,4.84);
  box(g,'#314b56',0,2.10,3.47,2.03,.78,.04);box(g,'#313b40',0,1.12,3.48,1.32,.38,.04);box(g,'#b2b4a6',0,.72,3.52,2.3,.17,.13);
  for(const s of [-1,1]){box(g,'#304b54',s*1.16,2.1,2.43,.03,.77,1.47);box(g,'#26353a',s*1.26,1.96,3.05,.12,.43,.23);box(g,'#fff4c2',s*.88,1.07,3.5,.3,.22,.04);box(g,'#c34d3e',s*.91,.85,-3.53,.31,.17,.04);for(const z of [-2.44,-1.48,2.23])wheel(g,s*1.02,z,.47,.49,.30);box(g,'#a9ada7',s*1.211,1.00,-1.06,.028,.10,4.8);}
  for(let x=-.9;x<=.91;x+=.45)box(g,'#c0c3bb',x,2.1,-3.51,.035,2.4,.035);box(g,'#89928d',0,2.1,-3.54,.035,2.4,.03);
 }else if(isBike(type)){
  const scooter=type==='scooter',base=scooter?.65:.73;
  for(const z of [-base,base])wheel(g,0,z,scooter?.24:.32,scooter?.27:.34,.16);
  box(g,'#333c40',0,.48,-.05,.3,.17,1.35);mesh(g,sphere,color,0,.79,.13,.24,.22,.39);box(g,'#202c30',0,.86,-.34,.42,.13,.68);
  for(const s of [-1,1]){const fork=box(g,'#b6bcba',s*.11,.60,base-.1,.035,.69,.035);fork.rotation.x=-.23;box(g,'#6d7779',s*.28,.47,-.49,.1,.1,.68);box(g,'#26353a',s*.39,1.16,.51,.17,.065,.07);box(g,'#71868b',s*.38,1.35,.49,.15,.11,.04);}
  box(g,'#a7b4b5',0,1.14,.5,.74,.045,.05);mesh(g,sphere,'#fff3c7',0,.99,.69,.16,.13,.065);box(g,'#d84636',0,.81,-.91,.16,.08,.04);
  if(scooter){mesh(g,sphere,color,0,.71,.49,.32,.43,.145);box(g,color,0,.39,-.05,.58,.07,.9);mesh(g,sphere,color,0,.55,-.56,.35,.35,.43);mesh(g,sphere,color,0,.43,.68,.25,.16,.34);box(g,'#20292d',0,.93,-.36,.51,.16,.78);box(g,'#ced7cf',0,.92,.64,.06,.17,.03);}else box(g,'#525956',0,.57,.02,.38,.33,.46);
 }
 if(type==='scooter')g.scale.x=.85;g.userData.vehicleType=type;return g;
}
export function createRider(){const g=new THREE.Group();box(g,'#384c5d',0,1.14,-.2,.48,.53,.3).rotation.x=.28;mesh(g,sphere,'#eee6d5',0,1.59,-.06,.20,.23,.21);box(g,'#273d46',0,1.6,.12,.32,.10,.045);for(const s of [-1,1]){box(g,'#313b46',s*.26,.76,-.13,.16,.43,.20).rotation.x=-.65;box(g,'#384c5d',s*.27,1.12,.19,.15,.15,.65).rotation.x=-.23;}return g;}

export function vehiclesOverlap(a,b){const sa=VEHICLES[a.style],sb=VEHICLES[b.style];return polygonsOverlap(vehicleFootprint(a.x,a.z,a.yaw,sa.width,sa.length),vehicleFootprint(b.x,b.z,b.yaw,sb.width,sb.length));}
