import assert from 'node:assert/strict';
import fs from 'node:fs';
import {findLayout,roofClear} from './dist/monoblocco-track.js';
import {planRoofNetwork} from './dist/monoblocco-roof-network-plan.js';
const data=JSON.parse(fs.readFileSync(new URL('./dist/data/padova.json',import.meta.url)));
const b=data.buildings.find(q=>q.n==='Ospedale Civile - Monoblocco - Casse - Prenotazioni');assert(b,'real hospital missing');const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]);Object.assign(b,{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)});
const layout=findLayout(b.p,b),net=planRoofNetwork(b.p,b,layout);
console.log('ROOF_NETWORK_PLAN',JSON.stringify({metres:layout.total,branchMetres:net.metres,allMarkedMetres:layout.total+net.metres,branches:net.branches.length,coverage:net.coverage,reachableCoverage:net.reachableCoverage,allCells:net.allCells,reachableCells:net.reachableCells,terminals:net.branches.map(p=>[Math.round(p.terminus.x),Math.round(p.terminus.z),Math.round(p.length)])}));
assert(net.branches.length>=3&&net.metres>80,'Need substantial marked exploration network, not one short shortcut');
assert(net.coverage>.65,'Marked network still fails to reach most of the actual accessible roof');
for(const branch of net.branches)for(let i=0;i<branch.points.length;i++){const p=branch.points[i];assert(roofClear(b.p,p.x,p.z,2.7),'Branch outside physical roof');if(i){const a=branch.points[i-1];for(let j=0;j<=8;j++){const t=j/8;assert(roofClear(b.p,a.x+(p.x-a.x)*t,a.z+(p.z-a.z)*t,2.65),'Branch chord crosses real air void');}}}
console.log('PASS physically supported full-roof exploration branches, no fake slabs over void');
