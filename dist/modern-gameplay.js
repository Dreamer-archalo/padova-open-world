import {clamp,dist,angleDiff,roadRoute,nearestRoad} from './core.js';
import {vehicleBlocked} from './movement.js';
import {VEHICLES} from './vehicles.js';
import {Cannon,predictiveAim,staticHit} from './combat.js';
import {escapeRoute,followRoad,pursuitRoadPoint} from './chase-routing.js';
import {AIRPORT,VILLA,HOME,AIRPORT_GATE,insideArea,areaPoint,gameplaySpawns} from './gameplay-areas.js';

export class ModernGameplay {
 constructor(env){Object.assign(this,env);this.military=[];this.nextMilitary=0;this.velocity={x:0,y:0,z:0};this.last=null;this.cannon=new Cannon(this.scene,this.terrain,this.collision,(...a)=>this.hit(...a));this.graceUntil=0;this.restockAt=0;}
 populate(){for(const p of gameplaySpawns()){const spec=VEHICLES[p.style],y=this.terrain.height(p.x,p.z);if(vehicleBlocked(p.x,p.z,p.yaw,this.collision,spec,y)||!this.terrain.dry(p.x,p.z,spec.width/2,y))throw new Error('Blocked airport spawn: '+p.style+' / '+p.name);
   const c=this.addCar(p.x,p.z,p.yaw,false,true,p.style);c.home={...p,y};c.fixedSpawn=true;c.name+=' · '+p.name;this.pose(c);
  }
 }
 retire(c){this.remove(c);const i=this.military.indexOf(c);if(i>=0)this.military.splice(i,1);}
 clearEnemies(){for(const c of [...this.military])this.retire(c);this.military.length=0;this.cannon.clear();this.nextMilitary=this.state.elapsed+8;}
 claim(c){if(c.hostile){c.hostile=false;this.military=this.military.filter(a=>a!==c);c.militarySurplus=true;}if(c.missionUnit)c.missionUnit=false;}
 findSpawn(style,min=120,max=350){const spec=VEHICLES[style],options=[],seen=new Set();
  for(const s of this.graph.index.near(this.state.x,this.state.z,max)){if(!s.connected||s.road.w<Math.max(7,spec.width+3)||!['primary','secondary','tertiary','trunk','motorway'].includes(s.road.k)||['no','private'].includes(s.road.access))continue;
   const a=this.graph.nodes[s.a],b=this.graph.nodes[s.b],length=dist(a,b),steps=Math.max(1,Math.ceil(length/35));for(let i=0;i<steps;i++){const u=(i+.5)/steps,x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u,key=Math.round(x)+','+Math.round(z);if(seen.has(key))continue;seen.add(key);const d=dist({x,z},this.state);if(d<min||d>max)continue;const yaw=Math.atan2(b.x-a.x,b.z-a.z)+(s.road.oneway===-1?Math.PI:0),y=this.terrain.roads.sample(s.road,x,z)+.05;options.push({x,z,yaw,y,score:d+(['primary','trunk','motorway'].includes(s.road.k)?-80:0)});}
  }
  options.sort((a,b)=>a.score-b.score);
  return options.find(p=>!insideArea(VILLA,p.x,p.z,35)&&this.terrain.dry(p.x,p.z,spec.width/2,p.y)&&!vehicleBlocked(p.x,p.z,p.yaw,this.collision,spec,p.y)&&!this.cars.some(c=>c.mesh.visible&&dist(c,p)<14));
 }
 spawnMilitary(){const p=this.findSpawn('tank');if(!p)return false;const c=this.addCar(p.x,p.z,p.yaw,false,false,'tank');Object.assign(c,{y:p.y,hostile:true,fireAt:this.state.elapsed+1.1,path:[],pathIndex:1,routeAt:0});this.military.push(c);this.pose(c);return true;}
 firePlayer(){const c=this.state.car;if(!c?.spec.tracked||this.state.health<=0||this.state.elapsed<(c.fireAt||0))return false;
  const origin={x:c.x,y:c.y+2.2,z:c.z};let target=null,range=200;
  // Small vertical/forward aim assistance lets the barrel hit a low city car.
  // It never picks targets behind the tank; scenery still blocks the swept shot.
  for(const a of [...this.cars,...this.people,...this.cops]){if(a===c||a.health<=0||!a.mesh.visible)continue;const d=dist(a,c);if(d<7||d>=range||Math.abs(angleDiff(Math.atan2(a.x-c.x,a.z-c.z),c.yaw))>.085)continue;target=a;range=d;}
  const aim=target?predictiveAim(origin,{x:target.x,y:(target.y||0)+(target.spec?.height||1.8)*.55,z:target.z},{x:Math.sin(target.yaw)*(target.speed||0),y:0,z:Math.cos(target.yaw)*(target.speed||0)}):{x:Math.sin(c.yaw),y:-.02,z:Math.cos(c.yaw)};
  const turret=c.mesh.userData.turret;if(turret){turret.rotation.y=angleDiff(Math.atan2(aim.x,aim.z),c.yaw);turret.rotation.x=-Math.asin(aim.y);}
  const fired=this.cannon.fire(c,aim,this.state.elapsed);if(fired)this.raiseWanted(Math.min(5,this.state.wanted+1));return fired;
 }
 hit(target,owner,enemy){
  const state=this.state;if(target===state){if(state.elapsed<this.graceUntil)return;state.health=Math.max(0,state.health-125*(state.car?.spec.armor||1));if(state.car)state.car.health=state.health;if(state.health<=0)this.defeat('Colpito dal carro armato');else this.toast('Impatto! Cerca una copertura.',2);return;}
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
  // Pin/disable it and hold nearby. Merely driving alongside a fast van cannot win.
  if(close&&Math.abs(this.state.speed)<6&&(c.health<=0||c.speed<2.5)){c.captured+=dt;if(c.captured>=2.5)return true;}else c.captured=0;
  m.target={x:c.x,z:c.z,name:'Portavalori'};
  if(c.health<=0)return false;
  if(this.state.elapsed>c.routeAt||c.pathIndex>=c.path.length||c.stuck>3.5){const route=escapeRoute(c,this.state,this.graph,++c.reroutes);if(route.length){c.path=route;c.pathIndex=1;}c.routeAt=this.state.elapsed+14;c.stuck=0;}
  const before={x:c.x,z:c.z};followRoad(c,dt,this.graph,this.terrain,this.collision,{max:44,accel:12,turnRate:2,traffic:this.cars.filter(a=>!a.hostile)});
  if(dist(before,c)<.01)c.blockedTime=(c.blockedTime||0)+dt;else c.blockedTime=0;
  // Recover only out of the player's immediate view/interaction range. Nearby
  // interception stays valid and is never defeated by a teleport.
  if(c.blockedTime>9&&dist(c,this.state)>85){const n=this.safeRoad(c,c.spec,c);if(n){Object.assign(c,{x:n.x,z:n.z,y:n.y,yaw:n.yaw,speed:12,routeAt:0,blockedTime:0});this.forget(c);}}
  this.pose(c);return false;
 }
 update(dt){const s=this.state;
  if(this.last&&dist(this.last,s)<20){this.velocity.x=clamp((s.x-this.last.x)/dt,-130,130);this.velocity.y=clamp((s.y-this.last.y)/dt,-15,15);this.velocity.z=clamp((s.z-this.last.z)/dt,-130,130);}else this.velocity={x:0,y:0,z:0};this.last={x:s.x,y:s.y,z:s.z};
  if(s.wanted<5&&this.military.length)this.clearEnemies();
  if(s.wanted===5&&s.elapsed>=this.nextMilitary&&s.elapsed>=this.graceUntil){while(this.military.length<2&&this.spawnMilitary()){}this.nextMilitary=s.elapsed+8;}
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
  // Only check sleeping static vehicles once a second. No rotor, flight or AI
  // updates for parked aircraft; abandoned/destroyed ones return when out of view.
  if(s.elapsed>this.restockAt){this.restockAt=s.elapsed+1;for(const c of [...this.cars]){
   if(c===s.car)continue;if(c.militarySurplus&&dist(c,s)>200){this.retire(c);continue;}
   if(c.fixedSpawn&&(c.destroyedUntil||c.abandonedAt)&&s.elapsed>(c.destroyedUntil||c.abandonedAt+15)&&dist(c,s)>70&&dist(c.home,s)>30){const p=c.home;if(this.cars.some(o=>o!==c&&o.mesh.visible&&dist(o,p)<12))continue;Object.assign(c,{x:p.x,z:p.z,y:p.y,yaw:p.yaw,speed:0,health:100,parked:true,destroyedUntil:0,abandonedAt:0});c.mesh.visible=true;this.pose(c);this.forget(c);}
  }}
 }
}
