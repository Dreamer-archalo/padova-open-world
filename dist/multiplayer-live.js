import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {createCharacter} from './characters.js';
import {createCar} from './world.js';
import {VEHICLES,isBike,createVehicle,createRider} from './vehicles.js';
import {SPECIAL_VEHICLES,createSpecialVehicle} from './special-vehicles.js';
import {NPC_VEHICLES,createNPCCar,createHelicopter} from './modern-vehicles.js';

const USERS=['Matt','Marchese','Nino','Milo','Scando'];
const USER_COLORS={Matt:'#70a7d8',Marchese:'#d8b870',Nino:'#d87970',Milo:'#78bd91',Scando:'#ad87d8'};
const CHARACTER_IDS={Matt:'mattia',Marchese:'marchese',Nino:'nino',Milo:'milo',Scando:'fede'};
const ROOT_TOPIC='padova-after-hours/live/7d1e94d3/main-v4';
const BROKER_URL='wss://broker.emqx.io:8084/mqtt';
const POSE_INTERVAL=100;
const PRESENCE_INTERVAL=1000;
const PEER_TIMEOUT=4500;
const $=id=>document.getElementById(id);
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const randomId=()=>crypto?.randomUUID?.().replaceAll('-','').slice(0,16)||Math.random().toString(16).slice(2)+Date.now().toString(16);

let activeGame=null;
const previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__padovaOnlineCapture){
  ModernGameplay.prototype.__padovaOnlineCapture=true;
  ModernGameplay.prototype.update=function(dt){activeGame=this;return previousUpdate.call(this,dt);};
}

function loadScript(src){
  return new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(s=>s.src===src);
    if(existing){if(window.mqtt)return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}
    const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });
}

async function loadMqtt(){
  if(window.mqtt?.connect)return window.mqtt;
  const sources=[
    'https://unpkg.com/mqtt@5.15.2/dist/mqtt.min.js',
    'https://cdn.jsdelivr.net/npm/mqtt@5.15.2/dist/mqtt.min.js'
  ];
  let lastError=null;
  for(const src of sources){
    try{await loadScript(src);if(window.mqtt?.connect)return window.mqtt;}catch(error){lastError=error;}
  }
  throw lastError||new Error('MQTT client unavailable');
}

function injectStyles(){
  if($('padovaOnlineStyles'))return;
  const s=document.createElement('style');s.id='padovaOnlineStyles';s.textContent=`
#onlineBtn{min-width:200px;background:#173342;border-color:#ffc56a;color:#ffc56a}#onlineBtn:hover{background:#21495d;color:#fff4d9}#onlineBtn:disabled{opacity:.45}
#onlineDialog{width:min(590px,92vw)}.online-copy{margin-top:0}.online-users{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin:20px 0}.online-user{min-height:92px;padding:12px 7px;border-radius:5px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:#172d3b}.online-user strong{font-size:15px}.online-user small{font-size:9px;color:#9fb0b8;letter-spacing:.7px}.online-user.selected{border-color:#ffc56a;background:#263d47}.online-dot{width:13px;height:13px;border-radius:50%;background:var(--online-color);box-shadow:0 0 0 3px #ffffff14}.online-join-state{font-size:13px;color:#b9c7cd;min-height:21px}.online-status{top:82px;right:36px;padding:8px 12px;background:#10242ee8;border:1px solid #ffc56a80;border-radius:4px;font-size:11px;letter-spacing:1px;color:#ffc56a;z-index:8}.online-peer-list{font-size:10px;color:#d7e1e4;margin-top:6px;letter-spacing:.35px}@media(max-width:800px){.online-users{grid-template-columns:repeat(2,1fr)}.online-status{top:68px;right:20px}}`;
  document.head.appendChild(s);
}

