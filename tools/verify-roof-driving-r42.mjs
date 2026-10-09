import assert from 'node:assert/strict';
import vm from 'node:vm';
import {SpatialIndex,pointInside} from '../dist/core.js';
import {vehicleBlocked} from '../dist/movement.js';
import {vehicleContact} from '../dist/vehicle-contact.js';
import {RoofSurfaces,flatRoofTriangles,regionalRoofTriangles,installRoofSurfaces} from '../dist/roof-surfaces.js';
import {groundVehicleStep,startArcadeJump,landingDamage,groundContact} from '../dist/vehicle-dynamics.js';
import {VEHICLES} from '../dist/vehicles.js';
import {t,ctx} from './controller-harness.mjs';

const input={turn:0,handbrake:false};
function building(p,h=12){return {p,h,minY:0,minX:Math.min(...p.map(q=>q[0])),maxX:Math.max(...p.map(q=>q[0])),minZ:Math.min(...p.map(q=>q[1])),maxZ:Math.max(...p.map(q=>q[1]))};}
const rectangle=[[-50,-30],[50,-30],[50,250],[-50,250]];
const shapes=[
 {name:'flat',b:building(rectangle)},
 {name:'pitched',b:building([[-18,-30],[18,-30],[18,250],[-18,250]])},
 {name:'concave',b:building([[-50,-30],[50,-30],[50,250],[15,250],[15,150],[-15,150],[-15,250],[-50,250]])}
];
for(const {name,b} of shapes)for(const hz of [20,30,60,120]){
 const terrain={height:()=>0,slope:()=>0,waterAt:()=>null},roofs=installRoofSurfaces(terrain),collision=new SpatialIndex();
 roofs.add(b,name==='pitched'?regionalRoofTriangles(b):flatRoofTriangles(b));collision.add(b,b.minX,b.minZ,b.maxX,b.maxZ);
 const actor={x:0,z:-100,y:0,yaw:0,speed:20,health:100},car={spec:VEHICLES.sedan,health:100};
 assert(startArcadeJump(actor,car));let landed=false,damage=0;
 for(let i=0;i<hz*8;i++){const m=groundVehicleStep(actor,car,input,1/hz,terrain,collision);assert.equal(m.hitSpeed,0,`${name}: roof landing must not hit facade`);damage+=landingDamage(m,car);if(m.landed){landed=true;break;}}
 assert(landed&&pointInside(actor.x,actor.z,b.p));assert.equal(actor.y,terrain.height(actor.x,actor.z,actor.y));assert.equal(damage,1);assert.equal(actor.speed,20);
 assert(!vehicleBlocked(actor.x,actor.z,actor.yaw,collision,car.spec,actor.y));assert(!vehicleContact(actor.x,actor.z,actor.yaw,collision,car.spec,actor.y));
 const before={...actor};for(let i=0;i<hz;i++)groundVehicleStep(actor,car,{...input,turn:.3},1/hz,terrain,collision);
 assert(Math.hypot(actor.x-before.x,actor.z-before.z)>15,`${name}: continued roof driving`);assert(Math.abs(actor.yaw)>0);
 actor.speed=0;assert(startArcadeJump(actor,car),`${name}: immediate repeat jump`);assert(!startArcadeJump(actor,car),'no mid-air stacking');
 for(let i=0;i<hz*8&&car.jump.airborne;i++)groundVehicleStep(actor,car,input,1/hz,terrain,collision);
 assert(!car.jump.airborne);assert.equal(actor.y,terrain.height(actor.x,actor.z,actor.y));
 assert(vehicleBlocked(0,0,0,collision,car.spec,0),'facade remains solid at street level');
}

// Every sample on a real roof has finite support, including irregular polygons.
let buildings=0,samples=0;
for(const b of t.terrain.roofs.buildings){
 assert(b.roofTriangles.length,'physical roof triangles for every building');buildings++;
 for(const triangle of b.roofTriangles){const x=triangle.reduce((s,v)=>s+v[0],0)/3,z=triangle.reduce((s,v)=>s+v[2],0)/3;if(!pointInside(x,z,b.p))continue;const roof=b.roofAt(x,z);assert(roof&&Number.isFinite(roof.y+roof.dx+roof.dz));samples++;}
}
assert(buildings>1000&&samples>buildings);
assert.doesNotThrow(()=>structuredClone({buildings:t.world.chunks.values().next().value.buildings}),'roof callbacks must never break streaming worker messages');

