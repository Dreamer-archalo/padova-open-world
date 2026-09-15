const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export class TaxiSystem {
  constructor({
    inputManager,
    timeoutMs = 3000,
    executeTeleport,
    forcePlayerPosition,
    onFinally,
  } = {}) {
    this.inputManager = inputManager ?? null;
    this.timeoutMs = Math.max(500, Number(timeoutMs) || 3000);
    this.executeTeleport = executeTeleport ?? (async () => {});
    this.forcePlayerPosition = forcePlayerPosition ?? (async () => {});
    this.onFinally = onFinally ?? (async () => {});
    this.runId = 0;
  }

  validTarget(targetCoords) {
    return !!targetCoords && Number.isFinite(targetCoords.x) && Number.isFinite(targetCoords.z);
  }

  async travel({targetCoords, destination = null, price = 0, yaw = 0} = {}) {
    if (!this.validTarget(targetCoords)) throw new Error('Invalid static taxi coordinates');

    const runId = ++this.runId;
    const target = {
      x: Number(targetCoords.x),
      y: Number.isFinite(targetCoords.y) ? Number(targetCoords.y) : 0,
      z: Number(targetCoords.z),
      yaw: Number.isFinite(targetCoords.yaw) ? Number(targetCoords.yaw) : Number(yaw) || 0,
    };
    let timer = null;

    this.inputManager?.disable?.();

    const operation = (async () => {
      await delay(0);
      if (runId !== this.runId) return;
      await this.executeTeleport({targetCoords: target, destination, price, runId});
    })();

    const timeoutGuard = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Taxi loading timeout')), this.timeoutMs);
    });

    try {
      await Promise.race([operation, timeoutGuard]);
      return {ok: true, targetCoords: target};
    } catch (error) {
      console.error('[Taxi Error] Direct transition fallback', error);
      await this.forcePlayerPosition({targetCoords: target, destination, price, error, runId});
      return {ok: false, targetCoords: target, error};
    } finally {
      if (timer !== null) clearTimeout(timer);
      try { this.inputManager?.enable?.(); } catch (error) { console.warn('[Taxi Input] unlock failed', error); }
      try { await this.onFinally({targetCoords: target, destination, runId}); } catch (error) { console.warn('[Taxi] finally handler failed', error); }
    }
  }
}
