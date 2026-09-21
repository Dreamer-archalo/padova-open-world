// Mandria v9: optional private-estate ambience; never modifies city traffic or roads.
import * as THREE from './vendor/three.module.js';
import {VILLA,areaPoint,areaLocal} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
const at=(u,v)=>areaPoint(VILLA,u,v),BOX=new THREE.BoxGeometry(1,1,1),SPHERE=new THREE.SphereGeometry(1,8,6),WHEEL=new THREE.CylinderGeometry(1,1,1,10);
const mats=new Map();
function mat(color){if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.88}));return mats.get(color);}
function mesh(parent,shape,color,x,y,z,w,h,d){const m=new THREE.Mesh(shape,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;}
const cube=(p,c,x,y,z,w,h,d)=>mesh(p,BOX,c,x,y,z,w,h,d);
const secure=(g,u,v,r=.7)=>u>-123&&u<123&&v>-88&&v<53&&mandriaFree(g,u,v,r,2.6);
function segment(g,a,b,r=.65){let prev=null;const steps=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/.85));
 for(let i=0;i<=steps;i++){const u=a[0]+(b[0]-a[0])*i/steps,v=a[1]+(b[1]-a[1])*i/steps;
  if(!secure(g,u,v,r))return false;const p=at(u,v),h=g.terrain.height(p.x,p.z);
  if(prev!==null&&Math.abs(h-prev)>.39)return false;prev=h;
 }return true;}
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function workerModel(kind,index){const root=new THREE.Group();root.name='Mandria · lavoratore autonomo · '+kind;
 const tunic=['#637548','#66735c','#8b6b48','#526e66'][index%4],arms=[],legs=[];
 cube(root,tunic,0,1.17,0,.56,.75,.34);mesh(root,SPHERE,'#c29b79',0,1.73,0,.20,.21,.20);
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.39,1.42,0);cube(arm,tunic,0,-.29,.04,.19,.61,.22);root.add(arm);arms.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.17,.75,0);cube(leg,'#403e36',0,-.35,0,.20,.69,.23);root.add(leg);legs.push(leg);
 }
 const prop=new THREE.Group();root.add(prop);
 if(kind==='carriola'){
  cube(prop,'#686e57',0,.57,.94,.95,.30,1.08);cube(prop,'#825f3f',0,.76,.91,.68,.31,.78);
  for(const side of [-1,1])cube(prop,'#68503a',side*.4,.76,.13,.09,.08,1.55);
  const w=mesh(prop,WHEEL,'#252c29',0,.29,1.40,.24,.13,.24);w.rotation.z=Math.PI/2;
 }else if(kind==='aratro'){
  cube(prop,'#846b46',0,.75,1.03,.10,.12,1.8);cube(prop,'#454b45',0,.18,1.92,.84,.17,.35);
  for(const side of [-1,0,1])cube(prop,'#4e5652',side*.32,.25,2.02,.06,.34,.12);
 }else if(kind==='casse'||kind==='raccolta'||kind==='fieno'){
  const color=kind==='raccolta'?'#9d844a':kind==='fieno'?'#b7a36a':'#946a43';
  cube(prop,color,0,1.02,.49,.69,.52,.54);
  if(kind==='raccolta')for(const side of [-1,0,1])mesh(prop,SPHERE,'#b55a31',side*.19,1.34,.44,.12,.12,.12);
 }else if(kind==='irrigazione')cube(prop,'#4c7786',.42,.58,.13,.46,.44,.35);
 else if(kind==='cavalli'){
  const horse=new THREE.Group();horse.position.set(1.18,0,-.65);root.add(horse);
  mesh(horse,SPHERE,'#88613d',0,1.24,0,.45,.52,.87);mesh(horse,SPHERE,'#906c45',0,1.66,.66,.25,.46,.33);
  mesh(horse,SPHERE,'#9e754e',0,1.91,.85,.28,.24,.29);
  const hlegs=[];for(const x of [-.32,.32])for(const z of [-.61,.60]){
   const pivot=new THREE.Group();pivot.position.set(x,.88,z);cube(pivot,'#765335',0,-.43,0,.16,.86,.18);horse.add(pivot);hlegs.push(pivot);
  }root.userData.horseLegs=hlegs;
  const lead=cube(root,'#b69c6f',.75,1.07,.15,.035,.035,1.45);lead.rotation.y=.18;
 }else if(kind==='pecore')cube(prop,'#b29d70',.38,.95,.18,.07,1.6,.08);
 return {root,arms,legs,prop};}
