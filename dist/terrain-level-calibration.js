import {LEVEL_PATCHES} from './phase4-terrain-fixes.js';

// Southern Padova is an almost level urban plain. The phase-4 level planes
// already preserve a small authored drainage slope and feather to the native DEM
// at their outer boundary; using partial strength inside the core reintroduced
// 0.5–0.7 m DEM bumps between roads, sidewalks and nearby lots. Calibrate only
// these authored southern cores to the full level-plane solution.
const SOUTHERN_LEVEL_CORES=new Set(['bassanello','guizza','albignasego']);
for(const patch of LEVEL_PATCHES)if(SOUTHERN_LEVEL_CORES.has(patch.id))patch.strength=1;

export {SOUTHERN_LEVEL_CORES};
