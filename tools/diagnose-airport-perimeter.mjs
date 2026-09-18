import assert from 'node:assert/strict';
import {t} from './controller-harness.mjs';
import {AIRPORT,areaLocal} from '../dist/gameplay-areas.js';
const crossings=[];
for(const road of t.world.data.roads){
 for(let i=1;i<road.p.length;i++){
  const a=areaLocal(AIRPORT,...road.p[i-1]),b=areaLocal(AIRPORT,...road.p[i]);
  for(const [axis,edge,other] of [['u',215,'v'],['u',-85,'v'],['v',-575,'u'],['v',575,'u']]){
   const da=a[axis]-edge,db=b[axis]-edge;
   if(da*db>=0||Math.abs(da-db)<1e-7)continue;
   const f=da/(da-db),at=a[other]+(b[other]-a[other])*f;
   if((axis==='u'&&Math.abs(at)>565)||(axis==='v'&&(at< -85||at>215)))continue;
   crossings.push({road:road.n||road.k,kind:road.k,gameplay:!!road.gameplay,edge:axis+'='+edge,at:+at.toFixed(2),width:road.w,access:road.access||''});
  }
 }
}
const invalid=crossings.filter(x=>!(x.road==='Ingresso aeroporto'&&x.edge==='u=215'&&Math.abs(x.at-250)<24));
assert.equal(invalid.length,0,'Unpermitted city road intersects airport wall: '+JSON.stringify(invalid));
assert.equal(crossings.length,1,'Airport should have exactly one perimeter crossing: '+JSON.stringify(crossings));
console.log('PASS AIRPORT_PERIMETER '+JSON.stringify({crossings,sourceRoadWallIntersections:invalid.length}));
