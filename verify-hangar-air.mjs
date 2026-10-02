import assert from 'node:assert/strict';
import {SpatialIndex} from './dist/core.js';
import {SPECIAL_VEHICLES,planeStep} from './dist/special-vehicles.js';
import {MICHELANGELO_SPEC} from './dist/unified-michelangelo.js';
import {roofDeparturePoint} from './dist/villa-mandria-hangar.js';
import {VILLA_GARAGE,villaGarageStructures} from './dist/villa-treves-layout.js';
import {helicopterStep} from './dist/modern-driving.js';

const terrain={modern:true,gameplayPatches:[{}],height:()=>0,elevation:()=>0,dry:()=>true,waterHeight:()=>-100},collision=new SpatialIndex(60);
for(const b of villaGarageStructures(terrain))if(b.solid)collision.add(b,b.minX,b.minZ,b.maxX,b.maxZ);
const game={terrain,collision,cars:[]};
for(const spec of [SPECIAL_VEHICLES.falco,MICHELANGELO_SPEC]){
 const p=roofDeparturePoint(game,spec);assert(p,'No safe air position above hangar');
 assert(p.y>VILLA_GARAGE.roofHeight+.4);
 const actor={...p,spec,vy:0};
 const result=(spec.plane?planeStep:helicopterStep)(actor,{forward:0,turn:0,up:0,down:0},1/60,terrain,collision);
 assert(!result?.crashed,'Air vehicle must survive first movement frame');
 assert(actor.y>VILLA_GARAGE.roofHeight,'No aircraft should fall inside hangar');
}
console.log('PASS hangar aircraft: helicopter above deck and Michelangelo airborne clear roof');
