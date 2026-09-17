import * as THREE from './vendor/three.module.js';
import {CityWorld,CHUNK} from './world.js';
import {ModernGameplay} from './modern-gameplay.js';
import {pointInside} from './core.js';
import {resolveHospital} from './hospital-rooftop-easter-egg.js';
import {findLayout,onTrack,roofClear} from './monoblocco-track.js';

// Do not change roof architecture elsewhere in Padova: trim only protruding
// city-roof triangles whose centres fall inside this exact Monoblocco polygon.
const NAME='Ospedale Civile - Monoblocco - Casse - Prenotazioni';
const sites=new WeakMap(),installed=new WeakSet();
function siteFor(world){
 if(sites.has(world))return sites.get(world);
 const b=world.data?.buildings?.find(v=>v.n===NAME&&v.p?.length>=15);
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
 const original=mesh.geometry,pos=original.getAttribute('position');
 if(original.index||!pos||pos.count%3)return 0;
 const keep=[];let removed=0;
 for(let i=0;i<pos.count;i+=3){
  const x=(pos.getX(i)+pos.getX(i+1)+pos.getX(i+2))/3,z=(pos.getZ(i)+pos.getZ(i+1)+pos.getZ(i+2))/3;
  const high=Math.max(pos.getY(i),pos.getY(i+1),pos.getY(i+2)),low=Math.min(pos.getY(i),pos.getY(i+1),pos.getY(i+2));
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
 cleaned.computeVertexNormals();cleaned.computeBoundingSphere();mesh.geometry=cleaned;original.dispose();return removed;
}
function cleanGroup(group,site,mat){if(site)group.traverse(mesh=>{if(roofMesh(mesh,mat))removeProtrusions(mesh,site);});}
const oldInstallStage=CityWorld.prototype.installStage;
if(!CityWorld.prototype.__monobloccoRoofTriangleCleanup){
 CityWorld.prototype.__monobloccoRoofTriangleCleanup=true;
 CityWorld.prototype.installStage=function(key,g,stage){
  const result=oldInstallStage.call(this,key,g,stage),site=siteFor(this);
  if(site){const [i,j]=key.split(',').map(Number);if((i+1)*CHUNK>=site.minX&&i*CHUNK<=site.maxX&&(j+1)*CHUNK>=site.minZ&&j*CHUNK<=site.maxZ)cleanGroup(g,site,this.roofMat);}
  return result;
 };
}
function farFromPad(layout,x,z,r=19){return Math.hypot(x-layout.helipad.x,z-layout.helipad.z)>=r;}
function safeRamp(poly,layout,p,others){
 if(!p||!farFromPad(layout,p.x,p.z)||others.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<17))return false;
 const s=Math.sin(p.yaw),c=Math.cos(p.yaw),width=2.9;
 for(let d=-4;d<=19;d+=1.5)for(const side of [-1,0,1]){
  const x=p.x+s*d+c*side*width/2,z=p.z+c*d-s*side*width/2;
  if(!roofClear(poly,x,z,1.8)||!farFromPad(layout,x,z,15.5))return false;
 }
 return true;
}
export function chooseExtraRamps(poly,layout,oldRamps=[],limit=5,reserved=[]){
 const chosen=[],taken=[...oldRamps,...reserved];
 for(let k=0;k<180&&chosen.length<limit;k++){
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

// Detect REAL empty space between the two supported rooftop endpoints; never
// count decorative planks resting on a roof as roof-to-roof bridges.
// Exclusion points protect the original ramps from crossing access geometry.
export function findGapBridges(poly,layout,limit=2,excluded=[]){
 const n=Math.min(160,Math.max(96,Math.round(layout.total/3))),points=Array.from({length:n},(_,i)=>onTrack(layout,i/n)),candidates=[];
 for(let i=0;i<n;i+=2)for(let j=0;j<n;j+=2){
  if(i===j)continue;
  const a=points[i],b=points[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),arc=Math.min(Math.abs(i-j),n-Math.abs(i-j))*layout.total/n;
  if(d<8||d>32||arc<27||!roofClear(poly,a.x,a.z,3.6)||!roofClear(poly,b.x,b.z,3.6))continue;
  if(excluded.some(r=>[a,b].some(p=>Math.hypot(r.x-p.x,r.z-p.z)<7.5)))continue;
  const ux=dx/d,uz=dz/d,approach=ux*Math.sin(a.yaw)+uz*Math.cos(a.yaw),departure=ux*Math.sin(b.yaw)+uz*Math.cos(b.yaw);
  if(approach<.60||departure<.60)continue;
  let outside=0,longest=0,streak=0,clear=true;
  for(let k=0;k<=30;k++){
   const t=k/30,x=a.x+dx*t,z=a.z+dz*t;
   if(!farFromPad(layout,x,z,17)){clear=false;break;}
   if(k>0&&k<30&&!pointInside(x,z,poly)){outside++;longest=Math.max(longest,++streak);}else streak=0;
  }
  if(!clear||outside<4||longest<4)continue;
  candidates.push({a,b,x:(a.x+b.x)/2,z:(a.z+b.z)/2,yaw:Math.atan2(dx,dz),length:d+1.8,width:3.6,openSamples:outside,score:outside*2+arc*.07-d*.2+approach*5+departure*5});
 }
 candidates.sort((a,b)=>b.score-a.score);
 const chosen=[];
 for(const c of candidates){if(chosen.some(o=>[c.a,c.b].some(p=>[o.a,o.b].some(q=>Math.hypot(p.x-q.x,p.z-q.z)<19))))continue;chosen.push(c);if(chosen.length>=limit)break;}
 return chosen;
}
function clearTrackCollisions(game,site,layout){
 const {polygon,y}=site,track=Array.from({length:360},(_,i)=>onTrack(layout,i/360));
 const x=(site.building.minX+site.building.maxX)/2,z=(site.building.minZ+site.building.maxZ)/2;
 const radius=Math.max(site.building.maxX-site.building.minX,site.building.maxZ-site.building.minZ);
 for(const b of game.collision.near(x,z,radius)){
  if(b===site.building||!b.p?.length||b.hospitalRoofParapet||b.hospitalRoofObstacle||b.driveTopMin!==undefined)continue;
  if((b.minY||0)>y+.3||(b.minY||0)+b.h<y-.5)continue;
  if(!pointInside((b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2,polygon))continue;
  if(track.some(p=>pointInside(p.x,p.z,b.p)))b.driveTopMin=y;
 }
}
function install(game){
 if(installed.has(game))return;
 const site=resolveHospital(game);if(!site)return;
 const root=game.scene.children.find(o=>o.name==='ospedale-monoblocco-entire-roof-trial');if(!root)return;
 const layout=findLayout(site.polygon,site.building);if(!layout)return;installed.add(game);
 cleanGroup(game.scene,{polygon:site.polygon,y:site.roofY,minX:site.building.minX,maxX:site.building.maxX,minZ:site.building.minZ,maxZ:site.building.maxZ},null);
 clearTrackCollisions(game,{...site,y:site.roofY},layout);
 const existing=(game.terrain.arcadeRamps||[]).filter(r=>r.hospitalRoof),originalJumps=existing.filter(r=>r.kind==='hospital-rooftop-ramp');
 // Reserve bridge ends FIRST. In earlier builds five randomly scattered new
 // ramps occupied both crossings, so zero bridges could ever be instantiated.
 const bridgeReservations=findGapBridges(site.polygon,layout,2,originalJumps);
 const avoid=bridgeReservations.flatMap(p=>[p.a,p.b]);
 const extra=chooseExtraRamps(site.polygon,layout,existing,5,avoid);
 extra.forEach((p,i)=>ramp(game,root,site.roofY,p,i));
 root.userData.bridgeReservations=bridgeReservations;
 root.userData.coursePolish={extraRamps:extra.length,bridgeCandidates:bridgeReservations.length,realGapBridges:0,rooftopSpikesCleaned:true};
}
const populate=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__monobloccoCoursePolish){
 ModernGameplay.prototype.__monobloccoCoursePolish=true;
 ModernGameplay.prototype.populate=function(...args){const result=populate.apply(this,args);install(this);return result;};
}
