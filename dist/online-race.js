// Shared Tangenziale lobbies and human racers; reuses the existing MQTT world channel.
import {TangenzialeRace} from './tangenziale-race.js';
import {formatRaceTime} from './tangenziale-race-rules.js';
import './multiplayer-live.js';

const ROOT='padova-after-hours/live/7d1e94d3/main-v4';
const BROKER='wss://broker.emqx.io:8084/mqtt';
const PEOPLE=['Matt','Marchese','Nino','Milo','Scando'];
const WAIT_TTL=5500,PEER_TTL=5000,COUNTDOWN=5;
const $=id=>document.getElementById(id);
const net=()=>window.PadovaOnline;
const me=()=>net()?.user;
const live=()=>!!net()?.connected;
const available=()=>new Set(net()?.peers||[]);
const send=(op,data={})=>{if(live())net().broadcastWorldPatch({tag:'race-online-1',op,from:me(),...data});};
const offers=new Map(),slots=new Map();
let viewer=null,viewerLoading=false,availabilityKnown=false,manager=null,session=null,lastInviteId='',lastPresence=0,lastLobbyPaint=0;
const now=()=>Date.now();
const raceName=mode=>mode==='two'?'Gara Tangenziale 2':'Gara Tangenziale 1';
const capacity=mode=>mode==='two'?7:4;
const validMode=mode=>mode==='one'||mode==='two';
const validId=id=>typeof id==='string'&&/^[a-z0-9_-]{5,80}$/i.test(id);
const freshOffer=o=>o&&now()-o.seen<WAIT_TTL&&o.phase==='lobby';
const cleanOffers=()=>{for(const [id,o] of offers)if(!freshOffer(o))offers.delete(id);};

function notice(text,join=null){
  let el=$('onlineRaceInvite');
  if(!el){el=document.createElement('div');el.id='onlineRaceInvite';el.style.cssText='position:fixed;top:120px;left:50%;transform:translateX(-50%);z-index:110;max-width:min(92vw,520px);background:#102936f5;border:1px solid #ffc56a;border-radius:10px;color:#fff;padding:13px 16px;font:600 13px/1.5 system-ui;box-shadow:0 8px 35px #0009';document.body.appendChild(el);}
  el.replaceChildren();const label=document.createElement('span');label.textContent=text;el.append(label);
  if(join){const btn=document.createElement('button');btn.textContent='UNISCITI';btn.style.cssText='margin-left:12px;padding:7px 10px;background:#ffc56a;color:#122431;border:0;border-radius:5px;font-weight:800;cursor:pointer';btn.onclick=()=>joinOffer(join);el.append(btn);}
  const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Chiudi avviso');close.style.cssText='margin-left:12px;background:transparent;color:white;border:0;cursor:pointer;font-size:19px';close.onclick=()=>el.remove();el.append(close);
}
function lobbyUI(force=false){
  if(!session||!manager?.race||!force&&now()-lastLobbyPaint<300)return;lastLobbyPaint=now();
  let el=$('onlineRaceLobby');if(!el){el=document.createElement('div');el.id='onlineRaceLobby';el.style.cssText='position:fixed;left:50%;top:34%;transform:translate(-50%,-50%);z-index:130;width:min(92vw,500px);padding:24px;background:#102532f5;border:2px solid #ffc56a;color:white;text-align:center;border-radius:12px;box-shadow:0 15px 55px #000c;font:600 14px/1.6 system-ui';document.body.appendChild(el);}
  const names=session.roster||[me()];el.replaceChildren();
  const title=document.createElement('h2');title.textContent=raceName(session.mode)+' · ONLINE';title.style.margin='0 0 8px';el.append(title);
  const msg=document.createElement('p');msg.textContent='IN ATTESA DI ALTRI GIOCATORI · '+names.join(', ')+' ('+names.length+'/'+Math.min(capacity(session.mode),5)+')';el.append(msg);
  const hint=document.createElement('p');hint.textContent='I posti rimanenti saranno guidati dai bot. Puoi avviare anche senza altri giocatori.';hint.style.opacity='.8';el.append(hint);
  if(session.host===me()){
    const skip=document.createElement('button');skip.className='primary';skip.textContent=names.length>1?'AVVIA CON '+names.length+' GIOCATORI':'SKIP · PARTI DA SOLO';skip.style.pointerEvents='auto';skip.onclick=()=>startRace();el.append(skip);
  }else{const wait=document.createElement('p');wait.textContent='Pronto: il creatore della gara avvia la partenza.';el.append(wait);}
  const cancel=document.createElement('button');cancel.textContent='ANNULLA';cancel.style.cssText='margin-left:12px;pointer-events:auto';cancel.onclick=()=>{send('leave',{id:session.id,mode:session.mode});manager.abort();};el.append(cancel);
}
function clearLobby(){$('onlineRaceLobby')?.remove();}

