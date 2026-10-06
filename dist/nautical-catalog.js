// Shared SI-unit watercraft catalogue for Padova rivers and the Venetian lagoon.
// Width, draft and airDraft decide which channels/bridges each craft can use.
import {buildBoatModel} from './boat-models.js';
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
 'boat-speedster':{name:'Scia 110 · motoscafo offshore',kind:'offshore',width:2.65,length:9.2,height:1.95,draft:.48,airDraft:1.75,minChannel:10,maxKmh:110,accel:9.2,brake:13,steer:1.18,places:['padova','venice']},
 'boat-catamaran':{name:'Dardo 145 · catamarano sportivo',kind:'catamaran',width:3.6,length:11,height:2,draft:.44,airDraft:1.7,minChannel:16,maxKmh:145,accel:11.2,brake:14,steer:.94,places:['venice']},
 'boat-jetski-race':{name:'Jet R · moto d’acqua racing',kind:'racingjet',width:1.25,length:3.35,height:1.2,draft:.25,airDraft:1.05,minChannel:6,maxKmh:120,accel:11.5,brake:14,steer:1.55,places:['padova','venice']},
 'boat-vaporetto':{name:'Vaporetto · linea lagunare',kind:'vaporetto',width:4.3,length:23,height:3.9,draft:1.2,airDraft:3.3,minChannel:18,maxKmh:24,accel:1.65,brake:3,steer:.30,places:['venice']},
 'boat-yacht':{name:'Yacht Laguna · 16 metri',kind:'yacht',width:4.5,length:16,height:4.2,draft:1.25,airDraft:3.6,minChannel:20,maxKmh:31,accel:2.4,brake:4,steer:.35,places:['venice']}
});
export function registerBoats(){
 for(const [id,b] of Object.entries(BOAT_SPECS))VEHICLES[id]={name:b.name,family:'watercraft',watercraft:true,kind:b.kind,places:b.places,width:b.width,length:b.length,height:b.height,wheelbase:b.length*.58,draft:b.draft,airDraft:b.airDraft,minChannel:b.minChannel,maxKmh:b.maxKmh,max:b.maxKmh/3.6,boost:b.maxKmh/3.6,reverse:Math.min(3,b.maxKmh/12),accel:b.accel,brake:b.brake,steer:b.steer,mass:Math.max(.4,b.length*.22)};
}
registerBoats();
export function createBoatModel(id,color=null){const spec=BOAT_SPECS[id];return spec?buildBoatModel(id,spec,color):null;}
export function watercraftClearance(s,terrain,x,z,yaw){
 let shallow=false,lowBridge=false;
 for(const [along,margin] of [[0,s.width*.5+.45],[s.length*.40,s.width*.18+.25],[-s.length*.40,s.width*.34+.25]]){
  const px=x+Math.sin(yaw)*along,pz=z+Math.cos(yaw)*along,sample=terrain.waterSample(px,pz),waterY=terrain.waterHeight(px,pz),bridge=terrain.bridge?.(px,pz,0,waterY),deck=bridge?.height??(bridge?.y??Infinity);
  shallow ||=sample.distance> -margin;lowBridge ||=Number.isFinite(deck)&&deck-waterY<s.airDraft+.45;
 }
 return {shallow,lowBridge,blocked:shallow||lowBridge};
}
// A dock's mapped segment direction may point straight into a low bridge.
// Keep the craft close to the real dock and choose a clear departure corridor.
export function boatLaunchPoint(s,terrain,dock){
 for(const offset of [0,6,-6,12,-12])for(const turn of [0,Math.PI]){
  const x=dock.x+Math.sin(dock.yaw)*offset,z=dock.z+Math.cos(dock.yaw)*offset,yaw=dock.yaw+turn;let clear=true;
  for(let d=0;d<=12;d+=.5)if(watercraftClearance(s,terrain,x+Math.sin(yaw)*d,z+Math.cos(yaw)*d,yaw).blocked){clear=false;break;}
  if(clear)return {x,z,yaw};
 }
 return null;
}
export function watercraftStep(state,held,dt,terrain){
 const c=state.car,s=c?.spec;if(!s?.watercraft||dt<=0)return null;
 const forward=(held.has('KeyW')||held.has('ArrowUp')?1:0)-(held.has('KeyS')||held.has('ArrowDown')?1:0);
 const steer=(held.has('KeyA')||held.has('ArrowLeft')?1:0)-(held.has('KeyD')||held.has('ArrowRight')?1:0);
 const boost=held.has('ShiftLeft')||held.has('ShiftRight'),limit=s.max*(boost?1:.76);
 state.speed=Math.max(-s.reverse,Math.min(limit,state.speed+(forward>0?s.accel:forward<0?-s.brake:-(Math.sign(state.speed)*Math.min(Math.abs(state.speed),s.brake*.30)))*dt));
 state.yaw+=steer*s.steer*dt*Math.min(1,Math.abs(state.speed)/4)*(state.speed>=0?1:-1);
 // Sweep fast craft through the same channel and bridge checks: the bow
 // cannot jump across a bank or a low bridge between two frame samples.
 const count=Math.max(1,Math.ceil(Math.abs(state.speed)*dt/.5));let shallow=false,lowBridge=false,blocked=false;
 for(let i=0;i<count;i++){
  const nx=state.x+Math.sin(state.yaw)*state.speed*dt/count,nz=state.z+Math.cos(state.yaw)*state.speed*dt/count;
  const clearance=watercraftClearance(s,terrain,nx,nz,state.yaw);shallow ||=clearance.shallow;lowBridge ||=clearance.lowBridge;
  blocked=shallow||lowBridge;if(blocked){state.speed*=.38;if(Math.abs(state.speed)<.35)state.speed=0;break;}state.x=nx;state.z=nz;
 }
 state.y=terrain.waterHeight(state.x,state.z)+.10;state.vy=0;
 Object.assign(c,{x:state.x,y:state.y,z:state.z,yaw:state.yaw,speed:state.speed,health:state.health,parked:false});
 c.mesh.position.set(c.x,c.y,c.z);c.mesh.rotation.set(Math.sin((state.elapsed||0)*1.8)*.018,state.yaw,steer*Math.min(.06,Math.abs(state.speed)*.005),'YXZ');
 return {blocked,shallow,lowBridge};
}
