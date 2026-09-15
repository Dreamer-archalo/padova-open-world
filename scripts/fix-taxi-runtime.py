from pathlib import Path
import re

GAME = Path('dist/game.js')
INDEX = Path('dist/index.html')

source = GAME.read_text(encoding='utf-8')
original = source

if "import {TaxiLoadingOverlay}" not in source:
    anchor = "import {TaxiDispatcher} from './TaxiDispatcher.js';\n"
    addition = (
        anchor
        + "import {TaxiLoadingOverlay} from './TaxiLoadingOverlay.js';\n"
        + "import {TaxiDriverNPC} from './TaxiDriverNPC.js';\n"
        + "import {TaxiPathfinder} from './Pathfinder.js';\n"
        + "import {TaxiSystem} from './TaxiSystem.js';\n"
    )
    if anchor not in source:
        raise SystemExit('Taxi audit patch failed: TaxiDispatcher import anchor missing')
    source = source.replace(anchor, addition, 1)

source = source.replace(
    "taxiMapPick=false,taxiDispatcher=null;",
    "taxiMapPick=false,taxiDispatcher=null,taxiPathfinder=null,taxiLoadingOverlay=null,taxiDriverNPC=null,taxiSystem=null;",
    1,
)

driver_block = """function createTaxiDriver(){
 const driver=taxiDriverNPC?.ensure();if(!driver)throw new Error('Taxi driver NPC unavailable');return driver;
}
function placeTaxiDriver(){
 if(!taxi?.car||!taxiDriverNPC)return;const driver=taxiDriverNPC.showBeside(taxi.car,state.elapsed);if(driver)taxi.driver=driver;
}
function taxiCanBoard(){return state.mode==='foot'&&taxi?.phase==='ready'&&!!taxiDriverNPC?.canInteract(state,3.3);}
"""
source, count = re.subn(
    r"function createTaxiDriver\(\)\{.*?\n\}\nfunction placeTaxiDriver\(\)\{.*?\n\}\nfunction taxiCanBoard\(\)\{.*?\}\n",
    driver_block,
    source,
    count=1,
    flags=re.S,
)
if count != 1 and 'Taxi driver NPC unavailable' not in source:
    raise SystemExit(f'Taxi audit patch failed: driver block replacements={count}')

source = source.replace(
    "document.body.classList.remove('taxi-transit');if($('taxiLoading'))$('taxiLoading').hidden=true;",
    "document.body.classList.remove('taxi-transit');try{taxiLoadingOverlay?.hide();}catch{}if($('taxiLoading'))$('taxiLoading').hidden=true;",
    1,
)
source = source.replace(
    "if(c===taxi?.car){taxi.phase='ready';taxi.driver.visible=false;setTaxiHazards(true);}",
    "if(c===taxi?.car){taxi.phase='ready';setTaxiHazards(true);placeTaxiDriver();}",
    1,
)
source = source.replace(
    "if(nearest===taxi?.car)taxi.driver.visible=false;",
    "if(nearest===taxi?.car)taxiDriverNPC?.hide();",
    1,
)
source = source.replace(
    "if(taxi?.phase==='ready'){state.waypoint={x:taxi.car.x,z:taxi.car.z,name:'Taxi abusivo'};routeTo(state.waypoint);toast('Il Taxi è già arrivato. Avvicinati e premi E.',5);return;}",
    "if(taxi?.phase==='ready'){placeTaxiDriver();state.waypoint={x:taxi.car.x,z:taxi.car.z,name:'Taxi abusivo'};routeTo(state.waypoint);toast('Il Taxi è già arrivato. Avvicinati al guidatore e premi E.',5);return;}",
    1,
)

