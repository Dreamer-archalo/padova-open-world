import * as THREE from './vendor/three.module.js';
import {CityWorld,CHUNK} from './world.js';
import {ModernGameplay} from './modern-gameplay.js';
import {pointInside} from './core.js';
import {vehicleFootprint,vehicleBlocked} from './movement.js';
import {resolveHospital} from './hospital-rooftop-easter-egg.js';
import {findLayout,onTrack,roofClear} from './monoblocco-track.js';

// The flat trial deck is not sufficient on its own: the streamed city draws
// another layer of pitched roofs, some of which protrude through the deck.
// Remove only the protruding roof triangles *inside this exact OSM footprint*.
const MONOBLOCCO='Ospedale Civile - Monoblocco - Casse - Prenotazioni';
const sites=new WeakMap(),polished=new WeakSet();
function siteFor(world){
 if(sites.has(world))return sites.get(world);
 const b=world.data?.buildings?.find(v=>v.n===MONOBLOCCO&&v.p?.length>=15);
 const site=b?{polygon:b.p,y:b.minY+b.h+.13,minX:b.minX,maxX:b.maxX,minZ:b.minZ,maxZ:b.maxZ}:null;
 sites.set(world,site);return site;
}
function roofMesh(mesh,roofMaterial){
 if(!mesh.isMesh||!mesh.geometry?.getAttribute('position'))return false;
 if(mesh.userData.phase3RoofUpgrade)return true;
 if(!mesh.userData.streamBuildings)return false;
 const detailed=mesh.userData.detailedMaterial||mesh.material;
 return roofMaterial?detailed===roofMaterial:!!detailed?.vertexColors&&!detailed.map&&!mesh.userData.streamRoads;
}
function removeProtrusions(mesh,site){
 if(mesh.userData.monobloccoRoofCleaned)return 0;
 const original=mesh.geometry,position=original.getAttribute('position');
 if(original.index||!position||position.count%3)return 0;
 const keep=[];let removed=0;
 for(let i=0;i<position.count;i+=3){
  const x=(position.getX(i)+position.getX(i+1)+position.getX(i+2))/3;
  const z=(position.getZ(i)+position.getZ(i+1)+position.getZ(i+2))/3;
  const high=Math.max(position.getY(i),position.getY(i+1),position.getY(i+2));
  const low=Math.min(position.getY(i),position.getY(i+1),position.getY(i+2));
  if(x>=site.minX&&x<=site.maxX&&z>=site.minZ&&z<=site.maxZ&&high>site.y+.26&&low>site.y-2&&pointInside(x,z,site.polygon)){removed++;continue;}
  keep.push(i,i+1,i+2);
 }
 mesh.userData.monobloccoRoofCleaned=true;
 if(!removed)return 0;
 if(!keep.length){mesh.visible=false;return removed;}
 const cleaned=new THREE.BufferGeometry();
 for(const [name,attr] of Object.entries(original.attributes)){
  if(name==='normal')continue;
  const array=new attr.array.constructor(keep.length*attr.itemSize);
  for(let i=0;i<keep.length;i++)for(let j=0;j<attr.itemSize;j++)array[i*attr.itemSize+j]=attr.array[keep[i]*attr.itemSize+j];
  cleaned.setAttribute(name,new THREE.BufferAttribute(array,attr.itemSize,attr.normalized));
 }
 cleaned.computeVertexNormals();cleaned.computeBoundingSphere();
 mesh.geometry=cleaned;original.dispose();return removed;
}
function cleanGroup(group,site,roofMaterial){
 if(!site)return;
 group.traverse(mesh=>{if(roofMesh(mesh,roofMaterial))removeProtrusions(mesh,site);});
}
const originalStage=CityWorld.prototype.installStage;
if(!CityWorld.prototype.__monobloccoRoofTriangleCleanup){
 CityWorld.prototype.__monobloccoRoofTriangleCleanup=true;
 CityWorld.prototype.installStage=function(key,g,stage){
  const output=originalStage.call(this,key,g,stage),site=siteFor(this);
  if(site){
   const [i,j]=key.split(',').map(Number);
   if((i+1)*CHUNK>=site.minX&&i*CHUNK<=site.maxX&&(j+1)*CHUNK>=site.minZ&&j*CHUNK<=site.maxZ)cleanGroup(g,site,this.roofMat);
  }
  return output;
 };
}

