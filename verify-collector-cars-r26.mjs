import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as THREE from './dist/vendor/three.module.js';
import {COLLECTOR_CARS,COLLECTOR_IDS,rareCollectorStyle,COLLECTOR_CHANCE} from './dist/collector-cars.js';
import {VEHICLES} from './dist/vehicles.js';
import {createSpecialVehicle} from './dist/special-vehicles.js';
import {chooseTrafficStyle} from './dist/modern-vehicles.js';
import {hangarCatalogue,paintHangarVehicle} from './dist/villa-mandria-hangar.js';
import {hangarSection,hangarPreviewModel} from './dist/villa-mandria-catalog-ui.js';
import {actorDetail} from './dist/quality.js';
import {RegionalWorld} from './dist/regional-world.js';
import {SpatialIndex} from './dist/core.js';

assert.equal(COLLECTOR_IDS.length,16);
const hashes=new Set(),counts={};let maxTriangles=0;
for(const id of COLLECTOR_IDS){
 const s=COLLECTOR_CARS[id];assert.equal(VEHICLES[id],s);assert.equal(hangarSection(id),'collector');
 assert(hangarCatalogue().some(e=>e.id===id));
 for(const stat of ['width','length','height','wheelbase','max','boost','reverse','accel','brake','steer','mass'])assert(Number.isFinite(s[stat])&&s[stat]>0,id+': '+stat);
 const g=createSpecialVehicle(id),mesh=g.children[0],geo=mesh.geometry;
 assert.equal(g.children.length,4,'Collector cars retain four real surface materials');
 const bounds=new THREE.Box3().setFromObject(g),size=bounds.getSize(new THREE.Vector3());
 assert(size.x<=s.width+.0001&&size.y<=s.height+.0001&&size.z<=s.length+.0001,id+': model contained in physics footprint');
 assert(bounds.min.y>=-.0001,id+': wheels rest on the ground');
 hashes.add(createHash('sha256').update(Buffer.from(geo.attributes.position.array.buffer)).digest('hex'));
 const triangles=g.children.reduce((n,o)=>n+o.geometry.attributes.position.count/3,0);maxTriangles=Math.max(maxTriangles,triangles);assert(triangles<9000,id+': detailed collector traffic budget');
assert.equal(hangarPreviewModel(id).userData.collectorCar,id);
 const before=g.children.map(o=>o.geometry.attributes.color.array.slice()),flags=g.children.map(o=>o.geometry.attributes.collectorPaint.array);
 paintHangarVehicle(g,'#214b88');let changed=0,protectedVertices=0;
 for(const [j,o] of g.children.entries())for(let i=0;i<before[j].length;i++)if(flags[j][Math.floor(i/3)])changed+=o.geometry.attributes.color.array[i]!==before[j][i];else{assert.equal(o.geometry.attributes.color.array[i],before[j][i],id+': trim, glass, lights and wheels retain signature');protectedVertices++;}
 assert(changed>100&&protectedVertices>100,id+': paint body without erasing details');
 const fresh=createSpecialVehicle(id);for(const [j,o] of fresh.children.entries())assert.deepEqual(o.geometry.attributes.color.array,before[j],id+': paint isolated from template');
 paintHangarVehicle(g,null);for(const [j,o] of g.children.entries())assert.deepEqual(o.geometry.attributes.color.array,before[j],id+': restore original livery');
 actorDetail({mesh:g,spec:s},true);assert(mesh.visible,id+': retain special silhouette in hyper performance');assert(!g.children.some(o=>o.userData.sharedRenderProxy));
 counts[id]=0;
}
assert.equal(hashes.size,16,'all 16 cars have different 3-D geometry');
let seed=261026,total=0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<100000;i++){const style=chooseTrafficStyle('urban',random,{k:'secondary',w:9});if(COLLECTOR_CARS[style]){counts[style]++;total++;}}
assert(Math.abs(total/100000-COLLECTOR_CHANCE)<.002,'special traffic remains rare');
assert(Object.values(counts).every(v=>v>65&&v<150),'all 16 models available with comparable chance');
assert.equal(rareCollectorStyle(()=>0,{k:'footway',w:10}),null);
assert.equal(rareCollectorStyle(()=>0,{k:'secondary',w:2}),null);
assert.equal(rareCollectorStyle(()=>0,{k:'secondary',w:10,access:'private'}),null);

// Scan the actual regional spawn routine, rather than only a synthetic RNG.
const regionalFile='dist/data/region-padova-venice.json';let regional=null;
if(fs.existsSync(regionalFile)){
 const map=JSON.parse(fs.readFileSync(regionalFile,'utf8')),grid=JSON.parse(fs.readFileSync('dist/data/world-terrain.json','utf8'));
 const world=new RegionalWorld(new THREE.Scene(),map,grid,new SpatialIndex(80));world.quality='low';
 const found=Object.fromEntries(COLLECTOR_IDS.map(id=>[id,0]));let cars=0;
 for(const chunk of world.chunks.values()){
  const group=new THREE.Group();world.ambient(group,chunk);
  for(const c of group.userData.ambient||[])if(c.spec){cars++;if(found[c.style]!==undefined){found[c.style]++;assert(c.spec.width+1.1<=c.road.w);}}
 }
 assert(Object.values(found).every(n=>n>0),'every model can be encountered on real regional roads: '+JSON.stringify(found));
 const special=Object.values(found).reduce((a,b)=>a+b,0);assert(special/cars<.03,'regional collection stays rare');regional={cars,special,found};
}
// Traverse entry-point imports: dormant archived multiplayer files cannot run.
const html=fs.readFileSync('dist/index.html','utf8'),seen=new Set();
function visit(file){
 if(seen.has(file)||!fs.existsSync(file))return;seen.add(file);
 const source=fs.readFileSync(file,'utf8');
 for(const match of source.matchAll(/(?:import\s*(?:[^;\n]*?from\s*)?|export\s+[^;\n]*?from\s*)['"](\.\.?\/[^'"]+)['"]/g))visit(path.resolve(path.dirname(file),match[1].split('?')[0]));
}
for(const m of html.matchAll(/<script[^>]+src="([^"]+)"/g))visit(path.resolve('dist',m[1].split('?')[0]));
assert(![...seen].some(file=>/\/(?:multiplayer|online-race)[^/]*\.js$/.test(file)),'solo startup must not import multiplayer or online race hooks');
console.log('PASS R26 collector fleet / solo entry',JSON.stringify({models:COLLECTOR_IDS.length,maxTriangles,trafficFraction:total/100000,counts,regional,loadedModules:seen.size}));
