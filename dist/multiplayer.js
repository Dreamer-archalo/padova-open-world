import * as THREE from './vendor/three.module.js';
import {createCar, createPerson} from './world.js';
import {createVehicle, createRider, isBike} from './vehicles.js';
import {createHelicopter} from './modern-vehicles.js';

const USERS = ['Matt', 'Marchese', 'Nino', 'Milo', 'Scando'];
const USER_COLORS = {
  Matt: '#70a7d8',
  Marchese: '#d8b870',
  Nino: '#d87970',
  Milo: '#78bd91',
  Scando: '#ad87d8'
};
const ROOM_ID = 'padova-after-hours-main-v1';
const APP_ID = 'padova-after-hours-online-2026-v1';
const MIN_BOUNDS = {x: -6050, z: -6550, w: 13400, h: 12900};
const POSE_INTERVAL_MS = 100;

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

function addStylesheet() {
  if (document.querySelector('link[data-padova-online]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './online.css';
  link.dataset.padovaOnline = 'true';
  document.head.appendChild(link);
}

function makeDialog() {
  const dialog = document.createElement('dialog');
  dialog.id = 'onlineDialog';
  dialog.innerHTML = `
    <div class="dialog-head">
      <div><span class="eyebrow">PADOVA / ONLINE MAP</span><h2>Choose your user.</h2></div>
      <button class="close" id="closeOnline" aria-label="Close online map">×</button>
    </div>
    <p class="about-copy online-copy">All five users join the same live Padova map. One user can occupy only one slot at a time.</p>
    <div id="onlineUsers" class="online-users"></div>
    <div id="onlineJoinState" class="online-join-state">Select a user to connect.</div>`;
  document.body.appendChild(dialog);
  return dialog;
}

function makeNameTag(name, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(9,23,33,.86)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 376, 88, 22);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#f6f3e9';
  ctx.font = '700 42px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 192, 49);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: texture, transparent: true, depthTest: false}));
  sprite.scale.set(4.8, 1.2, 1);
  sprite.renderOrder = 999;
  return sprite;
}

function createRemoteModel(name, mode, vehicle) {
  const root = new THREE.Group();
  const color = USER_COLORS[name] || '#ffc56a';
  let model;
  if (mode === 'car' && vehicle) {
    if (vehicle === 'airone') model = createHelicopter();
    else if (['mito', 'cinquecento', 'motorcycle', 'scooter', 'truck'].includes(vehicle)) {
      model = createVehicle(vehicle, color);
      if (isBike(vehicle)) model.add(createRider());
    } else model = createCar(color, false, vehicle);
  } else {
    model = createPerson(color, Math.max(0, USERS.indexOf(name)));
  }
  root.add(model);
  const label = makeNameTag(name, color);
  label.position.y = mode === 'car' ? (vehicle === 'truck' ? 4.7 : vehicle === 'airone' ? 4.2 : 2.8) : 2.55;
  root.add(label);
  root.userData.model = model;
  root.userData.label = label;
  return root;
}

function recolorLocalPlayer(runtime, name) {
  const player = runtime.player;
  if (!player) return;
  const color = new THREE.Color(USER_COLORS[name] || '#d9bf8f');
  player.traverse(object => {
    if (!object.userData?.clothing || !object.material?.color) return;
    object.material = object.material.clone();
    object.material.color.copy(color);
  });
}

export function installOnlineMode(runtime) {
  if (!runtime || window.PadovaOnline?.installed) return;
  addStylesheet();

  const offlineButton = $('playBtn');
  const onlineButton = document.createElement('button');
  onlineButton.id = 'onlineBtn';
  onlineButton.className = 'primary online-primary';
  onlineButton.textContent = 'Load Map Online';
  onlineButton.disabled = true;
  offlineButton.insertAdjacentElement('afterend', onlineButton);

  const dialog = makeDialog();
  const userWrap = $('onlineUsers');
  const joinState = $('onlineJoinState');
  const status = document.createElement('div');
  status.id = 'onlineStatus';
  status.hidden = true;
  status.className = 'hud online-status';
  document.body.appendChild(status);

  const miniOverlay = document.createElement('canvas');
  miniOverlay.id = 'onlineMinimapOverlay';
  miniOverlay.width = 440;
  miniOverlay.height = 340;
  $('minimap').insertAdjacentElement('afterend', miniOverlay);

  const fullOverlay = document.createElement('canvas');
  fullOverlay.id = 'onlineFullmapOverlay';
  fullOverlay.width = 1000;
  fullOverlay.height = 1000;
  $('fullmap').insertAdjacentElement('afterend', fullOverlay);

  let selectedName = null;
  let room = null;
  let selfId = null;
  let identityAction = null;
  let poseAction = null;
  let denyAction = null;
  let worldAction = null;
  let accepted = false;
  let joining = false;
  let denied = false;
  let sendTimer = null;
  const peerNames = new Map();
  const peerLocked = new Map();
  const remoteStates = new Map();
  const remoteModels = new Map();

  function updateStatus() {
    if (!accepted) {
      status.hidden = true;
      return;
    }
    const names = [...peerNames.entries()]
      .filter(([peerId]) => peerLocked.get(peerId))
      .map(([, name]) => name)
      .filter(name => USERS.includes(name));
    const unique = new Set([selectedName, ...names]);
    status.hidden = false;
    status.textContent = `ONLINE · ${selectedName} · ${unique.size}/5`;
  }

  function removeRemote(peerId) {
    const remote = remoteModels.get(peerId);
    if (remote?.root?.parent) remote.root.parent.remove(remote.root);
    remoteModels.delete(peerId);
    remoteStates.delete(peerId);
    peerNames.delete(peerId);
    peerLocked.delete(peerId);
    updateStatus();
  }

  function ensureRemote(peerId) {
    if (!peerLocked.get(peerId)) return null;
    const name = peerNames.get(peerId);
    const target = remoteStates.get(peerId);
    if (!name || !target || name === selectedName || !runtime.scene) return null;
    const existing = remoteModels.get(peerId);
    const key = `${target.mode}:${target.vehicle || ''}:${name}`;
    if (existing?.key === key) return existing;
    if (existing?.root?.parent) existing.root.parent.remove(existing.root);
    const root = createRemoteModel(name, target.mode, target.vehicle);
    root.position.set(target.x, target.y, target.z);
    root.rotation.y = target.yaw;
    runtime.scene.add(root);
    const remote = {root, key, name};
    remoteModels.set(peerId, remote);
    return remote;
  }

  function localSnapshot() {
    const state = runtime.state;
    return {
      v: 1,
      name: selectedName,
      x: finite(state.x),
      y: finite(state.y),
      z: finite(state.z),
      yaw: finite(state.yaw),
      mode: state.mode === 'car' ? 'car' : 'foot',
      vehicle: state.mode === 'car' ? (state.car?.style || null) : null,
      health: finite(state.health, 100),
      wanted: finite(state.wanted),
      at: Date.now()
    };
  }

  function sendIdentity(target = null) {
    if (!identityAction || !selectedName) return;
    const options = target ? {target} : undefined;
    identityAction.send({name: selectedName, locked: accepted, version: 1}, options).catch(() => {});
  }

  function failJoin(message) {
    denied = true;
    accepted = false;
    joining = false;
    if (sendTimer) clearInterval(sendTimer);
    sendTimer = null;
    try { room?.leave(); } catch {}
    room = null;
    joinState.textContent = message;
    userWrap.querySelectorAll('button').forEach(button => {
      button.disabled = false;
      button.classList.remove('selected');
    });
    updateStatus();
  }

  function renderUserButtons() {
    userWrap.innerHTML = '';
    USERS.forEach(name => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'online-user';
      button.dataset.user = name;
      button.innerHTML = `<span class="online-dot" style="--online-color:${USER_COLORS[name]}"></span><strong>${name}</strong><small>${accepted && selectedName === name ? 'CONNECTED' : 'AVAILABLE SLOT'}</small>`;
      button.onclick = () => connect(name);
      userWrap.appendChild(button);
    });
  }

  function lockUserButtons() {
    userWrap.querySelectorAll('button').forEach(button => {
      const chosen = button.dataset.user === selectedName;
      button.disabled = !chosen || accepted;
      button.classList.toggle('selected', chosen);
      const small = button.querySelector('small');
      if (small) small.textContent = chosen ? 'CONNECTED' : 'LOCKED';
    });
  }

  async function connect(name) {
    if (joining || accepted) return;
    joining = true;
    denied = false;
    selectedName = name;
    joinState.textContent = `Connecting ${name} to the shared map…`;
    userWrap.querySelectorAll('button').forEach(button => {
      button.disabled = true;
      button.classList.toggle('selected', button.dataset.user === name);
    });

    try {
      const trystero = await import('https://esm.run/trystero@0.25.4');
      selfId = trystero.selfId;
      room = trystero.joinRoom(
        {appId: APP_ID, relayConfig: {redundancy: 4, warnOnRelayFailure: false}},
        ROOM_ID,
        {onJoinError: details => console.warn('Padova online peer join failed', details)}
      );
      identityAction = room.makeAction('identity-v1');
      poseAction = room.makeAction('pose-v1');
      denyAction = room.makeAction('deny-v1');
      worldAction = room.makeAction('world-v1');

      denyAction.onMessage = (message) => {
        if (message?.name === selectedName && !accepted) failJoin(`${selectedName} is already connected. Choose another user.`);
      };

      identityAction.onMessage = (message, {peerId}) => {
        if (!message || !USERS.includes(message.name)) return;
        peerNames.set(peerId, message.name);
        peerLocked.set(peerId, !!message.locked);
        if (message.name === selectedName) {
          const localWins = accepted && !message.locked || accepted === !!message.locked && String(selfId) < String(peerId);
          if (localWins) denyAction.send({name: selectedName}, {target: peerId}).catch(() => {});
          else if (message.locked || !accepted) failJoin(`${selectedName} is already connected. Choose another user.`);
        } else if (message.locked) ensureRemote(peerId);
        updateStatus();
      };

      poseAction.onMessage = (packet, {peerId}) => {
        if (!packet || !peerLocked.get(peerId) || peerNames.get(peerId) !== packet.name) return;
        const clean = {
          x: finite(packet.x), y: finite(packet.y), z: finite(packet.z), yaw: finite(packet.yaw),
          mode: packet.mode === 'car' ? 'car' : 'foot',
          vehicle: typeof packet.vehicle === 'string' ? packet.vehicle : null,
          at: finite(packet.at, Date.now())
        };
        remoteStates.set(peerId, clean);
        ensureRemote(peerId);
      };

      worldAction.onMessage = (packet, {peerId}) => {
        const name = peerNames.get(peerId);
        if (!peerLocked.get(peerId) || !name) return;
        window.dispatchEvent(new CustomEvent('padova-online-world-patch', {detail: {peerId, user: name, ...packet}}));
      };

      room.onPeerJoin = peerId => {
        sendIdentity(peerId);
        if (accepted && runtime.state?.started) poseAction.send(localSnapshot(), {target: peerId}).catch(() => {});
      };
      room.onPeerLeave = removeRemote;

      sendIdentity();
      await sleep(1800);
      if (denied || !room) return;

      accepted = true;
      joining = false;
      sendIdentity();
      recolorLocalPlayer(runtime, selectedName);
      lockUserButtons();
      joinState.textContent = `${selectedName} connected. This user is now locked to this session.`;
      updateStatus();
      runtime.start();
      dialog.close();

      sendTimer = setInterval(() => {
        if (!accepted || !room || !runtime.state?.started) return;
        poseAction.send(localSnapshot()).catch(() => {});
      }, POSE_INTERVAL_MS);
    } catch (error) {
      console.error(error);
      failJoin('Online map is unavailable. Check the internet connection or use Load Map offline.');
    }
  }

  function drawMapOverlays() {
    const state = runtime.state;
    const miniCtx = miniOverlay.getContext('2d');
    miniCtx.clearRect(0, 0, miniOverlay.width, miniOverlay.height);
    const range = state?.mode === 'car' ? 530 : 320;
    const k = miniOverlay.width / range;
    for (const [peerId, remote] of remoteStates) {
      if (!peerLocked.get(peerId)) continue;
      const name = peerNames.get(peerId);
      if (!name) continue;
      const x = (remote.x - state.x) * k + miniOverlay.width / 2;
      const y = (remote.z - state.z) * k + miniOverlay.height / 2;
      if (x < 7 || y < 7 || x > miniOverlay.width - 7 || y > miniOverlay.height - 7) continue;
      miniCtx.fillStyle = USER_COLORS[name] || '#ffc56a';
      miniCtx.strokeStyle = '#101b22';
      miniCtx.lineWidth = 3;
      miniCtx.beginPath();
      miniCtx.arc(x, y, 7, 0, Math.PI * 2);
      miniCtx.fill();
      miniCtx.stroke();
    }

    const fullCtx = fullOverlay.getContext('2d');
    fullCtx.clearRect(0, 0, fullOverlay.width, fullOverlay.height);
    for (const [peerId, remote] of remoteStates) {
      if (!peerLocked.get(peerId)) continue;
      const name = peerNames.get(peerId);
      if (!name) continue;
      const x = (remote.x - MIN_BOUNDS.x) / MIN_BOUNDS.w * fullOverlay.width;
      const y = (remote.z - MIN_BOUNDS.z) / MIN_BOUNDS.h * fullOverlay.height;
      fullCtx.fillStyle = USER_COLORS[name] || '#ffc56a';
      fullCtx.strokeStyle = '#101b22';
      fullCtx.lineWidth = 4;
      fullCtx.beginPath();
      fullCtx.arc(x, y, 10, 0, Math.PI * 2);
      fullCtx.fill();
      fullCtx.stroke();
      fullCtx.fillStyle = '#f6f3e9';
      fullCtx.font = '700 18px system-ui';
      fullCtx.fillText(name, x + 15, y + 6);
    }
  }

  function renderRemotes() {
    for (const [peerId, target] of remoteStates) {
      const remote = ensureRemote(peerId);
      if (!remote) continue;
      const root = remote.root;
      root.position.x += (target.x - root.position.x) * 0.28;
      root.position.y += (target.y - root.position.y) * 0.28;
      root.position.z += (target.z - root.position.z) * 0.28;
      root.rotation.y += angleDelta(target.yaw, root.rotation.y) * 0.32;
    }
    if (runtime.state?.started) drawMapOverlays();
    requestAnimationFrame(renderRemotes);
  }

  renderUserButtons();
  $('closeOnline').onclick = () => {
    if (!joining) dialog.close();
  };
  dialog.addEventListener('cancel', event => {
    if (joining) event.preventDefault();
  });
  onlineButton.onclick = () => {
    if (!runtime.state?.ready || accepted) return;
    renderUserButtons();
    joinState.textContent = 'Select a user to connect.';
    dialog.showModal();
  };

  function armButtons() {
    if (runtime.state?.ready) {
      offlineButton.textContent = 'Load Map';
      onlineButton.disabled = false;
      return;
    }
    requestAnimationFrame(armButtons);
  }
  armButtons();
  requestAnimationFrame(renderRemotes);

  window.addEventListener('beforeunload', () => {
    if (sendTimer) clearInterval(sendTimer);
    try { room?.leave(); } catch {}
  });

  window.PadovaOnline = {
    installed: true,
    get active() { return accepted; },
    get user() { return selectedName; },
    get peers() {
      return [...peerNames.entries()].filter(([peerId]) => peerLocked.get(peerId)).map(([peerId, name]) => ({peerId, name}));
    },
    sendWorldPatch(type, payload) {
      if (!accepted || !worldAction) return false;
      worldAction.send({type, payload, at: Date.now()}).catch(() => {});
      return true;
    }
  };
}