function farFromHelipad(layout,x,z,margin=19){return Math.hypot(x-layout.helipad.x,z-layout.helipad.z)>=margin;}
function safeRamp(poly,layout,p,others){
 if(!p||!farFromHelipad(layout,p.x,p.z)||others.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<17))return false;
 const sin=Math.sin(p.yaw),cos=Math.cos(p.yaw),width=2.9;
 // Test the entire take-off deck and the landing corridor, including its edges.
 for(let d=-4;d<=19;d+=1.5)for(const side of [-1,0,1]){
  const x=p.x+sin*d+cos*side*width/2,z=p.z+cos*d-sin*side*width/2;
  if(!roofClear(poly,x,z,1.8)||!farFromHelipad(layout,x,z,15.5))return false;
 }
 return true;
}
export function chooseExtraRamps(poly,layout,oldRamps=[],limit=5){
 const chosen=[],taken=[...oldRamps];
 for(let k=0;k<180&&chosen.length<limit;k++){
  // Spread features around the lap, instead of concentrating them in one area.
  const p=onTrack(layout,((k*37)%180+.5)/180);
  if(!safeRamp(poly,layout,p,taken))continue;
  chosen.push(p);taken.push(p);
 }
 return chosen;
}
function ramp(game,root,y,p,i){
 const width=2.9,length=5.2,rise=[1.0,1.5,1.15,1.7,1.25][i%5];
 game.terrain.arcadeRamps.push({kind:'hospital-rooftop-jump',hospitalRoof:true,x:p.x,z:p.z,yaw:p.yaw,width,length,rise,baseY:y,topY:[y,y,y+rise,y+rise]});
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,.20,length),new THREE.MeshStandardMaterial({color:i%2?'#c98b47':'#b77743',roughness:.85}));
 mesh.position.set(p.x,y+rise/2+.07,p.z);mesh.rotation.order='YXZ';mesh.rotation.y=p.yaw;mesh.rotation.x=-Math.atan2(rise,length);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
 for(const side of [-1,1]){
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(.10,.018,length-.25),new THREE.MeshBasicMaterial({color:'#f4d06d'}));
  stripe.position.set(p.x+Math.cos(p.yaw)*side*(width/2-.18),y+rise/2+.19,p.z-Math.sin(p.yaw)*side*(width/2-.18));stripe.rotation.copy(mesh.rotation);root.add(stripe);
 }
}

