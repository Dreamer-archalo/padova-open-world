import * as THREE from './vendor/three.module.js';
import {RoadSurfaces} from './road-surfaces.js';
import {Terrain} from './terrain.js';
import {ModernGameplay} from './modern-gameplay.js';
import {Trams,sampleRail} from './tram.js';
import {laneCount,laneOffset} from './traffic.js';
import {nearestRoad,clamp,dist} from './core.js';
import {vehicleBlocked} from './movement.js';

export const ORDINARY_ROAD_TOLERANCE=.16;
export const MOTORWAY_ROAD_TOLERANCE=.20;
export const ROAD_EDGE_BLEND=2.6;
export const HIGHWAY_TRAFFIC_TARGET={hyper:7,low:11,medium:16,high:22};

export function independentRoadLevel(road){
 return !!road&&(!!road.crossing||!!road.b||!!road.tunnel||Math.abs(Number(road.layer)||0)>0||road.k==='steps');
}
export function ordinarySurfaceRoad(road){
 return !!road&&!independentRoadLevel(road)&&!/^(footway|path|cycleway|steps|pedestrian)$/.test(road.k||'');
}
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};

// The graph solver is allowed to create vertical separation only for an explicit
// bridge/tunnel/layer. Ordinary Padova streets must stay attached to the local
// terrain instead of inheriting a distant graph node height through smoothing.
const previousSegmentHeight=RoadSurfaces.prototype.segmentHeight;
if(!RoadSurfaces.prototype.__ordinaryRoadTerrainLock){
 RoadSurfaces.prototype.__ordinaryRoadTerrainLock=true;
 RoadSurfaces.prototype.segmentHeight=function(s,t){
  const solved=previousSegmentHeight.call(this,s,t),road=s?.profile?.road||s?.road;
  if(!this.modern||!this.terrain||!ordinarySurfaceRoad(road)||!Number.isFinite(solved))return solved;
  const x=s.a[0]+(s.b[0]-s.a[0])*t,z=s.a[1]+(s.b[1]-s.a[1])*t,natural=this.terrain.elevation(x,z);
  if(!Number.isFinite(natural))return solved;
  const tolerance=/motorway|trunk/.test(road.k||'')?MOTORWAY_ROAD_TOLERANCE:ORDINARY_ROAD_TOLERANCE;
  return natural+clamp(solved-natural,-tolerance,tolerance);
 };
}

// Keep the immediate verge/sidewalk on the same physical datum as the road.
// Farther away the terrain returns smoothly to the DEM. Bridges and tunnels are
// deliberately excluded so real vertical separation remains possible.
const previousGroundHeight=Terrain.prototype.groundHeight;
if(!Terrain.prototype.__ordinaryRoadEdgeLock){
 Terrain.prototype.__ordinaryRoadEdgeLock=true;
 Terrain.prototype.groundHeight=function(x,z){
  let h=previousGroundHeight.call(this,x,z);if(!this.modern||!this.roads)return h;
  const support=this.roads.at(x,z,null,ROAD_EDGE_BLEND+.8);if(!support||!ordinarySurfaceRoad(support.road))return h;
  const outside=Math.max(0,support.d-support.road.w/2);if(outside>=ROAD_EDGE_BLEND)return h;
  const deck=support.height-.055,t=smooth(outside/ROAD_EDGE_BLEND);
  return deck*(1-t)+h*t;
 };
}

// Safety net for tram vehicles: a normal street-running rail cannot float above
// Voltabarozzo or any other district merely because the rail graph was smoothed.
const previousTramUpdate=Trams.prototype.update;
if(!Trams.prototype.__streetRunningTerrainLock){
 Trams.prototype.__streetRunningTerrainLock=true;
 Trams.prototype.update=function(...args){
  const out=previousTramUpdate.apply(this,args);
  for(const tram of this.vehicles||[])for(let i=0;i<tram.cars.length;i++){
   const pose=sampleRail(tram.route,tram.d-i*8.65*tram.direction),road=pose.road,g=tram.cars[i];
   if(!g||!road||independentRoadLevel(road))continue;
   const natural=this.terrain.elevation(pose.x,pose.z),rail=this.terrain.roads.sample(road,pose.x,pose.z);
   if(Number.isFinite(natural)&&Number.isFinite(rail))g.position.y=natural+clamp(rail-natural,-.12,.12)+.05;
  }
  return out;
 };
}

