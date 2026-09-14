import assert from 'node:assert/strict';
import {modernFootprints} from './dist/modern-map.js';

const makeTerrain=road=>({
  roads:{
    index:{near:()=>[{a:[-10,0],b:[10,0],profile:{road}}]},
    sample:()=>road.crossing?1:0
  },
  elevation:()=>0,
  footprintCorrections:0
});

// Named generic buildings are not landmarks: mapped roads must win the overlap.
const street={k:'residential',w:6,crossing:false};
const genericNamed={n:'Teatro Ruzante',h:10,p:[[-5,-5],[5,-5],[5,5],[-5,5]]};
const corrected=modernFootprints([genericNamed],makeTerrain(street),{force:true});
assert.equal(corrected.length,2,'named generic building should be split around the road');
assert(corrected.every(part=>part.p.every(p=>Math.abs(p[1])>=4.34)),'building must clear asphalt plus urban sidewalk margin');

// Authored landmark source footprints stay intact.
const landmark={n:"Basilica di Sant'Antonio",h:20,p:[[-5,-5],[5,-5],[5,5],[-5,5]]};
const preserved=modernFootprints([landmark],makeTerrain(street),{force:true});
assert.equal(preserved.length,1);
assert.deepEqual(preserved[0].p,landmark.p);

// Bridge parapets sit beyond the carriageway, so the cut includes their envelope.
const bridge={k:'primary',w:8,crossing:true};
const bridgeBuilding={h:8,p:[[-6,-6],[6,-6],[6,6],[-6,6]]};
const bridgeCorrected=modernFootprints([bridgeBuilding],makeTerrain(bridge),{force:true});
assert.equal(bridgeCorrected.length,2,'bridge corridor should split an intersecting building shell');
assert(bridgeCorrected.every(part=>part.p.every(p=>Math.abs(p[1])>=5.09)),'building must clear bridge parapets');

console.log('PASS road/building overlap regression checks.');
