import fs from 'node:fs';
import assert from 'node:assert/strict';
import {findLayout,roofClear} from './dist/monoblocco-track.js';
import {planRoofNetwork} from './dist/monoblocco-roof-network-plan.js';
import {planIslandSpans,safeSegment} from './dist/monoblocco-island-bridge-plan.js';
import {pointInside} from './dist/core.js';
const map=JSON.parse(fs.readFileSync(new URL('./dist/data/padova.json',import.meta.url)));
const b=map.buildings.find(q=>q.n==='Ospedale Civile - Monoblocco - Casse - Prenotazioni'),xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]);Object.assign(b,{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)});
const layout=findLayout(b.p,b),network=planRoofNetwork(b.p,b,layout),plan=planIslandSpans(b.p,b,layout,network);
console.log('ISLAND_BRIDGE_PLAN',JSON.stringify({groups:plan.groups,islands:plan.islands.map(w=>({wing:w.wing,gridCells:w.cells,candidates:w.totalCandidates,top:w.candidates[0]?{a:w.candidates[0].a,b:w.candidates[0].b,void:w.candidates[0].void,length:w.candidates[0].length,networkDistance:w.candidates[0].networkDistance}:null}))}));
assert(plan.islands.length>=3,'Need all three detached wings in bridge plan');
assert(plan.islands.filter(w=>w.candidates.length).length>=2,'Need physically supported ramps to at least two detached wings');
for(const wing of plan.islands)for(const p of wing.candidates){
 assert(roofClear(b.p,p.a.x,p.a.z,3),'start lacks solid roof');assert(roofClear(b.p,p.b.x,p.b.z,3),'end lacks solid roof');
 assert(safeSegment(b.p,p.networkAnchor,p.entry,2.3),'entrance not linked safely to marked route');
 let outside=0;for(let i=1;i<30;i++){const t=i/30;if(!pointInside(p.a.x+(p.b.x-p.a.x)*t,p.a.z+(p.b.z-p.a.z)*t,b.p))outside++;}
 assert(outside>=4,'faux bridge above traversable roof');
}
console.log('PASS island-bridge candidates cross actual gaps between separately supported roof wings');
