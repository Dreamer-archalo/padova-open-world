import {upgradedRoofTriangles} from './roof-surfaces.js';
import * as THREE from './vendor/three.module.js';
import {CityWorld} from './world.js?v=roof-driving-r42';

const palette=['#995f48','#b07553','#9c694d','#a58166','#8d5d49','#b17a58','#a2674d'].map(c=>new THREE.Color(c));
class RoofBatch{
 constructor(){this.p=[];this.c=[];}
 tri(a,b,c,color){for(const v of [a,b,c]){this.p.push(v[0],v[1],v[2]);this.c.push(color.r,color.g,color.b);}}
 quad(a,b,c,d,color){this.tri(a,b,c,color);this.tri(a,c,d,color);}
 mesh(material){if(!this.p.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));g.computeVertexNormals();g.computeBoundingSphere();return new THREE.Mesh(g,material);}
}
// Gable and hipped support use the exact same triangles as this quality layer.
function addRoof(batch,b,world){const zone=world.terrain?.districts?.at(b.cx,b.cz),central=zone==='historic'||['church','chapel','basilica','historic','civic','museum','theatre'].includes(b.t),color=palette[Math.abs(b.c||0)%palette.length].clone();if(central)color.multiplyScalar(.93);for(const t of (b.roofUpgrade??upgradedRoofTriangles(b,world)))batch.tri(...t,color);}
const original=CityWorld.prototype.installStage;
if(!CityWorld.prototype.__phase3RoofUpgrade){
 CityWorld.prototype.__phase3RoofUpgrade=true;
 CityWorld.prototype.installStage=function(key,g,stage){
  if(stage==='core'||stage==='detail'){const chunk=this.chunks.get(key),batch=new RoofBatch();for(const b of chunk?.buildings||[])addRoof(batch,b,this);const mesh=batch.mesh(this.roofMat);if(mesh){mesh.name='phase3-pitched-roofs';mesh.userData.streamBuildings=true;mesh.userData.phase3RoofUpgrade=true;mesh.receiveShadow=true;g.add(mesh);}}
  return original.call(this,key,g,stage);
 };
}
