// Mandria v4: local estate rules. Do not change mapped public roads or Treves.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint,areaLocal} from './gameplay-areas.js';
import {ESTATE_BORDER} from './villa-mandria-estate-v3.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
import {nearestOnSegment} from './core.js';

const GEO={box:new THREE.BoxGeometry(1,1,1),cone:new THREE.ConeGeometry(1,1,7),sphere:new THREE.SphereGeometry(1,8,6),cyl:new THREE.CylinderGeometry(1,1,1,8)};
const mats=new Map(),texts=new Map();
function material(hex){if(!mats.has(hex))mats.set(hex,new THREE.MeshStandardMaterial({color:hex,roughness:.87}));return mats.get(hex);}
function shape(parent,type,color,x,y,z,w,h,d){const o=new THREE.Mesh(GEO[type],material(color));o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=false;o.receiveShadow=false;parent.add(o);return o;}
const box=(...a)=>shape(a[0],'box',...a.slice(1));
const at=(u,v)=>areaPoint(VILLA,u,v);
const local=p=>areaLocal(VILLA,p.x,p.z);
const inside=p=>p.u>ESTATE_BORDER.west&&p.u<ESTATE_BORDER.east&&p.v>ESTATE_BORDER.south&&p.v<ESTATE_BORDER.north;
function nearPublicStreet(g,u,v,r=5){const q=at(u,v),graph=g.graph;if(!graph?.index)return false;for(const segment of graph.index.near(q.x,q.z,r+12)){
 if(segment.road?.estatePrivate||segment.road?.access==='private'||segment.road?.gameplay)continue;
 const a=graph.nodes[segment.a],b=graph.nodes[segment.b];if(!a||!b)continue;
 const n=nearestOnSegment(q.x,q.z,[a.x,a.z],[b.x,b.z]);if(Math.hypot(q.x-n.x,q.z-n.z)<r+(segment.road.w||6)/2)return true;
 }return false;}
function privateRoads(g){let changed=0;for(const s of g.graph?.segments||[]){if(!/^Accesso Villa della Mandria$|^Viale Villa della Mandria$/.test(s.road?.n||''))continue;
  if(s.road.access!=='private'){s.road.access='private';changed++;}s.road.estatePrivate=true;
 }return changed;}
function keepPrivate(g){const s=g.state;let cars=0,people=0;
 for(const c of g.cars){if(c===s.car||!c.mesh?.visible||c.fixedSpawn||c.parked||c.mandriaPatrol||c.estateAuthorized||c.hostile||c.missionUnit)continue;
  const p=local(c),restricted=inside(p)||(Math.abs(p.u)<18&&p.v>=ESTATE_BORDER.north&&p.v<105);
  if(!restricted&&!c.road?.estatePrivate)continue;
  c.mesh.visible=false;c.speed=0;c.longAccel=0;c.retryAt=s.elapsed+1.2;cars++;
 }
 const close=Math.hypot(s.x-VILLA.x,s.z-VILLA.z)<350;
 for(const p of g.people){if(!p.mesh)continue;
  if(!close){if(p.mandriaSuppressed){p.mandriaSuppressed=false;p.budgetSleeping=false;p.retryAt=0;p.at=0;}continue;}
  const q=local(p),restricted=inside(q)||(Math.abs(q.u)<22&&q.v>=ESTATE_BORDER.north&&q.v<104);
  if(!restricted)continue;
  p.mandriaSuppressed=true;p.budgetSleeping=true;p.mesh.visible=false;p.speed=0;p.at=0;people++;
 }
 return {cars,people};}
