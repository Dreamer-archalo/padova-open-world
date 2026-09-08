import {clamp,dist,nearestRoad,nearestOnSegment,angleDiff} from './core.js';
import {vehicleBlocked} from './movement.js';

export function updateTurbo(car,speed,dt){
 car.turboTime=car.style==='cinquecento'&&speed>=car.spec.critical?(car.turboTime||0)+dt:0;
 return {remaining:car.turboTime?Math.max(0,Math.ceil(6-car.turboTime-1e-8)):null,explode:car.turboTime>=6-1e-8};
}
export function helicopterStep(actor,input,dt,terrain,collision){
 const spec=actor.spec||actor.car.spec,ground=terrain.height(actor.x,actor.z,actor.y),wasY=actor.y;
 actor.speed+=clamp((input.forward<0?-spec.reverse:input.forward*spec.max)-actor.speed,-spec.brake*dt,spec.accel*dt);
 actor.yaw+=input.turn*spec.steer*dt;
 const climb=input.up?8:input.down?-6:0;actor.vy=(actor.vy||0)+(climb-(actor.vy||0))*(1-Math.exp(-4*dt));
 let ny=clamp(actor.y+actor.vy*dt,ground,terrain.elevation(actor.x,actor.z)+180);
 const count=Math.max(1,Math.ceil(Math.abs(actor.speed)*dt/.5));
 for(let i=0;i<count;i++){
  const x=clamp(actor.x+Math.sin(actor.yaw)*actor.speed*dt/count,-5970,7250),z=clamp(actor.z+Math.cos(actor.yaw)*actor.speed*dt/count,-6480,6230);
  const base=terrain.height(x,z,ny),wet=!terrain.dry(x,z,2,ny);
  if(vehicleBlocked(x,z,actor.yaw,collision,spec,Math.min(wasY,ny))||ny<base-.2||wet&&ny<terrain.waterHeight(x,z)+3){actor.speed=0;break;}
  actor.x=x;actor.z=z;
 }
 if(vehicleBlocked(actor.x,actor.z,actor.yaw,collision,spec,ny)){ny=wasY;actor.vy=0;}
 if(!terrain.dry(actor.x,actor.z,2,ny))ny=Math.max(ny,terrain.waterHeight(actor.x,actor.z)+3);
 actor.y=ny;if(ny<=ground+.02)actor.vy=0;
 return actor;
}
export function helicopterPads(terrain,collision,spec){
 const anchors=[{name:'Aeroporto',x:-2140,z:1100},{name:'Stadio',x:-1620,z:-3230},{name:'Industriale est',x:3600,z:1800},{name:'Periferia sud',x:-300,z:3600}],pads=[];
 for(const a of anchors){let found;for(let radius=0;radius<=240&&!found;radius+=20)for(let i=0;i<16;i++){
  const x=a.x+Math.cos(i*Math.PI/8)*radius,z=a.z+Math.sin(i*Math.PI/8)*radius,y=terrain.height(x,z);
  if(!terrain.dry(x,z,8)||terrain.roads.candidates(x,z,8).length||vehicleBlocked(x,z,0,collision,{...spec,width:12,length:12,height:12},y))continue;
  if([[7,0],[-7,0],[0,7],[0,-7]].some(([dx,dz])=>Math.abs(terrain.height(x+dx,z+dz)-y)>.4))continue;
  found={name:a.name,x,z,y,yaw:0};break;
 }if(found)pads.push(found);}return pads;
}
export function roadCorridor(x,z,car,graph,terrain){
 const near=nearestRoad({x,z},graph,true);if(!near||near.d>Math.max(.25,(near.segment.road.w-car.spec.width)/2))return false;
 const y=terrain.roads.sample(near.segment.road,x,z)+.05;return Math.abs(y-(car.y??y))<1.4&&terrain.dry(x,z,car.spec.width/2,y);
}
// Pursuit targets anticipate motion and distribute patrols along the player's route.
export function pursuitTarget(player,index,graph){const lead=[0,.6,1.3,2][index%4],d=clamp(Math.abs(player.speed)*lead,0,95);const near=nearestRoad({x:player.x+Math.sin(player.yaw)*d,z:player.z+Math.cos(player.yaw)*d},graph,true);return near||player;}
export function pedestrianIntent(p,time,actors,player,signals,graph){
 const profile=p.behavior||['destination','stroll','idle','cross','wait','group','runner','wander','avoid','poi'][p.seed%10];
 let speed=profile==='runner'?2.8:profile==='stroll'?.7:profile==='idle'||profile==='poi'?0:1.25;
 const cycle=(time+p.seed*2.1)%20;if(profile==='wait'&&cycle<9||profile==='group'&&cycle<4)speed=0;
 let yaw=p.yaw,crossing=false;if((profile==='destination'||profile==='poi')&&p.destination){const d=dist(p,p.destination);if(d>1.5){yaw=Math.atan2(p.destination.x-p.x,p.destination.z-p.z);speed=1.2;}else speed=0;}
 if(profile==='cross'&&p.road&&p.road.w<13){
  if(!p.crossGoal&&cycle<3)p.crossGoal={x:p.anchor.x-Math.cos(p.roadYaw)*p.side*(p.road.w+2.5),z:p.anchor.z+Math.sin(p.roadYaw)*p.side*(p.road.w+2.5)};
  if(p.crossGoal){const busy=actors.some(c=>c.mesh.visible&&Math.abs(c.speed)>1&&dist(c,p)<Math.max(12,Math.abs(c.speed)*2));if(busy)speed=0;else{crossing=true;yaw=Math.atan2(p.crossGoal.x-p.x,p.crossGoal.z-p.z);speed=1.4;}
   if(dist(p,p.crossGoal)<.6){p.anchor={...p.crossGoal};p.crossGoal=null;p.side*=-1;p.at=time+12;}
  }
 }
 const threat=actors.find(c=>c.mesh.visible&&Math.abs(c.speed)>3&&Math.abs((c.y||0)-(p.y||0))<3&&dist(c,p)<9);
 if(threat){speed=3.4;yaw=Math.atan2(p.x-threat.x,p.z-threat.z);crossing=false;}
 else if(dist(p,player)<2){speed=1.8;yaw=Math.atan2(p.x-player.x,p.z-player.z);}
 else if(profile==='wander')yaw=p.roadYaw+Math.sin(time*.22+p.seed)*.5;
 else if(profile==='group')yaw=p.roadYaw;
 return {speed,yaw,crossing,profile};
}
