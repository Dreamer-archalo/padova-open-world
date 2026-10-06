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
export const TRAFFIC_VEHICLES={...NPC_VEHICLES,...EXTRA_TRAFFIC};
export function fleetFor(zone,road=null){return Object.keys(TRAFFIC_VEHICLES).filter(id=>{const s=TRAFFIC_VEHICLES[id],f=s.family;if(s.length>12&&road&&(!/^(motorway|trunk|primary|secondary)$/.test(road.k)||road.w<8.5))return false;return zone==='industrial'?['van','pickup','mpv','classic','freight','work','motorcycle'].includes(f):zone==='historic'?['city','compact','classic','luxury','convertible','motorcycle'].includes(f):zone==='green'||zone==='wild'?['suv','pickup','classic','motorcycle'].includes(f):zone==='residential'?f!=='freight':true;});}
export function chooseTrafficStyle(zone,random=Math.random,road=null){const collector=rareCollectorStyle(random,road);if(collector)return collector;const pool=fleetFor(zone,road),weights=pool.map(id=>{const f=TRAFFIC_VEHICLES[id].family;return ['supercar','luxury','sport'].includes(f)?zone==='historic'?.2:.08:['freight','work'].includes(f)?zone==='industrial'?1.4:.25:1;});let n=random()*weights.reduce((a,b)=>a+b,0);return pool.find((_,i)=>(n-=weights[i])<=0)||pool.at(-1);}
const cube=new THREE.BoxGeometry(),wheelGeo=new THREE.CylinderGeometry(1,1,1,10),materials=new Map();
function mat(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.55}));return materials.get(color);}
function box(g,c,x,y,z,w,h,d){const m=new THREE.Mesh(cube,mat(c));m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);return m;}
function roundedCar(type,color,wheelColor){
 const s=NPC_VEHICLES[type],g=new THREE.Group(),w=s.width,l=s.length,h=s.height,variant=type==='zenit'?'grand':type==='vortice'?'tourer':type==='lido'?'spider':'classic';
 const body=new THREE.Mesh(new THREE.SphereGeometry(1,18,10),mat(color));body.position.set(0,.57,0);body.scale.set(w*.49,.48,l*.49);g.add(body);
 const nose=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),mat(color));nose.position.set(0,.53,l*(variant==='grand'?.3:.33));nose.scale.set(w*.46,.35,l*(variant==='grand'?.22:.17));g.add(nose);
 const cabin=new THREE.Mesh(new THREE.SphereGeometry(1,18,10),mat('#253d48'));cabin.position.set(0,variant==='spider'?.87:variant==='grand'?1.03:1.00,variant==='tourer'?-.22:-.13);cabin.scale.set(w*.39,variant==='spider'?.13:variant==='grand'?.34:.29,l*(variant==='grand'?.31:.27));g.add(cabin);
 if(variant==='classic'){const roof=new THREE.Mesh(new THREE.SphereGeometry(1,14,8),mat(color));roof.position.set(0,h-.18,-.13);roof.scale.set(w*.4,.12,l*.27);g.add(roof);}
 for(const side of [-1,1]){
  for(const z of [-s.wheelbase/2,s.wheelbase/2]){const wheel=new THREE.Mesh(wheelGeo,mat(wheelColor==='bronze'?'#a47b49':'#252b2c'));wheel.position.set(side*w*.43,.29,z);wheel.scale.set(.29,.22,.29);wheel.rotation.z=Math.PI/2;g.add(wheel);}
  box(g,'#ebeee8',side*w*.34,.61,l*.47,w*.16,.12,.07);box(g,'#b72c35',side*w*.36,.59,-l*.48,w*.15,.10,.06);
 }
 g.userData.vehicleType=type;return g;
}
const smoothGeo=new THREE.SphereGeometry(1,16,9);
function ellipsoid(g,c,x,y,z,w,h,d){const m=new THREE.Mesh(smoothGeo,mat(c));m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);return m;}
function carWheel(g,x,z,r=.32,width=.2,wheelColor='standard'){const m=new THREE.Mesh(wheelGeo,mat(wheelColor==='bronze'?'#a47b49':'#22282c'));m.position.set(x,r,z);m.scale.set(r,width,r);m.rotation.z=Math.PI/2;g.add(m);const hub=new THREE.Mesh(wheelGeo,mat(wheelColor==='bronze'?'#d0aa6d':'#929b9b'));hub.position.set(x+(x<0?-.015:.015),r,z);hub.scale.set(r*.53,width+.015,r*.53);hub.rotation.z=Math.PI/2;g.add(hub);}
function finishRoadCar(g,s,wheelColor,head='#eef4df',tail='#c13d37'){
 for(const side of [-1,1]){for(const z of [-s.wheelbase/2,s.wheelbase/2])carWheel(g,side*s.width*.445,z,['suv','van','mpv','pickup'].includes(s.family)?.37:['sport','supercar','convertible'].includes(s.family)?.28:.32,.2,wheelColor);box(g,head,side*s.width*.31,.62,s.length*.49,s.width*.18,.13,.045);box(g,tail,side*s.width*.32,.61,-s.length*.49,s.width*.17,.12,.045);}
}
function roofRails(g,w,l,h){for(const side of [-1,1])box(g,'#343d40',side*w*.31,h+.035,-l*.06,.035,.055,l*.55);}
function formalGrille(g,w,l,y,accent='#c3c6bc'){box(g,accent,0,y,l*.495,w*.5,.25,.045);for(let x=-w*.19;x<=w*.2;x+=w*.095)box(g,'#343d3d',x,y,l*.502,.025,.19,.025);}
export function createNPCCar(type,color='#76828c',wheelColor='standard'){
 const s=NPC_VEHICLES[type],g=new THREE.Group(),{width:w,length:l,height:h,family:f}=s,glass='#294752',dark='#283235',trim=['classic','luxury'].includes(f)?'#c7c2ad':'#30393e';
 const low=['sport','supercar','convertible'].includes(f),tall=['suv','van','mpv'].includes(f);
 if(type==='ambra'||type==='vortice'||type==='zenit'||type==='lido')return roundedCar(type,color,wheelColor);
 if(['saetta','fulmine'].includes(type))return createWedgeCar(color,w,l,h,type==='fulmine');

 if(type==='goccia'){
  ellipsoid(g,color,0,.57,.05,w*.49,.40,l*.49);ellipsoid(g,glass,0,1.07,-.05,w*.39,.42,l*.34);ellipsoid(g,color,0,1.39,-.08,w*.37,.08,l*.30);
  for(const side of [-1,1])box(g,'#d8dfd9',side*w*.29,.66,l*.485,w*.15,.12,.035);finishRoadCar(g,s,wheelColor);
 }else if(type==='cortile'){
  box(g,color,0,.56,.06,w*.92,.43,l*.94);ellipsoid(g,glass,0,1.03,-.12,w*.40,.33,l*.31);const rear=box(g,glass,0,1.00,-l*.42,w*.70,.42,.04);rear.rotation.x=-.30;
  box(g,color,0,1.30,-.30,w*.76,.10,l*.39);for(const side of [-1,1])box(g,dark,side*w*.45,.72,-.04,.03,.07,l*.70);finishRoadCar(g,s,wheelColor);
 }else if(type==='linea'){
  ellipsoid(g,color,0,.55,.06,w*.50,.36,l*.49);ellipsoid(g,glass,0,1.02,-.08,w*.40,.32,l*.37);const fastback=ellipsoid(g,color,0,1.26,-l*.13,w*.40,.08,l*.38);fastback.rotation.x=-.05;
  box(g,dark,0,.52,-l*.49,w*.61,.11,.04);finishRoadCar(g,s,wheelColor);
 }else if(type==='brina'){
  box(g,color,0,.56,.02,w*.92,.45,l*.96);ellipsoid(g,glass,0,1.08,-.18,w*.39,.36,l*.38);box(g,color,0,1.38,-.23,w*.78,.11,l*.58);const hatch=box(g,glass,0,1.10,-l*.44,w*.70,.46,.04);hatch.rotation.x=-.10;
  box(g,color,0,.84,l*.34,w*.84,.28,l*.23);finishRoadCar(g,s,wheelColor);
 }else if(type==='roccia'){
  box(g,dark,0,.40,0,w*.96,.17,l*.84);ellipsoid(g,color,0,.66,.05,w*.50,.45,l*.49);ellipsoid(g,glass,0,1.23,-.11,w*.40,.42,l*.34);ellipsoid(g,color,0,h-.08,-.15,w*.39,.09,l*.34);
  box(g,dark,0,.68,l*.49,w*.56,.18,.045);finishRoadCar(g,s,wheelColor);
 }else if(type==='targa'){
  ellipsoid(g,color,0,.50,.06,w*.50,.33,l*.49);box(g,dark,0,.78,-.16,w*.69,.16,l*.25);const wind=box(g,glass,0,1.02,.56,w*.70,.38,.035);wind.rotation.x=.25;
  for(const side of [-1,1])box(g,'#aeb4ad',side*w*.31,1.16,-.28,.055,.38,.055);box(g,'#aeb4ad',0,1.32,-.28,w*.63,.055,.055);finishRoadCar(g,s,wheelColor);
 }else if(type==='nido'){
  ellipsoid(g,color,0,.58,.02,w*.48,.42,l*.48);ellipsoid(g,glass,0,1.05,-.12,w*.38,.43,l*.31);ellipsoid(g,color,0,1.34,-.18,w*.36,.12,l*.28);
  box(g,'#2f383a',0,.43,l*.475,w*.62,.12,.08);finishRoadCar(g,s,wheelColor);
 }else if(type==='tessera'){
  ellipsoid(g,color,0,.62,.04,w*.49,.46,l*.48);box(g,glass,0,1.13,-.18,w*.72,.68,l*.48);ellipsoid(g,color,0,h-.08,-.22,w*.4,.11,l*.34);
  box(g,color,0,.92,l*.34,w*.82,.52,l*.18);box(g,dark,0,.59,-l*.49,w*.62,.16,.06);finishRoadCar(g,s,wheelColor);
 }else if(type==='rondine'){
  ellipsoid(g,color,0,.56,.04,w*.49,.36,l*.48);ellipsoid(g,glass,0,1.01,-.18,w*.39,.34,l*.31);box(g,color,0,1.27,-.42,w*.76,.11,l*.34);
  const hatch=box(g,glass,0,1.02,-l*.39,w*.67,.42,.04);hatch.rotation.x=-.22;finishRoadCar(g,s,wheelColor);
 }else if(type==='botanica'){
  ellipsoid(g,color,0,.55,.08,w*.49,.36,l*.49);ellipsoid(g,glass,0,1.02,-.08,w*.40,.34,l*.34);ellipsoid(g,color,0,1.29,-.12,w*.39,.09,l*.31);
  box(g,'#48645a',0,.57,-l*.495,w*.52,.12,.04);finishRoadCar(g,s,wheelColor);
 }else if(type==='porto'){
  box(g,color,0,.58,.05,w*.91,.48,l*.94);box(g,color,0,.92,l*.24,w*.84,.33,l*.34);box(g,color,0,.92,-l*.32,w*.84,.30,l*.25);box(g,glass,0,1.18,-.03,w*.72,.50,l*.34);box(g,color,0,h-.08,-.03,w*.76,.11,l*.34);
  formalGrille(g,w,l,.64,'#c9c1a8');box(g,'#c9c1a8',0,.43,-l*.5,w*.82,.08,.08);finishRoadCar(g,s,wheelColor,'#fff0bd','#b13d35');
 }else if(type==='argine'){
  box(g,color,0,.56,.03,w*.94,.44,l*.96);box(g,color,0,.86,l*.31,w*.86,.24,l*.28);box(g,glass,0,1.16,-.05,w*.74,.54,l*.38);box(g,color,0,h-.08,-.08,w*.77,.12,l*.38);box(g,color,0,.83,-l*.35,w*.87,.26,l*.25);
  formalGrille(g,w,l,.63);finishRoadCar(g,s,wheelColor);
 }else if(type==='meridiana'){
  ellipsoid(g,color,0,.55,.02,w*.5,.38,l*.49);ellipsoid(g,glass,0,1.04,-.08,w*.40,.34,l*.35);ellipsoid(g,color,0,1.31,-.11,w*.4,.08,l*.34);
  box(g,'#1d3036',0,.65,l*.493,w*.54,.12,.035);box(g,'#8dd7d8',0,.70,l*.497,w*.28,.055,.02);finishRoadCar(g,s,wheelColor,'#dff5ef','#b83d3d');
 }else if(type==='viaggio'){
  box(g,color,0,.57,0,w*.92,.48,l*.96);box(g,glass,0,1.18,-l*.12,w*.74,.70,l*.58);box(g,color,0,h-.08,-l*.14,w*.78,.12,l*.61);const rear=box(g,glass,0,1.17,-l*.43,w*.7,.58,.04);rear.rotation.x=-.08;
  box(g,color,0,.91,l*.33,w*.84,.28,l*.24);roofRails(g,w,l,h);finishRoadCar(g,s,wheelColor);
 }else if(type==='familia'){
  box(g,color,0,.6,0,w*.93,.52,l*.96);box(g,glass,0,1.28,-l*.1,w*.75,.79,l*.62);box(g,color,0,h-.07,-l*.12,w*.79,.13,l*.65);box(g,color,0,.96,l*.34,w*.86,.35,l*.25);box(g,dark,0,.71,-l*.495,w*.56,.2,.04);
  roofRails(g,w,l,h);finishRoadCar(g,s,wheelColor);
 }else if(type==='selva'){
  ellipsoid(g,color,0,.67,.03,w*.5,.48,l*.48);box(g,dark,0,.39,0,w*.95,.18,l*.86);ellipsoid(g,glass,0,1.33,-.12,w*.40,.48,l*.33);box(g,color,0,h-.09,-.14,w*.78,.12,l*.55);box(g,dark,0,.74,l*.49,w*.58,.20,.05);
  roofRails(g,w,l,h);finishRoadCar(g,s,wheelColor);
 }else if(type==='altavia'){
  box(g,dark,0,.42,0,w*.96,.19,l*.86);box(g,color,0,.76,0,w*.91,.62,l*.94);box(g,glass,0,1.43,-.11,w*.73,.92,l*.55);box(g,color,0,h-.08,-.12,w*.8,.15,l*.61);box(g,color,0,1.02,l*.34,w*.84,.44,l*.24);
  roofRails(g,w,l,h);finishRoadCar(g,s,wheelColor);
 }else if(type==='officina'){
  box(g,color,0,.87,-.12,w*.92,1.35,l*.86);box(g,color,0,1.13,l*.34,w*.9,.94,l*.2);const wind=box(g,glass,0,1.59,l*.445,w*.75,.62,.045);wind.rotation.x=.13;
  for(const side of [-1,1]){box(g,glass,side*w*.455,1.58,l*.27,.035,.55,l*.22);box(g,dark,side*w*.465,1.20,-l*.14,.035,.09,l*.43);}box(g,dark,0,.67,-l*.485,w*.62,.18,.05);finishRoadCar(g,s,wheelColor);
 }else if(type==='corriere'){
  box(g,color,0,1.25,-.13,w*.94,2.15,l*.86);box(g,color,0,1.27,l*.36,w*.92,1.85,l*.18);const wind=box(g,glass,0,1.92,l*.448,w*.77,.72,.045);wind.rotation.x=.12;
  for(const side of [-1,1]){box(g,glass,side*w*.465,1.88,l*.29,.035,.62,l*.18);box(g,dark,side*w*.474,1.38,-l*.13,.03,.08,l*.48);}box(g,dark,0,.74,-l*.49,w*.66,.2,.05);finishRoadCar(g,s,wheelColor);
 }else if(type==='comitiva'){
  ellipsoid(g,color,0,.65,.06,w*.49,.45,l*.49);ellipsoid(g,glass,0,1.34,-.02,w*.40,.56,l*.38);ellipsoid(g,color,0,h-.11,-.07,w*.41,.11,l*.38);box(g,color,0,.91,l*.37,w*.83,.50,l*.19);
  for(const side of [-1,1])box(g,dark,side*w*.465,1.22,-l*.16,.035,.07,l*.45);finishRoadCar(g,s,wheelColor);
 }else if(type==='campo'){
  box(g,dark,0,.43,0,w*.96,.18,l*.87);box(g,color,0,.72,l*.18,w*.91,.58,l*.56);box(g,glass,0,1.28,l*.18,w*.73,.68,l*.27);box(g,color,0,h-.08,l*.13,w*.78,.12,l*.32);
  box(g,'#3b4545',0,.77,-l*.31,w*.72,.09,l*.31);for(const side of [-1,1])box(g,color,side*w*.405,.98,-l*.31,.12,.50,l*.32);box(g,color,0,.99,-l*.47,w*.82,.50,.10);finishRoadCar(g,s,wheelColor);
 }else if(type==='doge'){
  box(g,color,0,.55,.02,w*.95,.43,l*.97);box(g,color,0,.82,l*.34,w*.88,.25,l*.27);box(g,glass,0,1.17,-.03,w*.74,.53,l*.39);box(g,color,0,h-.08,-.05,w*.79,.11,l*.42);box(g,color,0,.82,-l*.38,w*.88,.25,l*.23);
  formalGrille(g,w,l,.63,'#d2bd86');for(const side of [-1,1])box(g,'#d2bd86',side*w*.46,.60,0,.025,.055,l*.78);finishRoadCar(g,s,wheelColor);
 }else if(type==='aurora'){
  box(g,color,0,.57,0,w*.96,.46,l*.98);box(g,glass,0,1.24,-.12,w*.74,.62,l*.52);box(g,color,0,h-.08,-.15,w*.8,.12,l*.55);box(g,color,0,.84,l*.38,w*.88,.28,l*.20);box(g,color,0,.84,-l*.43,w*.9,.28,l*.13);
  formalGrille(g,w,l,.66,'#d4bc7f');for(const side of [-1,1])box(g,'#d4bc7f',side*w*.47,.61,-.03,.025,.06,l*.82);finishRoadCar(g,s,wheelColor);
 }else if(type==='sestante'){
  ellipsoid(g,color,0,.55,.04,w*.50,.37,l*.50);ellipsoid(g,glass,0,1.08,-.08,w*.39,.36,l*.36);ellipsoid(g,color,0,1.36,-.12,w*.39,.08,l*.34);box(g,'#c8b37d',0,.61,l*.495,w*.43,.18,.04);box(g,dark,0,.52,-l*.495,w*.64,.12,.04);
  finishRoadCar(g,s,wheelColor);
 }else{
  box(g,color,0,low?.48:.63,0,w*.91,low?.42:.56,l*.96);box(g,glass,0,tall?1.3:1.08,-l*.08,w*.75,Math.max(.34,h-.86),l*(tall?.54:.43));box(g,color,0,h-.08,-l*.1,w*.79,.12,l*(tall?.56:.45));
  finishRoadCar(g,s,wheelColor);
 }
 g.userData.vehicleType=type;return g;
}
export function createHelicopter(){const g=new THREE.Group();
 box(g,'#ddd8ba',0,1.6,.45,2.4,1.45,3.5);box(g,'#2c5363',0,1.9,1.72,2.18,.92,.65);box(g,'#44645c',0,1.65,-2.5,.35,.38,3.6);box(g,'#dad4bc',0,2.2,-3.6,.16,1.5,.7);
 for(const s of [-1,1]){box(g,'#333f42',s*1.24,.18,.25,.12,.14,4.1);for(const z of [-1,1.3])box(g,'#737e7b',s*1.02,.6,z,.12,1,.12);}
 const rotor=new THREE.Group();rotor.position.set(0,2.9,0);box(rotor,'#303a3c',0,0,0,9,.06,.22);box(rotor,'#303a3c',0,0,0,.22,.06,9);g.add(rotor);
 const tail=new THREE.Group();tail.position.set(.24,2,-3.6);box(tail,'#354348',0,0,0,.08,1.5,.13);box(tail,'#354348',0,0,0,.08,.13,1.5);g.add(tail);g.userData.rotor=rotor;g.userData.tailRotor=tail;return g;
}