// A bridge is considered only if the straight span ACTUALLY crosses an open
// interval outside the roof polygon and both ends meet safe, aligned deck.
export function findGapBridges(poly,layout,limit=2){
 const n=Math.min(160,Math.max(96,Math.round(layout.total/3))),points=Array.from({length:n},(_,i)=>onTrack(layout,i/n)),candidates=[];
 for(let i=0;i<n;i+=2)for(let j=0;j<n;j+=2){
  if(i===j)continue;
  const a=points[i],b=points[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
  const separation=Math.min(Math.abs(i-j),n-Math.abs(i-j))*layout.total/n;
  if(d<8||d>32||separation<27||!roofClear(poly,a.x,a.z,3.6)||!roofClear(poly,b.x,b.z,3.6))continue;
  const ux=dx/d,uz=dz/d,approach=ux*Math.sin(a.yaw)+uz*Math.cos(a.yaw),departure=ux*Math.sin(b.yaw)+uz*Math.cos(b.yaw);
  if(approach<.60||departure<.60)continue;
  let outside=0,longest=0,current=0,clear=true;
  for(let k=0;k<=30;k++){
   const t=k/30,x=a.x+dx*t,z=a.z+dz*t;
   if(!farFromHelipad(layout,x,z,17)){clear=false;break;}
   if(k>0&&k<30&&!pointInside(x,z,poly)){outside++;longest=Math.max(longest,++current);}else current=0;
  }
  if(!clear||outside<4||longest<4)continue;
  candidates.push({a,b,x:(a.x+b.x)/2,z:(a.z+b.z)/2,yaw:Math.atan2(dx,dz),length:d+1.8,width:3.6,openSamples:outside,score:outside*2+separation*.07-d*.2+approach*5+departure*5});
 }
 candidates.sort((a,b)=>b.score-a.score);
 const chosen=[];
 for(const c of candidates){if(chosen.some(o=>[c.a,c.b].some(p=>[o.a,o.b].some(q=>Math.hypot(p.x-q.x,p.z-q.z)<19))))continue;chosen.push(c);if(chosen.length>=limit)break;}
 return chosen;
}
function addRail(game,root,y,p,side){
 const x=p.x+Math.cos(p.yaw)*side*(p.width/2+.1),z=p.z-Math.sin(p.yaw)*side*(p.width/2+.1),len=p.length-1;
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(.13,.82,len),new THREE.MeshStandardMaterial({color:'#7d7162'}));
 mesh.position.set(x,y+.63,z);mesh.rotation.y=p.yaw;root.add(mesh);
 const footprint=vehicleFootprint(x,z,p.yaw,.13,len),xs=footprint.map(q=>q[0]),zs=footprint.map(q=>q[1]);
 game.collision.add({p:footprint,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:y+.22,h:.82,hospitalRoofBridgeRail:true},Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs));
 for(const end of [-1,1]){
  const distance=end*(len/2-.4),post=new THREE.Mesh(new THREE.BoxGeometry(.17,2.1,.17),new THREE.MeshStandardMaterial({color:'#746657'}));
  post.position.set(x+Math.sin(p.yaw)*distance,y+1.25,z+Math.cos(p.yaw)*distance);root.add(post);
 }
 const cable=[];for(let k=0;k<=16;k++){
  const t=k/16-.5,dist=t*len;
  cable.push(new THREE.Vector3(x+Math.sin(p.yaw)*dist,y+2.25-.70*(1-4*t*t),z+Math.cos(p.yaw)*dist));
 }
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(cable),new THREE.LineBasicMaterial({color:'#dbc49c'}));root.add(line);
}
function bridge(game,root,y,p){
 const deck=y+.19;
 // Ground-contact physics reads arcadeRamps even over empty courtyard space.
 game.terrain.arcadeRamps.push({kind:'hospital-roof-gap-bridge',hospitalRoof:true,realGapBridge:true,x:p.x,z:p.z,yaw:p.yaw,width:p.width,length:p.length,rise:.19,baseY:y,topY:[deck,deck,deck,deck]});
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(p.width,.16,p.length),new THREE.MeshStandardMaterial({color:'#997554',roughness:.9}));
 mesh.position.set(p.x,deck-.08,p.z);mesh.rotation.y=p.yaw;mesh.receiveShadow=true;root.add(mesh);
 for(let d=-p.length/2+.6;d<p.length/2-.4;d+=.85){
  const plank=new THREE.Mesh(new THREE.BoxGeometry(p.width-.16,.036,.67),new THREE.MeshStandardMaterial({color:'#bd986c'}));
  plank.position.set(p.x+Math.sin(p.yaw)*d,deck+.024,p.z+Math.cos(p.yaw)*d);plank.rotation.y=p.yaw;root.add(plank);
 }
 addRail(game,root,y,p,-1);addRail(game,root,y,p,1);
}
function clearTrackCollisions(game,site,layout){
 // Keep rooftop obstacles outside the marked lane, but do not allow a hidden
 // subsidiary building to block the bike above the main flat roof.
 const {polygon,y}=site;
 const track=Array.from({length:240},(_,i)=>onTrack(layout,i/240));
 const x=(site.building.minX+site.building.maxX)/2,z=(site.building.minZ+site.building.maxZ)/2;
 const radius=Math.max(site.building.maxX-site.building.minX,site.building.maxZ-site.building.minZ);
 for(const b of game.collision.near(x,z,radius)){
  if(b===site.building||!b.p?.length||b.hospitalRoofParapet||b.hospitalRoofObstacle||b.hospitalRoofBridgeRail||b.driveTopMin!==undefined)continue;
  if((b.minY||0)>y+.3||(b.minY||0)+b.h<y-.5)continue;
  if(!pointInside((b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2,polygon))continue;
  if(track.some(p=>pointInside(p.x,p.z,b.p)))b.driveTopMin=y;
 }
}
function install(game){
 if(polished.has(game))return;
 const site=resolveHospital(game);if(!site)return;
 const root=game.scene.children.find(o=>o.name==='ospedale-monoblocco-entire-roof-trial');if(!root)return;
 const layout=findLayout(site.polygon,site.building);if(!layout)return;
 polished.add(game);
 // Catch any chunks created before this module installed its streaming hook.
 cleanGroup(game.scene,{polygon:site.polygon,y:site.roofY,minX:site.building.minX,maxX:site.building.maxX,minZ:site.building.minZ,maxZ:site.building.maxZ},null);
 clearTrackCollisions(game,{...site,y:site.roofY},layout);
 const existing=(game.terrain.arcadeRamps||[]).filter(r=>r.hospitalRoof);
 const extra=chooseExtraRamps(site.polygon,layout,existing);
 extra.forEach((p,i)=>ramp(game,root,site.roofY,p,i));
 const links=findGapBridges(site.polygon,layout).filter(p=>{
  for(let t=0;t<=p.length;t+=1.5){const x=p.x+Math.sin(p.yaw)*(t-p.length/2),z=p.z+Math.cos(p.yaw)*(t-p.length/2);
   if(vehicleBlocked(x,z,p.yaw,game.collision,{width:1,length:1.95,height:1.3},site.roofY+.19))return false;
  }
  return true;
 });
 links.forEach(p=>bridge(game,root,site.roofY,p));
 root.userData.coursePolish={extraRamps:extra.length,realGapBridges:links.length,rooftopSpikesCleaned:true};
}
const populate=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__monobloccoCoursePolish){
 ModernGameplay.prototype.__monobloccoCoursePolish=true;
 ModernGameplay.prototype.populate=function(...args){const result=populate.apply(this,args);install(this);return result;};
}
