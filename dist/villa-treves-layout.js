// Villa Treves phase 1: garage shell uses the world's authored structure pipeline.
// The driveway (u=-5..5), existing vehicle spawns, front gate and pond stay free.
import {VILLA,areaPoint} from './gameplay-areas-implementation.js';

export const VILLA_GARAGE=Object.freeze({u:30,v:26,w:18,d:26,entranceU:21,roofHeight:5.1});
export const VILLA_GARAGE_BAYS=Object.freeze([
 Object.freeze({u:31,v:17}),Object.freeze({u:31,v:26}),Object.freeze({u:31,v:35})
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
 // Three accessible vehicle bays: open to the west and south, no front wall.
 box(g.u,g.v,g.w-.35,g.d-.35,.025,'#777e74',.04,false);
 box(g.u,g.v,g.w+.4,g.d+.4,.38,'#59665b',g.roofHeight);
 for(const u of [22,38])for(const v of [14,38])box(u,v,.55,.55,g.roofHeight,'#d0c3a5');
 box(38.15,26,.55,23,g.roofHeight,'#a9ac98');
 box(30,13.25,16,.5,g.roofHeight,'#a9ac98');
 // Flat surface marks are not colliders and do not create vertical kerbs.
 for(const v of [12.9,21.5,30.5,39.1])box(30,v,15,.13,.02,'#e7dfc5',.075,false);
 for(const u of [23,37])box(u,26,.13,25,.02,'#e7dfc5',.075,false);
 return result;
}
