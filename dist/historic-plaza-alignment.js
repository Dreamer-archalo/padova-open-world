import {Terrain} from './terrain.js';
import {RoadSurfaces} from './road-surfaces.js';
import {historicPlainMask} from './historic-terrain-level.js';

export const CIVIC_PIAZZA_DISTRICT={minX:-405,maxX:-82,minZ:-202,maxZ:28,datumX:-145,datumZ:-48};
export const CIVIC_PIAZZAS=[
 {id:'duomo',x:-346,z:-12},
 {id:'signori',x:-282,z:-140},
 {id:'frutta',x:-205,z:-67},
 {id:'erbe',x:-145,z:-48}
];
export function insideCivicPiazzaDistrict(x,z){const a=CIVIC_PIAZZA_DISTRICT;return x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ;}
function authoredPlatform(terrain,x,z){return terrain.platformAt?.(x,z)||null;}
function ordinaryRoad(road){return road&&!road.crossing&&!road.tunnel&&!road.b&&!Number(road.layer)&&!/motorway|trunk|tram|footway|path|cycleway|steps|pedestrian/.test(road.k||'');}

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

const previousSmooth=RoadSurfaces.prototype.smoothProfiles;
if(!RoadSurfaces.prototype.__civicPiazzaRoadDatum){
 RoadSurfaces.prototype.__civicPiazzaRoadDatum=true;
 RoadSurfaces.prototype.smoothProfiles=function(){
  previousSmooth.call(this);if(!this.modern||!this.terrain)return;
  const touched=new Set();
  for(const profile of this.profiles.values()){
   const road=profile.road;if(!ordinaryRoad(road))continue;
   for(const id of profile.ids){
    if(touched.has(id))continue;touched.add(id);const n=this.nodes[id];
    if(authoredPlatform(this.terrain,n.x,n.z))continue;
    if(insideCivicPiazzaDistrict(n.x,n.z)&&this.terrain.waterDistance(n.x,n.z)>=10){n.h=this.terrain.elevation(n.x,n.z);continue;}
    const influence=historicPlainMask(n.x,n.z,this.terrain.waterDistance(n.x,n.z));
    if(influence>.01){const target=this.terrain.elevation(n.x,n.z);n.h=n.h*(1-influence)+target*influence;}
   }
  }
  this.updateSlopes();
 };
}
