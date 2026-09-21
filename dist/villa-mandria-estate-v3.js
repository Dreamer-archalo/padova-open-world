// Optional estate upgrade. Keep the real map, underlying road graph and existing
// hangar/vehicle interactions authoritative; everything here is proximity-loaded.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint,areaLocal} from './gameplay-areas.js';
import {safeEstateSegments} from './villa-mandria-estate-v2.js';
import {installVehicleDamage} from './vehicle-damage.js';

export const ESTATE_BORDER=Object.freeze({west:-133,east:133,south:-98,north:63,gateHalfWidth:9});
const boxGeometry=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,8,6),cone=new THREE.ConeGeometry(1,1,7),wheel=new THREE.CylinderGeometry(1,1,1,10);
const materials=new Map(),phrases=new Map();
function mat(hex){if(!materials.has(hex))materials.set(hex,new THREE.MeshStandardMaterial({color:hex,roughness:.84}));return materials.get(hex);}
function cube(root,color,x,y,z,w,h,d){const mesh=new THREE.Mesh(boxGeometry,mat(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);return mesh;}
function mesh(root,geometry,color,x,y,z,w,h,d){const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=false;m.receiveShadow=false;root.add(m);return m;}
const world=(u,v)=>areaPoint(VILLA,u,v);
function clear(g,u,v,r=1.6){const p=world(u,v),y=g.terrain.height(p.x,p.z);if(!Number.isFinite(y)||!g.terrain.dry(p.x,p.z,Math.min(2,r),y))return false;for(const hit of g.collision?.near?.(p.x,p.z,r)||[])if(hit.solid!==false&&hit.kind!=='road')return false;return true;}
function safeRoute(g,route,width){return route.every(([u,v])=>clear(g,u,v,width/2))&&route.slice(1).every((p,i)=>safeEstateSegments(g,[route[i],p],width).length>=Math.ceil(Math.hypot(route[i][0]-p[0],route[i][1]-p[1])/5));}
function position(g,object,u,v){const p=world(u,v);object.position.set(p.x,g.terrain.height(p.x,p.z),p.z);}
const within=({u,v},margin=0)=>u>=ESTATE_BORDER.west+margin&&u<=ESTATE_BORDER.east-margin&&v>=ESTATE_BORDER.south+margin&&v<=ESTATE_BORDER.north-margin;
function hideObsoletePerimeterAndTrees(life){
 // Earlier perimeter at v=44 divided the entrance from the farm. Its rails
 // and posts are only decorative meshes; hide just these known materials.
 for(const o of life.expansion.root.children)if(o.isMesh&&['665642','6c6350'].includes(o.material?.color?.getHexString()))o.visible=false;
 let hiddenTrees=0;
 for(const o of life.root.children){
  if(!o.isGroup||o.children.filter(c=>c.geometry?.type==='ConeGeometry').length!==3)continue;
  if(within(areaLocal(VILLA,o.position.x,o.position.z),3))continue;
  o.visible=false;hiddenTrees++;
 }
 // The old service lane extends outside the actual estate, behind the gate.
 for(const o of life.expansion.root.children)if(o.isMesh&&o.material?.color?.getHexString()==='8c7f69'&&!within(areaLocal(VILLA,o.position.x,o.position.z),0))o.visible=false;
 return hiddenTrees;
}
function fencePiece(root,g,a,b){
 if(!safeRoute(g,[a,b],1.25))return false;
 const pa=world(...a),pb=world(...b),distance=Math.hypot(pa.x-pb.x,pa.z-pb.z),x=(pa.x+pb.x)/2,z=(pa.z+pb.z)/2,y=(g.terrain.height(pa.x,pa.z)+g.terrain.height(pb.x,pb.z))/2;
 if(Math.abs(g.terrain.height(pa.x,pa.z)-g.terrain.height(pb.x,pb.z))>.55)return false;
 const angle=Math.atan2(pb.x-pa.x,pb.z-pa.z);
 for(const height of [.50,1.10]){const rail=cube(root,'#b7a27b',x,y+height,z,.13,.14,distance+.06);rail.rotation.y=angle;}
 const post=cube(root,'#cdbb96',pa.x,g.terrain.height(pa.x,pa.z)+.85,pa.z,.28,1.7,.28);post.name='Estate boundary post';
 return true;
}
function border(g,root){
 const b=ESTATE_BORDER,gap=b.gateHalfWidth,edges=[
  [[b.west,b.south],[b.east,b.south]],[[b.west,b.south],[b.west,b.north]],
  [[b.east,b.south],[b.east,b.north]],[[b.west,b.north],[-gap,b.north]],
  [[gap,b.north],[b.east,b.north]]];
 let built=0,skipped=0;
 for(const [from,to] of edges){const d=Math.hypot(to[0]-from[0],to[1]-from[1]),count=Math.ceil(d/4);
  for(let i=0;i<count;i++){const a=from.map((v,j)=>v+(to[j]-v)*i/count),c=from.map((v,j)=>v+(to[j]-v)*(i+1)/count);if(fencePiece(root,g,a,c))built++;else skipped++;}
 }
 for(const u of [-gap,gap])if(clear(g,u,b.north,1.8)){
  const p=world(u,b.north),y=g.terrain.height(p.x,p.z);
  cube(root,'#dfc8a3',p.x,y+1.5,p.z,1.5,3,1.5);
  cube(root,'#895d3e',p.x,y+3.15,p.z,1.7,.3,1.7);
  cube(root,'#d9b878',p.x,y+3.45,p.z,.65,.35,.65);
 }
 // The centre is deliberately open: the existing graph-connected driveway
 // crosses only this 18 m gate, never an estate fence segment.
 return {built,skipped,gate:{u:0,v:b.north},roadWidth:18};
}
function tallPoplar(root,g,u,v,i){if(!clear(g,u,v,1.4))return false;const tree=new THREE.Group();position(g,tree,u,v);const h=14.5+(i%3)*1.1;
 mesh(tree,wheel,'#776850',0,h*.3,0,.23,h*.62,.23);
 for(let j=0;j<3;j++)mesh(tree,cone,j%2?'#3e683e':'#466e3e',0,h*(.56+j*.13),0,1.5-j*.14,h*.45,1.5-j*.14);
 tree.name='Mandria · pioppo dentro il cancello';root.add(tree);return true;
}
function approachTrees(root,g){let planted=0;for(let v=55,i=0;v>=15;v-=10,i++)for(const side of [-1,1]){
  const u=side*9,at=world(u,v);
  // Avoid doubling an older poplar at the exact same position.
  const old=g.villaLife.root.children.some(o=>o.isGroup&&o.visible&&o.children.filter(c=>c.geometry?.type==='ConeGeometry').length===3&&Math.hypot(o.position.x-at.x,o.position.z-at.z)<5);
  if(!old&&tallPoplar(root,g,u,v,i))planted++;
 }return planted;}
function workersHouse(root,g,u,v){
 if(![[u,v],[u-4,v-4],[u+4,v-4],[u-4,v+4],[u+4,v+4]].every(p=>clear(g,...p,1.5)))return false;
 const house=new THREE.Group();position(g,house,u,v);house.rotation.y=VILLA.yaw;
 cube(house,'#d5b487',0,1.55,0,7.2,3.1,7.1);
 for(const s of [-1,1])cube(house,'#975d3d',s*1.85,3.67,0,4.1,.32,7.9).rotation.z=s*.35;
 cube(house,'#4a362b',0,1.10,3.59,1.4,2.2,.12);
 for(const side of [-1,1])cube(house,'#42606b',side*2.15,1.90,3.6,1.15,1.05,.12);
 house.name='Mandria · casa dei lavoratori agricoli';root.add(house);return true;
}
function greetingTexture(sentence){if(phrases.has(sentence))return phrases.get(sentence);
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=180;const c=canvas.getContext('2d');
 c.fillStyle='#f9f4e7';c.strokeStyle='#9a713f';c.lineWidth=8;c.beginPath();c.roundRect(8,8,624,130,25);c.fill();c.stroke();
 c.beginPath();c.moveTo(286,135);c.lineTo(317,170);c.lineTo(345,135);c.closePath();c.fill();c.stroke();
 c.fillStyle='#172b30';c.font='bold 43px Arial, sans-serif';c.textAlign='center';c.textBaseline='middle';
 let size=43;while(c.measureText(sentence).width>580&&size>24){size-=2;c.font=`bold ${size}px Arial, sans-serif`;}
 c.fillText(sentence,320,74);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;phrases.set(sentence,texture);return texture;
}
function bubble(parent,y=2.85){const obj=new THREE.Sprite(new THREE.SpriteMaterial({map:greetingTexture('Hola, patrón'),transparent:true,depthTest:false,depthWrite:false}));obj.position.set(0,y,0);obj.scale.set(5.8,1.65,1);obj.renderOrder=1000;obj.visible=false;parent.add(obj);return obj;}
function say(target,sentence,until){target.speech??=bubble(target.obj,target.role==='mounted'?3.7:target.role==='ape'?3.2:2.85);target.speech.material.map=greetingTexture(sentence);target.speech.material.needsUpdate=true;target.speech.visible=true;target.speechUntil=until;}
const GREETINGS=Object.freeze({servant:['Hola patron','Bienvenido a casa, patrón','A sus órdenes, patrón'],worker:['Buen día, patrón','Los campos están listos','Todo marcha bien, patrón'],gate:['Hola signor','Acceso vigilado, señor','Perímetro seguro, señor'],bodyguard:['Hola signor','Todo tranquilo, señor','Patrulla en marcha, señor'],mounted:['Hola signor','Caballería en ronda, señor','Todo seguro, patrón'],ape:['Hola signor','Patrulla móvil, señor','Ruta despejada, patrón']});
function updateExistingBubbles(g){const life=g.villaLife;if(!life)return;for(const p of life.people){
  const active=p.until>g.state.elapsed&&p.helloAt>=0;
  if(active&&p.speechAt!==p.helloAt){p.speechAt=p.helloAt;p.greetingCount=(p.greetingCount||0)+1;const list=GREETINGS[p.role]||GREETINGS.worker;const text=list[(p.greetingCount-1)%list.length];p.lastText=text;say(p,text,p.until);}
  if(p.speech)p.speech.visible=active&&Math.hypot(g.state.x-p.obj.position.x,g.state.z-p.obj.position.z)<24;
 }}
function suit(parent,gun=false){const rider=new THREE.Group();cube(rider,'#23262b',0,.56,0,.57,.69,.37);cube(rider,'#eae3d8',0,.67,.19,.19,.33,.03);cube(rider,'#25252a',0,.67,.22,.07,.29,.03);cube(rider,'#c9a381',0,1.12,0,.29,.31,.28);cube(rider,'#151a1e',0,1.33,0,.39,.1,.33);
 for(const side of [-1,1]){cube(rider,'#22252a',side*.18,.12,.04,.2,.55,.22);cube(rider,'#22252a',side*.37,.56,0,.18,.6,.2);}
 if(gun){cube(rider,'#202426',.37,.29,.24,.12,.70,.12).rotation.z=-.2;cube(rider,'#45494c',.32,.33,.3,.26,.14,.1);}
 parent.add(rider);return rider;}
function horseModel(){const root=new THREE.Group();mesh(root,sphere,'#815a37',0,1.33,0,.53,.56,1.05);mesh(root,sphere,'#815a37',0,1.88,.68,.27,.62,.35);mesh(root,sphere,'#9f7346',0,2.17,.89,.28,.29,.39);
 for(const side of [-1,1])mesh(root,cone,'#49321f',side*.17,2.47,.8,.105,.28,.12).rotation.z=side*.25;
 cube(root,'#332c26',0,1.91,-.1,.75,.12,.65);cube(root,'#332c26',0,2.16,.96,.38,.1,.12);
 mesh(root,cone,'#473020',0,1.56,-1.08,.21,.87,.24).rotation.x=-.35;
 const legs=[];for(const side of [-1,1])for(const z of [-.69,.67]){const pivot=new THREE.Group();pivot.position.set(side*.35,1.02,z);cube(pivot,'#765134',0,-.47,0,.18,.92,.19);cube(pivot,'#31271e',0,-.91,.09,.24,.14,.33);root.add(pivot);legs.push(pivot);}
 root.userData.horseLegs=legs;root.name='Mandria · cavallo da sella';return root;}
function apeModel(){const root=new THREE.Group();cube(root,'#1a1d21',0,.39,0,1.3,.27,2.55);cube(root,'#11161b',0,1.17,.55,1.33,1.42,1.28);cube(root,'#334750',0,1.36,1.22,1.12,.65,.09);
 cube(root,'#15191c',0,.92,-.69,1.36,.69,1.24);cube(root,'#1f2427',0,1.31,-.60,1.38,.11,1.28);
 for(const [x,z] of [[0,1.03],[-.62,-.86],[.62,-.86]]){const w=mesh(root,wheel,'#202428',x,.31,z,.31,.16,.31);w.rotation.z=Math.PI/2;}
 for(const x of [-.43,.43])cube(root,'#e7d6a1',x,.66,1.31,.23,.13,.08);
 root.name='Mandria · Ape Car nera tre ruote';return root;}
function spawnPatrol(g,root,type,route){
 const width=type==='mounted'?1.2:1.6;if(!safeRoute(g,route,width))return null;
 const p=world(...route[0]),vehicle=g.addCar(p.x,p.z,VILLA.yaw,false,true,type==='mounted'?'motorcycle':'mito');
 const old=vehicle.mesh;g.scene.remove(old);g.forget?.(vehicle);
 const model=type==='mounted'?horseModel():apeModel();vehicle.mesh=model;vehicle.spec={...vehicle.spec,name:type==='mounted'?'Cavallo della tenuta':'Ape Car · sicurezza',width,length:type==='mounted'?2.5:2.8,height:type==='mounted'?2.58:2.04,wheelbase:type==='mounted'?1.65:1.75,accel:type==='mounted'?7:5,brake:13,max:type==='mounted'?13.5:13,boost:type==='mounted'?18:15,reverse:1.3,steer:type==='mounted'?1.8:1.2,mass:type==='mounted'?.45:.65,bike:type==='mounted'};
 vehicle.name=vehicle.spec.name;vehicle.mandriaPatrol=type;vehicle.route=route;vehicle.routeIndex=1;vehicle.fixedSpawn=true;vehicle.parked=true;vehicle.speed=0;vehicle.health=100;vehicle.y=g.terrain.height(p.x,p.z);
 vehicle.rider=null;
 if(type==='mounted'){const {createRider}=null||{}; /* The mounted player rider is built by the game's regular motorcycle spawn below. */}
 const guard=suit(model,true);guard.position.set(0,type==='mounted'?1.70:.6,type==='mounted'?-.05:-.05);vehicle.guardModel=guard;
 g.scene.add(model);installVehicleDamage(vehicle);g.pose(vehicle);
 return vehicle;
}
function movePatrol(g,c,dt){if(!c||!g.cars.includes(c))return;
 if(c===g.state.car){c.guardModel.visible=false;return;}
 const d=Math.hypot(g.state.x-c.x,g.state.z-c.z);
 if(d<5){c.speed=0;c.guardModel.visible=true;return;}
 if(d>380){c.speed=0;c.mesh.visible=false;return;}
 c.mesh.visible=g.state.quality!=='hyper'||c.patrolSlot===0;
 if(!c.mesh.visible)return;
 c.guardModel.visible=true;
 const target=world(...c.route[c.routeIndex]),dx=target.x-c.x,dz=target.z-c.z,length=Math.hypot(dx,dz);
 if(length<.6){c.routeIndex=(c.routeIndex+1)%c.route.length;c.speed=0;return;}
 const speed=c.mandriaPatrol==='mounted'?3.7:3.1,step=Math.min(length,speed*Math.min(dt,.07)),x=c.x+dx/length*step,z=c.z+dz/length*step,local=areaLocal(VILLA,x,z);
 if(!within(local,8)||!clear(g,local.u,local.v,c.spec.width*.55)){c.speed=0;c.routeIndex=(c.routeIndex+1)%c.route.length;return;}
 c.x=x;c.z=z;c.yaw=Math.atan2(dx,dz);c.y=g.terrain.height(x,z);c.speed=step/Math.max(dt,.001);g.pose(c);
 if(c.mandriaPatrol==='mounted')c.mesh.userData.horseLegs.forEach((leg,i)=>leg.rotation.x=Math.sin(g.state.elapsed*11+i*Math.PI*.7)*.42);
}
function greetingsForPatrol(g,vehicle){if(!vehicle)return;const t=g.state.elapsed,d=Math.hypot(g.state.x-vehicle.x,g.state.z-vehicle.z);if(d<7&&t-(vehicle.lastHello??-100)>19){vehicle.lastHello=t;vehicle.phraseIndex=(vehicle.phraseIndex||0)+1;
 const phrases=GREETINGS[vehicle.mandriaPatrol],text=phrases[(vehicle.phraseIndex-1)%phrases.length];
 vehicle.speechActor??={obj:vehicle.mesh,role:vehicle.mandriaPatrol};say(vehicle.speechActor,text,t+2.8);
 }if(vehicle.speechActor?.speech)vehicle.speechActor.speech.visible=d<20&&t<vehicle.speechActor.speechUntil;
}
function promptInstall(){if(document.getElementById('mandriaMountPrompt'))return;
 const sheet=document.createElement('style');sheet.textContent=`
 #mandriaHangarButton:not([hidden]){position:fixed!important;top:18%!important;bottom:auto!important;left:50%!important;transform:translateX(-50%)!important;display:flex!important;align-items:center;gap:14px;min-width:260px;max-width:92vw;padding:13px 22px!important;background:linear-gradient(125deg,#111e24f5,#254354f5)!important;border:2px solid #e7bd6b!important;border-radius:17px!important;box-shadow:0 0 0 5px #101d2380,0 16px 42px #000a!important;color:#fff!important;font:700 14px system-ui!important;text-align:left;cursor:pointer}
 #mandriaHangarButton .mandria-key{font:bold 29px system-ui;background:#e9c47e;color:#122832;border-radius:9px;border:2px solid #fff4ca;padding:4px 13px}
 #mandriaHangarButton strong{display:block;font-size:16px;letter-spacing:.07em}#mandriaHangarButton small{display:block;margin-top:4px;font-size:12px;color:#e5d2a9}
 #mandriaMountPrompt:not([hidden]){position:fixed;left:50%;top:33%;transform:translateX(-50%);z-index:56;border:2px solid #e6c17a;border-radius:14px;background:#172b29f0;color:#fff;padding:12px 21px;font:bold 16px system-ui;box-shadow:0 8px 25px #0008;cursor:pointer}
 @media(max-width:580px){#mandriaHangarButton:not([hidden]){top:13%!important;padding:9px 12px!important;min-width:0}#mandriaHangarButton strong{font-size:13px}#mandriaHangarButton small{font-size:11px}#mandriaMountPrompt:not([hidden]){top:29%;font-size:13px}}
 `;document.head.appendChild(sheet);
 const button=document.createElement('button');button.type='button';button.id='mandriaMountPrompt';button.hidden=true;button.textContent='E · CAVALCA IL CAVALLO';button.onclick=()=>document.getElementById('touchCar')?.click();document.body.appendChild(button);
}
function updatePrompts(g,patrols){promptInstall();const hangar=document.getElementById('mandriaHangarButton');if(hangar&&!hangar.dataset.prominent){hangar.innerHTML='<span class="mandria-key">H</span><span><strong>HANGAR PRIVATO</strong><small>PREMI H · APRI IL CATALOGO</small></span>';hangar.dataset.prominent='true';}
 const mount=document.getElementById('mandriaMountPrompt');const horse=patrols.filter(c=>c?.mandriaPatrol==='mounted'&&c.mesh.visible&&c!==g.state.car&&Math.abs(c.speed)<8).find(c=>Math.hypot(c.x-g.state.x,c.z-g.state.z)<3.2);
 mount.hidden=!horse||g.state.mode!=='foot'||g.state.paused||!!document.querySelector('dialog[open]');
}
function initialize(g){const life=g.villaLife,root=new THREE.Group();root.name='Mandria · perimetro coerente e patrullas';life.root.add(root);
 const hiddenTrees=hideObsoletePerimeterAndTrees(life),fence=border(g,root),poplars=approachTrees(root,g),houses=[[-48,-82],[48,-82]].filter(([u,v])=>workersHouse(root,g,u,v)).length;
 const patrolPlans=[{type:'mounted',points:[[-48,47],[-53,34],[-52,15],[-46,25],[-48,47]]},
  {type:'mounted',points:[[49,43],[53,23],[52,-3],[47,18],[49,43]]},
  {type:'ape',points:[[65,48],[65,28],[65,-30],[65,28],[65,48]]},
  {type:'ape',points:[[-66,44],[-65,24],[-65,-35],[-65,24],[-66,44]]}];
 const patrols=[];for(const plan of patrolPlans){const c=spawnPatrol(g,root,plan.type,plan.points);if(c){c.patrolSlot=patrols.filter(p=>p.mandriaPatrol===plan.type).length;patrols.push(c);}}
 return {root,fence,hiddenTrees,poplars,houses,patrols};
}
export function estateV3Update(g,dt){if(!g?.state?.started||!g.villaLife?.expansion||!g.terrain||!Number.isFinite(dt)||dt<=0)return;
 const distance=Math.hypot(g.state.x-VILLA.x,g.state.z-VILLA.z);
 if(!g.villaV3){if(distance>275)return;g.villaV3=initialize(g);}
 const scene=g.villaV3;scene.root.visible=distance<450;
 if(!scene.root.visible){for(const c of scene.patrols)if(c!==g.state.car)c.mesh.visible=false;return;}
 updateExistingBubbles(g);
 for(const c of scene.patrols){movePatrol(g,c,dt);greetingsForPatrol(g,c);}
 updatePrompts(g,scene.patrols);
}
const beforePopulate=ModernGameplay.prototype.populate,beforeUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__villaMandriaEstateV3){
 ModernGameplay.prototype.__villaMandriaEstateV3=true;
 ModernGameplay.prototype.populate=function(...args){if(this.villaV3){for(const c of this.villaV3.patrols)this.remove(c);this.villaV3.root.parent?.remove(this.villaV3.root);this.villaV3=null;}return beforePopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){beforeUpdate.call(this,dt);estateV3Update(this,dt);};
}
