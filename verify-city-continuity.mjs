import assert from 'node:assert/strict';
import {Terrain} from './dist/terrain.js';
import {SpatialIndex} from './dist/core.js';
import {groundVehicleStep} from './dist/vehicle-dynamics.js';
import {clearRailAccess} from './dist/guardrail-access.js';
import {groundTileNeedsSplit} from './dist/ground-mesh-sampling.js';
import {VEHICLES} from './dist/vehicles.js';

const grid={version:1,width:9,height:9,step:50,x0:-200,z0:-200,heights:Array(81).fill(14),waterPlane:[8,0,0]};
const road=(k,p,extra={})=>({k,p,w:k==='footway'?2:7,...extra});
const make=roads=>new Terrain(grid,{roads,areas:[],water:[]},{modern:true});
const covered=road('pedestrian',[[-30,0],[0,0],[30,0]],{tunnel:true});
const street=road('residential',[[-120,0],[-30,0]]);
let terrain=make([covered,street]);
assert(covered.coveredPassage&&!covered.tunnel,'Covered passage classified at ground level');
for(let x=-100;x<=30;x++)assert(Math.abs(terrain.height(x,0)-14.075)<.001,'Portico must not dig a pit in its approach');
const underground=road('footway',[[-100,0],[0,0],[100,0]],{tunnel:true,layer:-1});
terrain=make([underground]);assert(underground.tunnel&&!underground.coveredPassage);assert(terrain.roads.sample(underground,0,0)<10,'Explicit underground level retained');
const riverBridge=road('residential',[[-30,0],[30,0]],{b:true,layer:1});
terrain=new Terrain(grid,{roads:[riverBridge],areas:[],water:[{p:[[0,-150],[0,150]],w:12}]},{modern:true});
assert(terrain.roads.sample(riverBridge,0,0)<14.2,'Canal bridge must not gain a fictitious 5.4 m storey');
assert(terrain.waterAt(0,0,0,14.05)===null,'Canal bridge supports the vehicle');
assert(terrain.waterAt(0,40)!==null,'Open river remains water');
const flyover=road('primary',[[-60,0],[60,0]],{b:true,layer:1});
const lower=road('residential',[[0,-80],[0,80]]);
terrain=make([flyover,lower]);assert(terrain.roads.sample(flyover,0,0)-terrain.roads.sample(lower,0,0)>=5.3,'Real grade separation retained');

const hill=z=>z<=0?0:z>=35?4:2*(1-Math.cos(Math.PI*z/35));
const surface={height:(x,z)=>hill(z),slope:(x,z,yaw,w=2.5)=>-Math.atan2(hill(z+w/2)-hill(z-w/2),w),waterAt:()=>null};
const empty=new SpatialIndex();
function drive(speed,dt=1/60,height=surface){
 const actor={x:0,z:-12,y:0,yaw:0,speed},car={spec:VEHICLES.mito};let launches=0,landings=0,air=0,maxGap=0,hits=0;
 for(let i=0;i<Math.ceil(120/speed/dt);i++){
  const m=groundVehicleStep(actor,car,{turn:0,handbrake:false},dt,height,empty);
  launches+=Number(m.launched);landings+=Number(m.landed);air+=Number(m.airborne);hits+=Number(m.hitSpeed>0);
  assert(Number.isFinite(actor.x+actor.y+actor.z));maxGap=Math.max(maxGap,actor.y-height.height(actor.x,actor.z));
 }
 return {launches,landings,air,maxGap,hits,actor};
}
const slow=drive(8);assert.equal(slow.launches,0,'Slow drive follows the crest');assert.equal(slow.hits,0);
for(const dt of [1/30,1/60,1/120]){
 const fast=drive(48,dt);assert(fast.launches>=1&&fast.landings>=1&&fast.maxGap>.12,'Fast crest produces a ballistic jump and landing: '+JSON.stringify({dt,fast}));assert.equal(fast.hits,0);
 const flat=drive(48,dt,{height:()=>0,slope:()=>0,waterAt:()=>null});assert.equal(flat.launches,0,'Flat road never launches');
}
const kerb=drive(20,1/60,{height:(x,z)=>z<0?0:.08,slope:()=>0,waterAt:()=>null});assert.equal(kerb.launches,0,'Low kerb does not act as a stunt ramp');assert.equal(kerb.hits,0);
console.log('PASS covered passages, underground separation, canal and flyover levels, slow/fast crests at 30/60/120 Hz and low kerbs');

const profile={id:5,road:{n:'Tangenziale',w:8}},railTerrain={roads:{accessIndex:{near:()=>[]},sample:()=>14}};
const cut=clearRailAccess([-15,5],[15,5],profile,railTerrain,{gaps:[{road:'Tangenziale',x:0,z:0,y:14,yaw:Math.PI/2,length:12}]});
assert.deepEqual(cut,[[0,9],[21,30]],'Name-labelled periodic gaps must physically cut the guardrail');
assert.equal(groundTileNeedsSplit({waterDistance:()=>100},0,0,16,(x,z)=>x*.02+z*.03),false,'Planar ground stays cheap');
assert.equal(groundTileNeedsSplit({waterDistance:()=>100},0,0,16,(x,z)=>2*Math.sin(Math.PI*x/16)),true,'Curved ramp is subdivided');
console.log('PASS actual guardrail opening and adaptive ramp mesh sampling');

// A tracked vehicle on a level runway must pivot consistently even when the
// slope calculation produces a tiny negative floating-point speed.
const flat={height:()=>14,slope:()=>0,waterAt:()=>null};
const tank={spec:{...VEHICLES.mito,tracked:true,steer:.65}};
const pivot={x:0,z:0,y:14,yaw:0,speed:-1e-16};
for(let i=0;i<120;i++)groundVehicleStep(pivot,tank,{turn:1,handbrake:false},1/60,flat,empty);
assert(pivot.yaw>1.1,'Stationary tank pivot must not flip direction on slope round-off');
console.log('PASS stationary tracked steering ignores numerical speed noise');
