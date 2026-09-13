import * as THREE from './vendor/three.module.js';
import {vehicleFootprint} from './movement.js';
import {box,bake} from './landmarks.js';
import {clamp,dist} from './core.js';

export const PORTELLO_GATE={x:1240.7,z:-365.4,yaw:.17};
export const PORTELLO_BRIDGE={x:1244.8,z:-395.2,yaw:.17,length:39,width:7};

const structure=(terrain,x,z,yaw,width,length,height,kind,color,minY=null)=>{
 const y=minY??terrain.height(x,z);const p=vehicleFootprint(x,z,yaw,width,length),xs=p.map(v=>v[0]),zs=p.map(v=>v[1]);
 return {x,z,y,yaw,w:width,length,h:height,kind,color,p,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:y};
};

// The source footprint is a single solid rectangle. Marking it as an authored,
// passable gate lets the two real openings replace that blocking collision.
export function preparePortello(data){
 const gate=data.buildings.find(b=>b.n==='Porta Ognissanti');
 if(gate){gate.authoredLandmark=true;gate.passableGateway=true;}
 return gate;
}

export function portelloStructures(terrain){
 const g=PORTELLO_GATE,b=PORTELLO_BRIDGE,out=[];
 // Two masonry wings leave a 5.4 m clear passage through Porta Portello.
 for(const side of [-1,1])out.push(structure(terrain,g.x+Math.cos(g.yaw)*side*5.75,g.z-Math.sin(g.yaw)*side*5.75,g.yaw,6.1,18.6,12.5,'portello-gate','#ad7254'));
 // The upper arch/lintel is height-aware and does not block people or road vehicles.
 out.push(structure(terrain,g.x,g.z,g.yaw,5.4,18.6,4.1,'portello-lintel','#b67958',terrain.height(g.x,g.z)+7.1));
 // Continuous bridge parapets, outside the seven-metre pedestrian carriageway.
 for(const side of [-1,1]){
  const x=b.x+Math.cos(b.yaw)*side*4.05,z=b.z-Math.sin(b.yaw)*side*4.05;
  out.push(structure(terrain,x,z,b.yaw,.42,b.length,1.25,'portello-parapet','#c8b596'));
 }
 return out;
}

function archRing(root,width,height,depth,color){
 const r=width/2,outer=new THREE.Shape();outer.moveTo(-r,0);outer.lineTo(-r,height-r);outer.absarc(0,height-r,r,Math.PI,0,true);outer.lineTo(r,0);outer.closePath();
 const ir=r-1.05,inner=new THREE.Path();inner.moveTo(-ir,.05);inner.lineTo(-ir,height-r);inner.absarc(0,height-r,ir,Math.PI,0,false);inner.lineTo(ir,.05);inner.closePath();outer.holes.push(inner);
 const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(outer,{depth,bevelEnabled:false,curveSegments:12}),new THREE.MeshStandardMaterial({color,roughness:1}));mesh.position.z=-depth/2;root.add(mesh);
}
function bike(root,x,z,yaw,color='#486f75',scooter=false){
 const g=new THREE.Group();g.position.set(x,.08,z);g.rotation.y=yaw;root.add(g);
 const dark='#263235';
 if(scooter){box(g,color,0,.32,0,.16,.10,1.02);box(g,dark,0,.26,-.36,.23,.16,.23);box(g,dark,0,.26,.36,.23,.16,.23);box(g,color,0,.85,.36,.08,1.08,.08);box(g,dark,0,1.35,.34,.54,.07,.08);}
 else{for(const zz of [-.48,.48]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.31,.045,6,12),new THREE.MeshStandardMaterial({color:dark}));wheel.position.set(0,.36,zz);wheel.rotation.y=Math.PI/2;g.add(wheel);}box(g,color,0,.55,0,.08,.08,.82);const frame=box(g,color,0,.65,0,.08,.7,.08);frame.rotation.x=Math.PI/4;box(g,dark,0,.91,-.06,.36,.08,.13);box(g,dark,0,.94,.42,.5,.06,.08);}
 return g;
}

