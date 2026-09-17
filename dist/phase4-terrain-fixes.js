// Stable entry point for the phase-four terrain system. Keep the existing
// implementation intact and override the Bassanello zone before terrain objects
// are constructed. Its former 0.78 blend retained 22% of the noisy source DEM
// even at the center, exceeding the strict flat-zone elevation tolerance.
import {SOUTH_PATCHES} from './phase4-terrain-fixes-implementation.js';

const bassanello=SOUTH_PATCHES.find(p=>p.id==='bassanello');
if(!bassanello)throw new Error('Missing Bassanello elevation patch');
bassanello.strength=1;

export * from './phase4-terrain-fixes-implementation.js';
