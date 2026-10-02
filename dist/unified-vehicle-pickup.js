// Nearby regional vehicle delivery. Only actual drivable OSM roads qualify;
// Venetian calli, bridges that cannot support the vehicle and water are excluded.
const driveable=k=>!/footway|path|steps|pedestrian|cycleway|bridleway/i.test(k||'');
export function regionalVehiclePickup(region,state,spec,isFree=()=>true){
 if(!region?.nearestRoad||!state||!spec)return null;
 const headings=[0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,Math.PI];
 for(const radius of [18,45,90,160,260,400,580]){
  for(const delta of headings){
   const angle=state.yaw+delta;
   const q=region.nearestRoad(state.x+Math.sin(angle)*radius,
     state.z+Math.cos(angle)*radius,Math.min(120,radius*.3+35));
   if(!q||!q.road||!driveable(q.road.k)||q.road.w<spec.width+1.8)continue;
   if(Math.hypot(q.x-state.x,q.z-state.z)<spec.length/2+3)continue;
   const p={x:q.x,z:q.z,y:q.y,yaw:q.yaw,road:q.road};
   if(isFree(p))return p;
  }
 }
 return null;
}
export function vehicleFamily(spec){
 return spec?.watercraft?'Acqua':spec?.aircraft?'Aria':
  spec?.tracked?'Militari':spec?.bike?'Moto e bici':'Terra';
}
