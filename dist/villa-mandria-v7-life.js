// Follow-up gameplay polish scoped to the private fictional Mandria estate.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
import {vehicleBlocked} from './movement.js';
import {resetGroundMotion} from './vehicle-dynamics.js';
const point=(u,v)=>areaPoint(VILLA,u,v),near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),messages=[
 'Patrón, turno de tarde listo.','El portón está cerrado, jefe.','La scuderia è tranquilla, capo.',
 'Sin novedades, comandante.','Le ronde hanno cambiato percorso.','Aquí nadie se duerme, patrón.',
 'La fattoria è sotto controllo.','¿Todo bien por la villa, jefe?','Ricevuto, capo: occhi aperti.',
 'El equipo está en posición.'];
let workerBadge=null,dialogInstalled=false;
function badgeTexture(){if(workerBadge)return workerBadge;const c=document.createElement('canvas');c.width=128;c.height=128;const p=c.getContext('2d');
 p.fillStyle='#f9e4ac';p.strokeStyle='#493928';p.lineWidth=7;p.beginPath();p.roundRect(18,7,92,93,24);p.fill();p.stroke();
 p.beginPath();p.moveTo(42,98);p.lineTo(54,119);p.lineTo(68,98);p.fill();p.stroke();
 p.textAlign='center';p.textBaseline='middle';p.font='bold 70px Arial';p.fillStyle='#203b3d';p.fillText('!',64,52);
 workerBadge=new THREE.CanvasTexture(c);workerBadge.colorSpace=THREE.SRGBColorSpace;return workerBadge;}
