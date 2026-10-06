import * as THREE from './vendor/three.module.js';
import {dist,angleDiff,clamp,nearestRoad} from './core.js';
import {vehicleBlocked} from './movement.js';
import {groundVehicleStep,resetGroundMotion} from './vehicle-dynamics.js';
import {updateWheelie} from './stunt-traffic.js';
import {VEHICLES} from './vehicles.js';
import {CLUB_TRIALS,readClubProgress,recordClubTrial} from './biker-club-progress.js';

const validBike=c=>!!c?.spec.bike&&!['bicycle','electric_scooter'].includes(c.style);
export function clubCoordinates(course,p){const dx=p.x-course.start.x,dz=p.z-course.start.z;return {along:dx*Math.sin(course.yaw)+dz*Math.cos(course.yaw),side:dx*Math.cos(course.yaw)-dz*Math.sin(course.yaw)};}
export function clubPoint(course,along,side=0){return {x:course.start.x+Math.sin(course.yaw)*along+Math.cos(course.yaw)*side,z:course.start.z+Math.cos(course.yaw)*along-Math.sin(course.yaw)*side,yaw:course.yaw};}
// Select a real connected, dry urban street. Never invent a road or put the
// training course on a motorway, crossing, private drive, bridge or tunnel.
export function findClubCourse({graph,terrain,collision}){
 const candidates=graph.segments.filter(s=>s.connected&&s.road.w>=8&&!s.road.one&&!s.road.oneway&&!s.road.b&&!s.road.tunnel&&!s.road.crossing&&!['no','private'].includes(s.road.access)&&/^(residential|tertiary|secondary|unclassified)$/.test(s.road.k)&&dist(graph.nodes[s.a],graph.nodes[s.b])>=420)
 .sort((a,b)=>Number(b.road.n==='Via Austria')-Number(a.road.n==='Via Austria'));
 for(const s of candidates){const a=graph.nodes[s.a],b=graph.nodes[s.b];if(Math.abs(a.x)>5900||Math.abs(a.z)>6000||Math.abs(b.x)>5900||Math.abs(b.z)>6000)continue;
  const yaw=Math.atan2(b.x-a.x,b.z-a.z),start={x:a.x+Math.sin(yaw)*40-Math.cos(yaw)*s.road.w/4,z:a.z+Math.cos(yaw)*40+Math.sin(yaw)*s.road.w/4},course={start,yaw,length:360,road:s.road,segment:s,name:s.road.n||'Raduno motociclisti'};
  const y=terrain.height(start.x,start.z);let safe=true;
  for(let n=-10;n<=375&&safe;n+=4)for(const side of [-1.15,0,1.15]){const p=clubPoint(course,n,side),h=terrain.height(p.x,p.z);if(Math.abs(h-y)>.3||!terrain.dry(p.x,p.z,.65,h)||vehicleBlocked(p.x,p.z,yaw,collision,VEHICLES.enduro,h)){safe=false;break;}}
  if(safe)return course;
 }return null;
}
function line(root,p,y,width,color){const m=new THREE.Mesh(new THREE.BoxGeometry(width,.035,.25),new THREE.MeshBasicMaterial({color}));m.position.set(p.x,y+.045,p.z);m.rotation.y=p.yaw;root.add(m);}
export function buildClubRamp(course,along,terrain){
 const p=clubPoint(course,along),back=clubPoint(course,along-5),front=clubPoint(course,along+5),y0=terrain.height(back.x,back.z),y1=terrain.height(front.x,front.z)+1.65;
 return {...p,kind:'arcade-ramp',bikerClub:true,width:2.25,length:10,along,topY:[y0,y0,y1,y1]};
}
function rampVisual(root,r){
 const p=[],half=r.width/2;
 for(const [u,v,y] of [[-half,-5,r.topY[0]],[half,-5,r.topY[1]],[half,5,r.topY[2]],[-half,5,r.topY[3]]])p.push(r.x+Math.cos(r.yaw)*u+Math.sin(r.yaw)*v,y,r.z-Math.sin(r.yaw)*u+Math.cos(r.yaw)*v);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex([0,2,1,0,3,2]);g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#35afb7',roughness:.8,side:THREE.DoubleSide}));m.name='club-ramp-surface';root.add(m);
 for(const u of [-half+.13,half-.13]){const mark=new THREE.Mesh(new THREE.BoxGeometry(.1,.025,Math.hypot(10,r.topY[2]-r.topY[0])),new THREE.MeshBasicMaterial({color:'#faf0ab'}));mark.position.set(r.x+Math.cos(r.yaw)*u,(r.topY[0]+r.topY[2])/2+.025,r.z-Math.sin(r.yaw)*u);mark.rotation.set(-Math.atan2(r.topY[2]-r.topY[0],10),r.yaw,0,'YXZ');root.add(mark);}
}

