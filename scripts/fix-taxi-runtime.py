from pathlib import Path
import re

GAME = Path('dist/game.js')
INDEX = Path('dist/index.html')

source = GAME.read_text(encoding='utf-8')
original = source

if "import {TaxiMenuController}" not in source:
    anchor = "import {TaxiSystem} from './TaxiSystem.js';\n"
    if anchor not in source:
        raise SystemExit('Taxi menu patch failed: TaxiSystem import anchor missing')
    source = source.replace(anchor, anchor + "import {TaxiMenuController} from './TaxiMenuController.js';\n", 1)

source = source.replace(
    "taxiDriverNPC=null,taxiSystem=null;",
    "taxiDriverNPC=null,taxiSystem=null,taxiMenuController=null;",
    1,
)

update_taxi_pattern = r"function updateTaxi\(dt\)\{.*?\n\}\nfunction boardTaxiAndChoose"
update_taxi_replacement = """function updateTaxi(dt){
 if(!taxi)return;taxiDriverNPC?.update(state.elapsed);updateTaxiHazards();
 if(taxi.phase==='departing'){
  try{
   const c=taxi.car;if(!c?.mesh?.visible){taxi.phase='gone';return;}
   if(state.elapsed<(taxi.departAt||0))return;
   setTaxiHazards(false);c.parked=false;
   const result=taxiDispatcher.step(c,taxi.path,taxi.index,dt);taxi.index=result.index;taxi.blocked=result.blocked?(taxi.blocked||0)+dt:Math.max(0,(taxi.blocked||0)-dt);poseVehicle(c);
   if(result.arrived||dist(c,state)>140||state.elapsed>(taxi.departUntil||0)){c.speed=0;c.parked=true;c.mesh.visible=false;taxi.phase='gone';taxiDriverNPC?.hide();setTaxiHazards(false);return;}
   if(taxi.blocked>2){const departure=planTaxiDeparture(c);if(departure){taxi.target=departure.target;taxi.path=departure.path;taxi.index=Math.min(1,departure.path.length-1);taxi.blocked=0;}else if(state.elapsed>(taxi.departAt||0)+3){c.speed=0;c.parked=true;c.mesh.visible=false;taxi.phase='gone';setTaxiHazards(false);}}
  }catch(error){console.warn('[Taxi] departure recovered from error',error);if(taxi?.car){taxi.car.speed=0;taxi.car.parked=true;taxi.car.mesh.visible=false;}taxi.phase='gone';setTaxiHazards(false);}
  return;
 }
 if(taxi.phase!=='arriving')return;
 try{
  if(state.elapsed>taxi.repathAt&&dist(taxi.target,state)>20){const target=taxiDispatcher.pickup(state);if(target){const path=taxiDispatcher.route(taxi.car,target);if(path.length){taxi.target=target;taxi.path=path;taxi.index=Math.min(1,path.length-1);}}taxi.repathAt=state.elapsed+2.5;}
  const result=taxiDispatcher.step(taxi.car,taxi.path,taxi.index,dt);taxi.index=result.index;taxi.blocked=result.blocked?taxi.blocked+dt:Math.max(0,taxi.blocked-dt);poseVehicle(taxi.car);
  if(result.arrived||dist(taxi.car,taxi.target)<6.5){taxi.phase='ready';taxi.car.speed=0;taxi.car.parked=true;setTaxiHazards(true);placeTaxiDriver();state.waypoint=null;state.route=[];taxiArrivalChime();toast('Il Taxi è arrivato. Avvicinati al guidatore e premi E.',6);return;}
  if(taxi.blocked>2.5){const path=taxiDispatcher.route(taxi.car,taxi.target);if(path.length){taxi.path=path;taxi.index=Math.min(1,path.length-1);}taxi.blocked=0;}
 }catch(error){console.warn('[Taxi] physical AI recovered from error',error);const plan=taxiDispatcher?.planDispatch(state);if(plan){Object.assign(taxi.car,{x:plan.spawn.x,z:plan.spawn.z,y:plan.spawn.y,yaw:plan.spawn.yaw,speed:0,parked:false});taxi.target=plan.target;taxi.path=plan.path;taxi.index=Math.min(1,plan.path.length-1);poseVehicle(taxi.car);}else{taxiDestinationFailure(error,'physical taxi AI');}}
}
function boardTaxiAndChoose"""
source, update_count = re.subn(update_taxi_pattern, update_taxi_replacement, source, count=1, flags=re.S)
if update_count != 1 and "taxi.phase==='departing'" not in source:
    raise SystemExit(f'Taxi departure patch failed: updateTaxi replacements={update_count}')

