const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export class TaxiLoadingOverlay {
  constructor({overlay, meme, status, assetUrl = new URL('./assets/taxi-loading-pixel-atlas.webp', import.meta.url).href, assetTimeoutMs = 1000} = {}) {
    this.overlay = overlay ?? null;
    this.meme = meme ?? null;
    this.status = status ?? null;
    this.assetUrl = assetUrl;
    this.assetTimeoutMs = Math.max(100, Number(assetTimeoutMs) || 1000);
    this.assetState = 'idle';
    this.assetPromise = null;
  }

  setStatus(text) {
    if (this.status) this.status.textContent = String(text ?? '');
  }

  preloadSplash() {
    if (this.assetState === 'ready') return Promise.resolve(true);
    if (this.assetState === 'failed') return Promise.resolve(false);
    if (this.assetPromise) return this.assetPromise;

    this.assetPromise = new Promise(resolve => {
      if (typeof Image === 'undefined') {
        this.assetState = 'failed';
        resolve(false);
        return;
      }

      const img = new Image();
      let settled = false;
      const finish = ok => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        img.onload = null;
        img.onerror = null;
        this.assetState = ok ? 'ready' : 'failed';
        if (!ok) console.warn('[Taxi UI] Immagine 2D non trovata/fallita. Continuo senza splash screen.');
        resolve(ok);
      };

      const timer = setTimeout(() => {
        console.warn('[Taxi UI] Timeout caricamento splash dopo ' + this.assetTimeoutMs + 'ms. Continuo senza immagine.');
        finish(false);
      }, this.assetTimeoutMs);

      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      img.decoding = 'async';
      img.src = this.assetUrl;
    });

    return this.assetPromise;
  }

  async show(message = 'Preparazione destinazione…') {
    if (this.overlay) this.overlay.hidden = false;
    this.setStatus(message);
    const loaded = await Promise.race([
      this.preloadSplash(),
      wait(this.assetTimeoutMs + 50).then(() => false),
    ]);
    this.meme?.classList.toggle('taxi-splash-unavailable', !loaded);
    return loaded;
  }

  hide() {
    if (this.overlay) this.overlay.hidden = true;
    this.meme?.classList.remove('taxi-splash-unavailable');
  }
}
