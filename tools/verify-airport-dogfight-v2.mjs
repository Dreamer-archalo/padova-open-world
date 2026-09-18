import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {ModernGameplay} from '../dist/modern-gameplay.js';
import {hostileFlightAllowed,assistedFlightTarget,ensureDefenders,wantedJetCount,wantedAfterKills} from '../dist/airport-dogfight-v2.js';

const player={style:'airport-jet',spec:{aircraft:true,plane:true,height:4,width:12,length:14},mesh:new THREE.Group(),health:100,x:0,y:100,z:0,yaw:0};
const s={started:true,mode:'car',car:player,wanted:1,x:0,y:100,z:0,yaw:0,elapsed:10,escape:0};
const g={state:s,cars:[player],airDefenders:[],terrain:{elevation:()=>0},scene:new THREE.Group(),
 addCar(x,z,yaw){const c={x,z,yaw,y:0,spec:{aircraft:true,plane:true,height:4,length:16,width:14},style:'airport-interceptor',health:100,mesh:new THREE.Group()};this.cars.push(c);return c;},
 pose(){},retire(c){this.cars.splice(this.cars.indexOf(c),1);this.retired=(this.retired||0)+1;},
 cannon:{impact(){}},toast(){},confirmedAirKills:0,dogfightBaseWanted:1,dogfightBaseKills:0};
assert.equal(hostileFlightAllowed(g),true,'military flight responds from one star');
assert.equal(wantedJetCount(0),0);assert.equal(wantedJetCount(1),1);assert.equal(wantedJetCount(5),5);
assert.equal(wantedAfterKills(1,0),1);assert.equal(wantedAfterKills(1,1),1);assert.equal(wantedAfterKills(1,2),2);assert.equal(wantedAfterKills(1,8),5);
for(let stars=1;stars<=5;stars++){s.wanted=stars;ensureDefenders(g);assert.equal(g.airDefenders.length,stars,`${stars} stars => ${stars} jets`);}
s.wanted=2;ensureDefenders(g);assert.equal(g.airDefenders.length,2,'reducing stars removes surplus jets');
const target=g.airDefenders[0];target.x=0;target.z=310;target.y=100;
const nearer={style:'airone',spec:{aircraft:true,height:3},mesh:new THREE.Group(),health:100,x:40,y:100,z:120};g.cars.push(nearer);
const chosen=assistedFlightTarget(g,new THREE.Vector3(0,102,0),new THREE.Vector3(0,0,1));
assert.equal(chosen,target,'jet inside crosshair beats closer offset helicopter');
const other=g.airDefenders[1];other.x=200;other.z=-50;
const hit=ModernGameplay.prototype.hit.bind(g);
hit(target,player,false);assert.equal(target.health,48);assert.equal(target.flightMissileHits,1);assert.ok(target.flightSmoke,'first hit creates smoke');assert.equal(g.confirmedAirKills,0);
hit(target,player,false);assert.equal(target.health,0);assert.equal(g.confirmedAirKills,1);assert.equal(s.wanted,2,'first kill does not increase already-two-star level');
s.wanted=1;g.dogfightBaseWanted=1;g.dogfightBaseKills=0;g.confirmedAirKills=1;
hit(other,player,false);hit(other,player,false);
assert.equal(g.confirmedAirKills,2);assert.equal(s.wanted,2,'second confirmed kill raises one star');
assert.equal(g.airDefenders.length,0,'destroyed jets removed, refill handles replacement');
ensureDefenders(g);assert.equal(g.airDefenders.length,2,'replacement count matches increased wanted');
s.car={style:'airport-cargo',spec:{aircraft:true}};s.wanted=0;assert.equal(hostileFlightAllowed(g),false,'civilian zero-star flight is not intercepted');
console.log('PASS: dogfight 1-5, respawn count, crosshair precedence, two-hit smoke and wanted progression');
