import {collides, nearestOnSegment, pointInside, clamp} from './core.js';

// Rendering may run at any refresh rate. Simulation always advances in 1/60 s steps.
export class FixedClock {
  constructor(step = 1 / 60, maxSteps = 8) { this.step = step; this.maxSteps = maxSteps; this.accumulator = 0; }
  reset() { this.accumulator = 0; }
  advance(delta, tick) {
    this.accumulator += clamp(Number.isFinite(delta) ? delta : 0, 0, this.step * this.maxSteps);
    let count = 0;
    while (this.accumulator + 1e-10 >= this.step && count < this.maxSteps) {
      tick(this.step); this.accumulator = Math.max(0, this.accumulator - this.step); count++;
    }
    return this.accumulator / this.step;
  }
}

// Conservative substeps prevent crossing even thin walls; contact projection allows
// walking along angled façades without the old axis-dependent stopping/stuttering.
export function slideMove(pos, dx, dz, radius, index) {
  let x = pos.x, z = pos.z, hit = false;
  const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (radius * .45)));
  for (let step = 0; step < count; step++) {
    let vx = dx / count, vz = dz / count;
    for (let contact = 0; contact < 3; contact++) {
      const obstacle = collides(x + vx, z + vz, radius, index);
      if (!obstacle) { x += vx; z += vz; break; }
      hit = true;
      let lo = 0, hi = 1;
      for (let k = 0; k < 10; k++) {
        const t = (lo + hi) / 2;
        if (collides(x + vx * t, z + vz * t, radius, index)) hi = t; else lo = t;
      }
      x += vx * lo; z += vz * lo;
      let best = null, distance = Infinity;
      for (let j = 0; j < obstacle.p.length; j++) {
        const q = nearestOnSegment(x, z, obstacle.p[j], obstacle.p[(j + 1) % obstacle.p.length]);
        const d = Math.hypot(x - q.x, z - q.z);
        if (d < distance) { distance = d; best = q; }
      }
      if (!best || distance < 1e-8) break;
      const nx = (x - best.x) / distance, nz = (z - best.z) / distance;
      vx *= 1 - lo; vz *= 1 - lo;
      const into = Math.min(0, vx * nx + vz * nz);
      vx -= into * nx; vz -= into * nz;
      if (Math.hypot(vx, vz) < 1e-6) break;
    }
  }
  return {x, z, hit};
}

export function vehicleBlocked(x, z, yaw, index, scale = 1) {
  for (const offset of [-1.15, 0, 1.15]) {
    if (collides(x + Math.sin(yaw) * offset * scale, z + Math.cos(yaw) * offset * scale, .96 * scale, index)) return true;
  }
  return false;
}

// Sweep from the character's shoulder, including interpolated positions. Height
// testing permits a camera above a roof. The radius protects the near clip plane.
export function cameraBoom(anchor, desired, index, radius = .3) {
  const dx = desired.x - anchor.x, dy = desired.y - anchor.y, dz = desired.z - anchor.z;
  const length = Math.hypot(dx, dy, dz);
  const candidates = [...index.near((anchor.x + desired.x) / 2, (anchor.z + desired.z) / 2, Math.hypot(dx, dz) / 2 + radius)];
  const blocked = t => {
    const x = anchor.x + dx * t, y = anchor.y + dy * t, z = anchor.z + dz * t;
    for (const b of candidates) {
      if (y - radius > b.h || y + radius < (b.minY || 0)) continue;
      if (pointInside(x, z, b.p)) return true;
      for (let i = 0; i < b.p.length; i++) {
        const n = nearestOnSegment(x, z, b.p[i], b.p[(i + 1) % b.p.length]);
        if (Math.hypot(x - n.x, z - n.z) < radius) return true;
      }
    }
    return false;
  };
  const steps = Math.max(1, Math.ceil(length / .12));
  let safe = 0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (blocked(t)) break;
    safe = t;
  }
  return {x:anchor.x + dx * safe, y:anchor.y + dy * safe, z:anchor.z + dz * safe};
}
