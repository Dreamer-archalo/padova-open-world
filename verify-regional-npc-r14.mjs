import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './dist/vendor/three.module.js';
import {SpatialIndex} from './dist/core.js';
import {RegionalWorld} from './dist/regional-world.js';
import {regionalOneWay,regionalRoadEligible} from './dist/regional-traffic-physics.js';
import {VEHICLES} from './dist/vehicles.js';

const src=fs.readFileSync('dist/regional-world.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');
assert(!/model\?regionalCar\(style\):new THREE.Mesh\(cube/.test(src),
 'The region must never degrade nearby NPC vehicles to grey boxes, even in hyper mode');
assert(!/model\?regionalPerson\(/.test(src),
 'Pedestrians must be actual animated Padova models at every quality');
assert(game.includes('extension.attachTraffic({cars,terrain,player:state,collision:world.collision})'),
 'Regional car actors must register in the actual Padova car physics pool');
assert(game.includes('regionalWorld?.claimCar(nearest)'),
 'The player must be able to take over an NPC and retain it after chunk unload');
assert(game.includes('if(c.regionalTraffic)continue'),
 'Do not relocate regional cars through the legacy Padova-only road graph');
assert(regionalOneWay({oneway:true})===1);
assert(regionalOneWay({oneway:-1})===-1);
assert(regionalOneWay({oneway:false})===0);
assert(!regionalRoadEligible({k:'motorway',w:10,oneway:true},
 {_candidateDir:-1,spec:VEHICLES.nido}),'Forbidden motorway contraflow');
assert(regionalRoadEligible({k:'primary',w:8,oneway:true},
 {_candidateDir:1,spec:VEHICLES.nido}));

const x0=12000,scene=new THREE.Scene(),collision=new SpatialIndex(80);
const map={
 roads:[{k:'primary',w:9,one:true,p:Array.from({length:17},(_,i)=>[x0+i*65,0])},
        {k:'secondary',w:7,p:[[x0+195,0],[x0+195,120]]}],
 water:[],areas:[],buildings:[],shorelines:[]
};
const grid={width:55,height:25,step:60,x0:x0-600,z0:-400,heights:Array(55*25).fill(5)};
const region=new RegionalWorld(scene,map,grid,collision);
const terrain={
 height:(x,z,y=null)=>region.height(x,z,y),
 elevation:()=>5,groundHeight:()=>5,slope:()=>0,
 waterAt:()=>null,arcadeRamps:[]
};
const player={x:x0+12,z:18,y:5,speed:0,mode:'foot',car:null};
const cars=[];
region.attachTraffic({cars,terrain,player,collision});
region.quality='hyper';region.focus={x:x0+32,z:0};
const selected=[...region.chunks.entries()].find(([key,c])=>c.roads.length>=1 &&
 Math.abs((c.roads[0].a[0]+c.roads[0].b[0])/2-x0)<95);
assert(selected,'Synthetic corridor must produce real streamed OSM road sectors');
const [chunkKey]=selected;
region.build(chunkKey);
const group=region.visible.get(chunkKey);
const npc=group.userData.ambient.find(a=>a.regionalTraffic);
assert(npc&&cars.includes(npc),'Regional NPC must be registered in shared real car collection');
assert(npc.mesh.isGroup,'Even hyper mode must use full 3D car group rather than a block');
assert([...npc.mesh.children].filter(a=>a.isMesh||a.isGroup).length>3,'Model body/wheels must be present');
assert(npc.spec===VEHICLES[npc.style]&&npc.damageVisual,'Padova vehicle specs and staged damage required');
assert(npc.dir===1,'OSM true one-way must prevent NPC contraflow');
const first={x:npc.x,z:npc.z};
for(let i=0;i<120;i++)region.updateRegionalCar(npc,1/20,i/20+.01);
const moved=Math.hypot(npc.x-first.x,npc.z-first.z);
assert(moved>5,'Shared real driving dynamics must move a regional NPC along the road: '+moved);
assert(npc.jump&&Number.isFinite(npc.y)&&Math.abs(npc.y-region.height(npc.x,npc.z,npc.y))<1,
 'Regional cars must have real gravity/contact state on the same rendered roadway');
assert(npc.health>0,'Normal straight road should not spontaneously explode');
npc.health=35;
region.updateRegionalCar(npc,.04,7);
assert(npc.damageVisual.stage>=2,'Same Padova damaged-body model must activate after collision');
npc.health=0;region.updateRegionalCar(npc,.05,8);
assert(region.explosions.length===1&&!npc.mesh.visible&&npc.destroyedUntil>8,
 'A destroyed regional car must explode and leave the road temporarily');
region.updateExplosions(11);
assert(region.explosions.length===0,'Explosion particles must be disposed after their lifetime');
npc.health=100;npc.mesh.visible=true;region.claimCar(npc);
assert(npc.mesh.parent===scene&&!npc.regionalTraffic&&cars.includes(npc),
 'Taking an NPC car must detach its complete driving entity before sector removal');
region.removeGroup(group);
assert(cars.includes(npc),'The stolen real car must remain drivable when its original sector streams out');
console.log('PASS R14: full Padova car and pedestrian visuals even on hyper, one-way motorway routing, live gravity/AI, staged damage and explosion, player takeover with chunk-safe persistence.');
