// Gameplay refinement layered after dogfight V2: keep its HUD, aircraft and city systems.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VEHICLES} from './vehicles.js';
import {SPECIAL_VEHICLES} from './special-vehicles.js';
import {vehicleBlocked} from './movement.js';
import {destroyAirportAircraft} from './airport-air-traffic.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const military=c=>!!c&&['airport-jet','airport-interceptor','airport-strike','airport-blackbird'].includes(c.style);
const live=c=>!!c&&c.health>0&&c.mesh?.visible;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const targetPoint=c=>new THREE.Vector3(c.x,c.y+(c.spec?.height||2)*.5,c.z);

// The yellow scout helicopter uses metres/second internally, not km/h.
for(const spec of new Set([VEHICLES.falco,SPECIAL_VEHICLES.falco]))if(spec)Object.assign(spec,{max:220/3.6,boost:220/3.6,accel:14,brake:16});

// Dogfight V2 manages exactly "wanted" primary defenders. An independent wingman
// supplies the extra jet at every star without constantly creating/retiring actors.
export const totalWantedJets=stars=>clamp(Math.floor(stars||0),0,5)+(stars>0?1:0);
function spawnWingman(g){
 const s=g.state,side=Math.floor((g.confirmedAirKills||0)%2)?-1:1;
 const x=clamp(s.x+Math.sin(s.yaw)*210+Math.cos(s.yaw)*side*260,-5850,7120);
 const z=clamp(s.z+Math.cos(s.yaw)*210-Math.sin(s.yaw)*side*260,-6350,6100);
 const y=Math.max(s.y+55,g.terrain.elevation(x,z)+82),yaw=Math.atan2(s.x-x,s.z-z);
 const c=g.addCar(x,z,yaw,false,false,'airport-interceptor');
 Object.assign(c,{x,y,z,yaw,speed:62,health:100,parked:false,missionUnit:true,hostile:true,airDefender:true,extraDogfighter:true,fireAt:s.elapsed+4,name:'JET OSTILE · RINFORZO'});
 c.mesh.visible=true;g.pose(c);g.extraDogfighters=[c];return c;
}
function keepWingman(g){
 const s=g.state,combat=s.started&&s.mode==='car'&&military(s.car)&&s.wanted>0;
 g.extraDogfighters??=[];
 if(!combat){for(const c of g.extraDogfighters)if(g.cars.includes(c))g.retire(c);g.extraDogfighters=[];return;}
 g.extraDogfighters=g.extraDogfighters.filter(c=>live(c)&&g.cars.includes(c));
 if(!g.extraDogfighters.length)spawnWingman(g);
}

// Broad forward/side passes replace the old straight-line tail chase. Movement
// is applied after the legacy update; its per-frame movement is rolled back once.
function orbitJets(g,dt,prior){
 const s=g.state,jets=[...g.airDefenders||[],...g.extraDogfighters||[]].filter(live);
 const count=jets.length;if(!count)return;
 jets.forEach((c,i)=>{
  const old=prior.get(c);if(old)Object.assign(c,old);
  const phase=s.elapsed*.26+i*Math.PI*2/count+.5;
  const forward=200*Math.cos(phase),lateral=265*Math.sin(phase),sy=Math.sin(s.yaw),cy=Math.cos(s.yaw);
  const tx=s.x+sy*forward+cy*lateral,tz=s.z+cy*forward-sy*lateral;
  const dx=tx-c.x,dz=tz-c.z,wantedYaw=Math.atan2(dx,dz);
  c.yaw+=clamp(angle(wantedYaw,c.yaw),-1.05*dt,1.05*dt);
  const desired=clamp(Math.abs(s.speed)*.72+13,44,92);
  c.speed+=clamp(desired-c.speed,-28*dt,24*dt);
  c.x=clamp(c.x+Math.sin(c.yaw)*c.speed*dt,-5880,7180);
  c.z=clamp(c.z+Math.cos(c.yaw)*c.speed*dt,-6380,6150);
  const altitude=Math.max(s.y+24+11*(i%3),g.terrain.elevation(c.x,c.z)+68);
  c.y+=clamp(altitude-c.y,-26*dt,26*dt);
  g.pose(c);c.mesh.rotation.x=-.065;
 });
}

