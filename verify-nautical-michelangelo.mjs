import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BOAT_SPECS,watercraftStep} from './dist/nautical-catalog.js';
import {nearestWaterSegment} from './dist/padova-boats.js';
import {canalAt,veniceDocks} from './dist/venice-boats.js';
import {project} from './dist/core.js';
import {veniceFlightUrl,MAX_SPEED} from './dist/airport-michelangelo.js';
const read=p=>fs.readFileSync(p,'utf8');
const names=Object.keys(BOAT_SPECS);
assert(names.length>=10,'First playable boat fleet must have 10 real types');
for(const [id,s] of Object.entries(BOAT_SPECS)){
 assert(s.maxKmh>0&&s.maxKmh<=100,'Boat speed units must be km/h');
 assert(s.draft>0&&s.airDraft>0&&s.minChannel>=s.width+2,'Hull/draft/channel properties missing: '+id);
}
assert.equal(BOAT_SPECS['boat-vaporetto'].places.includes('padova'),false,'Vaporetto should not spawn in narrow inland Padova');
assert(BOAT_SPECS['boat-jetski'].maxKmh>BOAT_SPECS['boat-electric'].maxKmh);
const syntheticWater=[{p:[[0,0],[120,0]],w:16},{p:[[0,30],[120,30]],w:4}];
const berth=nearestWaterSegment(syntheticWater,{x:50,z:4},7,100);
assert(berth&&berth.width===16&&berth.distance<5);
assert(!nearestWaterSegment([{p:[[0,0],[100,0]],w:3}],{x:50,z:0},7,100),'Never dock onto a ditch');
const terrain={waterSample(x,z){return {distance:Math.abs(z)-8};},waterHeight(){return 10;},bridge(){return null;}};
const actor={spec:{watercraft:true,width:2,minChannel:7,max:13/3.6,boost:13/3.6,reverse:2,accel:3,brake:6,steer:1},mesh:{position:{set(){}},rotation:{set(){}}}};
const state={x:20,z:0,y:10,yaw:Math.PI/2,speed:0,elapsed:3,health:100,car:actor};
watercraftStep(state,new Set(['KeyW']),1,terrain);
assert(state.x>20,'Throttle must move the boat along real water');
state.z=7.9;state.speed=4;const hold=state.x;
const blocked=watercraftStep(state,new Set(['KeyW']),.5,terrain);
assert(blocked.shallow&&Math.abs(state.x-hold)<.01,'Bank collision must prevent leaving water');
const venice={water:[{p:[[0,0],[150,0]],w:40},{p:[[200,0],[350,0]],w:7}],areas:[],places:[{name:'Piazzale Roma',x:55,z:18},{name:'Giudecca',x:245,z:13}]};
assert.equal(veniceDocks(venice).length,2,'Venice places should resolve to two water-adjacent berths');
assert(canalAt(venice,40,0,3).width>=40);
assert.equal(canalAt(venice,245,19,2),null,'Narrow Venetian canal must reject broad vessel margin');
const src={
 game:read('dist/game.js'),phase:read('dist/phase2-runtime.js'),
 hangar:read('dist/villa-mandria-hangar.js'),cats:read('dist/villa-mandria-catalog-ui.js'),
 venice:read('dist/venice-game.js'),continuous:read('dist/continuous-world.js'),
 michelangelo:read('dist/airport-michelangelo.js'),html:read('dist/continuous-world.html')
};
assert(src.game.includes('watercraftStep(state,keys,dt,terrain)')&&src.game.includes('respawnWaterDock'),'Main game must drive boats and respawn at last water dock');
assert(src.phase.includes("import './padova-boats.js'")&&src.phase.includes("import './airport-michelangelo.js'"));
assert(src.hangar.includes("if(s.watercraft)")&&src.cats.includes("enabled:true}"));
assert(src.venice.includes('installVeniceBoats')&&src.venice.includes('boats.step(dt)'));
assert(src.michelangelo.includes('MAX_KMH=1000')&&src.michelangelo.includes('veniceFlightUrl'));
const departure={x:-2685,z:1422,y:40,speed:80};
const params=new URL(veniceFlightUrl(departure),'https://local.invalid/preview/marine/index.html').searchParams;
const arrival=project(45.43868,12.31811),expectedYaw=Math.atan2(arrival.x-departure.x,arrival.z-departure.z);
assert.equal(params.get('vehicle'),'michelangelo');
assert(Math.abs(+params.get('yaw')-expectedYaw)<1e-8,'Aircraft Venice heading must point to lagoon coordinates');
assert.equal(MAX_SPEED,1000/3.6);

assert(src.continuous.includes('MICHELANGELO_LIMIT=1000/3.6')&&src.continuous.includes("q.get('vehicle')==='michelangelo'"));
assert(src.html.includes('id="enterVenice"'));
if(fs.existsSync('dist/data/padova.json')){
 const city=JSON.parse(read('dist/data/padova.json'));
 const coords=[[45.4095,11.8929],[45.4117,11.8738],[45.3902,11.8755],[45.4008,11.8495],[45.4210,11.9005]];
 const found=coords.map(([lat,lon])=>nearestWaterSegment(city.water,project(lat,lon),7,420)).filter(Boolean);
 assert(found.length>=2,'At least two map-backed Padova river marinas needed; found '+found.length);
 console.log('REAL_PADOVA_DOCK_CANDIDATES',found.map(d=>({width:d.width,distance:Math.round(d.distance)})));
}
if(fs.existsSync('dist/data/venice.json')){
 const city=JSON.parse(read('dist/data/venice.json'));
 const found=veniceDocks(city);
 assert(found.length>=3,'Need at least three OSM-verified Venetian docks; found '+found.length);
 console.log('REAL_VENICE_DOCKS',found.map(d=>({name:d.name,width:d.width,distance:Math.round(d.distance)})));
}
console.log('PASS nautical fleet 10 models, river collision, map darsene, Michelangelo 1000 km/h and continuous Venice link');
