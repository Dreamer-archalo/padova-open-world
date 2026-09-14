import assert from 'node:assert/strict';
import {modernFootprints} from './dist/modern-map.js';

const road={k:'residential',w:6,crossing:false};
const segment={a:[-10,0],b:[10,0],profile:{road}};
const terrain={
  roads:{index:{near:()=>[segment]},sample:()=>0},
  elevation:()=>0
};

const genericNamed={n:'Teatro Ruzante',h:10,p:[[-5,-5],[5,-5],[5,5],[-5,5]]};
const corrected=modernFootprints([genericNamed],terrain);
assert.equal(corrected.length,2,'a named generic building must yield to a mapped drivable road');
assert(corrected.every(part=>part.p.every(p=>Math.abs(p[1])>=4.29)),'building geometry must clear the rendered sidewalk corridor');

const protectedLandmark={n:"Basilica di Sant'Antonio",h:20,p:[[-5,-5],[5,-5],[5,5],[-5,5]]};
const preserved=modernFootprints([protectedLandmark],terrain);
assert.equal(preserved.length,1,'authored landmarks keep their source footprint');
assert.deepEqual(preserved[0].p,protectedLandmark.p);

const bridgeRoad={k:'primary',w:8,crossing:true};
const bridgeSegment={a:[-10,0],b:[10,0],profile:{road:bridgeRoad}};
const bridgeTerrain={roads:{index:{near:()=>[bridgeSegment]},sample:()=>1},elevation:()=>0};
const bridgeBuilding={h:8,p:[[-6,-6],[6,-6],[6,6],[-6,6]]};
const bridgeCorrected=modernFootprints([bridgeBuilding],bridgeTerrain);
assert.equal(bridgeCorrected.length,2,'bridge decks and parapets must not cut through building shells');
assert(bridgeCorrected.every(part=>part.p.every(p=>Math.abs(p[1])>=5.04)),'bridge clearance must include parapets outside the carriageway');

console.log('PASS road/building overlap regression checks.');
