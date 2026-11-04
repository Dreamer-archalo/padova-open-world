/* Optional, consent-based metrics for the public game. No gameplay dependency. */
(() => {
  'use strict';
  const ENDPOINT = 'https://studio-progetti-manager.gekorossoeverde.chatgpt.site/api/behavior/collect';
  const PRIVACY = 'https://studio-progetti-manager.gekorossoeverde.chatgpt.site/analytics-privacy';
  const CHOICE_KEY = 'padova-open-world:analytics-consent:v1';
  const VISITOR_KEY = 'padova-open-world:analytics-visitor:v1';
  const MAX_EVENTS = 250;
  const TRACKED_KEYS = new Map([
    ['Escape','Pausa / indietro'], ['KeyM','Mappa'], ['KeyC','Telecamera'],
    ['KeyE','Interazione / veicolo'], ['KeyG','Concessionario'],
    ['KeyJ','Attività / missioni'], ['KeyV','Menu veicoli'],
    ['Digit9','Salto speciale'], ['Numpad9','Salto speciale'],
    ['KeyH','Clacson'], ['KeyX','Pausa'], ['Tab','Turbo / azione speciale']
  ]);
  const controlNames = {
    playBtn:'Avvia / carica il gioco', confirmCharacter:'Conferma personaggio',
    pauseBtn:'Pausa', mapBtn:'Apri mappa', closeMap:'Chiudi mappa',
    closeMenu:'Chiudi menu', missionSelectBtn:'Seleziona missioni',
    activityBtn:'Attività', vehicleMenuBtn:'Menu veicoli',
    dealerBtn:'Concessionario', initialLoaderRetry:'Riprova caricamento',
    aboutBtn:'Informazioni sul mondo', mapHudToggle:'HUD mappa',
    unifiedMapHere:'Mappa: posizione', unifiedMapAll:'Mappa: tutto',
    unifiedZoomIn:'Zoom mappa +', unifiedZoomOut:'Zoom mappa −',
    touchCar:'Entra / esci veicolo', touchJump:'Salto speciale',
    touchTurbo:'Turbo', touchWheelie:'Impennata', touchChute:'Paracadute',
    touchDescend:'Discesa', taxiNext:'Curiosità successiva'
  };
  let sessionId = null;
  let visitorId = null;
  let startedAt = 0;
  let visibleSince = 0;
  let visibleTotal = 0;
  let eventCount = 0;
  let clickIndex = 0;
  let lastZone = '';
  let zoneStartedAt = 0;
  let scrollMax = 0;
  let interval = null;
  const keyTimes = new Map();
  let hover = null;
  let overlay = null;
  const uuid = () => crypto.randomUUID();
  const tidy = (s, len=90) => String(s || '').replace(/[\r\n\t<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,len);
  const activeTime = () => Math.round(visibleTotal + (visibleSince ? performance.now() - visibleSince : 0));
  const device = () => /Android/i.test(navigator.userAgent) ? 'Android' : /iPhone|iPad/i.test(navigator.userAgent) ? 'iOS' : /Mobile/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
  const referrer = () => { try { return document.referrer ? new URL(document.referrer).hostname : 'Diretto'; } catch { return 'Sconosciuto'; } };
  const allowed = () => { try { return localStorage.getItem(CHOICE_KEY) === 'yes'; } catch { return false; } };
  const remember = value => { try { localStorage.setItem(CHOICE_KEY,value); } catch {} };

  function send(type, extra={}, urgent=false) {
    if (!sessionId || !allowed() || (eventCount >= MAX_EVENTS && type !== 'leave')) return;
    eventCount++;
    const payload = JSON.stringify({
      id:uuid(), sessionId, visitorId, consent:true, type,
      path:tidy(location.pathname,140), elapsedMs:Math.min(7200000,activeTime()),
      device:device(), referrer:referrer(), ...extra
    });
    if (urgent && navigator.sendBeacon) {
      try { if(navigator.sendBeacon(ENDPOINT,new Blob([payload],{type:'text/plain'}))) return; } catch {}
    }
    fetch(ENDPOINT, {method:'POST',headers:{'Content-Type':'application/json'},body:payload,
      mode:'cors',credentials:'omit',cache:'no-store',keepalive:urgent}).catch(()=>{});
  }

  function zone() {
    const playing = document.getElementById('playingUI');
    if (!playing || playing.hidden) return 'Menu iniziale';
    const place = tidy(document.getElementById('location')?.textContent,65);
    const district = tidy(document.getElementById('district')?.textContent,45);
    return 'Gioco: '+(place || district || 'Esplorazione');
  }
  function checkZone(force=false) {
    if (!sessionId || (document.hidden && !force)) return;
    const current = zone(), elapsed = activeTime();
    if (!lastZone) { lastZone=current; zoneStartedAt=elapsed; return; }
    if (!force && current===lastZone) return;
    const spent = Math.min(7200000,Math.max(0,elapsed-zoneStartedAt));
    if (spent>=1000) send('section',{section:lastZone,durationMs:spent});
    lastZone=current; zoneStartedAt=elapsed;
  }
  function start() {
    if (sessionId || !allowed()) return;
    try { visitorId=localStorage.getItem(VISITOR_KEY); if(!visitorId || !/^[a-f\d-]{36}$/i.test(visitorId)) { visitorId=uuid();localStorage.setItem(VISITOR_KEY,visitorId); } }
    catch { visitorId=uuid(); }
    sessionId=uuid(); startedAt=performance.now(); visibleSince=document.hidden?0:startedAt;
    visibleTotal=0; eventCount=0; clickIndex=0;
    lastZone=zone();zoneStartedAt=0;
    send('view');
    interval=setInterval(checkZone,4000);
  }
  function stop() {
    if (interval) clearInterval(interval);
    interval=null;sessionId=null;visitorId=null;
  }
  function revoke() {
    if (sessionId) { checkZone(true);send('leave',{durationMs:Math.min(7200000,activeTime())},true); }
    stop();remember('no');
    try { localStorage.removeItem(VISITOR_KEY); } catch {}
  }
  function labelFor(target) {
    const element = target?.closest?.('button,a,[role="button"],select,input,canvas,[data-key]');
    if (!element || overlay?.contains(element) || element.closest('#openworldAnalyticsPrivacy')) return null;
    if (element.matches('input[type="text"],input[type="password"],textarea,[contenteditable]')) return null;
    if (element.id && controlNames[element.id]) return controlNames[element.id];
    if (element.matches('canvas')) return element.id==='world'?'Mondo 3D':'Mappa interattiva';
    if (element.dataset.key) return 'Comando touch: '+tidy(element.dataset.key,30);
    return tidy(element.getAttribute('aria-label')||element.getAttribute('title')||element.textContent||element.id||element.tagName,80);
  }
  function click(e) {
    if (!sessionId || !allowed()) return;
    const name=labelFor(e.target);if(!name)return;
    // Avoid storing large numbers of uninformative clicks on the WebGL canvas.
    if(name==='Mondo 3D') {const last=keyTimes.get(name)||0;if(performance.now()-last<3500)return;keyTimes.set(name,performance.now());}
    clickIndex++;
    send('click',{target:name,clickIndex:Math.min(5000,clickIndex),
      xPercent:Math.min(1000,Math.max(0,Math.round(e.clientX/Math.max(1,innerWidth)*1000))),
      yPercent:Math.min(1000,Math.max(0,Math.round(e.clientY/Math.max(1,innerHeight)*1000)))});
    checkZone();
  }
  function key(e) {
    if (!sessionId || !allowed() || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target?.matches?.('input,select,textarea,[contenteditable]')) return;
    const label=TRACKED_KEYS.get(e.code)||TRACKED_KEYS.get(e.key);if(!label)return;
    const last=keyTimes.get(e.code)||0;
    if(performance.now()-last<2000)return;
    keyTimes.set(e.code,performance.now()); clickIndex++;
    send('click',{target:'Tasto: '+label,clickIndex:Math.min(5000,clickIndex)});
  }
  function scroll() {
    if(!sessionId || !allowed())return;
    const doc=document.documentElement;
    const percent=Math.round(100*window.scrollY/Math.max(1,doc.scrollHeight-innerHeight));
    if(percent<scrollMax+20)return;
    scrollMax=percent;send('scroll',{scrollPercent:Math.min(100,percent),section:zone()});
  }
  function hide() {
    if (!sessionId || !visibleSince) return;
    checkZone(true);
    visibleTotal += performance.now()-visibleSince;visibleSince=0;
    send('leave',{durationMs:Math.min(7200000,activeTime())},true);
  }
  function show() {
    if (!sessionId || visibleSince) return;
    visibleSince=performance.now();lastZone=zone();zoneStartedAt=activeTime();
  }
  function consentPanel() {
    const css=document.createElement('style');
    css.textContent=`#openworldAnalyticsPrivacy{position:fixed;z-index:9998;bottom:8px;left:9px;padding:5px 8px;background:rgba(14,28,35,.84);color:#d2e2e0;border:1px solid #526a70;border-radius:7px;font:11px Arial,sans-serif;cursor:pointer}#openworldConsent{position:fixed;z-index:9999;bottom:45px;left:12px;width:min(370px,calc(100vw - 24px));padding:15px 17px;background:#13242c;color:#f2f4ed;border:1px solid #63777a;border-radius:11px;box-shadow:0 8px 30px #0007;font:13px/1.5 Arial,sans-serif}#openworldConsent[hidden]{display:none!important}#openworldConsent strong{display:block;margin-bottom:4px;font-size:14px}#openworldConsent p{margin:0 0 10px}#openworldConsent a{color:#c5e9e5}#openworldConsent .analytics-actions{display:flex;gap:8px;margin-top:11px}#openworldConsent button{cursor:pointer;padding:8px 13px;border:1px solid #80959b;border-radius:7px;background:transparent;color:#f2f4ed;font-weight:bold}#openworldConsent button.analytics-accept{background:#b5d7d1;color:#14272d;border-color:#b5d7d1}`;
    document.head.appendChild(css);
    const preferences=document.createElement('button');preferences.id='openworldAnalyticsPrivacy';preferences.type='button';preferences.textContent='Privacy statistiche';
    document.body.appendChild(preferences);
    overlay=document.createElement('div');overlay.id='openworldConsent';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Preferenze statistiche');
    overlay.innerHTML='<strong>Statistiche facoltative</strong><p>Possiamo registrare in forma pseudonima aperture, clic, comandi, aree visitate e tempi di gioco. Nessun GPS, testo digitato o registrazione dello schermo. Puoi giocare anche rifiutando.</p><a href="'+PRIVACY+'" target="_blank" rel="noopener noreferrer">Come vengono usati i dati</a><div class="analytics-actions"><button type="button" data-consent="no">Rifiuta</button><button type="button" class="analytics-accept" data-consent="yes">Acconsento</button></div>';
    document.body.appendChild(overlay);
    overlay.hidden=localStorageChoiceExists();
    overlay.addEventListener('click',e=>{
      const value=e.target.closest?.('[data-consent]')?.dataset.consent;
      if(!value)return;
      if(value==='yes'){remember('yes');start();}else revoke();
      overlay.hidden=true;
    });
    preferences.onclick=()=>{overlay.hidden=!overlay.hidden;};
  }
  function localStorageChoiceExists(){try{return ['yes','no'].includes(localStorage.getItem(CHOICE_KEY));}catch{return false;}}
  function ready(){
    consentPanel();if(allowed())start();
    document.addEventListener('click',click,true);
    document.addEventListener('keydown',key,true);
    document.addEventListener('scroll',scroll,{passive:true});
    document.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse'||!sessionId)return;const label=labelFor(e.target);if(label)hover={label,at:performance.now()};},{passive:true});
    document.addEventListener('pointerout',e=>{if(e.pointerType!=='mouse'||!hover||!sessionId)return;const label=labelFor(e.target);if(label!==hover.label)return;const time=Math.round(performance.now()-hover.at);if(time>=900)send('hover',{target:hover.label,durationMs:Math.min(120000,time)});hover=null;},{passive:true});
    document.addEventListener('visibilitychange',()=>document.hidden?hide():show());
    window.addEventListener('pagehide',hide);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
