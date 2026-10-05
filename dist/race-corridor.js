import {nearestOnSegment} from './core.js';
import {vehicleBlocked} from './movement.js';

const motorway=road=>/^(motorway|trunk)(?:_link)?$/.test(road?.k||'');
const parallel=(a,b)=>Math.abs(Math.cos(a-b))>.96;
const yawOf=s=>Math.atan2(s.b[0]-s.a[0],s.b[1]-s.a[1]);
export function buildRaceCorridor(game,race){
 const roads=game.terrain.roads,stations=[];
 for(let i=0;i<race.samples.length;i++){
  const p=race.samples[i],a=race.samples[Math.max(0,i-1)],b=race.samples[Math.min(race.samples.length-1,i+1)],yaw=Math.atan2(b.x-a.x,b.z-a.z);
  const members=[{road:p.road,side:0,x:p.x,z:p.z,y:p.y,yaw}];
  for(const candidate of roads.candidates(p.x,p.z,38)){
   if(candidate.road===p.road||!motorway(candidate.road)||!parallel(yaw,yawOf(candidate.segment)))continue;
   if(Math.abs(candidate.height+.05-p.y)>2.2)continue;
   const q=nearestOnSegment(p.x,p.z,candidate.segment.a,candidate.segment.b),side=(q.x-p.x)*Math.cos(yaw)-(q.z-p.z)*Math.sin(yaw);
   const along=(q.x-p.x)*Math.sin(yaw)+(q.z-p.z)*Math.cos(yaw);
   if(Math.abs(side)<3||Math.abs(side)>38||Math.abs(along)>12)continue;
   members.push({road:candidate.road,side,x:q.x,z:q.z,y:candidate.height+.05,yaw,d:Math.hypot(q.x-p.x,q.z-p.z)});
  }
  members.sort((a,b)=>(a.d||0)-(b.d||0));
  stations.push({index:i,yaw,members:members.slice(0,2)});
 }
 return {stations,roads:new Set(stations.flatMap(s=>s.members.map(m=>m.road))),dualStations:stations.filter(s=>s.members.length>1).length};
}
// Continuous projection, independent of driving direction and road.oneway.
export function raceCorridorPosition(game,race,actor,hint=0){
 const path=race.samples,stations=race.corridor.stations;let best=null;
 const scan=(lo,hi)=>{for(let i=lo;i<hi;i++){
  const a=path[i],b=path[i+1],q=nearestOnSegment(actor.x,actor.z,[a.x,a.z],[b.x,b.z]),d=Math.hypot(actor.x-q.x,actor.z-q.z);
  if(!best||d<best.d)best={index:i,t:q.t,x:q.x,z:q.z,d};
 }};
 scan(Math.max(0,hint-12),Math.min(path.length-1,hint+16));if(!best||best.d>52)scan(0,path.length-1);
 if(!best)return {valid:false,index:0,d:Infinity,progress:0};
 const i=best.t>.5?best.index+1:best.index,station=stations[i],p=path[i],yaw=station.yaw,side=(actor.x-best.x)*Math.cos(yaw)-(actor.z-best.z)*Math.sin(yaw);
 const airborne=!!actor.jump?.airborne,verticalTolerance=airborne?30:2.5;
 const adjacent=stations.slice(Math.max(0,i-2),i+3).flatMap(s=>s.members);
 const candidates=game.terrain.roads.candidates(actor.x,actor.z,1.2).filter(c=>adjacent.some(m=>m.road===c.road)&&Math.abs(actor.y-c.height-.05)<verticalTolerance);
 let member=candidates.length?adjacent.find(m=>m.road===candidates[0].road):null;
 // The median transition is valid too, without admitting side fields or lower decks.
 const min=Math.min(...station.members.map(m=>m.side-m.road.w/2)),max=Math.max(...station.members.map(m=>m.side+m.road.w/2));
 const surface=game.terrain.height(actor.x,actor.z,actor.y),median=station.members.length>1&&side>=min&&side<=max&&best.d<42&&Math.abs(actor.y-surface)<verticalTolerance&&Math.abs(surface-p.y)<2.5;
 const valid=!!member||median;
 if(!member&&median)member=station.members.reduce((a,b)=>Math.abs(a.side-side)<Math.abs(b.side-side)?a:b);
 return {...best,index:i,side,member,valid,progress:Math.max(0,(path.cumulative[best.index]||0)+(path.cumulative[best.index+1]-path.cumulative[best.index])*best.t-(race.startDistance||0))};
}
export function corridorSurface(game,race,p,x,z,reference=p.y){
 if(race?.corridor){const candidates=game.terrain.roads.candidates(x,z,.7).filter(c=>race.corridor.roads.has(c.road)&&Math.abs(c.height+.05-reference)<2.5);if(candidates.length){candidates.sort((a,b)=>Math.abs(a.height+.05-reference)-Math.abs(b.height+.05-reference));return candidates[0].height+.05;}}
 const y=game.terrain.roads.sample(p.road,x,z);return Number.isFinite(y)?y+.05:game.terrain.height(x,z,reference);
}
export function corridorFinish(race,actor,progress){
 if(progress<race.total-70)return false;
 const dx=actor.x-race.finish.x,dz=actor.z-race.finish.z,yaw=race.finishYaw,along=dx*Math.sin(yaw)+dz*Math.cos(yaw),side=dx*Math.cos(yaw)-dz*Math.sin(yaw);
 const stations=race.corridor.stations.slice(-4),members=stations.flatMap(s=>s.members);
 const min=Math.min(...members.map(m=>m.side-m.road.w/2))-1,max=Math.max(...members.map(m=>m.side+m.road.w/2))+1;
 return along>=-.9&&side>=min&&side<=max&&Math.abs(actor.y-race.finish.y)<(actor.jump?.airborne?30:3);
}
export function corridorLanes(manager,index,car){
 const r=manager.race,station=r.corridor?.stations[index];if(!station)return null;
 const main=station.members[0],allowed=[main];
 // A bot changes carriageway only through a physically clear crossover.
 for(const member of station.members.slice(1)){
  let clear=true;for(let n=1;n<=6;n++){const f=n/6,x=main.x+(member.x-main.x)*f,z=main.z+(member.z-main.z)*f;if(vehicleBlocked(x,z,station.yaw,manager.game.collision,car.spec,corridorSurface(manager.game,r,r.samples[index],x,z,main.y))){clear=false;break;}}
  if(clear||Math.abs((car.raceLane||0)-member.side)<member.road.w/2)allowed.push(member);
 }
 return allowed.flatMap(m=>{const bound=Math.max(1,m.road.w/2-car.spec.width/2-.6);return [m.side-bound,m.side,m.side+bound];});
}
