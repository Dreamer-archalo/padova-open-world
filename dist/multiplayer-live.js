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
const CHARACTER_LABELS={Matt:'Mattia',Marchese:'Marchese',Nino:'Nino',Milo:'Milo',Scando:'Fede'};
const ROOM_ID='padova-after-hours-main-v2';
const APP_ID='padova-after-hours-online-2026-live';
const MIN_BOUNDS={x:-6050,z:-6550,w:13400,h:12900};
const POSE_INTERVAL=100;
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

let activeGame=null;
const previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__padovaOnlineCapture){
  ModernGameplay.prototype.__padovaOnlineCapture=true;
  ModernGameplay.prototype.update=function(dt){activeGame=this;return previousUpdate.call(this,dt);};
}

function injectStyles(){
  if($('padovaOnlineStyles'))return;
  const s=document.createElement('style');s.id='padovaOnlineStyles';s.textContent=`
#onlineBtn{min-width:200px;background:#173342;border-color:#ffc56a;color:#ffc56a}#onlineBtn:hover{background:#21495d;color:#fff4d9}#onlineBtn:disabled{opacity:.45}
#onlineDialog{width:min(590px,92vw)}.online-copy{margin-top:0}.online-users{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin:20px 0}.online-user{min-height:92px;padding:12px 7px;border-radius:5px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:#172d3b}.online-user strong{font-size:15px}.online-user small{font-size:9px;color:#9fb0b8;letter-spacing:.7px}.online-user.selected{border-color:#ffc56a;background:#263d47}.online-dot{width:13px;height:13px;border-radius:50%;background:var(--online-color);box-shadow:0 0 0 3px #ffffff14}.online-join-state{font-size:13px;color:#b9c7cd;min-height:21px}.online-status{top:82px;right:36px;padding:8px 12px;background:#10242ee8;border:1px solid #ffc56a80;border-radius:4px;font-size:11px;letter-spacing:1px;color:#ffc56a;z-index:5}.minimap{position:fixed}.online-mini-overlay{position:absolute;left:0;top:0;width:100%;height:180px;pointer-events:none;z-index:3}.fullmap-wrap{position:relative}.online-full-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3}.online-tag{pointer-events:none}@media(max-width:800px){.online-users{grid-template-columns:repeat(2,1fr)}.online-status{top:68px;right:20px}.online-mini-overlay{height:135px}}`;
  document.head.appendChild(s);
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
  root.add(model);
  const tag=nameSprite(name,color);tag.position.y=mode==='car'?(vehicle==='truck'?4.8:vehicle==='airone'?4.3:3.0):2.65;root.add(tag);
  return root;
}

function installUI(){
  injectStyles();
  const play=$('playBtn');if(!play||$('onlineBtn'))return;
  const online=document.createElement('button');online.id='onlineBtn';online.className='primary';online.textContent='Load Map Online';online.disabled=play.disabled;play.insertAdjacentElement('afterend',online);
  new MutationObserver(()=>online.disabled=play.disabled).observe(play,{attributes:true,attributeFilter:['disabled']});
  const dialog=document.createElement('dialog');dialog.id='onlineDialog';dialog.innerHTML=`<div class="dialog-head"><div><span class="eyebrow">PADOVA / ONLINE MAP</span><h2>Choose your user.</h2></div><button class="close" id="closeOnline" aria-label="Close online map">×</button></div><p class="about-copy online-copy">Same live Padova map for up to five players. Each name can be used by only one connected player.</p><div id="onlineUsers" class="online-users"></div><div id="onlineJoinState" class="online-join-state">Select a user to connect.</div>`;document.body.appendChild(dialog);
  const status=document.createElement('div');status.id='onlineStatus';status.className='hud online-status';status.hidden=true;document.body.appendChild(status);
  online.onclick=()=>{if(!play.disabled&&!dialog.open)dialog.showModal();};$('closeOnline').onclick=()=>{if(!window.PadovaOnline?.joining&&!window.PadovaOnline?.connected)dialog.close();};
}

installUI();

let selectedName=null,room=null,selfId=null,identityAction=null,poseAction=null,denyAction=null,worldAction=null,joining=false,connected=false,sendTimer=null;
const peers=new Map(),remoteStates=new Map(),remoteModels=new Map();
const onlineState={get joining(){return joining;},get connected(){return connected;},get user(){return selectedName;},broadcastWorldPatch:patch=>connected&&worldAction?.send({patch,at:Date.now()}).catch(()=>{})};window.PadovaOnline=onlineState;

function statusText(){
  const status=$('onlineStatus');if(!status)return;if(!connected){status.hidden=true;return;}
  const names=new Set([selectedName]);for(const p of peers.values())if(p.locked&&USERS.includes(p.name))names.add(p.name);
  status.hidden=false;status.textContent=`ONLINE · ${selectedName} · ${names.size}/5`;
}

