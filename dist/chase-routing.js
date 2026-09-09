import {clamp,dist,angleDiff,roadRoute,nearestRoad} from './core.js';
import {vehicleBlocked} from './movement.js';
import {roadCorridor} from './modern-driving.js';

const major=r=>/^(primary|secondary|trunk|motorway)/.test(r.k);
export function escapeRoute(car,player,graph,attempt=0){
 const candidates=[],seen=new Set();
 for(const s of graph.index.near(car.x,car.z,1800)){if(!s.connected||!major(s.road)||s.road.w<7||['no','private'].includes(s.road.access))continue;
  for(const id of [s.a,s.b]){if(seen.has(id))continue;seen.add(id);const n=graph.nodes[id],d=dist(n,car);if(d<900||d>2300)continue;const away=dist(n,player),variation=Math.sin(id*3.7+attempt*1.9)*500;candidates.push({n,score:away+variation});}
 }
 candidates.sort((a,b)=>b.score-a.score);for(const c of candidates.slice(0,8)){const route=roadRoute(car,c.n,graph);if(route.length>2&&route.reduce((sum,p,i)=>sum+(i?dist(p,route[i-1]):0),0)>850)return route;}return [];
}
export function followRoad(car,dt,graph,terrain,collision,{max=32,accel=8,turnRate=1.7,traffic=[]}={}){
 let target=car.path[car.pathIndex];while(target&&dist(car,target)<Math.max(2.1,car.speed*.22)){car.pathIndex++;target=car.path[car.pathIndex];}
 if(!target){car.speed=Math.max(0,car.speed-car.spec.brake*dt);return false;}
 const gap=dist(car,target),goal=Math.atan2(target.x-car.x,target.z-car.z),diff=angleDiff(goal,car.yaw),after=car.path[car.pathIndex+1];
 const bend=after?Math.abs(angleDiff(Math.atan2(after.x-target.x,after.z-target.z),goal)):0;
 let desired=Math.abs(diff)>.65?6:Math.abs(diff)>.3?13:max;
 if(bend>.35&&gap<Math.max(14,car.speed*1.5))desired=Math.min(desired,Math.max(7,15-bend*5));
 for(const other of traffic){if(other===car||other.mesh?.visible===false||other.spec?.aircraft||Math.abs((other.y||0)-(car.y||0))>3)continue;const d=dist(car,other);if(d<Math.max(12,car.speed*.65)&&Math.abs(angleDiff(Math.atan2(other.x-car.x,other.z-car.z),car.yaw))<.5)desired=Math.min(desired,Math.max(0,(d-(car.spec.length+other.spec.length)/2-2)*1.5));}
 car.speed+=clamp(desired-car.speed,-car.spec.brake*dt,accel*dt);
 const yaw=car.yaw+clamp(diff,-turnRate*dt,turnRate*dt),steps=Math.max(1,Math.ceil(Math.abs(car.speed)*dt/.7));let moved=0;
 for(let i=0;i<steps;i++){const x=car.x+Math.sin(yaw)*car.speed*dt/steps,z=car.z+Math.cos(yaw)*car.speed*dt/steps,y=terrain.height(x,z,car.y);
  if(!roadCorridor(x,z,car,graph,terrain)||vehicleBlocked(x,z,yaw,collision,car.spec,y)||!terrain.dry(x,z,car.spec.width/2,y)){car.speed=0;break;}moved+=Math.hypot(x-car.x,z-car.z);car.x=x;car.z=z;car.y=y;
 }
 if(!vehicleBlocked(car.x,car.z,yaw,collision,car.spec,car.y))car.yaw=yaw;
 car.stuck=moved<.01?car.stuck+dt:0;
 // Short reverse to open a turn; no teleport through the player or scenery.
 if(car.stuck>1.2&&car.stuck<3){const x=car.x-Math.sin(car.yaw)*dt*3,z=car.z-Math.cos(car.yaw)*dt*3;if(roadCorridor(x,z,car,graph,terrain)&&!vehicleBlocked(x,z,car.yaw,collision,car.spec,car.y)){car.x=x;car.z=z;}}
 return true;
}
export function pursuitRoadPoint(player,index,graph){
 const lead=(index?1.8:.3)*Math.abs(player.speed),angle=player.yaw+(index?Math.PI/3:0),target={x:player.x+Math.sin(angle)*lead,z:player.z+Math.cos(angle)*lead};
 return nearestRoad(target,graph,true)||nearestRoad(player,graph,true)||player;
}
