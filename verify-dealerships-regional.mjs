import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DEALER_SITES,reserveDealerBuildings,dealerWallParts} from './dist/dealerships.js';
import {dist,pointInside} from './dist/core.js';

const map=JSON.parse(fs.readFileSync(new URL('./dist/data/region-padova-venice.json',import.meta.url)));
const sites=DEALER_SITES.filter(site=>!site.city.startsWith('Padova'));
const chosen=reserveDealerBuildings(map.buildings||[],sites);
for(const site of sites){
 const b=chosen.get(site.id);
 assert(b,`No mapped showroom building near ${site.name}`);
 assert(dist(site,{x:b.cx,z:b.cz})<270,`${site.name}: building too far from address`);
 assert(b.dealerSlots.length>=4,`${site.name}: insufficient interior space`);
 assert(b.dealerSlots.every(p=>pointInside(p.x,p.z,b.p)),`${site.name}: display outside building`);
 assert(dealerWallParts({...b,minY:0}).length>=b.p.length,`${site.name}: facade missing`);
 console.log(`${site.name}: ${b.t}, ${Math.round(dist(site,{x:b.cx,z:b.cz}))} m from reference, ${b.dealerSlots.length} displays`);
}