const PLANS=[
 ['carriola',[-104,-71],[-85,-66]],['aratro',[91,-75],[108,-75]],
 ['raccolta',[106,-30],[96,-19]],['casse',[-73,-73],[-48,-69]],
 ['pecore',[-104,-28],[-98,-21]],['irrigazione',[99,13],[110,29]],
 ['cavalli',[65,-57],[81,-56]],['gruppo',[-61,-66],[-47,-76]],
 ['gruppo',[-62,-68],[-48,-78]],['ronda',[46,-65],[66,-76]],
 ['fieno',[-96,9],[-88,17]],['casse',[79,-40],[97,-38]],
 ['raccolta',[85,-62],[105,-61]],['carriola',[-109,29],[-94,33]],
 ['gioco',[39,-72],[54,-72]],['gioco',[40,-74],[55,-74]],
 ['aratro',[-91,-80],[-72,-81]],['pecore',[-93,-63],[-88,-55]]
];
function chooseRoute(g,a,b,index){
 const trials=[[a,b],...[3,6,9,12].map(n=>[[a[0],a[1]+(index%2?-n:n)],[b[0],b[1]+(index%2?-n:n)]])];
 for(const [p,q] of trials)if(segment(g,p,q,kindRadius(index)))return [p,q];
 // Search nearby parallel lanes, but never invent a straight line across an obstacle.
 for(let v=-78;v<=32;v+=11)for(const u of [-110,-91,-73,-55,51,70,90,108]){
  const p=[u,v],q=[u+(index%2?-11:11),v+(index%3-1)*5];
  if(segment(g,p,q,.65))return [p,q];
 }return null;
}
const kindRadius=index=>PLANS[index][0]==='cavalli'?1.25:.68;
function start(g){const root=new THREE.Group();root.name='Mandria v9 · lavoro quotidiano e animali accompagnati';g.villaV3.root.add(root);
 const actors=[];for(const [i,[kind,a,b]] of PLANS.entries()){
  const route=chooseRoute(g,a,b,i);if(!route)continue;
  const model=workerModel(kind,i),p=at(...route[0]);model.root.position.set(p.x,g.terrain.height(p.x,p.z),p.z);
  root.add(model.root);actors.push({...model,kind,route,position:0,target:1,phase:'travel',pause:0,index:i,cycle:0,speed:kind==='gioco'?1.75:kind==='gruppo'?1.15:kind==='cavalli'?.72:.88+(i%3)*.1,lastBow:-60});
 }
 const report={workers:actors.length,routines:[...new Set(actors.map(a=>a.kind))],completed:0,apeDistributed:0,apeCircuitLength:0,deliveryNotices:0};
 return {life:g.villaLife,root,actors,report,appliedPatrols:false,delivery:null};
}
function routeLength(route){return route.slice(1).reduce((sum,p,i)=>sum+dist(p,route[i]),0);}
function patrols(g,s){if(s.appliedPatrols||!g.villaV8PatrolReport?.complete)return;
 const apes=(g.villaV3.patrols||[]).filter(c=>c.mandriaPatrol==='ape'&&c.route?.length>30),first=apes[0]?.route;
 if(!first)return;
 // Every Ape covers the entire approved 900 m-ish estate circuit, not a tiny
 // independent oval; stagger starts over the whole loop to avoid rear congestion.
 const base=first.slice(0,-1),N=base.length;
 for(const [i,c] of apes.entries()){
  if(c===g.state.car)continue;
  const shift=Math.floor(i*N/apes.length),points=[...base.slice(shift),...base.slice(0,shift)],route=[...points,[...points[0]]],p=at(...route[0]);
  Object.assign(c,{route,routeIndex:1,x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),speed:0,patrolSlot:0,estateAuthorized:true});g.pose(c);
 }
 s.appliedPatrols=true;s.report.apeDistributed=apes.length;s.report.apeCircuitLength=Math.round(routeLength(first));
}
function workers(g,s,dt){const t=g.state.elapsed,player=g.state;
 for(const actor of s.actors){const m=actor.root,d=Math.hypot(player.x-m.position.x,player.z-m.position.z);
  m.visible=d<215;if(!m.visible)continue;
  if(d<4.5&&player.mode==='foot'&&!player.paused&&t-actor.lastBow>22){actor.lastBow=t;actor.bowUntil=t+1.1;}
  if(t<(actor.bowUntil||0)){
   m.rotation.x=-.18;actor.arms.forEach((a,i)=>a.rotation.x=-.18+i*.09);continue;
  }m.rotation.x=0;
  const target=at(...actor.route[actor.target]),dx=target.x-m.position.x,dz=target.z-m.position.z,length=Math.hypot(dx,dz);
  if(actor.phase==='work'){
   if(t>=actor.pause){actor.phase='travel';actor.target=1-actor.target;actor.cycle++;s.report.completed++;}
  }else if(length<.35){
   actor.phase='work';actor.pause=t+2+(actor.index%4)*.65;
  }else{
   const step=Math.min(length,actor.speed*Math.min(dt,.07)),x=m.position.x+dx/length*step,z=m.position.z+dz/length*step,p=areaLocal(VILLA,x,z);
   if(secure(g,p.u,p.v,kindRadius(actor.index))){m.position.set(x,g.terrain.height(x,z),z);m.rotation.y=Math.atan2(dx,dz);}
   else{actor.phase='work';actor.pause=t+3;}
  }
  const walking=actor.phase==='travel',wave=walking?Math.sin(t*7+actor.index):Math.sin(t*2.5+actor.index);
  actor.legs[0].rotation.x=walking?wave*.31:0;actor.legs[1].rotation.x=walking?-wave*.31:0;
  actor.arms[0].rotation.x=walking?-wave*.24:-.27+wave*.35;
  actor.arms[1].rotation.x=walking?wave*.24:.25-wave*.4;
  if(actor.kind==='raccolta'&&actor.phase==='work')actor.arms[1].rotation.x=-1.2+Math.sin(t*4)*.35;
  if(actor.kind==='aratro'&&actor.phase==='work')actor.arms[0].rotation.x=-.8+wave*.28;
  if(actor.kind==='cavalli')for(const [i,leg] of actor.root.userData.horseLegs.entries())leg.rotation.x=walking?Math.sin(t*5+i*2.1)*.22:0;
 }
}
function animals(g,dt){const t=g.state.elapsed;
 for(const [farm,patch] of (g.villaLife?.pastures||[]).entries()){
  const centre={u:patch.worker.u+10,v:patch.worker.v-10};
  for(const [i,animal] of patch.animals.entries()){
   const m=animal.a,pos=m.position;
   if(!animal.v9){animal.v9={phase:'walk',target:null,until:0,speed:.37+i*.06+(farm%2)*.04,turn:0,step:0};}
   const state=animal.v9;
   if(state.phase==='graze'){
    for(const [j,leg] of m.children.slice(2,6).entries())leg.rotation.x=Math.sin(t*.7+j)*.035;
    if(t<state.until)continue;state.phase='walk';state.target=null;
   }
   if(!state.target){
    const local=areaLocal(VILLA,pos.x,pos.z),seed=(++state.step)*2.39996+i*1.37+farm*.7;
    const desired=[centre.u+Math.sin(seed)*9.2,centre.v+Math.cos(seed*1.31)*10.6];
    const from=[local.u,local.v];
    // Keep a herd tendency without stacking every animal in the same place.
    const options=[desired,[centre.u+Math.sin(seed+1.2)*7,centre.v+Math.cos(seed+.5)*8],[centre.u+Math.sin(seed+2.5)*5.2,centre.v+Math.cos(seed+2.5)*6.5]];
    state.target=options.find(p=>segment(g,from,p,.48))||null;
    if(!state.target){state.phase='graze';state.until=t+2;continue;}
   }
   const goal=at(...state.target),dx=goal.x-pos.x,dz=goal.z-pos.z,d=Math.hypot(dx,dz);
   if(d<.24){state.phase='graze';state.until=t+1.5+((i+farm+state.step)%5)*.7;state.target=null;continue;}
   const step=Math.min(d,state.speed*Math.min(dt,.07)),nx=pos.x+dx/d*step,nz=pos.z+dz/d*step,local=areaLocal(VILLA,nx,nz);
   if(Math.abs(local.u-centre.u)>11.1||Math.abs(local.v-centre.v)>12.2||!secure(g,local.u,local.v,.46)){state.target=null;continue;}
   pos.set(nx,g.terrain.height(nx,nz),nz);
   const desired=Math.atan2(dx,dz),change=Math.atan2(Math.sin(desired-m.rotation.y),Math.cos(desired-m.rotation.y));
   m.rotation.y+=Math.max(-dt*1.6,Math.min(dt*1.6,change));
   for(const [j,leg] of m.children.slice(2,6).entries())leg.rotation.x=Math.sin(t*4.1+j*Math.PI*.7)*.12;
   if(animal.walkPosition)animal.walkPosition.copy(pos); // v7 legacy path must not snap it back.
  }
 }
}
function setupDeliveryUi(){let el=document.getElementById('mandriaV9DeliveryNotice');if(el)return el;
 const css=document.createElement('style');css.textContent=`#mandriaV9DeliveryNotice:not([hidden]){position:fixed;z-index:79;top:10%;right:2%;width:min(380px,92vw);padding:14px 17px;border:2px solid #dcbf80;border-radius:13px;background:linear-gradient(130deg,#152d31f5,#32433bf5);color:#fff3db;box-shadow:0 10px 32px #0008;font:600 14px/1.5 system-ui;cursor:pointer;text-align:left}#mandriaV9DeliveryNotice strong{display:block;font-size:16px;color:#ffe0a2}#mandriaV9DeliveryNotice small{display:block;margin-top:4px;color:#e9dbc0;font-size:12px}@media(max-width:600px){#mandriaV9DeliveryNotice:not([hidden]){top:8%;right:3%;width:94vw;font-size:12px}}`;document.head.appendChild(css);
 el=document.createElement('button');el.type='button';el.id='mandriaV9DeliveryNotice';el.hidden=true;document.body.appendChild(el);return el;
}
function decorateTruck(d){const root=d.truck?.mesh;if(!root||root.userData.mandriaV9Decor)return;
 root.userData.mandriaV9Decor=true;
 const load=new THREE.Group();load.name='Mandria · camion rifornimento · casse e segnalatori';
 for(let i=0;i<3;i++)cube(load,'#9e754b',(i-1)*.65,1.7,-.85,.55,.55,.65);
 for(const side of [-1,1])cube(load,'#e3ac43',side*.85,2.62,.38,.26,.16,.35);
 root.add(load);d.v9Load=load;
}
function delivery(g,s){const manager=g.villaV8Delivery,notice=setupDeliveryUi();
 if(!manager){notice.hidden=true;return;}
 if(!s.delivery){s.delivery={active:null,phase:null,initialized:true};if(!manager.active)manager.nextAt=Math.min(manager.nextAt,g.state.elapsed+27);}
 const current=manager.active,prior=s.delivery.active;
 if(prior&&!current){manager.nextAt=Math.min(manager.nextAt,g.state.elapsed+155);s.delivery.phase=null;notice.hidden=true;}
 if(current&&!prior){decorateTruck(current);s.report.deliveryNotices++;g.toast?.('Forniture in arrivo alla Villa della Mandria: un camion si avvicina al cancello.',4);}
 if(current){
  decorateTruck(current);
  if(current.phase!==s.delivery.phase&&current.phase==='permission'){
   s.report.deliveryNotices++;g.toast?.('Il camion è pronto per scaricare la merce in villa. Quando sei pronto, torna per validarne la consegna.',7);
  }
  const texts={enter:['FORNITURE IN ARRIVO','Il camion sta entrando nella tenuta.'],permission:['CAMION PRONTO PER LO SCARICO','Quando sei pronto, torna alla villa per validarne la consegna.'],unload:['SCARICO AUTORIZZATO','Il personale sta trasferendo le casse nel deposito.'],exit:['CONSEGNA CONCLUSA','Il camion sta lasciando la proprietà.']};
  const [header,body]=texts[current.phase]||texts.enter;
  notice.innerHTML='<strong>'+header+'</strong>'+body+'<small>'+(current.phase==='permission'?'Avvicinati all’autista e premi E per autorizzare o rinviare.':'La consegna prosegue senza interrompere il gioco.')+'</small>';
  notice.hidden=false;
  notice.onclick=()=>{if(current.phase!=='permission')return;
   const p=current.driver.obj.position,near=g.state.mode==='foot'&&Math.hypot(g.state.x-p.x,g.state.z-p.z)<4.2;
   if(near)document.getElementById('mandriaDeliveryPrompt')?.click();
   else g.toast?.('Il camion ti aspetta alla zona di servizio della villa. Raggiungi l’autista per autorizzare.',4);
  };
  s.delivery.phase=current.phase;
 }else notice.hidden=true;
 s.delivery.active=current;
}
export function mandriaV9Update(g,dt){if(!g.state?.started||!g.villaV7Life||!g.villaV3||!Number.isFinite(dt)||dt<=0)return;
 if(Math.hypot(g.state.x-VILLA.x,g.state.z-VILLA.z)>360){if(g.villaV9?.delivery)delivery(g,g.villaV9);return;}
 if(g.villaV9?.life!==g.villaLife){g.villaV9?.root?.parent?.remove(g.villaV9.root);g.villaV9=start(g);}
 const s=g.villaV9;patrols(g,s);workers(g,s,dt);animals(g,dt);delivery(g,s);
}
