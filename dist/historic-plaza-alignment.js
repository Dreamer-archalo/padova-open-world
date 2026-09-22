import {Terrain} from './terrain.js';

export const CIVIC_PIAZZA_DISTRICT={minX:-405,maxX:-82,minZ:-202,maxZ:28,datumX:-145,datumZ:-48};
export const CIVIC_PIAZZAS=[
 {id:'duomo',x:-346,z:-12},
 {id:'signori',x:-282,z:-140},
 {id:'frutta',x:-205,z:-67},
 {id:'erbe',x:-145,z:-48}
];
export function insideCivicPiazzaDistrict(x,z){const a=CIVIC_PIAZZA_DISTRICT;return x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ;}
function authoredPlatform(terrain,x,z){return terrain.platformAt?.(x,z)||null;}

const previousElevation=Terrain.prototype.elevation;
if(!Terrain.prototype.__civicPiazzaSharedDatum){
 Terrain.prototype.__civicPiazzaSharedDatum=true;
 Terrain.prototype.elevation=function(x,z){
  const platform=authoredPlatform(this,x,z);if(platform)return platform.height;
  const h=previousElevation.call(this,x,z);if(!this.modern||!insideCivicPiazzaDistrict(x,z))return h;
  if(this.waterIndex&&this.waterDistance(x,z)<10)return h;
  this.__civicPiazzaDatum??=previousElevation.call(this,CIVIC_PIAZZA_DISTRICT.datumX,CIVIC_PIAZZA_DISTRICT.datumZ);
  return this.__civicPiazzaDatum;
 };
}

