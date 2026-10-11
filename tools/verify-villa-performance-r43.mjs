import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {RoofSurfaces,flatRoofTriangles,prepareCityRoof} from '../dist/roof-surfaces.js';
import {batchVillaStatics} from '../dist/villa-performance.js';
import {markMandriaPrivateRoads} from '../dist/villa-mandria-v4-grounds.js';

let roadReads=0;const access={n:'Accesso Villa della Mandria'},segments=Array.from({length:5000},()=>({get road(){roadReads++;return {n:'Public street'};}}));segments.push({road:access},{road:access});const g={graph:{segments}};
assert.equal(markMandriaPrivateRoads(g),1);const initialReads=roadReads;
for(let i=0;i<120;i++)markMandriaPrivateRoads(g);assert.equal(roadReads,initialReads,'estate ticks must not scan the whole road graph');
access.access='public';assert.equal(markMandriaPrivateRoads(g),1,'cached access roads must still enforce privacy');g.graph.segments=[{road:{n:'Viale Villa della Mandria'}}];assert.equal(markMandriaPrivateRoads(g),1,'a replaced graph gets a fresh cache');

const b={p:[[0,0],[10,0],[10,10],[0,10]],minX:0,minZ:0,maxX:10,maxZ:10,cx:5,cz:5,minY:0,h:8,t:'warehouse'};
const roofs=new RoofSurfaces();let builds=0;roofs.add(b,()=>{builds++;return flatRoofTriangles(b);});
assert.equal(builds,0,'registration must not triangulate distant buildings');
structuredClone(b);assert.equal(builds,0,'worker cloning must not evaluate roof getters');
assert.equal(roofs.at(5,5,9).y,8.04);assert.equal(builds,1);
roofs.at(5,5,9);assert.equal(builds,1,'first use must cache the exact physical triangles');
assert.equal(roofs.at(5,5,0),null,'street cars remain below roofs');
const city={...b,p:b.p.map(p=>[...p]),t:'house'};delete city.roofTriangles;delete city.roofAt;
roofs.add(city,prepareCityRoof(city,{quality:'low',profile:{simple:false},terrain:{districts:{at:()=> 'historic'}}}));
assert.equal(typeof Object.getOwnPropertyDescriptor(city,'roofTriangles').get,'function');
const rendered=city.roofUpgrade;assert(rendered.length>0);
assert(city.roofTriangles.some(t=>rendered.includes(t)),'render and support share the same lazy roof upgrade');

const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);root.position.set(100,7,200);root.rotation.y=.4;
const geo=new THREE.BoxGeometry(2,2,2),mat=new THREE.MeshStandardMaterial({color:0xaa5533,roughness:.9});
const originals=[];for(let i=0;i<8;i++){const group=new THREE.Group(),mesh=new THREE.Mesh(geo,mat);group.position.set(i*3,0,0);group.rotation.y=i*.2;mesh.position.y=1;group.add(mesh);root.add(group);originals.push(mesh);}
const actor=new THREE.Group(),arm=new THREE.Mesh(geo,mat);actor.add(arm);actor.position.z=5;root.add(actor);
const independent=new THREE.Group();independent.position.z=12;root.add(independent);for(let i=0;i<3;i++){const m=new THREE.Mesh(geo,mat);m.position.x=i*3;independent.add(m);}
scene.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(100,20,200),new THREE.Vector3(0,-1,0)),before=ray.intersectObject(root,true)[0].point.y;
const result=batchVillaStatics(root,new Set([actor]),new Set([independent]));assert(result.savedCalls>=8);assert(arm.visible&&actor.visible,'animated body parts stay visible and untouched');assert(originals.every(o=>!o.visible),'only fixed meshes are hidden');
scene.updateMatrixWorld(true);const after=ray.intersectObjects(result.batches,true)[0].point.y;assert(Math.abs(after-before)<1e-5,'transformed geometry keeps the same roof height');
assert(result.batches.some(o=>o.parent===independent),'separate visibility layers retain their own batches');independent.visible=false;assert(!ray.intersectObjects(result.batches.filter(o=>o.parent===root),true).some(h=>h.object.parent===independent));
arm.rotation.x=.7;assert.equal(arm.rotation.x,.7);assert(result.batches.every(o=>o.material===mat),'keep materials and lighting unchanged');
result.restore();assert(originals.every(o=>o.visible&&o.matrixAutoUpdate));assert(result.batches.every(o=>!o.parent));assert.equal(geo.attributes.position.count,24,'shared source geometry must never be disposed or rewritten');
console.log('PASS R43: lazy cached roofs, clone safety, physical/rendered support, static batches, transformed geometry, moving actors, independent visibility and cleanup.');
