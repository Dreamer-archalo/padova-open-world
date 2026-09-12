import {createWedgeCar} from './sport-models.js';
import {EXTRA_TRAFFIC} from './special-vehicles.js';
import * as THREE from './vendor/three.module.js';
import {VEHICLES} from './vehicles.js';

// Original silhouettes: dimensions, roof span, ride height and trim define families.
// This module is imported only by the 2026 controller, never by Padova 1500.
const catalogue=[
 ['nido','Nido Mini','city',1.65,3.1,1.5,29],['tessera','Tessera E','city',1.72,3.45,1.58,32],
 ['rondine','Rondine','compact',1.8,3.8,1.48,35],['botanica','Botanica Hybrid','compact',1.83,4.0,1.52,36],
 ['porto','Porto 80','classic',1.75,4.15,1.4,31],['ambra','Ambra 72','classic',1.82,4.4,1.44,32],
 ['argine','Argine','sedan',1.9,4.7,1.5,40],['meridiana','Meridiana EV','sedan',1.94,4.9,1.48,43],
 ['viaggio','Viaggio','wagon',1.89,4.75,1.56,38],['familia','Familia XL','wagon',1.96,5.0,1.64,37],
 ['selva','Selva','suv',1.96,4.55,1.84,36],['altavia','Altavia','suv',2.04,4.95,1.95,40],
 ['officina','Officina Van','van',2.02,5.0,2.3,30],['corriere','Corriere L','van',2.14,5.8,2.6,29],
 ['comitiva','Comitiva','mpv',1.95,4.8,1.88,34],['campo','Campo Pickup','pickup',2.03,5.25,1.92,35],
 ['saetta','Saetta S','sport',1.9,4.15,1.22,52],['vortice','Vortice GT','sport',1.98,4.65,1.3,57],
 ['fulmine','Fulmine R','supercar',2.04,4.5,1.1,65],['zenit','Zenit V','supercar',2.1,4.85,1.16,68],
 ['doge','Doge Grand','luxury',2.02,5.35,1.56,49],['aurora','Aurora Royale','luxury',2.08,5.65,1.65,51],
 ['lido','Lido Spider','convertible',1.85,4.1,1.25,45],['sestante','Sestante Executive','luxury',1.99,5.1,1.48,48]
];
export const NPC_VEHICLES=Object.fromEntries(catalogue.map(([id,name,family,width,length,height,max],i)=>[id,{name,family,width,length,height,max,boost:max*1.13,reverse:7,accel:family==='supercar'?15:family==='van'?5:8+i%5,brake:20,wheelbase:length*.61,steer:Math.min(1.3,4.7/length),npcOnly:true,variant:i}]));
Object.assign(VEHICLES,NPC_VEHICLES);
export const HELICOPTER={name:'Airone H2',width:2.8,length:7.8,height:3.2,wheelbase:3,max:48,boost:48,reverse:16,accel:8,brake:9,steer:1,aircraft:true};
VEHICLES.airone=HELICOPTER;
export const TRAFFIC_VEHICLES={...NPC_VEHICLES,...EXTRA_TRAFFIC};
export function fleetFor(zone,road=null){return Object.keys(TRAFFIC_VEHICLES).filter(id=>{const s=TRAFFIC_VEHICLES[id],f=s.family;if(s.length>12&&road&&(!/^(motorway|trunk|primary|secondary)$/.test(road.k)||road.w<8.5))return false;return zone==='industrial'?['van','pickup','mpv','classic','freight','work','motorcycle'].includes(f):zone==='historic'?['city','compact','classic','luxury','convertible','motorcycle'].includes(f):zone==='green'||zone==='wild'?['suv','pickup','classic','motorcycle'].includes(f):zone==='residential'?f!=='freight':true;});}
export function chooseTrafficStyle(zone,random=Math.random,road=null){const pool=fleetFor(zone,road),weights=pool.map(id=>{const f=TRAFFIC_VEHICLES[id].family;return ['supercar','luxury','sport'].includes(f)?zone==='historic'?.2:.08:['freight','work'].includes(f)?zone==='industrial'?1.4:.25:1;});let n=random()*weights.reduce((a,b)=>a+b,0);return pool.find((_,i)=>(n-=weights[i])<=0)||pool.at(-1);}
const cube=new THREE.BoxGeometry(),wheelGeo=new THREE.CylinderGeometry(1,1,1,10),materials=new Map();
function mat(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.55}));return materials.get(color);}
function box(g,c,x,y,z,w,h,d){const m=new THREE.Mesh(cube,mat(c));m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);return m;}
export function createNPCCar(type,color='#76828c'){
 const s=NPC_VEHICLES[type],g=new THREE.Group(),{width:w,length:l,height:h,family:f,variant:v}=s;
 if(['sport','supercar'].includes(f))return createWedgeCar(color,w,l,h,f==='supercar'||type==='vortice');
 const low=['sport','supercar','convertible'].includes(f),tall=['van','mpv','suv'].includes(f),bodyY=low?.43:.63,trim=['classic','luxury'].includes(f)?'#c2c3b4':'#30393e';
 box(g,color,0,bodyY,0,w*.89,low?.43:.58,l*.97);
 const roofLength=l*(f==='van'?.72:f==='wagon'?.65:f==='pickup'?.36:tall?.57:.45),roofZ=f==='pickup'?l*.13:-l*.08;
 box(g,'#304955',0,(h+bodyY)/2,roofZ,w*.77,h-bodyY-.15,roofLength);
 if(f!=='convertible')box(g,color,0,h-.07,roofZ,w*.8,.14,roofLength*.94);
 for(const side of [-1,1]){
  for(let j=0;j<(tall?3:2);j++)box(g,color,side*w*.397,(h+bodyY)/2,roofZ-roofLength/2+j*roofLength/(tall?2:1),.07,h-bodyY,.075);
  box(g,trim,side*w*.454,bodyY-.17,0,.025,.06,l*.88);
  box(g,color,side*w*.485,bodyY+.35,l*.17,.1,.12,.24);
  for(const z of [-s.wheelbase/2,s.wheelbase/2]){const m=new THREE.Mesh(wheelGeo,mat('#22282c'));m.position.set(side*w*.42,low?.26:.34,z);m.scale.set(low?.27:.34,.2,low?.27:.34);m.rotation.z=Math.PI/2;g.add(m);}
  box(g,v%2?'#f1eace':'#d5eef0',side*w*.32,bodyY+.1,l*.491,w*(v%3===0?.14:.25),low?.09:.15,.035);
  box(g,'#bd3e35',side*w*.32,bodyY+.06,-l*.491,w*.23,.12,.035);
 }
 if(f==='pickup'){box(g,'#424a49',0,bodyY+.31,-l*.28,w*.68,.05,l*.32);for(const side of [-1,1])box(g,color,side*w*.4,bodyY+.5,-l*.29,.12,.45,l*.34);}
 if(f==='supercar'){box(g,'#252c32',0,h+.05,-l*.36,w*.91,.07,.32);for(const side of [-1,1])box(g,'#252c32',side*w*.32,h-.12,-l*.36,.07,.35,.1);}
 if(f==='luxury')box(g,trim,0,bodyY+.07,l*.494,w*.43,.3,.04);
 if(f==='van')for(const side of [-1,1])box(g,color,side*w*.39,(h+bodyY)/2,-l*.21,.07,h-bodyY-.1,l*.42);
 g.userData.vehicleType=type;return g;
}
export function createHelicopter(){const g=new THREE.Group();
 box(g,'#ddd8ba',0,1.6,.45,2.4,1.45,3.5);box(g,'#2c5363',0,1.9,1.72,2.18,.92,.65);box(g,'#44645c',0,1.65,-2.5,.35,.38,3.6);box(g,'#dad4bc',0,2.2,-3.6,.16,1.5,.7);
 for(const s of [-1,1]){box(g,'#333f42',s*1.24,.18,.25,.12,.14,4.1);for(const z of [-1,1.3])box(g,'#737e7b',s*1.02,.6,z,.12,1,.12);}
 const rotor=new THREE.Group();rotor.position.set(0,2.9,0);box(rotor,'#303a3c',0,0,0,9,.06,.22);box(rotor,'#303a3c',0,0,0,.22,.06,9);g.add(rotor);
 const tail=new THREE.Group();tail.position.set(.24,2,-3.6);box(tail,'#354348',0,0,0,.08,1.5,.13);box(tail,'#354348',0,0,0,.08,.13,1.5);g.add(tail);g.userData.rotor=rotor;g.userData.tailRotor=tail;return g;
}
