// Shared SI-unit watercraft catalogue for Padova rivers and the Venetian lagoon.
// Width, draft and airDraft decide which channels/bridges each craft can use.
import * as THREE from './vendor/three.module.js';
import {VEHICLES} from './vehicles.js';
export const BOAT_SPECS=Object.freeze({
 'boat-electric':{name:'Piovego Elettrica · 8 posti',kind:'electric',width:2.1,length:6.2,height:1.8,draft:.35,airDraft:1.35,minChannel:7,maxKmh:13,accel:1.8,brake:3.6,steer:.85,places:['padova','venice']},
 'boat-gondola':{name:'Gondola veneziana',kind:'gondola',width:1.35,length:10.4,height:1,draft:.3,airDraft:.95,minChannel:4.5,maxKmh:6,accel:1,brake:2,steer:1.05,places:['venice']},
 'boat-bragozzo':{name:'Bragozzo · tradizionale',kind:'fishing',width:3.4,length:10.5,height:2.9,draft:.9,airDraft:2.3,minChannel:11,maxKmh:19,accel:1.6,brake:3.5,steer:.53,places:['padova','venice']},
 'boat-water-taxi':{name:'Taxi acqueo lagunare',kind:'taxi',width:2.5,length:9.2,height:2.2,draft:.65,airDraft:1.85,minChannel:8.5,maxKmh:40,accel:3.7,brake:6.5,steer:.85,places:['padova','venice']},
 'boat-rib':{name:'Gommone RIB · 7.5',kind:'rib',width:2.7,length:7.5,height:1.9,draft:.45,airDraft:1.8,minChannel:9,maxKmh:63,accel:5.8,brake:9,steer:1.28,places:['padova','venice']},
 'boat-patrol':{name:'Motovedetta fluviale',kind:'patrol',width:2.95,length:8.7,height:2.35,draft:.55,airDraft:2.15,minChannel:10,maxKmh:56,accel:4.7,brake:8,steer:1.02,places:['padova','venice']},
 'boat-sport':{name:'Motoscafo sportivo · 80',kind:'sport',width:2.5,length:7.8,height:1.8,draft:.42,airDraft:1.65,minChannel:10,maxKmh:80,accel:7.5,brake:12,steer:1.42,places:['padova','venice']},
 'boat-jetski':{name:'Moto d’acqua · Jet',kind:'jetski',width:1.2,length:3.1,height:1.2,draft:.25,airDraft:1.05,minChannel:5,maxKmh:92,accel:9,brake:12,steer:1.65,places:['padova','venice']},
 'boat-vaporetto':{name:'Vaporetto · linea lagunare',kind:'vaporetto',width:4.3,length:23,height:3.9,draft:1.2,airDraft:3.3,minChannel:18,maxKmh:24,accel:1.65,brake:3,steer:.30,places:['venice']},
 'boat-yacht':{name:'Yacht Laguna · 16 metri',kind:'yacht',width:4.5,length:16,height:4.2,draft:1.25,airDraft:3.6,minChannel:20,maxKmh:31,accel:2.4,brake:4,steer:.35,places:['venice']}
});
export function registerBoats(){
 for(const [id,b] of Object.entries(BOAT_SPECS))VEHICLES[id]={name:b.name,family:'watercraft',watercraft:true,kind:b.kind,places:b.places,width:b.width,length:b.length,height:b.height,wheelbase:b.length*.58,draft:b.draft,airDraft:b.airDraft,minChannel:b.minChannel,maxKmh:b.maxKmh,max:b.maxKmh/3.6,boost:b.maxKmh/3.6,reverse:Math.min(3,b.maxKmh/12),accel:b.accel,brake:b.brake,steer:b.steer,mass:Math.max(.4,b.length*.22)};
}
registerBoats();
const cube=new THREE.BoxGeometry(1,1,1),mats=new Map();
function material(color){if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.62,metalness:.08,side:THREE.DoubleSide}));return mats.get(color);}
function box(g,color,x,y,z,w,h,l){const m=new THREE.Mesh(cube,material(color));m.position.set(x,y,z);m.scale.set(w,h,l);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
export function createBoatModel(id,color='#ded7c5'){
 const s=BOAT_SPECS[id];if(!s)return null;const g=new THREE.Group(),w=s.width,l=s.length,jet=s.kind==='jetski',gondola=s.kind==='gondola',big=s.kind==='vaporetto'||s.kind==='yacht',hullY=jet?.13:.02;
 const hull=box(g,color,0,hullY,0,w*.93,jet?.36:.72,l*.94);
 hull.rotation.x=.012;
 box(g,'#23353c',0,.33,0,w*.76,.15,l*.65);
 for(const side of [-1,1]){
  box(g,color,side*w*.42,.01,l*.18,w*.1,.28,l*.38);
  if(s.kind==='rib')box(g,'#303c42',side*w*.45,.19,0,w*.17,.38,l*.76);
 }
 if(gondola){box(g,'#141719',0,.29,0,w*.65,.17,l*.75);box(g,'#16191e',0,.78,-l*.23,w*.63,.87,.12);}
 else if(jet){box(g,'#22363d',0,.68,-.32,.24,.53,.15);box(g,'#343f48',0,.96,-.34,.65,.08,.12);}
 else{
  const cabinW=big?w*.76:w*.60,cabinL=big?l*.58:l*.27,cabinH=big?s.height*.54:.97,cabinZ=big?-l*.04:-l*.09;
  box(g,color,0,.70+cabinH*.5,cabinZ,cabinW,cabinH,cabinL);
  box(g,'#35596a',0,.76+cabinH*.68,cabinZ+cabinL*.50,cabinW*.77,cabinH*.37,.055);
  if(big){box(g,'#33434b',0,.7+cabinH*1.02,cabinZ,cabinW*1.02,.13,cabinL*1.04);}
  if(s.kind==='patrol'){box(g,'#1e4b76',0,1.95,-.2,.5,.14,.5);box(g,'#d74738',0,2.08,-.2,.17,.16,.17);}
 }
 if(s.kind==='sport'||s.kind==='taxi')box(g,'#365768',0,.85,l*.12,w*.65,.55,l*.13);
 // Keel sits slightly below water plane; an explicit boat property drives float/sway.
 g.name=s.name;g.userData.watercraft=true;g.userData.airDraft=s.airDraft;return g;
}
export function watercraftStep(state,held,dt,terrain){
 const c=state.car,s=c?.spec;if(!s?.watercraft||dt<=0)return null;
 const forward=(held.has('KeyW')||held.has('ArrowUp')?1:0)-(held.has('KeyS')||held.has('ArrowDown')?1:0);
 const steer=(held.has('KeyA')||held.has('ArrowLeft')?1:0)-(held.has('KeyD')||held.has('ArrowRight')?1:0);
 const boost=held.has('ShiftLeft')||held.has('ShiftRight'),limit=s.max*(boost?1:.76);
 state.speed=Math.max(-s.reverse,Math.min(limit,state.speed+(forward>0?s.accel:forward<0?-s.brake:-(Math.sign(state.speed)*Math.min(Math.abs(state.speed),s.brake*.30)))*dt));
 state.yaw+=steer*s.steer*dt*Math.min(1,Math.abs(state.speed)/4)*(state.speed>=0?1:-1);
 const nx=state.x+Math.sin(state.yaw)*state.speed*dt,nz=state.z+Math.cos(state.yaw)*state.speed*dt;
 const margin=s.width*.5+.45,sample=terrain.waterSample(nx,nz),bridge=terrain.bridge?.(nx,nz,0,terrain.waterHeight(nx,nz));
 const waterY=terrain.waterHeight(nx,nz),deck=bridge?.height??(bridge?.y??Infinity);
 const shallow=sample.distance> -margin;
 const lowBridge=Number.isFinite(deck)&&deck-waterY<s.airDraft+.45;
 let blocked=shallow||lowBridge;
 if(!blocked){state.x=nx;state.z=nz;}
 else{state.speed*=.38;if(Math.abs(state.speed)<.35)state.speed=0;}
 state.y=terrain.waterHeight(state.x,state.z)+.10;state.vy=0;
 Object.assign(c,{x:state.x,y:state.y,z:state.z,yaw:state.yaw,speed:state.speed,health:state.health,parked:false});
 c.mesh.position.set(c.x,c.y,c.z);c.mesh.rotation.set(Math.sin((state.elapsed||0)*1.8)*.018,state.yaw,steer*Math.min(.06,Math.abs(state.speed)*.005),'YXZ');
 return {blocked,shallow,lowBridge};
}
