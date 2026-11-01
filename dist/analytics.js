import { ANALYTICS_WEBSITE_ID, ANALYTICS_SCRIPT_URL } from './analytics-config.js';

// Il gioco e il sito restano completamente utilizzabili se l'analisi non e'
// configurata, se un ad blocker blocca Umami o se la rete non e' disponibile.
const SITE_HOST = 'dreamer-archalo.github.io';
const websiteId = String(ANALYTICS_WEBSITE_ID || '').trim();
const enabled = location.hostname === SITE_HOST
  && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(websiteId)
  && navigator.globalPrivacyControl !== true
  && navigator.doNotTrack !== '1';

if (enabled) {
  const pendingEvents = [];

  function record(name) {
    // Solo eventi aggregati: mai nomi, identificativi, posizione o dati di gioco.
    if (typeof window.umami?.track === 'function') {
      window.umami.track(name);
    } else if (pendingEvents.length < 3) {
      pendingEvents.push(name);
    }
  }

  const script = document.createElement('script');
  script.src = ANALYTICS_SCRIPT_URL;
  script.async = true;
  script.dataset.websiteId = websiteId;
  script.dataset.domains = SITE_HOST;
  script.dataset.analyticsOptional = 'true';
  script.addEventListener('load', () => {
    while (pendingEvents.length && typeof window.umami?.track === 'function') {
      window.umami.track(pendingEvents.shift());
    }
  });
  script.addEventListener('error', () => { pendingEvents.length = 0; });
  document.head.append(script);

  // La pageview e la provenienza sono registrate automaticamente da Umami.
  // Questi due eventi consentono di distinguere un click da una partita avviata.
  const playButton = document.getElementById('playBtn');
  if (playButton) {
    playButton.addEventListener('click', () => {
      if (playButton.dataset.analyticsClicked) return;
      playButton.dataset.analyticsClicked = 'true';
      record('game_load_requested');
    });
  }

  const playing = document.getElementById('playingUI');
  if (playing) {
    let entered = false;
    const recordEntry = () => {
      if (entered || playing.hidden) return;
      entered = true;
      observer.disconnect();
      record('game_entered');
    };
    const observer = new MutationObserver(recordEntry);
    observer.observe(playing, { attributes: true, attributeFilter: ['hidden'] });
    recordEntry();
  }
}