// Predict the target's future position, but never silently switch a locked
// missile to a different aircraft. High-turn steering operates before the
// original collision integrator so the corrected path can actually hit.
export function steerGuidedMissile(m,dt){
 if(!live(m.target)||!m.dir||!m.p)return false;
 const c=m.target,origin=new THREE.Vector3(m.p.x,m.p.y,m.p.z);
 const travel=clamp(origin.distanceTo(targetPoint(c))/Math.max(90,m.speed||125),0,.85);
 const lead=clamp(travel*.46,0,.34),direction=targetPoint(c);
 direction.x+=Math.sin(c.yaw||0)*(c.speed||0)*lead;
 direction.z+=Math.cos(c.yaw||0)*(c.speed||0)*lead;
 direction.sub(origin).normalize();
 // Arcade homing: quick course correction, including jets turning across the reticle.
 m.dir.lerp(direction,clamp(dt*10,0,.70)).normalize();
 m.speed=Math.max(m.speed||125,155);
 return true;
}

// Blast dynamics are intentionally bounded: nearby vehicles and NPCs take
// actual damage, move radially, then settle under gravity without wall clipping.
const BLAST_RADIUS=92,BLAST_GRAVITY=18;
export function blastDamage(distance,radius=BLAST_RADIUS){return distance>=radius?0:Math.round(240*(1-distance/radius)**.8);}
export function applyMegaBlast(g,position,owner){
 const p=new THREE.Vector3(position.x,position.y,position.z),s=g.state;
 g.megaBlastBodies??=[];const victims=new Set(),now=s.elapsed;
 for(const c of [...g.cars,...g.cops]){
  if(c===owner||!live(c)||victims.has(c))continue;victims.add(c);
  const d=dist({x:c.x,y:c.y+c.spec.height*.5,z:c.z},p),raw=blastDamage(d);if(!raw)continue;
  const impact=raw*(c.spec.armor??1);
  if(c.airDefender){
   // The older special-missile effect already registers a hit on primary jets.
   // A close direct mega blast supplies a second hit; bonus jets need their own.
   if(c.extraDogfighter||d<34)g.hit(c,owner,false);
   continue;
  }
  c.health=Math.max(0,c.health-impact);
  const radial=new THREE.Vector3(c.x-p.x,0,c.z-p.z),horizontal=Math.max(1,radial.length());
  c.knockX=clamp(radial.x/horizontal*raw*.19,-39,39);
  c.knockZ=clamp(radial.z/horizontal*raw*.19,-39,39);
  c.spin=radial.x>=0?1.5:-1.5;
  if(c.health<=0){
   c.speed=0;c.parked=true;c.destroyedUntil=now+18;
   if(c.airportAI){const aircraft=g.airTraffic?.aircraft.find(a=>a.id===c.airportAI);if(aircraft)destroyAirportAircraft(g.airTraffic,aircraft);}
   if(d<78&&g.megaBlastBodies.length<16){
    g.megaBlastBodies.push({actor:c,mesh:c.mesh,vx:c.knockX*.65,vz:c.knockZ*.65,vy:Math.min(18,4+raw*.07),age:0,ttl:2.0,car:true});
   }else c.mesh.visible=false;
  }
 }
 for(const actor of g.people||[]){
  if(!actor.mesh?.visible||actor.health<=0)continue;
  const d=dist({x:actor.x,y:actor.y+.9,z:actor.z},p),raw=blastDamage(d);if(!raw)continue;
  actor.health=Math.max(0,actor.health-raw);actor.koUntil=now+25;
  const direction=new THREE.Vector3(actor.x-p.x,0,actor.z-p.z);if(direction.lengthSq()<.01)direction.set(1,0,0);direction.normalize();
  if(g.megaBlastBodies.length<16){
   const ghost=actor.mesh.clone(true);ghost.visible=true;g.scene.add(ghost);
   ghost.position.set(actor.x,actor.y,actor.z);actor.mesh.visible=false;
   g.megaBlastBodies.push({actor,mesh:ghost,vx:direction.x*clamp(raw*.18,4,26),vz:direction.z*clamp(raw*.18,4,26),vy:clamp(raw*.09,4,17),age:0,ttl:2.6,car:false});
  }else actor.mesh.visible=false;
 }
 return victims.size;
}
function updateBlastBodies(g,dt){
 if(!g.megaBlastBodies?.length)return;
 for(const b of [...g.megaBlastBodies]){
  b.age+=dt;b.vy-=BLAST_GRAVITY*dt;
  const actor=b.actor,nx=actor.x+b.vx*dt,nz=actor.z+b.vz*dt;
  const nextY=(actor.y||0)+b.vy*dt,ground=g.terrain.height(nx,nz,nextY);
  const blocked=vehicleBlocked(nx,nz,actor.yaw||0,g.collision,b.car?actor.spec:{width:.55,length:.55,height:1.6},Math.max(nextY,ground));
  if(!blocked){actor.x=nx;actor.z=nz;}else{b.vx=0;b.vz=0;}
  actor.y=Math.max(g.terrain.height(actor.x,actor.z,actor.y),nextY);
  if(actor.y<=g.terrain.height(actor.x,actor.z,actor.y)+.02){b.vy=0;b.vx*=Math.exp(-dt*8);b.vz*=Math.exp(-dt*8);}
  else{b.vx*=Math.exp(-dt*.5);b.vz*=Math.exp(-dt*.5);}
  b.mesh.position.set(actor.x,actor.y,actor.z);
  b.mesh.rotation.z+=dt*(b.car?1.5:3);
  if(b.age>=b.ttl){
   if(!b.car)g.scene.remove(b.mesh);else{b.mesh.visible=false;actor.parked=true;actor.knockX=actor.knockZ=0;}
   g.megaBlastBodies.splice(g.megaBlastBodies.indexOf(b),1);
  }
 }
}
function improveCivilianHud(){
 if(typeof document==='undefined'||document.getElementById('airportCivilHudOverride'))return;
 const css=document.createElement('style');css.id='airportCivilHudOverride';
 css.textContent='body[data-flight-active="true"][data-flight-military="false"] #playingUI .hud.driving{display:block!important}body[data-flight-active="true"][data-flight-military="false"] #playingUI .hud.minimap{display:block!important}';
 document.head.appendChild(css);
}
function statusHud(g){
 if(typeof document==='undefined')return;
 improveCivilianHud();const s=g.state,c=s.car,combat=s.started&&s.mode==='car'&&military(c)&&!s.paused;
 if(!combat)return;
 const total=totalWantedJets(s.wanted),number=[...g.airDefenders||[],...g.extraDogfighters||[]].filter(live).length;
 const enemies=document.getElementById('fcEnemies');if(enemies)enemies.textContent='JET OSTILI · '+number+'/'+total;
 // The large, existing cockpit speed readout is explicitly labelled KM/H.
 const speed=document.getElementById('fcSpeed');if(speed)speed.textContent=String(Math.round(Math.abs(s.speed)*3.6));
 const canvas=document.getElementById('flightRadar');if(canvas&&!canvas.hidden&&g.extraDogfighters?.length){
  const ctx=canvas.getContext('2d');ctx.fillStyle='#ff6d74';
  for(const c of g.extraDogfighters){if(!live(c))continue;
   const dx=c.x-s.x,dz=c.z-s.z,right=dx*Math.cos(s.yaw)-dz*Math.sin(s.yaw),ahead=dx*Math.sin(s.yaw)+dz*Math.cos(s.yaw);
   ctx.beginPath();ctx.arc(clamp(160+right*136/1050,18,302),clamp(160-ahead*136/1050,18,302),7,0,Math.PI*2);ctx.fill();
  }
 }
}
const populate=ModernGameplay.prototype.populate,update=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__airportFlightRefinement){
 ModernGameplay.prototype.__airportFlightRefinement=true;
 ModernGameplay.prototype.populate=function(...args){const result=populate.apply(this,args);this.extraDogfighters=[];this.megaBlastBodies=[];improveCivilianHud();return result;};
 ModernGameplay.prototype.update=function(dt){
  const s=this.state,prior=new Map(),before=[...this.airportMissiles||[]].filter(m=>m.special);
  if(s.mode==='car'&&military(s.car))for(const c of this.airDefenders||[])if(live(c))prior.set(c,{x:c.x,y:c.y,z:c.z,yaw:c.yaw,speed:c.speed});
  for(const m of this.airportMissiles||[])if(m.owner===s.car&&!m.special)steerGuidedMissile(m,dt);
  update.call(this,dt);
  if(!s.started||!Number.isFinite(dt)||dt<=0)return;
  keepWingman(this);
  if(s.mode==='car'&&military(s.car)&&s.wanted>0)orbitJets(this,Math.min(dt,.12),prior);
  // The old explosion visual fires as normal; add gameplay damage exactly once.
  for(const m of before)if(!this.airportMissiles.includes(m)&&m.life<6.1&&!m.megaDamageDone){m.megaDamageDone=true;applyMegaBlast(this,m.mesh.position,m.owner);}
  updateBlastBodies(this,Math.min(dt,.12));
  statusHud(this);
 };
}
