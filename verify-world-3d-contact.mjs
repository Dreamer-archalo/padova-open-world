import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './dist/vendor/three.module.js';

globalThis.window = globalThis;
globalThis.document = {createElement: () => ({width: 0, height: 0, getContext: () => ({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};
// Patch order must match the production runtime, including the authored plazas.
await import('./dist/phase4-terrain-fixes.js');
await import('./dist/historic-terrain-level.js');
await import('./dist/historic-plaza-alignment.js');
const [{Terrain}, {CityWorld}, {applyCityData}, {prepareGameplayMap, AIRPORT, AIRPORT_GATE, VILLA, HOME, areaPoint}] = await Promise.all([
  import('./dist/terrain.js'), import('./dist/world.js'),
  import('./dist/districts.js'), import('./dist/gameplay-areas.js')
]);
const read = name => JSON.parse(fs.readFileSync(new URL(`./dist/data/${name}.json`, import.meta.url)));
const map = read('padova');
applyCityData(map, read('city'));
prepareGameplayMap(map);
const terrain = new Terrain(read('terrain'), map, {modern:true});
const report = {roadProfiles:0, roadSegments:0, roadContactSamples:0, roadContactFailures:[], gridSamples:0, nonfinite:0, chunks:[], meshTriangles:0, meshContactFailures:[], bridgeSamples:0, airportSamples:0};
const finite = (value, where) => { if(!Number.isFinite(value)){report.nonfinite++; throw Error(`Nonfinite 3D height at ${where}: ${value}`);} return value; };
const special = road => !!(road.crossing || road.tunnel || road.b || Number(road.layer) || road.k === 'steps');
// Scan the actual, fully prepared city road profiles, not just a small test fixture.
for(const profile of terrain.roads.profiles.values()){
  report.roadProfiles++;
  for(let i=1;i<profile.points.length;i++){
    const a=profile.points[i-1], b=profile.points[i], length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length<.01) continue;
    report.roadSegments++;
    for(let k=0;k<=Math.max(1,Math.ceil(length/12));k++){
      const fraction=k/Math.max(1,Math.ceil(length/12)), x=a[0]+(b[0]-a[0])*fraction, z=a[1]+(b[1]-a[1])*fraction;
      const roadY=finite(terrain.roads.sample(profile.road,x,z),'road'), physicalY=finite(terrain.height(x,z),'physics');
      const groundY=finite(terrain.groundHeight(x,z),'ground');
      if(special(profile.road)){report.bridgeSamples++; continue;}
      // At intersections, a different road can be the nearest physical support.
      const nearest=terrain.roads.at(x,z,null,.25);
      if(!nearest || nearest.road!==profile.road) continue;
      report.roadContactSamples++;
      const delta=Math.abs(physicalY-roadY);
      if(delta>.35 && report.roadContactFailures.length<30)report.roadContactFailures.push({road:profile.road.n||profile.road.k,x:+x.toFixed(1),z:+z.toFixed(1),delta:+delta.toFixed(3),roadY:+roadY.toFixed(3),physicsY:+physicalY.toFixed(3),groundY:+groundY.toFixed(3)});
    }
  }
}
// Include airport runway, entrance, parking edge and villa across a three-dimensional grid.
for(const [name,area,u0,u1,v0,v1,step] of [
  ['airport',AIRPORT,-85,215,-560,560,16],
  ['villa',VILLA,-45,45,-42,50,6]
])for(let u=u0;u<=u1;u+=step)for(let v=v0;v<=v1;v+=step){
  const p=areaPoint(area,u,v), loc=`${name} (${u}, ${v})`;
  finite(terrain.height(p.x,p.z),`${loc} physics`);
  finite(terrain.groundHeight(p.x,p.z),`${loc} ground`);
  finite(terrain.elevation(p.x,p.z),`${loc} elevation`);
  report.gridSamples++;
  if(name==='airport')report.airportSamples++;
}
// Real generated triangles: compare render vertex height against the very same terrain
// resolver used for contact, rather than treating a static syntax check as 3D QA.
const world=new CityWorld(new THREE.Scene(),map,terrain,'hyper');
for(const [name,p] of [['airport entrance',AIRPORT_GATE],['runway',areaPoint(AIRPORT,0,0)],['villa spawn',HOME]]){
  const key=Math.floor(p.x/320)+','+Math.floor(p.z/320);
  assert(world.chunks.has(key),`Missing 3D chunk at ${name}: ${key}`);
  for(const _ of world.buildStageSteps(key,'core')){}
  const root=world.loaded.get(key);
  assert(root?.userData.coreReady,`Core mesh not ready: ${name}`);
  const mesh=root.userData.core.children.find(o=>o.isMesh&&!o.userData.streamRoads&&!o.userData.streamBuildings&&(o.material===world.groundMat||o.userData.detailedMaterial===world.groundMat));
  assert(mesh,`Visible ground triangles absent from ${name}`);
  const positions=mesh.geometry.attributes.position;
  let triangles=0,maxContactGap=0,invalid=0;
  for(let i=0;i+2<positions.count;i+=3){
    const verts=[0,1,2].map(j=>[positions.getX(i+j),positions.getY(i+j),positions.getZ(i+j)]);
    if(!verts.flat().every(Number.isFinite)){invalid++;continue;}
    triangles++;
    for(const [x,y,z] of verts){
      const expected=finite(terrain.groundHeight(x,z),'mesh support')-.08;
      const gap=Math.abs(y-expected);maxContactGap=Math.max(maxContactGap,gap);
      if(gap>.30&&report.meshContactFailures.length<30)report.meshContactFailures.push({chunk:name,x:+x.toFixed(1),z:+z.toFixed(1),gap:+gap.toFixed(3)});
    }
  }
  assert.equal(invalid,0,`Nonfinite world-space triangles at ${name}`);
  assert(triangles>0,`Empty ground geometry: ${name}`);
  report.meshTriangles+=triangles;
  report.chunks.push({name,key,triangles,maxContactGap:+maxContactGap.toFixed(3)});
}
assert(report.roadProfiles>10000,'Map-wide road profiles not scanned');
assert(report.roadContactSamples>10000,'Insufficient physical/road contact coverage');
assert(report.airportSamples>1000,'Airport 3D grid coverage too small');
assert(report.meshTriangles>0,'No real 3D meshes generated');
report.ok=report.nonfinite===0&&report.roadContactFailures.length===0&&report.meshContactFailures.length===0;
console.log('WORLD_3D_CONTACT_AUDIT',JSON.stringify(report,null,2));
assert.equal(report.roadContactFailures.length,0,'Road surface differs from physical support (examples in audit)');
assert.equal(report.meshContactFailures.length,0,'Visible 3D ground differs from physical ground (examples in audit)');