function paintSlots(){
  const dialog=$('onlineDialog');if(!dialog)return;
  const n=net(),self=n?.connected?n.user:null;
  for(const btn of document.querySelectorAll('#onlineUsers .online-user')){
    const name=btn.dataset.user,busy=[...slots.values()].some(p=>p.name===name&&now()-p.seen<PEER_TTL)||available().has(name),mine=self===name;
    const label=btn.querySelector('small');if(!label)continue;
    if(n?.joining){btn.disabled=true;continue;}
    btn.disabled=!!(n?.connected||busy);btn.classList.toggle('selected',mine);
    label.textContent=mine?'SELEZIONATO DA TE':busy?'GIÀ SELEZIONATO':availabilityKnown?'DISPONIBILE':'VERIFICA DISPONIBILITÀ';
  }
  let text=$('onlineSlotHint');if(!text){text=document.createElement('div');text.id='onlineSlotHint';text.style.cssText='font:11px system-ui;color:#b9c7cd;margin:8px 0';$('onlineUsers')?.insertAdjacentElement('afterend',text);}
  text.textContent=availabilityKnown?'Disponibilità aggiornata in tempo reale.':'Verifica degli utenti connessi…';
}
function script(src){return new Promise((resolve,reject)=>{if(window.mqtt?.connect)return resolve();const existing=[...document.scripts].find(s=>s.src===src);if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}const node=document.createElement('script');node.src=src;node.onload=resolve;node.onerror=reject;document.head.append(node);});}
async function watchSlots(){
  if(viewer||viewerLoading||live())return;viewerLoading=true;paintSlots();
  try{
    if(!window.mqtt?.connect){try{await script('https://unpkg.com/mqtt@5.15.2/dist/mqtt.min.js');}catch{await script('https://cdn.jsdelivr.net/npm/mqtt@5.15.2/dist/mqtt.min.js');}}
    if(live()||!window.mqtt?.connect)return;
    viewer=window.mqtt.connect(BROKER,{clientId:'padova_slots_'+Math.random().toString(16).slice(2),clean:true,connectTimeout:9500,reconnectPeriod:2000});
    viewer.on('connect',()=>viewer.subscribe(ROOT+'/presence/+',()=>{availabilityKnown=true;paintSlots();}));
    viewer.on('message',(topic,payload)=>{const id=topic.slice((ROOT+'/presence/').length);if(!topic.startsWith(ROOT+'/presence/'))return;try{const p=JSON.parse(payload.toString());if(p.id!==id||!PEOPLE.includes(p.name))return;if(p.online===false||p.locked===false)slots.delete(id);else slots.set(id,{name:p.name,seen:now()});paintSlots();}catch{}});
    viewer.on('offline',()=>{availabilityKnown=false;paintSlots();});
  }catch{availabilityKnown=false;paintSlots();}finally{viewerLoading=false;}
}
function refreshSlots(){for(const [id,p] of slots)if(now()-p.seen>PEER_TTL)slots.delete(id);paintSlots();if(live()&&viewer){viewer.end(true);viewer=null;}}
$('onlineBtn')?.addEventListener('click',watchSlots);
setInterval(refreshSlots,500);

