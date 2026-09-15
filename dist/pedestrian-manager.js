import {nearestRoad,collides,dist} from './core.js';

const WALKABLE=new Set(['pedestrian','living_street']);
const CROSSING_KEYS=new Set(['crossing','footway','path','steps']);

function isRoundabout(road){
 return road?.junction==='roundabout'||road?.roundabout===true||road?.j==='roundabout';
}
function roundaboutCenter(game,road){
 let x=0,z=0,n=0;
 for(const s of game.graph.segments){
  if(s.road!==road)continue;
  for(const id of [s.a,s.b]){const p=game.graph.nodes[id];x+=p.x;z+=p.z;n++;}
 }
 return n?{x:x/n,z:z/n}:null;
}
function validSidewalk(game,p,road){
 if(!game.terrain.dry(p.x,p.z,.45,p.y))return false;
 const y=game.terrain.height(p.x,p.z,p.y);
 if(collides(p.x,p.z,.38,game.collision,y))return false;
 const other=nearestRoad(p,game.graph,false);
 if(other&&other.segment.road!==road&&!WALKABLE.has(other.segment.road.k)&&other.d<=other.segment.road.w/2+.45)return false;
 return true;
}

export class PedestrianManager{
 constructor(){this.acc=0;this.fixed=0;this.roundaboutFixed=0;}
 sidewalkPoint(game,p,near){
  const a=game.graph.nodes[near.segment.a],b=game.graph.nodes[near.segment.b];
  const yaw=Math.atan2(b.x-a.x,b.z-a.z),normal={x:Math.cos(yaw),z:-Math.sin(yaw)};
  const offset=Math.max(1.35,near.segment.road.w/2+1.35),centre={x:near.x,z:near.z};
  let candidates=[-1,1].map(side=>({x:centre.x+normal.x*offset*side,z:centre.z+normal.z*offset*side,side}));
  const road=near.segment.road,rc=isRoundabout(road)?roundaboutCenter(game,road):null;
  if(rc)candidates.sort((u,v)=>dist(v,rc)-dist(u,rc));
  return candidates.find(c=>validSidewalk(game,c,road))||null;
 }
 update(game,dt){
  this.acc+=dt;if(this.acc<.18)return;this.acc=0;
  for(const p of game.people){
   if(!p?.mesh?.visible||p.health<=0||p.koUntil>game.state.elapsed)continue;
   const near=nearestRoad(p,game.graph,false);if(!near)continue;
   const road=near.segment.road,roundabout=isRoundabout(road);
   // Crossing/path flags must never exempt somebody standing inside a
   // roundabout. Those exemptions are valid only on ordinary road segments.
   if(!roundabout&&(p.crossGoal||p.crossing||CROSSING_KEYS.has(p.road?.k)))continue;
   if(WALKABLE.has(road.k)&&!roundabout)continue;
   if(near.d>road.w/2+(roundabout?1.2:.2))continue;
   const q=this.sidewalkPoint(game,p,near);if(!q)continue;
   p.x=q.x;p.z=q.z;p.y=game.terrain.height(q.x,q.z,p.y);
   p.anchor={x:q.x,z:q.z};p.crossGoal=null;p.crossing=false;p.blocked=0;
   p.mesh.position.set(p.x,p.y,p.z);this.fixed++;if(roundabout)this.roundaboutFixed++;
  }
 }
}
