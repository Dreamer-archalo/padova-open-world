import assert from 'node:assert/strict';
import fs from 'node:fs';
import {taxiDestinations,taxiFare} from './dist/taxi-service.js';
import {REGIONAL_ZONES} from './dist/unified-regions.js';

const places=['Prato della Valle','Piazza dei Signori','Portello','Arcella','Stadio Euganeo']
 .map((name,index)=>({name,tag:'Padova',x:index*20,z:index*20}));
const stops=taxiDestinations(places,{x:0,z:0},{x:100,z:100},REGIONAL_ZONES);
for(const name of ['Dolo','Mira Porte','Marghera','Porto Marghera','Mestre','Venezia · Piazzale Roma'])
 assert(stops.some(stop=>stop.name===name),`regional taxi stop missing: ${name}`);
assert(!stops.some(stop=>stop.name==='Venezia - San Marco'),'road taxi must stop at Piazzale Roma, not in pedestrian Venice');

const dolo=stops.find(stop=>stop.name==='Dolo'),venice=stops.find(stop=>stop.name==='Venezia · Piazzale Roma');
assert(taxiFare({x:0,z:0},venice)>taxiFare({x:0,z:0},dolo),'longer regional ride must cost more');
assert(taxiFare({x:0,z:0},venice)<=180,'regional ride remains inside the advertised fare cap');

// CI generates the real regional extract before this test. Confirm every
// advertised stop actually has a driveable OSM road for the arrival snap.
if(fs.existsSync('dist/data/region-padova-venice.json')){
 const map=JSON.parse(fs.readFileSync('dist/data/region-padova-venice.json','utf8'));
 const roads=(map.roads||[]).filter(road=>road.w>=3.5&&!/footway|pedestrian|path|cycleway|steps|track|tram/.test(road.k||''));
 const segmentDistance=(point,a,b)=>{const vx=b[0]-a[0],vz=b[1]-a[1],d=vx*vx+vz*vz,t=d?Math.max(0,Math.min(1,((point.x-a[0])*vx+(point.z-a[1])*vz)/d)):0;return Math.hypot(point.x-a[0]-vx*t,point.z-a[1]-vz*t);};
 for(const stop of stops.filter(stop=>/extraurbana/.test(stop.tag||''))){
  let nearest=Infinity;
  for(const road of roads)for(let i=1;i<(road.p?.length||0);i++)nearest=Math.min(nearest,segmentDistance(stop,road.p[i-1],road.p[i]));
  assert(nearest<760,`${stop.name} has no driveable regional arrival road (${Math.round(nearest)} m)`);
 }
}

const game=fs.readFileSync('dist/game.js','utf8'),html=fs.readFileSync('dist/index.html','utf8');
for(const expected of [
 'bounds:taxiBounds',
 'regionalWorld.nearestRoad(destination.x,destination.z,760)',
 'taxiDestinations(PLACES,HOME,AIRPORT_GATE,regionalWorld?REGIONAL_ZONES:[])',
 'Number.isFinite(meta.quotedFare)?meta.quotedFare',
 "if(regionalPlayer()){"
])assert(game.includes(expected),`regional taxi runtime missing: ${expected}`);
assert(/game\.js\?v=(regional-taxi-r16|padova-npc-r17|dealerships-r19|road-levels-r21|taxi-r22)/.test(html),'regional taxi game entry version missing');
console.log('PASS regional taxi: Padova, Dolo, Riviera, Marghera, Mestre and Venice fares/destinations are wired');