function segment(root,g,a,b,color='#a78c61',level=.88){const x=at(...a),z=at(...b),length=Math.hypot(z.x-x.x,z.z-x.z);if(length<.15)return;
 const y=(g.terrain.height(x.x,x.z)+g.terrain.height(z.x,z.z))/2;
 const rail=box(root,color,(x.x+z.x)/2,y+level,(x.z+z.z)/2,.095,.10,length);rail.rotation.y=Math.atan2(z.x-x.x,z.z-x.z);
}
function fence(root,g,u,v,w,d,gap=0){const left=u-w/2,right=u+w/2,back=v-d/2,front=v+d/2;
 const lines=[[[left,back],[right,back]],[[left,back],[left,front]],[[right,back],[right,front]],[[left,front],[u-gap/2,front]],[[u+gap/2,front],[right,front]]];
 for(const [a,b] of lines){const n=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/3));for(let i=0;i<n;i++){
  const p=a.map((x,j)=>x+(b[j]-x)*i/n),q=a.map((x,j)=>x+(b[j]-x)*(i+1)/n),world=at(...p),y=g.terrain.height(world.x,world.z);
  box(root,'#bca27c',world.x,y+.76,world.z,.17,1.52,.17);
  segment(root,g,p,q,'#a98b61',.55);segment(root,g,p,q,'#a98b61',1.1);
 }}
}
function tree(root,g,u,v,n){if(!mandriaFree(g,u,v,1.6,15)||nearPublicStreet(g,u,v,3.2))return false;
 const p=at(u,v),o=new THREE.Group(),h=10.5+(n%4)*.9;o.position.set(p.x,g.terrain.height(p.x,p.z),p.z);
 shape(o,'cyl','#826b50',0,h*.32,0,.22,h*.64,.22);
 for(let k=0;k<3;k++)shape(o,'cone',k%2?'#466d3c':'#527c44',0,h*(.56+k*.13),0,1.7-k*.22,h*.42,1.7-k*.22);
 o.name='Mandria · alberatura esterna';root.add(o);return true;}
function perimeterTrees(root,g){let planted=0,i=0;
 for(let u=ESTATE_BORDER.west+7;u<ESTATE_BORDER.east;u+=14)for(const v of [ESTATE_BORDER.south-5,ESTATE_BORDER.north+5]){
  if(v>0&&Math.abs(u)<21)continue;if(tree(root,g,u,v,i++))planted++;
 }
 for(let v=ESTATE_BORDER.south+10;v<ESTATE_BORDER.north;v+=13)for(const u of [ESTATE_BORDER.west-5,ESTATE_BORDER.east+5])if(tree(root,g,u,v,i++))planted++;
 return planted;}
function flowers(root,g){let planters=0;
 for(const [u,v] of [[-35,35],[-34,42],[-28,44],[-38,17],[-31,11],[-39,-4]]){
  if(!mandriaFree(g,u,v,1.4))continue;
  const p=at(u,v),y=g.terrain.height(p.x,p.z);
  box(root,'#a76043',p.x,y+.28,p.z,2.2,.56,1.05);box(root,'#3b6641',p.x,y+.61,p.z,1.96,.15,.86);
  for(let j=0;j<7;j++){const x=p.x+(j%4-1.5)*.43,z=p.z+(Math.floor(j/4)-.5)*.48;
   shape(root,'sphere',j%3===0?'#ffd17b':j%3===1?'#d95162':'#f3e0ce',x,y+.84,z,.17,.17,.17);
  }planters++;
 }return planters;}
function farmDetails(root,g){let decorated=0;
 for(const field of g.villaLife?.fields||[]){const u=field.worker.u+9,v=field.worker.v+13;
  // Low irrigation strips sit between the existing crop rows, not over roads.
  for(let col=0;col<5;col++){const p=at(u-10+col*5,v),y=g.terrain.height(p.x,p.z);
   const irrigation=box(root,'#648d8d',p.x,y+.035,p.z,.085,.06,26);irrigation.rotation.y=VILLA.yaw;
  }
  const sign=at(u-11,v+17),y=g.terrain.height(sign.x,sign.z);
  box(root,'#916e49',sign.x,y+.8,sign.z,1.9,1.5,.15);box(root,'#d8c590',sign.x,y+1.4,sign.z,2.2,.55,.2);decorated++;
 }
 for(const pasture of g.villaLife?.pastures||[]){const u=pasture.worker.u+10,v=pasture.worker.v-10;
  fence(root,g,u,v,27,31,3.5);
  const p=at(u+8,v-8),y=g.terrain.height(p.x,p.z);
  box(root,'#876d42',p.x,y+.42,p.z,2.8,.75,1.05);box(root,'#d4b77a',p.x,y+.84,p.z,2.5,.34,.9);
  for(let k=0;k<3;k++){const q=at(u+4+k*2,v+8);shape(root,'cyl','#cbb16f',q.x,g.terrain.height(q.x,q.z)+.52,q.z,.7,1.02,.7);}
  decorated++;
 }return decorated;}
function safePaddock(g,u,v,w=20,d=22){for(const dx of [-w/2,0,w/2])for(const dz of [-d/2,0,d/2])if(!mandriaFree(g,u+dx,v+dz,1.4,4))return false;
 for(const child of g.villaV3?.root.children||[])if(/casa dei lavoratori/.test(child.name||'')){
  const p=at(u,v);if(Math.hypot(child.position.x-p.x,child.position.z-p.z)<21)return false;
 }return true;}
