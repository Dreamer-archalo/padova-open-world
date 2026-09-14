import * as THREE from './vendor/three.module.js';
import {angleDiff,clamp,dist} from './core.js';

export const PORTELLO_SEATS=[
 {x:1213.3,z:-423,yaw:.2},{x:1193.3,z:-447,yaw:.2},{x:1260.3,z:-431,yaw:.1},
 {x:1214.7,z:-423,yaw:.2},{x:1194.7,z:-447,yaw:.2},{x:1261.7,z:-431,yaw:.1}
];

// Spawn probability is lowest inside the fast-moving camera cone. It never
// reaches zero at long range, preventing an empty road after a direction change.
export function spawnWeight(viewer,candidate,cameraYaw=viewer.yaw||0){
 const d=dist(viewer,candidate),bearing=Math.atan2(candidate.x-viewer.x,candidate.z-viewer.z),front=Math.abs(angleDiff(bearing,cameraYaw)),speed=Math.abs(viewer.speed||0),noPop=clamp(70+speed*2.4,70,240);
 if(front<.72&&d<noPop)return .035;
 if(front<1.15&&d<noPop*1.25)return .18;
 if(front>2.05)return 1.45;
 return front>1.15?1.12:.65;
}

export function socialProfile(seed,zone){
 if(zone==='university'){
  const roles=['student-group','student-walk','student-seated','student-group','student-wait','skater','musician','student-walk'];
  const role=roles[seed%roles.length];return {role,behavior:role==='student-group'?'group':role==='student-seated'||role==='musician'?'idle':role==='student-wait'?'wait':role==='skater'?'runner':'stroll'};
 }
 const roles=['walker','walker','conversation','waiting','seated','worker','dog-owner','walker','crossing','stroll'];const role=roles[seed%roles.length];
 return {role,behavior:role==='conversation'?'group':role==='waiting'?'wait':role==='seated'?'idle':role==='crossing'?'cross':role==='stroll'?'stroll':'destination'};
}

const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:1});
const cube=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,7,5);
const part=(root,geo,color,x,y,z,sx,sy,sz)=>{const mesh=new THREE.Mesh(geo,material(color));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);root.add(mesh);return mesh;};
export function createDog(seed=0){
 const root=new THREE.Group(),coat=['#765843','#b99a70','#3c3732','#d0b98e'][seed%4];root.position.set(seed%2?.62:-.62,.02,.1);
 part(root,cube,coat,0,.32,0,.34,.30,.58);part(root,sphere,coat,0,.48,.38,.27,.27,.30);part(root,cube,'#282b29',0,.48,.66,.12,.10,.12);
 for(const side of [-1,1]){part(root,cube,coat,side*.2,.14,-.18,.09,.32,.10);part(root,cube,coat,side*.2,.14,.19,.09,.32,.10);}
 const tail=part(root,cube,coat,0,.46,-.43,.08,.08,.42);tail.rotation.x=-.7;root.userData.tail=tail;
 const points=new Float32Array([0,1.08,0,root.position.x,.53,.05]),line=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(points,3)),new THREE.LineBasicMaterial({color:'#4c3d31'}));root.parentLeash=line;return root;
}
export function attachDog(person,seed=0){if(person.dog)return person.dog;const dog=createDog(seed);person.mesh.add(dog,dog.parentLeash);person.dog=dog;person.role='dog-owner';return dog;}
export function animateUrbanActor(person,time){
 if(person.dog){person.dog.position.z=.1+Math.sin(time*4+person.seed)*.12;person.dog.userData.tail.rotation.y=Math.sin(time*7+person.seed)*.7;}
 const hips=person.mesh.userData.hips;if(!hips)return;
 if(person.role==='student-seated'||person.role==='seated'){hips.rotation.x=-.3;hips.position.y=.18;for(const leg of hips.children)leg.rotation.x=-1.18;}
 else{hips.rotation.x=0;hips.position.y=0;}
 if(person.role==='musician'){person.mesh.rotation.z=Math.sin(time*3+person.seed)*.035;}
 if(person.role==='skater'){person.mesh.rotation.z=clamp(Math.sin(time*2+person.seed)*.12,-.12,.12);}
}
