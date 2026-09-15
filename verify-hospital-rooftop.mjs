import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('./dist/hospital-rooftop-easter-egg.js',import.meta.url),'utf8');
const upgrades=fs.readFileSync(new URL('./dist/gameplay-upgrades.js',import.meta.url),'utf8');
const driving=fs.readFileSync(new URL('./dist/modern-driving.js',import.meta.url),'utf8');
const checks=[
 ['central Padova hospital coordinate is explicit',/project\(45\.403920,11\.887309\)/.test(source)],
 ['flat playable roof surface exists',/kind:'hospital-flat-roof'/.test(source)&&/driveTopMin:roofY/.test(source)],
 ['helipad H and perimeter lights exist',/makeHelipad/.test(source)&&/TorusGeometry\(10\.2/.test(source)&&/for\(let i=0;i<10;i\+\+\)/.test(source)],
 ['helicopters solve elevated landing surfaces',/function airLandingHeight/.test(driving)&&/ground=airLandingHeight/.test(driving)&&/finalGround=airLandingHeight/.test(driving)],
 ['three rooftop motorcycles are spawned',/addBike\(game,center,'trail'/.test(source)&&/addBike\(game,center,'cruiser'/.test(source)&&/addBike\(game,center,'motorcycle'/.test(source)],
 ['two riders are already moving',/moving:\[bike1,bike2\]/.test(source)&&/updateRiders/.test(source)&&/bike\.rider\)bike\.rider\.visible=true/.test(source)],
 ['one motorcycle remains available to player',/Moto rooftop · libera/.test(source)&&/bike3/.test(source)],
 ['three stunt ramps exist',/ramps=\[addRoofRamp[\s\S]*addRoofRamp[\s\S]*addRoofRamp/.test(source)],
 ['roof obstacles and parapet collision exist',/addObstacle/.test(source)&&/addParapet/.test(source)&&/hospitalRoofObstacle:true/.test(source)],
 ['module is loaded by gameplay runtime',/hospital-rooftop-easter-egg\.js/.test(upgrades)],
 ['module installs from populate and updates riders',/__hospitalRooftopEasterEgg/.test(source)&&/ModernGameplay\.prototype\.populate/.test(source)&&/ModernGameplay\.prototype\.update/.test(source)],
 ['public preview revision contains rooftop feature',/Public preview revision marker/.test(source)]
];
for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);assert.ok(ok,name);}
console.log('PASS hospital rooftop easter egg');