function paddock(g,root){const candidates=[[61,-57],[58,-55],[60,-67],[52,-61],[-60,-61]];
 const spot=candidates.find(([u,v])=>safePaddock(g,u,v));if(!spot)return null;
 const [u,v]=spot,w=20,d=22;fence(root,g,u,v,w,d,4.6);
 const board=at(u-12,v),y=g.terrain.height(board.x,board.z);
 if(mandriaFree(g,u-12,v,3,5)){
  const barn=new THREE.Group();barn.position.set(board.x,y,board.z);barn.rotation.y=VILLA.yaw;
  box(barn,'#d2ad7d',0,2,0,7.5,4,8);box(barn,'#965842',0,4.25,0,8.2,.55,9);
  box(barn,'#473629',0,1.15,4.08,2.4,2.3,.13);barn.name='Mandria · scuderia';root.add(barn);
 }
 for(const h of g.villaV3.patrols.filter(c=>c.mandriaPatrol==='mounted')){
  const index=g.villaV3.patrols.filter(c=>c.mandriaPatrol==='mounted').indexOf(h),shift=index?3:-3,route=[[u+shift,v-5],[u+shift,v+5],[u+shift*1.5,v+5],[u+shift*1.5,v-5],[u+shift,v-5]];
  if(!route.every(([x,z])=>mandriaFree(g,x,z,1.15,3)))continue;
  h.route=route;h.routeIndex=1;h.x=at(...route[0]).x;h.z=at(...route[0]).z;h.y=g.terrain.height(h.x,h.z);h.yaw=VILLA.yaw;h.speed=0;h.estateHorse=true;
  h.home={x:h.x,z:h.z,y:h.y,yaw:h.yaw};if(h.guardModel)h.guardModel.visible=false;h.speechActor?.speech&&(h.speechActor.speech.visible=false);g.pose(h);
 }
 return {u,v,w,d,animals:g.villaV3.patrols.filter(c=>c.estateHorse).length};}
function dignifySecurity(g){const life=g.villaLife;if(!life)return;
 if(life.expansion?.escort?.car)life.expansion.escort.car.visible=false;
 // Mobile security exclusively patrols by Ape Car; suited stationary staff may stay on duty.
 for(const person of life.expansion?.recruits||[])person.patrolRoute=null;
 if(life.cars?.[1])life.cars[1].visible=false;
 const secondGate=life.people.filter(p=>p.role==='gate')[1];
 if(secondGate&&!secondGate.obj.userData.v4Suit){secondGate.role='bodyguard';
  for(const part of secondGate.obj.children)if(part.isMesh&&part.material?.color?.getHexString()==='1a2426')part.visible=false;
  box(secondGate.obj,'#f0e8db',0,1.30,.175,.22,.36,.04);box(secondGate.obj,'#272530',0,1.29,.21,.075,.31,.035);
  secondGate.obj.userData.v4Suit=true;
 }
}
function texture(text){if(texts.has(text))return texts.get(text);const canvas=document.createElement('canvas');canvas.width=640;canvas.height=160;const c=canvas.getContext('2d');c.fillStyle='#fff7e7';c.strokeStyle='#986b40';c.lineWidth=7;c.beginPath();c.roundRect(8,8,624,140,20);c.fill();c.stroke();let size=42;c.fillStyle='#19252a';c.textAlign='center';c.textBaseline='middle';do{c.font=`bold ${size}px Arial`;if(c.measureText(text).width<586)break;size-=2;}while(size>22);c.fillText(text,320,78);const result=new THREE.CanvasTexture(canvas);result.colorSpace=THREE.SRGBColorSpace;texts.set(text,result);return result;}
function speak(p,text,t,seconds=2.3){if(!p?.obj)return;
 if(!p.speech){p.speech=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthTest:false,depthWrite:false}));p.speech.position.set(0,2.85,0);p.speech.scale.set(5.8,1.55,1);p.obj.add(p.speech);}
 p.speech.material.map=texture(text);p.speech.material.needsUpdate=true;p.speech.visible=true;p.speechUntil=t+seconds;p.speechAt=t;p.helloAt=t;p.until=t+seconds;p.lastText=text;}
