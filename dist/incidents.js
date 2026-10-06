import * as THREE from './vendor/three.module.js';
import {clamp} from './core.js';
// Crash damage follows speed into the contacted surface; healthy cars cannot
// explode from crossing an arbitrary speed threshold. Fuel and weapons retain
// their explicit explosions in their own controllers.
export function impactResponse(speed){const energy=Math.abs(speed);return {damage:clamp(Math.max(0,energy-3)**1.55*.12,0,72),impulse:Math.min(20,energy*.4),spin:Math.min(1.25,energy*.025),destroy:false};}
export class Incidents{
 constructor(scene){this.scene=scene;this.effects=[];this.recovery=null;}
 explode(pose,time,reason){if(this.recovery)return false;this.recovery={x:pose.x,z:pose.z,yaw:pose.yaw,until:time+1.8,reason};this.blast(pose,time);return true;}
 blast(pose,time){const geometry=new THREE.SphereGeometry(1,6,4),material=new THREE.MeshBasicMaterial({color:'#ff8c35',transparent:true,opacity:1,depthWrite:false}),mesh=new THREE.InstancedMesh(geometry,material,22);this.scene.add(mesh);this.effects.push({mesh,x:pose.x,y:pose.y,z:pose.z,born:time});return true;}
 update(time){for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i],age=time-e.born;if(age>2){this.scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();this.effects.splice(i,1);continue;}const dummy=new THREE.Object3D();for(let n=0;n<22;n++){const a=n*2.3999;dummy.position.set(e.x+Math.cos(a)*age*(2+n%4),e.y+1+age*(2+n%3),e.z+Math.sin(a)*age*(2+n%4));dummy.scale.setScalar(Math.max(.01,(1-age/2)*(1+n%3*.4)));dummy.updateMatrix();e.mesh.setMatrixAt(n,dummy.matrix);}e.mesh.instanceMatrix.needsUpdate=true;e.mesh.material.opacity=Math.max(0,1-age/2);}}
}