function installUI(){
  injectStyles();
  const play=$('playBtn');if(!play||$('onlineBtn'))return;
  const online=document.createElement('button');online.id='onlineBtn';online.className='primary';online.textContent='Load Map Online';online.disabled=play.disabled;play.insertAdjacentElement('afterend',online);
  new MutationObserver(()=>online.disabled=play.disabled).observe(play,{attributes:true,attributeFilter:['disabled']});
  const dialog=document.createElement('dialog');dialog.id='onlineDialog';dialog.innerHTML=`<div class="dialog-head"><div><span class="eyebrow">PADOVA / ONLINE MAP</span><h2>Choose your user.</h2></div><button class="close" id="closeOnline" aria-label="Close online map">×</button></div><p class="about-copy online-copy">One shared live map. Choose one of the five player slots.</p><div id="onlineUsers" class="online-users"></div><div id="onlineJoinState" class="online-join-state">Select a user to connect.</div><div id="onlinePeerList" class="online-peer-list"></div>`;document.body.appendChild(dialog);
  const status=document.createElement('div');status.id='onlineStatus';status.className='hud online-status';status.hidden=true;document.body.appendChild(status);
  online.onclick=()=>{if(!play.disabled&&!dialog.open)dialog.showModal();};$('closeOnline').onclick=()=>{if(!window.PadovaOnline?.joining&&!window.PadovaOnline?.connected)dialog.close();};
}

installUI();

let selectedName=null,joining=false,connected=false,client=null,clientId=null;
let poseTimer=null,presenceTimer=null,cleanupTimer=null;
const peers=new Map(),remoteStates=new Map(),remoteModels=new Map();

function renderButtons(){
  const wrap=$('onlineUsers');if(!wrap)return;wrap.innerHTML='';
  for(const name of USERS){
    const b=document.createElement('button');b.className='online-user';b.dataset.user=name;
    b.innerHTML=`<span class="online-dot" style="--online-color:${USER_COLORS[name]}"></span><strong>${name}</strong><small>AVAILABLE SLOT</small>`;
    b.onclick=()=>connect(name);wrap.appendChild(b);
  }
}
renderButtons();

function setButtonsLocked(){
  document.querySelectorAll('#onlineUsers .online-user').forEach(b=>{
    const chosen=b.dataset.user===selectedName;b.disabled=true;b.classList.toggle('selected',chosen);
    const small=b.querySelector('small');if(small)small.textContent=chosen?'CONNECTED':'LOCKED';
  });
}

function setButtonsFree(){
  document.querySelectorAll('#onlineUsers .online-user').forEach(b=>{
    b.disabled=false;b.classList.remove('selected');const small=b.querySelector('small');if(small)small.textContent='AVAILABLE SLOT';
  });
}

function activePeers(){
  const now=Date.now();return [...peers.values()].filter(p=>p.locked&&now-p.lastSeen<PEER_TIMEOUT&&USERS.includes(p.name));
}

function statusText(){
  const status=$('onlineStatus');if(!status)return;
  if(!connected){status.hidden=true;return;}
  const names=new Set([selectedName]);for(const p of activePeers())names.add(p.name);
  status.hidden=false;status.textContent=`ONLINE · ${selectedName} · ${names.size}/5`;
  const list=$('onlinePeerList');if(list)list.textContent=names.size>1?'Connected: '+[...names].join(', '):'Waiting for other players…';
}

function nameSprite(name,color){
  const c=document.createElement('canvas');c.width=320;c.height=80;const x=c.getContext('2d');
  x.fillStyle='rgba(9,23,33,.88)';x.fillRect(3,3,314,74);x.strokeStyle=color;x.lineWidth=4;x.strokeRect(3,3,314,74);
  x.fillStyle='#f6f3e9';x.font='700 35px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(name,160,41);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));sprite.scale.set(4.4,1.1,1);sprite.renderOrder=999;return sprite;
}

function remoteModel(name,mode,vehicle){
  const root=new THREE.Group(),color=USER_COLORS[name]||'#ffc56a';let model;
  if(mode==='car'&&vehicle){
    if(SPECIAL_VEHICLES[vehicle])model=createSpecialVehicle(vehicle);
    else if(vehicle==='airone')model=createHelicopter();
    else if(NPC_VEHICLES[vehicle])model=createNPCCar(vehicle,color);
    else if(['mito','cinquecento','motorcycle','scooter','truck','taxi','cruiser'].includes(vehicle))model=createVehicle(vehicle,color);
    else model=createCar(color,false,vehicle);
    if((isBike(vehicle)||VEHICLES[vehicle]?.bike)&&model)model.add(createRider());
  }else model=createCharacter(CHARACTER_IDS[name]||'fede');
  root.add(model);const tag=nameSprite(name,color);tag.position.y=mode==='car'?(vehicle==='truck'?4.8:vehicle==='airone'?4.3:3.0):2.65;root.add(tag);return root;
}

