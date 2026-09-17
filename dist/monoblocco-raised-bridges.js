import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {vehicleFootprint,vehicleBlocked} from './movement.js';
import {roofClear,findLayout} from './monoblocco-track.js';
import {resolveHospital} from './hospital-rooftop-easter-egg.js';
import {findGapBridges} from './monoblocco-course-polish.js';

const installed=new WeakSet(),wood=new THREE.MeshStandardMaterial({color:'#a9825c',roughness:.94}),rails=new THREE.MeshStandardMaterial({color:'#5d5f60',metalness:.34,roughness:.7}),cables=new THREE.LineBasicMaterial({color:'#cbb795'});
function box(root,material,x,y,z,w,h,l,yaw=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),material);mesh.position.set(x,y,z);mesh.rotation.y=yaw;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;}
function solidRail(game,root,x,z,y,yaw,length,side,width){
 const half=width/2+.12,px=x+Math.cos(yaw)*side*half,pz=z-Math.sin(yaw)*side*half;
 box(root,rails,px,y+.63,pz,.12,.85,length-.5,yaw);
 const poly=vehicleFootprint(px,pz,yaw,.12,length-.5),xs=poly.map(q=>q[0]),zs=poly.map(q=>q[1]);
 game.collision.add({p:poly,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:y+.17,h:.85,hospitalRoofRaisedBridgeRail:true},Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs));
 const nodes=[];
 for(let i=0;i<=16;i++){
  const u=i/16-.5,d=u*(length-.5);
  nodes.push(new THREE.Vector3(px+Math.sin(yaw)*d,y+2.25-.7*(1-4*u*u),pz+Math.cos(yaw)*d));
  if(i%4===0)box(root,rails,px+Math.sin(yaw)*d,y+1.05,pz+Math.cos(yaw)*d,.12,2,.12);
 }
 root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(nodes),cables));
}
function incline(game,root,roof,deck,x,z,yaw,width,length){
 const s=Math.sin(yaw),c=Math.cos(yaw),cx=x-s*length/2,cz=z-c*length/2,rise=deck-roof;
 game.terrain.arcadeRamps.push({kind:'hospital-roof-bridge-approach',hospitalRoof:true,realGapBridgeApproach:true,x:cx,z:cz,yaw,width,length,rise,baseY:roof,topY:[roof,roof,deck,deck]});
 const mesh=box(root,wood,cx,roof+rise/2+.04,cz,width,.16,length,yaw);mesh.rotation.order='YXZ';mesh.rotation.x=-Math.atan2(rise,length);
}
function candidateSafe(game,site,layout,p,deck){
 const s=Math.sin(p.yaw),c=Math.cos(p.yaw),w=3.5,run=5.8;
 // Original take-off ramps can sit nearby, but cannot physically intersect the
 // bridge approach. New ramps have been generated around reserved bridge ends.
 for(const end of [p.a,p.b])if((game.terrain.arcadeRamps||[]).some(r=>r.hospitalRoof&&Math.hypot(r.x-end.x,r.z-end.z)<7.5))return 'overlapping stunt ramp';
 for(let k=0;k<=16;k++){
  const t=k/16,d=t*run,height=site.roofY+(deck-site.roofY)*t;
  for(const side of [-1,0,1]){
   const ax=p.a.x-s*(run-d)+c*side*w/2,az=p.a.z-c*(run-d)-s*side*w/2;
   const bx=p.b.x+s*(run-d)+c*side*w/2,bz=p.b.z+c*(run-d)-s*side*w/2;
   if(!roofClear(site.polygon,ax,az,1.2)||!roofClear(site.polygon,bx,bz,1.2))return 'approach leaves supported roof';
   if(Math.hypot(ax-layout.helipad.x,az-layout.helipad.z)<18||Math.hypot(bx-layout.helipad.x,bz-layout.helipad.z)<18)return 'helipad clearance';
  }
  if(vehicleBlocked(p.a.x-s*(run-d),p.a.z-c*(run-d),p.yaw,game.collision,{width:1,length:1.95,height:1.35},height))return 'blocked entry ramp';
  if(vehicleBlocked(p.b.x+s*(run-d),p.b.z+c*(run-d),p.yaw,game.collision,{width:1,length:1.95,height:1.35},height))return 'blocked exit ramp';
 }
 for(let k=0;k<=32;k++){
  const t=k/32,x=p.a.x+(p.b.x-p.a.x)*t,z=p.a.z+(p.b.z-p.a.z)*t;
  // The deck must physically clear existing parapets: do not remove external
  // parapets simply to make a visually convincing but unsafe bridge.
  if(vehicleBlocked(x,z,p.yaw,game.collision,{width:1,length:1.95,height:1.35},deck))return 'blocked elevated deck';
 }
 return null;
}
function raisedBridge(game,root,site,p,index){
 const y=site.roofY,deck=y+1.43,run=5.8,w=3.5,length=Math.hypot(p.b.x-p.a.x,p.b.z-p.a.z),s=Math.sin(p.yaw),c=Math.cos(p.yaw);
 incline(game,root,y,deck,p.a.x,p.a.z,p.yaw,w,run);
 // Reverse heading: the upper end must touch the span, the lower end the exit.
 incline(game,root,y,deck,p.b.x,p.b.z,p.yaw+Math.PI,w,run);
 game.terrain.arcadeRamps.push({kind:'hospital-roof-elevated-tibetan-bridge',hospitalRoof:true,realGapBridge:true,x:p.x,z:p.z,yaw:p.yaw,width:w,length:length+.3,rise:deck-y,baseY:y,topY:[deck,deck,deck,deck]});
 box(root,wood,p.x,deck-.08,p.z,w,.16,length+.3,p.yaw);
 for(let d=-length/2+.5;d<length/2-.4;d+=.8)box(root,wood,p.x+s*d,deck+.028,p.z+c*d,w-.16,.035,.58,p.yaw);
 for(const side of [-1,1])solidRail(game,root,p.x,p.z,deck,p.yaw,length+.3,side,w);
 root.userData['monobloccoSuspensionBridge'+index]={x:p.x,z:p.z,length,deck,physical:true};
}
function install(game){
 if(installed.has(game))return;
 const site=resolveHospital(game);if(!site)return;
 const root=game.scene.children.find(o=>o.name==='ospedale-monoblocco-entire-roof-trial');if(!root)return;
 const layout=findLayout(site.polygon,site.building);if(!layout)return;installed.add(game);
 const choices=root.userData.bridgeReservations||findGapBridges(site.polygon,layout),placed=[],audit=[];
 for(const p of choices){
  const reason=candidateSafe(game,site,layout,p,site.roofY+1.43);
  audit.push({x:p.x,z:p.z,span:p.length,status:reason||'constructed'});
  if(reason)continue;
  raisedBridge(game,root,site,p,placed.length);placed.push(p);
 }
 root.userData.bridgeAudit=audit;
 root.userData.raisedBridgeCount=placed.length;
 if(root.userData.coursePolish)root.userData.coursePolish.realGapBridges=placed.length;
}
const populate=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__monobloccoRaisedBridges){
 ModernGameplay.prototype.__monobloccoRaisedBridges=true;
 ModernGameplay.prototype.populate=function(...args){const out=populate.apply(this,args);install(this);return out;};
}
