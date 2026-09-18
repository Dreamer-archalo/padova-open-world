// Native, boardable airport aircraft and land vehicles; loaded after air traffic.
// No global controller, collision, city traffic or terrain monkey patches.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {SPECIAL_VEHICLES,createSpecialVehicle} from './special-vehicles.js';
import {VEHICLES} from './vehicles.js';
import {AIRPORT,areaPoint} from './gameplay-areas.js';
import {vehicleBlocked} from './movement.js';
import {createPerson} from './world.js';
import {installVehicleDamage} from './vehicle-damage.js';

const plane=(name,width,length,height,max,accel,steer)=>({name,width,length,height,max,boost:max,reverse:3,accel,brake:12,steer,wheelbase:Math.max(3,length*.4),aircraft:true,plane:true});
const SPECS={
 'airport-cargo':plane('Trasporto pesante · cargo',33,27,8,85,5.4,.24),
 'airport-jet':plane('Jet militare · caccia',12,14,4.2,119,15,.8),
 'airport-interceptor':plane('Jet militare · intercettore',14,16,4.1,132,18,.96),
 'airport-strike':plane('Jet militare · attacco bimotore',17,17.5,4.7,111,13,.7),
 'airport-airliner':plane('Aereo passeggeri · Turbina',29,27,7.2,91,7,.38),
 'airport-trainer':plane('Addestratore civile · Ala',9.3,8.4,2.9,79,9,.8),
 'airport-golf':{name:'Aeroporto · golf cart elettrico',width:1.65,length:2.7,height:2.15,wheelbase:1.7,max:8,boost:8,reverse:3,accel:4,brake:9,steer:1.45,mass:.55,armor:1}
};
Object.assign(SPECIAL_VEHICLES,SPECS);Object.assign(VEHICLES,SPECS);
const cube=new THREE.BoxGeometry(),materials=new Map();
function part(g,x,y,z,w,h,d,color){
 if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.73}));
 const mesh=new THREE.Mesh(cube,materials.get(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);
 mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh;
}
function aircraftModel(style){
 const g=new THREE.Group(),intercept=style==='airport-interceptor',strike=style==='airport-strike',liner=style==='airport-airliner';
 if(style==='airport-trainer'){
  g.add(createSpecialVehicle('libellula'));
  part(g,0,1.76,1.1,.65,.13,2,'#df8c40');
  for(const side of [-1,1])part(g,side*3.2,1.2,0,.35,.12,1.3,'#df8c40');
 }else if(liner){
  part(g,0,3.5,0,4.2,4,25,'#e4e5db');part(g,0,3.75,12.3,3.1,2.7,3.4,'#e4e5db');
  part(g,0,3.3,1,29,.36,4.2,'#aebec9');part(g,0,5.2,-10.4,11,.28,3.1,'#aebec9');
  part(g,0,7,-11,.32,7.4,3,'#2f6d81');part(g,0,4.8,12.4,3.1,.6,.15,'#42657d');
  for(const side of [-1,1]){
   part(g,side*8.2,2.4,2.1,2.2,2.1,4.1,'#798f99');part(g,side*2.2,1.1,-7,.74,1.6,1.2,'#344148');
   for(let z=-9;z<=9;z+=2.7)part(g,side*2.12,4.5,z,.05,.3,.68,'#4e7287');
  }
 }else{
  const base=intercept?'#8496a5':strike?'#55695d':'#62717e',wing=intercept?'#9daebb':strike?'#637c6b':'#8d9da6';
  part(g,0,2.1,0,strike?2.4:1.8,1.8,strike?16:14,base);
  part(g,0,2.4,7.2,1.05,1,2.1,wing);part(g,0,2.2,.1,strike?17:intercept?14:12,.3,strike?4.5:3.2,wing);
  part(g,0,2.4,-5.9,strike?7:5,.2,1.7,wing);part(g,0,3.1,3.4,1.35,.75,2.2,'#385a70');
  for(const side of [-1,1]){
   part(g,side*(strike?1.15:.65),3.35,-5.2,.26,2.35,2.25,base);
   part(g,side*(strike?1.25:.85),1.55,-2.3,strike?1.15:.65,1.05,4.4,'#34434c');
   part(g,side*(strike?1.05:.6),.57,1.3,.22,1,.85,'#354044');
   if(intercept)part(g,side*5.4,2.13,0,.4,.22,4.8,'#d6d6c7');
   if(strike)part(g,side*5.9,1.8,-.35,.55,.5,3.3,'#475949');
  }
 }
 g.name=SPECS[style].name;return g;
}
const EXTRA=[
 ['airport-interceptor',143,-185],['airport-strike',143,-365],
 ['airport-airliner',103,485],['airport-trainer',126,285]
];
const CART_ROUTES=[
 [[207,310],[207,535],[207,310]],
 [[207,-375],[207,-115],[207,-375]],
 [[203,145],[132,145],[132,80],[203,80],[203,145]],
 [[207,410],[134,410],[134,535],[207,535],[207,410]],
 [[207,-390],[207,-263],[132,-263],[132,-228],[132,-263],[207,-263],[207,-390]],
 [[207,295],[207,205],[207,145],[132,145],[207,145],[207,205],[207,295]]
];
function routePose(route,t,speed){
 const lengths=route.slice(1).map((p,i)=>Math.hypot(p[0]-route[i][0],p[1]-route[i][1]));
 const total=lengths.reduce((a,b)=>a+b,0);let left=((t*speed)%total+total)%total;
 for(let i=0;i<lengths.length;i++){
  if(left<=lengths[i]){const a=route[i],b=route[i+1],f=left/Math.max(.01,lengths[i]);
   return {u:a[0]+(b[0]-a[0])*f,v:a[1]+(b[1]-a[1])*f,yaw:AIRPORT.yaw+Math.atan2(b[0]-a[0],b[1]-a[1])};}
  left-=lengths[i];
 }
 return {u:route[0][0],v:route[0][1],yaw:AIRPORT.yaw};
}
function driver(mesh,index){
 // A boolean in userData is important: Three.js clones userData as JSON and
 // storing an Object3D there would create a circular reference on cart clones.
 if(mesh.userData.airportDriverSeat)return;
 const person=createPerson('#385a69',610+index);person.name='airport-cart-driver';
 person.scale.setScalar(.58);person.position.set(-.25,.75,-.4);
 mesh.add(person);mesh.userData.airportDriverSeat=true;
}
function register(g,style,mesh,x,z,yaw,y,label){
 const car=g.addCar(x,z,yaw,false,true,style),old=car.mesh;
 g.scene.remove(old);car.mesh=mesh;car.y=y;car.yaw=yaw;car.name=label||SPECS[style]?.name||VEHICLES[style].name;
 car.missionUnit=true;car.parked=true;car.speed=0;car.damageVisual=null;
 installVehicleDamage(car);g.pose(car);return car;
}
const previousPopulate=ModernGameplay.prototype.populate,previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__airportInteractivityV4){
 ModernGameplay.prototype.__airportInteractivityV4=true;
 ModernGameplay.prototype.populate=function(...args){
  const result=previousPopulate.apply(this,args);
  this.interactiveAirport={planes:new Map(),carts:new Map(),extras:[],staff:[],extrasReady:false,cartsReady:false,staffReady:false};
  return result;
 };
 ModernGameplay.prototype.update=function(dt){
  const sim=this.airTraffic,player=this.state.car;
  // Protect the VERY FIRST player frame after E: the ambient collision loop
  // runs inside previousUpdate, before this wrapper reaches its own AI loop.
  if(player?.airportAI&&sim){const own=sim.aircraft.find(a=>a.id===player.airportAI);if(own){own.phase='claimed';own.collisionAt=Infinity;}}
  previousUpdate.call(this,dt);
  const ops=this.interactiveAirport,visual=this.airTrafficVisual;
  if(!ops||!sim||!visual||!Number.isFinite(dt)||dt<=0)return;
  const s=this.state,near=Math.hypot(s.x-AIRPORT.x,s.z-AIRPORT.z)<1050;
  for(const a of sim.aircraft){
   let mesh=visual.planes.get(a.id),car=ops.planes.get(a.id);
   if(!car&&mesh?.visible&&a.phase!=='wrecked'){
    const style=a.type==='cargo'?'airport-cargo':a.type==='jet'?'airport-jet':a.type;
    if(!VEHICLES[style])continue;
    car=register(this,style,mesh,mesh.position.x,mesh.position.z,mesh.rotation.y,mesh.position.y,VEHICLES[style].name);
    car.airportAI=a.id;ops.planes.set(a.id,car);
   }
   if(!car)continue;
   if(s.car===car){a.phase='claimed';a.collisionAt=Infinity;car.airportClaimed=true;car.parked=false;car.mesh.visible=true;this.pose(car);continue;}
   if(car.airportClaimed){car.speed=0;car.parked=true;car.mesh.visible=Math.hypot(car.x-s.x,car.z-s.z)<2600;this.pose(car);continue;}
   if(a.phase==='wrecked'){car.health=0;car.speed=0;car.mesh.visible=false;continue;}
   if(car.health<=0&&a.phase==='parked')car.health=100;
   car.x=mesh.position.x;car.z=mesh.position.z;car.y=mesh.position.y;
   car.yaw=a.phase==='parked'?AIRPORT.yaw-Math.PI/2:mesh.rotation.y;
   car.speed=a.speedNow;car.parked=a.speedNow<.5;
   if(a.phase==='parked')this.pose(car);
  }
  if(near&&!ops.extrasReady){
   ops.extrasReady=true;
   for(const [style,u,v] of EXTRA){
    const p=areaPoint(AIRPORT,u,v),y=this.terrain.height(p.x,p.z),yaw=AIRPORT.yaw-Math.PI/2,spec=VEHICLES[style];
    if(vehicleBlocked(p.x,p.z,yaw,this.collision,spec,y)||!this.terrain.dry(p.x,p.z,spec.width/2,y))continue;
    const mesh=aircraftModel(style);this.scene.add(mesh);
    const car=register(this,style,mesh,p.x,p.z,yaw,y,spec.name);
    car.airportClaimed=true;ops.extras.push(car);
   }
  }
  for(const car of ops.extras)if(car!==s.car){car.speed=0;car.parked=true;car.mesh.visible=Math.hypot(car.x-s.x,car.z-s.z)<1700;}
  // Convert all three existing scenic carts into genuine cars. The exact same
  // mesh is used for animation, collision, E boarding and the visible driver.
  for(const [i,mesh] of visual.carts.entries()){
   if(!mesh)continue;let car=ops.carts.get(i);
   if(!car&&mesh.visible&&Math.hypot(mesh.position.x-AIRPORT.x,mesh.position.z-AIRPORT.z)<1100){
    driver(mesh,i);car=register(this,'airport-golf',mesh,mesh.position.x,mesh.position.z,mesh.rotation.y,mesh.position.y,'Golf cart aeroportuale · '+(i+1));
    car.airportCart=i;car.airportClock=Math.max(0,sim.time-i*12);ops.carts.set(i,car);
   }
   if(!car)continue;
   if(s.car===car)car.airportClaimed=true;
   if(car.airportClaimed){car.mesh.visible=true;this.pose(car);continue;}
   updateCart(this,car,CART_ROUTES[i],s,near,dt,ops);
  }
  if(near&&!ops.cartsReady&&visual.carts[0]){
   ops.cartsReady=true;
   for(let i=3;i<CART_ROUTES.length;i++){
    const loc=routePose(CART_ROUTES[i],sim.time+i*13,4),p=areaPoint(AIRPORT,loc.u,loc.v),y=this.terrain.height(p.x,p.z);
    if(vehicleBlocked(p.x,p.z,loc.yaw,this.collision,SPECS['airport-golf'],y))continue;
    const mesh=visual.carts[0].clone(true);driver(mesh,i);this.scene.add(mesh);
    const car=register(this,'airport-golf',mesh,p.x,p.z,loc.yaw,y,'Golf cart aeroportuale · '+(i+1));
    car.airportCart=i;car.airportClock=sim.time+i*13;ops.carts.set(i,car);
   }
  }
  for(const [i,car] of ops.carts)if(i>=3){
   if(s.car===car)car.airportClaimed=true;
   if(car.airportClaimed){car.mesh.visible=true;this.pose(car);continue;}
   updateCart(this,car,CART_ROUTES[i],s,near,dt,ops);
  }
  const spots=[[184,540],[153,520],[157,465],[149,395],[186,335],[158,265],[200,178],[181,154],
   [202,65],[127,-105],[134,-190],[125,-307],[200,-345],[180,-410]];
  if(near&&!ops.staffReady){
   ops.staffReady=true;const cap=s.quality==='hyper'?7:s.quality==='performance'?10:spots.length;
   for(const [i,[u,v]] of spots.entries()){
    if(ops.staff.length>=cap)break;
    const p=areaPoint(AIRPORT,u,v),y=this.terrain.height(p.x,p.z),spec={width:.65,length:.65,height:1.8};
    if(vehicleBlocked(p.x,p.z,AIRPORT.yaw,this.collision,spec,y)||!this.terrain.dry(p.x,p.z,.4,y))continue;
    const mesh=createPerson(i>8?'#647657':'#d7aa54',510+i);
    mesh.name=i>8?'Aeroporto · tecnico militare':'Aeroporto · personale di terra';this.scene.add(mesh);ops.staff.push({mesh,u,v,i});
   }
  }
  for(const person of ops.staff){
   const p=areaPoint(AIRPORT,person.u+Math.sin(sim.time*.3+person.i)*.75,person.v+Math.cos(sim.time*.3+person.i)*.65);
   person.mesh.visible=near&&Math.hypot(s.x-p.x,s.z-p.z)<590;
   if(person.mesh.visible){person.mesh.position.set(p.x,this.terrain.height(p.x,p.z),p.z);person.mesh.rotation.y=AIRPORT.yaw+Math.sin(sim.time*.2+person.i)*.4;}
  }
 };
}
function updateCart(game,car,path,state,near,dt,ops){
 car.mesh.visible=near;if(!near){car.speed=0;car.parked=true;return;}
 const elapsed=car.airportClock+Math.min(dt,.12),loc=routePose(path,elapsed,4),p=areaPoint(AIRPORT,loc.u,loc.v),y=game.terrain.height(p.x,p.z);
 const playerNear=Math.hypot(state.x-p.x,state.z-p.z)<7;
 const carNear=[...ops.carts.values()].some(other=>other!==car&&other.mesh.visible&&Math.hypot(other.x-p.x,other.z-p.z)<3.7);
 if(playerNear||carNear||vehicleBlocked(p.x,p.z,loc.yaw,game.collision,car.spec,y)||!game.terrain.dry(p.x,p.z,.8,y)){
  car.speed=0;car.parked=true;game.pose(car);return;
 }
 car.airportClock=elapsed;Object.assign(car,{x:p.x,z:p.z,y,yaw:loc.yaw,speed:4,parked:false});game.pose(car);
}
