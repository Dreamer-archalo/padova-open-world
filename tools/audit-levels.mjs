import fs from 'node:fs';
import {Terrain,ROAD_TOP} from '../dist/terrain.js';
import {applyCityData} from '../dist/districts.js';
import {modernFootprints} from '../dist/modern-map.js';
import {roadStructures} from '../dist/road-structures.js';
import {SpatialIndex} from '../dist/core.js';
import {vehicleBlocked} from '../dist/movement.js';
import {VEHICLES} from '../dist/vehicles.js';

const DRIVABLE=/^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|living_street|unclassified|service)$/;
const AUX=/^(footway|path|cycleway|pedestrian|tram)$/;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const level=p=>p.tunnel?-1:Number(p.layer)||(p.road.b?1:0);

function crossing(a,b,c,d){
 const dx=b[0]-a[0],dz=b[1]-a[1],ex=d[0]-c[0],ez=d[1]-c[1],den=dx*ez-dz*ex;
 if(Math.abs(den)<1e-7)return null;
 const u=((c[0]-a[0])*ez-(c[1]-a[1])*ex)/den,v=((c[0]-a[0])*dz-(c[1]-a[1])*dx)/den;
 return u>.001&&u<.999&&v>.001&&v<.999?{u,v,x:a[0]+dx*u,z:a[1]+dz*u}:null;
}

export function auditLevels(data,terrain,collision=null){
 const faults=[],counts={roads:0,samples:0,terrainIntrusions:0,floatingEdges:0,unsupportedPhysics:0,blockedRoads:0,atGradeMismatches:0};
 const badRoads=new Set(),blockedRoads=new Set();
 for(const p of terrain.roads.profiles.values()){
  if(!DRIVABLE.test(p.road.k))continue;counts.roads++;
  const separated=level(p)!==0||p.road.crossing;
  for(let i=1;i<p.points.length;i++){
   const a=p.points[i-1],b=p.points[i],len=distance(a,b);if(len<.01)continue;
   const dx=(b[0]-a[0])/len,dz=(b[1]-a[1])/len,nx=-dz,nz=dx,n=Math.max(1,Math.ceil(len/3)),segment={a,b,ia:p.ids[i-1],ib:p.ids[i],profile:p,i:i-1};
   for(let j=0;j<=n;j++){
    const t=j/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,h=terrain.roads.segmentHeight(segment,t),top=h+ROAD_TOP;counts.samples++;
    const physical=terrain.height(x,z,top);if(Math.abs(physical-top)>.035){counts.unsupportedPhysics++;if(!badRoads.has('physics:'+p.id)){faults.push({kind:'physicsSupport',road:p.id,name:p.road.n||p.road.k,x,z,expected:top,actual:physical});badRoads.add('physics:'+p.id);}}
    if(!separated){
     const renderedGround=terrain.groundHeight(x,z)-.08;if(renderedGround>top-.015){counts.terrainIntrusions++;if(!badRoads.has('terrain:'+p.id)){faults.push({kind:'terrainAboveRoad',road:p.id,name:p.road.n||p.road.k,x,z,roadTop:top,ground:renderedGround});badRoads.add('terrain:'+p.id);}}
     for(const side of [-1,1]){const offset=p.road.w/2+.9,gx=x+nx*offset*side,gz=z+nz*offset*side,ground=terrain.groundHeight(gx,gz),edgeTop=h+ROAD_TOP,gap=edgeTop-ground;if(gap>.32||gap<-.12){counts.floatingEdges++;const key='edge:'+p.id+':'+side;if(!badRoads.has(key)){faults.push({kind:'roadsideLevel',road:p.id,name:p.road.n||p.road.k,x:gx,z:gz,gap,roadTop:edgeTop,ground});badRoads.add(key);}}}
    }
    if(collision&&j%2===0&&vehicleBlocked(x,z,Math.atan2(dx,dz),collision,VEHICLES.mito,top)){if(!blockedRoads.has(p.id)){blockedRoads.add(p.id);counts.blockedRoads++;faults.push({kind:'blockedCarriageway',road:p.id,name:p.road.n||p.road.k,x,z});}}
   }
  }
 }

 // Separately mapped sidewalks, crossings and tram tracks are common in OSM. When
 // they geometrically cross a normal carriageway at the same declared layer, their
 // surfaces must meet; otherwise the auxiliary way renders as a raised blade.
 const seen=new Set();
 for(const p of terrain.roads.profiles.values()){
  if(!AUX.test(p.road.k)||level(p)!==0)continue;
  for(let i=1;i<p.points.length;i++){
   const a=p.points[i-1],b=p.points[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],seg={a,b,ia:p.ids[i-1],ib:p.ids[i],profile:p,i:i-1};
   for(const s of terrain.roads.index.near(mid[0],mid[1],distance(a,b)/2+8)){
    if(!DRIVABLE.test(s.profile.road.k)||level(s.profile)!==0)continue;
    const key=p.id+':'+i+':'+s.profile.id+':'+s.i;if(seen.has(key))continue;seen.add(key);const c=crossing(a,b,s.a,s.b);if(!c)continue;
    const ah=terrain.roads.segmentHeight(seg,c.u),rh=terrain.roads.segmentHeight(s,c.v),delta=Math.abs(ah-rh);if(delta>.12){counts.atGradeMismatches++;faults.push({kind:'atGradeMismatch',auxRoad:p.id,auxKind:p.road.k,road:s.profile.id,name:s.profile.road.n||s.profile.road.k,x:c.x,z:c.z,delta});}
   }
  }
 }
 return {counts,faults};
}

if(process.argv[1]===new URL(import.meta.url).pathname){
 const read=n=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+n,import.meta.url))),data=read('padova.json');applyCityData(data,read('city.json'));const terrain=new Terrain(read('terrain.json'),data,{modern:true}),collision=new SpatialIndex(60);
 data.buildings=modernFootprints(data.buildings,terrain);
 for(const b of data.buildings){const xs=b.p.map(v=>v[0]),zs=b.p.map(v=>v[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2;b.minX=Math.min(...xs);b.maxX=Math.max(...xs);b.minZ=Math.min(...zs);b.maxZ=Math.max(...zs);b.minY=terrain.groundHeight(cx,cz)-.25;collision.add(b,b.minX,b.minZ,b.maxX,b.maxZ);}
 for(const b of roadStructures(terrain))collision.add(b,b.minX,b.minZ,b.maxX,b.maxZ);
 const report=auditLevels(data,terrain,collision);console.log(JSON.stringify({...report,faults:report.faults.slice(0,100)},null,2));if(report.faults.length)process.exitCode=1;
}
