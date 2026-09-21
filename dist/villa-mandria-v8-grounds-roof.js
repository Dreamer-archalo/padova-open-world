// Mandria-only scenic improvements. Existing streets and public geometry are untouched.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint,areaLocal} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
const at=(u,v)=>areaPoint(VILLA,u,v),cone=new THREE.ConeGeometry(1,1,7),trunk=new THREE.CylinderGeometry(1,1,1,7);
const greens=['#345b35','#406e3c','#547844'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.88}));
const bark=new THREE.MeshStandardMaterial({color:'#77644b',roughness:.92});
function plant(root,g,u,v,i){if(!mandriaFree(g,u,v,1.15,3))return false;
 const p=at(u,v),neighbours=g.villaLife?.root?.children||[];
 if(neighbours.some(o=>o.isGroup&&Math.hypot(o.position.x-p.x,o.position.z-p.z)<5&&o.children.some(c=>c.geometry?.type==='ConeGeometry')))return false;
 const tree=new THREE.Group(),h=11+(i%4)*1.3;tree.name='Mandria · pioppo schermatura perimetrale';tree.position.set(p.x,g.terrain.height(p.x,p.z),p.z);
 const stem=new THREE.Mesh(trunk,bark);stem.position.y=h*.34;stem.scale.set(.24,h*.68,.24);tree.add(stem);
 for(let level=0;level<3;level++){const crown=new THREE.Mesh(cone,greens[(i+level)%greens.length]);crown.scale.set(1.4-level*.17,h*.44,1.4-level*.17);crown.position.y=h*(.59+level*.13);tree.add(crown);}
 root.add(tree);return true;}
function screen(g){if(g.villaV8Grounds)return;const root=new THREE.Group();root.name='Mandria · schermatura verde interna al confine';g.villaV3.root.add(root);
 let count=0,index=0;
 for(const u of [-119,119])for(let v=-82;v<=47;v+=11){if(plant(root,g,u,v,index++))count++;}
 for(const v of [-84,49])for(let u=-111;u<=111;u+=14){if(plant(root,g,u,v,index++))count++;}
 g.villaV8Grounds={root,trees:count,sheep:0,roof:false};
}
function addSheep(g){const ground=g.villaV8Grounds;if(!ground||ground.sheepDone||!g.villaLife?.pastures)return;
 ground.sheepDone=true;for(const pasture of g.villaLife.pastures){const template=pasture.animals.find(a=>a.a.name.includes('pecora'));
  if(!template)continue;const centre={u:pasture.worker.u+10,v:pasture.worker.v-10};
  for(const [i,offset] of [[-2,1],[3,-2]].entries()){
   const u=centre.u+offset,v=centre.v+(i?4:-4),p=at(u,v);
   if(!mandriaFree(g,u,v,.65,1.8))continue;
   const clone=template.a.clone(true);clone.position.set(p.x,g.terrain.height(p.x,p.z),p.z);clone.name='Mandria · pecora aggiuntiva';template.a.parent.add(clone);
   pasture.animals.push({a:clone,index:pasture.animals.length,origin:clone.position.clone()});ground.sheep++;
  }
 }
}
function compactRoof(g){const ground=g.villaV8Grounds,roof=g.villaRoof;if(!roof||ground.roof)return;
 ground.roof=true;
 // Keep the real deck and guardrails: replace the two large painted pads with
 // one compact nine-metre circle. The adjacent VTOL parks on the existing deck.
 for(const obj of roof.root.children){if(!obj.isMesh)continue;
  if(['646f67','f7e4ba','d1b98e'].includes(obj.material?.color?.getHexString()))obj.visible=false;
 }
 const p=at(-12,-19),pad=new THREE.Group();pad.position.set(p.x,roof.top+.075,p.z);pad.rotation.y=VILLA.yaw;
 const surface=new THREE.Mesh(new THREE.CircleGeometry(4.45,40),new THREE.MeshBasicMaterial({color:0x535e58,side:THREE.DoubleSide}));surface.rotation.x=-Math.PI/2;pad.add(surface);
 const ring=new THREE.Mesh(new THREE.RingGeometry(3.87,4.06,48),new THREE.MeshBasicMaterial({color:0xf4ddaa,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.015;pad.add(ring);
 const white=new THREE.MeshStandardMaterial({color:'#f8e8bf'}),box=new THREE.BoxGeometry(1,1,1);
 for(const [x,z,w,d] of [[-1.1,0,.2,3.7],[1.1,0,.2,3.7],[0,0,2.2,.2]]){
  const bar=new THREE.Mesh(box,white);bar.position.set(x,.033,z);bar.scale.set(w,.04,d);pad.add(bar);
 }
 pad.name='Mandria · eliporto compatto · un solo elicottero';roof.root.add(pad);
 ground.removeSecondHelicopter=()=>{
  const extra=roof.helicopters.find(c=>c.style==='levante'&&c!==g.state.car);
  if(!extra)return false;g.remove(extra);roof.helicopters.splice(roof.helicopters.indexOf(extra),1);return true;
 };
 // If VTOL conversion is unavailable, do not leave two helicopters on roof.
 ground.removeSecondHelicopter();
}
function steadyRoof(g){const roof=g.villaRoof,s=g.state;if(!roof||s.mode!=='foot')return;
 const high=roof.top+.16,loc=areaLocal(VILLA,s.x,s.z);
 // Previous radial clamp extended 10+ metres beyond the rooftop and created an
 // invisible floor while jumping down. Restrict support to the actual deck,
 // the landing and the dedicated elevated stair bridge only.
 const onDeck=Math.abs(loc.u)<=21.7&&loc.v>=-30.2&&loc.v<=-7.35;
 const onLanding=Math.hypot(loc.u+9,loc.v+7.3)<2.4;
 if(!onDeck&&!onLanding){s.v8OnRoof=false;return;}
 if(g.villaV7Stairs?.travel?.direction==='down'||g.villaV6Stairs?.travel?.direction==='down'||roof.climbing?.direction==='down'){
  s.v8OnRoof=false;return;
 }
 const arriving=s.v8OnRoof||s.y>roof.top-1.4;
 if(!arriving)return;
 s.v8OnRoof=true;if(s.y<high){s.y=high;s.vy=0;}
}
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV8GroundsRoof){
 ModernGameplay.prototype.__mandriaV8GroundsRoof=true;
 ModernGameplay.prototype.populate=function(...args){if(this.villaV8Grounds)this.villaV8Grounds.root.parent?.remove(this.villaV8Grounds.root);this.villaV8Grounds=null;return oldPopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){oldUpdate.call(this,dt);
  if(!this.state?.started||!this.villaV3||Math.hypot(this.state.x-VILLA.x,this.state.z-VILLA.z)>340)return;
  screen(this);addSheep(this);compactRoof(this);this.villaV8Grounds?.removeSecondHelicopter?.();steadyRoof(this);
 };
}