apply_pattern = r"function applyTaxiDestination\(destination,road,price,\{fallback=false\}=\{\}\)\{.*?\n\}\nasync function beginTaxiTrip"
apply_replacement = """function taxiDropoffPoint(c){
 const sideDistance=c.spec.width/2+1.35;
 for(const side of [1,-1]){const x=c.x+Math.cos(c.yaw)*sideDistance*side,z=c.z-Math.sin(c.yaw)*sideDistance*side,y=terrain.height(x,z,c.y);if(terrain.dry(x,z,.45,y)&&!collides(x,z,.42,world.collision,y))return {x,z,y};}
 const backDistance=c.spec.length/2+1.6,x=c.x-Math.sin(c.yaw)*backDistance,z=c.z-Math.cos(c.yaw)*backDistance,y=terrain.height(x,z,c.y);return {x,z,y};
}
function planTaxiDeparture(c){
 if(!taxiDispatcher)return null;
 for(const metres of [90,130,170,220])for(const offset of [0,.4,-.4,.8,-.8,Math.PI]){const yaw=c.yaw+offset,probe={x:c.x+Math.sin(yaw)*metres,z:c.z+Math.cos(yaw)*metres},target=taxiDispatcher.roadNear(probe,180);if(!target)continue;const path=taxiDispatcher.route(c,target);if(path.length>=2)return {target,path};}
 return null;
}
function applyTaxiDestination(destination,road,price,{fallback=false}={}){
 if(!taxi?.car||!road||!Number.isFinite(road.x)||!Number.isFinite(road.z))throw new Error('Taxi destination fallback unavailable');
 const c=taxi.car;if(!taxi.tripCharged){state.money=Math.max(0,state.money-price);taxi.tripCharged=true;save();}
 const y=Number.isFinite(road.y)?road.y:terrain.height(road.x,road.z),yaw=Number.isFinite(road.yaw)?road.yaw:state.yaw;
 Object.assign(c,{x:road.x,z:road.z,y,yaw,speed:0,health:Math.max(1,c.health),parked:true});resetGroundMotion(c);poseVehicle(c);
 taxi.destination={...road,name:destination?.name||'Destinazione'};previousPose=null;previousActors.delete(c.mesh);waterRecovery.reset();
 const out=taxiDropoffPoint(c);Object.assign(state,{mode:'foot',car:null,x:out.x,z:out.z,y:out.y,yaw:c.yaw,speed:0,vy:0,waypoint:null,route:[]});player.position.set(state.x,state.y,state.z);player.visible=true;waterRecovery.remember(state,terrain);followYaw=state.yaw;cameraRig.reset(state.yaw);camera.position.set(state.x-7,state.y+5,state.z-9);taxiDriverNPC?.hide();
 const departure=planTaxiDeparture(c);if(departure){taxi.phase='departing';taxi.target=departure.target;taxi.path=departure.path;taxi.index=Math.min(1,departure.path.length-1);taxi.blocked=0;taxi.departAt=state.elapsed+.9;taxi.departUntil=state.elapsed+14;setTaxiHazards(true);}else{taxi.phase='gone';c.mesh.visible=false;c.parked=true;setTaxiHazards(false);}
 toast(fallback?'Arrivo completato su strada. Il taxi riparte.':'Sei arrivato. Il taxi ti ha lasciato a bordo strada e riparte.',5);
}
async function beginTaxiTrip"""
source, apply_count = re.subn(apply_pattern, apply_replacement, source, count=1, flags=re.S)
if apply_count != 1 and 'function taxiDropoffPoint(c)' not in source:
    raise SystemExit(f'Taxi drop-off patch failed: applyTaxiDestination replacements={apply_count}')

