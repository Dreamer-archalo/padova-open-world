import * as THREE from './vendor/three.module.js';

export const QUALITY={
 hyper:{label:'Iper Performance',radius:420,fog:600,pixelRatio:.65,floor:.45,traffic:8,people:12,peopleHz:10,trees:.15,simple:true,shadows:false,antialias:false},
 low:{label:'Performance',radius:680,fog:900,pixelRatio:1,floor:.65,traffic:16,people:32,peopleHz:15,trees:.55,simple:false,shadows:false,antialias:false},
 medium:{label:'Balanced',radius:1050,fog:1400,pixelRatio:1.25,floor:.75,traffic:30,people:72,peopleHz:20,trees:1,simple:false,shadows:true,antialias:true},
 high:{label:'Detailed',radius:1450,fog:1950,pixelRatio:1.7,floor:1,traffic:48,people:120,peopleHz:30,trees:1,simple:false,shadows:true,antialias:true}
};
export const qualityFor=id=>(Object.hasOwn(QUALITY,id)?QUALITY[id]:QUALITY.low);
export const qualityOptions=()=>Object.entries(QUALITY).map(([id,q])=>'<option value="'+id+'">'+q.label+'</option>').join('');
const cube=new THREE.BoxGeometry(),proxies=new WeakMap(),flatMaterials=new WeakMap();
const simpleBody=(()=>{const parts=[[0,1.13,0,.55,.62,.34],[0,1.65,0,.36,.42,.35],[-.16,.42,0,.22,.8,.25],[.16,.42,0,.22,.8,.25],[-.36,1.08,0,.16,.62,.2],[.36,1.08,0,.16,.62,.2]],positions=[],normal=[];for(const [x,y,z,w,h,d] of parts)for(const i of cube.index.array){positions.push(cube.attributes.position.getX(i)*w+x,cube.attributes.position.getY(i)*h+y,cube.attributes.position.getZ(i)*d+z);normal.push(cube.attributes.normal.getX(i),cube.attributes.normal.getY(i),cube.attributes.normal.getZ(i));}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));return g;})();
function flat(material){if(!flatMaterials.has(material))flatMaterials.set(material,new THREE.MeshBasicMaterial({color:material.color,vertexColors:material.vertexColors,side:material.side}));return flatMaterials.get(material);}

// Render-only proxies never replace actor coordinates, collision shapes or AI.
export function actorDetail(actor,simple,visible=true){
 const root=actor.mesh;let entry=proxies.get(root);
 if(!entry){entry={children:[...root.children],materials:[],mode:null};root.traverse(o=>{if(o.isMesh)entry.materials.push([o,o.material]);});proxies.set(root,entry);}
 const mode=visible?(simple?'simple':'detail'):'hidden';if(entry.mode===mode)return;entry.mode=mode;
 const proxyAllowed=!actor.spec?.aircraft&&!actor.spec?.tracked;
 if(simple&&proxyAllowed&&!entry.proxy){const color=actor.spec?'#879394':'#729181',m=new THREE.Mesh(simpleBody,new THREE.MeshBasicMaterial({color}));if(actor.spec){m.geometry=cube;m.scale.set(actor.spec.width*.9,actor.spec.height*.8,actor.spec.length*.95);m.position.y=actor.spec.height*.45;}else m.userData.clothing=true;m.userData.sharedRenderProxy=true;entry.proxy=m;root.add(m);}
 for(const child of entry.children)child.visible=visible&&(!simple||!proxyAllowed);
 if(entry.proxy)entry.proxy.visible=visible&&simple&&proxyAllowed;
 for(const [mesh,material] of entry.materials)mesh.material=simple&&!proxyAllowed&&!Array.isArray(material)?flat(material):material;
 actor.simple=simple;
}

export class AdaptiveResolution{
 constructor(){this.reset();}
 reset(){this.frames=0;this.total=0;this.scale=1;}
 sample(dt,profile){if(!Number.isFinite(dt)||dt<=0||dt>.2)return null;this.total+=dt;this.frames++;if(this.frames<90)return null;const mean=this.total/this.frames;this.total=0;this.frames=0;const before=this.scale;if(mean>1/38)this.scale=Math.max(profile.floor/profile.pixelRatio,this.scale-.1);else if(mean<1/58)this.scale=Math.min(1,this.scale+.025);return before===this.scale?null:profile.pixelRatio*this.scale;}
}
