import {VEHICLES,createVehicle} from './vehicles.js';
import {SPECIAL_VEHICLES,createSpecialVehicle} from './special-vehicles.js';
import {applyDealerUpgrades} from './dealer-customization.js';
import * as THREE from './vendor/three.module.js';
import {DEALER_CATALOG,createDealerVehicle} from './dealerships.js';

let active=null;
export function disposeDealerPreview(){if(active){active.dispose();active=null;}}
export function mountDealerPreview(container,id){
 disposeDealerPreview();let renderer=null,root=null,drag=null,yaw=.65,disposed=false,observer=null,frame=0;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,2,.03,200);
 scene.add(new THREE.HemisphereLight('#ffffff','#566f83',2.1));const sun=new THREE.DirectionalLight('#fff1d9',2.5);sun.position.set(5,9,7);scene.add(sun);
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(1.5,globalThis.devicePixelRatio||1));renderer.setSize(container.clientWidth||500,container.clientHeight||260);renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';renderer.domElement.style.touchAction='none';container.appendChild(renderer.domElement);}catch{container.textContent='Anteprima 3D non disponibile su questo dispositivo.';}
 const draw=()=>{if(disposed||!renderer||!root)return;root.rotation.y=yaw;root.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(root),c=b.getCenter(new THREE.Vector3()),d=b.getSize(new THREE.Vector3()),aspect=renderer.domElement.width/renderer.domElement.height;camera.aspect=aspect;camera.position.set(c.x,c.y+Math.max(.6,d.y*.5),c.z+Math.max(d.x/aspect,d.y,d.z*.5)*2.85);camera.lookAt(c);camera.updateProjectionMatrix();renderer.render(scene,camera);};
 const removeRoot=()=>{if(root){scene.remove(root);root.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(o.material.userData.privateFinish)o.material.dispose();}});root=null;}};
 const update=build=>{if(disposed||!renderer)return;removeRoot();root=DEALER_CATALOG[id]?createDealerVehicle(id,build.color,build.wheels,build):applyDealerUpgrades(SPECIAL_VEHICLES[id]?createSpecialVehicle(id):createVehicle(id,build.color),VEHICLES[id],build);root.userData.configurator=true;scene.add(root);draw();container.dataset.model=id;container.dataset.finish=[build.wheels,build.livery,build.bodykit,build.exhaust].join('/');};
 if(renderer){const canvas=renderer.domElement;canvas.onpointerdown=e=>{drag={x:e.clientX,yaw};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(drag){yaw=drag.yaw+(e.clientX-drag.x)*.012;draw();}};canvas.onpointerup=canvas.onpointercancel=()=>drag=null;}
 const resize=()=>{if(!renderer||disposed)return;renderer.setSize(container.clientWidth||500,container.clientHeight||260);draw();};if(renderer&&globalThis.ResizeObserver){observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(resize);});observer.observe(container);}
 const dispose=()=>{disposed=true;observer?.disconnect();cancelAnimationFrame(frame);removeRoot();renderer?.dispose();renderer?.forceContextLoss();};active={update,dispose};return active;
}
