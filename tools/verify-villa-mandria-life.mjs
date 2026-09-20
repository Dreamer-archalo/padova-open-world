import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {VILLA,areaPoint} from '../dist/gameplay-areas.js';
import {poplarPositions,villaLifeUpdate} from '../dist/villa-mandria-life.js';

const path=[[0,0],[0,100]],rows=poplarPositions(path,13,8.6);
assert.equal(rows.length,12,'six symmetrical poplar pairs on a 100 m approach');
assert(rows.every(p=>Math.abs(Math.abs(p.x)-8.6)<.001),'poplars stay outside an 8 m carriageway');
assert.deepEqual(poplarPositions([]),[],'no imaginary poplar avenue if the actual access road is absent');

const gate=areaPoint(VILLA,0,51),approach=areaPoint(VILLA,0,69),start=areaPoint(VILLA,0,200);
const messages=[];
const game={
 state:{started:true,x:VILLA.x,z:VILLA.z,elapsed:20},
 terrain:{modern:true,gameplayPatches:[{}],height:()=>0,dry:()=>true},
 collision:{near:()=>[]},
 graph:{segments:[{road:{n:'Accesso Villa della Mandria',p:[[start.x,start.z],[approach.x,approach.z],[gate.x,gate.z]]}}]},
 scene:new THREE.Scene(),toast:(text)=>messages.push(text)
};
villaLifeUpdate(game,.016);
assert(game.villaLife?.root?.parent===game.scene,'estate was not attached to the active game scene');
assert(game.villaLife.planted>=14,'approach must have a visible paired poplar avenue');
assert.equal(game.villaLife.cars.length,2,'black escort cars near the estate entrance');
assert.equal(game.villaLife.pastures.length,3,'three unobstructed candidate paddocks');
assert.equal(game.villaLife.fields.length,3,'three unobstructed candidate fields');
assert(game.villaLife.people.some(p=>p.role==='gate')&&game.villaLife.people.some(p=>p.role==='servant')&&game.villaLife.people.some(p=>p.role==='worker'));
const servant=game.villaLife.people.find(p=>p.role==='servant');
Object.assign(game.state,{x:servant.home.x,z:servant.home.z,elapsed:31});
villaLifeUpdate(game,.016);
assert(messages.includes('Hola patron'),'servant must greet the player on approach');
game.state.elapsed=31.6;villaLifeUpdate(game,.016);
assert(servant.obj.rotation.x>.05,'servant bow animation must visibly lean forwards');
game.state.elapsed=34;villaLifeUpdate(game,.016);
assert.equal(servant.obj.rotation.x,0,'servant returns to work/idle after greeting');
// The blocked-field scenario must not paint over existing city structures.
const blocked={...game,scene:new THREE.Scene(),villaLife:null,collision:{near:()=>[{kind:'building',solid:true}]}};
villaLifeUpdate(blocked,.016);
assert.equal(blocked.villaLife.pastures.length,0);
assert.equal(blocked.villaLife.fields.length,0);
assert.equal(blocked.villaLife.planted,0);
console.log('PASS Villa Mandria driveway and life: '+JSON.stringify({poplars:game.villaLife.planted,guards:game.villaLife.people.filter(p=>p.role==='gate').length,servants:game.villaLife.people.filter(p=>p.role==='servant').length,blackCars:game.villaLife.cars.length,pastures:game.villaLife.pastures.length,fields:game.villaLife.fields.length,greetings:messages.length}));
