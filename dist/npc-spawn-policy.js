import {dist,nearestOnSegment,collides} from './core.js';

export const pedestrianRoadAllowed=r=>!!r&&!/motorway|trunk|cycleway|construction|steps/.test(r.k||'')&&
 !['no','private'].includes(r.access)&&!r.roundabout&&r.junction!=='roundabout'&&r.j!=='roundabout';
export const pedestrianDensity=zone=>({historic:1,university:1,urban:.65,residential:.30,green:.45,
 industrial:.14,airport:.12,countryside:.07,wild:.04,motorway:0}[zone]??.3);
export function pedestrianCapacity(zone,qualityCount){return Math.floor(qualityCount*pedestrianDensity(zone));}

// Validate the actual position against every nearby carriageway at its own
// elevation. A sidewalk beneath a flyover remains walkable.
export function safePedestrianSpot(game,p,{crosswalk=false}={}){
 const {terrain,graph}=game,y=p.y??terrain.height(p.x,p.z);
 if(!terrain.dry(p.x,p.z,.5,y)||collides(p.x,p.z,.4,game.collision||game.world?.collision,y))return false;
 for(const s of graph.index.near(p.x,p.z,24)){
  const r=s.road,a=graph.nodes[s.a],b=graph.nodes[s.b],q=nearestOnSegment(p.x,p.z,[a.x,a.z],[b.x,b.z]),d=dist(p,q);
  if(d>r.w/2+4)continue;
  const ry=terrain.roads.sample(r,q.x,q.z);if(Math.abs(ry-y)>2.3)continue;
  if(/motorway|trunk/.test(r.k||'')&&d<r.w/2+4)return false;
  if(r.roundabout||r.junction==='roundabout'||r.j==='roundabout')return false;
  if(!/^(footway|path|pedestrian|living_street)$/.test(r.k||'')&&d<r.w/2+.55&&!crosswalk)return false;
 }
 return true;
}
export function pedestrianSpacing(people,p,zone,exclude){
 const central=zone==='historic'||zone==='university',radius=central?24:38,cap=central?5:zone==='urban'?3:1;
 let neighbors=0;for(const q of people){if(q===exclude||!q.mesh?.visible||q.driverPool||Math.abs((q.y||0)-(p.y||0))>3)continue;
  const d=dist(p,q);if(d<3.2)return false;if(d<radius&&++neighbors>=cap)return false;
 }return true;
}
export class PedestrianSpawnBudget{
 constructor(){this.tokens=2;this.at=0;}
 take(time){if(time<this.at){this.at=time;this.tokens=2;}this.tokens=Math.min(2,this.tokens+Math.max(0,time-this.at)*1.5);this.at=time;
  if(this.tokens<1)return false;this.tokens--;return true;}
}
