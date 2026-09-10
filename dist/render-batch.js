import * as THREE from './vendor/three.module.js';
const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82});
// Static authored monuments share one draw per root; transparent water stays separate.
export function batchStatic(root){
 if(root.isMesh)return root;
 const positions=[],normals=[],colours=[],remove=[],v=new THREE.Vector3(),n=new THREE.Vector3();
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert();
 root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||o.material.transparent||o.material.map)return;
  const g=o.geometry,p=g.attributes.position,no=g.attributes.normal,c=g.attributes.color,m=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld),nm=new THREE.Matrix3().getNormalMatrix(m),base=o.material.color;
  for(let j=0;j<(g.index?.count||p.count);j++){const i=g.index?g.index.getX(j):j;v.fromBufferAttribute(p,i).applyMatrix4(m);n.set(0,1,0);if(no)n.fromBufferAttribute(no,i).applyMatrix3(nm).normalize();positions.push(v.x,v.y,v.z);normals.push(n.x,n.y,n.z);colours.push(base.r*(c&&o.material.vertexColors?c.getX(i):1),base.g*(c&&o.material.vertexColors?c.getY(i):1),base.b*(c&&o.material.vertexColors?c.getZ(i):1));}
  remove.push(o);
 });
 if(!positions.length)return root;
 for(const o of remove)o.parent.remove(o);
 const prune=g=>{for(const c of [...g.children]){prune(c);if(c.isGroup&&!c.children.length)g.remove(c);}};prune(root);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;mesh.castShadow=true;root.add(mesh);return root;
}
