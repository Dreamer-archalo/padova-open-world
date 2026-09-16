// Shared races: explicit readiness, repeatable start handshake, host-owned AI.
import {TangenzialeRace} from './tangenziale-race.js';
import {formatRaceTime} from './tangenziale-race-rules.js';
import './multiplayer-live.js';

const ROOT='padova-after-hours/live/7d1e94d3/main-v4';
const BROKER='wss://broker.emqx.io:8084/mqtt';
const PEOPLE=['Matt','Marchese','Nino','Milo','Scando'];
const $=id=>document.getElementById(id);
const net=()=>window.PadovaOnline;
const me=()=>net()?.user;
const live=()=>!!net()?.connected;
const peers=()=>new Set(net()?.peers||[]);
const now=()=>Date.now();
const send=(op,data={})=>{if(live())net().broadcastWorldPatch({tag:'race-online-2',op,from:me(),...data});};
const validId=id=>typeof id==='string'&&/^[a-z0-9_-]{5,80}$/i.test(id);
const validMode=m=>m==='one'||m==='two';
const name=m=>m==='two'?'Gara Tangenziale 2':'Gara Tangenziale 1';
const capacity=m=>m==='two'?7:4;
const offers=new Map(),slots=new Map();
let manager=null,session=null,viewer=null,viewerLoading=false,slotKnown=false,inviteId='',lastPose=0,lastAvatarCheck=0;
const stamp=r=>r?{sx:r.start.x,sz:r.start.z,fx:r.finish.x,fz:r.finish.z,length:r.total}:null;
const compatible=(r,t)=>!!(r&&t&&[t.sx,t.sz,t.fx,t.fz,t.length].every(Number.isFinite)&&Math.hypot(r.start.x-t.sx,r.start.z-t.sz)<5&&Math.hypot(r.finish.x-t.fx,r.finish.z-t.fz)<5&&Math.abs(r.total-t.length)<35);
const readyLocal=()=>!!(session&&manager?.race?.onlineId===session.id&&((session.mode==='two')===!!manager.race.__secondRace));
function closeConfirmation(){
  for(const id of ['menu','mapDialog']){const d=$(id);if(d?.open&&typeof d.close==='function')d.close();}
  if(manager?.game?.state)manager.game.state.paused=false;
}
function clearUI(){$('onlineRaceLobby')?.remove();$('onlineRaceInvite')?.remove();inviteId='';}
function notice(text,offer=null){
  let el=$('onlineRaceInvite');if(!el){el=document.createElement('div');el.id='onlineRaceInvite';el.style.cssText='position:fixed;top:110px;left:50%;transform:translateX(-50%);z-index:140;max-width:min(92vw,520px);padding:14px;background:#102936f5;border:1px solid #ffc56a;border-radius:10px;color:white;font:600 13px/1.5 system-ui';document.body.appendChild(el);}
  el.replaceChildren();const txt=document.createElement('span');txt.textContent=text;el.append(txt);
  if(offer){const b=document.createElement('button');b.textContent='UNISCITI';b.style.cssText='margin:8px;padding:8px;background:#ffc56a;color:#122431';b.onclick=()=>joinOffer(offer);el.append(b);}
  const x=document.createElement('button');x.textContent='×';x.setAttribute('aria-label','Chiudi');x.style.cssText='margin-left:12px';x.onclick=()=>el.remove();el.append(x);
}
function lobbyUI(){
  if(!session||session.started||!manager?.race)return;
  closeConfirmation();
  const fingerprint=[session.id,session.mode,session.roster.join(','),[...session.ready].sort().join(','),session.localReady].join('|');
  let el=$('onlineRaceLobby');if(el?.__raceFingerprint===fingerprint)return;if(!el){el=document.createElement('div');el.id='onlineRaceLobby';el.style.cssText='position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);z-index:150;width:min(92vw,500px);padding:24px;background:#102532fa;border:2px solid #ffc56a;color:white;text-align:center;border-radius:12px;box-shadow:0 15px 55px #000c;font:600 14px/1.6 system-ui';document.body.appendChild(el);}
  el.__raceFingerprint=fingerprint;el.replaceChildren();const title=document.createElement('h2');title.textContent=name(session.mode)+' · ONLINE';el.append(title);
  const count=document.createElement('p');count.textContent='IN ATTESA DI ALTRI GIOCATORI · '+session.roster.join(', ')+' ('+session.roster.length+'/'+Math.min(capacity(session.mode),5)+')';el.append(count);
  const msg=document.createElement('p');msg.textContent='Posti liberi: BOT. I partecipanti devono completare il caricamento prima della partenza.';el.append(msg);
  if(session.host===me()){
    const ready=[me(),...session.roster.filter(n=>n!==me()&&session.ready.has(n))];
    const waiting=session.roster.filter(n=>n!==me()&&!session.ready.has(n));
    const status=document.createElement('p');status.textContent=waiting.length?'Preparazione in corso: '+waiting.join(', '):'Giocatori pronti: '+ready.join(', ');el.append(status);
    const start=document.createElement('button');start.className='primary';start.textContent=ready.length===1?'SKIP · PARTI DA SOLO':'AVVIA CON '+ready.length+' GIOCATORI';start.onclick=()=>startRace();el.append(start);
  }else{
    const p=document.createElement('p');p.textContent=session.localReady?'PRONTO · In attesa che il creatore avvii la gara.':'Preparazione della pista in corso…';el.append(p);
  }
  const cancel=document.createElement('button');cancel.textContent='ANNULLA';cancel.style.cssText='margin-left:12px';cancel.onclick=()=>manager?.abort();el.append(cancel);
}
function paintSlots(){
  const n=net(),mine=n?.connected?n.user:null;
  for(const btn of document.querySelectorAll('#onlineUsers .online-user')){
    const user=btn.dataset.user,occupied=[...slots.values()].some(v=>v.name===user&&now()-v.seen<5500)||peers().has(user),label=btn.querySelector('small');if(!label)continue;
    btn.disabled=!!(n?.connected||n?.joining||occupied);btn.classList.toggle('selected',mine===user);
    label.textContent=mine===user?'SELEZIONATO DA TE':occupied?'GIÀ SELEZIONATO':slotKnown?'DISPONIBILE':'VERIFICA DISPONIBILITÀ';
  }
}
function loadScript(src){return new Promise((resolve,reject)=>{if(window.mqtt?.connect)return resolve();const found=[...document.scripts].find(s=>s.src===src);if(found){found.addEventListener('load',resolve,{once:true});found.addEventListener('error',reject,{once:true});return;}const el=document.createElement('script');el.src=src;el.onload=resolve;el.onerror=reject;document.head.append(el);});}
async function watchSlots(){
  if(viewer||viewerLoading||live())return;viewerLoading=true;
  try{
    if(!window.mqtt?.connect){try{await loadScript('https://unpkg.com/mqtt@5.15.2/dist/mqtt.min.js');}catch{await loadScript('https://cdn.jsdelivr.net/npm/mqtt@5.15.2/dist/mqtt.min.js');}}
    if(live()||!window.mqtt?.connect)return;
    viewer=window.mqtt.connect(BROKER,{clientId:'padova_slots_'+Math.random().toString(16).slice(2),clean:true,connectTimeout:9500,reconnectPeriod:2000});
    viewer.on('connect',()=>viewer.subscribe(ROOT+'/presence/+',()=>{slotKnown=true;paintSlots();}));
    viewer.on('message',(topic,payload)=>{if(!topic.startsWith(ROOT+'/presence/'))return;const id=topic.slice((ROOT+'/presence/').length);try{const p=JSON.parse(payload.toString());if(p.id!==id||!PEOPLE.includes(p.name))return;if(p.locked===false||p.online===false)slots.delete(id);else slots.set(id,{name:p.name,seen:now()});paintSlots();}catch{}});
    viewer.on('offline',()=>{slotKnown=false;paintSlots();});
  }catch(e){console.warn('Padova slot availability',e);}finally{viewerLoading=false;}
}
$('onlineBtn')?.addEventListener('click',watchSlots);
setInterval(()=>{for(const [id,v] of slots)if(now()-v.seen>5500)slots.delete(id);paintSlots();if(live()&&viewer){viewer.end(true);viewer=null;}},600);
function fresh(o){return o&&o.phase==='lobby'&&now()-o.seen<6500;}
function currentOffer(mode){for(const [id,o] of offers)if(!fresh(o))offers.delete(id);return [...offers.values()].filter(o=>o.mode===mode).sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id))[0];}
function announce(){if(!session||session.host!==me()||session.started||!readyLocal())return;send('lobby',{id:session.id,mode:session.mode,host:me(),created:session.created,roster:session.roster,ready:[...session.ready],track:stamp(manager.race)});}
function sendPrepared(){if(!session||session.started||session.host===me()||!readyLocal())return;session.localReady=true;send('prepared',{id:session.id,mode:session.mode,track:stamp(manager.race)});}
function joinOffer(o){
  if(!live()||!fresh(o)||session||!manager||manager.race)return;
  clearUI();
  if(o.mode==='two'){manager.openSecondRaceConfirmation?.();const start=$('startTangenzialeRaceSecond');if(start)start.click();else notice('Impossibile preparare la seconda gara: riprova.');}
  else manager.start();
}
function joinSession(mode,o){
  if(!manager?.race)return;
  const id=o?.id||'r'+now().toString(36)+Math.random().toString(36).slice(2,8);
  session={id,mode,host:o?.host||me(),created:o?.created||now(),roster:o?[o.host]:[me()],ready:new Set(),localReady:false,started:false,lastAnnounce:0,lastJoin:0,lastPrepared:0,pending:null,startPacket:null,lastStart:0,acks:new Set()};
  manager.race.onlineId=id;manager.race.phase='lobby';closeConfirmation();
  if(session.host===me())announce();else{send('join',{id,mode});session.lastJoin=now();}
  lobbyUI();
}
const priorStart=TangenzialeRace.prototype.start;
TangenzialeRace.prototype.start=function(...args){
  if(!live()||session||this.race)return priorStart.apply(this,args);
  const mode=this.__nextRaceMode==='second'?'two':'one',o=currentOffer(mode);
  const result=priorStart.apply(this,args);if(!this.race)return result;
  manager=this;joinSession(mode,o);return result;
};
function assignSlots(m,roster){
  const r=m.race,slot=roster.indexOf(me());if(!r||slot<0||slot>r.ai.length)return false;
  r.onlineSlot=slot;for(const [i,c] of [r.playerCar,...r.ai].entries())c.onlineSlot=i;
  if(slot>0){const other=r.ai[slot-1];other.onlineSlot=0;r.playerCar.onlineSlot=slot;
    if(!r.__onlineMeshSwapped){const mesh=r.playerCar.mesh;r.playerCar.mesh=other.mesh;other.mesh=mesh;r.__onlineMeshSwapped=true;m.game.pose(other);m.game.pose(r.playerCar);}}
  for(const p of roster){if(p===me())continue;const car=r.ai.find(c=>c.onlineSlot===roster.indexOf(p));if(car){car.onlineRemote=p;car.raceFinished=false;car.name=p+' · GARA ONLINE';}}
  return true;
}
function beginRace(p){
  if(!session||session.started||session.id!==p.id||session.mode!==p.mode||!Array.isArray(p.roster)||!p.roster.includes(me())||!manager?.race)return false;
  if(!readyLocal()){session.pending=p;return false;}
  if(!compatible(manager.race,p.track)){notice('Piste non compatibili: la gara online è stata annullata. Ricarica lo stesso link su entrambi i dispositivi.');manager.abort();return false;}
  if(!assignSlots(manager,p.roster))return false;
  session.started=true;session.roster=p.roster;session.startPacket=p;session.acks=new Set([me()]);
  const r=manager.race;r.phase='countdown';r.countdownAt=manager.game.state.elapsed+(p.startAt-now())/1000-5;
  clearUI();closeConfirmation();send('ack',{id:session.id,mode:session.mode});
  manager.game.toast('GARA ONLINE · '+p.roster.length+' giocatori · posti restanti BOT',4);
  return true;
}
function startRace(){
  if(!session||session.host!==me()||session.started||!readyLocal())return;
  const roster=[me(),...session.roster.filter(n=>n!==me()&&session.ready.has(n)&&peers().has(n))].slice(0,Math.min(5,capacity(session.mode)));
  const p={id:session.id,mode:session.mode,host:me(),roster,track:stamp(manager.race),startAt:now()+7500};
  session.startPacket=p;send('start',p);beginRace(p);
}
function sendPose(m){
  const r=m.race,s=m.game.state;if(!session?.started||!r)return;
  const bots=session.host===me()?r.ai.filter(c=>!c.onlineRemote).map(c=>({slot:c.onlineSlot,x:c.x,y:c.y,z:c.z,yaw:c.yaw,speed:c.speed,progress:c.raceProgress||0,finished:!!c.raceFinished,time:r.finishTimes[r.ai.indexOf(c)+1]})):null;
  send('pose',{id:session.id,mode:session.mode,x:s.x,y:s.y,z:s.z,yaw:s.yaw,speed:s.speed,progress:r.playerProgress,finished:!!r.playerFinished,time:r.finishTimes?.[0],bots});
}
function applyPose(m,car,p){
  if(!car||![p.x,p.y,p.z,p.yaw,p.progress].every(Number.isFinite)||Math.hypot(p.x-m.race.start.x,p.z-m.race.start.z)>14000)return;
  Object.assign(car,{x:p.x,y:p.y,z:p.z,yaw:p.yaw,speed:Number.isFinite(p.speed)?p.speed:0,raceProgress:Math.max(car.raceProgress||0,p.progress),parked:!!p.finished});
  if(car.path?.length)car.pathIndex=Math.min(car.path.length-1,Math.max(1,Math.round(car.raceProgress/Math.max(1,m.race.total)*(car.path.length-1))));
  const index=m.race.ai.indexOf(car)+1;
  if(p.finished&&m.race.finishTimes[index]===null){m.markFinished(index,car);if(Number.isFinite(p.time)&&p.time>=0)m.race.finishTimes[index]=p.time;}
  m.game.pose(car);car.lastOnlinePose=now();
}
function receivePose(user,p){
  if(!session?.started||session.id!==p.id||!session.roster.includes(user)||user===me()||!manager?.race)return;
  applyPose(manager,manager.race.ai.find(c=>c.onlineRemote===user),p);
  if(user===session.host&&Array.isArray(p.bots))for(const b of p.bots){if(!Number.isInteger(b.slot))continue;applyPose(manager,manager.race.ai.find(c=>c.onlineSlot===b.slot&&!c.onlineRemote),b);}
}
const originalUpdate=TangenzialeRace.prototype.update;
function reposition(m){
  const r=m.race,slot=r?.onlineSlot||0;if(!slot||!r.ai[slot-1])return;
  const other=r.ai[slot-1],player=r.playerCar,s=m.game.state,pose={x:player.x,y:player.y,z:player.z,yaw:player.yaw};
  for(const k of ['x','y','z','yaw'])player[k]=other[k];Object.assign(other,pose);m.game.pose(player);m.game.pose(other);
  Object.assign(s,{x:player.x,y:player.y,z:player.z,yaw:player.yaw,speed:0,vy:0});
}
function avatars(m){
  if(now()-lastAvatarCheck<500)return;lastAvatarCheck=now();
  for(const o of m.game.scene.children){const key=o.userData?.onlineKey;if(typeof key==='string')o.visible=!session?.started||!session.roster.some(p=>p!==me()&&key.startsWith(p+':'));}
  for(const c of m.race?.ai||[]){if(!c.onlineRemote)continue;if(now()-(c.lastOnlinePose||session.startPacket?.startAt||now())>11000&&!peers().has(c.onlineRemote)){m.game.toast(c.onlineRemote+' disconnesso · subentra il BOT',3);c.onlineRemote=null;}}
}
function cleanup(m){if(!session)return;send('leave',{id:session.id,mode:session.mode});session=null;clearUI();for(const o of m.game.scene?.children||[])if(typeof o.userData?.onlineKey==='string')o.visible=true;}
TangenzialeRace.prototype.update=function(dt){
  manager=this;const r=this.race;
  if(session&&r?.onlineId===session.id&&!session.started&&r.phase==='lobby'){
    closeConfirmation();this.freezeGrid();
    if(readyLocal()){
      if(session.host===me()&&now()-session.lastAnnounce>800){announce();session.lastAnnounce=now();}
      if(session.host!==me()){
        if(now()-session.lastJoin>1000){send('join',{id:session.id,mode:session.mode});session.lastJoin=now();}
        if(now()-session.lastPrepared>800){sendPrepared();session.lastPrepared=now();}
      }
      if(session.pending)beginRace(session.pending);
    }
    lobbyUI();return;
  }
  if(session?.started&&r?.onlineId===session.id&&r.phase==='countdown'&&r.onlineSlot>0){const result=originalUpdate.call(this,dt);if(this.race?.phase==='countdown')reposition(this);if(session.startPacket&&session.host===me())retryStart();return result;}
  const out=originalUpdate.call(this,dt);
  if(session?.started&&this.race?.onlineId===session.id){
    if(session.host===me())retryStart();
    if(this.race.phase==='running'&&now()-lastPose>95){sendPose(this);lastPose=now();}
    if(this.race.phase==='running')avatars(this);
  }
  if(session&&!this.race)cleanup(this);
  return out;
};
function retryStart(){
  if(!session?.started||session.host!==me()||!session.startPacket)return;
  const missing=session.roster.filter(n=>n!==me()&&!session.acks.has(n));
  if(missing.length&&now()-session.lastStart>650&&now()<session.startPacket.startAt+3500){send('start',session.startPacket);session.lastStart=now();}
}
const originalKey=TangenzialeRace.prototype.keyDown;
TangenzialeRace.prototype.keyDown=function(e){if(this.race?.phase==='lobby'&&['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','Tab','KeyE','KeyV','KeyJ'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();return;}return originalKey.call(this,e);};
const originalAI=TangenzialeRace.prototype.updateAI;
TangenzialeRace.prototype.updateAI=function(dt){
  const r=this.race;if(!r?.onlineId||!session?.started)return originalAI.call(this,dt);
  const frozen=r.ai.filter(c=>!!c.onlineRemote||session.host!==me()).map(c=>({c,finished:c.raceFinished,parked:c.parked,speed:c.speed}));
  for(const item of frozen)item.c.raceFinished=true;
  try{return originalAI.call(this,dt);}finally{for(const item of frozen){item.c.raceFinished=item.finished;item.c.parked=item.parked;item.c.speed=item.speed;}}
};
const originalBoard=TangenzialeRace.prototype.raceBoard;
TangenzialeRace.prototype.raceBoard=function(){
  const r=this.race;if(!session?.started||r?.onlineId!==session.id)return originalBoard.call(this);
  return [r.playerCar,...r.ai].map((c,i)=>{const label=i===0?me()+' · TU':c.onlineRemote?c.onlineRemote+' · GIOCATORE':'BOT';const model=r.__secondRace?(c.mesh?.userData?.secondRaceName||'SPORTIVA'):'FULMINE R';const time=r.finishTimes[i],rank=r.finishOrder.indexOf(i),pct=Math.round(Math.min(100,(i===0?r.playerProgress:c.raceProgress||0)/Math.max(1,r.total)*100));return '<div><strong>'+label+' · '+model+'</strong><span style="float:right;margin-left:18px">'+(time===null?'IN GARA · '+pct+'%':'#'+(rank+1)+' · '+formatRaceTime(time))+'</span></div>';}).join('');
};
const originalRestore=TangenzialeRace.prototype.restoreSnapshot;
TangenzialeRace.prototype.restoreSnapshot=function(...args){const out=originalRestore.apply(this,args);cleanup(this);return out;};
function receive(e){
  const p=e.detail?.patch,user=e.detail?.user;
  if(!p||p.tag!=='race-online-2'||p.from!==user||!PEOPLE.includes(user)||!validId(p.id)||!validMode(p.mode))return;
  if(p.op==='pose'){receivePose(user,p);return;}
  if(p.op==='lobby'&&p.host===user&&Array.isArray(p.roster)&&p.roster.every(n=>PEOPLE.includes(n))&&compatible({start:{x:p.track?.sx,z:p.track?.sz},finish:{x:p.track?.fx,z:p.track?.fz},total:p.track?.length},p.track)){
    const prev=offers.get(p.id);offers.set(p.id,{id:p.id,mode:p.mode,host:user,created:Number.isFinite(p.created)?p.created:now(),roster:[...new Set(p.roster)],phase:'lobby',seen:now(),track:p.track});
    if(session?.id===p.id&&session.host===user&&!session.started){session.roster=offers.get(p.id).roster;lobbyUI();}
    if(!session&&(!prev||prev.roster.length!==p.roster.length)&&(!manager?.race)){
      inviteId=p.id;notice((p.roster.at(-1)||user)+' si è unito a '+name(p.mode)+' e sta aspettando altri giocatori.',offers.get(p.id));
    }
  }else if(p.op==='join'&&session?.id===p.id&&session.host===me()&&!session.started&&peers().has(user)){
    if(!session.roster.includes(user)&&session.roster.length<Math.min(5,capacity(session.mode))){session.roster.push(user);announce();lobbyUI();}
  }else if(p.op==='prepared'&&session?.id===p.id&&session.host===me()&&!session.started&&peers().has(user)){
    if(compatible(manager?.race,p.track)){if(!session.roster.includes(user))session.roster.push(user);session.ready.add(user);announce();lobbyUI();}
    else send('incompatible',{id:p.id,mode:p.mode,to:user});
  }else if(p.op==='incompatible'&&p.to===me()&&session?.id===p.id&&!session.started){notice('Le piste non coincidono. Aprite entrambi la stessa versione del gioco.');manager?.abort();}
  else if(p.op==='start'&&p.host===user&&Array.isArray(p.roster)&&p.roster.length<=Math.min(5,capacity(p.mode))&&p.roster.every(n=>PEOPLE.includes(n))&&Number.isFinite(p.startAt)){
    offers.delete(p.id);if(session?.id===p.id&&session.mode===p.mode){if(session.started){send('ack',{id:p.id,mode:p.mode});}else beginRace(p);}else if(inviteId===p.id)clearUI();
  }else if(p.op==='ack'&&session?.id===p.id&&session.host===me()&&session.started){session.acks.add(user);}
  else if(p.op==='leave'&&session?.id===p.id&&!session.started){if(user===session.host){manager?.abort();notice('Il creatore della gara ha annullato la lobby.');}else if(session.host===me()){session.roster=session.roster.filter(n=>n!==user);session.ready.delete(user);announce();lobbyUI();}}
  else if(p.op==='leave'&&session?.id===p.id&&session.started){const car=manager?.race?.ai?.find(c=>c.onlineRemote===user);if(car){car.onlineRemote=null;manager.game.toast(user+' ha lasciato la gara · subentra il BOT.',3);}}
}
window.addEventListener('padova-online-world-patch',receive);
setInterval(()=>{for(const [id,o] of offers)if(!fresh(o))offers.delete(id);if(inviteId&&!offers.has(inviteId)){$('onlineRaceInvite')?.remove();inviteId='';}},1500);