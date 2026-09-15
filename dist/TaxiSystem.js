const nextFrame = () => new Promise(resolve => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
  else setTimeout(resolve, 0);
});

export class TaxiSystem {
  constructor({overlay, pathfinder, inputManager, timeoutMs = 3000, onResolved, onFallback, onFinally, onDriverReady} = {}) {
    this.overlay = overlay;
    this.pathfinder = pathfinder;
    this.inputManager = inputManager;
    this.timeoutMs = Math.max(500, Number(timeoutMs) || 3000);
    this.onResolved = onResolved;
    this.onFallback = onFallback;
    this.onFinally = onFinally;
    this.onDriverReady = onDriverReady;
    this.runId = 0;
  }

  async travel({destination, price = 0, yaw = 0} = {}) {
    const runId = ++this.runId;
    const token = {cancelled: false};
    let timer = null;
    let road = null;

    console.info('[Taxi Step 1] Inizio selezione destinazione', destination);
    this.inputManager?.disable?.();

    const operation = (async () => {
      console.info('[Taxi Step 2] Caricamento asset 2D splash screen...');
      await this.overlay?.show?.('Preparazione destinazione…');
      if (token.cancelled || runId !== this.runId) return;

      await nextFrame();
      if (token.cancelled || runId !== this.runId) return;

      console.info('[Taxi Step 3] Calcolo percorso/nodo stradale...');
      road = this.pathfinder?.resolveDestination?.(destination) ?? null;
      if (!road) throw new Error('Taxi destination has no bounded road node');
      if (token.cancelled || runId !== this.runId) return;

      await this.onResolved?.({destination, road, price, runId});
      if (token.cancelled || runId !== this.runId) return;

      console.info('[Taxi Step 4] Spawn Driver NPC e sblocco UI.');
      await this.onDriverReady?.({destination, road, runId});
    })();

    const timeoutGuard = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Taxi loading timeout')), this.timeoutMs);
    });

    try {
      await Promise.race([operation, timeoutGuard]);
      return {ok: true, road};
    } catch (error) {
      token.cancelled = true;
      console.warn('[Taxi] Destination transition fallback', error);
      const fallbackRoad = road ?? this.pathfinder?.fallbackPoint?.(destination, yaw) ?? null;
      await this.onFallback?.({destination, road: fallbackRoad, price, error, runId});
      return {ok: false, road: fallbackRoad, error};
    } finally {
      token.cancelled = true;
      if (timer !== null) clearTimeout(timer);
      try { this.overlay?.hide?.(); } catch (error) { console.warn('[Taxi UI] hide failed', error); }
      try { this.inputManager?.enable?.(); } catch (error) { console.warn('[Taxi Input] unlock failed', error); }
      try { await this.onFinally?.({destination, road, runId}); } catch (error) { console.warn('[Taxi] finally handler failed', error); }
    }
  }
}