function currentOffer(mode){cleanOffers();return [...offers.values()].filter(o=>o.mode===mode&&freshOffer(o)).sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id))[0];}
function announce(){if(!session||session.host!==me()||session.phase!=='lobby')return;send('lobby',{id:session.id,mode:session.mode,host:me(),created:session.created,roster:session.roster,phase:'lobby',track:trackStamp(manager.race)});}
function trackStamp(r){return r?{sx:r.start.x,sz:r.start.z,fx:r.finish.x,fz:r.finish.z,length:r.total}:null;}
function compatible(r,stamp){return r&&stamp&&Math.hypot(r.start.x-stamp.sx,r.start.z-stamp.sz)<5&&Math.hypot(r.finish.x-stamp.fx,r.finish.z-stamp.fz)<5&&Math.abs(r.total-stamp.length)<35;}
function joinOffer(offer){if(!live()||!freshOffer(offer)||session||!manager||manager.race)return;lastInviteId='';$('onlineRaceInvite')?.remove();if(offer.mode==='two'){manager.openSecondRaceConfirmation?.();$('startTangenzialeRaceSecond')?.click();}else manager.start();}
function becomeMember(id,mode,host,created){
  session={id,mode,host,created,phase:'lobby',roster:[host],started:false,track:null,lastJoin:now(),lastBroadcast:0};
  manager.race.onlineId=id;manager.race.phase='lobby';
  if(host===me()){session.roster=[me()];announce();}else{send('join',{id,mode});}
  lobbyUI();$('onlineRaceInvite')?.remove();
}

const baseStart=TangenzialeRace.prototype.start;
TangenzialeRace.prototype.start=function(...args){
  if(!live()||session||this.race)return baseStart.apply(this,args);
  const mode=this.__nextRaceMode==='second'?'two':'one',o=currentOffer(mode);
  const result=baseStart.apply(this,args);if(!this.race)return result;
  manager=this;
  const id=o?.id||'r'+now().toString(36)+Math.random().toString(36).slice(2,8);
  becomeMember(id,mode,o?.host||me(),o?.created||now());
  return result;
};

const baseUpdate=TangenzialeRace.prototype.update;
TangenzialeRace.prototype.update=function(dt){
  manager=this;
  if(session&&this.race?.onlineId===session.id&&this.race.phase==='lobby'){
    this.freezeGrid();
    if(session.host===me()&&now()-session.lastBroadcast>900){announce();session.lastBroadcast=now();}
    if(session.host!==me()&&now()-session.lastJoin>1100){send('join',{id:session.id,mode:session.mode});session.lastJoin=now();}
    if(session.host===me()&&session.roster.length>1&&now()-session.created>3500)startRace();
    lobbyUI();return;
  }
  if(session&&this.race?.onlineId===session.id&&this.race.phase==='countdown'&&session.started&&this.race.onlineSlot>0){
    const out=baseUpdate.call(this,dt);repositionForSlot(this);return out;
  }
  const out=baseUpdate.call(this,dt);
  if(session&&this.race?.onlineId===session.id&&this.race.phase==='running'){
    if(session.host!==me()&&!available().has(session.host)){const successor=session.roster.find(n=>n===me()||available().has(n));if(successor&&successor!==session.host){session.host=successor;this.game.toast('Nuovo coordinatore gara: '+successor,2);}}
    if(now()-lastPresence>95){sendPose(this);lastPresence=now();}
    hideDuplicateAvatars(this);
  }
  if(session&&!this.race){send('leave',{id:session.id,mode:session.mode});session=null;clearLobby();restoreAvatars(this);}
  return out;
};