export class BikerClub{
 constructor(env){Object.assign(this,env);this.storage=env.storage;this.progress=readClubProgress(this.storage);this.crew=[];this.course=null;this.run=null;this.root=null;this.ramps=[];this.roam=null;}
 ensureCourse(){if(!this.course)this.course=findClubCourse(this);return this.course;}
 unlocked(){return CLUB_TRIALS.filter(t=>this.progress.completed.includes(t.id)).map(t=>t.reward);}
 menu(){
  const c=this.ensureCourse();if(!c){this.toast('Percorso moto non disponibile su questa mappa.',4);return;}
  this.progress=readClubProgress(this.storage);const done=this.progress.completed.length,active=this.run;
  this.showMenu('La banda delle impennate',`<p class="about-copy">Raduno in ${c.name} · ${Math.round(dist(this.state,c.start))} m. Tre prove con la tua moto, tre livree premio. Tieni <kbd>B</kbd> per impennare. Le prove partono soltanto al raduno, da fermo.</p><div class="activities">${CLUB_TRIALS.map(t=>`<button class="activity" data-biker-trial="${t.id}"><span><b>${t.name}</b><small>${t.desc}<br>${this.progress.completed.includes(t.id)?'✓ Moto premio sbloccata · record '+(this.progress.best[t.id]?.toFixed(1)||'—')+' s':'Premio: '+VEHICLES[t.reward].name+' · €'+t.cash}</small></span></button>`).join('')}</div><p class="about-copy">${done}/3 prove superate · ${done===3?'Gruppo disponibile per accompagnarti in giro.':'Supera tutte le prove per richiamare il gruppo.'}</p><div class="menu-actions"><button id="clubBike">Richiedi una Prato 800</button><button id="clubRide" ${done<3?'disabled':''}>${this.roam?'Congeda il gruppo':'Richiama il gruppo'}</button>${active?'<button id="clubCancel">Annulla prova</button>':''}</div>`);
  document.querySelectorAll('[data-biker-trial]').forEach(b=>b.onclick=()=>this.accept(b.dataset.bikerTrial));document.getElementById('clubBike').onclick=()=>this.deliver('naked');document.getElementById('clubRide').onclick=()=>{this.closeDialogs();if(this.roam){this.dismiss();this.toast('Gruppo congedato.');}else this.callCrew();};const cancel=document.getElementById('clubCancel');if(cancel)cancel.onclick=()=>{this.cancelMission();this.closeDialogs();};
 }
 accept(id){
  this.progress=readClubProgress(this.storage);const trial=CLUB_TRIALS.find(t=>t.id===id),course=this.ensureCourse();if(!trial||!course)return false;
  this.cancelMission(false);this.dismiss();this.state.waypoint=null;
  const m={type:'bikerclub',phase:'travel',title:trial.name,target:{...course.start,name:'Raduno · '+course.name},deadline:Infinity,desc:'Raggiungi il raduno in moto. Fermati nel gate e allineati alla corsia. Premi B per impennare.'};
  this.run={trial,mission:m,car:null,score:0,lastAlong:0,jumpIndex:0,flight:null,health:0,startedAt:0};this.state.mission=m;this.routeTo(m.target);this.closeDialogs();this.toast('Prova accettata · raggiungi il gruppo in '+course.name+'.',5);return true;
 }
 clearVisuals(){if(this.root){this.scene.remove(this.root);this.root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});this.root=null;}this.terrain.arcadeRamps=(this.terrain.arcadeRamps||[]).filter(r=>!r.bikerClub);this.ramps=[];}
 retireCrew(){for(const c of this.crew){if(c===this.state.car){c.missionUnit=false;c.bikerClubUnit=false;c.name=c.spec.name;continue;}this.remove(c);}this.crew=[];}
 cancel(){this.clearVisuals();this.retireCrew();this.run=null;this.roam=null;}
 dismiss(){this.roam=null;this.retireCrew();}
 fail(message){this.cancelMission(false);this.toast(message+' · riprova da J → La banda delle impennate.',5);}
 clearAt(p,spec,ignore=null){const y=this.terrain.height(p.x,p.z);return this.terrain.dry(p.x,p.z,spec.width/2,y)&&!vehicleBlocked(p.x,p.z,p.yaw,this.collision,spec,y)&&!this.cars.some(c=>c!==ignore&&!this.crew.includes(c)&&c.mesh.visible&&Math.abs((c.y||0)-y)<3&&dist(c,p)<(spec.length+c.spec.length)/2+2);}
 spawnCrew(points){
  if(this.crew.length===3&&points.every((p,i)=>dist(p,this.crew[i])<.5&&this.crew[i].health>0))return true;
  if(!points.every((p,i)=>this.clearAt(p,VEHICLES[['naked','enduro','supersport'][i]])))return false;
  this.retireCrew();this.crew=points.map((p,i)=>{const c=this.addCar(p.x,p.z,p.yaw,false,false,['naked','enduro','supersport'][i]);Object.assign(c,{missionUnit:true,bikerClubUnit:true,name:['Capogruppo · Banda delle impennate','Banda · Enduro','Banda · Saetta'][i]});resetGroundMotion(c);return c;});return true;
 }
 drawCourse(id){this.clearVisuals();const root=this.root=new THREE.Group();root.name='biker-club-trial';this.scene.add(root);const c=this.course;
  for(const [n,color] of [[0,'#e7b943'],[360,'#e7b943'],...(id==='wheelie'?[[90,'#35d6bf'],[180,'#35d6bf']]:[])]){const p=clubPoint(c,n);line(root,p,this.terrain.height(p.x,p.z),2.4,color);}
  if(id==='wheelie')for(let n=90;n<=180;n+=10)for(const side of [-1.2,1.2]){const p=clubPoint(c,n,side);line(root,p,this.terrain.height(p.x,p.z),.24,'#35d6bf');}
  if(id==='jumps'){this.ramps=[120,260].map(n=>buildClubRamp(c,n,this.terrain));this.terrain.arcadeRamps=[...(this.terrain.arcadeRamps||[]),...this.ramps];this.ramps.forEach(r=>rampVisual(root,r));}
 }
 start(){const r=this.run,s=this.state,p=clubCoordinates(this.course,s);if(!r||!validBike(s.car)||Math.abs(p.along)>6||Math.abs(p.side)>1.25||Math.abs(angleDiff(s.yaw,this.course.yaw))>.4||Math.abs(s.speed)>2.5)return false;
  const points=[16,52,88].map(n=>clubPoint(this.course,n));if(!this.spawnCrew(points)){this.toast('La corsia del raduno è occupata: attendi che sia libera.',2);return false;}
  Object.assign(r,{car:s.car,health:s.health,lastAlong:p.along,startedAt:s.elapsed});Object.assign(r.mission,{phase:'countdown',deadline:Infinity,desc:'Partenza fra 3 secondi · resta fermo e segui il capogruppo.'});r.goAt=s.elapsed+3;this.state.route=[{x:s.x,z:s.z},...Array.from({length:18},(_,i)=>clubPoint(this.course,(i+1)*20))];this.drawCourse(r.trial.id);return true;
 }
 drive(c,target,speed,dt,held=false){
  const yaw=Math.atan2(target.x-c.x,target.z-c.z),error=angleDiff(yaw,c.yaw),turn=clamp(error*1.4,-1,1);let desired=speed*Math.max(.15,1-Math.abs(error)/1.3);
  for(const other of [this.state,...this.cars]){if(other===c||other===this.state.car||!other.spec&&other!==this.state||other.mesh?.visible===false||Math.abs((other.y||0)-(c.y||0))>3)continue;const spec=other.spec||this.state.car?.spec||{length:1,width:.6},buffer=(c.spec.length+spec.length)/2+1.8,dx=other.x-c.x,dz=other.z-c.z,ahead=dx*Math.sin(c.yaw)+dz*Math.cos(c.yaw),side=dx*Math.cos(c.yaw)-dz*Math.sin(c.yaw);if(ahead>0&&ahead<buffer+Math.max(7,c.speed*1.3)&&Math.abs(side)<(c.spec.width+spec.width)/2+.45)desired=Math.min(desired,Math.max(0,(ahead-buffer)*.8));}
  c.speed+=clamp(desired-c.speed,-c.spec.brake*.65*dt,c.spec.accel*.6*dt);const motion=groundVehicleStep(c,c,{turn,handbrake:false},dt,this.terrain,this.collision);if(motion.hitSpeed>4)c.health=Math.max(0,c.health-motion.hitSpeed*.4);updateWheelie(c,held,dt);this.pose(c);
 }
 observeMotion(motion){
  const r=this.run;if(!r||r.trial.id!=='jumps'||r.mission.phase!=='running'||this.state.car!==r.car)return;const p=clubCoordinates(this.course,this.state),ramp=this.ramps[r.jumpIndex];
  if(motion.hitSpeed>3)r.invalidLanding=true;
  if(motion.launched&&ramp&&Math.abs(p.along-(ramp.along+5))<3&&Math.abs(p.side)<.95&&Math.abs(angleDiff(this.state.yaw,this.course.yaw))<.25&&this.state.speed>=9&&this.state.speed<=27)r.flight={index:r.jumpIndex,takeoff:p.along};
  if(motion.landed&&r.flight){if(!r.invalidLanding&&motion.landingSpeed<12&&Math.abs(p.side)<1.05&&p.along>r.flight.takeoff+2&&p.along<r.flight.takeoff+45){r.jumpIndex++;this.toast('Atterraggio pulito · '+r.jumpIndex+'/2',2);}else r.badJump=true;r.flight=null;}
 }
 complete(){const r=this.run,elapsed=this.state.elapsed-r.startedAt,result=recordClubTrial(r.trial.id,elapsed,this.storage),trial=r.trial;this.progress=result.progress;this.cancel();this.finishMission(result.first?trial.cash:0,result.first?'Prova superata · sbloccata '+VEHICLES[trial.reward].name:'Prova superata · record '+result.progress.best[trial.id].toFixed(1)+' s');if(!result.saved)this.toast('Prova superata, ma il browser non consente di salvare i progressi.',6);}
 update(dt){
  if(this.roam)this.updateRoam(dt);const r=this.run;if(!r)return;if(this.state.mission!==r.mission){this.cancel();return;}
  const s=this.state,c=this.ensureCourse(),p=clubCoordinates(c,s),m=r.mission;
  if(m.phase==='travel'){if(!this.crew.length&&dist(s,c.start)<180)this.spawnCrew([16,52,88].map(n=>clubPoint(c,n)));if(!this.root&&dist(s,c.start)<400)this.drawCourse(r.trial.id==='jumps'?'formation':r.trial.id);this.start();return;}
  if(s.mode!=='car'||s.car!==r.car||s.health<=0||s.health<r.health-2||this.recovering?.()){this.fail('Prova interrotta: resta sulla moto ed evita gli incidenti');return;}
  if(m.phase==='countdown'){m.desc='Partenza fra '+Math.max(1,Math.ceil(r.goAt-s.elapsed))+' secondi · resta fermo.';if(dist(s,c.start)>7||Math.abs(s.speed)>3){this.fail('Partenza anticipata');return;}if(s.elapsed<r.goAt)return;m.phase='running';r.startedAt=s.elapsed;m.deadline=s.elapsed+80;this.toast('VIA · '+r.trial.desc,5);}
  if(s.elapsed>m.deadline||Math.abs(p.side)>c.road.w/4-.4||p.along<-8||p.along>375){this.fail('Tempo scaduto o uscita dalla corsia');return;}
  for(const bike of this.crew){const q=clubCoordinates(c,bike),target=clubPoint(c,Math.min(355,q.along+12));this.drive(bike,target,q.along>=350?0:r.trial.id==='formation'?12:r.trial.id==='jumps'?24:17,dt,r.trial.id==='wheelie'&&q.along>=90&&q.along<=180);}
  if(this.crew.some(b=>b.health<=0)){this.fail('Gruppo coinvolto in un incidente');return;}
  const delta=p.along-r.lastAlong;r.lastAlong=p.along;
  if(r.trial.id==='formation'){const lead=this.crew[0],gap=clubCoordinates(c,lead).along-p.along,valid=gap>=8&&gap<=24&&Math.abs(angleDiff(s.yaw,c.yaw))<.4&&Math.abs(p.side)<1.15&&s.speed>=7&&s.speed<=18&&!r.car.jump?.airborne;r.score=valid?r.score+dt:Math.max(0,r.score-dt*.6);m.desc='Formazione '+Math.min(18,r.score).toFixed(1)+'/18 s · distanza '+Math.round(gap)+' m (8–24) · segui a circa 43 km/h.';m.target={...lead,name:'Segui il capogruppo'};if(r.score>=18)this.complete();else if(p.along>340)this.fail('Formazione incompleta');}
  if(r.trial.id==='wheelie'){const valid=p.along>=90&&p.along<=180&&Math.abs(angleDiff(s.yaw,c.yaw))<.25&&Math.abs(p.side)<=1.05&&s.speed>=8&&s.speed<=24&&r.car.wheelie>.28&&!r.car.jump?.airborne&&this.keys.has('KeyB');r.score=valid?r.score+Math.max(0,Math.min(delta,24*dt+.05)):0;m.desc='Zona impennata: 90–180 m · tieni B · '+Math.min(20,r.score).toFixed(1)+'/20 m consecutivi · 30–85 km/h.';m.target={...clubPoint(c,p.along<90?90:180),name:'Zona impennata'};if(r.score>=20)this.complete();else if(p.along>185)this.fail('Impennata incompleta');}
  if(r.trial.id==='jumps'){m.desc='Salti '+r.jumpIndex+'/2 · centra le rampe a 35–90 km/h e atterra diritto. B non serve in volo.';m.target={...clubPoint(c,this.ramps[Math.min(r.jumpIndex,1)].along-5),name:'Rampa '+Math.min(r.jumpIndex+1,2)};if(r.jumpIndex===2)this.complete();else if(r.badJump||p.along>this.ramps[r.jumpIndex].along+52)this.fail('Salto mancato o atterraggio fuori corsia');}
 }
 callCrew(){
  this.progress=readClubProgress(this.storage);if(this.progress.completed.length!==3){this.toast('Supera le tre prove per richiamare il gruppo.');return false;}if(this.run||this.state.mission){this.toast('Termina prima l’attività in corso.');return false;}const s=this.state;if(s.mode!=='car'||!validBike(s.car)){this.toast('Sali su una moto per richiamare il gruppo.');return false;}
  if(this.roam)return true;const road=this.roadAt?.(s)||nearestRoad(s,this.graph,false,{maxRadius:12,fallback:false});const source=road?.segment?.road||road?.road;if(!road||road.d>8||!source||source.w<6||/^(footway|path|steps|tram|cycleway|pedestrian)$/.test(source.k)||['no','private'].includes(source.access)){this.toast('Richiama il gruppo su una strada libera larga almeno 6 m.');return false;}
  let yaw=road.yaw;if(!source.one&&!source.oneway&&Math.abs(angleDiff(yaw+Math.PI,s.yaw))<Math.abs(angleDiff(yaw,s.yaw)))yaw+=Math.PI;if(Math.abs(angleDiff(yaw,s.yaw))>.4||Math.abs(s.speed)>2.5){this.toast('Fermati e allineati alla corsia per far arrivare il gruppo.');return false;}
  const points=[8,16,24].map(n=>({x:s.x-Math.sin(yaw)*n,z:s.z-Math.cos(yaw)*n,yaw}));
  if(!points.every(p=>{const r=this.roadAt?.(p)||nearestRoad(p,this.graph,false,{maxRadius:7,fallback:false});return r&&(r.d??0)<=source.w/2-.6;})||!this.spawnCrew(points)){this.toast('Non c’è spazio dietro di te: scegli un tratto libero.');return false;}
  const history=[];for(let n=30;n>=0;n-=2)history.push({x:s.x-Math.sin(yaw)*n,z:s.z-Math.cos(yaw)*n,s:30-n});this.roam={car:s.car,history,total:30,lost:0};this.crew.forEach(c=>c.clubHint=0);this.toast('La banda ti segue · J → La banda delle impennate per congedarla.',5);return true;
 }
 updateRoam(dt){const r=this.roam,s=this.state;if(s.mode!=='car'||s.car!==r.car||s.health<=0||s.mission||this.recovering?.()){this.dismiss();return;}
  const last=r.history.at(-1),d=dist(s,last);if(d>12){this.dismiss();this.toast('Gruppo congedato dopo il trasferimento.');return;}if(d>=2){r.total+=d;r.history.push({x:s.x,z:s.z,s:r.total});}
  for(let i=0;i<this.crew.length;i++){const bike=this.crew[i],limit=r.total-8*(i+1);let hint=clamp(bike.clubHint||0,0,r.history.length-1),best=Infinity;for(let n=Math.max(0,hint-6);n<Math.min(r.history.length,hint+25);n++){const q=dist(bike,r.history[n]);if(q<best){best=q;hint=n;}}bike.clubHint=hint;let ahead=hint;while(ahead<r.history.length-1&&r.history[ahead].s<Math.min(limit,r.history[hint].s+Math.max(5,bike.speed*.7)))ahead++;const target=r.history[ahead],gap=limit-r.history[hint].s,desired=gap<1?0:Math.min(26,Math.max(4,s.speed+gap*.3));this.drive(bike,target,desired,dt,gap>2&&gap<18&&Math.abs(bike.steerInput||0)<.15&&s.elapsed%16>6&&s.elapsed%16<9);}
  // Keep a bounded trail without warping any visible rider back to the player.
  const minHint=Math.min(...this.crew.map(c=>c.clubHint));if(minHint>50){r.history.splice(0,minHint-6);this.crew.forEach(c=>c.clubHint-=minHint-6);}
  r.lost=this.crew.some(c=>dist(c,s)>180||c.health<=0)?r.lost+dt:0;if(r.lost>8||r.history.length>1000){this.dismiss();this.toast('Il gruppo è rimasto indietro. Puoi richiamarlo da fermo.',4);}
 }
}
