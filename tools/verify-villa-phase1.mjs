import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {VILLA,HOME,areaPoint,gameplaySpawns,gameplayStructures} from '../dist/gameplay-areas.js';
import {villaGarageStructures,VILLA_GARAGE,VILLA_GARAGE_BAYS} from '../dist/villa-treves-layout.js';
import {villaEstateUpdate} from '../dist/villa-treves-estate.js';
import {VILLA_PUBLIC_NAME} from '../dist/villa-mandria-relocation.js';
import {vehicleBlocked} from '../dist/movement.js';

const elevation=10,terrain={modern:true,gameplayPatches:[{height:elevation}],
 elevation:()=>elevation,height:()=>elevation,groundHeight:()=>elevation};
const garage=villaGarageStructures(terrain),structures=gameplayStructures(terrain);
assert(garage.length>=12&&structures.length>=garage.length,'garage uses regular authored building pipeline');
assert.equal(villaGarageStructures({...terrain,modern:false}).length,0,'no garage in historical map');
assert.equal(villaGarageStructures({...terrain,gameplayPatches:[]}).length,0,'no garage before terrain patch');
assert.equal(VILLA_GARAGE.entranceU,21);
assert.equal(VILLA_GARAGE_BAYS.length,3,'three future parking bays');
assert(garage.some(s=>s.solid&&s.minY>elevation+4.8),'physical roof is above parked vehicles');
assert(garage.some(s=>s.solid&&s.h>=5),'garage walls have real collision');
assert(garage.filter(s=>s.h<.2).every(s=>!s.solid),'floor markings do not cause invisible kerbs');
assert(garage.every(s=>Number.isFinite(s.minX+s.maxX+s.minZ+s.maxZ+s.y)),'valid collision bounds');
const index={near:()=>garage.filter(s=>s.solid)};
const car={width:2.1,length:4.6,height:1.85};
for(const v of [51,49,42,35,26]){
 const p=areaPoint(VILLA,0,v);
 assert(!vehicleBlocked(p.x,p.z,0,index,car,elevation),`driveway must remain clear at ${v}`);
}
for(const u of [4,10,16,20,24,27,30,33,35]){
 const p=areaPoint(VILLA,u,26);
 assert(!vehicleBlocked(p.x,p.z,Math.PI/2,index,car,elevation),`garage must be drive-in accessible at ${u}`);
}
for(const p of gameplaySpawns().filter(p=>p.name===VILLA_PUBLIC_NAME)){
 const spec=p.style==='tank'?{width:3.3,length:7,height:2.7}:
 ['motorcycle','cruiser'].includes(p.style)?{width:1.15,length:2.5,height:1.4}:car;
 assert(!vehicleBlocked(p.x,p.z,p.yaw,index,spec,elevation),`preserve ${p.style} at villa`);
}
assert(Math.hypot(HOME.x-VILLA.x,HOME.z-VILLA.z)<32,'respawn inside villa');
let welcomes=0;
const game={state:{started:true,x:VILLA.x,z:VILLA.z,elapsed:1},terrain,
 scene:new THREE.Group(),toast(){welcomes++;}};
villaEstateUpdate(game,1/60);
assert(game.villaEstate?.root.visible,'visual estate loads near spawn');
let meshCount=0,shadows=0;game.villaEstate.root.traverse(o=>{
 if(o.isMesh){meshCount++;if(o.castShadow)shadows++;}
});
assert(meshCount>30&&meshCount<130&&shadows===0,'bounded mesh detail without shadow cost');
const fountainRotation=game.villaEstate.fountain.rotation.y;
villaEstateUpdate(game,1/60);
assert(game.villaEstate.fountain.rotation.y>fountainRotation,'fountain animates');
assert.equal(welcomes,1,'estate welcome is not repeated each frame');
game.state.x=VILLA.x+600;villaEstateUpdate(game,1/60);
assert.equal(game.villaEstate.root.visible,false,'decorations cull when far away');
game.state.x=VILLA.x;villaEstateUpdate(game,1/60);
assert.equal(game.villaEstate.root.visible,true,'decorations recover when returning');
console.log('PASS villa: 3-bay garage, driveway, existing car spawns, real roof/walls, no curbs, visual LOD and fountain');
