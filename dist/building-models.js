import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

export function validateEntry(entry) {
  if (!entry || typeof entry.name !== 'string' || !entry.name.trim()) throw new Error('A mapped building name is required');
  if (!/^\.\/models\/[a-zA-Z0-9_-]+\.glb$/.test(entry.url)) throw new Error('Use a local models/*.glb file');
  if (![entry.author, entry.source, entry.license].every(s => typeof s === 'string' && s.trim())) throw new Error('Author, source and licence are required');
  if (!/^https?:\/\//.test(entry.source)) throw new Error('Source must be an HTTP(S) URL');
  for (const key of ['height', 'rotation', 'offsetX', 'offsetZ', 'offsetY']) {
    if (entry[key] !== undefined && !Number.isFinite(entry[key])) throw new Error('Invalid ' + key);
  }
  if (!(entry.height > 0 && entry.height <= 120)) throw new Error('Set the measured building height in metres (0–120)');
  return entry;
}

export function disposeModel(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(o => { if (o.geometry) geometries.add(o.geometry); for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) materials.add(m); });
  for (const m of materials) for (const v of Object.values(m)) if (v?.isTexture) textures.add(v);
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => {t.dispose();t.source?.data?.close?.();});
}

export class BuildingModels {
  constructor(scene, world) {
    this.scene = scene; this.world = world; this.entries = []; this.active = new Map(); this.pending = false; this.failed = new Set();
    this.loader = new GLTFLoader();
  }
  async init() {
    try {
      const r = await fetch('./data/building-models.json');
      if (!r.ok) throw new Error('Model catalogue ' + r.status);
      const catalogue = await r.json();
      if (!Array.isArray(catalogue.models) || catalogue.models.length > 256) throw new Error('Invalid model catalogue');
      const names = new Set();
      for (const value of catalogue.models) {
        const entry = validateEntry(value);
        const building = this.world.data.buildings.find(b => b.n === entry.name);
        if (!building || names.has(entry.name)) throw new Error('Missing or duplicated mapped building: ' + entry.name);
        names.add(entry.name); this.entries.push({...entry, building});
      }
      const credits = document.getElementById('modelCredits');
      if (credits) for (const entry of this.entries) {
        const a = document.createElement('a'); a.href = entry.source; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = entry.name + ' — ' + entry.author + ' (' + entry.license + ')'; credits.appendChild(a);
      }
    } catch (error) { console.warn('Building models unavailable; keeping the mapped city.', error); }
  }
  update(x, z) {
    for (const [name, item] of this.active) {
      if (Math.hypot(item.building.cx - x, item.building.cz - z) > 800) {
        this.scene.remove(item.root); disposeModel(item.root);
        item.building.modelActive = false; item.building.h = item.originalHeight;
        item.hidden.forEach(o => o.visible = true); this.world.refreshBuilding(item.building); this.active.delete(name);
      }
    }
    if (this.pending || this.active.size >= 6) return;
    const entry = this.entries.filter(e => !this.active.has(e.name) && !this.failed.has(e.name))
      .map(e => ({entry:e, distance:Math.hypot(e.building.cx - x, e.building.cz - z)}))
      .filter(e => e.distance < 550).sort((a,b) => a.distance - b.distance)[0]?.entry;
    if (entry) this.load(entry);
  }
  async load(entry) {
    this.pending = true; let root;
    try {
      const gltf = await this.loader.loadAsync(entry.url); root = gltf.scene;
      const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y < .01) throw new Error('Empty or invalid model');
      // Export Y-up; keep scale uniform so the surveyed proportions are preserved.
      root.scale.multiplyScalar(entry.height / size.y); root.rotation.y += (entry.rotation || 0) * Math.PI / 180;
      root.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(root), centre = bounds.getCenter(new THREE.Vector3());
      const b = entry.building;
      root.position.add(new THREE.Vector3(b.cx - centre.x + (entry.offsetX || 0), -bounds.min.y + (entry.offsetY || 0), b.cz - centre.z + (entry.offsetZ || 0)));
      root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const originalHeight = b.h;
      b.modelActive = true; b.h = Math.max(b.h, entry.height + (entry.offsetY || 0));
      const hidden = this.world.landmarks.children.filter(o => o.userData.buildingName === b.n);
      hidden.forEach(o => o.visible = false);
      this.scene.add(root); this.world.refreshBuilding(b);
      this.active.set(entry.name, {root, building:b, originalHeight, hidden});
    } catch (error) {
      if (root) disposeModel(root);
      this.failed.add(entry.name); console.warn('Keeping map geometry for ' + entry.name, error);
    } finally { this.pending = false; }
  }
}
