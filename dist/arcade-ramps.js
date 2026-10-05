import {vehicleFootprint,vehicleBlocked} from './movement.js';
import {SpatialIndex} from './core.js';
import {AIRPORT,areaPoint} from './gameplay-areas.js';

// Optional diversions on clear outer shoulders. Selection follows actual
// guardrails and excludes junctions, bridges, water and occupied landing areas.
export function arcadeRamps(terrain,barriers,collision,structures=[]){
 const ramps=[],width=3.4,length=10,rise=1.8;
 const obstacles=new SpatialIndex(60);for(const b of structures)if(b.solid!==false&&!['guardrail','median'].includes(b.kind))obstacles.add(b,b.minX,b.minZ,b.maxX,b.maxZ);
 const rails=new SpatialIndex(60);for(const b of barriers)rails.add(b,b.minX,b.minZ,b.maxX,b.maxZ);
 const siteRamp=(b,yaw,name,target=null)=>{
  const originalYaw=b.yaw,normal={x:Math.cos(originalYaw)*b.side,z:-Math.sin(originalYaw)*b.side};
  const s=Math.sin(yaw),c=Math.cos(yaw),end={x:b.x+normal.x*2.2,z:b.z+normal.z*2.2},x=end.x-s*length/2,z=end.z-c*length/2;
  const p=vehicleFootprint(x,z,yaw,width,length),cornerY=p.map(q=>terrain.height(...q)),topY=cornerY.map((y,i)=>y+(i>1?rise:0));
  if(Math.max(...cornerY)-Math.min(...cornerY)>.65||p.some(q=>terrain.waterDistance(...q)<12))return null;
  let clear=true;
  for(let at=-12;at<=(target?length/2+2:55);at+=2){const px=x+s*at,pz=z+c*at,y=terrain.height(px,pz);if(terrain.waterDistance(px,pz)<8||vehicleBlocked(px,pz,yaw,collision,{width:3.8,length:5,height:3},y)){clear=false;break;}}
  // Guardrails join the collision world after ramp placement. Reject a site
  // if the approach spawn is blocked, then inspect barriers beyond the lip.
  for(const at of [-12,-11,-10]){if(!clear)break;const px=x+s*at,pz=z+c*at,y=terrain.height(px,pz);if(vehicleBlocked(px,pz,yaw,rails,{width:1.9,length:4.2,height:1.6},y))clear=false;}
  if(target){const px=target.x,pz=target.z,y=terrain.height(px,pz);
   if(terrain.waterDistance(px,pz)<8||vehicleBlocked(px,pz,yaw,collision,{width:3.8,length:5,height:3},y)||vehicleBlocked(px,pz,yaw,rails,{width:3.8,length:5,height:2},y))clear=false;
  }else for(let at=22;clear&&at<=50;at+=2){const px=x+s*at,pz=z+c*at,y=terrain.height(px,pz);if(vehicleBlocked(px,pz,yaw,rails,{width:3.8,length:5,height:2},y))clear=false;}
  if(!clear||vehicleBlocked(x,z,yaw,obstacles,{width,length,height:1.8},Math.min(...cornerY)))return null;
  const xs=p.map(q=>q[0]),zs=p.map(q=>q[1]),behind=length/2+4.6;
  return {kind:'arcade-ramp',name,x,z,yaw,width,length,rise,p,cornerY,topY,y:Math.min(...cornerY),h:Math.max(...topY)-Math.min(...cornerY),solid:false,color:target?'#d97835':'#b08b4b',minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),target:target&&{x:target.x,z:target.z,road:target.road.n||target.road.k},boostPad:{x:x-s*behind,z:z-c*behind,yaw,width:width*.9,length:4.6}};
 };
 for(const b of terrain.motorwayAudit?.rampSites||[]){
  if(ramps.length>=10)break;
  const forward=b.yaw+(b.road.oneway===-1?Math.PI:0),direction=Math.sign(Math.cos(forward)*Math.cos(b.yaw)*b.side+Math.sin(forward)*Math.sin(b.yaw)*b.side)||1;
  const r=siteRamp(b,forward+direction*.55,'Salto laterale');if(r)ramps.push(r);
 }
 // A few lateral launches point at an existing, dry road rather than empty
 // scenery. The target must be driveable at its own height and have a clear
 // landing footprint; the launch and the receiving lane are real map geometry.
 for(const b of terrain.motorwayAudit?.rampSites||[]){
  if(ramps.filter(r=>r.target).length>=3)break;
  if(ramps.some(r=>Math.hypot(r.x-b.x,r.z-b.z)<350))continue;
  const forward=b.yaw+(b.road.oneway===-1?Math.PI:0),direction=Math.sign(Math.cos(forward)*Math.cos(b.yaw)*b.side+Math.sin(forward)*Math.sin(b.yaw)*b.side)||1;
  let chosen=null;
  for(const angle of [.4,.55,.7,.85])for(const flight of [35,42,50,58]){
   const yaw=forward+direction*angle,x=b.x+Math.sin(yaw)*flight,z=b.z+Math.cos(yaw)*flight,y=terrain.height(x,z);
   const road=terrain.roads.candidates(x,z,3).find(s=>s.road!==b.road&&/motorway|trunk|primary|secondary/.test(s.road.k)&&s.d<s.road.w/2-1&&Math.abs(s.height-y)<.8);
   if(!road)continue;const target={x,z,road:road.road},r=siteRamp(b,yaw,'Salto verso '+(road.road.n||'raccordo'),target);
   if(r){chosen=r;break;}
  }
  if(chosen)ramps.push(chosen);
 }
 // Airport stunt ramps share the SAME surface, ground-contact interpolation,
 // ballistic jump and city collision code as the established motorway ramps.
 // Only use sites with an actual dry, unobstructed approach and landing.
 const airportWidth=3.7,airportLength=12,airportRise=1.9,yaw=AIRPORT.yaw,s=Math.sin(yaw),c=Math.cos(yaw);
 let north=false,south=false;
 for(const [u,v] of [[182,278],[171,276],[183,-511],[175,-507],[168,260],[180,-522]]){
  if(v>0&&north||v<0&&south)continue;
  // All three northern slots fail a swept four-wheel approach/landing. Keep
  // the validated southern cargo launch until a clear northern site is mapped.
  if(v>0)continue;
  const at=areaPoint(AIRPORT,u,v),x=at.x,z=at.z;
  const p=vehicleFootprint(x,z,yaw,airportWidth,airportLength),cornerY=p.map(q=>terrain.height(...q));
  if(Math.max(...cornerY)-Math.min(...cornerY)>.4||p.some(q=>!terrain.dry(q[0],q[1],1)))continue;
  let clear=!vehicleBlocked(x,z,yaw,collision,{width:airportWidth,length:airportLength,height:1.9},Math.min(...cornerY))&&!vehicleBlocked(x,z,yaw,obstacles,{width:airportWidth,length:airportLength,height:1.9},Math.min(...cornerY));
  for(let ahead=-17;clear&&ahead<=37;ahead+=3){
   const px=x+s*ahead,pz=z+c*ahead,y=terrain.height(px,pz);
   if(!terrain.dry(px,pz,2,y)||vehicleBlocked(px,pz,yaw,collision,{width:3.7,length:3,height:2},y))clear=false;
  }
  if(!clear)continue;
  const topY=cornerY.map((h,i)=>h+(i>1?airportRise:0)),xs=p.map(q=>q[0]),zs=p.map(q=>q[1]);
  ramps.push({kind:'arcade-ramp',name:v>0?'Aeroporto · rampa cargo nord':'Aeroporto · rampa cargo sud',x,z,yaw,width:airportWidth,length:airportLength,rise:airportRise,p,cornerY,topY,y:Math.min(...cornerY),h:Math.max(...topY)-Math.min(...cornerY),solid:false,color:'#c0a04f',minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)});
  if(v>0)north=true;else south=true;
 }
 const decoration=(kind,x,z,y,yaw,w,d,h,color)=>{const p=vehicleFootprint(x,z,yaw,w,d),xs=p.map(q=>q[0]),zs=p.map(q=>q[1]);return {kind,x,z,y,yaw,p,cornerY:p.map(()=>y),topY:p.map(()=>y+h),h,solid:false,color,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};};
 const visuals=[];
 for(const r of ramps.filter(r=>r.kind==='arcade-ramp'&&r.boostPad)){
  const pad=r.boostPad,y=terrain.height(pad.x,pad.z)+.045;
  visuals.push(decoration('ramp-boost-pad',pad.x,pad.z,y,r.yaw,pad.width,pad.length,.045,'#39d6e4'));
  if(!r.target)continue;
  const {x,z}=r.target,base=terrain.height(x,z),half=4.15;
  for(const side of [-1,1])visuals.push(decoration('jump-gate-post',x+Math.cos(r.yaw)*side*half,z-Math.sin(r.yaw)*side*half,base,r.yaw,.28,.38,4.25,'#f2b23d'));
  visuals.push(decoration('jump-gate-sign',x,z,base+4.02,r.yaw,half*2+.35,.4,.42,'#f07835'));
 }
 terrain.arcadeRamps=ramps;return [...ramps,...visuals];
}
