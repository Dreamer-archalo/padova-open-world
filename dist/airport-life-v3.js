// Airport life V3: lazy/cull decorative actors; road geometry and city physics unchanged.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {AIRPORT,areaPoint} from './gameplay-areas.js';
import {vehicleBlocked} from './movement.js';
const cube=new THREE.BoxGeometry(),ball=new THREE.SphereGeometry(.38,7,5),materials=new Map();
function mat(color,glow=false){const id=color+glow;if(!materials.has(id))materials.set(id,glow?new THREE.MeshBasicMaterial({color}):new THREE.MeshStandardMaterial({color,roughness:.82}));return materials.get(id);}
function box(root,x,y,z,w,h,d,color){const mesh=new THREE.Mesh(cube,mat(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);root.add(mesh);return mesh;}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const ROUTE=[[192,230],[192,467],[205,467],[205,230],[192,230]];
const ROUTE_SEG=ROUTE.slice(1).map((b,i)=>Math.hypot(b[0]-ROUTE[i][0],b[1]-ROUTE[i][1]));
const ROUTE_TOTAL=ROUTE_SEG.reduce((s,n)=>s+n,0);
export function baggageRoute(distance){
 let n=((distance%ROUTE_TOTAL)+ROUTE_TOTAL)%ROUTE_TOTAL;
 for(let i=0;i<ROUTE_SEG.length;i++){
  if(n<=ROUTE_SEG[i]){const a=ROUTE[i],b=ROUTE[i+1],f=n/Math.max(.001,ROUTE_SEG[i]);return {u:a[0]+(b[0]-a[0])*f,v:a[1]+(b[1]-a[1])*f,yaw:AIRPORT.yaw+Math.atan2(b[0]-a[0],b[1]-a[1])};}n-=ROUTE_SEG[i];
 }
 return {u:192,v:230,yaw:AIRPORT.yaw};
}
function baggageVehicle(){
 const root=new THREE.Group();root.name='Aeroporto · trenino bagagli';
 const tractor=new THREE.Group();box(tractor,0,.57,0,1.8,1,2.7,'#e4a944');box(tractor,0,1.24,-.48,1.15,.45,1.1,'#456477');
 for(const x of [-.75,.75])for(const z of [-.85,.85])box(tractor,x,.28,z,.36,.55,.55,'#30383d');root.add(tractor);
 const wagons=[];
 for(let i=0;i<3;i++){
  const w=new THREE.Group();box(w,0,.54,0,1.7,.18,2.35,'#657f88');
  for(const x of [-.65,.65])for(const z of [-.72,.72])box(w,x,.25,z,.36,.48,.5,'#30383d');
  for(let j=0;j<4;j++){const x=(j%2?1:-1)*.42,z=(j<2?-.5:.5);box(w,x,.94,z,.68,.7,.73,['#bd6054','#556b97','#d7b36a','#6d917f'][(j+i)%4]);}
  root.add(w);wagons.push(w);
 }
 return {root,tractor,wagons,distance:0,speed:5};
}
function updateBaggage(g,dt){
 const s=g.state,nearAirport=near(s,AIRPORT)<920;
 if(!g.baggageTrain&&!nearAirport)return;
 if(!g.baggageTrain){g.baggageTrain=baggageVehicle();g.scene.add(g.baggageTrain.root);}
 const train=g.baggageTrain;train.root.visible=nearAirport;if(!nearAirport)return;
 const next=train.distance+train.speed*dt,points=[0,4,7.8,11.6].map(offset=>baggageRoute(next-offset));
 const places=points.map(p=>({...p,...areaPoint(AIRPORT,p.u,p.v)}));
 const spec={width:1.8,length:3,height:2.2};
 const clear=places.every((p,i)=>{
  const y=g.terrain.height(p.x,p.z);
  return g.terrain.dry(p.x,p.z,.85,y)&&!vehicleBlocked(p.x,p.z,p.yaw,g.collision,spec,y)&&near(s,p)>(i?5:8);
 });
 const trafficClear=places.every(p=>![...g.interactiveAirport?.carts?.values()||[],g.airportOperations?.service].some(c=>c&&c.mesh?.visible&&near(c,p)<5.8));
 if(clear&&trafficClear)train.distance=next;
 const units=[train.tractor,...train.wagons];
 for(let i=0;i<units.length;i++){
  const loc=baggageRoute(train.distance-[0,4,7.8,11.6][i]),p=areaPoint(AIRPORT,loc.u,loc.v);
  units[i].position.set(p.x,g.terrain.height(p.x,p.z),p.z);units[i].rotation.y=loc.yaw;
 }
}
// The existing cargo-service vehicle already traverses almost a kilometre of
// airport roads; add a recognisable cargo load to its actual moving chassis.
function markCargoService(g){
 const c=g.airportOperations?.service;if(!c||c.mesh.userData.airportBoxLoad)return;
 const load=new THREE.Group();load.name='Aeroporto · scatole trasportate';
 for(let i=0;i<4;i++)box(load,(i%2?1:-1)*.44,2.0+Math.floor(i/2)*.7,-1.1,.8,.65,.9,i%2?'#b68b5c':'#d0a873');
 c.mesh.add(load);c.mesh.userData.airportBoxLoad=true;
}
function smallAirplane(index){
 const g=new THREE.Group();const color=['#d3e1e5','#dbd9ca','#9caebb','#c9c8bf'][index%4];
 box(g,0,1.1,0,1.1,1.05,7,color);box(g,0,1.15,.55,9,.14,1.65,color);
 box(g,0,1.5,-2.75,3,.12,1.2,color);box(g,0,2,-2.7,.12,1.7,1.3,'#5d7990');
 box(g,0,1.7,1.75,.95,.45,1.65,'#3b6982');g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
 g.name='Traffico aereo cittadino · '+(index+1);return g;
}
// Ten loops of different diameters. Only aircraft within the draw distance
// own visible meshes; their positions continue to advance even while culled.
const SKY=[
 [620,790,0],[740,610,2.8],[1740,1580,1.1],[1860,2040,3.5],[1960,1510,5.0],
 [3150,2600,.1],[3420,2950,2.2],[3650,3100,4.3],
 [4800,4220,1.4],[5000,4500,4.6]
];
export function citySkyPose(index,time,terrain){
 const [rx,rz,phase]=SKY[index],theta=time*(55+index*3)/Math.max(rx,rz)+phase,
 x=rx*Math.cos(theta),z=rz*Math.sin(theta),yaw=Math.atan2(-rx*Math.sin(theta),rz*Math.cos(theta));
 return {x,z,y:terrain.elevation(x,z)+125+(index%3)*26,yaw};
}
function updateSky(g,dt){
 g.airportCitySky??=Array(SKY.length).fill(null);
 const s=g.state,t=s.elapsed;
 for(let i=0;i<SKY.length;i++){
  const p=citySkyPose(i,t,g.terrain),visible=near(s,p)<1450;
  let mesh=g.airportCitySky[i];if(!mesh&&visible){mesh=smallAirplane(i);g.scene.add(mesh);g.airportCitySky[i]=mesh;}
  if(!mesh)continue;mesh.visible=visible;if(visible){mesh.position.set(p.x,p.y,p.z);mesh.rotation.y=p.yaw;}
 }
}
function marshaller(){
 const root=new THREE.Group();box(root,0,.98,0,.63,1.1,.38,'#e9b33a');box(root,0,1.71,0,.44,.43,.4,'#dfc4a0');
 for(const sign of [-1,1])box(root,sign*.22,.42,0,.22,.75,.25,'#35444d');
 const arms=[];for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.41,1.46,0);box(arm,side*.38,-.05,0,.8,.16,.2,'#e6b13d');box(arm,side*.82,-.05,0,.15,.18,.26,'#ff7b41');root.add(arm);arms.push(arm);
 }
 return {root,arms};
}
const STAFF=[[142,370],[142,-310],[153,462]];
function crane(){
 const root=new THREE.Group();box(root,0,4,0,1.3,8,1.5,'#bca64c');box(root,4.3,8.15,0,11,.35,.6,'#c3ac53');
 box(root,0,1,0,3,2,3,'#606c6b');const cable=new THREE.Group();box(cable,0,-1,0,.12,2,.12,'#485151');
 box(cable,0,-2.5,0,2.2,1.2,2.2,'#b69364');root.add(cable);cable.position.set(5.5,7.8,0);
 return {root,cable};
}
function initStaff(g){
 g.airportLifeStaff={people:[],crane:null};
 for(const [i,[u,v]] of STAFF.entries()){
  const p=areaPoint(AIRPORT,u,v),y=g.terrain.height(p.x,p.z);
  if(vehicleBlocked(p.x,p.z,AIRPORT.yaw,g.collision,{width:.8,length:.8,height:1.8},y)||!g.terrain.dry(p.x,p.z,.5,y))continue;
  const actor=marshaller();actor.root.position.set(p.x,y,p.z);actor.root.rotation.y=AIRPORT.yaw;
  actor.root.name=i<2?'Aeroporto · segnalatore aerei':'Aeroporto · operaio';g.scene.add(actor.root);g.airportLifeStaff.people.push(actor);
 }
 for(const [u,v] of [[160,315],[151,-327]]){
  const p=areaPoint(AIRPORT,u,v),model=crane();model.root.position.set(p.x,g.terrain.height(p.x,p.z),p.z);
  model.root.rotation.y=AIRPORT.yaw;g.scene.add(model.root);
  (g.airportLifeStaff.cranes??=[]).push(model);
 }
}
function updateStaff(g,dt){
 const s=g.state,nearAirport=near(s,AIRPORT)<920;
 if(!g.airportLifeStaff&&!nearAirport)return;
 if(!g.airportLifeStaff)initStaff(g);
 const activeAircraft=g.airTraffic?.aircraft.some(a=>['taxi','hold','lineup','takeoff'].includes(a.phase));
 for(const [i,actor] of g.airportLifeStaff.people.entries()){
  const visible=nearAirport&&near(s,actor.root.position)<570;actor.root.visible=visible;
  if(!visible)continue;
  const t=s.elapsed*2.1+i;
  for(const [j,arm] of actor.arms.entries())arm.rotation.z=(j?1:-1)*(activeAircraft?.65:.25)+Math.sin(t+j*Math.PI)*.45;
  actor.root.rotation.y=AIRPORT.yaw+Math.sin(s.elapsed*.35+i)*.25;
 }
 for(const [i,model] of (g.airportLifeStaff.cranes||[]).entries()){
  model.root.visible=nearAirport&&near(s,model.root.position)<700;
  if(model.root.visible){model.cable.position.x=4.7+Math.sin(s.elapsed*.3+i)*2.0;model.cable.position.y=7.9+Math.sin(s.elapsed*.7+i)*1.2;}
 }
}
const lightGeo=new THREE.SphereGeometry(.45,7,5),lightColors=['#eaffb6','#f7d75c','#ffffff'];
function lights(g){
 const groups=lightColors.map(color=>new THREE.InstancedMesh(lightGeo,mat(color,true),28)),dummy=new THREE.Object3D();
 for(const group of groups){group.frustumCulled=false;g.scene.add(group);}
 const counts=[0,0,0];
 for(let i=0;i<42;i++)for(const side of [-1,1]){
  const group=(i+Math.max(0,side))%3,offset=side*19,v=-520+i*25,p=areaPoint(AIRPORT,offset,v);
  dummy.position.set(p.x,g.terrain.height(p.x,p.z)+.42,p.z);dummy.scale.setScalar(1);dummy.updateMatrix();groups[group].setMatrixAt(counts[group]++,dummy.matrix);
 }
 groups.forEach((g,i)=>{g.count=counts[i];g.instanceMatrix.needsUpdate=true;});
 return groups;
}
function updateLights(g){
 const nearAirport=near(g.state,AIRPORT)<1600;
 if(!g.airportRunwayLamps&&!nearAirport)return;
 if(!g.airportRunwayLamps)g.airportRunwayLamps=lights(g);
 const blink=Math.floor(g.state.elapsed*2.4)%3;
 g.airportRunwayLamps.forEach((group,i)=>{group.visible=nearAirport&&(i===0||i===blink);});
}
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__airportLifeV3){
 ModernGameplay.prototype.__airportLifeV3=true;
 ModernGameplay.prototype.populate=function(...args){const result=oldPopulate.apply(this,args);this.baggageTrain=null;this.airportCitySky=null;this.airportLifeStaff=null;this.airportRunwayLamps=null;return result;};
 ModernGameplay.prototype.update=function(dt){
  oldUpdate.call(this,dt);
  if(!this.state?.started||!Number.isFinite(dt)||dt<=0)return;
  markCargoService(this);updateBaggage(this,Math.min(dt,.12));updateSky(this,dt);updateStaff(this,dt);updateLights(this);
 };
}