function renderButtons(){
  const wrap=$('onlineUsers');if(!wrap)return;wrap.innerHTML='';
  for(const name of USERS){const b=document.createElement('button');b.className='online-user';b.dataset.user=name;b.innerHTML=`<span class="online-dot" style="--online-color:${USER_COLORS[name]}"></span><strong>${name}</strong><small>AVAILABLE SLOT</small>`;b.onclick=()=>connect(name);wrap.appendChild(b);}
}
renderButtons();

function lockButtons(){document.querySelectorAll('#onlineUsers .online-user').forEach(b=>{const chosen=b.dataset.user===selectedName;b.disabled=true;b.classList.toggle('selected',chosen);b.querySelector('small').textContent=chosen?'CONNECTED':'LOCKED';});}
function sendIdentity(target){if(!identityAction||!selectedName)return;identityAction.send({name:selectedName,locked:connected,v:2},target?{target}:undefined).catch(()=>{});}
function cleanupRemote(peerId){const visual=remoteModels.get(peerId);if(visual?.parent)visual.parent.remove(visual);remoteModels.delete(peerId);remoteStates.delete(peerId);peers.delete(peerId);statusText();}
function fail(message){joining=false;connected=false;if(sendTimer)clearInterval(sendTimer);sendTimer=null;try{room?.leave();}catch{}room=null;peers.clear();for(const id of [...remoteModels.keys()])cleanupRemote(id);const state=$('onlineJoinState');if(state)state.textContent=message;document.querySelectorAll('#onlineUsers .online-user').forEach(b=>{b.disabled=false;b.classList.remove('selected');const s=b.querySelector('small');if(s)s.textContent='AVAILABLE SLOT';});statusText();}

function snapshot(){
  const s=activeGame?.state;if(!s)return null;return {name:selectedName,x:finite(s.x),y:finite(s.y),z:finite(s.z),yaw:finite(s.yaw),mode:s.mode==='car'?'car':'foot',vehicle:s.mode==='car'?(s.car?.style||null):null,at:Date.now()};
}

function ensureRemote(peerId){
  if(!activeGame?.scene)return null;const peer=peers.get(peerId),target=remoteStates.get(peerId);if(!peer?.locked||!target||peer.name===selectedName)return null;
  const key=`${peer.name}:${target.mode}:${target.vehicle||''}`;let visual=remoteModels.get(peerId);
  if(visual?.userData.onlineKey===key)return visual;
  if(visual?.parent)visual.parent.remove(visual);
  visual=remoteModel(peer.name,target.mode,target.vehicle);visual.userData.onlineKey=key;visual.position.set(target.x,target.y,target.z);visual.rotation.y=target.yaw;activeGame.scene.add(visual);remoteModels.set(peerId,visual);return visual;
}

function autoStartCharacter(){
  const play=$('playBtn');if(!play)return;play.click();const wanted=CHARACTER_LABELS[selectedName];let tries=0;
  const timer=setInterval(()=>{tries++;const picker=$('characterPicker');if(picker&&!picker.hidden){const button=[...document.querySelectorAll('#characterChoices button')].find(b=>b.textContent.trim()===wanted);button?.click();$('confirmCharacter')?.click();clearInterval(timer);}else if(!$('playingUI')?.hidden||tries>30)clearInterval(timer);},80);
}

