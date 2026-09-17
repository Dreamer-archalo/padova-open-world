import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {resolveHospital} from './hospital-rooftop-easter-egg.js';
import {findLayout,onTrack,roofClear} from './monoblocco-track.js';
import {vehicleFootprint,vehicleBlocked} from './movement.js';

const installed=new WeakSet();
const laneMat=new THREE.MeshStandardMaterial({color:'#4a5a61',roughness:1,side:THREE.DoubleSide,depthWrite:true});
const edgeMat=new THREE.MeshBasicMaterial({color:'#f5cc69',side:THREE.DoubleSide,depthWrite:true});
const skylightMat=new THREE.MeshStandardMaterial({color:'#85979b',roughness:.54,metalness:.13,flatShading:true});
const frameMat=new THREE.MeshStandardMaterial({color:'#43555c',roughness:.89});
function ribbon(root,layout,y,width,offset,material,name){
 const n=Math.max(256,Math.ceil(layout.total/.9)),coords=[];
 for(let i=0;i<n;i++){
  const a=onTrack(layout,i/n),b=onTrack(layout,(i+1)/n),dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
  if(len<.001)continue;
  const nx=dz/len,nz=-dx/len,span=width/2;
  const p=[a.x+nx*(offset-span),y,a.z+nz*(offset-span)],q=[a.x+nx*(offset+span),y,a.z+nz*(offset+span)];
  const r=[b.x+nx*(offset-span),y,b.z+nz*(offset-span)],s=[b.x+nx*(offset+span),y,b.z+nz*(offset+span)];
  coords.push(...p,...q,...r,...q,...s,...r);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();
 const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.receiveShadow=true;mesh.renderOrder=7;root.add(mesh);return mesh;
}
function featureCandidates(game,poly,layout,roofY,root){
 const fans=[];root.traverse(o=>{if(o.userData?.roofSpectator)fans.push(o.position);});
 const obstacles=(game.terrain.arcadeRamps||[]).filter(r=>r.hospitalRoof),route=Array.from({length:Math.max(180,Math.ceil(layout.total)),},(_,i,n)=>onTrack(layout,i/Math.max(180,Math.ceil(layout.total))));
 const xs=poly.map(q=>q[0]),zs=poly.map(q=>q[1]),candidates=[];
 for(let x=Math.min(...xs)+6;x<=Math.max(...xs)-6;x+=5)for(let z=Math.min(...zs)+6;z<=Math.max(...zs)-6;z+=5){
  if(!roofClear(poly,x,z,5)||Math.hypot(x-layout.helipad.x,z-layout.helipad.z)<23)continue;
  const routeDistance=Math.min(...route.map(p=>Math.hypot(x-p.x,z-p.z)));
  if(routeDistance<9||routeDistance>22||fans.some(f=>Math.hypot(x-f.x,z-f.z)<6)||obstacles.some(r=>Math.hypot(x-r.x,z-r.z)<11))continue;
  if(vehicleBlocked(x,z,0,game.collision,{width:4.2,length:4.2,height:2},roofY+.14))continue;
  candidates.push({x,z,routeDistance});
 }
 return candidates;
}
function addSkylights(game,root,poly,layout,roofY){
 const candidates=featureCandidates(game,poly,layout,roofY,root),selected=[];
 for(let i=0;i<3;i++){
  let best=null,score=-Infinity;
  for(const p of candidates){
   const spacing=selected.length?Math.min(...selected.map(q=>Math.hypot(p.x-q.x,p.z-q.z))):40;
   if(spacing<24)continue;
   const value=spacing*.65-Math.abs(p.routeDistance-13);
   if(value>score){score=value;best=p;}
  }
  if(!best)break;
  selected.push(best);
  // Three four-sided skylights give the skyline a legible architectural reason
  // without scattering unplanned mountain-like shapes across the bike lane.
  const group=new THREE.Group();group.name='monoblocco-purposeful-skylight';group.position.set(best.x,roofY,best.z);
  const base=new THREE.Mesh(new THREE.BoxGeometry(4.2,.34,4.2),frameMat);base.position.y=.17;group.add(base);
  const pyramid=new THREE.Mesh(new THREE.ConeGeometry(2.85,2.55,4,1),skylightMat);pyramid.rotation.y=Math.PI/4;pyramid.position.y=1.55;pyramid.castShadow=true;group.add(pyramid);root.add(group);
  const footprint=vehicleFootprint(best.x,best.z,0,4.2,4.2),xs=footprint.map(q=>q[0]),zs=footprint.map(q=>q[1]);
  game.collision.add({p:footprint,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:roofY,h:2.9,hospitalRoofSkylight:true},Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs));
 }
 return selected.length;
}
function install(game){
 if(installed.has(game))return;
 const site=resolveHospital(game);if(!site)return;
 const root=game.scene.children.find(o=>o.name==='ospedale-monoblocco-entire-roof-trial');if(!root)return;
 const layout=findLayout(site.polygon,site.building);if(!layout)return;installed.add(game);
 // This continuous, high-contrast lane remains a clear motorcycle-width road
 // even where the source roof has courtyards or decorative triangular roofs.
 ribbon(root,layout,site.roofY+.081,3.0,0,laneMat,'monoblocco-clearly-marked-rideable-lane');
 ribbon(root,layout,site.roofY+.091,.10,-1.38,edgeMat,'monoblocco-lane-left-edge');
 ribbon(root,layout,site.roofY+.091,.10,1.38,edgeMat,'monoblocco-lane-right-edge');
 const retained=addSkylights(game,root,site.polygon,layout,site.roofY);
 root.userData.courseVisuals={continuousLane:true,intentionalRoofShapes:retained};
}
const previous=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__monobloccoCourseVisuals){
 ModernGameplay.prototype.__monobloccoCourseVisuals=true;
 ModernGameplay.prototype.populate=function(...args){const out=previous.apply(this,args);install(this);return out;};
}
