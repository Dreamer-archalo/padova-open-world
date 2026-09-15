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

menu_block = r"async function beginTaxiTrip\(destination,road,price\)\{.*?\n\}\nfunction confirmTaxi\(destination\)\{.*?\n\}\nfunction openTaxiMap\(\)\{.*?\n\}\nfunction openTaxiMenu\(force=false\)\{.*?\n\}\nfunction beginMission"
menu_replacement = """async function executeTaxiTransition({targetCoords,meta={}}){
 if(!taxi?.car||state.car!==taxi.car||!validTaxiDestination(targetCoords))throw new Error('Invalid static taxi destination or player is not aboard');
 const destination={x:targetCoords.x,y:Number.isFinite(targetCoords.y)?targetCoords.y:0,z:targetCoords.z,yaw:Number.isFinite(targetCoords.yaw)?targetCoords.yaw:state.yaw,name:meta.name||targetCoords.name||'Destinazione personalizzata',tag:meta.tag||''};
 const price=taxiFare(taxi.car,destination);
 taxi.phase='transition';taxi.destination={...destination};taxi.tripCharged=false;taxiDriverNPC?.hide();setTaxiHazards(false);keys.clear();document.body.classList.add('taxi-transit');taxiFactIndex=Math.floor((state.elapsed+price)%TAXI_FACTS.length);if($('taxiFact'))$('taxiFact').textContent=TAXI_FACTS[taxiFactIndex];
 if(!taxiSystem)throw new Error('TaxiSystem not initialized');
 await taxiSystem.travel({targetCoords:destination,destination,price,yaw:state.yaw});
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
 taxiSystem=new TaxiSystem({inputManager,timeoutMs:3000,executeTeleport:({targetCoords,destination,price})=>applyTaxiDestination(destination,targetCoords,price),forcePlayerPosition:({targetCoords,destination,price})=>applyTaxiDestination(destination,targetCoords,price,{fallback:true}),onFinally:()=>{document.body.classList.remove('taxi-transit');if($('taxiLoading'))$('taxiLoading').hidden=true;setPaused(false);keys.clear();}});
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
]
for token in required:
    if token not in source:
        raise SystemExit('Taxi menu patch failed: missing token ' + token)

# The click path must not resolve a road/path before the browser gets a frame.
click_region = source[source.find('function confirmTaxi'):source.find('function beginMission')]
for forbidden in ['resolveDestination(', 'taxiFastRoad(', 'roadRoute(', 'findTaxiRoad(']:
    if forbidden in click_region:
        raise SystemExit('Taxi menu patch failed: blocking call remains in click handlers: ' + forbidden)

if source != original:
    GAME.write_text(source, encoding='utf-8')
    print('Unified non-blocking taxi menu patch applied.')
else:
    print('Unified non-blocking taxi menu patch already present.')

index = INDEX.read_text(encoding='utf-8')
updated = re.sub(r"game\.js\?v=[^\"']+", "game.js?v=taxi-menu-20260915-2", index, count=1)
if updated != index:
    INDEX.write_text(updated, encoding='utf-8')
    print('Taxi menu cache-buster updated.')