const baseKey=TangenzialeRace.prototype.keyDown;
TangenzialeRace.prototype.keyDown=function(e){if(this.race?.phase==='lobby'&&['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','Tab','KeyE','KeyV','KeyJ'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();return;}return baseKey.call(this,e);};
const baseAI=TangenzialeRace.prototype.updateAI;
TangenzialeRace.prototype.updateAI=function(dt){
  const r=this.race;if(!r?.onlineId||!session?.started)return baseAI.call(this,dt);
  const remote=r.ai.filter(car=>!!car.onlineRemote||session.host!==me()).map(car=>({car,finished:car.raceFinished,parked:car.parked,speed:car.speed}));
  for(const item of remote)item.car.raceFinished=true;
  try{return baseAI.call(this,dt);}finally{for(const item of remote){item.car.raceFinished=item.finished;item.car.parked=item.parked;item.car.speed=item.speed;}}
};
const baseBoard=TangenzialeRace.prototype.raceBoard;
TangenzialeRace.prototype.raceBoard=function(){
  const r=this.race;if(!r||!session?.started||r.onlineId!==session.id)return baseBoard.call(this);
  return [r.playerCar,...r.ai].map((car,i)=>{
    const name=i===0?me()+' · TU':car.onlineRemote?car.onlineRemote+' · GIOCATORE':'BOT';
    const model=r.__secondRace?(car.mesh.userData.secondRaceName||'SPORTIVA'):'FULMINE R';
    const time=r.finishTimes[i],place=r.finishOrder.indexOf(i),pct=Math.round(Math.min(100,(i===0?r.playerProgress:car.raceProgress||0)/Math.max(1,r.total)*100));
    const value=time===null?'IN GARA · '+pct+'%':'#'+(place+1)+' · '+formatRaceTime(time);
    return '<div><strong>'+name+' · '+model+'</strong><span style="float:right;margin-left:18px">'+value+'</span></div>';
  }).join('');
};
const baseRestore=TangenzialeRace.prototype.restoreSnapshot;
TangenzialeRace.prototype.restoreSnapshot=function(...args){const id=session?.id;const out=baseRestore.apply(this,args);if(id){send('leave',{id,mode:session.mode});session=null;clearLobby();restoreAvatars(this);}return out;};

function repositionForSlot(m){
  const r=m.race,slot=r?.onlineSlot||0;if(!slot||!r.ai[slot-1])return;
  const other=r.ai[slot-1],player=r.playerCar,s=m.game.state;
  const pos={x:player.x,y:player.y,z:player.z,yaw:player.yaw};
  for(const key of ['x','y','z','yaw'])player[key]=other[key];
  Object.assign(other,pos);m.game.pose(player);m.game.pose(other);
  Object.assign(s,{x:player.x,y:player.y,z:player.z,yaw:player.yaw,speed:0,vy:0});
}
function assignSlots(m,roster){
  const r=m.race;if(!r)return;
  const slot=roster.indexOf(me());if(slot<0||slot>r.ai.length)return;
  r.onlineSlot=slot;
  const cars=[r.playerCar,...r.ai];
  for(let i=0;i<cars.length;i++)cars[i].onlineSlot=i;
  if(slot>0){
    const other=r.ai[slot-1];other.onlineSlot=0;r.playerCar.onlineSlot=slot;
    if(!r.__onlineMeshSwapped){const mesh=r.playerCar.mesh;r.playerCar.mesh=other.mesh;other.mesh=mesh;r.__onlineMeshSwapped=true;m.game.pose(other);m.game.pose(r.playerCar);}
  }
  for(const p of roster){if(p===me())continue;const index=roster.indexOf(p),car=r.ai.find(a=>a.onlineSlot===index);if(car){car.onlineRemote=p;car.raceFinished=false;car.name=p+' · GARA ONLINE';}}
}
function startRace(){
  if(!session||session.host!==me()||session.started||!manager?.race)return;
  const r=manager.race,roster=[...new Set(session.roster)].slice(0,Math.min(capacity(session.mode),5));
  const packet={id:session.id,mode:session.mode,host:me(),roster,track:trackStamp(r),startAt:now()+5200};
  send('start',packet);beginRace(packet);
}
function beginRace(packet){
  if(!session||session.id!==packet.id||session.mode!==packet.mode||session.started||!manager?.race||!packet.roster?.includes(me()))return;
  const r=manager.race;if((packet.mode==='two')!==!!r.__secondRace)return;
  if(!compatible(r,packet.track)){manager.game.toast('Versioni della pista diverse: impossibile correre insieme.',6);manager.abort();return;}
  session.started=true;session.phase='running';session.roster=packet.roster;session.startAt=packet.startAt;
  assignSlots(manager,packet.roster);
  r.phase='countdown';r.countdownAt=manager.game.state.elapsed+(packet.startAt-now())/1000-COUNTDOWN;
  clearLobby();$('onlineRaceInvite')?.remove();send('ready',{id:session.id,mode:session.mode});
  manager.game.toast('GARA ONLINE · '+packet.roster.length+' giocatori · altri posti BOT',4);
}
function sendPose(m){
  const r=m.race,s=m.game.state;if(!r||!session?.started)return;
  const bots=session.host===me()?r.ai.filter(c=>!c.onlineRemote).map(c=>({slot:c.onlineSlot,x:c.x,y:c.y,z:c.z,yaw:c.yaw,speed:c.speed,progress:c.raceProgress||0,finished:!!c.raceFinished})):null;
  send('pose',{id:session.id,mode:session.mode,x:s.x,y:s.y,z:s.z,yaw:s.yaw,speed:s.speed,progress:r.playerProgress,finished:r.playerFinished,time:r.finishTimes?.[0],slot:r.onlineSlot,bots});
}
function receivePose(user,p){
  if(!session?.started||session.id!==p.id||!session.roster.includes(user)||user===me()||!manager?.race)return;
  const r=manager.race,c=r.ai.find(car=>car.onlineRemote===user);if(!c||![p.x,p.y,p.z,p.yaw,p.progress].every(Number.isFinite))return;
  if(Math.hypot(p.x-r.start.x,p.z-r.start.z)>14000)return;
  Object.assign(c,{x:p.x,y:p.y,z:p.z,yaw:p.yaw,speed:Number.isFinite(p.speed)?p.speed:0,raceProgress:Math.max(c.raceProgress||0,p.progress),parked:!!p.finished});
  if(c.path?.length)c.pathIndex=Math.min(c.path.length-1,Math.max(1,Math.round(c.raceProgress/Math.max(1,r.total)*(c.path.length-1))));
  if(p.finished&&r.finishTimes[r.ai.indexOf(c)+1]===null)manager.markFinished(r.ai.indexOf(c)+1,c);
  manager.game.pose(c);c.lastOnlinePose=now();
  if(user===session.host&&Array.isArray(p.bots))for(const state of p.bots){
    if(!Number.isInteger(state.slot)||!Number.isFinite(state.x)||!Number.isFinite(state.y)||!Number.isFinite(state.z)||!Number.isFinite(state.yaw)||!Number.isFinite(state.progress))continue;
    const bot=r.ai.find(a=>a.onlineSlot===state.slot&&!a.onlineRemote);if(!bot||Math.hypot(state.x-r.start.x,state.z-r.start.z)>14000)continue;
    Object.assign(bot,{x:state.x,y:state.y,z:state.z,yaw:state.yaw,speed:Number.isFinite(state.speed)?state.speed:0,raceProgress:Math.max(bot.raceProgress||0,state.progress),parked:!!state.finished});
    if(state.finished&&r.finishTimes[r.ai.indexOf(bot)+1]===null)manager.markFinished(r.ai.indexOf(bot)+1,bot);
    manager.game.pose(bot);bot.lastOnlinePose=now();
  }
}
let lastAvatarCheck=0;
function hideDuplicateAvatars(m){
  if(!session?.started||now()-lastAvatarCheck<500)return;lastAvatarCheck=now();for(const o of m.game.scene.children){const key=o.userData?.onlineKey;if(typeof key==='string'&&session.roster.some(p=>p!==me()&&key.startsWith(p+':')))o.visible=false;}
  for(const c of m.race?.ai||[]){if(!c.onlineRemote)continue;if(now()-(c.lastOnlinePose||session.startAt)>PEER_TTL*2||!available().has(c.onlineRemote)&&now()-(c.lastOnlinePose||session.startAt)>PEER_TTL){m.game.toast(c.onlineRemote+' disconnesso: guida affidata al BOT.',2);c.onlineRemote=null;}}
}
function restoreAvatars(m){for(const o of m.game?.scene?.children||[])if(typeof o.userData?.onlineKey==='string')o.visible=true;}

function showOffer(o,username){
  if(session||manager?.race||!freshOffer(o)||lastInviteId===o.id)return;
  lastInviteId=o.id;
  notice(username+' si è unito a '+raceName(o.mode)+' e sta aspettando altri giocatori.',o);
}
function receive(event){
  const p=event.detail?.patch,user=event.detail?.user;
  if(!p||p.tag!=='race-online-1'||p.from!==user||!PEOPLE.includes(user)||!validId(p.id)||!validMode(p.mode))return;
  if(p.op==='pose'){receivePose(user,p);return;}
  if(p.op==='lobby'&&p.host===user&&Array.isArray(p.roster)&&p.roster.every(n=>PEOPLE.includes(n))){
    const prior=offers.get(p.id);offers.set(p.id,{id:p.id,mode:p.mode,host:user,roster:[...new Set(p.roster)],created:Number.isFinite(p.created)?p.created:now(),phase:'lobby',track:p.track,seen:now()});
    const o=offers.get(p.id);if(session?.id===p.id&&session.host===user&&!session.started){session.roster=o.roster;lobbyUI(true);}
    if(!session&&(!prior||prior.roster.length!==o.roster.length))showOffer(o,o.roster.at(-1)||user);
  }else if(p.op==='join'&&session?.id===p.id&&session.mode===p.mode&&session.host===me()&&!session.started&&available().has(user)){
    if(!session.roster.includes(user)&&session.roster.length<Math.min(5,capacity(session.mode))){session.roster.push(user);send('joined',{id:p.id,mode:p.mode,user});announce();lobbyUI(true);}
  }else if(p.op==='joined'){if(session?.id===p.id&&!session.started)lobbyUI();else if(!session){const offer=offers.get(p.id);if(offer)notice(p.user+' si è unito a '+raceName(p.mode)+' e attende altri giocatori.',offer);}}
  else if(p.op==='start'&&p.host===user&&Array.isArray(p.roster)&&p.roster.every(n=>PEOPLE.includes(n))&&Number.isFinite(p.startAt)){offers.delete(p.id);if(lastInviteId===p.id){$('onlineRaceInvite')?.remove();lastInviteId='';}if(session?.id===p.id&&session.mode===p.mode)beginRace(p);}
  else if(p.op==='leave'&&session?.id===p.id&&!session.started){if(user===session.host){manager?.abort();notice('Il creatore della gara ha lasciato la lobby. Puoi crearne un’altra.');return;}if(session.host===me()){session.roster=session.roster.filter(n=>n!==user);announce();lobbyUI();}}
  else if(p.op==='leave'&&session?.id===p.id&&session.started){const c=manager?.race?.ai?.find(car=>car.onlineRemote===user);if(c){c.onlineRemote=null;manager.game.toast(user+' ha lasciato la gara · subentra il BOT.',3);}}
}
window.addEventListener('padova-online-world-patch',receive);
setInterval(()=>{cleanOffers();if(!session&&lastInviteId&&!offers.has(lastInviteId)){$('onlineRaceInvite')?.remove();lastInviteId='';}},1500);
