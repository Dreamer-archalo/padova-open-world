import {roadRoute} from './core.js';
import {findTaxiRoad} from './taxi-service.js';

export class TaxiPathfinder {
  constructor({graph, terrain, bounds = null} = {}) {
    this.graph = graph;
    this.terrain = terrain;
    this.bounds = bounds;
  }

  valid(pos) {
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.z)) return false;
    if (!this.bounds) return true;
    return pos.x >= this.bounds.x && pos.x <= this.bounds.x + this.bounds.w &&
      pos.z >= this.bounds.z && pos.z <= this.bounds.z + this.bounds.h;
  }

  nearestRoad(pos, {maxRadius = 520, maxCandidates = 2500, maxMs = 18} = {}) {
    if (!this.valid(pos)) return null;
    const first=findTaxiRoad(pos, this.graph, this.terrain, {maxRadius, maxCandidates, maxMs});
    if (first || maxRadius < 320) return first;
    // A dense chunk can exhaust the initial 18 ms lookup before finding a
    // connected drivable road. Retry once with a bounded, wider search rather
    // than reporting an erroneous destination failure or blocking indefinitely.
    return findTaxiRoad(pos, this.graph, this.terrain, {
      maxRadius: Math.max(maxRadius, 520),
      maxCandidates: Math.max(maxCandidates, 6000),
      maxMs: Math.max(maxMs, 65),
    });
  }

  route(from, to, {maxSteps = 12000, maxMs = 20} = {}) {
    if (!this.valid(from) || !this.valid(to)) return [];
    try {
      return roadRoute(from, to, this.graph, {maxSteps, maxMs});
    } catch (error) {
      console.warn('[Taxi Pathfinder] route failed', error);
      return [];
    }
  }

  resolveDestination(destination) {
    return this.nearestRoad(destination, {maxRadius: 520, maxCandidates: 2500, maxMs: 18});
  }

  fallbackPoint(destination, yaw = 0) {
    if (!this.valid(destination)) return null;
    const road = this.nearestRoad(destination, {maxRadius: 760, maxCandidates: 4500, maxMs: 35});
    if (road) return road;
    const x = destination.x;
    const z = destination.z;
    const y = this.terrain?.height?.(x, z);
    return Number.isFinite(y) ? {x, z, y, yaw: Number.isFinite(yaw) ? yaw : 0} : null;
  }
}
