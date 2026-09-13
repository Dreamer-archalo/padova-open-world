import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {dist,roadRoute} from './core.js';
import {followRoad} from './chase-routing.js';
import {vehicleBlocked} from './movement.js';
import {VEHICLES} from './vehicles.js';

function decorateAmbientPolice(c){
 const blue=new THREE.MeshBasicMaterial({color:'#3a8dff'}),red=new THREE.MeshBasicMaterial({color:'#ff4254'});
 for(const [side,mat] of [[-1,blue],[1,red]]){const lamp=new THREE.Mesh(new THREE.BoxGeometry(.28,.12,.22),mat);lamp.position.set(side*.27,c.spec.height+.05,-.12);c.mesh.add(lamp);(c.ambientLights??=[]).push(lamp);}
 c.name='Polizia · Inseguimento';c.ambientPolice=true;c.missionUnit=true;
}
function targetNode(game,from){
 const candidates=[];
 for(const seg of game.graph.index.near(from.x,from.z,720)){if(!seg.connected||seg.road.w<5||['no','private'].includes(seg.road.access)||seg.road.k==='pedestrian')continue;for(const id of [seg.a,seg.b]){const n=game.graph.nodes[id],d=dist(n,from);if(d>260&&d<680)candidates.push(n);}}
 return candidates.length?candidates[Math.floor(Math.random()*candidates.length)]:null;
}
function safeBehind(game,p,yaw,metres=17){const x=p.x-Math.sin(yaw)*metres,z=p.z-Math.cos(yaw)*metres,y=game.terrain.height(x,z);return game.terrain.dry(x,z,VEHICLES.sedan.width/2,y)&&!vehicleBlocked(x,z,yaw,game.collision,VEHICLES.sedan,y)?{x,z,y,yaw}:null;}
function cleanup(game,event){
 if(!event)return;
 for(const c of [event.suspect,event.police]){if(!c)continue;if(c===game.state.car){c.missionUnit=false;c.ambientPolice=false;continue;}if(game.cars.includes(c)||game.cops.includes(c))game.retire(c);}
 game.ambientPursuit=null;
}
function spawn(game){
 if(game.state.wanted>0||game.state.mission)return false;
 const p=game.findSpawn('sport',150,390);if(!p)return false;const goal=targetNode(game,p);if(!goal)return false;
 const route=roadRoute(p,goal,game.graph);if(route.length<4)return false;
 const suspect=game.addCar(p.x,p.z,p.yaw,false,false,Math.random()<.5?'sport':'compact');Object.assign(suspect,{y:p.y,speed:13,missionUnit:true,ambientSuspect:true,path:route,pathIndex:1,stuck:0});game.pose(suspect);
 const q=safeBehind(game,p,p.yaw,20)||safeBehind(game,p,p.yaw,13);if(!q){game.retire(suspect);return false;}
 const police=game.addCar(q.x,q.z,q.yaw,false,false,'sedan');Object.assign(police,{y:q.y,speed:12,path:[],pathIndex:1,routeAt:0,stuck:0});decorateAmbientPolice(police);game.pose(police);
 game.ambientPursuit={suspect,police,until:game.state.elapsed+32,repathAt:0};return true;
}
function updateAmbient(game,dt){
 game.nextAmbientPursuit??=game.state.elapsed+45+Math.random()*40;
 const e=game.ambientPursuit;
 if(!e){if(game.state.elapsed>=game.nextAmbientPursuit){spawn(game);game.nextAmbientPursuit=game.state.elapsed+85+Math.random()*70;}return;}
 if(game.state.wanted>0||game.state.elapsed>e.until||dist(game.state,e.suspect)>760||!e.suspect.mesh.visible||!e.police.mesh.visible){cleanup(game,e);return;}
 if(e.suspect===game.state.car||e.police===game.state.car){cleanup(game,e);return;}
 if(e.suspect.pathIndex>=e.suspect.path.length-1||e.suspect.stuck>5){const goal=targetNode(game,e.suspect),route=goal&&roadRoute(e.suspect,goal,game.graph);if(route?.length>2){e.suspect.path=route;e.suspect.pathIndex=1;e.suspect.stuck=0;}else{cleanup(game,e);return;}}
 followRoad(e.suspect,dt,game.graph,game.terrain,game.collision,{max:25,accel:10,turnRate:1.7,traffic:game.cars.filter(c=>c!==e.suspect&&c!==e.police)});game.pose(e.suspect);
 if(game.state.elapsed>=e.repathAt){e.police.path=roadRoute(e.police,e.suspect,game.graph);e.police.pathIndex=1;e.police.stuck=0;e.repathAt=game.state.elapsed+1.4;}
 followRoad(e.police,dt,game.graph,game.terrain,game.collision,{max:27,accel:11,turnRate:1.8,traffic:game.cars.filter(c=>c!==e.suspect&&c!==e.police)});game.pose(e.police);
 if(e.police.ambientLights)for(const [i,l] of e.police.ambientLights.entries())l.visible=Math.sin(game.state.elapsed*13+i*Math.PI)>0;
 if(dist(e.police,e.suspect)<8)e.suspect.speed=Math.max(e.suspect.speed,14);
}

const original=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__ambientPursuitsPatched){
 ModernGameplay.prototype.__ambientPursuitsPatched=true;
 ModernGameplay.prototype.update=function(dt){original.call(this,dt);updateAmbient(this,dt);};
}