export function createPortelloDetails(terrain){
 const root=new THREE.Group(),gate=new THREE.Group(),g=PORTELLO_GATE;gate.position.set(g.x,terrain.height(g.x,g.z),g.z);gate.rotation.y=g.yaw;root.add(gate);
 // A genuine void in the mesh matches the collision passage.
 for(const side of [-1,1])box(gate,'#ad7254',side*5.75,6.25,0,6.1,12.5,18.6);
 for(const side of [-1,1]){const face=new THREE.Group();face.position.z=side*9.31;face.rotation.y=side<0?Math.PI:0;gate.add(face);archRing(face,5.4,11.2,.32,'#d2b88f');box(face,'#d2b88f',0,11.65,0,17.6,.7,.4);}
 for(const side of [-1,1])box(gate,'#655b4e',side*5.75,8.1,side*9.37,1.0,2.5,.12);
 box(gate,'#8d5945',0,13.1,0,19.2,1.2,20);box(gate,'#69706b',0,14.3,0,16.8,1.4,17.8);
 // Broad readable steps on both river banks. They are visual overlays on the
 // existing OSM pedestrian/steps network, so walking collision stays continuous.
 const steps=new THREE.Group();steps.userData.portelloSteps=true;root.add(steps);
 for(const side of [-1,1])for(let i=0;i<7;i++){const x=1231+side*10.5,z=-414-side*i*1.15,y=terrain.height(x,z)+i*.17;box(steps,'#c8b99d',x,y+.09,z,8.5,.18,1.3);}
 // Student furniture and parked micromobility remain cheap static geometry.
 const campus=new THREE.Group();campus.userData.portelloCampus=true;root.add(campus);
 for(const [x,z,yaw] of [[1214,-423,.2],[1194,-447,.2],[1261,-431,.1]]){const y=terrain.height(x,z);box(campus,'#705a42',x,y+.43,z,2.2,.12,.7);for(const side of [-1,1])box(campus,'#4d5552',x+side*.78,y+.2,z,.10,.4,.55);}
 for(const [i,p] of [[0,[1210,-430,.2]],[1,[1212,-432,.2]],[2,[1260,-438,.1]],[3,[1262,-440,.1]],[4,[1190,-452,.2]],[5,[1192,-454,.2]]])bike(campus,p[0],p[1],p[2],i%2?'#c17b51':'#527b82',i>=4);
 for(const [x,z] of [[1218,-437],[1270,-424]]){const y=terrain.height(x,z);box(campus,'#e1bd5d',x,y+1.05,z,2.2,2.1,.12);box(campus,'#4d676b',x,y+1.05,z+.07,1.75,1.55,.04);}
 bake(steps);bake(campus);return root;
}

export const MICROMOBILITY_ROUTES=[
 {kind:'bike',points:[[1100,-447],[1141,-439],[1195,-428],[1236,-421],[1249,-416],[1260,-447],[1276,-487],[1288,-501],[1264,-493],[1226,-501],[1206,-472],[1169,-466],[1142,-472]]},
 {kind:'bike-basket',points:[[1060,-479],[1108,-490],[1146,-490],[1155,-507],[1160,-533],[1127,-540],[1115,-489],[1102,-461]]},
 {kind:'scooter',points:[[1229,-414],[1234,-413],[1243,-403],[1241,-389],[1242,-375],[1239,-356],[1217,-358],[1165,-368],[1098,-383],[1095,-448],[1141,-439],[1212,-417]]}
];

export const micromobilityCount=quality=>({hyper:2,low:4,medium:6,high:8}[quality]??4);

export function createMicromobilityActor(index,terrain){
 const route=MICROMOBILITY_ROUTES[index%MICROMOBILITY_ROUTES.length],root=new THREE.Group();bike(root,0,0,0,index%2?'#c87d53':'#4d7680',route.kind==='scooter');
 const rider=new THREE.Group(),shirt=new THREE.MeshStandardMaterial({color:['#708fa0','#b96f58','#d1ae65','#657d66'][index%4]});
 box(rider,shirt.color,0,1.35,0,.46,.62,.3);box(rider,'#c99f7e',0,1.82,0,.32,.34,.3);for(const side of [-1,1])box(rider,'#39454a',side*.13,.73,0,.16,.72,.2);root.add(rider);
 const p=route.points[index%route.points.length];root.position.set(p[0],terrain.height(...p),p[1]);return {mesh:root,route,index:index%route.points.length,x:p[0],z:p[1],yaw:0,speed:0,seed:index,kind:route.kind};
}

export function stepMicromobility(actor,dt,terrain,obstacles=[]){
 const points=actor.route.points,target=points[(actor.index+1)%points.length],dx=target[0]-actor.x,dz=target[1]-actor.z,d=Math.hypot(dx,dz),wantedYaw=Math.atan2(dx,dz),turn=Math.atan2(Math.sin(wantedYaw-actor.yaw),Math.cos(wantedYaw-actor.yaw));
 if(d<2.2)actor.index=(actor.index+1)%points.length;
 const blocked=obstacles.some(o=>o.mesh?.visible&&dist(actor,o)<2.3),goal=blocked?0:actor.kind==='scooter'?4.3:3.2;
 actor.speed+=clamp(goal-actor.speed,-3.5*dt,2.2*dt);actor.yaw+=clamp(turn,-2.4*dt,2.4*dt);actor.x+=Math.sin(actor.yaw)*actor.speed*dt;actor.z+=Math.cos(actor.yaw)*actor.speed*dt;actor.y=terrain.height(actor.x,actor.z,actor.y);
 actor.mesh.position.set(actor.x,actor.y,actor.z);actor.mesh.rotation.y=actor.yaw;return actor;
}
