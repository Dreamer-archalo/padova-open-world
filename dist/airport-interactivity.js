// Real E-interaction for the authored airport fleet. Install AFTER airport-traffic-enhancement.
// All actors use the existing car/aircraft controller, physics, damage and player input.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {SPECIAL_VEHICLES,createSpecialVehicle} from './special-vehicles.js';
import {VEHICLES} from './vehicles.js';
import {AIRPORT,areaPoint} from './gameplay-areas.js';
import {vehicleBlocked} from './movement.js';
import {createPerson} from './world.js';
import {installVehicleDamage} from './vehicle-damage.js';

const plane=(name,width,length,height,max,accel,steer)=>({name,width,length,height,max,boost:max,reverse:3,accel,brake:12,steer,wheelbase:Math.max(3,length*.4),aircraft:true,plane:true});
const CART={name:'Aeroporto · golf cart elettrico',width:1.65,length:2.7,height:2.15,wheelbase:1.7,max:8,boost:8,reverse:3,accel:4,brake:9,steer:1.45,mass:.55,armor:1};
const SPECS={
 'airport-cargo':plane('Trasporto pesante · cargo',33,27,8,85,5.4,.24),
 'airport-jet':plane('Jet militare · Falco supersonico',12,14,4.2,119,15,.8),
 'airport-interceptor':plane('Jet militare · intercettore',14,16,4.1,132,18,.96),
 'airport-strike':plane('Jet militare · attacco bimotore',17,17.5,4.7,111,13,.7),
 'airport-airliner':plane('Aereo passeggeri · Turbina',29,27,7.2,91,7,.38),
 'airport-trainer':plane('Addestratore civile · Ala',9.3,8.4,2.9,79,9,.8),
 'airport-golf':CART
};
Object.assign(SPECIAL_VEHICLES,SPECS);Object.assign(VEHICLES,SPECS);
const materials=new Map(),cube=new THREE.BoxGeometry();
function box(group,x,y,z,w,h,d,color){
 if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.71}));
 const m=new THREE.Mesh(cube,materials.get(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;group.add(m);return m;
}
function newPlaneModel(style){
 const g=new THREE.Group(),strike=style==='airport-strike',intercept=style==='airport-interceptor',airliner=style==='airport-airliner';
 if(style==='airport-trainer'){
  const original=createSpecialVehicle('libellula');g.add(original);
  box(g,0,1.75,1.15,.7,.16,2.15,'#df8c40');
  for(const side of [-1,1])box(g,side*3.3,1.28,.1,.4,.12,1.45,'#df8c40');
 }else if(airliner){
  box(g,0,3.5,0,4.2,4,25,'#e4e5db');box(g,0,3.75,12.3,3.1,2.7,3.4,'#e4e5db');
  box(g,0,3.3,1,29,.36,4.2,'#aebec9');box(g,0,5.2,-10.4,11,.28,3.1,'#aebec9');
  box(g,0,7,-11,.32,7.4,3,'#2f6d81');
  for(const side of [-1,1]){box(g,side*8.2,2.4,2.1,2.2,2.1,4.1,'#798f99');box(g,side*2.2,1.1,-7,.74,1.6,1.2,'#344148');}
  box(g,0,4.8,12.4,3.1,.6,.15,'#42657d');
  for(let z=-9;z<=9;z+=2.7)for(const side of [-1,1])box(g,side*2.12,4.5,z,.05,.3,.68,'#4e7287');
 }else{
  const base=intercept?'#8496a5':strike?'#55695d':'#62717e',wing=intercept?'#9daebb':strike?'#637c6b':'#8d9da6',span=strike?17:intercept?14:12;
  box(g,0,2.1,0,strike?2.4:1.8,1.8,strike?16:14,base);
  box(g,0,2.4,7.2,1.05,1,2.1,wing);
  box(g,0,2.2,.1,span,.3,strike?4.5:3.2,wing);
  box(g,0,2.4,-5.9,strike?7:5,.2,1.7,wing);
  for(const side of [-1,1]){
   box(g,side*(strike?1.15:.65),3.35,-5.2,.26,2.35,2.25,base);
   box(g,side*(strike?1.25:.85),1.55,-2.3,strike?1.15:.65,1.05,4.4,'#34434c');
   box(g,side*(strike?1.05:.6),.57,1.3,.22,1,.85,'#354044');
  }
  box(g,0,3.1,3.4,1.35,.75,2.2,'#385a70');
  if(intercept)for(const side of [-1,1])box(g,side*5.4,2.13,0,.4,.22,4.8,'#d6d6c7');
  if(strike)for(const side of [-1,1])box(g,side*5.9,1.8,-.35,.55,.5,3.3,'#475949');
 }
 g.name=SPECS[style].name;return g;
}
const EXTRA=[
 {style:'airport-interceptor',u:143,v:-185,yaw:AIRPORT.yaw},
 {style:'airport-strike',u:143,v:-365,yaw:AIRPORT.yaw},
 {style:'airport-airliner',u:103,v:485,yaw:AIRPORT.yaw},
 {style:'airport-trainer',u:126,v:285,yaw:AIRPORT.yaw}
];
const EXTRA_CART_ROUTES=[
 [[207,410],[134,410],[134,535],[207,535],[207,410]],
 [[207,-390],[207,-263],[132,-263],[132,-228],[132,-263],[207,-263],[207,-390]],
 [[207,295],[207,205],[132,145],[207,145],[207,205],[207,295]]
];
function sampleRoute(points,time,speed){
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
 const total=lengths.reduce((sum,n)=>sum+n,0);let d=((time*speed)%total+total)%total;
 for(let i=0;i<lengths.length;i++){
  if(d<=lengths[i]){const a=points[i],b=points[i+1],f=d/Math.max(lengths[i],.001);return {u:a[0]+(b[0]-a[0])*f,v:a[1]+(b[1]-a[1])*f,yaw:AIRPORT.yaw+Math.atan2(b[0]-a[0],b[1]-a[1])};}
  d-=lengths[i];
 }
 return {u:points[0][0],v:points[0][1],yaw:AIRPORT.yaw};
}
function installDriver(mesh,id){
 if(mesh.userData.airportDriver)return;
 const driver=createPerson('#3b5462',410+id);driver.name='Conducente golf cart';driver.scale.setScalar(.58);
 driver.position.set(-.25,.75,-.4);driver.rotation.y=0;mesh.add(driver);mesh.userData.airportDriver=driver;
}
function install(g,style,mesh,name,x,z,yaw,y){
 const c=g.addCar(x,z,yaw,false,true,style),old=c.mesh;
 g.scene.remove(old);c.mesh=mesh;c.name=name;c.y=y;c.yaw=yaw;c.missionUnit=true;c.speed=0;c.parked=true;
 c.damageVisual=null;installVehicleDamage(c);g.pose(c);return c;
}
const previousPopulate=ModernGameplay.prototype.populate,previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__airportInteractivityV3){
 ModernGameplay.prototype.__airportInteractivityV3=true;
 ModernGameplay.prototype.populate=function(...args){
  const result=previousPopulate.apply(this,args);
  this.interactiveAirport={planes:new Map(),carts:new Map(),extras:[],extraCarts:[],staff:[],ready:false};
  return result;
 };
 ModernGameplay.prototype.update=function(dt){
  previousUpdate.call(this,dt);
  const ops=this.interactiveAirport,sim=this.airTraffic,visual=this.airTrafficVisual;
  if(!ops||!sim||!visual)return;
  const state=this.state,near=Math.hypot(state.x-AIRPORT.x,state.z-AIRPORT.z)<1050;
  // Reuse the exact animated AI mesh as a registered, boardable native aircraft.
  // We never clone an AI visual onto an unrelated, non-interactive model.
  for(const a of sim.aircraft){
   let mesh=visual.planes.get(a.id),c=ops.planes.get(a.id);
   if(!c&&mesh?.visible&&a.phase!=='wrecked'){
    const style=a.type==='cargo'?'airport-cargo':a.type==='jet'?'airport-jet':a.type;
    if(!VEHICLES[style])continue;
    c=install(this,style,mesh,SPECS[style]?.name||VEHICLES[style].name,mesh.position.x,mesh.position.z,mesh.rotation.y,mesh.position.y);
    c.airportAI=a.id;ops.planes.set(a.id,c);
   }
   if(!c)continue;
   mesh=c.mesh;
   if(state.car===c){a.phase='claimed';a.collisionAt=Infinity;c.airportClaimed=true;c.parked=false;mesh.visible=true;this.pose(c);continue;}
   if(c.airportClaimed){c.parked=true;c.speed=0;mesh.visible=Math.hypot(c.x-state.x,c.z-state.z)<2600;this.pose(c);continue;}
   if(a.phase==='wrecked'){c.health=0;c.speed=0;mesh.visible=false;continue;}
   if(c.health<=0&&a.phase==='parked')c.health=100;
   c.x=mesh.position.x;c.z=mesh.position.z;c.y=mesh.position.y;c.yaw=mesh.rotation.y;
   c.speed=a.speedNow;c.parked=a.speedNow<.5;
  }
  // Two truly distinct military jet airframes and two further civilian types,
  // parked at verified airside pads and using the original E/plane controller.
  if(near&&!ops.ready){
   ops.ready=true;
   for(const item of EXTRA){
    const p=areaPoint(AIRPORT,item.u,item.v),y=this.terrain.height(p.x,p.z),spec=VEHICLES[item.style];
    if(vehicleBlocked(p.x,p.z,item.yaw,this.collision,spec,y)||!this.terrain.dry(p.x,p.z,spec.width/2,y))continue;
    const mesh=newPlaneModel(item.style);this.scene.add(mesh);
    const c=install(this,item.style,mesh,spec.name,p.x,p.z,item.yaw,y);
    c.airportClaimed=true;ops.extras.push(c);
   }
  }
  for(const c of ops.extras)if(c!==state.car){c.speed=0;c.parked=true;c.mesh.visible=Math.hypot(c.x-state.x,c.z-state.z)<1700;}
  // Convert the existing three moving carts to genuine vehicle actors with a
  // seated driver. No second, overlapping decorative cart is created.
  for(const [i,mesh] of visual.carts.entries()){
   if(!mesh)continue;let c=ops.carts.get(i);
   if(!c&&mesh.visible&&Math.hypot(mesh.position.x-AIRPORT.x,mesh.position.z-AIRPORT.z)<1100){
    installDriver(mesh,i);c=install(this,'airport-golf',mesh,'Golf cart aeroportuale · '+(i+1),mesh.position.x,mesh.position.z,mesh.rotation.y,mesh.position.y);
    c.airportCart=i;c.parked=false;ops.carts.set(i,c);
   }
   if(!c)continue;
   if(state.car===c)c.airportClaimed=true;
   if(c.airportClaimed){c.mesh.visible=true;this.pose(c);continue;}
   c.x=mesh.position.x;c.z=mesh.position.z;c.y=mesh.position.y;c.yaw=mesh.rotation.y;
   c.speed=mesh.visible?4:0;c.parked=!mesh.visible;
  }
  // Three extra carts use real dedicated roads; keep each actor stationary at
  // close range rather than phasing through the player's car.
  if(near&&ops.extraCarts.length===0&&visual.carts[0]){
   for(let i=0;i<EXTRA_CART_ROUTES.length;i++){
    const loc=sampleRoute(EXTRA_CART_ROUTES[i],sim.time+i*37,4.2),p=areaPoint(AIRPORT,loc.u,loc.v),y=this.terrain.height(p.x,p.z);
    if(vehicleBlocked(p.x,p.z,loc.yaw,this.collision,CART,y))continue;
    const mesh=visual.carts[0].clone(true);mesh.userData.airportDriver=null;installDriver(mesh,20+i);this.scene.add(mesh);
    const c=install(this,'airport-golf',mesh,'Golf cart aeroportuale · '+(i+4),p.x,p.z,loc.yaw,y);
    c.airportCartExtra=i;c.parked=false;ops.extraCarts.push(c);
   }
  }
  for(const c of ops.extraCarts){
   if(state.car===c)c.airportClaimed=true;
   if(c.airportClaimed){c.mesh.visible=true;this.pose(c);continue;}
   const loc=sampleRoute(EXTRA_CART_ROUTES[c.airportCartExtra],sim.time+c.airportCartExtra*37,4.2),p=areaPoint(AIRPORT,loc.u,loc.v),y=this.terrain.height(p.x,p.z);
   c.mesh.visible=near;if(!near){c.speed=0;c.parked=true;continue;}
   if(Math.hypot(p.x-state.x,p.z-state.z)<8||vehicleBlocked(p.x,p.z,loc.yaw,this.collision,CART,y)){
    c.speed=0;c.parked=true;continue;
   }
   Object.assign(c,{x:p.x,z:p.z,y,yaw:loc.yaw,speed:4.2,parked:false});this.pose(c);
  }
  // Distribute airside staff away from the road entrance. All positions are
  // checked against authored structures, rather than spawning through walls.
  const spots=[[184,540],[153,520],[157,465],[149,395],[186,335],[158,265],[200,178],[181,154],
   [202,65],[127,-105],[134,-190],[125,-307],[200,-345],[180,-410]];
  if(near&&ops.staff.length===0){
   for(const [i,[u,v]] of spots.entries()){
    const p=areaPoint(AIRPORT,u,v),y=this.terrain.height(p.x,p.z),spec={width:.65,length:.65,height:1.8};
    if(vehicleBlocked(p.x,p.z,AIRPORT.yaw,this.collision,spec,y)||!this.terrain.dry(p.x,p.z,.4,y))continue;
    const mesh=createPerson(i>8?'#647657':'#d7aa54',510+i);
    mesh.name=i>8?'Aeroporto · tecnico militare':'Aeroporto · personale di terra';this.scene.add(mesh);
    ops.staff.push({mesh,u,v,i});
   }
  }
  for(const actor of ops.staff){
   const p=areaPoint(AIRPORT,actor.u+Math.sin(sim.time*.3+actor.i)*.75,actor.v+Math.cos(sim.time*.3+actor.i)*.65);
   actor.mesh.visible=near&&Math.hypot(state.x-p.x,state.z-p.z)<590;
   if(actor.mesh.visible){actor.mesh.position.set(p.x,this.terrain.height(p.x,p.z),p.z);actor.mesh.rotation.y=AIRPORT.yaw+Math.sin(sim.time*.2+actor.i)*.4;}
  }
 };
}
