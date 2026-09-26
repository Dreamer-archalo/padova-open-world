import assert from 'node:assert/strict';
import fs from 'node:fs';
import {swimBodyPitch} from './dist/foot-controller.js';
import {VectorMapDetail} from './dist/unified-map-detail.js';

const read=p=>fs.readFileSync(p,'utf8');
const game=read('dist/game.js'),reg=read('dist/regional-world.js'),
 map=read('dist/unified-map.js'),html=read('dist/index.html');
assert(html.includes('MAPPA-GTA-R8'),'Cannot tell new R6 build from outdated preview');
assert(swimBodyPitch()>.95&&swimBodyPitch()<1.57,
 'Upright human +Y head must pitch FORWARD toward +Z, not upside down');
assert.equal(swimBodyPitch(true),0,'Landing must reset body pitch');
assert(game.includes('player.rotation.set(swimBodyPitch(result?.landed)'),
 'Swim update still uses reversed body orientation');
assert(game.includes('player.rotation.set(swimBodyPitch(false)'),
 'First swimming frame still flips the body');
assert(map.includes('Raster-free GTA-inspired vectors'),
 'All-map GTA style must be consistent without raster tiles');
assert(map.includes('this.lastTileStats={ready:0,pending:0,vector:true}')&&
 map.includes('const tiles={ready:0,pending:0,vector:true}'),
 'GTA full map and minimap must both use vector-only style');

const details=new VectorMapDetail({
 areas:[{k:'water',p:[[0,0],[30,0],[30,40],[0,40]]}],
 water:[{p:[[0,15],[30,15]],w:10}],
 buildings:[{p:[[1,1],[5,1],[5,5],[1,5]],lod:'detailed'}],
 roads:[{p:[[-20,-8],[40,-8]],w:8,k:'residential',n:'Via libera'}]
},null);
const draw=(mini,scale)=>{
 const color=[],ctx={fillStyle:'',strokeStyle:'',canvas:{},save(){},restore(){},
 setTransform(){},fillRect(){color.push(this.fillStyle);},beginPath(){},
 rect(){},clip(){},moveTo(){},lineTo(){},closePath(){},
 fill(){color.push(this.fillStyle);},stroke(){color.push(this.strokeStyle);},
 translate(){},rotate(){},fillText(){},strokeText(){},
 measureText(){return {width:18}}};
 const out=details.draw(ctx,{x:8,z:8},600,440,scale,{pixelRatio:2,mini});
 assert(out.vector,'Maps must retain real-size vector shapes');
 return color;
};
const mini=draw(true,.8),full=draw(false,.8);
assert(mini.includes('#386a7d')&&mini.includes('#dee1db'),
 'Minimap must have muted water and legible simple roads');
assert(!mini.includes('#535e60'),'Minimap must not be crowded with building details');
assert(full.includes('#535e60'),'Full map may show local building silhouettes');
assert(!mini.includes('#eed1a2')&&!mini.includes('#b2c7b3'),
 'Old multicolour street palettes are still leaking into the map');

for(const feature of ['glassFaces','roadStripes','roadSigns','distantWalls']){
 assert(reg.includes(feature),'Missing batched regional visual feature: '+feature);
}
assert(reg.includes('const steps=near?14:7')&&
 reg.includes('for(let i=0;i<1&&this.queue.length;i++)'),
 'Venice chunks still use expensive laguna meshing or double rebuilds');
assert(reg.includes('const peopleRoads=chunk.roads.filter(r=>/') &&
 !reg.includes('const peopleRoads=chunk.roads.filter(r=>isDetailed(r)'),
 'Simple NPCs are still restricted to just a few detailed hubs');
// Evaluate the real road-height method in isolation: the curvature must
// leave navigable clearance while maintaining flat, driveable approach ends.
const methodStart=reg.indexOf(' roadY(road,x,z,t){');
const methodEnd=reg.indexOf('\n insertSpatial(',methodStart);
assert(methodStart>=0&&methodEnd>methodStart,'Could not extract the live 3D bridge height code');
const method=reg.slice(methodStart,methodEnd).trim().replace(/^roadY\(/,'function roadY(');
const roadY=new Function('coast','LAGOON_Y',
 'return ('+method+')')((x,z)=>x>33000&&z>-7800&&z<3000,.1);
const terrain={raw:()=>0};
const walk={b:true,k:'footway'},highway={b:true,k:'motorway'};
const start=roadY.call(terrain,walk,36100,-3200,0),
 top=roadY.call(terrain,walk,36100,-3200,.5),
 finish=roadY.call(terrain,walk,36100,-3200,1);
assert(top>.1+3.6,'Pedestrian bridge fails boat passage clearance');
assert(Math.abs(start-finish)<.0001,'Bridge approaches are no longer level');
assert(roadY.call(terrain,highway,36100,-3200,.5)>top+1.5,
 'Vehicle bridges should have higher navigable clearance');
console.log('PASS: forward-facing swimmer, muted vector full+mini maps, batched town facade/marking/NPC code, reduced Venice workload, elevated boat-clearance bridges.');