menu_block = r"async function beginTaxiTrip\(destination,road,price\)\{.*?\n\}\nfunction confirmTaxi\(destination\)\{.*?\n\}\nfunction openTaxiMap\(\)\{.*?\n\}\nfunction openTaxiMenu\(force=false\)\{.*?\n\}\nfunction beginMission"
menu_replacement = """async function executeTaxiTransition({targetCoords,meta={}}){
 if(!taxi?.car||state.car!==taxi.car||!validTaxiDestination(targetCoords))throw new Error('Invalid static taxi destination or player is not aboard');
 const destination={x:targetCoords.x,y:Number.isFinite(targetCoords.y)?targetCoords.y:0,z:targetCoords.z,yaw:Number.isFinite(targetCoords.yaw)?targetCoords.yaw:state.yaw,name:meta.name||targetCoords.name||'Destinazione personalizzata',tag:meta.tag||''};
 await new Promise(resolve=>setTimeout(resolve,0));
 const road=taxiPathfinder?.nearestRoad(destination,{maxRadius:320,maxCandidates:2500,maxMs:18});if(!road)throw new Error('Nessuna strada carrabile vicina alla destinazione selezionata');
 const arrival={...road,name:destination.name},price=taxiFare(taxi.car,arrival);
 taxi.phase='transition';taxi.destination={...destination};taxi.tripCharged=false;taxiDriverNPC?.hide();setTaxiHazards(false);keys.clear();document.body.classList.add('taxi-transit');taxiFactIndex=Math.floor((state.elapsed+price)%TAXI_FACTS.length);if($('taxiFact'))$('taxiFact').textContent=TAXI_FACTS[taxiFactIndex];
 if(!taxiSystem)throw new Error('TaxiSystem not initialized');
 await taxiSystem.travel({targetCoords:arrival,destination,price,yaw:arrival.yaw??state.yaw});
}
function confirmTaxi(destination,event=null){
 try{
  if(!validTaxiDestination(destination))throw new Error('Destination coordinates are invalid');
  if(!taxiMenuController)throw new Error('TaxiMenuController not initialized');
  taxiMenuController.startTaxiTransition({x:destination.x,y:Number.isFinite(destination.y)?destination.y:0,z:destination.z,yaw:Number.isFinite(destination.yaw)?destination.yaw:state.yaw,name:destination.name},{source:'legacy',name:destination.name||'Destinazione',tag:destination.tag||''},event);
 }catch(error){taxiDestinationFailure(error,'destination selection');}
}
function openTaxiMap(){
 try{if(!taxi?.car||state.car!==taxi.car)throw new Error('Player is not aboard taxi');if(!taxiMenuController)throw new Error('TaxiMenuController not initialized');taxiMenuController.openMap();}catch(error){taxiDestinationFailure(error,'open taxi map');}
}
function openTaxiMenu(force=false){
 try{
  if(!taxi?.car||state.car!==taxi.car||state.mode!=='car'||(!force&&taxi.phase!=='boarded'&&taxi.phase!=='at-destination'))throw new Error('Enter the taxi before choosing a destination');
  if(!taxiMenuController)throw new Error('TaxiMenuController not initialized');
  const destinations=taxiDestinations(PLACES,HOME,AIRPORT_GATE).filter(validTaxiDestination);taxi.phase='boarded';$('menuTitle').textContent='Dove vuoi andare?';taxiMenuController.openList(destinations);
 }catch(error){taxiDestinationFailure(error,'open taxi menu');}
}
function beginMission"""
source, count = re.subn(menu_block, menu_replacement, source, count=1, flags=re.S)
if count != 1 and 'async function executeTaxiTransition' not in source:
    raise SystemExit(f'Taxi menu patch failed: menu block replacements={count}')

source = source.replace(
    "if(taxiMapPick){taxiMapPick=false;if($('mapDialog')?.open)$('mapDialog').close();confirmTaxi(p);return;}",
    "if(taxiMapPick){if(!taxiMenuController)throw new Error('TaxiMenuController not initialized');taxiMenuController.onSelectFromMap(p.x,p.z,e);return;}",
    1,
)

