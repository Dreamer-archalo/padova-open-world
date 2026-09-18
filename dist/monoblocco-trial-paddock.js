import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {vehicleFootprint,vehicleBlocked} from './movement.js';
import {resolveHospital} from './hospital-rooftop-easter-egg.js';
import {findLayout,onTrack,roofClear} from './monoblocco-track.js';

const installed=new WeakSet();
const paint=new THREE.MeshBasicMaterial({color:'#f4cf65',side:THREE.DoubleSide}),dark=new THREE.MeshStandardMaterial({color:'#273f49',roughness:.87}),cones=new THREE.MeshStandardMaterial({color:'#e67c31',roughness:.85});
function cube(root,mat,x,y,z,w,h,l,yaw=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),mat);m.position.set(x,y,z);m.rotation.y=yaw;m.castShadow=m.receiveShadow=true;root.add(m);return m;}
function distanceToCourse(layout,x,z){let closest=Infinity;for(let i=0;i<layout.points.length;i++){const a=layout.points[i],b=layout.points[(i+1)%layout.points.length],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));closest=Math.min(closest,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));}return closest;}
function safeSlot(game,site,layout,p){return roofClear(site.polygon,p.x,p.z,3.5)&&Math.hypot(p.x-layout.helipad.x,p.z-layout.helipad.z)>22&&distanceToCourse(layout,p.x,p.z)>4.2&&!vehicleBlocked(p.x,p.z,p.yaw,game.collision,{width:1.4,length:2.3,height:1.5},site.roofY+.12);}
function choosePaddock(game,site,layout){
 // A dedicated parking apron off the riding lane; never park across the loop.
 for(const t of [.82,.58,.12,.94,.32,.70]){
  const p=onTrack(layout,t),s=Math.sin(p.yaw),c=Math.cos(p.yaw);
  for(const side of [-1,1])for(const offset of [7,9,11]){
   const spots=[-3.1,0,3.1].map(d=>({x:p.x+c*side*offset+s*d,z:p.z-s*side*offset+c*d,yaw:p.yaw}));
   if(spots.every(q=>safeSlot(game,site,layout,q)))return {spots,entry:p,side};
  }
 }
 return null;
}
function removeFakeBridges(game,root){
 const old=(game.terrain.arcadeRamps||[]).filter(r=>r.kind==='hospital-roof-wooden-bridge');
 game.terrain.arcadeRamps=game.terrain.arcadeRamps.filter(r=>r.kind!=='hospital-roof-wooden-bridge');
 // The original wooden deck and seven decorative planks at each site had been
 // incorrectly called bridges despite sitting wholly on traversable roof.
 let removed=0;
 for(const mesh of [...root.children]){
  if(!mesh.isMesh||!mesh.material?.color)continue;
  const hex=mesh.material.color.getHexString();
  if(hex==='936542'||hex==='b28a5a'){root.remove(mesh);mesh.geometry?.dispose();removed++;}
 }
 root.userData.removedFakeBridges=old.length;
 root.userData.removedFakeBridgeMeshes=removed;
 return old.length;
}
function sign(root,x,z,y,yaw){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#142d39';ctx.fillRect(0,0,768,256);ctx.strokeStyle='#f4cf65';ctx.lineWidth=17;ctx.strokeRect(11,11,746,234);
 ctx.fillStyle='#f4cf65';ctx.textAlign='center';ctx.font='bold 71px sans-serif';ctx.fillText('MOTO TRIAL',384,114);ctx.fillStyle='#ffffff';ctx.font='bold 39px sans-serif';ctx.fillText('E  ·  SALI IN SELLA',384,183);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 const panel=new THREE.Mesh(new THREE.PlaneGeometry(5.6,1.87),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));panel.position.set(x,y+2.5,z);panel.rotation.y=yaw;panel.name='monoblocco-motorcycle-parking-sign';root.add(panel);
 cube(root,dark,x,y+1.1,z,.14,2.2,.15);return panel;
}
function parking(game,root,site,layout){
 const spot=choosePaddock(game,site,layout);if(!spot)return {available:0,reason:'No clear three-bike roof apron'};
 const old=game.cars.find(c=>c.hospitalRoofBike&&c.parked),bikes=[];
 for(let i=0;i<spot.spots.length;i++){
  const p=spot.spots[i];let bike=i===1?old:null;
  if(!bike)bike=game.addCar(p.x,p.z,p.yaw,false,true,'rooftrial');
  Object.assign(bike,{x:p.x,z:p.z,y:site.roofY+.11,yaw:p.yaw,speed:0,health:100,parked:true,fixedSpawn:true,missionUnit:true,budgetSleeping:false,hospitalRoofBike:true,roofTrialPlayerBike:true,name:'Moto Trial · '+(i+1)});
  bike.mesh.visible=true;game.pose(bike);if(bike.rider)bike.rider.visible=false;bikes.push(bike);
  cube(root,paint,p.x,site.roofY+.073,p.z,1.36,.018,2.7,p.yaw);
  for(const side of [-1,1])cube(root,paint,p.x+Math.cos(p.yaw)*side*.86,site.roofY+.078,p.z-Math.sin(p.yaw)*side*.86,.08,.02,3,p.yaw);
 }
 const centre=spot.spots[1],s=Math.sin(centre.yaw),c=Math.cos(centre.yaw);
 const marker={x:centre.x+c*spot.side*3.0,z:centre.z-s*spot.side*3.0};
 sign(root,marker.x,marker.z,site.roofY,centre.yaw+Math.PI/2);
 root.userData.bikeStation={x:centre.x,z:centre.z,bikes:bikes.length,marked:true,offTrack:true};
 return {available:bikes.length,site:root.userData.bikeStation};
}
function slalom(game,root,site,layout){
 const made=[];
 for(const t of [.065,.195,.335,.475,.615,.755,.905]){
  const p=onTrack(layout,t),side=made.length%2?1:-1,normal={x:Math.cos(p.yaw),z:-Math.sin(p.yaw)},x=p.x+normal.x*side*1.17,z=p.z+normal.z*side*1.17;
  if(!roofClear(site.polygon,x,z,3.6)||Math.hypot(x-layout.helipad.x,z-layout.helipad.z)<20)continue;
  if((game.terrain.arcadeRamps||[]).some(r=>r.hospitalRoof&&Math.hypot(r.x-x,r.z-z)<9))continue;
  if(root.userData.bikeStation&&Math.hypot(root.userData.bikeStation.x-x,root.userData.bikeStation.z-z)<13)continue;
  if(vehicleBlocked(x,z,p.yaw,game.collision,{width:.55,length:.55,height:.65},site.roofY+.16))continue;
  const cone=new THREE.Mesh(new THREE.ConeGeometry(.33,.67,8),cones);cone.position.set(x,site.roofY+.41,z);cone.castShadow=true;cone.name='monoblocco-slalom-physical-cone';root.add(cone);
  const footprint=vehicleFootprint(x,z,0,.56,.56),xs=footprint.map(q=>q[0]),zs=footprint.map(q=>q[1]);
  game.collision.add({p:footprint,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:site.roofY,h:.70,hospitalRoofSlalom:true},Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs));made.push({x,z});
 }
 root.userData.roofSlalomCones=made.length;return made.length;
}
function install(game){if(installed.has(game))return;const site=resolveHospital(game);if(!site)return;const root=game.scene.children.find(o=>o.name==='ospedale-monoblocco-entire-roof-trial');if(!root)return;const layout=findLayout(site.polygon,site.building);if(!layout)return;installed.add(game);
 const falseBridgesRemoved=removeFakeBridges(game,root);const bikes=parking(game,root,site,layout);const obstacleCount=slalom(game,root,site,layout);
 root.userData.trialPaddock={falseBridgesRemoved,motorcycles:bikes.available,obstacleCount,station:bikes.site||null,reason:bikes.reason||null};
}
const populate=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__monobloccoTrialPaddock){ModernGameplay.prototype.__monobloccoTrialPaddock=true;ModernGameplay.prototype.populate=function(...args){const out=populate.apply(this,args);install(this);return out;};}
