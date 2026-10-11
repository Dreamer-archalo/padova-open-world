// Batch fixed ornaments after layout/collision/roof setup. Moving actors,
// fountain water, markers and interactive models keep their original hierarchy.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';

export function batchVillaStatics(root,excluded=new Set(),boundaries=new Set()){
 const batches=[],sources=[],v=new THREE.Vector3(),n=new THREE.Vector3();let savedCalls=0;
 function visit(parent){
  if(excluded.has(parent)||!parent.visible)return;
  const groups=new Map(),inverse=parent.matrixWorld.clone().invert();
  function collect(node){for(const o of [...node.children]){
   if(excluded.has(o)||!o.visible)continue;
   if(o.isGroup){if(boundaries.has(o))visit(o);else collect(o);continue;}
   if(!o.isMesh||o.isInstancedMesh||o.children.length||Array.isArray(o.material)||o.material.transparent||o.material.map||o.material.normalMap||o.material.roughnessMap||o.material.vertexColors||o.geometry.morphAttributes.position?.length)continue;
   const p=o.geometry.attributes.position;if(!p||!o.geometry.attributes.normal||o.geometry.drawRange.start!==0||o.geometry.drawRange.count!==Infinity)continue;
   const matrix=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld);if(matrix.determinant()<=0)continue;
   // Small spatial batches retain useful frustum culling across the driveway.
   const cell=Math.floor(matrix.elements[12]/48)+','+Math.floor(matrix.elements[14]/48),key=o.material.uuid+','+o.castShadow+','+o.receiveShadow+','+cell;
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push({o,matrix});
  }}collect(parent);
  for(const list of groups.values()){
   if(list.length<3)continue;const positions=[],normals=[];
   for(const {o,matrix} of list){const g=o.geometry,p=g.attributes.position,no=g.attributes.normal,nm=new THREE.Matrix3().getNormalMatrix(matrix);
    for(let j=0;j<(g.index?.count??p.count);j++){const i=g.index?g.index.getX(j):j;v.fromBufferAttribute(p,i).applyMatrix4(matrix);n.fromBufferAttribute(no,i).applyMatrix3(nm).normalize();positions.push(v.x,v.y,v.z);normals.push(n.x,n.y,n.z);}
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.computeBoundingSphere();
   const mesh=new THREE.Mesh(geometry,list[0].o.material);mesh.name='Mandria · dettagli fissi raggruppati';mesh.castShadow=list[0].o.castShadow;mesh.receiveShadow=list[0].o.receiveShadow;mesh.matrixAutoUpdate=false;mesh.userData.villaStaticBatch=true;parent.add(mesh);batches.push(mesh);
   // Preserve source objects/names for layout inspection. Physics was registered
   // before batching; do not dispose geometries shared by other models.
   for(const {o} of list){sources.push({o,auto:o.matrixAutoUpdate});o.visible=false;o.matrixAutoUpdate=false;}
   savedCalls+=list.length-1;
  }
 }
 root.updateWorldMatrix(true,true);visit(root);
 return {batches,savedCalls,sourceMeshes:sources.length,restore(){for(const {o,auto} of sources){o.visible=true;o.matrixAutoUpdate=auto;}for(const b of batches){b.parent?.remove(b);b.geometry.dispose();}}};
}

function movingRoots(g){const roots=new Set();const add=o=>{if(o)roots.add(o);};
 add(g.villaEstate?.fountain);add(g.villaLife?.expansion?.escort?.car);
 for(const p of g.villaLife?.people||[])add(p.obj);
 for(const c of g.villaLife?.cars||[])add(c);
 for(const p of g.villaLife?.pastures||[])for(const a of p.animals||[])add(a.a);
 for(const p of g.villaV6?.rear.people||[])add(p.obj);
 for(const p of g.villaV6?.rear.trios||[])add(p.group);
 for(const a of g.villaV9?.actors||[])add(a.root);
 for(const h of g.villaV10?.roaming||[])add(h.model);
 for(const c of g.cars||[])add(c.mesh);
 for(const o of g.villaRange?.shooters||[])add(o);
 return roots;
}

export function optimizeVilla(g){
 if(!g.villaV11?.report||!g.villaV7Physics||!g.villaLife)return;
 if(g.villaPerformance?.life===g.villaLife)return;
 g.villaPerformance?.cleanup();const excluded=movingRoots(g),results=[];
 const boundaries=new Set([g.villaLife.expansion?.root,...['villaV3','villaV4','villaV5Estate','villaV6','villaV9','villaV10','villaV11'].map(k=>g[k]?.root)].filter(Boolean));
 for(const root of [g.villaLife.root,g.villaEstate?.root,g.villaRoof?.root,g.villaV6Stairs?.root,g.villaV7Stairs?.root])if(root)results.push(batchVillaStatics(root,excluded,boundaries));
 g.villaPerformance={life:g.villaLife,report:{sourceMeshes:results.reduce((s,r)=>s+r.sourceMeshes,0),batches:results.reduce((s,r)=>s+r.batches.length,0),savedCalls:results.reduce((s,r)=>s+r.savedCalls,0)},cleanup(){for(const r of results)r.restore();}};
}
const update=ModernGameplay.prototype.update,populate=ModernGameplay.prototype.populate;
ModernGameplay.prototype.update=function(dt){update.call(this,dt);optimizeVilla(this);};
ModernGameplay.prototype.populate=function(...args){this.villaPerformance?.cleanup();this.villaPerformance=null;return populate.apply(this,args);};
