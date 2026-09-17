import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pointInside,nearestOnSegment} from './dist/core.js';
import {findLayout,onTrack} from './dist/monoblocco-track.js';
import {selectRooftopSpectators} from './dist/monoblocco-spectators.js';
const data=JSON.parse(fs.readFileSync(new URL('./dist/data/padova.json',import.meta.url)));
const building=data.buildings.find(b=>b.n==='Ospedale Civile - Monoblocco - Casse - Prenotazioni');
assert(building,'Exact full Monoblocco footprint');
const xs=building.p.map(p=>p[0]),zs=building.p.map(p=>p[1]);Object.assign(building,{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)});
const layout=findLayout(building.p,building);assert(layout,'Validated rooftop circuit and helipad must exist');
const fans=selectRooftopSpectators(building.p,layout,building);assert(fans.length>=4,'At least four rooftop spectators must fit safely');
for(const [i,p] of fans.entries()){
 assert(pointInside(p.x,p.z,building.p),'Fan cannot float over hospital courtyard');
 const edge=Math.min(...building.p.map((v,k)=>{const q=nearestOnSegment(p.x,p.z,v,building.p[(k+1)%building.p.length]);return Math.hypot(q.x-p.x,q.z-p.z);}));
 assert(edge>=2.85,'Spectator must stay clear of parapet');
 assert(Math.hypot(p.x-layout.helipad.x,p.z-layout.helipad.z)>=17,'Heliport must be spectator-free');
 for(let k=0;k<720;k++){const track=onTrack(layout,k/720);assert(Math.hypot(p.x-track.x,p.z-track.z)>=3.0,'Spectator must not overlap moving motorcycle path');}
 for(const other of fans.slice(i+1))assert(Math.hypot(p.x-other.x,p.z-other.z)>=7.9,'Crowd positions need separation');
}
const runtime=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8'),source=fs.readFileSync(new URL('./dist/monoblocco-spectators.js',import.meta.url),'utf8');
assert(runtime.includes("import './monoblocco-spectators.js';"),'Spectators must be wired to the active game');
assert(runtime.indexOf('monoblocco-spectators.js')>runtime.indexOf('hospital-rooftop-easter-egg.js')&&runtime.indexOf('monoblocco-spectators.js')<runtime.indexOf('online-race-v2.js'),'Rooftop population must initialize after roof, before unchanged online hooks');
assert(source.includes('findLayout(site.polygon,site.building)')&&!source.includes('game.__monobloccoSpectatorLayout'),'Do not depend on missing implicit layout references');
assert(source.includes('group.userData.speech=cheers')&&source.includes('group.userData.roofSpectator=true')&&source.includes('f.userData.bubble.visible'),'Visible cheering, not just a named unused feature');
console.log('PASS',fans.length,'spectators on real roof, separate from 720 motorcycle samples and helipad; game module imported');
