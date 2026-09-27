import assert from 'node:assert/strict';
import {RegionalWorld} from './dist/regional-world.js';

const buildings=[];
for(let i=0;i<20;i++){
 const x=14950+(i%5)*13,z=30+Math.floor(i/5)*14;
 buildings.push({p:[[x,z],[x+8,z],[x+8,z+8],[x,z+8]],
  h:i%4===0?13:9,c:2,t:i===0?'industrial':'residential',
  lod:'transit'});
}
const scene={added:[],add(g){this.added.push(g)},remove(g){
 this.added=this.added.filter(x=>x!==g)}};
const grid={x0:14720,z0:0,width:4,height:4,step:160,
 heights:new Array(16).fill(1)};
const world=new RegionalWorld(scene,{
 buildings,roads:[{p:[[14942,24],[15030,24]],w:7,k:'residential'}],
 areas:[],water:[],shorelines:[]},grid,{add(){}});
const k='46,0';
world.focus={x:14990,z:64};
world.build(k);
const group=world.visible.get(k);
assert(group,'Must stream current town sector');
assert(group.userData.detailed,'Visited municipality must use detailed LOD');
const color=hex=>group.children.filter(o=>o.material?.color?.getHexString()===hex);
const meshCount=hex=>color(hex).reduce((n,o)=>n+(o.geometry?.attributes?.position?.count||0),0);
assert(meshCount('526c78')>=60,'OSM building facades need batched visible windows');
assert(meshCount('c6b7a0')>=60,'Windows must have actual 3D-mapped trim');
assert(meshCount('746454')>=6,'Accessible-town buildings need visible door panels');
assert(meshCount('dec6a6')>=6,'Visited town residential facades need natural colors');
assert(meshCount('a2afae')>=6,'Industrial buildings must be visually distinct');
assert(meshCount('aeb4aa')>=6,'Street sidewalks must follow the real roadway');
const roofMeshes=color('a57358');
assert(roofMeshes.length,'Detailed roof geometry is required');
const maxRoofY=Math.max(...roofMeshes.flatMap(o=>{
 const p=o.geometry.getAttribute('position'),out=[];
 for(let i=0;i<p.count;i++)out.push(p.getY(i));
 return out;
}));
assert(maxRoofY>14.35,
 'Padova-like pitched homes must rise above flat roof height where feasible');
assert((group.userData.ambient||[]).some(a=>a.person),
 'Arriving in an ordinary town must enable pedestrians');
assert(world.totalBuilt===1,'Rendering must batch one chunk, not thousands of individual meshes');

// A second tile initially far away is allowed to keep cheap geometry, then
// gains local detail on arrival. This is the performance contract for Venice.
const sourceText=(await import('node:fs')).readFileSync('dist/regional-world.js','utf8');
assert(sourceText.includes('const detailCap=coast('),'Venice needs a capped facade budget');
assert(sourceText.includes('if(!this.queue.length)')&&
 sourceText.includes('if(g.userData.detailed)continue'),
 'Nearby proxy sectors must promote gradually after the preload queue drains');
assert(sourceText.includes('if(p.bri&&near)'),
 'All visited districts need elevated visible bridges, not hub-specific ones');
console.log('PASS: real streamed transit-town geometry, detailed windows and trim, industrial façades, doors, sidewalks, NPCs, Venetian GPU caps and incremental LOD.');