const PHRASES={gate:['Hola, señor','Todo tranquilo, patrón','Acceso controllato','Buona giornata, capo'],bodyguard:['Con permesso, signore','Perimetro sicuro','Resto in posizione','Nessuna novità'],servant:['Bienvenido, patrón','La casa è pronta','A sua disposizione','Buongiorno, signore'],worker:['Gli animali stanno bene','I campi sono a posto','Stiamo finendo il lavoro','Buongiorno, capo']};
const DIALOGUES=[['Controlla il lato ovest.','Ricevuto.'],['Tutto tranquillo al cancello?','Sì, tutto regolare.'],['Occhio al perimetro.','Passiamo dal recinto.'],['Radio, aggiornamenti?','Nessuna novità.']];
function conversations(g){const v=g.villaV4,life=g.villaLife,t=g.state.elapsed;if(!life)return;
 for(const p of life.people){if(p.helloAt<0||p.helloAt===p.v4Hello)continue;p.v4Hello=p.helloAt;
  const count=p.greetingCount||1,seed=Math.abs(Math.round((p.u||0)*7+(p.v||0)*3));
  if((seed+count)%4===0){p.v4SilentUntil=p.until;if(p.speech)p.speech.visible=false;continue;}
  const choices=PHRASES[p.role]||PHRASES.worker,text=choices[(seed+count)%choices.length];speak(p,text,t,Math.max(1.5,p.until-t));p.v4Hello=p.helloAt;
 }
 for(const p of life.people)if(p.v4SilentUntil>t&&p.speech)p.speech.visible=false;
 const guards=life.people.filter(p=>['gate','bodyguard'].includes(p.role));if(guards.length<2)return;
 if(v.response&&t>=v.response.at){const p=guards[v.response.person%guards.length];speak(p,v.response.text,t,2.4);p.v4Hello=t;v.response=null;}
 if(t<(v.nextDialogue||0)||v.response||Math.hypot(g.state.x-VILLA.x,g.state.z-VILLA.z)>110)return;
 const a=guards[v.dialogueIndex%guards.length],b=guards[(v.dialogueIndex+1)%guards.length],pair=DIALOGUES[v.dialogueIndex%DIALOGUES.length];v.dialogueIndex++;
 if(Math.hypot(a.obj.position.x-b.obj.position.x,a.obj.position.z-b.obj.position.z)<56){speak(a,pair[0],t,2.6);a.v4Hello=t;v.response={person:guards.indexOf(b),text:pair[1],at:t+3};}
 v.nextDialogue=t+24+v.dialogueIndex%4*5;
}
function init(g){privateRoads(g);const root=new THREE.Group();root.name='Mandria · verde messicano, fattoria e scuderia';g.villaLife.root.add(root);
 const planted=perimeterTrees(root,g),planters=flowers(root,g),farm=farmDetails(root,g),corral=paddock(g,root);dignifySecurity(g);
 return {root,planted,planters,farm,corral,nextDialogue:g.state.elapsed+17,dialogueIndex:0,response:null,trafficRemoved:0,crowdRemoved:0};}
export function mandriaV4GroundsUpdate(g,dt){if(!g.state?.started||!g.villaV3?.placementFixed||!g.villaLife?.expansion||!Number.isFinite(dt)||dt<=0)return;
 if(!g.villaV4)g.villaV4=init(g);
 const v=g.villaV4,distance=Math.hypot(g.state.x-VILLA.x,g.state.z-VILLA.z);
 v.root.visible=distance<400;if(distance>450)return;
 privateRoads(g);const reduced=keepPrivate(g);v.trafficRemoved+=reduced.cars;v.crowdRemoved+=reduced.people;
 dignifySecurity(g);conversations(g);
 for(const horse of g.villaV3.patrols.filter(c=>c.estateHorse)){
  if(horse.guardModel)horse.guardModel.visible=false;if(horse.speechActor?.speech)horse.speechActor.speech.visible=false;
 }
}
const prevPopulate=ModernGameplay.prototype.populate,prevUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV4Grounds){ModernGameplay.prototype.__mandriaV4Grounds=true;
 ModernGameplay.prototype.populate=function(...args){if(this.villaV4){this.villaV4.root.parent?.remove(this.villaV4.root);this.villaV4=null;}const result=prevPopulate.apply(this,args);privateRoads(this);
  if(!this.__mandriaToastWrapped){const original=this.toast;this.toast=(msg,...rest)=>{
    if((msg==='Hola patron'||msg==='Hola signor')&&Math.hypot(this.state.x-VILLA.x,this.state.z-VILLA.z)<330)return;
    return original(msg,...rest);
   };this.__mandriaToastWrapped=true;}return result;};
 ModernGameplay.prototype.update=function(dt){prevUpdate.call(this,dt);mandriaV4GroundsUpdate(this,dt);};
}
