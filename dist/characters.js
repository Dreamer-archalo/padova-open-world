import * as THREE from './vendor/three.module.js';
import {CHARACTERS,normalizeCharacter} from './gameplay-areas.js';
const cube=new THREE.BoxGeometry(),head=new THREE.SphereGeometry(1,10,8),hat=new THREE.ConeGeometry(.36,1.45,12),brim=new THREE.CylinderGeometry(.53,.53,.06,16),materials=new Map();
const mat=c=>{if(!materials.has(c))materials.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.9}));return materials.get(c);};
function part(g,name,c,x,y,z,w,h,d,geometry=cube){const m=new THREE.Mesh(geometry,mat(c));m.name=name;m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);return m;}
export function createCharacter(id){
 const choice=CHARACTERS.find(c=>c.id===normalizeCharacter(id)),g=new THREE.Group(),hips=new THREE.Group(),arms=new THREE.Group(),skin='#d2ab88',military=choice.id==='mattia',milo=choice.id==='milo',wizard=choice.id==='fede',black=choice.id==='nino',pants=milo?'#bd2935':military?'#46513b':black?'#151719':'#263143';
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.16,.82,0);part(leg,'trousers',pants,0,milo?-.16:-.34,0,.23,milo?.34:.68,.27);if(milo)part(leg,'calf',skin,0,-.48,0,.2,.31,.23);part(leg,'shoe',black?'#0e1011':'#283131',0,-.72,.07,.25,.13,.4);hips.add(leg);}
 g.add(hips);part(g,'shirt',choice.color,0,1.13,0,.57,.65,.35);part(g,'face',skin,0,1.67,0,.19,.24,.2,head);part(g,'hair','#322e2a',0,1.83,-.02,.2,.09,.2,head);
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.37,1.37,0);part(arm,'sleeve',milo?skin:choice.color,0,-.25,0,.17,.49,.2);part(arm,'hand',skin,0,-.56,0,.09,.12,.1,head);arms.add(arm);}g.add(arms);
 if(choice.id==='marchese'){part(g,'white shirt','#eeeae0',0,1.25,.187,.25,.5,.025);part(g,'tie','#923c37',0,1.22,.211,.055,.37,.025);part(g,'tie knot','#aa4c43',0,1.43,.215,.085,.085,.035);}
 if(military){for(const [x,y,z] of [[-.13,1.25,.19],[.17,1.0,.19],[.15,1.4,-.19],[-.1,1.08,-.19]])part(g,'camouflage','#77744b',x,y,z,.17,.14,.025);part(g,'belt','#30382b',0,.86,0,.59,.09,.37);part(g,'field cap','#4d5940',0,1.91,.02,.42,.12,.46);}
 if(wizard){part(g,'robe','#444879',0,.85,-.01,.62,.58,.38);part(g,'hat brim','#39456c',0,1.97,0,1,1,1,brim);part(g,'wizard hat','#495986',0,2.725,0,1,1,1,hat);part(g,'gold charm','#dbbc64',-.035,2.21,.26,.12,.16,.04).rotation.z=.7;}
 g.userData.hips=hips;g.userData.arms=arms;g.userData.character=choice.id;return g;
}

// Five real 3D models use the game's renderer, avoiding five extra WebGL contexts.
export class CharacterPicker{
 constructor(document,onChoose){this.document=document;this.onChoose=onChoose;this.active=false;this.selected=CHARACTERS[0].id;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#101a25');this.camera=new THREE.PerspectiveCamera(42,1,.1,50);this.scene.add(new THREE.HemisphereLight('#dce8ff','#594766',3));const key=new THREE.DirectionalLight('#ffe0a7',3);key.position.set(-3,6,5);this.scene.add(key);this.models=CHARACTERS.map(c=>{const model=createCharacter(c.id);this.scene.add(model);return model;});this.buttons=[];
  const choices=document.getElementById('characterChoices');for(const c of CHARACTERS){const button=document.createElement('button');button.type='button';button.className='character-choice';button.textContent=c.name;button.setAttribute('aria-label',c.name+' · '+c.outfit);button.onclick=()=>this.select(c.id);choices.appendChild(button);this.buttons.push(button);}
  document.getElementById('confirmCharacter').onclick=()=>{this.active=false;document.getElementById('characterPicker').hidden=true;this.onChoose(this.selected);};
 }
 select(id){this.selected=normalizeCharacter(id);this.buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(CHARACTERS[i].id===this.selected)));this.document.getElementById('characterOutfit').textContent=CHARACTERS.find(c=>c.id===this.selected).outfit;}
 open(id){this.select(id);this.active=true;this.document.getElementById('intro').hidden=true;this.document.getElementById('characterPicker').hidden=false;this.document.getElementById('confirmCharacter').focus();}
 update(time,width,height){const wide=width/height>1.05;this.camera.aspect=width/height;this.camera.position.set(0,2.6,wide?10.5:7.5);this.camera.lookAt(0,1.4,0);this.camera.updateProjectionMatrix();this.models.forEach((g,i)=>{const selected=CHARACTERS[i].id===this.selected;g.visible=wide||selected;g.position.set(wide?(i-2)*1.65:0,.1+Math.sin(time*.0015+i)*.13,selected?.15:-.15);g.rotation.y=Math.sin(time*.0003+i)*.14;g.scale.setScalar(selected?1.12:.94);});}
}
