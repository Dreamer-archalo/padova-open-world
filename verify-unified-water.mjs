import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WaterGameplay} from './dist/water-gameplay.js';
import {clipPolygon,coastalBand} from './dist/regional-hydro.js';
const read=p=>fs.readFileSync(p,'utf8');
const source=read('dist/game.js'),water=read('dist/regional-world.js');
const html=read('dist/index.html'),workflow=read('.github/workflows/unified-main-preview.yml');
const region=JSON.parse(read('dist/data/region-padova-venice.json'));
const osm=region.areas.filter(a=>a.osm);
assert(osm.some(a=>a.k==='water'),'Porto Marghera basins missing from focused OSM water extract');
assert(osm.some(a=>a.k==='land'),'Mapped dry coastal parcels missing; Venice islands may be flooded');
assert(water.includes('this.lagoonAt(')&&water.includes('this.mappedWater('),'Visual and physical regional hydrology are inconsistent');
assert(water.includes('sheet.renderOrder=1')&&water.includes('waterMesh.renderOrder=2'),'Layered blue sea/canal meshes absent');
assert(!water.includes('new THREE.PlaneGeometry(CHUNK,CHUNK)'),'Unmasked rectangular sea plane still floods islands');
assert(source.includes('waterGame.leaveVehicle(')&&source.includes('waterGame.startSwimming('),'Swimming and exiting vehicles not active');
assert(source.includes('waterGame.stepVehicle(')&&source.includes('waterGame.stepSwim('),'Sinking/swimming missing from main movement loop');
assert(source.includes('if(e.code===\'KeyR\')requestRecover()')&&source.includes('waterGame.active'),'Local R water recovery not wired');
assert(html.includes('id="waterStatus"')&&html.includes('unified-water.css'),'Water status HUD unavailable');
assert(workflow.includes('/tmp/corridor-hydrology.json'),'Build missing dedicated lagoon OSM input');

const rect=[[-20,-20],[20,-20],[20,20],[-20,20]];
const clipped=clipPolygon(rect,0,0,12,12);
assert(clipped.length>=3&&clipped.every(([x,z])=>x>=0&&x<=12&&z>=0&&z<=12),'Water polygon clipping leaks into another region');
assert(coastalBand(36000,-3000)&&!coastalBand(10000,-3000),'Coastal mask does not respect Padova');
const mesh={visible:true,position:{set(x,y,z){Object.assign(this,{x,y,z});}},rotation:{set(x,y,z){Object.assign(this,{x,y,z});}}};
const car={mesh,spec:{width:2,length:4,height:1.6},health:100,yaw:0};
const state={car,mode:'car',x:1,z:1,y:1,yaw:0,speed:3,vy:0,health:100};
const game=new WaterGameplay();
assert(game.enterVehicle(state,.18),'Car failed to enter water state');
let early;
for(let i=0;i<24;i++)early=game.stepVehicle(state,.1,.18);
assert(early.sink===0&&state.health===100,'Car must float for the first few seconds');
let after;
for(let i=0;i<60;i++)after=game.stepVehicle(state,.1,.18);
assert(after.sink>0&&mesh.position.y<.3,'Car must sink progressively after float delay');
assert(after.submerged,'Car must become submerged without instantly respawning');
const escaped=game.leaveVehicle(state,.18);
assert(escaped===car&&game.swimming&&state.mode==='foot'&&state.car===null,'E must let player escape and swim');
assert(game.abandoned.has(car),'Abandoned car must continue sinking');
const terrain={
 waterAt:(x)=>x>=8?null:.18,
 waterHeight:()=>.18,
 dry:(x)=>x>=8,
 height:(x)=>x>=8?.55:-1.2
};
const initialX=state.x;
for(let i=0;i<8;i++)game.stepSwim(state,{dx:.14,dz:0},.1,terrain,()=>true);
assert(state.x>initialX&&game.swimming,'Swimming should advance like walking');
for(let i=0;i<40;i++)game.stepSwim(state,{dx:0,dz:0,dive:true},.1,terrain,()=>true);
const before=state.health;
for(let i=0;i<70;i++)game.stepSwim(state,{dx:0,dz:0,dive:true},.1,terrain,()=>true);
assert(state.health<before,'Remaining submerged must decrease health after oxygen expires');
game.reset();
assert(!game.active,'R recovery must leave water state');
const shoreGame=new WaterGameplay();const walker={x:7,z:0,y:.18,speed:0,vy:0,elapsed:0,health:100};
shoreGame.startSwimming(walker,.18);
const shore=shoreGame.stepSwim(walker,{dx:1,dz:0},.5,terrain,()=>true);
assert(shore.landed&&!shoreGame.active,'Swimming must allow a walkable landing instead of forcing R');
console.log('PASS blue coastal basin extraction, clipped water physics, buoyancy, 4.5s float, gradual sinking, E escape, swimming, submerged health, walkable shore and local R state.');
