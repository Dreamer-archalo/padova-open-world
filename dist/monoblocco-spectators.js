import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {roofClear,onTrack,findLayout} from './monoblocco-track.js';
import {resolveHospital} from './hospital-rooftop-easter-egg.js';

// Spectators are independent of the city pedestrian recycler and cannot be
// teleported to a different location by normal traffic/population updates.
const perGame=new WeakMap();
const cheers=['Vai, vai!','Che salto!','Grande!','Forza trial!','Atterraggio perfetto!'];
const bodyGeo=new THREE.BoxGeometry(.52,.75,.32),armGeo=new THREE.BoxGeometry(.14,.66,.17),headGeo=new THREE.SphereGeometry(.19,8,6);
const colours=['#e7ab3a','#4ba2bd','#d86b64','#7b8f51','#b78cd3','#d8d1be','#eeb98c'];
function spectator(root,p,y,track,index){
 const group=new THREE.Group();group.position.set(p.x,y,p.z);group.rotation.y=Math.atan2(track.x-p.x,track.z-p.z);group.name='monoblocco-cheering-spectator';
 const shirt=new THREE.MeshStandardMaterial({color:colours[index%colours.length]}),skin=new THREE.MeshStandardMaterial({color:index%2?'#bd9374':'#e0b695'}),trousers=new THREE.MeshStandardMaterial({color:'#36444d'});
 const torso=new THREE.Mesh(bodyGeo,shirt);torso.position.y=1.04;group.add(torso);
 const legs=new THREE.Mesh(new THREE.BoxGeometry(.38,.74,.28),trousers);legs.position.y=.38;group.add(legs);
 const head=new THREE.Mesh(headGeo,skin);head.position.y=1.61;group.add(head);
 const arms=[];for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*.35,1.37,0);const arm=new THREE.Mesh(armGeo,shirt);arm.position.y=-.27;pivot.add(arm);group.add(pivot);arms.push(pivot);}
 group.userData.cheerArms=arms;group.userData.roofSpectator=true;group.userData.speech=cheers[index%cheers.length];group.userData.phase=index*1.7;
 // Speech is displayed visually. Audio dialogue has not been implemented.
 if(typeof document!=='undefined'&&document.createElement){const canvas=document.createElement('canvas');canvas.width=384;canvas.height=96;const ctx=canvas.getContext?.('2d');if(ctx){ctx.fillStyle='rgba(13,28,36,.87)';ctx.fillRect(4,6,376,82);ctx.fillStyle='#fff5d4';ctx.font='bold 32px system-ui';ctx.textAlign='center';ctx.fillText(group.userData.speech,192,60);const texture=new THREE.CanvasTexture(canvas),bubble=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));bubble.scale.set(3.3,.82,1);bubble.position.set(0,2.42,0);bubble.visible=false;bubble.userData.roofSpeechBubble=true;group.add(bubble);group.userData.bubble=bubble;}}
 root.add(group);return group;
}
export function selectRooftopSpectators(poly,layout,b,limit=7){const sampleCount=Math.max(96,Math.ceil(layout.total/3)),route=Array.from({length:sampleCount},(_,i)=>onTrack(layout,i/sampleCount)),choices=[];
 for(let x=b.minX+3;x<=b.maxX-3;x+=4)for(let z=b.minZ+3;z<=b.maxZ-3;z+=4){if(!roofClear(poly,x,z,2.9)||Math.hypot(x-layout.helipad.x,z-layout.helipad.z)<17)continue;let closest=null,d=Infinity;for(const p of route){const dd=Math.hypot(x-p.x,z-p.z);if(dd<d){d=dd;closest=p;}}if(d<3.8||d>13||!closest)continue;choices.push({x,z,closest,d,score:Math.abs(d-7)+Math.abs(x-(b.cx??(b.minX+b.maxX)/2))*.0001});}
 choices.sort((a,b)=>a.score-b.score);const chosen=[];for(const p of choices){if(chosen.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>=8)){chosen.push(p);if(chosen.length===limit)break;}}return chosen;
}
function install(game){if(perGame.has(game))return;const site=resolveHospital(game);if(!site)return;
 const roof=game.scene.children.find(o=>o.name==='ospedale-monoblocco-entire-roof-trial');if(!roof)return;
 // Resolve the same tested polygon-safe track; never substitute a rectangle or
 // derive positions from the hospital's bounding box alone.
 const layout=findLayout(site.polygon,site.building);if(!layout)return;
 const spots=selectRooftopSpectators(site.polygon,layout,site.building),fans=spots.map((p,i)=>spectator(roof,p,site.roofY,p.closest,i));perGame.set(game,fans);
}
const basePopulate=ModernGameplay.prototype.populate,baseUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__monobloccoSpectators){
 ModernGameplay.prototype.__monobloccoSpectators=true;
 ModernGameplay.prototype.populate=function(...args){const value=basePopulate.apply(this,args);install(this);return value;};
 ModernGameplay.prototype.update=function(dt){const value=baseUpdate.call(this,dt),fans=perGame.get(this);if(!fans)return value;
  const t=this.state.elapsed,player=this.state;for(const f of fans){const d=Math.hypot(player.x-f.position.x,player.z-f.position.z),near=d<95&&Math.abs(player.y-f.position.y)<30;f.visible=near;if(!near)continue;const phase=t*2.2+f.userData.phase;f.userData.cheerArms[0].rotation.z=.4+Math.sin(phase)*.38;f.userData.cheerArms[1].rotation.z=-.4-Math.sin(phase+.6)*.38;if(f.userData.bubble)f.userData.bubble.visible=d<46&&Math.sin(t*.6+f.userData.phase)>.77;}
  return value;};
}
