import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pointInside,nearestOnSegment} from './dist/core.js';
import {HOSPITAL_MONOBLOCCO_NAME,findLayout,onTrack,HOSPITAL_ROOFTOP_EASTER_EGG} from './dist/hospital-rooftop-easter-egg.js';
const map=JSON.parse(fs.readFileSync(new URL('./dist/data/padova.json',import.meta.url)));
const b=map.buildings.find(b=>b.n===HOSPITAL_MONOBLOCCO_NAME);
assert(b,'exact OSM hospital Monoblocco must exist, no other nearby hospital fallback');
assert(b.p.length>=15,'must retain entire irregular building perimeter');
const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]);Object.assign(b,{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)});
const area=(b.maxX-b.minX)*(b.maxZ-b.minZ);assert(area>20000,'whole major block, not old 68x50 m small roof');
const layout=findLayout(b.p,b);assert(layout,'need continuous course and independent helipad on actual polygon');
assert(layout.points.length>=30&&layout.total>=45,'physical path must contain a substantial navigable circuit');
const edgeDistance=(x,z)=>Math.min(...b.p.map((p,i)=>{const q=nearestOnSegment(x,z,p,b.p[(i+1)%b.p.length]);return Math.hypot(q.x-x,q.z-z);}));
// The trial bike is .78 m wide; at 2.2 m from the parapet centre it retains
// >1.6 m of lateral safety clearance after accounting for half its width and rail.
for(let i=0;i<720;i++){const p=onTrack(layout,i/720);assert(pointInside(p.x,p.z,b.p),'trial route must not run over rooftop courtyards or outside footprint');assert(edgeDistance(p.x,p.z)>=2.2,'motorcycle and solid guardrail clearance');assert(Math.hypot(p.x-layout.helipad.x,p.z-layout.helipad.z)>=14.5,'separate helipad and trial path');}
assert(pointInside(layout.helipad.x,layout.helipad.z,b.p));assert(edgeDistance(layout.helipad.x,layout.helipad.z)>=16,'heli rotor circle and lights entirely inside physical rooftop');
assert(HOSPITAL_ROOFTOP_EASTER_EGG.wholeFootprint&&HOSPITAL_ROOFTOP_EASTER_EGG.ramps===3&&HOSPITAL_ROOFTOP_EASTER_EGG.woodenBridges===2&&HOSPITAL_ROOFTOP_EASTER_EGG.movingRiders===2);
const source=fs.readFileSync(new URL('./dist/hospital-rooftop-easter-egg.js',import.meta.url),'utf8'),upgrades=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8'),driving=fs.readFileSync(new URL('./dist/modern-driving.js',import.meta.url),'utf8'),exit=fs.readFileSync(new URL('./dist/hospital-helipad-exit.js',import.meta.url),'utf8');
assert(source.includes("from './monoblocco-track.js'")&&!source.includes('layout.rx')&&!source.includes('layout.rz'),'live game must use the verified polygon track, not the obsolete oval');
assert(source.includes('monoblocco-whole-footprint-flat-roof')&&source.includes('new THREE.ShapeGeometry(shape)'),'full irregular footprint visibly rendered flat, not a fabricated bounding rectangle');
assert(source.includes('hospitalRoofParapet:true')&&source.includes('hospitalRoofObstacle:true'),'physical parapets and course obstacles must exist');
assert(source.includes('c.rooftopParked=true')&&source.includes('c.fixedSpawn=false')&&source.includes('c.mesh.visible=true'),'parked helicopter must remain in world');
assert(exit.includes('c?.spec?.aircraft')&&exit.includes('s.mode===\'car\'')&&exit.includes('roofY'),'helicopter E exit must be height-aware only on this rooftop');
assert(source.includes('SPECIAL_VEHICLES.rooftrial=trialSpec')&&source.includes('game.terrain.slope='),'dedicated tight-turning bike and flat contact');
assert(upgrades.includes("hospital-rooftop-easter-egg.js")&&upgrades.includes("hospital-helipad-exit.js")&&driving.includes('function airLandingHeight'),'integrated runtime and elevated heli landing required');
console.log('ROOF_MONOBLOCCO',JSON.stringify({vertices:b.p.length,boundingArea:Math.round(area),trackMetres:Math.round(layout.total),routePoints:layout.points.length,helipad:[Math.round(layout.helipad.x),Math.round(layout.helipad.z)]}));
console.log('PASS full irregular Monoblocco roof, 720 motorcycle-clearance points, separate helipad and integrated custom bikes');
