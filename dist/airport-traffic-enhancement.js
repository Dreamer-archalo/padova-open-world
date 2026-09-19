// Add real, stateful airborne traffic without modifying legacy vehicle controllers.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {AIRPORT,areaPoint} from './gameplay-areas.js';
import {createSpecialVehicle} from './special-vehicles.js';
import {createPerson} from './world.js';
import {createAirportTraffic,tickAirportTraffic,destroyAirportAircraft} from './airport-air-traffic.js';

const boxGeometry=new THREE.BoxGeometry(),colors=new Map();
function part(group,x,y,z,w,h,d,color){
 if(!colors.has(color))colors.set(color,new THREE.MeshStandardMaterial({color,roughness:.73}));
 const mesh=new THREE.Mesh(boxGeometry,colors.get(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);
 mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
}
function aircraftModel(type){
 if(type!=='cargo'&&type!=='jet')return createSpecialVehicle(type);
 const g=new THREE.Group(),cargo=type==='cargo',base=cargo?'#9daca9':'#667582',wing=cargo?'#b2c1bc':'#8599a3';
 if(cargo){
  part(g,0,3,0,4.4,4.2,23,base);part(g,0,3,11.3,4,3.1,4,'#c8d0ca');
  part(g,0,3,1,33,.38,4.5,wing);part(g,0,4.2,-10.1,12,.25,2.6,wing);
  part(g,0,6.4,-10.5,.32,6.5,3,base);
  for(const x of [-9,9]){part(g,x,2.45,2.7,2.2,2.2,5,'#596b73');part(g,x,1.2,4.6,.18,1.8,.14,'#d6d7d0');}
  for(const x of [-2.6,2.6])for(const z of [-7,7])part(g,x,.52,z,.85,1.1,1.1,'#303a3b');
  part(g,0,4.45,11,3.3,1.05,.12,'#3f6275');
 }else{
  part(g,0,1.85,0,1.6,1.65,13,base);part(g,0,2,7.2,1.1,1.05,2.5,'#87979e');
  part(g,0,2.2,1.15,11,.28,3.2,wing);part(g,0,2.2,-5.5,4.8,.2,1.5,wing);
  for(const x of [-.9,.9]){part(g,x,3.1,-5.7,.21,2.25,2,'#546772');part(g,x,.6,1,.2,1,.6,'#353e42');}
  part(g,0,2.95,4.2,1.25,.8,2.3,'#354d62');
 }
 g.userData.airportAmbient=true;g.name=cargo?'Aeroporto · grande aereo da trasporto':'Aeroporto · jet militare';return g;
}
function golfCart(){
 const g=new THREE.Group();part(g,0,.65,0,1.45,.22,2.3,'#e6e4d0');
 part(g,0,1.09,-.47,1.1,.75,.83,'#c8ceb9');part(g,0,1.02,.57,1.12,.14,.85,'#39434a');
 part(g,0,2.05,0,1.6,.12,2.25,'#d2c8a5');
 for(const x of [-.65,.65]){part(g,x,1.48,-.73,.08,1.1,.08,'#475453');part(g,x,1.48,.78,.08,1.1,.08,'#475453');
  for(const z of [-.79,.79])part(g,x,.35,z,.22,.65,.65,'#323d3f');}
 g.name='Aeroporto · golf cart';return g;
}
const heliFlight=[
 [0,0,0,0],[8,0,0,55],[33,830,990,145],[67,1700,1150,175],
 [105,900,-1050,160],[132,110,-700,95],[163,0,0,48],[176,0,0,0],[191,0,0,0]
];
function heliPose(t,index){
 const period=191,phase=((t+index*87)%period+period)%period;
 const i=Math.max(0,heliFlight.findIndex((p,j)=>j<heliFlight.length-1&&phase>=p[0]&&phase<=heliFlight[j+1][0]));
 const a=heliFlight[i],b=heliFlight[Math.min(i+1,heliFlight.length-1)],mix=(phase-a[0])/Math.max(.001,b[0]-a[0]);
 const anchor=index?{u:110,v:-365}:{u:105,v:385},sign=index?-1:1;
 return {u:anchor.u+(a[1]+(b[1]-a[1])*mix)*sign,v:anchor.v+(a[2]+(b[2]-a[2])*mix)*sign,
  altitude:a[3]+(b[3]-a[3])*mix,heading:Math.atan2((b[1]-a[1])*sign,(b[2]-a[2])*sign)};
}
const CART_ROUTES=[[[207,310],[207,535],[207,310]],[[207,-375],[207,-115],[207,-375]],[[203,145],[132,145],[132,80],[203,80],[203,145]]];
function routePosition(path,t,speed){
 const lengths=path.slice(1).map((p,i)=>Math.hypot(p[0]-path[i][0],p[1]-path[i][1]));
 const total=lengths.reduce((a,b)=>a+b,0),d=(t*speed)%total;let remaining=d;
 for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]){const fraction=remaining/Math.max(.001,lengths[i]),a=path[i],b=path[i+1];return {u:a[0]+(b[0]-a[0])*fraction,v:a[1]+(b[1]-a[1])*fraction,heading:Math.atan2(b[0]-a[0],b[1]-a[1])};}remaining-=lengths[i];}
 return {u:path[0][0],v:path[0][1],heading:0};
}
function airportDistance(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
const previousPopulate=ModernGameplay.prototype.populate;
const previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__airportAirTrafficV2){
 ModernGameplay.prototype.__airportAirTrafficV2=true;
 ModernGameplay.prototype.populate=function(...args){
  const result=previousPopulate.apply(this,args);
  this.airTraffic=createAirportTraffic();this.airTrafficVisual={planes:new Map(),helis:[],carts:[],guards:[],lastImpact:-Infinity};
  return result;
 };
 ModernGameplay.prototype.update=function(dt){
  previousUpdate.call(this,dt);
  const sim=this.airTraffic,visual=this.airTrafficVisual;
  if(!sim||!visual||!Number.isFinite(dt)||dt<=0)return;
  // The previous decorative flyover is superseded by physical traffic.
  if(this.airportOperations?.aircraft)this.airportOperations.aircraft.visible=false;
  tickAirportTraffic(sim,dt);
  const state=this.state,player=state.car?.spec?.aircraft?state.car:null;
  for(const a of sim.aircraft){
   const p=areaPoint(AIRPORT,a.u,a.v),ground=this.terrain.height(p.x,p.z),
    y=a.yAbove<.1?ground:this.terrain.elevation(p.x,p.z)+a.yAbove;
   let mesh=visual.planes.get(a.id);
   const visible=a.phase!=='wrecked'&&airportDistance(state,p)<2600;
   if(!mesh&&visible){mesh=aircraftModel(a.type);mesh.name='Traffico aeroporto · '+a.id;this.scene.add(mesh);visual.planes.set(a.id,mesh);}
   if(!mesh)continue;
   mesh.visible=visible;if(!visible)continue;
   mesh.position.set(p.x,y,p.z);mesh.rotation.y=AIRPORT.yaw+a.heading;
   const prop=mesh.userData?.propeller;if(prop)prop.rotation.z+=dt*30;
   if(player&&sim.time>=a.collisionAt&&sim.time>=visual.lastImpact+1.2){
    const horizontal=airportDistance(player,p),vertical=Math.abs((player.y??state.y)-y),
      clearance=Math.max(3,(player.spec.width+a.width)*.46),height=(player.spec.height+(a.type==='cargo'?7:3))*0.5+1.5;
    if(horizontal<clearance&&vertical<height){
     a.collisionAt=sim.time+4;visual.lastImpact=sim.time;
     if(Math.max(Math.abs(player.speed||0),a.speedNow)>14){
      destroyAirportAircraft(sim,a);mesh.visible=false;player.speed=0;player.health=0;
      state.health=0;if(typeof this.defeat==='function')this.defeat('Collisione fra aeromobili');
     }else{
      player.speed=0;player.health=state.health=Math.max(0,state.health-16);
      const back=1.8;player.x-=Math.sin(player.yaw)*back;player.z-=Math.cos(player.yaw)*back;
      state.x=player.x;state.z=player.z;this.pose(player);
      if(state.health<=0&&typeof this.defeat==='function')this.defeat('Collisione fra aeromobili');
     }
    }
   }
  }
  // Two airport-based helicopters with continuous map-wide, returning routes.
  for(let i=0;i<2;i++){
   let mesh=visual.helis[i];const f=heliPose(sim.time,i),p=areaPoint(AIRPORT,f.u,f.v),near=airportDistance(state,p)<2300;
   if(!mesh&&near){mesh=createSpecialVehicle(i?'levante':'falco');mesh.name=i?'Elicottero militare · circuito':'Elicottero civile · circuito';this.scene.add(mesh);visual.helis[i]=mesh;}
   if(!mesh)continue;
   mesh.visible=near;if(!near)continue;
   mesh.position.set(p.x,this.terrain.elevation(p.x,p.z)+f.altitude,p.z);mesh.rotation.y=AIRPORT.yaw+f.heading;
   if(mesh.userData.rotor)mesh.userData.rotor.rotation.y+=dt*22;if(mesh.userData.tailRotor)mesh.userData.tailRotor.rotation.x+=dt*29;
  }
  const nearAirport=airportDistance(state,AIRPORT)<900;
  for(let i=0;i<CART_ROUTES.length;i++){
   let mesh=visual.carts[i];if(!mesh&&nearAirport){mesh=golfCart();this.scene.add(mesh);visual.carts[i]=mesh;}
   if(!mesh)continue;mesh.visible=nearAirport;if(!nearAirport)continue;
   // Keep golf carts moving on established landside roads, not the runway.
   const loc=routePosition(CART_ROUTES[i],Math.max(0,sim.time-i*12),i===1?3.2:4.1),p=areaPoint(AIRPORT,loc.u,loc.v);
   if(airportDistance(state,p)<5)continue;
   mesh.position.set(p.x,this.terrain.height(p.x,p.z),p.z);mesh.rotation.y=AIRPORT.yaw+loc.heading;
  }
  const guardSpots=[[204,-370],[204,-342],[208,-310],[208,-275],[205,-205]];
  for(let i=0;i<guardSpots.length;i++){
   let actor=visual.guards[i];if(!actor&&nearAirport){actor=createPerson(i%2?'#6b7459':'#697b5d',310+i);actor.name='Personale militare · '+(i+1);this.scene.add(actor);visual.guards[i]=actor;}
   if(!actor)continue;actor.visible=nearAirport&&airportDistance(state,areaPoint(AIRPORT,...guardSpots[i]))<580;
   if(!actor.visible)continue;const p=areaPoint(AIRPORT,guardSpots[i][0]+Math.sin(sim.time*.28+i)*1.2,guardSpots[i][1]+Math.cos(sim.time*.28+i)*1.5);
   actor.position.set(p.x,this.terrain.height(p.x,p.z),p.z);actor.rotation.y=AIRPORT.yaw+Math.sin(sim.time*.16+i)*.5;
  }
 };
}
