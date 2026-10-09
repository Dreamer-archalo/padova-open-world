import {createCoachwork} from './car-coachwork.js';
import {createWedgeCar} from './sport-models.js';
import {EXTRA_TRAFFIC} from './special-vehicles.js';
import * as THREE from './vendor/three.module.js';
import {VEHICLES} from './vehicles.js';
import {rareCollectorStyle} from './collector-cars.js';

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
 ['lido','Lido Spider','convertible',1.85,4.1,1.25,45],['sestante','Sestante Executive','luxury',1.99,5.1,1.48,48],
 ['goccia','Goccia 2+2','city',1.68,3.35,1.55,31],['cortile','Cortile 3P','compact',1.79,3.72,1.43,34],
 ['linea','Linea Fastback','sedan',1.92,4.78,1.43,41],['brina','Brina Shooting Brake','wagon',1.9,4.62,1.49,39],
 ['roccia','Roccia Coupé','suv',2.0,4.63,1.72,38],['targa','Targa Aperta','convertible',1.88,4.22,1.22,46]
];
export const NPC_VEHICLES=Object.fromEntries(catalogue.map(([id,name,family,width,length,height,max],i)=>[id,{name,family,width,length,height,max,boost:max*1.13,reverse:7,accel:family==='supercar'?15:family==='van'?5:8+i%5,brake:20,wheelbase:length*.61,steer:Math.min(1.3,4.7/length),npcOnly:true,variant:i}]));
Object.assign(VEHICLES,NPC_VEHICLES);
export const HELICOPTER={name:'Airone H2',width:2.8,length:7.8,height:3.2,wheelbase:3,max:48,boost:48,reverse:16,accel:8,brake:9,steer:1,aircraft:true};
VEHICLES.airone=HELICOPTER;
export const TRAFFIC_VEHICLES={...NPC_VEHICLES,...Object.fromEntries(Object.entries(EXTRA_TRAFFIC).filter(([,spec])=>!spec.clubReward))};
export function fleetFor(zone,road=null){return Object.keys(TRAFFIC_VEHICLES).filter(id=>{const s=TRAFFIC_VEHICLES[id],f=s.family;if(s.length>12&&road&&(!/^(motorway|trunk|primary|secondary)$/.test(road.k)||road.w<8.5))return false;return zone==='industrial'?['van','pickup','mpv','classic','freight','work','motorcycle'].includes(f):zone==='historic'?['city','compact','classic','luxury','convertible','motorcycle'].includes(f):zone==='green'||zone==='wild'?['suv','pickup','classic','motorcycle'].includes(f):zone==='residential'?f!=='freight':true;});}
export function chooseTrafficStyle(zone,random=Math.random,road=null){const collector=rareCollectorStyle(random,road);if(collector)return collector;const pool=fleetFor(zone,road),weights=pool.map(id=>{const f=TRAFFIC_VEHICLES[id].family;return ['supercar','luxury','sport'].includes(f)?zone==='historic'?.2:.08:['freight','work'].includes(f)?zone==='industrial'?1.4:.25:1;});let n=random()*weights.reduce((a,b)=>a+b,0);return pool.find((_,i)=>(n-=weights[i])<=0)||pool.at(-1);}
const cube=new THREE.BoxGeometry(),wheelGeo=new THREE.CylinderGeometry(1,1,1,10),materials=new Map();
function mat(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.55}));return materials.get(color);}
function box(g,c,x,y,z,w,h,d){const m=new THREE.Mesh(cube,mat(c));m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);return m;}
export function createNPCCar(type,color='#76828c',finish='standard'){return createCoachwork(type,NPC_VEHICLES[type],color,finish);}
export function createHelicopter(){const g=new THREE.Group();
 box(g,'#ddd8ba',0,1.6,.45,2.4,1.45,3.5);box(g,'#2c5363',0,1.9,1.72,2.18,.92,.65);box(g,'#44645c',0,1.65,-2.5,.35,.38,3.6);box(g,'#dad4bc',0,2.2,-3.6,.16,1.5,.7);
 for(const s of [-1,1]){box(g,'#333f42',s*1.24,.18,.25,.12,.14,4.1);for(const z of [-1,1.3])box(g,'#737e7b',s*1.02,.6,z,.12,1,.12);}
 const rotor=new THREE.Group();rotor.position.set(0,2.9,0);box(rotor,'#303a3c',0,0,0,9,.06,.22);box(rotor,'#303a3c',0,0,0,.22,.06,9);g.add(rotor);
 const tail=new THREE.Group();tail.position.set(.24,2,-3.6);box(tail,'#354348',0,0,0,.08,1.5,.13);box(tail,'#354348',0,0,0,.08,.13,1.5);g.add(tail);g.userData.rotor=rotor;g.userData.tailRotor=tail;return g;
}
