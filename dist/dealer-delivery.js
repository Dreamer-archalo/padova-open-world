import {pointInside,dist} from './core.js';
import {vehicleFootprint,polygonsOverlap,vehicleBlocked} from './movement.js';

export function dealerNeedsOutdoor(b,spec){
 const clearance=(b.minY+(b.h||4))-(b.dealerFloorY??b.minY)-.3;
 return spec.family==='freight'||spec.length>6.3||spec.height>2.7||spec.width>4.6-.8||spec.height+.25>clearance;
}

export function planDealerDelivery(shops,entry,id,spec){
 const b=entry.building,d=b.dealerDoor,nx=(d.outside.x-d.x)/2,nz=(d.outside.z-d.z)/2,yaw=Math.atan2(nx,nz);
 const height=(x,z)=>shops.terrain.height?.(x,z)??b.dealerFloorY??b.minY??0;
 const occupied=shops.cars.filter(c=>!c.permanentlyDestroyed&&(c.mesh?.visible||c.dealershipStock||c.requestedByPlayer));
 const inflated={...spec,width:spec.width+.55,length:spec.length+.55};
 const clear=(p,ignore=null,spawn=false)=>{
  const footprint=vehicleFootprint(p.x,p.z,p.yaw,inflated.width,inflated.length);
  if(shops.collision&&vehicleBlocked(p.x,p.z,p.yaw,shops.collision,inflated,height(p.x,p.z)))return false;
  if(occupied.some(c=>c!==ignore&&dist(c,p)<spec.length+c.spec.length&&polygonsOverlap(footprint,vehicleFootprint(c.x,c.z,c.yaw,c.spec.width+.5,c.spec.length+.5))))return false;
  if(spawn&&Number.isFinite(shops.state.x)&&polygonsOverlap(footprint,vehicleFootprint(shops.state.x,shops.state.z,0,1.4,1.4)))return false;
  if(!shops.terrain.dry?.(p.x,p.z,Math.min(3,spec.width),height(p.x,p.z))&&shops.terrain.dry)return false;
  const samples=[[p.x,p.z],...vehicleFootprint(p.x,p.z,p.yaw,spec.width,spec.length)];
  return samples.every(([x,z])=>Math.abs(height(x,z)-height(p.x,p.z))<.65&&(!shops.terrain.waterAt||shops.terrain.waterAt(x,z,0,height(x,z))===null));
 };
 const reuse=entry.units.find(c=>c.style===id&&c.dealershipStock);
 if(!dealerNeedsOutdoor(b,spec)){
  for(let depth=spec.length/2+1.5;depth<spec.length/2+16;depth+=1.5){
   const p={x:d.x-nx*depth,z:d.z-nz*depth,yaw};
   if(!vehicleFootprint(p.x,p.z,yaw,inflated.width,inflated.length).every(v=>pointInside(...v,b.p))||!clear(p,reuse,true))continue;
   let pass=true;
   for(let along=-depth;along<=spec.length/2+5;along+=.5)if(!clear({x:d.x+nx*along,z:d.z+nz*along,yaw},reuse)){pass=false;break;}
   if(pass)return {entry,...p,reuse,y:height(p.x,p.z),location:'inside'};
  }
 }
 // Forecourt bays are tried before roadside lay-bys. Every candidate validates
 // the complete vehicle footprint and a straight, usable pull-away lane.
 const candidates=[];
 for(const side of [0,5,-5,10,-10,16,-16,24,-24,32,-32])for(const ahead of [spec.length/2+3,spec.length/2+8,spec.length/2+15,spec.length/2+24]){
  const x=d.x+nx*ahead+d.dx*side,z=d.z+nz*ahead+d.dz*side;
  candidates.push({x,z,yaw});
  const road=shops.roadAt?.({x,z});
  if(road){const angle=road.yaw??yaw,w=road.road?.w??road.segment?.road?.w??6;for(const s of [-1,1])candidates.push({x:road.x+Math.cos(angle)*(w/2+spec.width/2+.8)*s,z:road.z-Math.sin(angle)*(w/2+spec.width/2+.8)*s,yaw:angle});}
 }
 candidates.sort((a,c)=>dist(a,d.outside)-dist(c,d.outside));
 for(const p of candidates){
  const footprint=vehicleFootprint(p.x,p.z,p.yaw,inflated.width,inflated.length);
  if(polygonsOverlap(footprint,b.p)||!clear(p,reuse,true))continue;
  // Keep the gate and its approach free even for the largest semitrailer.
  if(polygonsOverlap(footprint,vehicleFootprint(d.x+nx*3,d.z+nz*3,yaw,5.3,8)))continue;
  let pass=true;for(let step=.5;step<=Math.min(10,spec.length);step+=.5)if(!clear({x:p.x+Math.sin(p.yaw)*step,z:p.z+Math.cos(p.yaw)*step,yaw:p.yaw},reuse)){pass=false;break;}
  if(pass)return {entry,...p,reuse,y:height(p.x,p.z),location:'outside'};
 }
 return null;
}
