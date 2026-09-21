// Estate-only presentation refinements, with no real-world shooting behavior.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
const cube=new THREE.BoxGeometry(1,1,1),ball=new THREE.SphereGeometry(1,8,6),materials=new Map();
function mat(color,glow=false){const key=color+glow;if(!materials.has(key))materials.set(key,glow?new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}):new THREE.MeshStandardMaterial({color,roughness:.8}));return materials.get(key);}
function put(root,color,x,y,z,w,h,d,glow=false){const mesh=new THREE.Mesh(cube,mat(color,glow));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);root.add(mesh);return mesh;}
function decorate(g){if(g.villaV4Polish||!g.villaEstate?.root||!g.villaV4)return;
 const house=g.villaEstate.root,group=new THREE.Group();group.name='Mandria · finiture hacienda messicana';house.add(group);
 // Terracotta and shaded arcade at the main facade, leaving the driving court clear.
 for(const u of [-18,-12,-6,0,6,12,18]){
  put(group,'#e1bf91',u,3.1,3.35,.45,6.1,.5);
  put(group,'#b76f49',u,6.26,3.35,1.35,.42,.8);
 }
 for(let u=-15;u<=15;u+=6){put(group,'#b46c46',u,6.30,3.35,4.9,.42,.75);put(group,'#efe0b6',u,6.57,3.35,4.4,.12,.63);}
 for(const u of [-37,-33,33,37]){
  put(group,'#b17852',u,.32,-3.5,1.2,.64,1.2);put(group,'#466946',u,.86,-3.5,.94,.58,.94);
  for(let i=0;i<3;i++){const blossom=new THREE.Mesh(ball,mat(i===0?'#e6ba75':i===1?'#e87a76':'#eee1c3'));blossom.position.set(u+(i-1)*.3,1.24,-3.5);blossom.scale.set(.24,.25,.24);group.add(blossom);}
 }
 const gun=new THREE.Group();gun.name='Mandria · fucile arcade del giocatore';
 put(gun,'#24292b',.27,1.28,.40,.12,.11,1.02);put(gun,'#7e5a3c',.27,1.20,-.08,.18,.20,.42);put(gun,'#24292b',.27,1.15,.19,.1,.45,.12);gun.visible=false;g.scene.add(gun);
 const muzzle=[];for(const shooter of g.villaRange?.shooters||[]){const flash=new THREE.Mesh(ball,mat('#f7d67d',true));flash.position.set(.35,1.09,.98);flash.scale.set(.11,.11,.21);flash.visible=false;shooter.add(flash);muzzle.push(flash);}
 g.villaV4Polish={group,gun,muzzle,dialogueCount:0};
}
function step(g){if(!g.state?.started||!g.villaV4)return;decorate(g);
 const p=g.villaV4Polish;if(!p)return;
 for(const person of g.villaLife?.people||[]){if(person.v4Hello===undefined||person.v4Hello<0||person.v4Hello===person.v4Counted)continue;
  person.v4Counted=person.v4Hello;person.greetingCount=(person.greetingCount||1)+1;p.dialogueCount++;
 }
 // Two free-running horses stay visible in the fenced paddock even in Hyper Performance.
 for(const horse of g.villaV3?.patrols||[])if(horse.estateHorse){horse.patrolSlot=0;if(horse.guardModel)horse.guardModel.visible=false;}
 // Some guards silently acknowledge the protagonist instead of all shouting in unison.
 for(const [i,c] of (g.villaV3?.patrols||[]).filter(c=>c.mandriaPatrol==='ape').entries()){
  if(c.speechActor?.speech&&(i+Math.floor(g.state.elapsed/19))%3===0)c.speechActor.speech.visible=false;
 }
 const range=g.villaRange,active=!!range?.active&&g.state.mode==='foot';p.gun.visible=active;
 if(active){p.gun.position.set(g.state.x,g.state.y,g.state.z);p.gun.rotation.y=g.state.yaw;}
 const firing=range?.ready&&Math.hypot(g.state.x-range.station.x,g.state.z-range.station.z)<75&&g.state.quality!=='hyper';
 for(const [i,flash] of p.muzzle.entries())flash.visible=!!firing&&(g.state.elapsed*2+i*1.77)%5<.08;
}
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV4Polish){ModernGameplay.prototype.__mandriaV4Polish=true;
 ModernGameplay.prototype.populate=function(...args){if(this.villaV4Polish){this.villaV4Polish.gun.parent?.remove(this.villaV4Polish.gun);this.villaV4Polish.group.parent?.remove(this.villaV4Polish.group);this.villaV4Polish=null;}return oldPopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){oldUpdate.call(this,dt);step(this);};
}
