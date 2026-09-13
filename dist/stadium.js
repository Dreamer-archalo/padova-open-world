import * as THREE from './vendor/three.module.js';
import {project} from './core.js';

const STADIUM=project(45.4352,11.8564);
const mats=new Map();
function mat(color,rough=.9){const k=color+','+rough;if(!mats.has(k))mats.set(k,new THREE.MeshStandardMaterial({color,roughness:rough}));return mats.get(k);}
function box(g,color,x,y,z,w,h,d,shadow=false){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;g.add(m);return m;}
function goal(g,z,side){const white='#e6e8df';box(g,white,-3.66,1.22,z,.12,2.44,.12);box(g,white,3.66,1.22,z,.12,2.44,.12);box(g,white,0,2.44,z,7.44,.12,.12);const net=new THREE.Mesh(new THREE.PlaneGeometry(7.3,2.35),new THREE.MeshBasicMaterial({color:'#d5ddd8',transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false}));net.position.set(0,1.2,z+side*1.1);net.rotation.x=Math.PI/2*.03;g.add(net);}
function floodlight(g,x,z){box(g,'#596467',x,11,z,.3,22,.3);box(g,'#cbd2c9',x,21.3,z,4.5,.35,.45);for(let i=-1;i<=1;i++){const lamp=box(g,'#ece4bb',x+i*1.35,21.1,z-.27,1,.65,.12);lamp.material=lamp.material.clone();lamp.material.emissive=new THREE.Color('#8b845f');lamp.material.emissiveIntensity=.18;}}
function makeTeam(color,count){const body=new THREE.InstancedMesh(new THREE.CylinderGeometry(.18,.21,.78,6),mat(color,.8),count),head=new THREE.InstancedMesh(new THREE.SphereGeometry(.16,6,4),mat('#d1a27e',.85),count);body.castShadow=head.castShadow=false;body.receiveShadow=head.receiveShadow=false;return {body,head};}
export function createStadium(terrain){
 const root=new THREE.Group();root.userData.poi='stadio-euganeo';root.userData.centre=STADIUM;root.userData.maxDistance=950;const y=terrain.elevation(STADIUM.x,STADIUM.z);root.position.set(STADIUM.x,y+.08,STADIUM.z);root.rotation.y=.08;
 const pitch=new THREE.Mesh(new THREE.PlaneGeometry(105,68),mat('#557b48'));pitch.rotation.x=-Math.PI/2;pitch.position.y=.06;pitch.receiveShadow=true;root.add(pitch);
 const centre=new THREE.Mesh(new THREE.RingGeometry(9.05,9.2,48),new THREE.MeshBasicMaterial({color:'#d9e2cd',side:THREE.DoubleSide}));centre.rotation.x=-Math.PI/2;centre.position.y=.08;root.add(centre);box(root,'#e0e7d7',0,.085,0,.12,.02,68);for(const z of [-52.5,52.5])goal(root,z,z<0?1:-1);
 const track=new THREE.Mesh(new THREE.RingGeometry(.72,1,64),mat('#a76558'));track.rotation.x=-Math.PI/2;track.scale.set(82,60,1);track.position.y=.015;root.add(track);
 for(const [x,z,w,d,y0,h] of [[0,-72,132,18,4,8],[0,72,132,18,4,8],[-88,0,18,106,3.5,7],[88,0,18,106,3.5,7]]){box(root,'#8f9690',x,y0,z,w,h,d);box(root,'#cad0c8',x,y0+h/2+.45,z,w+.8,.7,d+.8);}
 for(const z of [-72,72])for(let x=-55;x<=55;x+=11)box(root,(Math.abs(x/11)%2?'#455d72':'#c7c9c0'),x,8.3,z+(z<0?8:-8),9,.35,7);
 for(const [x,z] of [[-82,-58],[82,-58],[-82,58],[82,58]])floodlight(root,x,z);
 const home=makeTeam('#c04c43',9),away=makeTeam('#476b91',9),heads=new THREE.Group();root.add(home.body,home.head,away.body,away.head,heads);
 const ball=new THREE.Mesh(new THREE.SphereGeometry(.23,8,6),mat('#efeee7',.7));ball.castShadow=false;root.add(ball);
 const dummy=new THREE.Object3D(),players=[];for(let i=0;i<18;i++)players.push({team:i<9?home:away,index:i%9,seed:i*1.731,baseX:-38+(i%6)*15.2,baseZ:-22+Math.floor(i/6)*22});
 function updatePlayers(time){for(const p of players){const x=p.baseX+Math.sin(time*.45+p.seed)*5.4,z=p.baseZ+Math.cos(time*.38+p.seed)*6.2,y=.52,d=p.team;dummy.position.set(x,y,z);dummy.scale.set(1,1,1);dummy.rotation.y=Math.atan2(Math.sin(time*.31+p.seed),Math.cos(time*.27+p.seed));dummy.updateMatrix();d.body.setMatrixAt(p.index,dummy.matrix);dummy.position.y=1.03;dummy.scale.set(1,1,1);dummy.updateMatrix();d.head.setMatrixAt(p.index,dummy.matrix);}home.body.instanceMatrix.needsUpdate=home.head.instanceMatrix.needsUpdate=away.body.instanceMatrix.needsUpdate=away.head.instanceMatrix.needsUpdate=true;ball.position.set(Math.sin(time*.33)*27,.27,Math.cos(time*.41)*18);}
 updatePlayers(0);root.visible=false;
 return {root,centre:STADIUM,update(x,z){const visible=Math.hypot(x-STADIUM.x,z-STADIUM.z)<root.userData.maxDistance;root.visible=visible;if(visible)updatePlayers(performance.now()/1000);}};
}
