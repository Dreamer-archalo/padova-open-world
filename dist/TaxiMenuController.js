export class TaxiMenuController {
  constructor({
    document,
    menu,
    mapDialog,
    menuContent,
    mapPlaces,
    fullMap,
    overlay,
    status,
    inputManager,
    bounds,
    setPaused,
    drawFullMap,
    getFare,
    executeTransition,
    onError,
    onMapPickingChange,
    delayMs = 50,
  } = {}) {
    this.document = document ?? globalThis.document;
    this.menu = menu ?? null;
    this.mapDialog = mapDialog ?? null;
    this.menuContent = menuContent ?? null;
    this.mapPlaces = mapPlaces ?? null;
    this.fullMap = fullMap ?? null;
    this.overlay = overlay ?? null;
    this.status = status ?? null;
    this.inputManager = inputManager ?? null;
    this.bounds = bounds ?? null;
    this.setPaused = setPaused ?? (() => {});
    this.drawFullMap = drawFullMap ?? (() => {});
    this.getFare = getFare ?? (() => 0);
    this.executeTransition = executeTransition ?? (async () => {});
    this.onError = onError ?? ((error) => console.error('[Taxi Error]', error));
    this.onMapPickingChange = onMapPickingChange ?? (() => {});
    this.delayMs = Math.max(0, Number(delayMs) || 50);
    this.destinations = new Map();
    this.lastDestinations = [];
    this.pending = null;
    this.mapPicking = false;
    this.busy = false;
    this.transitionTimer = null;
  }

  validCoords(coords) {
    if (!coords || !Number.isFinite(coords.x) || !Number.isFinite(coords.z)) return false;
    if (!this.bounds) return true;
    return coords.x >= this.bounds.x && coords.x <= this.bounds.x + this.bounds.w &&
      coords.z >= this.bounds.z && coords.z <= this.bounds.z + this.bounds.h;
  }

  staticCoords(destination, index = 0) {
    if (!this.validCoords(destination)) return null;
    return {
      id: String(destination.id ?? `taxi_${index}`),
      name: String(destination.name ?? `Destinazione ${index + 1}`),
      tag: String(destination.tag ?? ''),
      x: Number(destination.x),
      y: Number.isFinite(destination.y) ? Number(destination.y) : 0,
      z: Number(destination.z),
      yaw: Number.isFinite(destination.yaw) ? Number(destination.yaw) : 0,
    };
  }

  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  fareFor(coords) {
    try {
      const value = Number(this.getFare(coords));
      return Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
    } catch (error) {
      this.onError(error, 'fare calculation');
      return null;
    }
  }

  setMapPicking(value) {
    this.mapPicking = !!value;
    this.onMapPickingChange(this.mapPicking);
  }

  isMapPicking() {
    return this.mapPicking;
  }

  lockPointerEvents() {
    if (this.menu) this.menu.style.pointerEvents = 'none';
    if (this.mapDialog) this.mapDialog.style.pointerEvents = 'none';
    if (this.menuContent) this.menuContent.style.pointerEvents = 'none';
    if (this.mapPlaces) this.mapPlaces.style.pointerEvents = 'none';
  }

  unlockPointerEvents() {
    if (this.menu) this.menu.style.pointerEvents = '';
    if (this.mapDialog) this.mapDialog.style.pointerEvents = '';
    if (this.menuContent) this.menuContent.style.pointerEvents = '';
    if (this.mapPlaces) this.mapPlaces.style.pointerEvents = '';
  }

  closeAllTaxiUI() {
    this.setMapPicking(false);
    try { if (this.menu?.open) this.menu.close(); } catch {}
    try { if (this.mapDialog?.open) this.mapDialog.close(); } catch {}
    this.setPaused(false);
  }

  showFastFadeOverlay() {
    if (this.overlay) {
      this.overlay.hidden = false;
      this.overlay.classList.add('taxi-fast-transition');
    }
    if (this.status) this.status.textContent = 'Trasferimento taxi…';
  }

  hideFastFadeOverlay() {
    if (this.overlay) {
      this.overlay.hidden = true;
      this.overlay.classList.remove('taxi-fast-transition');
    }
  }

  openList(destinations = []) {
    if (!this.menu || !this.menuContent) throw new Error('Taxi menu DOM unavailable');
    this.pending = null;
    this.lastDestinations = [...destinations];
    this.destinations.clear();
    const rows = [];
    destinations.forEach((destination, index) => {
      const coords = this.staticCoords(destination, index);
      if (!coords) return;
      this.destinations.set(coords.id, coords);
      const price = this.fareFor(coords);
      const fareText = price === null ? 'Tariffa da calcolare' : `€${price}`;
      rows.push(`<button class="activity" data-taxi-id="${this.escapeHtml(coords.id)}"><span><b>${this.escapeHtml(coords.name)}</b><small>${this.escapeHtml(coords.tag)}${coords.tag ? ' · ' : ''}${fareText}</small></span></button>`);
    });
    rows.push('<button class="activity" id="taxiChoose"><span><b>SCEGLI TU</b><small>Indica un punto sulla mappa · tariffa mostrata prima della conferma</small></span></button>');
    this.menuContent.innerHTML = `<div class="activities">${rows.join('')}</div>`;
    this.setPaused(true);
    if (!this.menu.open) this.menu.showModal();
    this.unlockPointerEvents();

    this.menuContent.querySelectorAll('[data-taxi-id]').forEach(button => {
      button.addEventListener('click', event => this.onSelectFromList(button.dataset.taxiId, event), {once: true});
    });
    this.menuContent.querySelector('#taxiChoose')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      this.openMap();
    }, {once: true});
  }

  openMap() {
    if (!this.mapDialog || !this.mapPlaces) throw new Error('Taxi map DOM unavailable');
    this.pending = null;
    try { if (this.menu?.open) this.menu.close(); } catch {}
    this.unlockPointerEvents();
    this.setMapPicking(true);
    this.setPaused(true);
    this.mapPlaces.innerHTML = '<span class="eyebrow">SCEGLI TU</span><p class="about-copy">Tocca un punto sulla mappa. Prima di partire ti mostreremo la tariffa e ti chiederemo conferma.</p>';
    if (!this.mapDialog.open) this.mapDialog.showModal();
    this.drawFullMap();
  }

  onSelectFromList(destinationId, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    const coords = this.destinations.get(String(destinationId));
    if (!coords) return false;
    return this.startTaxiTransition(coords, {source: 'list', name: coords.name, tag: coords.tag});
  }

  worldCoordsFromPointer(event) {
    const canvas = this.fullMap;
    const bounds = this.bounds;
    if (!canvas || !bounds || !event) return null;
    const rect = canvas.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    if (!Number.isFinite(size) || size <= 0 || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return null;
    const offsetX = (rect.width - size) / 2;
    const offsetY = (rect.height - size) / 2;
    const px = event.clientX - rect.left - offsetX;
    const py = event.clientY - rect.top - offsetY;
    if (![px, py].every(Number.isFinite) || px < 0 || py < 0 || px > size || py > size) return null;
    const x = bounds.x + px / size * bounds.w;
    const z = bounds.z + py / size * bounds.h;
    return this.validCoords({x, z}) ? {x, y: 0, z, yaw: 0, name: 'Destinazione personalizzata'} : null;
  }

  onSelectFromMap(worldX, worldZ, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    const coords = {x: Number(worldX), y: 0, z: Number(worldZ), yaw: 0, name: 'Destinazione personalizzata'};
    if (!this.validCoords(coords)) return false;
    return this.startTaxiTransition(coords, {source: 'map', name: coords.name, tag: 'Mappa'});
  }

  handleMapPointer(event) {
    if (!this.mapPicking) return false;
    const coords = this.worldCoordsFromPointer(event);
    if (!coords) {
      this.onError(new Error('Taxi map conversion returned invalid coordinates'), 'map conversion');
      return true;
    }
    this.onSelectFromMap(coords.x, coords.z, event);
    return true;
  }

  openConfirmation(targetCoords, meta = {}) {
    if (this.busy) return false;
    if (!this.validCoords(targetCoords)) {
      this.onError(new Error('Invalid static taxi target'), 'static destination');
      return false;
    }
    const fare = this.fareFor(targetCoords);
    if (fare === null) {
      this.onError(new Error('Unable to calculate taxi fare'), 'fare calculation');
      return false;
    }

    const target = {...targetCoords};
    this.pending = {targetCoords: target, meta: {...meta, quotedFare: fare}, fare};
    this.setMapPicking(false);
    try { if (this.mapDialog?.open) this.mapDialog.close(); } catch {}
    this.setPaused(true);
    this.unlockPointerEvents();

    const title = this.document?.getElementById?.('menuTitle');
    if (title) title.textContent = 'Conferma taxi';
    if (!this.menu || !this.menuContent) throw new Error('Taxi confirmation DOM unavailable');
    const name = this.escapeHtml(meta.name || target.name || 'Destinazione');
    const tag = this.escapeHtml(meta.tag || '');
    this.menuContent.innerHTML = `<p class="about-copy"><strong>${name}</strong>${tag ? `<br>${tag}` : ''}<br><br>Tariffa calcolata: <strong>€${fare}</strong>.<br>Confermi lo spostamento?</p><div class="menu-actions"><button class="primary" id="confirmTaxi">CONFERMA · €${fare}</button><button id="cancelTaxiConfirm">INDIETRO</button></div>`;
    if (!this.menu.open) this.menu.showModal();

    this.menuContent.querySelector('#confirmTaxi')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      this.executeConfirmedTransition();
    }, {once: true});
    this.menuContent.querySelector('#cancelTaxiConfirm')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const source = this.pending?.meta?.source;
      this.pending = null;
      if (source === 'map') this.openMap();
      else this.openList(this.lastDestinations);
    }, {once: true});
    return true;
  }

  startTaxiTransition(targetCoords, meta = {}) {
    return this.openConfirmation(targetCoords, meta);
  }

  executeConfirmedTransition() {
    if (this.busy || !this.pending) return false;
    const {targetCoords, meta} = this.pending;
    this.pending = null;
    if (!this.validCoords(targetCoords)) {
      this.onError(new Error('Invalid confirmed taxi target'), 'confirmed destination');
      return false;
    }

    this.busy = true;
    this.lockPointerEvents();
    this.inputManager?.disable?.();
    console.warn('[Taxi Step 1] Destinazione confermata dopo preventivo tariffa', targetCoords, meta.quotedFare);
    this.closeAllTaxiUI();
    this.showFastFadeOverlay();
    console.warn('[Taxi Step 2] UI chiusa; rilascio del thread al browser');

    const target = {...targetCoords};
    this.transitionTimer = setTimeout(async () => {
      try {
        console.warn('[Taxi Step 3] Esecuzione transizione su coordinate statiche');
        await this.executeTransition({targetCoords: target, meta});
        console.warn('[Taxi Step 4] Transizione completata; controlli sbloccati');
      } catch (error) {
        console.error('[Taxi Error] Fallback coordinata diretta:', error);
        this.onError(error, 'async taxi transition');
      } finally {
        this.transitionTimer = null;
        this.hideFastFadeOverlay();
        this.inputManager?.enable?.();
        this.unlockPointerEvents();
        this.setPaused(false);
        this.busy = false;
      }
    }, this.delayMs);

    return true;
  }

  cancel() {
    this.pending = null;
    this.setMapPicking(false);
    this.hideFastFadeOverlay();
    this.unlockPointerEvents();
    this.inputManager?.enable?.();
    this.busy = false;
  }
}