function cleanupRemote(id){
  const visual=remoteModels.get(id);if(visual?.parent)visual.parent.remove(visual);remoteModels.delete(id);remoteStates.delete(id);peers.delete(id);statusText();
}

function ensureRemote(id){
  const peer=peers.get(id),target=remoteStates.get(id);if(!activeGame?.scene||!peer?.locked||!target||peer.name===selectedName)return null;
  const key=`${peer.name}:${target.mode}:${target.vehicle||''}`;let visual=remoteModels.get(id);
  if(visual?.userData.onlineKey===key)return visual;
  if(visual?.parent)visual.parent.remove(visual);
  visual=remoteModel(peer.name,target.mode,target.vehicle);visual.userData.onlineKey=key;visual.position.set(target.x,target.y,target.z);visual.rotation.y=target.yaw;activeGame.scene.add(visual);remoteModels.set(id,visual);return visual;
}

function snapshot(){
  const s=activeGame?.state;if(!s)return null;
  return {id:clientId,name:selectedName,x:finite(s.x),y:finite(s.y),z:finite(s.z),yaw:finite(s.yaw),mode:s.mode==='car'?'car':'foot',vehicle:s.mode==='car'?(s.car?.style||null):null,at:Date.now()};
}

function publish(topic,data,qos=0){
  if(!client?.connected)return;try{client.publish(topic,JSON.stringify(data),{qos,retain:false});}catch{}
}

function publishPresence(){
  if(!clientId||!selectedName)return;publish(`${ROOT_TOPIC}/presence/${clientId}`,{id:clientId,name:selectedName,locked:connected,at:Date.now()},1);
}

function parseMessage(payload){try{return JSON.parse(payload.toString());}catch{return null;}}

function receivePresence(id,msg){
  if(id===clientId||!msg||msg.id!==id||!USERS.includes(msg.name))return;
  peers.set(id,{name:msg.name,locked:!!msg.locked,lastSeen:Date.now()});
  if(msg.name===selectedName&&msg.locked){
    if(joining){fail(`${selectedName} is already connected. Choose another user.`);return;}
    if(connected&&String(id)<String(clientId)){fail(`${selectedName} is already connected on another device. Choose another user.`);return;}
    if(connected)publishPresence();
  }
  statusText();
}

function receivePose(id,msg){
  if(id===clientId||!msg||msg.id!==id||!USERS.includes(msg.name))return;
  const peer=peers.get(id);if(!peer?.locked||peer.name!==msg.name)return;
  peer.lastSeen=Date.now();
  remoteStates.set(id,{x:finite(msg.x),y:finite(msg.y),z:finite(msg.z),yaw:finite(msg.yaw),mode:msg.mode==='car'?'car':'foot',vehicle:typeof msg.vehicle==='string'?msg.vehicle:null,at:finite(msg.at,Date.now())});ensureRemote(id);statusText();
}

function receiveWorld(id,msg){
  if(id===clientId||!msg)return;const peer=peers.get(id);if(!peer?.locked)return;
  window.dispatchEvent(new CustomEvent('padova-online-world-patch',{detail:{peerId:id,user:peer.name,...msg}}));
}

function onBrokerMessage(topic,payload){
  if(!topic.startsWith(ROOT_TOPIC+'/'))return;const parts=topic.split('/');const type=parts.at(-2),id=parts.at(-1),msg=parseMessage(payload);
  if(type==='presence')receivePresence(id,msg);else if(type==='pose')receivePose(id,msg);else if(type==='world')receiveWorld(id,msg);
}

