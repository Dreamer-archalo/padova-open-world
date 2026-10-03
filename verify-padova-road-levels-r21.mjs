import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Terrain} from './dist/terrain.js';
import {findGradeCrossings} from './dist/road-grade-crossings.js';

const read=name=>JSON.parse(fs.readFileSync(new URL('./dist/data/'+name+'.json',import.meta.url)));
const map=read('padova'),terrain=new Terrain(read('terrain'),map,{modern:true});
const candidates=findGradeCrossings(map.roads),ikea={x:4400,z:-1400};
const failed=[],ikeaFailures=[];
for(const c of candidates){
 const upper=terrain.roads.sample(c.upper,c.x,c.z),lower=terrain.roads.sample(c.lower,c.x,c.z);
 assert(Number.isFinite(upper)&&Number.isFinite(lower),'finite road surfaces at crossings');
 const clearance=upper-lower;
 if(clearance>=5.2){
  // At an x/z crossing the height query must keep BOTH driveable layers.
  // A correct deck centreline is not enough if the lower vehicle is snapped
  // onto that deck by the collision/ground resolver.
  assert(Math.abs(terrain.height(c.x,c.z,upper+.075)-upper-.075)<.5,
   'upper crossing surface must be reachable at its own height');
  assert(Math.abs(terrain.height(c.x,c.z,lower+.075)-lower-.075)<.5,
   'underpass surface must be reachable at its own height');
 }
 if(clearance<5.2){
  const detail={x:+c.x.toFixed(1),z:+c.z.toFixed(1),upper:c.upper.n||c.upper.k,lower:c.lower.n||c.lower.k,clearance:+clearance.toFixed(2)};
  failed.push(detail);
  if(Math.hypot(c.x-ikea.x,c.z-ikea.z)<650)ikeaFailures.push(detail);
 }
}
assert(candidates.length>=400,'the whole Padova expressway extract must be audited');
assert.equal(ikeaFailures.length,0,'IKEA interchange still has collapsed levels: '+JSON.stringify(ikeaFailures));
assert(failed.length<=46,'grade-separation regression: '+failed.length+' '+JSON.stringify(failed.slice(0,10)));
assert(!failed.some(c=>c.upper==='Cavalcavia Stati Uniti'),
 'Stati Uniti motorway bridge must clear its mapped crossing lanes');
console.log('PASS Padova road-level regression: '+candidates.length+' candidate crossings, '+(candidates.length-failed.length)+' above 5.2 m, IKEA clear; '+failed.length+' candidates still need review.');
