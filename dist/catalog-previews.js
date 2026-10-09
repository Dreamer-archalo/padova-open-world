import * as THREE from './vendor/three.module.js';
import {VEHICLES} from './vehicles.js';
import {hangarPreviewModel} from './villa-mandria-catalog-ui.js';
const cache=new Map();let active=null;
export function disposeCatalogPreviews(){active?.();active=null;}
// A single GPU context renders only visible cards, including keyboard focus.
export function mountCatalogPreviews(root,getBuild=()=>null){
 disposeCatalogPreviews();let renderer=null,observer=null,frame=0,disposed=false;const queue=[];
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,280/170,.02,2000);
 scene.add(new THREE.HemisphereLight('#ffffff','#566f83',2.1));const sun=new THREE.DirectionalLight('#fff1d9',2.5);sun.position.set(5,9,7);scene.add(sun);
 const picture=(img,id)=>{const build=getBuild(id),key=id+'/'+JSON.stringify(build||{});if(cache.has(key)){img.src=cache.get(key);img.dataset.previewReady=id;return;}
  if(!renderer){renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(1);renderer.setSize(280,170);}
  const game={vehicleGarage:{list:()=>build?[{style:id,build}]:[]}},model=hangarPreviewModel(id,build?.color||VEHICLES[id]?.color||'#527b89',game);if(!model)return;
  model.rotation.y=.65;model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),centre=bounds.getCenter(new THREE.Vector3()),direction=new THREE.Vector3(0,.32,1).normalize(),right=new THREE.Vector3(1,0,0),up=new THREE.Vector3().crossVectors(direction,right),tan=Math.tan(camera.fov*Math.PI/360);let distance=1;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).sub(centre);distance=Math.max(distance,p.dot(direction)+Math.max(Math.abs(p.dot(right))/(tan*camera.aspect*.88),Math.abs(p.dot(up))/(tan*.88)));}
  camera.position.copy(centre).addScaledVector(direction,distance);camera.lookAt(centre);camera.far=distance*5;camera.updateProjectionMatrix();scene.add(model);renderer.render(scene,camera);const url=renderer.domElement.toDataURL('image/webp',.85);scene.remove(model);
  if(cache.size>=80)cache.delete(cache.keys().next().value);cache.set(key,url);img.src=url;img.dataset.previewReady=id;
 };
 const drain=()=>{frame=0;for(let n=0;n<2&&queue.length;n++){const img=queue.shift();if(disposed||!img.isConnected)continue;try{picture(img,img.dataset.catalogPreview);}catch{img.alt='Anteprima non disponibile · '+(VEHICLES[img.dataset.catalogPreview]?.name||'mezzo');img.dataset.previewReady='unavailable';}}
  if(queue.length&&!disposed)frame=requestAnimationFrame(drain);
 };
 const enqueue=img=>{if(!img||img.dataset.previewQueued)return;img.dataset.previewQueued='true';queue.push(img);if(!frame)frame=requestAnimationFrame(drain);};
 if(globalThis.IntersectionObserver){observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);enqueue(e.target);}},{root:root.closest('dialog'),rootMargin:'120px'});}
 for(const img of root.querySelectorAll('[data-catalog-preview]')){if(observer)observer.observe(img);else enqueue(img);img.closest('button')?.addEventListener('focus',()=>enqueue(img));}
 active=()=>{disposed=true;observer?.disconnect();cancelAnimationFrame(frame);queue.length=0;renderer?.dispose();renderer?.forceContextLoss();};
}