function speech(text){const c=document.createElement('canvas');c.width=640;c.height=150;const p=c.getContext('2d');p.fillStyle='#fff0cb';p.strokeStyle='#8b6639';p.lineWidth=6;p.beginPath();p.roundRect(7,7,626,136,18);p.fill();p.stroke();
 p.fillStyle='#203335';p.textAlign='center';p.textBaseline='middle';let n=37;while(n>20){p.font=`bold ${n}px Arial`;if(p.measureText(text).width<595)break;n-=2;}p.fillText(text,320,72);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const phrases=messages.map(speech);
function conversationWorker(g){if(!g?.state?.started||g.state.mode!=='foot')return null;let closest=null,d=4.2;
 for(const p of g.villaLife?.people||[]){if(p.role!=='worker'||!p.obj?.visible)continue;const distance=near(p.obj.position,g.state);if(distance<d){closest=p;d=distance;}}return closest;}
function dialogue(g){const d=document.getElementById('mandriaWorkerDialog');if(!d||dialogInstalled)return;dialogInstalled=true;
 const show=d.showModal.bind(d);d.showModal=function(...args){const p=conversationWorker(g);if(p&&g.state.elapsed<(p.v7NextTalkAt||0)){
  g.toast?.('Il contadino è occupato. Potrai riparlargli tra '+Math.ceil(p.v7NextTalkAt-g.state.elapsed)+' secondi.',2.1);return;
 }d.v7Worker=p;return show(...args);};
 d.addEventListener('close',()=>{const p=d.v7Worker;if(p&&!d.querySelector('#mwReply')?.hidden)p.v7NextTalkAt=g.state.elapsed+75;d.v7Worker=null;});
}
function workers(g){const range=near(g.state,VILLA),dialogOpen=!!document.querySelector('#mandriaWorkerDialog[open]');
 for(const [i,p] of (g.villaLife?.people||[]).filter(p=>p.role==='worker').entries()){
  if(!p.v7Marker){const marker=new THREE.Sprite(new THREE.SpriteMaterial({map:badgeTexture(),transparent:true,depthTest:false,depthWrite:false}));
   marker.name='Mandria · contadino · richiesta disponibile';marker.position.set(0,2.8,0);marker.scale.set(1.35,1.35,1);p.obj.add(marker);p.v7Marker=marker;}
  p.v7Marker.visible=range<120&&p.obj.visible&&!dialogOpen&&g.state.elapsed>=(p.v7NextTalkAt||0);
  if(p.v6Worker)continue;const t=g.state.elapsed+i*1.17,picking=i%3===0,watering=i%3===1;
  p.left.rotation.x=Math.sin(t*(picking?3.1:watering?1.7:2.3))*(picking?.66:.37);
  p.right.rotation.x=-Math.sin(t*(watering?2.2:3.1))*(watering?.5:.42);
  if(g.state.elapsed>=p.until)p.obj.rotation.x=(picking?-.15:watering?.08:-.09)+Math.sin(t*1.2)*.06;
 }
 const prompt=document.getElementById('mandriaWorkerPrompt'),p=conversationWorker(g);
 if(prompt&&p&&g.state.elapsed<(p.v7NextTalkAt||0))prompt.hidden=true;
}
function guards(g){const t=g.state.elapsed;for(const [i,p] of (g.villaLife?.people||[]).filter(p=>['gate','bodyguard'].includes(p.role)).entries()){
  if(!p.speech||p.helloAt<0||p.v7HelloAt===p.helloAt)continue;p.v7HelloAt=p.helloAt;
  // Some guards acknowledge silently. Others speak a different line each time.
  const cycle=(Math.floor(t/17)+i*7+(p.greetingCount||0))%5;
  if(cycle===0||cycle===3){p.speech.visible=false;continue;}
  const index=(Math.floor(t/19)+i*3+(p.greetingCount||0))%phrases.length;
  if(p.speech.material){p.speech.material.map=phrases[index];p.speech.material.needsUpdate=true;p.lastText=messages[index];}
 }}
function parkByFountain(g){const cars=g.cars.filter(c=>c.fixedSpawn&&['saetta','fulmine'].includes(c.style)&&/Villa della Mandria/.test(c.name||''));
 if(cars.length<2)return {nearFountain:false,count:cars.length,reason:'missing originals'};
 const [a,b]=cars,step=(a.spec.width+b.spec.width)/2+.35,water=point(-27,29);
 for(const [u,v] of [[-24,35],[-23,35],[-25,36],[-22,34],[-24,39],[-21,36],[-24,25]]){
  const sites=[[u,v],[u+step,v]];
  const free=sites.every(([x,z],i)=>{const c=cars[i],p=point(x,z),y=g.terrain.height(p.x,p.z);
   if(near(p,water)<c.spec.length*.5+3.4||!mandriaFree(g,x,z,c.spec.width*.55,c.spec.height+.4)||vehicleBlocked(p.x,p.z,VILLA.yaw,g.collision,c.spec,y))return false;
   return !g.cars.some(other=>other!==a&&other!==b&&other.fixedSpawn&&other.mesh.visible&&!other.spec.aircraft&&near(other,p)<(other.spec.length+c.spec.length)*.5+.35);
  });if(!free)continue;
  for(const [i,[x,z]] of sites.entries()){const c=cars[i],p=point(x,z),y=g.terrain.height(p.x,p.z);
   Object.assign(c,{x:p.x,z:p.z,y,yaw:VILLA.yaw,speed:0,parked:true});resetGroundMotion(c);c.home={x:c.x,z:c.z,y,yaw:c.yaw};g.pose(c);}
  // Delete paint marks from the old, incorrect hangar-side parking bays.
  for(const mark of [...g.villaV6.root.children])if(mark.isMesh&&mark.material?.color?.getHexString()==='d9caa6'&&mark.scale.y<.09)mark.parent.remove(mark);
  return {nearFountain:true,gap:.35,spots:sites,count:2};
 }
 return {nearFountain:false,count:cars.length,reason:'no free pair of bays near the fountain'};
}
function routeClear(g,route,width=1.1){return route.every((p,i)=>{if(i===0)return true;const prev=route[i-1],steps=Math.ceil(Math.hypot(prev[0]-p[0],prev[1]-p[1])/1.35);
 for(let n=0;n<=steps;n++){const t=n/steps,u=prev[0]+(p[0]-prev[0])*t,v=prev[1]+(p[1]-prev[1])*t;
  if(!mandriaFree(g,u,v,width,2.8))return false;const pos=point(u,v);
  if(g.cars.some(c=>c.fixedSpawn&&!c.mandriaPatrol&&c.mesh.visible&&!c.spec.aircraft&&near(pos,c)<(c.spec.width+2)*.6))return false;
 }return true;});}
function soften(route,index){const corners=route.slice(0,-1),points=[];
 for(let i=0;i<corners.length;i++){const a=corners[(i+corners.length-1)%corners.length],b=corners[i],c=corners[(i+1)%corners.length];
  const pre=Math.max(.001,Math.hypot(a[0]-b[0],a[1]-b[1])),post=Math.max(.001,Math.hypot(c[0]-b[0],c[1]-b[1]));
  const cut=Math.min(2.1+index%3*.35,pre*.18,post*.18);
  points.push([b[0]+(a[0]-b[0])*cut/pre,b[1]+(a[1]-b[1])*cut/pre]);
  points.push([b[0]+(a[0]+c[0]-2*b[0])*cut*.38/Math.max(pre,post),b[1]+(a[1]+c[1]-2*b[1])*cut*.38/Math.max(pre,post)]);
  points.push([b[0]+(c[0]-b[0])*cut/post,b[1]+(c[1]-b[1])*cut/post]);
 }
 points.push([...points[0]]);return points;}
function patrols(g){let improved=0;for(const [i,c] of g.villaV3.patrols.filter(c=>c.mandriaPatrol==='ape').entries()){
  if(c===g.state.car||!c.route||c.route.length<5)continue;
  const amended=soften(c.route,i);if(!routeClear(g,amended,Math.max(.9,c.spec.width*.53)))continue;
  const p=point(...amended[0]);Object.assign(c,{route:amended,routeIndex:1,x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),yaw:VILLA.yaw,speed:0,patrolSlot:0});g.pose(c);improved++;
 }return improved;}
