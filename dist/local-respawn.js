// Local, realm-independent recovery checkpoints. In particular, do not
// send a player who drowns in the Brenta or the lagoon back to Padova.
export class LocalRespawn {
 constructor(){this.last=null;this.lastAt=-Infinity;}
 safe(p,terrain,clear,vehicle=null){
  if(!p||![p.x,p.z,p.y].every(Number.isFinite))return null;
  const reference=Number.isFinite(p.y)?p.y:null;
  const support=terrain.height(p.x,p.z,reference);
  if(!Number.isFinite(support)||Math.abs(reference-support)>1.9)return null;
  const radius=vehicle?Math.max(1.8,(vehicle.width||2)/2+1.15):1.3;
  // The wider check prevents an infinite respawn on a shoreline/bridge edge.
  if(!terrain.dry(p.x,p.z,radius,reference)||!clear(p.x,p.z,reference,vehicle))return null;
  return {x:p.x,z:p.z,y:support,yaw:Number.isFinite(p.yaw)?p.yaw:0};
 }
 remember(p,terrain,clear,elapsed=0,force=false){
  if(p.health<=0||p.parachuting||p.car?.jump?.airborne||!Number.isFinite(p.y))return false;
  if(!force&&elapsed-this.lastAt<.22)return false;
  // Do not checkpoint a plane mid-air: R must return to the last safe runway.
  if(p.car?.spec?.aircraft&&p.y-terrain.height(p.x,p.z)>1.5)return false;
  const candidate=this.safe(p,terrain,clear,p.car?.spec);
  if(!candidate)return false;
  this.last=candidate;this.lastAt=elapsed;return true;
 }
 near(origin,terrain,clear,vehicle=null){
  if(!origin||!Number.isFinite(origin.x)||!Number.isFinite(origin.z))return null;
  const y=Number.isFinite(origin.y)?origin.y:terrain.height(origin.x,origin.z);
  const yaw=origin.yaw||0;
  for(const d of [0,2,4,7,11,17,25]){
   const n=d?12:1;
   for(let i=0;i<n;i++){
    const a=yaw+2*Math.PI*i/n,x=origin.x+Math.cos(a)*d,z=origin.z+Math.sin(a)*d;
    const p={x,z,y:terrain.height(x,z,y),yaw};
    const valid=this.safe(p,terrain,clear,vehicle);
    if(valid)return valid;
   }
  }
  return null;
 }
 choose(current,terrain,clear,vehicle=null,{water=false,nearRoad=null}={}){
  const candidate=!water?this.safe(current,terrain,clear,vehicle):null;
  if(candidate)return candidate;
  // Prefer the last solid point visited, before looking for a nearby street.
  const localLast=this.last&&Math.hypot(this.last.x-current.x,this.last.z-current.z)<(water?8000:2200)?this.last:null;
  const remembered=localLast&&this.near(localLast,terrain,clear,vehicle);
  if(remembered)return remembered;
  const road=nearRoad?.(localLast||current,vehicle);
  if(road){
   const dry=this.near({x:road.x,z:road.z,y:road.y,yaw:road.yaw},terrain,clear,vehicle);
   if(dry)return dry;
  }
  // Do not silently send the player to a different city or an old checkpoint.
  return this.near(current,terrain,clear,vehicle);
 }
}
