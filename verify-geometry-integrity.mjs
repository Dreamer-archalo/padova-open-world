import fs from 'node:fs';
import assert from 'node:assert/strict';
import {smoothGroundY,MAX_CONTACT_RISE} from './dist/vehicle-dynamics.js';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const surface=read('./dist/surface-layers.js'),terrainFix=read('./dist/phase4-terrain-fixes.js'),audit=read('./dist/geometry-audit-runtime.js');

// Vehicle support: ordinary centimetre-scale grade changes follow the surface;
// a large discontinuity must be eased instead of becoming a one-frame Y jump.
assert.equal(smoothGroundY(10,10.03,1/60,20),10.03);
const raised=smoothGroundY(10,10.8,1/60,20);assert(raised>10&&raised<10.8,'large ground change must be interpolated');
const lowered=smoothGroundY(10,9.2,1/60,20);assert(lowered<10&&lowered>9.2,'large descent must be interpolated');
assert(MAX_CONTACT_RISE<=.3,'hard ground-rise guard must stay below 30 cm');

const checks={
 clippedWinding:surface.includes('signedArea2')&&surface.includes('[...part].reverse()'),
 degenerateRemoval:surface.includes('mesh-degenerate')||surface.includes('triArea2')&&surface.includes('1e-8'),
 finiteSurfaceHeights:surface.includes('[ya,yb,yc].every(Number.isFinite)'),
 nativeGradientClamp:terrainFix.includes('MAX_TERRAIN_GRADE')&&terrainFix.includes('harmonisedGrid')&&terrainFix.includes('MIN_ADJACENT_DELTA'),
 meanPreservingClamp:terrainFix.includes('excess=(Math.abs(d)-limit)/2'),
 monotoneRoadInterpolation:terrainFix.includes('__phase4MonotoneHeight')&&terrainFix.includes('Math.min(a.h,b.h)')&&terrainFix.includes('Math.max(a.h,b.h)'),
 shoulderFeather:terrainFix.includes('SHOULDER_FEATHER=7.5'),
 runtimeGridAudit:audit.includes('terrain-delta')&&audit.includes('gridEdges'),
 runtimeRoadAudit:audit.includes('road-grade')&&audit.includes('road-hermite-overshoot'),
 runtimeWaterAudit:audit.includes('road-water-clearance'),
 runtimeMeshAudit:audit.includes('mesh-invalid-normal')&&audit.includes('surface-inverted-winding'),
 legacyPorticoCleanup:audit.includes('stripLegacyPorticos')&&audit.includes('legacyPorticosRemoved'),
 fullConsoleEntry:audit.includes('window.auditPadovaGeometry')
};
const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([k])=>k);if(failed.length)throw new Error('Geometry integrity verification failed: '+failed.join(', '));
console.log(JSON.stringify({ok:true,checks,vehicle:{raised:+raised.toFixed(4),lowered:+lowered.toFixed(4),maxContactRise:MAX_CONTACT_RISE}},null,2));
