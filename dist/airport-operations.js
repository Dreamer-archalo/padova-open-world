// Airport operations: one visual AI flyover, two ground staff and one real
// traffic actor confined to the existing landside service roads. This module
// augments the existing airport; it does not alter the runway, aircraft spawns,
// collision map, city roads, missions, races or other gameplay state.
import {ModernGameplay} from './modern-gameplay.js';
import {AIRPORT,areaPoint} from './gameplay-areas.js';
import {createSpecialVehicle} from './special-vehicles.js';
import {createPerson} from './world.js';
import {vehicleBlocked} from './movement.js';

const DRIVE=[[-360,210],[-263,210],[-185,210],[-124,210],[80,210],[145,210],[205,210],[250,205],[295,210],[410,210],[535,210]]
 .map(([v,u])=>areaPoint(AIRPORT,u,v));
const staffRoutes=[[[200,459],[200,482]],[[197,513],[197,529]]];
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const ground=(terrain,p)=>terrain.height(p.x,p.z);

// The flyover deliberately remains an independent, non-colliding AI visual.
// It can never take over one of the three user-enterable parked aircraft.
export function airportFlyoverPose(t,terrain){
 const period=120,phase=((t%period)+period)%period/period,v=-660+1320*phase;
 const p=areaPoint(AIRPORT,0,v),baseline=terrain.elevation(p.x,p.z);
 const altitude=25+38*Math.sin(Math.PI*phase);
 return {...p,y:baseline+altitude,yaw:AIRPORT.yaw,phase};
}

const originalPopulate=ModernGameplay.prototype.populate;
const originalUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__airportOperationsInstalled){
 ModernGameplay.prototype.__airportOperationsInstalled=true;
 ModernGameplay.prototype.populate=function(...args){
  const result=originalPopulate.apply(this,args);
  // Lazy instantiation: no extra actors/mesh cost when the player is elsewhere.
  this.airportOperations={aircraft:null,service:null,staff:[],time:0,leg:1};
  return result;
 };
 ModernGameplay.prototype.update=function(dt){
  originalUpdate.call(this,dt);
  const ops=this.airportOperations;if(!ops||!Number.isFinite(dt)||dt<=0)return;
  const distance=near(this.state,AIRPORT),active=distance<900;
  if(!active){if(ops.aircraft)ops.aircraft.visible=false;if(ops.service){ops.service.speed=0;ops.service.parked=true;ops.service.mesh.visible=false;}for(const actor of ops.staff)actor.mesh.visible=false;return;}
  if(!ops.aircraft){ops.aircraft=createSpecialVehicle('rondone');ops.aircraft.name='Aeroporto · traffico aereo automatico';ops.aircraft.userData.airportAmbient=true;this.scene.add(ops.aircraft);}
  const flight=airportFlyoverPose(this.state.elapsed,this.terrain);
  ops.aircraft.position.set(flight.x,flight.y,flight.z);ops.aircraft.rotation.y=flight.yaw;ops.aircraft.visible=true;
  if(!ops.service){
   const start=DRIVE[0],y=ground(this.terrain,start);
   // A failed clearance must never create an actor inside a building.
   const spec={width:2.1,length:4.8,height:2.2};
   if(!vehicleBlocked(start.x,start.z,AIRPORT.yaw,this.collision,spec,y)&&this.terrain.dry(start.x,start.z,1.1,y)){
    const car=this.addCar(start.x,start.z,AIRPORT.yaw,false,false,'utility');
    Object.assign(car,{y,missionUnit:true,airportService:true,parked:false,speed:0});
    ops.service=car;this.pose(car);
   }
  }
  for(let i=ops.staff.length;i<staffRoutes.length;i++){
   const [start]=staffRoutes[i],p=areaPoint(AIRPORT,...start),actor={mesh:createPerson(i?'#cbbf93':'#dfb74b',100+i),route:i};
   actor.mesh.name='Aeroporto · personale di terra '+(i+1);this.scene.add(actor.mesh);ops.staff.push(actor);
  }
  for(const actor of ops.staff){
   const [a,b]=staffRoutes[actor.route],period=32+actor.route*6,cycle=((this.state.elapsed+actor.route*7)%period)/period,
    blend=cycle<.5?cycle*2:2-cycle*2,u=a[0]+(b[0]-a[0])*blend,v=a[1]+(b[1]-a[1])*blend,p=areaPoint(AIRPORT,u,v);
   actor.mesh.position.set(p.x,ground(this.terrain,p),p.z);
   actor.mesh.rotation.y=AIRPORT.yaw+(cycle<.5?0:Math.PI);actor.mesh.visible=distance<550;
  }
  const c=ops.service;if(!c)return;
  c.mesh.visible=true;c.parked=false;
  // Fixed-frequency update: a stable upper bound on path queries independent
  // of display FPS, and no airport work when the player is outside 900 m.
  ops.time+=Math.min(dt,.1);if(ops.time<.08)return;
  const step=Math.min(ops.time,.12);ops.time=0;
  const target=DRIVE[ops.leg],remaining=near(c,target);
  if(remaining<3){if(ops.leg===DRIVE.length-1)ops.direction=-1;else if(ops.leg===0)ops.direction=1;ops.leg+=ops.direction||1;return;}
  const yaw=Math.atan2(target.x-c.x,target.z-c.z),speed=Math.min(5,remaining/step),move=Math.min(remaining,speed*step),
   nx=c.x+Math.sin(yaw)*move,nz=c.z+Math.cos(yaw)*move,y=this.terrain.height(nx,nz,c.y);
  if(near(this.state,{x:nx,z:nz})<9||vehicleBlocked(nx,nz,yaw,this.collision,c.spec,y)||!this.terrain.dry(nx,nz,c.spec.width/2,y)){
   c.speed=0;return;
  }
  Object.assign(c,{x:nx,z:nz,y,yaw,speed});this.pose(c);
 };
}