update_taxi = """function updateTaxi(dt){
 if(!taxi)return;taxiDriverNPC?.update(state.elapsed);updateTaxiHazards();
 if(taxi.phase!=='arriving')return;
 try{
  if(state.elapsed>taxi.repathAt&&dist(taxi.target,state)>20){const target=taxiDispatcher.pickup(state);if(target){const path=taxiDispatcher.route(taxi.car,target);if(path.length){taxi.target=target;taxi.path=path;taxi.index=Math.min(1,path.length-1);}}taxi.repathAt=state.elapsed+2.5;}
  const result=taxiDispatcher.step(taxi.car,taxi.path,taxi.index,dt);taxi.index=result.index;taxi.blocked=result.blocked?taxi.blocked+dt:Math.max(0,taxi.blocked-dt);poseVehicle(taxi.car);
  if(result.arrived||dist(taxi.car,taxi.target)<6.5){taxi.phase='ready';taxi.car.speed=0;taxi.car.parked=true;setTaxiHazards(true);placeTaxiDriver();state.waypoint=null;state.route=[];taxiArrivalChime();toast('Il Taxi è arrivato. Avvicinati al guidatore e premi E.',6);return;}
  if(taxi.blocked>2.5){const path=taxiDispatcher.route(taxi.car,taxi.target);if(path.length){taxi.path=path;taxi.index=Math.min(1,path.length-1);}taxi.blocked=0;}
 }catch(error){console.warn('[Taxi] physical AI recovered from error',error);const plan=taxiDispatcher?.planDispatch(state);if(plan){Object.assign(taxi.car,{x:plan.spawn.x,z:plan.spawn.z,y:plan.spawn.y,yaw:plan.spawn.yaw,speed:0,parked:false});taxi.target=plan.target;taxi.path=plan.path;taxi.index=Math.min(1,plan.path.length-1);poseVehicle(taxi.car);}else{taxiDestinationFailure(error,'physical taxi AI');}}
}
function boardTaxiAndChoose"""
source, count = re.subn(
    r"function updateTaxi\(dt\)\{.*?\n\}\nfunction boardTaxiAndChoose",
    update_taxi,
    source,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit(f'Taxi audit patch failed: updateTaxi replacements={count}')

source = source.replace(
    "taxi.driver.visible=false;taxi.phase='boarded';",
    "taxiDriverNPC?.hide();taxi.phase='boarded';",
    1,
)

trip_block = """function applyTaxiDestination(destination,road,price,{fallback=false}={}){
 if(!taxi?.car||!road||!Number.isFinite(road.x)||!Number.isFinite(road.z))throw new Error('Taxi destination fallback unavailable');
 const c=taxi.car;if(!taxi.tripCharged){state.money=Math.max(0,state.money-price);taxi.tripCharged=true;save();}
 const y=Number.isFinite(road.y)?road.y:terrain.height(road.x,road.z),yaw=Number.isFinite(road.yaw)?road.yaw:state.yaw;
 Object.assign(c,{x:road.x,z:road.z,y,yaw,speed:0,health:Math.max(1,c.health),parked:true});resetGroundMotion(c);poseVehicle(c);
 Object.assign(state,{mode:'car',car:c,x:c.x,z:c.z,y:c.y,yaw:c.yaw,speed:0,vy:0,health:c.health,waypoint:null,route:[]});taxi.phase='at-destination';taxi.destination={...road,name:destination.name};previousPose=null;previousActors.delete(c.mesh);waterRecovery.reset();waterRecovery.remember(state,terrain);followYaw=state.yaw;cameraRig.reset(state.yaw);camera.position.set(state.x-10,state.y+8,state.z-12);player.visible=false;setTaxiHazards(true);taxiDriverNPC?.ensure();taxiDriverNPC?.hide();
 toast(fallback?'Taxi: timeout evitato, arrivo completato in modalità sicura.':'Destinazione raggiunta. Premi E per scendere.',5);
}
async function beginTaxiTrip(destination,road,price){
 try{
  if(!taxi?.car||state.car!==taxi.car||!validTaxiDestination(destination)||!validTaxiDestination(road))throw new Error('Invalid taxi destination or player is not aboard');
  closeDialogs();taxi.phase='transition';taxi.destination={...destination};taxi.tripCharged=false;taxiDriverNPC?.hide();setTaxiHazards(false);keys.clear();document.body.classList.add('taxi-transit');taxiFactIndex=Math.floor((state.elapsed+price)%TAXI_FACTS.length);if($('taxiFact'))$('taxiFact').textContent=TAXI_FACTS[taxiFactIndex];
  if(!taxiSystem)throw new Error('TaxiSystem not initialized');
  await taxiSystem.travel({destination,price,yaw:state.yaw});
 }catch(error){taxiDestinationFailure(error,'trip confirmation');}
}
function confirmTaxi"""
source, count = re.subn(
    r"function beginTaxiTrip\(destination,road,price\)\{.*?\n\}\nfunction confirmTaxi",
    trip_block,
    source,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit(f'Taxi audit patch failed: beginTaxiTrip replacements={count}')

source = source.replace(
    "const road=taxiFastRoad(destination);if(!road)throw new Error('No bounded road found near destination');",
    "const road=taxiPathfinder?.resolveDestination(destination)||taxiFastRoad(destination);if(!road)throw new Error('No bounded road found near destination');",
    1,
)

init_old = "taxiDispatcher=new TaxiDispatcher({graph,terrain,collision:world.collision,taxiSpec:VEHICLES.taxi,vehicleBlocked});signals=new TrafficSignals(graph,data.signals);"
init_new = """taxiPathfinder=new TaxiPathfinder({graph,terrain,bounds:minBounds});
 taxiDispatcher=new TaxiDispatcher({graph,terrain,collision:world.collision,taxiSpec:VEHICLES.taxi,vehicleBlocked,pathfinder:taxiPathfinder});
 taxiLoadingOverlay=new TaxiLoadingOverlay({overlay:$('taxiLoading'),meme:$('taxiMeme'),status:$('taxiLoadingStatus'),assetTimeoutMs:1000});
 taxiDriverNPC=new TaxiDriverNPC({scene,createPerson,THREE,terrain,collision:world.collision,collides});
 taxiSystem=new TaxiSystem({overlay:taxiLoadingOverlay,pathfinder:taxiPathfinder,inputManager,timeoutMs:3000,onResolved:({destination,road,price})=>applyTaxiDestination(destination,road,price),onFallback:({destination,road,price,error})=>{const fallback=road||taxiPathfinder.fallbackPoint(destination,state.yaw);if(!fallback)throw error||new Error('Taxi fallback point unavailable');applyTaxiDestination(destination,fallback,price,{fallback:true});},onDriverReady:()=>taxiDriverNPC.ensure(),onFinally:()=>{document.body.classList.remove('taxi-transit');if($('taxiLoading'))$('taxiLoading').hidden=true;setPaused(false);keys.clear();}});
 signals=new TrafficSignals(graph,data.signals);"""
if init_old in source:
    source = source.replace(init_old, init_new, 1)
elif "taxiSystem=new TaxiSystem" not in source:
    raise SystemExit('Taxi audit patch failed: taxi service init anchor missing')

source = source.replace("if(taxi?.phase==='loading'){state.speed=0;return;}", "if(taxi?.phase==='transition'){state.speed=0;return;}", 1)
source = source.replace("if(taxi?.phase==='loading')updateTaxi(dt);else{", "if(taxi?.phase==='transition'){taxiDriverNPC?.update(state.elapsed);}else{", 1)
source = source.replace(
    "const streamFocus=taxi?.phase==='loading'?taxi.destination:state,streamTaxi=taxi?.phase==='loading';world.update(streamFocus.x,streamFocus.z,false,{speed:streamTaxi?0:state.speed,yaw:streamFocus.yaw??state.yaw,aircraft:!streamTaxi&&!!state.car?.spec.aircraft,altitude:streamTaxi?0:Math.max(0,state.y-terrain.elevation(state.x,state.z)),radius:streamTaxi?360:undefined});",
    "const streamFocus=state;world.update(streamFocus.x,streamFocus.z,false,{speed:state.speed,yaw:state.yaw,aircraft:!!state.car?.spec.aircraft,altitude:Math.max(0,state.y-terrain.elevation(state.x,state.z))});",
    1,
)

for token in ["TaxiLoadingOverlay", "TaxiDriverNPC", "TaxiPathfinder", "TaxiSystem"]:
    if token not in source:
        raise SystemExit('Taxi audit patch failed: missing integration token ' + token)

if source != original:
    GAME.write_text(source, encoding='utf-8')
    print('Taxi global audit patch applied.')
else:
    print('Taxi global audit patch already present.')

index = INDEX.read_text(encoding='utf-8')
updated = re.sub(r"game\.js\?v=[^\"']+", "game.js?v=taxi-audit-20260915-1", index, count=1)
if updated != index:
    INDEX.write_text(updated, encoding='utf-8')
    print('Taxi game cache-buster updated.')
