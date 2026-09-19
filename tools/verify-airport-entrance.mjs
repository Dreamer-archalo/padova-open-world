import assert from 'node:assert/strict';
import {t} from './controller-harness.mjs';
import {AIRPORT,areaLocal,gameplayStructures} from '../dist/gameplay-areas.js';
import {VEHICLES} from '../dist/vehicles.js';
import {vehicleBlocked} from '../dist/movement.js';

const road=t.world.data.gameplay.roads.find(r=>r.n==='Ingresso aeroporto');
assert(road?.p.length===3,'entrance must connect city junction, outside approach and gate');
const layout=gameplayStructures(t.terrain),entrance=layout.filter(s=>{
 const p=areaLocal(AIRPORT,s.x,s.z);return p.u>208&&p.u<218&&Math.abs(p.v-250)<32;
});
assert(entrance.some(s=>s.color==='#24566d'),'architectural airport entry sign is missing');
assert(!entrance.some(s=>s.solid&&Math.abs(areaLocal(AIRPORT,s.x,s.z).v-250)<12),'solid object in entrance traffic corridor');
let count=0;
for(let i=1;i<road.p.length;i++){
 const a=road.p[i-1],b=road.p[i],distance=Math.hypot(b[0]-a[0],b[1]-a[1]);
 const yaw=Math.atan2(b[0]-a[0],b[1]-a[1]),across=[Math.cos(yaw),-Math.sin(yaw)];
 for(let step=0;step<=Math.ceil(distance);step++){
  const frac=step/Math.ceil(distance),x=a[0]+(b[0]-a[0])*frac,z=a[1]+(b[1]-a[1])*frac;
  for(const lane of [-1.5,0,1.5]){
   const px=x+across[0]*lane,pz=z+across[1]*lane,y=t.terrain.height(px,pz);
   assert(Number.isFinite(y)&&t.terrain.dry(px,pz,1,y),'entrance road has invalid terrain/water: '+JSON.stringify({i,step,lane}));
   assert(!vehicleBlocked(px,pz,yaw,t.world.collision,VEHICLES.mito,y),'entrance blocked by physical collision: '+JSON.stringify({i,step,lane,x:px,z:pz}));
   count++;
  }
 }
}
console.log('PASS AIRPORT_GATEWAY '+JSON.stringify({drivewaySamples:count,architecturalParts:entrance.length,opening:'48 m',roadVertices:road.p.length}));
