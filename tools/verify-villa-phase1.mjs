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
assert(garage.length>=12&&structures.length>=garage.length,'hangar uses authored collision pipeline');
assert.equal(villaGarageStructures({...terrain,modern:false}).length,0,'no hangar in historical map');
assert.equal(villaGarageStructures({...terrain,gameplayPatches:[]}).length,0,'no hangar before terrain patch');
assert.equal(VILLA_GARAGE.entranceU,5);
assert(VILLA_GARAGE.w>=38&&VILLA_GARAGE.d>=42&&VILLA_GARAGE.roofHeight>9,'hangar fits aircraft and articulated trucks');
assert.equal(VILLA_GARAGE_BAYS.length,3,'floor bay markings retained');
assert(garage.some(s=>s.solid&&s.minY>elevation+9),'physical roof clears aircraft');
assert(garage.some(s=>s.solid&&s.h>=10),'hangar walls have real collision');
assert(garage.filter(s=>s.h<.2).every(s=>!s.solid),'floor markings have no invisible kerbs');
assert(garage.every(s=>Number.isFinite(s.minX+s.maxX+s.minZ+s.maxZ+s.y)),'valid collision bounds');
const index={near:()=>garage.filter(s=>s.solid)};
const car={width:2.1,length:4.6,height:1.85};
for(const v of [51,49,42,35,26]){
 const p=areaPoint(VILLA,0,v);
 assert(!vehicleBlocked(p.x,p.z,0,index,car,elevation),`driveway clear at ${v}`);
}
for(const u of [4,10,16,20,24,27,30,33,35]){
 const p=areaPoint(VILLA,u,26);
 assert(!vehicleBlocked(p.x,p.z,-Math.PI/2,index,car,elevation),`hangar drive-in clear at ${u}`);
}
const display=areaPoint(VILLA,24,26);
for(const [name,spec] of [['cargo',{width:33,length:27,height:8}],['Blackbird',{width:18,length:31,height:5.8}],['autotreno',{width:2.55,length:22.6,height:3.9}]]){
 assert(!vehicleBlocked(display.x,display.z,-Math.PI/2,index,spec,elevation),`${name} must fit inside the hangar`);
}
const spawns=gameplaySpawns().filter(p=>p.name===VILLA_PUBLIC_NAME);
assert.equal(spawns.length,7,'all seven existing vehicles retained in west-side parking');
for(const p of spawns){
 const spec=p.style==='tank'?{width:3.3,length:7,height:2.7}:
 ['motorcycle','cruiser'].includes(p.style)?{width:1.15,length:2.5,height:1.4}:car;
 assert(!vehicleBlocked(p.x,p.z,p.yaw,index,spec,elevation),`preserve ${p.style} at villa`);
 assert(p.x<VILLA.x,'legacy parked vehicles must not overlap the east hangar');
}
assert(Math.hypot(HOME.x-VILLA.x,HOME.z-VILLA.z)<32,'respawn inside estate');
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
assert.equal(welcomes,1,'welcome not repeated every frame');
game.state.x=VILLA.x+600;villaEstateUpdate(game,1/60);
assert.equal(game.villaEstate.root.visible,false,'decorations cull when far away');
game.state.x=VILLA.x;villaEstateUpdate(game,1/60);
assert.equal(game.villaEstate.root.visible,true,'decorations recover');
console.log('PASS Mandria hangar: cargo/jet fit, seven preserved vehicles, clear access, real roof/walls, no kerbs, visual LOD');
