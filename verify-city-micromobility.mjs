import assert from 'node:assert/strict';
import {cityMicromobilityBudget,cityMicromobilityRoadAllowed,cityMicromobilityRoutes,updateCityMicromobility} from './dist/city-micromobility.js';
import {CityWorld} from './dist/world.js';

assert.deepEqual(['hyper','low','medium','high'].map(cityMicromobilityBudget),[1,3,4,6]);
assert.equal(CityWorld.prototype.__cityMicromobilityInstalled,true,'live CityWorld updates must load the extension');
assert(cityMicromobilityRoadAllowed({k:'cycleway',w:2},'historic'));
assert(cityMicromobilityRoadAllowed({k:'residential',w:6},'residential'));
for(const k of ['motorway','trunk','primary','tram','steps'])assert(!cityMicromobilityRoadAllowed({k,w:6},'urban'),`${k} is forbidden`);
for(const zone of ['airport','industrial','countryside','wild','motorway'])assert(!cityMicromobilityRoadAllowed({k:'cycleway',w:2},zone),`${zone} must not spawn micromobility`);
for(const road of [{k:'cycleway',w:2,access:'private'},{k:'residential',w:5,b:true},{k:'footway',w:2,tunnel:true}])assert(!cityMicromobilityRoadAllowed(road,'historic'));

function fixture(zone='historic'){
 const roads=[
  {k:'cycleway',w:2,p:[[50,60],[100,60],[155,60]]},
  {k:'footway',w:2,p:[[45,125],[95,125],[150,125]]},
  {k:'residential',w:6,p:[[75,-88],[120,-88],[170,-88]]}
 ];
 const chunks=new Map([['0,0',{roads:roads.map(road=>({road,a:road.p[0],b:road.p.at(-1)}))}],['0,-1',{roads:[]}] ]);
 const objects=[];
 const terrain={modern:true,height:()=>2,dry:()=>true,districts:{at:()=>zone}};
 return {world:{terrain,chunks,collision:{near:()=>new Set()},scene:{add:mesh=>objects.push(mesh)},quality:'low',streaming:{metrics:{pressure:false}}},objects};
}
const {world,objects}=fixture();
const routes=cityMicromobilityRoutes(world,0,0);
assert.equal(routes.length,3,'routes must cover multiple separate streets, not just Portello');
assert(routes.some(r=>r.roadKind==='residential'),'ordinary urban streets must be covered');
assert(routes.some(r=>r.roadKind==='cycleway'),'cycle lanes must be preferred when present');
assert.deepEqual(cityMicromobilityRoutes(world,1240.7,-365.4),[],'the existing Portello pool must remain the only one locally');
assert.equal(cityMicromobilityRoutes(fixture('airport').world,0,0).length,0);
const blocked=fixture().world;blocked.terrain.dry=()=>false;
assert.equal(cityMicromobilityRoutes(blocked,0,0).length,0,'waterlogged routes must be rejected');
updateCityMicromobility(world,0,0,1000);
assert.equal(objects.length,3,'Performance mode must create a small, bounded actor pool');
assert(objects.filter(mesh=>mesh.visible&&mesh.userData.cityMicromobility).length>=2,'urban bikes and scooters must visibly spawn');
assert(objects.some(mesh=>mesh.userData.cityMicromobility),'actors must be distinguished from old Portello props');
const first=objects.find(mesh=>mesh.visible),initial=[first.position.x,first.position.z];
updateCityMicromobility(world,0,0,1050);
assert(Math.hypot(first.position.x-initial[0],first.position.z-initial[1])>0,'riders must advance in the render update');
world.streaming.metrics.pressure=true;
updateCityMicromobility(world,0,0,1100);
assert(objects.some(mesh=>mesh.visible),'streaming pressure must not hide all riders');
world.quality='hyper';world.streaming.metrics.pressure=false;
updateCityMicromobility(world,0,0,1150);
assert(objects.filter(mesh=>mesh.visible).length<=1,'Iper Performance must enforce its actor cap');
console.log('PASS: citywide road selection, 3 urban routes, Portello isolation, exclusions, dry terrain, live movement and bounded actor budgets.');
