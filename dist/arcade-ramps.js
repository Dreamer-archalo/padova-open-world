import {vehicleFootprint,vehicleBlocked} from './movement.js';
import {SpatialIndex} from './core.js';

// Four optional diversions on clear outer shoulders. Selection follows actual
// guardrails and excludes junctions, bridges, water and occupied landing areas.
export function arcadeRamps(terrain,barriers,collision,structures=[]){
 const ramps=[],width=3.4,length=10,rise=1.8;
 const obstacles=new SpatialIndex(60);for(const b of structures)if(b.solid!==false&&!['guardrail','median'].includes(b.kind))obstacles.add(b,b.minX,b.minZ,b.maxX,b.maxZ);
 const rails=new SpatialIndex(60);for(const b of barriers)rails.add(b,b.minX,b.minZ,b.maxX,b.maxZ);
 for(const b of terrain.motorwayAudit?.rampSites||[]){
  if(ramps.length>=4)break;
  const originalYaw=b.yaw,forward=originalYaw+(b.road.oneway===-1?Math.PI:0),normal={x:Math.cos(originalYaw)*b.side,z:-Math.sin(originalYaw)*b.side};
  const direction=Math.sign(Math.cos(forward)*normal.x-Math.sin(forward)*normal.z)||1,yaw=forward+direction*.55,s=Math.sin(yaw),c=Math.cos(yaw),end={x:b.x+normal.x*2.2,z:b.z+normal.z*2.2},x=end.x-s*length/2,z=end.z-c*length/2;
  const p=vehicleFootprint(x,z,yaw,width,length),cornerY=p.map(q=>terrain.height(...q)),topY=cornerY.map((y,i)=>y+(i>1?rise:0));
  if(Math.max(...cornerY)-Math.min(...cornerY)>.65||p.some(q=>terrain.waterDistance(...q)<12))continue;
  let clear=true;
  for(let at=-12;at<=55;at+=2){const px=x+s*at,pz=z+c*at,y=terrain.height(px,pz);if(terrain.waterDistance(px,pz)<8||vehicleBlocked(px,pz,yaw,collision,{width:3.8,length:5,height:3},y)){clear=false;break;}}
  // Do not launch toward a second barrier near the expected landing zone. A
  // close rail just after the lip is harmless because the ballistic arc clears it.
  for(let at=22;clear&&at<=50;at+=2){const px=x+s*at,pz=z+c*at,y=terrain.height(px,pz);if(vehicleBlocked(px,pz,yaw,rails,{width:3.8,length:5,height:2},y))clear=false;}
  if(!clear||vehicleBlocked(x,z,yaw,obstacles,{width,length,height:1.8},Math.min(...cornerY)))continue;
  const xs=p.map(q=>q[0]),zs=p.map(q=>q[1]);ramps.push({kind:'arcade-ramp',name:'Salto laterale',x,z,yaw,width,length,rise,p,cornerY,topY,y:Math.min(...cornerY),h:Math.max(...topY)-Math.min(...cornerY),solid:false,color:'#b08b4b',minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)});
 }
 terrain.arcadeRamps=ramps;return ramps;
}
