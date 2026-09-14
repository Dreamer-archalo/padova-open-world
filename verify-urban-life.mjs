import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './dist/vendor/three.module.js';
import {spawnWeight,socialProfile,createDog,PORTELLO_SEATS} from './dist/urban-life.js';
import {collides} from './dist/core.js';
import {t,ctx} from './tools/controller-harness.mjs';

const viewer={x:0,z:0,yaw:0,speed:35};
assert(spawnWeight(viewer,{x:0,z:90},0)<.1,'fast frontal spawn is strongly suppressed');
assert(spawnWeight(viewer,{x:0,z:-90},0)>1,'spawn behind the camera is preferred');
assert(spawnWeight(viewer,{x:130,z:0},0)>.5,'lateral spawn remains available');
const university=Array.from({length:80},(_,i)=>socialProfile(i,'university'));
for(const role of ['student-group','student-seated','skater','musician'])assert(university.some(p=>p.role===role),role+' profile');
const normal=Array.from({length:80},(_,i)=>socialProfile(i,'residential'));assert(normal.some(p=>p.role==='dog-owner')&&normal.some(p=>p.role==='conversation'));
assert.equal(PORTELLO_SEATS.length,6);
for(const seat of PORTELLO_SEATS){const y=t.terrain.height(seat.x,seat.z);assert(t.terrain.dry(seat.x,seat.z,.35,y),'Portello seat must be dry');assert.equal(collides(seat.x,seat.z,.28,t.world.collision,y),null,'Portello seat must not intersect a building');}
const dog=createDog(2);assert(dog.children.length>=7&&dog.parentLeash instanceof THREE.Line,'dog has readable body and leash');
const people=t.people;assert(people.some(p=>p.dog),'controller population includes leashed dogs');
const game=fs.readFileSync('dist/game.js','utf8');assert(game.includes('spawnWeight(state,n,followYaw)')&&game.includes('animateUrbanActor'));
const report={spawn:{frontFast:spawnWeight(viewer,{x:0,z:90},0),behind:spawnWeight(viewer,{x:0,z:-90},0),lateral:spawnWeight(viewer,{x:130,z:0},0)},roles:[...new Set(university.map(p=>p.role))],portelloSeats:PORTELLO_SEATS.length,dogs:people.filter(p=>p.dog).length};
fs.writeFileSync('docs/urban-life-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
