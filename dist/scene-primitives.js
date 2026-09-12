import * as THREE from './vendor/three.module.js';
import {batchStatic} from './render-batch.js';
const geos={box:new THREE.BoxGeometry(),sphere:new THREE.SphereGeometry(1,10,7),cylinder:new THREE.CylinderGeometry(1,1,1,10),cone:new THREE.ConeGeometry(1,1,10)};
const mats=new Map();
export function material(color,basic=false){const key=color+basic;if(!mats.has(key))mats.set(key,new (basic?THREE.MeshBasicMaterial:THREE.MeshStandardMaterial)({color,roughness:.85}));return mats.get(key);}
export function shape(g,kind,color,x,y,z,w,h,d){const o=new THREE.Mesh(geos[kind],material(color));o.position.set(x,y,z);o.scale.set(w,h,d);g.add(o);return o;}
export const box=(g,c,x,y,z,w,h,d)=>shape(g,'box',c,x,y,z,w,h,d);
export function label(text,color='#f5edcc',background='#233844',w=4,h=1){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,512,128);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 48px sans-serif';ctx.fillText(text,256,64,490);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));m.userData.label=text;return m;}
export function freeze(g){batchStatic(g);g.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});return g;}
export function scenery(scene,g,x,y,z){g.position.set(x,y,z);scene.add(g);return g;}
