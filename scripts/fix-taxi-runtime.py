from pathlib import Path
import re

GAME = Path('dist/game.js')
INDEX = Path('dist/index.html')

source = GAME.read_text(encoding='utf-8')
original = source

# 1) Extend the physical taxi AI with a visible departure phase after drop-off.
if "taxi.phase==='departing'" not in source:
    pattern = r"function updateTaxi\(dt\)\{.*?\n\}\nfunction boardTaxiAndChoose"
    replacement = """function updateTaxi(dt){
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
    source, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'Taxi departure patch failed: updateTaxi replacements={count}')

# 2) At destination, drop the player beside the taxi and let the taxi drive away.
if 'function taxiDropoffPoint(c)' not in source:
    pattern = r"function applyTaxiDestination\(destination,road,price,\{fallback=false\}=\{\}\)\{.*?\n\}\nasync function executeTaxiTransition"
    replacement = """function taxiDropoffPoint(c){
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
async function executeTaxiTransition"""
    source, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'Taxi drop-off patch failed: applyTaxiDestination replacements={count}')

# 3) Resolve the clicked/list destination to a nearby drivable road only AFTER
# TaxiMenuController has already closed the UI and yielded 50ms to the browser.
if 'maxRadius:320,maxCandidates:2500,maxMs:18' not in source:
    pattern = r"async function executeTaxiTransition\(\{targetCoords,meta=\{\}\}\)\{.*?\n\}\nfunction confirmTaxi"
    replacement = """async function executeTaxiTransition({targetCoords,meta={}}){
 if(!taxi?.car||state.car!==taxi.car||!validTaxiDestination(targetCoords))throw new Error('Invalid static taxi destination or player is not aboard');
 const destination={x:targetCoords.x,y:Number.isFinite(targetCoords.y)?targetCoords.y:0,z:targetCoords.z,yaw:Number.isFinite(targetCoords.yaw)?targetCoords.yaw:state.yaw,name:meta.name||targetCoords.name||'Destinazione personalizzata',tag:meta.tag||''};
 await new Promise(resolve=>setTimeout(resolve,0));
 const road=taxiPathfinder?.nearestRoad(destination,{maxRadius:320,maxCandidates:2500,maxMs:18});if(!road)throw new Error('Nessuna strada carrabile vicina alla destinazione selezionata');
 const arrival={...road,name:destination.name},price=taxiFare(taxi.car,arrival);
 taxi.phase='transition';taxi.destination={...destination};taxi.tripCharged=false;taxiDriverNPC?.hide();setTaxiHazards(false);keys.clear();document.body.classList.add('taxi-transit');taxiFactIndex=Math.floor((state.elapsed+price)%TAXI_FACTS.length);if($('taxiFact'))$('taxiFact').textContent=TAXI_FACTS[taxiFactIndex];
 if(!taxiSystem)throw new Error('TaxiSystem not initialized');
 await taxiSystem.travel({targetCoords:arrival,destination,price,yaw:arrival.yaw??state.yaw});
}
function confirmTaxi"""
    source, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'Taxi road-snap patch failed: executeTaxiTransition replacements={count}')

required = [
    "taxi.phase='departing'",
    "function taxiDropoffPoint(c)",
    "function planTaxiDeparture(c)",
    "maxRadius:320,maxCandidates:2500,maxMs:18",
    "await taxiSystem.travel({targetCoords:arrival",
]
for token in required:
    if token not in source:
        raise SystemExit('Taxi patch failed: missing token ' + token)

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
