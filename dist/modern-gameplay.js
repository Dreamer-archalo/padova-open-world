import * as THREE from './vendor/three.module.js';
import {clamp,dist,angleDiff,roadRoute,nearestRoad} from './core.js';
import {vehicleBlocked} from './movement.js';
import {VEHICLES} from './vehicles.js';
import {Cannon,predictiveAim,staticHit} from './combat.js';
import {escapeRoute,followRoad,pursuitRoadPoint} from './chase-routing.js';
import {AIRPORT,VILLA,HOME,AIRPORT_GATE,insideArea,areaPoint,gameplaySpawns} from './gameplay-areas.js';

export class ModernGameplay {
 constructor(env){Object.assign(this,env);this.military=[];this.policeAir=[];this.nextMilitary=0;this.velocity={x:0,y:0,z:0};this.last=null;this.cannon=new Cannon(this.scene,this.terrain,this.collision,(...a)=>this.hit(...a));this.graceUntil=0;this.restockAt=0;this.roadblocks=[];this.nextRoadblock=35;this.wantedLevel=this.state.wanted||0;this.wantedHoldUntil=0;this.fiveStarAt=-Infinity;this.playerHitAt=0;}
 populate(){for(const p of gameplaySpawns()){const spec=VEHICLES[p.style],y=this.terrain.height(p.x,p.z);if(vehicleBlocked(p.x,p.z,p.yaw,this.collision,spec,y)||!this.terrain.dry(p.x,p.z,spec.width/2,y))throw new Error('Blocked airport spawn: '+p.style+' / '+p.name);
   const c=this.addCar(p.x,p.z,p.yaw,false,true,p.style);c.home={...p,y};c.fixedSpawn=true;c.name+=' · '+p.name;this.pose(c);
  }
 }
 retire(c){this.remove(c);for(const pool of [this.military,this.policeAir,this.roadblocks]){const i=pool.indexOf(c);if(i>=0)pool.splice(i,1);}}
 clearPoliceAir(){for(const c of [...this.policeAir])this.retire(c);this.policeAir.length=0;}
 clearEnemies(){for(const c of [...this.military])this.retire(c);this.military.length=0;this.clearPoliceAir();this.cannon.clear();this.nextMilitary=this.state.elapsed+8;this.fiveStarAt=-Infinity;}
 claim(c){if(c.hostile){c.hostile=false;this.military=this.military.filter(a=>a!==c);c.militarySurplus=true;}if(c.policeAir){c.policeAir=false;this.policeAir=this.policeAir.filter(a=>a!==c);}if(c.missionUnit)c.missionUnit=false;if(c.roadblock){c.roadblock=false;this.roadblocks=this.roadblocks.filter(a=>a!==c);}}
 findSpawn(style,min=120,max=350){const spec=VEHICLES[style],options=[],seen=new Set();
  for(const s of this.graph.index.near(this.state.x,this.state.z,max)){if(!s.connected||s.road.w<Math.max(7,spec.width+3)||!['primary','secondary','tertiary','trunk','motorway'].includes(s.road.k)||['no','private'].includes(s.road.access))continue;
   const a=this.graph.nodes[s.a],b=this.graph.nodes[s.b],length=dist(a,b),steps=Math.max(1,Math.ceil(length/35));for(let i=0;i<steps;i++){const u=(i+.5)/steps,x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u,key=Math.round(x)+','+Math.round(z);if(seen.has(key))continue;seen.add(key);const d=dist({x,z},this.state);if(d<min||d>max||Math.abs(angleDiff(Math.atan2(x-this.state.x,z-this.state.z),this.state.yaw))>2.55)continue;const yaw=Math.atan2(b.x-a.x,b.z-a.z)+(s.road.oneway===-1?Math.PI:0),y=this.terrain.roads.sample(s.road,x,z)+.05;options.push({x,z,yaw,y,score:d+(['primary','trunk','motorway'].includes(s.road.k)?-80:0)});}
  }
  options.sort((a,b)=>a.score-b.score);
  return options.find(p=>!insideArea(VILLA,p.x,p.z,35)&&this.terrain.dry(p.x,p.z,spec.width/2,p.y)&&!vehicleBlocked(p.x,p.z,p.yaw,this.collision,spec,p.y)&&!this.cars.some(c=>c.mesh.visible&&dist(c,p)<14));
 }
 paceWanted(){const s=this.state,raw=clamp(s.wanted||0,0,5);if(raw<this.wantedLevel){this.wantedLevel=raw;this.wantedHoldUntil=s.elapsed;}
  if(s.mission?.type==='escape'&&raw>=2&&this.wantedLevel<2){this.wantedLevel=2;this.wantedHoldUntil=s.elapsed+5;}
  else if(raw>this.wantedLevel&&(this.wantedLevel===0||s.elapsed>=this.wantedHoldUntil)){this.wantedLevel=Math.min(raw,this.wantedLevel+1);const delays=[0,3.5,5,6.5,8,10];this.wantedHoldUntil=s.elapsed+delays[this.wantedLevel];if(this.wantedLevel===5){this.fiveStarAt=s.elapsed;this.graceUntil=Math.max(this.graceUntil,s.elapsed+8);this.nextMilitary=Math.max(this.nextMilitary,s.elapsed+9);this.toast('5 STELLE · Hai qualche secondo per muoverti prima dell\'arrivo dei mezzi pesanti.',5);}}
  if(s.wanted!==this.wantedLevel)s.wanted=this.wantedLevel;
  const allowed=Math.min(5,this.wantedLevel+1);while(this.cops.length>allowed){const c=this.cops.at(-1);if(!c)break;this.remove(c);}
 }
 clearRoadblocks(){for(const c of [...this.roadblocks]){if(c===this.state.car){c.roadblock=false;c.routineCheck=false;c.missionUnit=false;continue;}this.retire(c);}this.roadblocks=[];}
 decorateRoadblock(c,index,routine=false){c.mesh.traverse(o=>{if(!o.isMesh||!o.material?.color)return;o.material=o.material.clone();if(o.material.color.getHexString()!=='202527')o.material.color.lerp(new THREE.Color(index?'#23394b':'#29465c'),.58);});const mat=new THREE.MeshBasicMaterial({color:index?'#ff4254':'#3a8dff'}),lamp=new THREE.Mesh(new THREE.BoxGeometry(.58,.14,.22),mat);lamp.position.set(0,c.spec.height+.12,-.05);lamp.userData.roadblockLamp=true;c.mesh.add(lamp);c.roadblockLamp=lamp;c.routineCheck=routine;}
 spawnRoadblock(routine=false){const p=this.findSpawn('sedan',routine?150:125,routine?330:275);if(!p)return false;const lateral=routine?2.75:1.45;for(const [i,side] of [-1,1].entries()){const x=p.x+Math.cos(p.yaw)*side*lateral,z=p.z-Math.sin(p.yaw)*side*lateral,y=this.terrain.height(x,z);if(!this.terrain.dry(x,z,VEHICLES.sedan.width/2,y))continue;const c=this.addCar(x,z,p.yaw,false,true,'sedan');Object.assign(c,{y,speed:0,parked:true,roadblock:true,routineCheck:routine,missionUnit:true,name:routine?'Polizia · Controllo stradale':'Polizia · Posto di blocco'});this.decorateRoadblock(c,i,routine);this.pose(c);this.roadblocks.push(c);}return this.roadblocks.length>0;}
 updateRoadblocks(){const s=this.state,pursuit=s.wanted>=3&&s.wanted<5&&s.elapsed>=this.graceUntil,routine=s.wanted===0&&s.elapsed>=this.graceUntil,mode=pursuit?'pursuit':routine?'routine':'none';this.roadblocks=this.roadblocks.filter(c=>c===s.car||this.cars.includes(c));for(const c of this.roadblocks)if(c.roadblockLamp)c.roadblockLamp.visible=Math.sin(s.elapsed*9+(c.x+c.z)*.01)>0;
  const lead=this.roadblocks.find(c=>c!==s.car),currentMode=lead?(lead.routineCheck?'routine':'pursuit'):'none';if(lead&&currentMode!==mode){this.clearRoadblocks();this.nextRoadblock=s.elapsed+(mode==='routine'?55:5);return;}if(mode==='none'){if(this.roadblocks.length)this.clearRoadblocks();return;}
  if(lead&&lead.routineCheck&&dist(lead,s)<22&&!lead.checkPassed){lead.checkPassed=true;if(Math.abs(s.speed)>13){this.raiseWanted(1);this.toast('Controllo stradale ignorato ad alta velocità · Polizia allertata.',4);}else this.toast('Controllo stradale · passa piano e prosegui.',2.5);}
  if(lead&&!lead.routineCheck&&dist(lead,s)<24&&Math.abs(s.speed)>18&&!lead.checkPassed){lead.checkPassed=true;this.raiseWanted(Math.min(5,s.wanted+1));this.toast('Posto di blocco forzato · livello di ricerca in aumento.',3.5);}
  const passed=lead&&Math.abs(angleDiff(Math.atan2(lead.x-s.x,lead.z-s.z),s.yaw))>2.35,tooFar=lead&&dist(lead,s)>430;if((passed||tooFar)&&s.elapsed>=this.nextRoadblock){this.clearRoadblocks();this.nextRoadblock=s.elapsed+(mode==='routine'?55:5);}
  if(!this.roadblocks.length&&s.elapsed>=this.nextRoadblock){if(this.spawnRoadblock(mode==='routine'))this.toast(mode==='routine'?'Controllo stradale della Polizia più avanti · passa lentamente.':'Posto di blocco della Polizia più avanti.',3.5);this.nextRoadblock=s.elapsed+(mode==='routine'?75:s.wanted>=4?18:30);}
 }
 decoratePoliceAir(c,index){const blue=new THREE.MeshBasicMaterial({color:'#3a8dff'}),red=new THREE.MeshBasicMaterial({color:'#ff4254'});for(const [side,mat] of [[-1,blue],[1,red]]){const lamp=new THREE.Mesh(new THREE.BoxGeometry(.24,.10,.18),mat);lamp.position.set(side*.28,c.spec.height*.55,.18);c.mesh.add(lamp);(c.airLights??=[]).push(lamp);}c.name='Polizia · Elicottero';c.policeAir=true;c.missionUnit=true;c.airIndex=index;}
 spawnPoliceAir(index=0){const s=this.state,angle=s.elapsed*.18+index*Math.PI,x=s.x+Math.cos(angle)*(95+index*18),z=s.z+Math.sin(angle)*(95+index*18);const c=this.addCar(x,z,0,false,false,'airone');this.decoratePoliceAir(c,index);c.y=Math.max(this.terrain.height(x,z)+45,s.y+42+index*9);c.speed=18;this.pose(c);this.policeAir.push(c);return c;}
 updatePoliceAir(dt){const s=this.state;if(s.wanted!==5){if(this.policeAir.length)this.clearPoliceAir();return;}const desired=s.elapsed-this.fiveStarAt>16?2:1;while(this.policeAir.length<desired)this.spawnPoliceAir(this.policeAir.length);for(const [i,c] of this.policeAir.entries()){const angle=s.elapsed*(.17+i*.025)+i*Math.PI,radius=78+i*22,tx=s.x+Math.cos(angle)*radius,tz=s.z+Math.sin(angle)*radius,ty=Math.max(this.terrain.height(tx,tz)+38,s.y+38+i*10),blend=1-Math.exp(-dt*.95);c.x+=(tx-c.x)*blend;c.z+=(tz-c.z)*blend;c.y+=(ty-c.y)*(1-Math.exp(-dt*1.3));c.yaw=Math.atan2(s.x-c.x,s.z-c.z);c.speed=20;c.mesh.userData.rotor&&(c.mesh.userData.rotor.rotation.y+=dt*24);c.mesh.userData.tailRotor&&(c.mesh.userData.tailRotor.rotation.x+=dt*30);if(c.airLights)for(const [j,l] of c.airLights.entries())l.visible=Math.sin(s.elapsed*12+j*Math.PI)>0;this.pose(c);}}
 spawnMilitary(){const p=this.findSpawn('tank');if(!p)return false;const c=this.addCar(p.x,p.z,p.yaw,false,false,'tank');Object.assign(c,{y:p.y,hostile:true,fireAt:this.state.elapsed+2.5,path:[],pathIndex:1,routeAt:0});this.military.push(c);this.pose(c);return true;}
 firePlayer(){const c=this.state.car;if(!c?.spec.tracked||this.state.health<=0||this.state.elapsed<(c.fireAt||0))return false;
  const origin={x:c.x,y:c.y+2.2,z:c.z};let target=null,range=200;
  for(const a of [...this.cars,...this.people,...this.cops]){if(a===c||a.health<=0||!a.mesh.visible)continue;const d=dist(a,c);if(d<7||d>=range||Math.abs(angleDiff(Math.atan2(a.x-c.x,a.z-c.z),c.yaw))>.085)continue;target=a;range=d;}
  const aim=target?predictiveAim(origin,{x:target.x,y:(target.y||0)+(target.spec?.height||1.8)*.55,z:target.z},{x:Math.sin(target.yaw)*(target.speed||0),y:0,z:Math.cos(target.yaw)*(target.speed||0)}):{x:Math.sin(c.yaw),y:-.02,z:Math.cos(c.yaw)};
  const turret=c.mesh.userData.turret;if(turret){turret.rotation.y=angleDiff(Math.atan2(aim.x,aim.z),c.yaw);turret.rotation.x=-Math.asin(aim.y);}
  const fired=this.cannon.fire(c,aim,this.state.elapsed);if(fired)this.raiseWanted(Math.min(5,this.state.wanted+1));return fired;
 }
 hit(target,owner,enemy){
  const state=this.state;if(target===state){if(state.elapsed<this.graceUntil||state.elapsed<this.playerHitAt)return;this.playerHitAt=state.elapsed+1.25;const damage=36*(state.car?.spec.armor||1);state.health=Math.max(0,state.health-damage);if(state.car)state.car.health=state.health;if(state.health<=0)this.defeat('Colpito dal carro armato');else this.toast('Impatto pesante · '+Math.ceil(state.health)+'% integrità. Muoviti!',2.5);return;}
  if(!target.spec){target.health=0;target.koUntil=state.elapsed+22;target.mesh.visible=false;target.speed=0;}
  else{target.health=Math.max(0,target.health-125*(target.spec.armor||1));if(target.health<=0){target.speed=0;target.parked=true;target.mesh.visible=false;target.destroyedUntil=state.elapsed+15;if(target.hostile||target.police)this.retire(target);}}
  if(!enemy&&owner===state.car)this.raiseWanted(Math.min(5,state.wanted+1));
 }
 startArmored(){const p=this.findSpawn('portavalori',140,450);if(!p)return null;const route=escapeRoute(p,this.state,this.graph);if(route.length<3)return null;const c=this.addCar(p.x,p.z,p.yaw,false,false,'portavalori');
  Object.assign(c,{y:p.y,speed:18,health:100,missionUnit:true,path:route,pathIndex:1,reroutes:0,routeAt:this.state.elapsed+16,captured:0});
  const target=route[1];c.yaw=Math.atan2(target.x-c.x,target.z-c.z);if(vehicleBlocked(c.x,c.z,c.yaw,this.collision,c.spec,c.y))c.yaw=p.yaw;
  this.pose(c);return c;
 }
 stopArmored(mission){const c=mission?.van;if(c&&c!==this.state.car)this.retire(c);}
 updateArmored(m,dt){const c=m.van;if(!c)return false;
  if(c===this.state.car){c.captured+=dt;return c.captured>=2.5;}
  const close=dist(this.state,c)<14&&Math.abs(this.state.y-c.y)<4;
  if(close&&Math.abs(this.state.speed)<6&&(c.health<=0||c.speed<2.5)){c.captured+=dt;if(c.captured>=2.5)return true;}else c.captured=0;
  m.target={x:c.x,z:c.z,name:'Portavalori'};
  if(c.health<=0)return false;
  if(this.state.elapsed>c.routeAt||c.pathIndex>=c.path.length||c.stuck>3.5){const route=escapeRoute(c,this.state,this.graph,++c.reroutes);if(route.length){c.path=route;c.pathIndex=1;}c.routeAt=this.state.elapsed+14;c.stuck=0;}
  const before={x:c.x,z:c.z};followRoad(c,dt,this.graph,this.terrain,this.collision,{max:44,accel:12,turnRate:2,traffic:this.cars.filter(a=>!a.hostile)});
  if(dist(before,c)<.01)c.blockedTime=(c.blockedTime||0)+dt;else c.blockedTime=0;
  if(c.blockedTime>9&&dist(c,this.state)>85){const n=this.safeRoad(c,c.spec,c);if(n){Object.assign(c,{x:n.x,z:n.z,y:n.y,yaw:n.yaw,speed:12,routeAt:0,blockedTime:0});this.forget(c);}}
  this.pose(c);return false;
 }
 update(dt){const s=this.state;this.paceWanted();
  if(this.last&&dist(this.last,s)<20){this.velocity.x=clamp((s.x-this.last.x)/dt,-130,130);this.velocity.y=clamp((s.y-this.last.y)/dt,-15,15);this.velocity.z=clamp((s.z-this.last.z)/dt,-130,130);}else this.velocity={x:0,y:0,z:0};this.last={x:s.x,y:s.y,z:s.z};
  this.updateRoadblocks();this.updatePoliceAir(dt);
  if(s.wanted<5&&this.military.length)this.clearEnemies();
  if(s.wanted===5&&s.elapsed>=this.nextMilitary&&s.elapsed>=this.graceUntil){const cap=s.elapsed-this.fiveStarAt>18?2:1;while(this.military.length<cap&&this.spawnMilitary()){}this.nextMilitary=s.elapsed+8;}
  for(const [i,c] of [...this.military].entries()){
   const d=dist(c,s);if(d>900){this.retire(c);continue;}
   if(s.elapsed>c.routeAt){c.path=roadRoute(c,pursuitRoadPoint(s,i,this.graph),this.graph);c.pathIndex=1;c.routeAt=s.elapsed+2+i*.3;}
   followRoad(c,dt,this.graph,this.terrain,this.collision,{max:17,accel:5,turnRate:.85,traffic:this.military});
   if(c.stuck>7&&d>95){const p=this.findSpawn('tank',140,360);if(p){Object.assign(c,p,{stuck:0,routeAt:0});this.forget(c);}}
   this.pose(c);
   const origin={x:c.x,y:c.y+2.2,z:c.z},aim=predictiveAim(origin,{x:s.x,y:s.y+(s.car?s.car.spec.height*.5:.9),z:s.z},this.velocity),yaw=Math.atan2(aim.x,aim.z),turret=c.mesh.userData.turret;
   if(turret){const goal=angleDiff(yaw,c.yaw);turret.rotation.y+=clamp(angleDiff(goal,turret.rotation.y),-4*dt,4*dt);turret.rotation.x=-Math.asin(aim.y);}
   const reach=150*aim.time+4.5,target={x:origin.x+aim.x*reach,y:origin.y+aim.y*reach,z:origin.z+aim.z*reach};
   if(d<330&&d>8&&Math.abs(angleDiff(yaw,c.yaw+(turret?.rotation.y||0)))<.035&&!staticHit(origin,target,this.collision).object)this.cannon.fire(c,aim,s.elapsed,true);
  }
  this.cannon.update(dt,s.elapsed,[s,...this.cars.filter(c=>c!==s.car),...this.people,...this.cops]);
  if(s.elapsed>this.restockAt){this.restockAt=s.elapsed+1;for(const c of [...this.cars]){
   if(c===s.car)continue;if(c.militarySurplus&&dist(c,s)>200){this.retire(c);continue;}
   if(c.fixedSpawn&&(c.destroyedUntil||c.abandonedAt)&&s.elapsed>(c.destroyedUntil||c.abandonedAt+15)&&dist(c,s)>70&&dist(c.home,s)>30){const p=c.home;if(this.cars.some(o=>o!==c&&o.mesh.visible&&dist(o,p)<12))continue;Object.assign(c,{x:p.x,z:p.z,y:p.y,yaw:p.yaw,speed:0,health:100,parked:true,destroyedUntil:0,abandonedAt:0});c.mesh.visible=true;this.pose(c);this.forget(c);}
  }}
 }
}
