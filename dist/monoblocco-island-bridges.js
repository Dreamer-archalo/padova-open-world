import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {resolveHospital} from './hospital-rooftop-easter-egg.js';
import {findLayout} from './monoblocco-track.js';
import {planRoofNetwork} from './monoblocco-roof-network-plan.js';
import {planIslandSpans,safeSegment} from './monoblocco-island-bridge-plan.js';
import {candidateSafe,raisedBridge} from './monoblocco-raised-bridges.js';

const installed=new WeakSet(),lanes=new THREE.MeshBasicMaterial({color:'#586970',side:THREE.DoubleSide}),edges=new THREE.MeshBasicMaterial({color:'#ffd36e',side:THREE.DoubleSide});
function ribbon(root,paths,y,width,offset,mat,name){const coords=[];for(const path of paths)for(let i=0;i<path.length-1;i++){
 const a=path[i],b=path[i+1],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<.04)continue;const nx=dz/length,nz=-dx/length,l=offset-width/2,r=offset+width/2;
 const p=[a.x+nx*l,y,a.z+nz*l],q=[a.x+nx*r,y,a.z+nz*r],s=[b.x+nx*l,y,b.z+nz*l],t=[b.x+nx*r,y,b.z+nz*r];coords.push(...p,...q,...s,...q,...t,...s);
 }if(!coords.length)return;const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));geom.computeVertexNormals();geom.computeBoundingSphere();const mesh=new THREE.Mesh(geom,mat);mesh.renderOrder=9;mesh.name=name;root.add(mesh);}
function exitExtension(poly,wing,p){const destinations=[...wing.points].sort((a,b)=>Math.hypot(b.x-p.x,b.z-p.z)-Math.hypot(a.x-p.x,a.z-p.z));
 for(const target of destinations)if(Math.hypot(p.x-target.x,p.z-target.z)>5&&safeSegment(poly,p,target,2.3))return [p,target];
 return [p];
}
function install(game){if(installed.has(game))return;const site=resolveHospital(game);if(!site)return;const root=game.scene.children.find(o=>o.name==='ospedale-monoblocco-entire-roof-trial');if(!root)return;const layout=findLayout(site.polygon,site.building);if(!layout)return;installed.add(game);
 const network=planRoofNetwork(site.polygon,site.building,layout),plan=planIslandSpans(site.polygon,site.building,layout,network),bridges=[],audit=[],paths=[];
 for(const island of plan.islands){let chosen=null;const rejected={};for(const p of island.candidates){
  if(bridges.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<18)){rejected.proximity=(rejected.proximity||0)+1;continue;}
  const reason=candidateSafe(game,site,layout,p,site.roofY+1.43);
  if(reason){rejected[reason]=(rejected[reason]||0)+1;continue;}
  chosen=p;break;
 }
 if(chosen){
  raisedBridge(game,root,site,chosen,root.userData.raisedBridgeCount+bridges.length);
  bridges.push(chosen);
  const entry=[chosen.networkAnchor,chosen.entry],exit=exitExtension(site.polygon,island,chosen.exit);
  if(safeSegment(site.polygon,entry[0],entry[1],2.3))paths.push(entry);
  if(exit.length>1)paths.push(exit);
 }
 audit.push({wing:island.wing,gridCells:island.cells,candidates:island.totalCandidates,tested:Math.min(35,island.candidates.length),constructed:!!chosen,span:chosen?.length||null,void:chosen?.void||null,entry:chosen?.a||null,exit:chosen?.b||null,rejected});
 }
 ribbon(root,paths,site.roofY+.084,2.25,0,lanes,'monoblocco-island-bridge-access-lanes');ribbon(root,paths,site.roofY+.096,.08,-1.06,edges,'monoblocco-island-access-left');ribbon(root,paths,site.roofY+.096,.08,1.06,edges,'monoblocco-island-access-right');
 root.userData.islandBridgeAudit=audit;
 root.userData.islandBridges={count:bridges.length,regionsConnected:bridges.map(b=>b.wing),routeMetres:paths.reduce((sum,path)=>sum+path.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x-path[i].x,p.z-path[i].z),0),0),fullRoofAccessVerified:false};
 root.userData.raisedBridgeCount+=bridges.length;
 if(root.userData.coursePolish)root.userData.coursePolish.realGapBridges=root.userData.raisedBridgeCount;
}
const previous=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__monobloccoIslandBridges){ModernGameplay.prototype.__monobloccoIslandBridges=true;ModernGameplay.prototype.populate=function(...args){const out=previous.apply(this,args);install(this);return out;};}
