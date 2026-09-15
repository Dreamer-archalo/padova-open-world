import * as THREE from './vendor/three.module.js';
import {Trams,sampleRail} from './tram.js';
import {dist,clamp} from './core.js';
import {ensureSurfaceResolver} from './world-surface-resolver.js';

const bodyGeo=new THREE.CylinderGeometry(1,1,1,7),headGeo=new THREE.SphereGeometry(1,7,5);
const bodyMat=new THREE.MeshStandardMaterial({color:'#607786',roughness:1});
const headMat=new THREE.MeshStandardMaterial({color:'#c59a79',roughness:1});
function ensurePassengers(trams){if(trams.phase3Passengers)return trams.phase3Passengers;const body=new THREE.InstancedMesh(bodyGeo,bodyMat,24),head=new THREE.InstancedMesh(headGeo,headMat,24);body.castShadow=head.castShadow=false;trams.scene.add(body,head);return trams.phase3Passengers={body,head,dummy:new THREE.Object3D()};}

Trams.prototype.update=function(dt,time,player,actors,kick){
 const surfaces=ensureSurfaceResolver(this.terrain);
 for(const tram of this.vehicles){if(tram.sleeping)continue;
  if(tram.dwell>0){tram.dwell-=dt;tram.speed=0;}else{const approaching=tram.route.stops.find(d=>Math.abs(d-tram.d)<18&&Math.sign(d-tram.d)===tram.direction&&d!==tram.lastStop);tram.speed=Math.min(approaching===undefined?10:4,tram.speed+dt*1.3);tram.d+=tram.speed*dt*tram.direction;if(approaching!==undefined&&Math.abs(approaching-tram.d)<1){tram.lastStop=approaching;tram.dwell=4;}if(tram.d<4.3||tram.d>tram.route.length-4.3){tram.d=clamp(tram.d,4.3,tram.route.length-4.3)-8.65*tram.direction;tram.cars.reverse();tram.direction*=-1;tram.lastStop=-1;tram.dwell=3;}}
  for(let i=0;i<2;i++){const pose=sampleRail(tram.route,tram.d-i*8.65*tram.direction),g=tram.cars[i],y=surfaces.getTramHeight(pose.road,pose.x,pose.z,g.position.y);g.visible=dist(pose,player)<700;g.position.set(pose.x,y,pose.z);g.rotation.y=pose.yaw+(tram.direction<0?Math.PI:0);g.userData.surfaceType='tram';g.userData.supportsTerrainSnap=!pose.road?.crossing&&!pose.road?.tunnel&&!pose.road?.b&&!Number(pose.road?.layer);if(!g.visible)continue;
   for(const actor of actors){if(actor.mesh&&!actor.mesh.visible||actor.tramHitUntil>time||Math.abs((actor.y??g.position.y)-g.position.y)>3)continue;const dx=actor.x-pose.x,dz=actor.z-pose.z,side=dx*Math.cos(pose.yaw)-dz*Math.sin(pose.yaw),along=dx*Math.sin(pose.yaw)+dz*Math.cos(pose.yaw);if(Math.abs(side)<1.5+(actor.spec?.width||actor.car?.spec.width||.7)/2&&Math.abs(along)<4.5+(actor.spec?.length||actor.car?.spec.length||.7)/2){actor.tramHitUntil=time+1.2;kick(actor,Math.cos(pose.yaw)*(side<0?-1:1)*18,-Math.sin(pose.yaw)*(side<0?-1:1)*18);}}
  }
 }
 const {body,head,dummy}=ensurePassengers(this);let count=0;
 for(const route of this.routes.slice(0,1))for(const stop of route.stops||[]){const pose=sampleRail(route,stop);if(dist(pose,player)>520)continue;const stopped=this.vehicles.find(t=>t.route===route&&t.dwell>0&&Math.abs(t.d-stop)<3),num=stopped?2:4,walk=stopped?clamp(1-stopped.dwell/4,0,1):0;
  for(let i=0;i<num&&count<24;i++){const side=i%2?-1:1,bx=pose.x+Math.cos(pose.yaw)*side*(2.1+Math.floor(i/2)*.75),bz=pose.z-Math.sin(pose.yaw)*side*(2.1+Math.floor(i/2)*.75),x=bx+(pose.x-bx)*walk,z=bz+(pose.z-bz)*walk,y=surfaces.getWalkableSurfaceHeight(x,z);dummy.position.set(x,y+.72,z);dummy.scale.set(.18,.72,.18);dummy.updateMatrix();body.setMatrixAt(count,dummy.matrix);dummy.position.y=y+1.55;dummy.scale.set(.15,.18,.15);dummy.updateMatrix();head.setMatrixAt(count,dummy.matrix);count++;}}
 body.count=head.count=count;body.instanceMatrix.needsUpdate=head.instanceMatrix.needsUpdate=true;
};