function horses(g){let staggered=0;const animals=g.villaV3?.patrols.filter(c=>c.estateHorse)||[];
 for(const [i,c] of animals.entries()){
  if(i===0||c===g.state.car||!c.route?.length)continue;
  const centre={u:61,v:-57},route=c.route.map(([u,v])=>[centre.u+(u-centre.u)*(1-.095*i),centre.v+(v-centre.v)*(1-.13*i)]);
  if(!routeClear(g,route,.65))continue;
  const p=point(...route[0]);Object.assign(c,{route,routeIndex:1,x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),speed:0});g.pose(c);staggered++;
 }return staggered;}
function animateAnimals(g,dt){for(const [farm,patch] of (g.villaLife?.pastures||[]).entries()){
  const u=patch.worker.u+10,v=patch.worker.v-10;
  for(const [i,animal] of patch.animals.entries()){
   if(!animal.v7Target||near(animal.a.position,animal.v7Target)<.23||g.state.elapsed>animal.v7Until){
    const seed=g.state.elapsed*1.79+(farm+1)*9.3+(i+1)*13.1;
    const tU=u+Math.sin(seed*1.9)*9.8,tV=v+Math.cos(seed*1.37)*11.8,target=point(tU,tV);
    if(mandriaFree(g,tU,tV,.65,1.8)){animal.v7Target=target;animal.v7Until=g.state.elapsed+8+(i+farm)%5;}
   }
   if(!animal.v7Target)continue;const target=animal.v7Target,p=animal.a.position,dx=target.x-p.x,dz=target.z-p.z,length=Math.hypot(dx,dz);
   if(length<.09)continue;const pace=.34+i*.12+farm*.035,step=Math.min(length,pace*Math.min(dt,.075));
   const x=p.x+dx/length*step,z=p.z+dz/length*step;
   if(Math.abs(x-patch.worker.home.x)<25&&mandriaFree(g,patch.worker.u+10+(x-point(u,v).x),patch.worker.v-10+(z-point(u,v).z),.5,1.6)){
    p.x=x;p.z=z;p.y=g.terrain.height(x,z)+Math.sin(g.state.elapsed*(2+i)+farm)*.015;animal.a.rotation.y=Math.atan2(dx,dz);
   }
  }
 }}
function workAnimations(g){for(const p of g.villaV6.rear.people){const t=g.state.elapsed+p.phase,arms=p.obj.children.filter(c=>c.isGroup);
  if(p.job===0){if(arms[0])arms[0].rotation.x=-.5+Math.sin(t*3.2)*.58;if(arms[1])arms[1].rotation.x=.3-Math.sin(t*3.2)*.37;}
  if(p.job===1){if(arms[0])arms[0].rotation.x=.8+Math.sin(t*1.45)*.3;if(arms[1])arms[1].rotation.x=-.3;}
  if(p.job===2){p.obj.rotation.x=-.18+Math.sin(t*2.1)*.16;if(arms[0])arms[0].rotation.x=.56+Math.sin(t*2.1)*.4;}
  if(p.job===3){const sway=Math.sin(t*.37);p.obj.rotation.y=sway>0?.45:Math.PI-.45;}
 }
 for(const [i,h] of g.villaV3.patrols.filter(c=>c.estateHorse).entries())for(const [j,leg] of (h.mesh.userData.horseLegs||[]).entries())leg.rotation.x=Math.sin(g.state.elapsed*(9.5+i*1.3)+j*2.2+i)*.33;
}
function initialize(g){const parking=parkByFountain(g),smoothPatrols=patrols(g),staggeredHorses=horses(g);dialogue(g);
 return {parking,smoothPatrols,staggeredHorses};}
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV7Life){ModernGameplay.prototype.__mandriaV7Life=true;
 ModernGameplay.prototype.populate=function(...args){this.villaV7Life=null;return oldPopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){oldUpdate.call(this,dt);
  if(!this.state?.started||!this.villaV7Physics||!this.villaV6?.rear||near(this.state,VILLA)>330)return;
  if(!this.villaV7Life)this.villaV7Life=initialize(this);
  workers(this);guards(this);animateAnimals(this,dt);workAnimations(this);
 };
}
