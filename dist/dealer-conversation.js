import * as THREE from './vendor/three.module.js';
let active=null;
export function disposeDealerConversation(){active?.();active=null;}
export function mountDealerConversation(container,person){
 disposeDealerConversation();if(!container||!person)return;
 let renderer,frame=0,observer,disposed=false;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(29,1,.05,30),root=person.clone(true),materials=new Set();
 const sprites=[];root.traverse(o=>{if(o.isSprite){sprites.push(o);return;}if(o.isMesh){o.material=o.material.clone();materials.add(o.material);}});
 sprites.forEach(s=>s.parent?.remove(s));root.position.set(0,0,0);root.rotation.set(0,-.16,0);root.visible=true;scene.add(root);
 scene.add(new THREE.HemisphereLight('#fff8ee','#526576',2.4));const light=new THREE.DirectionalLight('#ffe2b7',3);light.position.set(-3,5,4);scene.add(light);
 const box=new THREE.Box3().setFromObject(root),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),arms=root.getObjectByName('showroom-arms');
 const resize=()=>{if(disposed||!renderer)return;const w=container.clientWidth||400,h=container.clientHeight||520;renderer.setSize(w,h,false);camera.aspect=w/h;const frameHeight=h<260?size.y*.62:size.y,targetY=h<260?box.max.y-frameHeight/2:center.y;const distance=Math.max(frameHeight/(2*Math.tan(camera.fov*Math.PI/360)*.85),size.x/(2*Math.tan(camera.fov*Math.PI/360)*camera.aspect*.85));camera.position.set(0,targetY+.05,distance);camera.lookAt(0,targetY+.03,0);camera.updateProjectionMatrix();};
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(1.5,globalThis.devicePixelRatio||1));container.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Consulente del concessionario');resize();if(globalThis.ResizeObserver){observer=new ResizeObserver(resize);observer.observe(container);}const animate=time=>{if(disposed)return;root.rotation.y=-.16+Math.sin(time*.0006)*.035;if(arms)arms.children.forEach((arm,i)=>arm.rotation.x=i===0?-.16+Math.sin(time*.0014)*.04:.02);renderer.render(scene,camera);frame=requestAnimationFrame(animate);};frame=requestAnimationFrame(animate);}catch{container.innerHTML='<span class="advisor-fallback">Il tuo consulente</span>';}
 active=()=>{disposed=true;observer?.disconnect();cancelAnimationFrame(frame);materials.forEach(m=>m.dispose());renderer?.dispose();renderer?.forceContextLoss();};
}