function ambientCar(c,state){return c&&c!==state.car&&!c.police&&!c.parked&&!c.fixedSpawn&&!c.missionUnit&&!c.hostile&&!c.militarySurplus&&!c.spec?.aircraft;}
function highwaySegment(s){return s?.connected&&/motorway|trunk/.test(s.road?.k||'')&&!['no','private'].includes(s.road?.access)&&s.road.w>=6.5;}
function placeHighwayCar(game,c,s,seed=0){
 const a=game.graph.nodes[s.a],b=game.graph.nodes[s.b];if(!a||!b)return false;
 const forward=s.road.oneway===-1?false:s.road.oneway===1||s.road.one?true:(seed%2===0),from=forward?s.a:s.b,to=forward?s.b:s.a,A=forward?a:b,B=forward?b:a;
 const t=.2+((seed*37)%57)/100,x0=A.x+(B.x-A.x)*t,z0=A.z+(B.z-A.z)*t,yaw=Math.atan2(B.x-A.x,B.z-A.z),count=laneCount(s.road),lane=Math.abs(seed)%count,offset=laneOffset(s.road,lane),x=x0+Math.cos(yaw)*offset,z=z0-Math.sin(yaw)*offset,y=game.terrain.roads.sample(s.road,x,z)+.05;
 if(!Number.isFinite(y)||!game.terrain.dry(x,z,c.spec.width/2,y)||vehicleBlocked(x,z,yaw,game.collision,c.spec,y))return false;
 if(game.cars.some(o=>o!==c&&o.mesh?.visible&&Math.abs((o.y||0)-y)<3&&Math.hypot(o.x-x,o.z-z)<Math.max(10,(o.spec?.length||4)+c.spec.length+2)))return false;
 Object.assign(c,{x,z,y,yaw,road:s.road,prev:from,target:to,lane,desiredLane:lane,laneOffset:offset,speed:18+(seed%8),driver:.9+(seed%5)*.04,stuck:0,longAccel:0,plannedEdge:null,retryAt:0,budgetSleeping:false});
 c.mesh.visible=true;game.pose(c);return true;
}
function ensureHighwayTraffic(game){
 const state=game.state,support=game.terrain.roads.at(state.x,state.z,state.y,5);if(!support||!/motorway|trunk/.test(support.road?.k||''))return;
 const target=HIGHWAY_TRAFFIC_TARGET[state.quality]??11,nearby=game.cars.filter(c=>ambientCar(c,state)&&c.mesh?.visible&&/motorway|trunk/.test(c.road?.k||'')&&dist(c,state)>55&&dist(c,state)<720&&Math.abs((c.y||0)-state.y)<6);
 let missing=Math.max(0,target-nearby.length);if(!missing)return;
 const segments=game.graph.index.near(state.x,state.z,720).filter(highwaySegment);if(!segments.length)return;
 const pool=game.cars.filter(c=>ambientCar(c,state)&&(!c.mesh?.visible||dist(c,state)>620)).sort((a,b)=>(a.mesh?.visible?1:0)-(b.mesh?.visible?1:0));
 for(let i=0;i<pool.length&&missing>0;i++)for(let j=0;j<Math.min(segments.length,18)&&missing>0;j++)if(placeHighwayCar(game,pool[i],segments[(i*7+j*11)%segments.length],i*17+j)){missing--;break;}
}
function decoratePoliceUnit(c){
 if(c.__roadRealityPolice)return;c.__roadRealityPolice=true;c.name='Polizia Stradale · Incidente';
 const root=new THREE.Group(),blue=new THREE.MeshBasicMaterial({color:'#3a8dff'}),red=new THREE.MeshBasicMaterial({color:'#ff4254'});for(const [side,mat] of [[-1,blue],[1,red]]){const m=new THREE.Mesh(new THREE.BoxGeometry(.28,.12,.22),mat);m.position.set(side*.25,c.spec.height+.14,-.1);root.add(m);}c.mesh.add(root);c.__roadRealityLights=root;
}
function incidentPosition(near,yaw,offset,along=0){return {x:near.x+Math.cos(yaw)*offset+Math.sin(yaw)*along,z:near.z-Math.sin(yaw)*offset+Math.cos(yaw)*along};}
function positionIncidentCar(game,c,road,near,yaw,offset,along=0){
 const p=incidentPosition(near,yaw,offset,along),y=game.terrain.roads.sample(road,p.x,p.z)+.05;if(!Number.isFinite(y))return false;
 Object.assign(c,{x:p.x,z:p.z,y,yaw,speed:0,parked:true,missionUnit:true,fixedSpawn:true});c.mesh.visible=true;game.pose(c);return true;
}
class RoadRealityManager{
 constructor(){this.acc=0;this.incidentExtras=new Map();}
 incident(game){
  for(const [original,extras] of [...this.incidentExtras])if(!game.cars.includes(original)||!original.mesh?.parent){for(const c of extras)if(game.cars.includes(c))game.remove(c);this.incidentExtras.delete(original);}
  const original=game.cars.find(c=>c.phase3Incident&&!c.__roadRealityScene);if(!original)return;original.__roadRealityScene=true;
  const near=nearestRoad(original,game.graph,false);if(!near)return;const road=near.segment.road,a=game.graph.nodes[near.segment.a],b=game.graph.nodes[near.segment.b],yaw=original.yaw||Math.atan2(b.x-a.x,b.z-a.z),side=((original.mesh?.id||1)%2?1:-1),shoulder=Math.max(road.w*.26,road.w/2-original.spec.width/2-.35),extras=[];
  positionIncidentCar(game,original,road,near,yaw,side*shoulder,0);original.name='Veicolo incidentato · area protetta';original.fixedSpawn=false;
  const police=game.addCar(0,0,0,false,true,'sedan');police.phase3IncidentExtra=true;decoratePoliceUnit(police);if(positionIncidentCar(game,police,road,near,yaw,side*shoulder,-11))extras.push(police);else game.remove(police);
  if(/motorway|trunk/.test(road.k||'')&&road.w>=7){const second=game.addCar(0,0,0,false,true,'compact');second.phase3IncidentExtra=true;second.name='Veicolo coinvolto nell’incidente';const laneOffsetValue=side*Math.max(road.w*.12,1.2);if(positionIncidentCar(game,second,road,near,yaw+.16,laneOffsetValue,5.2))extras.push(second);else game.remove(second);}
  this.incidentExtras.set(original,extras);
 }
 update(game,dt){this.acc+=dt;if(this.acc<.65)return;this.acc=0;ensureHighwayTraffic(game);this.incident(game);for(const extras of this.incidentExtras.values())for(const c of extras)if(c.__roadRealityLights)c.__roadRealityLights.visible=Math.sin(game.state.elapsed*12+c.mesh.id)>-.25;}
}
const managers=new WeakMap(),previousGameplayUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__roadRealityPass){
 ModernGameplay.prototype.__roadRealityPass=true;
 ModernGameplay.prototype.update=function(dt){const out=previousGameplayUpdate.call(this,dt);if(!managers.has(this))managers.set(this,new RoadRealityManager());managers.get(this).update(this,dt);return out;};
}
