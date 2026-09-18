import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {resolveHospital} from './hospital-rooftop-easter-egg.js';
import {findLayout} from './monoblocco-track.js';
import {planRoofNetwork} from './monoblocco-roof-network-plan.js';

const installed=new WeakSet();
const laneMat=new THREE.MeshBasicMaterial({color:'#576970',side:THREE.DoubleSide,depthWrite:true}),lineMat=new THREE.MeshBasicMaterial({color:'#ffdc65',side:THREE.DoubleSide,depthWrite:true});
function ribbon(root,paths,y,width,offset,material,name){
 const coords=[];
 for(const path of paths)for(let i=0;i<path.points.length-1;i++){
  const a=path.points[i],b=path.points[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.05)continue;
  const nx=dz/len,nz=-dx/len,l=offset-width/2,r=offset+width/2;
  const p=[a.x+nx*l,y,a.z+nz*l],q=[a.x+nx*r,y,a.z+nz*r],s=[b.x+nx*l,y,b.z+nz*l],t=[b.x+nx*r,y,b.z+nz*r];coords.push(...p,...q,...s,...q,...t,...s);
 }
 if(!coords.length)return null;
 const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));geom.computeVertexNormals();geom.computeBoundingSphere();
 const mesh=new THREE.Mesh(geom,material);mesh.name=name;mesh.receiveShadow=true;mesh.renderOrder=8;root.add(mesh);return mesh;
}
function install(game){
 if(installed.has(game))return;const site=resolveHospital(game);if(!site)return;
 const root=game.scene.children.find(o=>o.name==='ospedale-monoblocco-entire-roof-trial');if(!root)return;
 const layout=findLayout(site.polygon,site.building);if(!layout)return;installed.add(game);
 const network=planRoofNetwork(site.polygon,site.building,layout);
 // These are genuinely supported secondary riding lanes, not suspended slabs.
 // They branch toward roof extremities; the automatic riders continue on the
 // original continuous loop, and the free-riding player may explore each spur.
 if(network.branches.length){
  ribbon(root,network.branches,site.roofY+.082,2.5,0,laneMat,'monoblocco-whole-roof-exploration-lanes');
  ribbon(root,network.branches,site.roofY+.094,.09,-1.18,lineMat,'monoblocco-exploration-left-edge');
  ribbon(root,network.branches,site.roofY+.094,.09,1.18,lineMat,'monoblocco-exploration-right-edge');
 }
 root.userData.roofNetwork={mainMetres:layout.total,branchMetres:network.metres,allMarkedMetres:layout.total+network.metres,branches:network.branches.length,coverage:network.coverage,reachableCoverage:network.reachableCoverage,fullyConnected:false,regionsNeedBridges:true};
}
const previous=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__monobloccoRoofExploration){ModernGameplay.prototype.__monobloccoRoofExploration=true;ModernGameplay.prototype.populate=function(...args){const result=previous.apply(this,args);install(this);return result;};}
