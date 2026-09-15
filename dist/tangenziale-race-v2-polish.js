import {TangenzialeRace} from './tangenziale-race.js';
import {clamp,dist} from './core.js';

const ENDGAME_OBSTACLE_MAX=.72;
const ENDGAME_DEADLOCK_WINDOW=1200;
const DEADLOCK_RECOVERY_SCORE=3.0;
const SECOND_RACE_COLORS=['#e53935','#f4d13d','#39b86b','#3084e8','#111318','#f2f2ee','#ef67b2'];
const FIRST_RACE_COLORS=['#ff3cac','#d8ff3e','#ff8a32','#f1f1f1'];
let activeManager=null;

function yawAt(samples,i){
 const a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)];
 return Math.atan2(b.x-a.x,b.z-a.z);
}
function angleDelta(a,b){return Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));}
function lateral(p,yaw,offset){return {x:p.x+Math.cos(yaw)*offset,z:p.z-Math.sin(yaw)*offset};}
function surfaceY(game,p,x=p.x,z=p.z){
 const roadY=p?.road?game.terrain.roads?.sample?.(p.road,x,z):NaN;
 const y=Number.isFinite(roadY)?roadY+.05:game.terrain.height(x,z,p?.y);
 return Number.isFinite(y)?y:(Number.isFinite(p?.y)?p.y:0);
}
function nearestRouteIndex(r,object){
 let best=clamp(object?.raceHint??r.startIndex??0,0,r.samples.length-1),bestD=Infinity;
 const lo=Math.max(0,best-20),hi=Math.min(r.samples.length-1,best+25);
 for(let i=lo;i<=hi;i++){
  const d=Math.hypot(object.x-r.samples[i].x,object.z-r.samples[i].z);
  if(d<bestD){bestD=d;best=i;}
 }
 if(bestD>80)for(let i=0;i<r.samples.length;i+=2){
  const d=Math.hypot(object.x-r.samples[i].x,object.z-r.samples[i].z);
  if(d<bestD){bestD=d;best=i;}
 }
 return {index:best,d:bestD};
}
function routeFraction(r,index){
 const start=r.startIndex||0,startD=r.samples.cumulative?.[start]||0,current=r.samples.cumulative?.[index];
 if(Number.isFinite(current)&&Number.isFinite(r.total)&&r.total>0)return clamp((current-startD)/r.total,0,1);
 return clamp((index-start)/Math.max(1,r.samples.length-1-start),0,1);
}
function safeObstacleIndex(r,target,used=[]){
 const lo=(r.startIndex||0)+8,hi=Math.max(lo,Math.min(r.samples.length-10,Math.floor((r.samples.length-1)*ENDGAME_OBSTACLE_MAX)));
 const base=clamp(target,lo,hi);
 for(let d=0;d<=30;d++)for(const sign of d?[1,-1]:[1]){
  const i=base+d*sign;if(i<lo||i>hi)continue;
  const p=r.samples[i],road=p?.road;if(!road||road.tunnel||road.crossing||road.b||Number(road.layer)>0||Number(road.w||0)<8.2)continue;
  if(used.some(u=>Math.abs(u-i)<8))continue;
  const bend=angleDelta(yawAt(r.samples,Math.max(1,i-3)),yawAt(r.samples,Math.min(r.samples.length-2,i+3)));
  if(bend>.18)continue;
  return i;
 }
 return null;
}
function relocateObstacle(manager,car,index,slot){
 const r=manager.race,g=manager.game,p=r.samples[index],yaw=yawAt(r.samples,index);
 const halfRoad=Math.max(4,Number(p.road?.w||8)*.5),halfCar=Math.max(.8,Number(car.spec?.width||2)*.5);
 const shoulder=Math.max(1.75,Math.min(2.65,halfRoad-halfCar-.45)),side=(slot%2?1:-1)*shoulder,q=lateral(p,yaw,side);
 Object.assign(car,{x:q.x,z:q.z,y:surfaceY(g,p,q.x,q.z),yaw:yaw+(slot%2?-.025:.025),speed:0,parked:true,missionUnit:true,fixedSpawn:true,tangenzialeObstacle:true,budgetSleeping:false});
 car.mesh.visible=true;g.pose(car);
 return side;
}
function sanitizeSecondRaceEndgame(manager){
 const r=manager.race;if(!r?.__secondRace||r.__endgameSanitized)return;r.__endgameSanitized=true;
 const used=[];const late=[];
 for(const [i,car] of (r.obstacles||[]).entries()){
  const found=nearestRouteIndex(r,car),fraction=routeFraction(r,found.index);
  if(fraction>ENDGAME_OBSTACLE_MAX)late.push({i,car,index:found.index});else used.push(found.index);
 }
 const targets=[.60,.69,.54,.64];
 for(let n=0;n<late.length;n++){
  const item=late[n],target=Math.floor((r.startIndex||0)+(r.samples.length-1-(r.startIndex||0))*targets[n%targets.length]),index=safeObstacleIndex(r,target,used);
  if(index===null){item.car.mesh.visible=false;continue;}
  const side=relocateObstacle(manager,item.car,index,n);used.push(index);
  if(r.obstacleDefs?.[item.i])Object.assign(r.obstacleDefs[item.i],{index,offset:side,yawOffset:n%2?-.025:.025});
 }
 r.__lateObstacleCount=late.length;
}
function safeRecoveryIndex(r,from){
 const lo=clamp(from,(r.startIndex||0)+2,r.samples.length-4);
 for(let d=0;d<=14;d++){
  const i=Math.min(r.samples.length-4,lo+d),p=r.samples[i],road=p?.road;
  if(!road||road.tunnel||Number(road.w||0)<7.5)continue;
  return i;
 }
 return Math.min(r.samples.length-4,lo);
}
function recoverSecondRaceDeadlock(manager,dt){
 const r=manager.race,s=manager.game.state;if(!r?.__secondRace||r.phase!=='running'||r.playerFinished)return;
 const remaining=Math.max(0,r.total-(r.playerProgress||0));
 if(remaining>ENDGAME_DEADLOCK_WINDOW){r.__lateDeadlockScore=0;r.__lateDeadlockLast=null;return;}
 const pos={x:s.x,z:s.z},last=r.__lateDeadlockLast,moved=last?Math.hypot(pos.x-last.x,pos.z-last.z):Infinity;
 r.__lateDeadlockLast=pos;
 if(!Number.isFinite(moved)){r.__lateDeadlockScore=0;return;}
 if(moved<.055){
  const speed=Math.abs(Number(s.speed)||0);
  r.__lateDeadlockScore=(r.__lateDeadlockScore||0)+dt*(speed>1.2?3:1);
 }else if(moved<.16&&Math.abs(Number(s.speed)||0)>4){
  r.__lateDeadlockScore=(r.__lateDeadlockScore||0)+dt*1.8;
 }else r.__lateDeadlockScore=Math.max(0,(r.__lateDeadlockScore||0)-dt*2.5);
 if((r.__lateDeadlockScore||0)<DEADLOCK_RECOVERY_SCORE)return;
 const near=nearestRouteIndex(r,s),idx=safeRecoveryIndex(r,Math.max(near.index+5,(r.playerCheckpoint||near.index)+3));
 manager.respawnActor(r.playerCar,idx,-.65);
 const restart=Math.min(26,Math.max(16,r.playerCar.spec.max*.42));
 r.playerCar.speed=restart;s.speed=restart;r.playerHint=idx;r.playerCheckpoint=Math.max(r.playerCheckpoint||0,idx);r.playerProgress=Math.max(r.playerProgress||0,(r.samples.cumulative?.[idx]||0)-(r.startDistance||0));
 r.__lateDeadlockScore=0;r.__lateDeadlockLast={x:s.x,z:s.z};manager.game.toast('Tratto finale ripristinato · gara continua.',1.6);
}