// A steep continuous roof is legal even when its next sample rises farther
// than the street-level anti-teleport tolerance in one swept substep.
const steep=building([[-100,-100],[100,-100],[100,100],[-100,100]],400),steepTerrain={height:()=>0,slope:()=>0,waterAt:()=>null};
const steepRoofs=installRoofSurfaces(steepTerrain);steepRoofs.add(steep,[[[-100,0,-100],[100,400,-100],[100,400,100]],[[-100,0,-100],[100,400,100],[-100,0,100]]]);const steepCollision=new SpatialIndex();steepCollision.add(steep,-100,-100,100,100);
for(const yaw of [Math.PI/4,Math.PI/2,Math.PI*.75]){const actor={x:0,z:0,y:200.04,yaw,speed:35},car={spec:VEHICLES.sedan};for(let i=0;i<30;i++){const m=groundVehicleStep(actor,car,input,1/60,steepTerrain,steepCollision);assert.equal(m.hitSpeed,0);assert(!m.airborne);}assert(actor.x>10&&actor.y>220,'continuous uphill roof remains driveable');}

// The concave courtyard remains an actual void; leaving any edge is ballistic,
// including reverse/slow motion. A ground car cannot teleport onto the roof.
const b=shapes[2].b,terrain={height:()=>0,slope:()=>0,waterAt:()=>null},roofs=installRoofSurfaces(terrain),collision=new SpatialIndex();roofs.add(b,flatRoofTriangles(b));collision.add(b,b.minX,b.minZ,b.maxX,b.maxZ);
assert.equal(terrain.height(0,190,15),0);assert.equal(terrain.height(0,0,0),0);assert.equal(terrain.height(0,0),0);
for(const speed of [.5,-.5,20]){
 const actor={x:0,z:149.999,y:12.04,yaw:speed<0?Math.PI:0,speed},car={spec:VEHICLES.sedan};
 const m=groundVehicleStep(actor,car,input,1/60,terrain,collision);assert(m.airborne,'roof edge must release even a slow/reversing car');assert(actor.y>11.9,'no snap to ground');
}
const wet={height:()=>0,slope:()=>0,waterAt:()=>-1};installRoofSurfaces(wet).add(b,flatRoofTriangles(b));assert.equal(wet.waterAt(0,0,0,12.04),null);assert.equal(wet.waterAt(0,190,0,0),-1);

// Authored roof below a building's global top: local facade collision must end
// at the actual sloping surface, rather than trapping the car inside its AABB.
const authored=building(rectangle,35),r=new RoofSurfaces();r.add(authored,flatRoofTriangles(authored,21.5));const walls=new SpatialIndex();walls.add(authored,authored.minX,authored.minZ,authored.maxX,authored.maxZ);
assert(!vehicleBlocked(0,0,0,walls,VEHICLES.sedan,21.54));assert(vehicleBlocked(0,0,0,walls,VEHICLES.sedan,10));

// Actual controller + 9/Numpad9 on a real warehouse roof; no physics mocks.
for(const c of t.cars)c.mesh.visible=false;t.keys.clear();
const site=[...t.terrain.roofs.buildings].find(b=>b.t==='warehouse'&&b.maxX-b.minX>35&&b.maxZ-b.minZ>35&&pointInside(b.cx,b.cz,b.p));assert(site);
const roof=site.roofAt(site.cx,site.cz),car=t.addCar(site.cx,site.cz,0,false,true,'sedan');car.mesh.visible=true;car.health=100;car.y=roof.y+.04;
Object.assign(t.state,{mode:'car',car,x:site.cx,z:site.cz,y:car.y,yaw:0,speed:0,health:100,paused:false});t.poseVehicle(car);
const manager=vm.runInContext('inputManager',ctx);manager.onKeyDown({code:'Digit9',repeat:false});assert(car.jump.airborne);
for(let i=0;i<600&&car.jump.airborne;i++)t.movePlayer(1/60);assert(!car.jump.airborne);assert.equal(t.state.health,99);assert(Math.abs(t.state.y-(roof.y+.04))<.001);
t.keys.add('KeyW');const start={...t.state};for(let i=0;i<70;i++)t.movePlayer(1/60);t.keys.clear();assert(Math.hypot(t.state.x-start.x,t.state.z-start.z)>3);assert.equal(t.state.health,99);assert.equal(car.mesh.position.y,t.state.y);
manager.onKeyDown({code:'Numpad9',repeat:false});assert(car.jump.airborne,'actual keyboard can immediately jump from a roof');
assert(Number.isFinite(groundContact(t.terrain,t.state.x,t.state.z,t.state.y,car).y));
console.log('PASS R42: roof landings at 20/30/60/120 Hz, retained momentum, steering, immediate repeat jumps, concave voids, slow/reverse edge falls, solid street facades, dry roofs over water, authored local clearance and real controller keyboard.',{buildings,samples});