function connectBroker(mqtt,name){
  return new Promise((resolve,reject)=>{
    let settled=false;clientId=randomId();
    const presenceTopic=`${ROOT_TOPIC}/presence/${clientId}`;
    const willPayload=JSON.stringify({id:clientId,name,locked:false,online:false,at:Date.now()});
    client=mqtt.connect(BROKER_URL,{clientId:`padova_${clientId}`,clean:true,keepalive:30,reconnectPeriod:1500,connectTimeout:10000,protocolVersion:4,will:{topic:presenceTopic,payload:willPayload,qos:1,retain:false}});
    const timer=setTimeout(()=>{if(!settled){settled=true;reject(new Error('Broker timeout'));}},12000);
    client.on('message',onBrokerMessage);
    client.on('connect',()=>{
      client.subscribe(`${ROOT_TOPIC}/#`,{qos:0},error=>{
        if(error){if(!settled){settled=true;clearTimeout(timer);reject(error);}return;}
        publishPresence();
        if(!settled){settled=true;clearTimeout(timer);resolve();}
      });
    });
    client.on('error',error=>{console.warn('Padova online MQTT',error);if(!settled){settled=true;clearTimeout(timer);reject(error);}});
    client.on('reconnect',()=>{const state=$('onlineJoinState');if(connected&&state)state.textContent='Reconnecting to shared map…';});
    client.on('offline',()=>{const state=$('onlineJoinState');if(connected&&state)state.textContent='Connection interrupted. Reconnecting…';});
  });
}

function stopTimers(){
  for(const t of [poseTimer,presenceTimer,cleanupTimer])if(t)clearInterval(t);poseTimer=presenceTimer=cleanupTimer=null;
}

function disconnectClient(){
  stopTimers();if(client){try{client.end(true);}catch{}}client=null;for(const id of [...remoteModels.keys()])cleanupRemote(id);peers.clear();remoteStates.clear();
}

function fail(message){
  joining=false;connected=false;disconnectClient();const state=$('onlineJoinState');if(state)state.textContent=message;setButtonsFree();statusText();
}

async function connect(name){
  if(joining||connected)return;joining=true;selectedName=name;const state=$('onlineJoinState');if(state)state.textContent=`Connecting ${name} to the shared map…`;
  document.querySelectorAll('#onlineUsers .online-user').forEach(b=>{b.disabled=true;b.classList.toggle('selected',b.dataset.user===name);});
  try{
    const mqtt=await loadMqtt();await connectBroker(mqtt,name);
    publishPresence();await sleep(1700);if(!joining||!client?.connected)return;
    const conflict=[...peers.entries()].find(([,p])=>p.name===selectedName&&p.locked&&Date.now()-p.lastSeen<PEER_TIMEOUT);
    if(conflict){fail(`${selectedName} is already connected. Choose another user.`);return;}
    const simultaneous=[...peers.entries()].filter(([,p])=>p.name===selectedName&&Date.now()-p.lastSeen<PEER_TIMEOUT).map(([id])=>id);
    const winner=[clientId,...simultaneous].sort()[0];if(winner!==clientId){fail(`${selectedName} was selected at the same time on another device. Choose another user.`);return;}
    connected=true;joining=false;publishPresence();setButtonsLocked();if(state)state.textContent=`${selectedName} connected to the shared map.`;statusText();
    presenceTimer=setInterval(publishPresence,PRESENCE_INTERVAL);
    poseTimer=setInterval(()=>{const snap=snapshot();if(snap)publish(`${ROOT_TOPIC}/pose/${clientId}`,snap,0);},POSE_INTERVAL);
    cleanupTimer=setInterval(()=>{const now=Date.now();for(const [id,p] of peers)if(now-p.lastSeen>PEER_TIMEOUT)cleanupRemote(id);statusText();},1000);
  }catch(error){console.error(error);fail('Shared map unavailable. Check the internet connection and try again.');}
}

window.PadovaOnline={
  get joining(){return joining;},get connected(){return connected;},get user(){return selectedName;},
  get peers(){return activePeers().map(p=>p.name);},
  broadcastWorldPatch(patch){if(connected&&clientId)publish(`${ROOT_TOPIC}/world/${clientId}`,{patch,at:Date.now()},1);}
};

function animateRemotes(){
  requestAnimationFrame(animateRemotes);
  for(const [id,target] of remoteStates){const visual=ensureRemote(id);if(!visual)continue;visual.position.x=THREE.MathUtils.lerp(visual.position.x,target.x,.24);visual.position.y=THREE.MathUtils.lerp(visual.position.y,target.y,.24);visual.position.z=THREE.MathUtils.lerp(visual.position.z,target.z,.24);visual.rotation.y+=angleDelta(visual.rotation.y,target.yaw)*.24;}
}
animateRemotes();

window.addEventListener('beforeunload',()=>{if(connected){connected=false;publishPresence();}disconnectClient();});