async function connect(name){
  if(joining||connected)return;joining=true;selectedName=name;$('onlineJoinState').textContent=`Connecting ${name} to the shared map…`;document.querySelectorAll('#onlineUsers .online-user').forEach(b=>{b.disabled=true;b.classList.toggle('selected',b.dataset.user===name);});
  try{
    const trystero=await import('https://esm.run/trystero@0.25.4');selfId=trystero.selfId;room=trystero.joinRoom({appId:APP_ID,relayConfig:{redundancy:4,warnOnRelayFailure:false}},ROOM_ID,{onJoinError:e=>console.warn('Padova online join',e)});
    identityAction=room.makeAction('identity-v2');poseAction=room.makeAction('pose-v2');denyAction=room.makeAction('deny-v2');worldAction=room.makeAction('world-v2');
    denyAction.onMessage=msg=>{if(msg?.name===selectedName)fail(`${selectedName} is already connected. Choose another user.`);};
    identityAction.onMessage=(msg,{peerId})=>{
      if(!msg||!USERS.includes(msg.name))return;peers.set(peerId,{name:msg.name,locked:!!msg.locked});
      if(msg.name===selectedName){
        if(connected&&msg.locked){if(String(peerId)<String(selfId))fail(`${selectedName} is already connected. Choose another user.`);else denyAction.send({name:selectedName},{target:peerId}).catch(()=>{});}
        else if(connected&&!msg.locked)sendIdentity(peerId);
      }
      statusText();
    };
    poseAction.onMessage=(packet,{peerId})=>{const p=peers.get(peerId);if(!p?.locked||packet?.name!==p.name)return;remoteStates.set(peerId,{x:finite(packet.x),y:finite(packet.y),z:finite(packet.z),yaw:finite(packet.yaw),mode:packet.mode==='car'?'car':'foot',vehicle:typeof packet.vehicle==='string'?packet.vehicle:null,at:finite(packet.at,Date.now())});ensureRemote(peerId);};
    worldAction.onMessage=(packet,{peerId})=>{const p=peers.get(peerId);if(p?.locked)window.dispatchEvent(new CustomEvent('padova-online-world-patch',{detail:{peerId,user:p.name,...packet}}));};
    room.onPeerJoin=peerId=>{sendIdentity(peerId);const snap=snapshot();if(connected&&snap)poseAction.send(snap,{target:peerId}).catch(()=>{});};room.onPeerLeave=cleanupRemote;
    sendIdentity();await sleep(1600);if(!room||!joining)return;
    const contenders=[...peers.entries()].filter(([,p])=>p.name===selectedName);const locked=contenders.find(([,p])=>p.locked);if(locked){fail(`${selectedName} is already connected. Choose another user.`);return;}
    const winner=[String(selfId),...contenders.map(([id])=>String(id))].sort()[0];if(winner!==String(selfId)){fail(`${selectedName} was selected at the same time on another device. Choose another user.`);return;}
    connected=true;joining=false;sendIdentity();lockButtons();$('onlineJoinState').textContent=`${selectedName} connected. This slot is locked while you are online.`;statusText();autoStartCharacter();
    sendTimer=setInterval(()=>{const snap=snapshot();if(connected&&snap)poseAction.send(snap).catch(()=>{});},POSE_INTERVAL);
  }catch(error){console.error(error);fail('Online map unavailable. Check the internet connection or use Load Map offline.');}
}

function installOverlays(){
  if(!$('onlineMiniOverlay')){const c=document.createElement('canvas');c.id='onlineMiniOverlay';c.className='online-mini-overlay';c.width=440;c.height=340;$('minimap')?.insertAdjacentElement('afterend',c);}
  if(!$('onlineFullOverlay')){const c=document.createElement('canvas');c.id='onlineFullOverlay';c.className='online-full-overlay';c.width=1000;c.height=1000;$('fullmap')?.insertAdjacentElement('afterend',c);}
}
installOverlays();

function drawOverlays(){
  if(!activeGame?.state)return;const s=activeGame.state,mini=$('onlineMiniOverlay'),full=$('onlineFullOverlay');
  if(mini){const c=mini.getContext('2d');c.clearRect(0,0,mini.width,mini.height);const range=s.mode==='car'?530:320,k=mini.width/range;for(const [id,r] of remoteStates){const p=peers.get(id);if(!p?.locked)continue;const x=(r.x-s.x)*k+mini.width/2,y=(r.z-s.z)*k+mini.height/2;if(x<7||y<7||x>mini.width-7||y>mini.height-7)continue;c.fillStyle=USER_COLORS[p.name]||'#ffc56a';c.strokeStyle='#101b22';c.lineWidth=3;c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.fill();c.stroke();}}
  if(full){const c=full.getContext('2d');c.clearRect(0,0,full.width,full.height);for(const [id,r] of remoteStates){const p=peers.get(id);if(!p?.locked)continue;const x=(r.x-MIN_BOUNDS.x)/MIN_BOUNDS.w*full.width,y=(r.z-MIN_BOUNDS.z)/MIN_BOUNDS.h*full.height;c.fillStyle=USER_COLORS[p.name]||'#ffc56a';c.strokeStyle='#101b22';c.lineWidth=4;c.beginPath();c.arc(x,y,9,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#f6f3e9';c.font='700 17px system-ui';c.fillText(p.name,x+13,y+6);}}
}

function frame(){requestAnimationFrame(frame);if(!activeGame?.scene)return;const now=Date.now();for(const [peerId,target] of remoteStates){if(now-target.at>12000){cleanupRemote(peerId);continue;}const visual=ensureRemote(peerId);if(!visual)continue;visual.position.x+=(target.x-visual.position.x)*.28;visual.position.y+=(target.y-visual.position.y)*.28;visual.position.z+=(target.z-visual.position.z)*.28;visual.rotation.y+=angleDelta(visual.rotation.y,target.yaw)*.28;}drawOverlays();}
requestAnimationFrame(frame);
