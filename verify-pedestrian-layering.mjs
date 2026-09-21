import assert from 'node:assert/strict';
import {roadCorridors} from './dist/surface-layers.js';
import {buildModernRoads} from './dist/modern-roads.js';

// A second carriageway above the current street must not erase its sidewalks.
// A real street-level junction should still suppress overlapping sidewalk slabs.
const localRoad={k:'residential',w:6,surfaceId:1},overpass={k:'primary',w:9,layer:1,surfaceId:2};
const segment={a:[0,0],b:[12,0],road:localRoad};
function sidewalkQuads(otherHeight){
 const calls=[];
 const terrain={roads:{sample:(road)=>road===overpass?otherHeight:10,candidates:()=>[{road:overpass,height:otherHeight}],index:{near:()=>[]}},waterDistance:()=>Infinity};
 const batch={quad:(...args)=>calls.push(args),tri:(...args)=>calls.push(args)};
 buildModernRoads(batch,[segment],terrain);
 return calls.filter(args=>args[4]?.getHexString?.()==='b7b5a8').length;
}
const belowOverpass=sidewalkQuads(16),atGradeJunction=sidewalkQuads(10);
assert(belowOverpass>0,'Sidewalk disappeared because a flyover overlaps its 2D footprint');
assert.equal(atGradeJunction,0,'Sidewalk incorrectly covers a carriageway at the same level');

// A 2D polygon clipping pass must not cut a path at a genuinely different
// elevation from a street. At matching heights it must still prevent overlap.
const footway={k:'footway',w:2,surfaceId:3};
const crossing={a:[-5,0],b:[5,0],profile:{road:overpass},render:true};
function clippedCorridors(height){
 const terrain={roads:{renderIndex:{near:()=>[crossing]},sample:road=>road===footway?10:height},elevation:()=>10};
 const poly=[[-3,-3],[3,-3],[3,3],[-3,3]];
 return roadCorridors(poly,terrain,{pedestrian:true,exclude:footway}).length;
}
assert.equal(clippedCorridors(16),0,'Overpass cuts pedestrian mesh underneath it');
assert.equal(clippedCorridors(10),1,'Street-level road fails to clip intersecting pedestrian mesh');
console.log('PASS footpaths remain continuous across grade-separated roads; only at-grade overlaps suppress sidewalks.');