old_init = """taxiPathfinder=new TaxiPathfinder({graph,terrain,bounds:minBounds});
 taxiDispatcher=new TaxiDispatcher({graph,terrain,collision:world.collision,taxiSpec:VEHICLES.taxi,vehicleBlocked,pathfinder:taxiPathfinder});
 taxiLoadingOverlay=new TaxiLoadingOverlay({overlay:$('taxiLoading'),meme:$('taxiMeme'),status:$('taxiLoadingStatus'),assetTimeoutMs:1000});
 taxiDriverNPC=new TaxiDriverNPC({scene,createPerson,THREE,terrain,collision:world.collision,collides});
 taxiSystem=new TaxiSystem({overlay:taxiLoadingOverlay,pathfinder:taxiPathfinder,inputManager,timeoutMs:3000,onResolved:({destination,road,price})=>applyTaxiDestination(destination,road,price),onFallback:({destination,road,price,error})=>{const fallback=road||taxiPathfinder.fallbackPoint(destination,state.yaw);if(!fallback)throw error||new Error('Taxi fallback point unavailable');applyTaxiDestination(destination,fallback,price,{fallback:true});},onDriverReady:()=>taxiDriverNPC.ensure(),onFinally:()=>{document.body.classList.remove('taxi-transit');if($('taxiLoading'))$('taxiLoading').hidden=true;setPaused(false);keys.clear();}});
 signals=new TrafficSignals(graph,data.signals);"""
new_init = """taxiPathfinder=new TaxiPathfinder({graph,terrain,bounds:minBounds});
 taxiDispatcher=new TaxiDispatcher({graph,terrain,collision:world.collision,taxiSpec:VEHICLES.taxi,vehicleBlocked,pathfinder:taxiPathfinder});
 taxiLoadingOverlay=new TaxiLoadingOverlay({overlay:$('taxiLoading'),meme:$('taxiMeme'),status:$('taxiLoadingStatus'),assetTimeoutMs:1000});
 taxiDriverNPC=new TaxiDriverNPC({scene,createPerson,THREE,terrain,collision:world.collision,collides});
 taxiSystem=new TaxiSystem({inputManager,timeoutMs:3000,executeTeleport:({targetCoords,destination,price})=>applyTaxiDestination(destination,targetCoords,price),forcePlayerPosition:({targetCoords,destination,price,error})=>{const fallback=taxiPathfinder?.nearestRoad(targetCoords,{maxRadius:520,maxCandidates:3500,maxMs:30});if(!fallback)throw error||new Error('Taxi fallback road unavailable');applyTaxiDestination(destination,fallback,price,{fallback:true});},onFinally:()=>{document.body.classList.remove('taxi-transit');if($('taxiLoading'))$('taxiLoading').hidden=true;setPaused(false);keys.clear();}});
 taxiMenuController=new TaxiMenuController({document,menu:$('menu'),mapDialog:$('mapDialog'),menuContent:$('menuContent'),mapPlaces:$('mapPlaces'),fullMap:$('fullmap'),overlay:$('taxiLoading'),status:$('taxiLoadingStatus'),inputManager,bounds:minBounds,setPaused,drawFullMap,getFare:coords=>taxiFare(taxi.car,coords),executeTransition:executeTaxiTransition,onError:(error,context)=>taxiDestinationFailure(error,context),onMapPickingChange:value=>{taxiMapPick=value;},delayMs:50});
 signals=new TrafficSignals(graph,data.signals);"""
if old_init in source:
    source = source.replace(old_init, new_init, 1)
elif 'taxiMenuController=new TaxiMenuController' not in source:
    raise SystemExit('Taxi menu patch failed: init block not found')

required = [
    "import {TaxiMenuController}",
    "async function executeTaxiTransition",
    "taxiMenuController.openList(destinations)",
    "taxiMenuController.onSelectFromMap(p.x,p.z,e)",
    "taxiMenuController=new TaxiMenuController",
    "function taxiDropoffPoint(c)",
    "taxi.phase='departing'",
    "maxRadius:320",
]
for token in required:
    if token not in source:
        raise SystemExit('Taxi patch failed: missing token ' + token)

click_region = source[source.find('function confirmTaxi'):source.find('function beginMission')]
for forbidden in ['resolveDestination(', 'taxiFastRoad(', 'roadRoute(', 'findTaxiRoad(']:
    if forbidden in click_region:
        raise SystemExit('Taxi menu patch failed: blocking call remains in click handlers: ' + forbidden)

if source != original:
    GAME.write_text(source, encoding='utf-8')
    print('Taxi road snap + automatic drop-off/departure patch applied.')
else:
    print('Taxi road snap + drop-off patch already present.')

index = INDEX.read_text(encoding='utf-8')
updated = re.sub(r"game\.js\?v=[^\"']+", "game.js?v=taxi-dropoff-20260915-1", index, count=1)
if updated != index:
    INDEX.write_text(updated, encoding='utf-8')
    print('Taxi drop-off cache-buster updated.')
