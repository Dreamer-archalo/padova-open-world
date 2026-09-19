// Mandria's one hangar replaces the old three-bay shed.  It fits the widest
// playable cargo aircraft (33 m span), the 31 m Blackbird and articulated trucks.
// West face (u=5) has no solid door: a decorative animated shutter is managed
// by villa-mandria-hangar.js and cannot trap a player or a vehicle.
import {VILLA,areaPoint} from './gameplay-areas-implementation.js';

export const VILLA_GARAGE=Object.freeze({u:24,v:26,w:38,d:42,entranceU:5,roofHeight:10.8});
export const VILLA_GARAGE_BAYS=Object.freeze([
 Object.freeze({u:24,v:14}),Object.freeze({u:24,v:26}),Object.freeze({u:24,v:38})
]);

export function villaGarageStructures(terrain){
 if(!terrain?.modern||!terrain.gameplayPatches?.length)return [];
 const result=[];
 function box(u,v,w,d,h,color,base=0,solid=true){
  const centre=areaPoint(VILLA,u,v),y=terrain.elevation(centre.x,centre.z)+base;
  const p=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([du,dv])=>{
   const q=areaPoint(VILLA,u+du,v+dv);return [q.x,q.z];
  });
  result.push({x:centre.x,z:centre.z,p,y,minY:y,h,color,solid,kind:'gameplay',
   minX:Math.min(...p.map(a=>a[0])),maxX:Math.max(...p.map(a=>a[0])),
   minZ:Math.min(...p.map(a=>a[1])),maxZ:Math.max(...p.map(a=>a[1]))});
 }
 const g=VILLA_GARAGE;
 box(g.u,g.v,g.w-.55,g.d-.55,.025,'#777e74',.04,false);
 box(g.u,g.v,g.w+.35,g.d+.35,.38,'#59665b',g.roofHeight);
 // Posts only at the outer corners; no posts or solid wall across the open west portal.
 for(const u of [g.u-g.w/2+.5,g.u+g.w/2-.5])for(const v of [g.v-g.d/2+.5,g.v+g.d/2-.5])box(u,v,.65,.65,g.roofHeight,'#d0c3a5');
 box(g.u+g.w/2-.25,g.v,.55,g.d-1,g.roofHeight,'#a9ac98');
 box(g.u,g.v-g.d/2+.25,g.w-1,.55,g.roofHeight,'#a9ac98');
 box(g.u,g.v+g.d/2-.25,g.w-1,.55,g.roofHeight,'#a9ac98');
 // Three non-solid floor lines, plus a dedicated central staging marker.
 for(const v of [6.1,19.5,32.5,45.8])box(g.u,v,g.w-2,.12,.02,'#e7dfc5',.075,false);
 for(const u of [6.2,41.8])box(u,g.v,.12,g.d-2,.02,'#e7dfc5',.075,false);
 box(g.u,g.v,3,.12,.02,'#e5bc51',.085,false);
 return result;
}