function mapPointFactory(path,canvas,pad){
 const xs=path.map(p=>p.x),zs=path.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
 const spanX=Math.max(1,maxX-minX),spanZ=Math.max(1,maxZ-minZ),scale=Math.min((canvas.width-pad*2)/spanX,(canvas.height-pad*2-24)/spanZ);
 const drawW=spanX*scale,drawH=spanZ*scale,ox=(canvas.width-drawW)/2,oy=22+(canvas.height-22-drawH)/2;
 return p=>({x:ox+(p.x-minX)*scale,y:oy+(maxZ-p.z)*scale});
}
function paintRaceOverview(manager){
 const r=manager.race,canvas=document.getElementById('minimap');if(!r||!canvas||r.samples.length<2)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const start=Math.max(0,r.startIndex||0),path=r.samples.slice(start),pt=mapPointFactory(path,canvas,24),w=canvas.width,h=canvas.height;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='rgba(8,13,17,.94)';ctx.fillRect(0,0,w,h);
 ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();for(let i=0;i<path.length;i++){const q=pt(path[i]);if(i===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);}ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=11;ctx.stroke();ctx.strokeStyle='#d9d8d1';ctx.lineWidth=4;ctx.stroke();
 const sp=pt(r.start),fp=pt(r.finish);ctx.fillStyle='#6ce58b';ctx.beginPath();ctx.arc(sp.x,sp.y,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
 ctx.save();ctx.translate(fp.x,fp.y);ctx.rotate(Number.isFinite(r.finishYaw)?-r.finishYaw:0);ctx.fillStyle='#f5f2e9';ctx.fillRect(-5,-5,10,10);ctx.fillStyle='#20252a';ctx.fillRect(-5,-5,5,5);ctx.fillRect(0,0,5,5);ctx.restore();
 const racers=[r.playerCar,...r.ai],fallback=r.__secondRace?SECOND_RACE_COLORS:FIRST_RACE_COLORS;
 racers.forEach((car,i)=>{if(!car?.mesh?.visible)return;const q=pt(car),color=car.mesh.userData?.secondRaceColor||fallback[i%fallback.length]||'#ffffff';ctx.fillStyle=color;ctx.beginPath();ctx.arc(q.x,q.y,i===0?6:4.6,0,Math.PI*2);ctx.fill();ctx.strokeStyle=i===0?'#ffc56a':'rgba(0,0,0,.82)';ctx.lineWidth=i===0?2.4:1.2;ctx.stroke();});
 const km=(r.total/1000).toFixed(1),pct=Math.round(Math.min(100,(r.playerProgress||0)/Math.max(1,r.total)*100));ctx.font='700 13px Inter,system-ui,sans-serif';ctx.fillStyle='#ffffff';ctx.textAlign='left';ctx.fillText((r.__secondRace?'GARA 2':'GARA 1')+' · '+km+' KM',12,16);ctx.textAlign='right';ctx.fillStyle='#ffc56a';ctx.fillText(pct+'%',w-12,16);ctx.textAlign='left';
}
function scheduleRaceOverview(manager){
 const r=manager.race;if(!r||r.__overviewQueued)return;r.__overviewQueued=true;
 queueMicrotask(()=>{r.__overviewQueued=false;if(manager.race===r)paintRaceOverview(manager);});
}

function openRaceHub(){
 const manager=activeManager,menu=document.getElementById('menu'),title=document.getElementById('menuTitle'),content=document.getElementById('menuContent');if(!manager||!menu||!content)return;
 if(title)title.textContent='Gare in tangenziale';
 content.innerHTML='<p class="about-copy">Scegli la gara da avviare.</p><div class="activities"><button class="activity" id="raceHubOne"><span class="icon">⚑</span><span><b>GARA 1 · TANGENZIALE</b><small>4 Fulmine R · turbo · rampe · ostacoli · tempi live</small></span><span class="reward">+€350</span></button><button class="activity" id="raceHubTwo"><span class="icon">⚑</span><span><b>GARA 2 · SETTE SPORTIVE</b><small>7 auto · percorso lungo · rampe interattive · deceleratori</small></span><span class="reward">+€350</span></button></div><div class="menu-actions"><button id="raceHubBack">INDIETRO ALLE ATTIVITÀ</button></div>';
 document.getElementById('raceHubOne').onclick=()=>manager.openConfirmation();
 document.getElementById('raceHubTwo').onclick=()=>manager.openSecondRaceConfirmation?.();
 document.getElementById('raceHubBack').onclick=()=>document.getElementById('activityBtn')?.click();
}
function decorateRaceHub(){
 if(typeof document==='undefined')return;const content=document.getElementById('menuContent'),title=document.getElementById('menuTitle');if(!content||!/A little extra on the side\./i.test(title?.textContent||''))return;
 const list=content.querySelector('.activities');if(!list)return;
 for(const id of ['tangenzialeRaceActivity','tangenzialeRaceSecondActivity']){const button=document.getElementById(id);if(button){button.hidden=true;button.style.display='none';button.setAttribute('aria-hidden','true');}}
 if(document.getElementById('tangenzialeRaceHubActivity'))return;
 const hub=document.createElement('button');hub.id='tangenzialeRaceHubActivity';hub.className='activity';hub.innerHTML='<span class="icon">⚑</span><span><b>GARE IN TANGENZIALE</b><small>Apri il pannello gare e scegli il tracciato</small></span><span class="reward">2 GARE</span>';hub.onclick=openRaceHub;list.prepend(hub);
}

const PREVIOUS_UPDATE=TangenzialeRace.prototype.update;
TangenzialeRace.prototype.update=function(dt){
 activeManager=this;
 const out=PREVIOUS_UPDATE.call(this,dt);
 if(this.race){sanitizeSecondRaceEndgame(this);recoverSecondRaceDeadlock(this,dt);scheduleRaceOverview(this);}
 return out;
};

if(typeof document!=='undefined'&&typeof MutationObserver!=='undefined'){
 new MutationObserver(decorateRaceHub).observe(document.getElementById('menuContent')||document.body,{childList:true,subtree:true});
 queueMicrotask(decorateRaceHub);
}

export const RACE_V2_POLISH={endgameObstacleMax:ENDGAME_OBSTACLE_MAX,deadlockWindow:ENDGAME_DEADLOCK_WINDOW,fullCourseMinimap:true,dedicatedRaceHub:true};
