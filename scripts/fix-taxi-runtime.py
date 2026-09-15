from pathlib import Path
import re

path = Path('dist/game.js')
source = path.read_text(encoding='utf-8')
original = source

if 'function taxiFastRoad(pos)' not in source:
    marker = "function dryRoad(pos,spec=null,ignore=state.car){return safeDryRoad(pos,graph,world.collision,terrain,spec,p=>![...cars,...cops].some(c=>c!==ignore&&c.mesh.visible&&dist(c,p)<(c.spec.length+(spec?.length||1))/2+1));}\n"
    if marker not in source:
        raise SystemExit('Taxi patch failed: dryRoad marker not found')
    helper = marker + "function taxiFastRoad(pos){const n=nearestRoad(pos,graph,true);if(!n||!n.segment?.road)return null;const road=n.segment.road,sample=terrain.roads?.sample?.(road,n.x,n.z),y=Number.isFinite(sample)?sample+.05:terrain.height(n.x,n.z);return {...n,y};}\n"
    source = source.replace(marker, helper, 1)

loading_pattern = re.compile(r" if\(taxi\.phase==='loading'\)\{\n.*?\n \}\n\}\nfunction beginTaxiTrip", re.S)
loading_replacement = """ if(taxi.phase==='loading'){
  const wallSeconds=(performance.now()-(taxi.loadingWallAt??performance.now()))/1000,seconds=Math.max(state.elapsed-taxi.loadingAt,wallSeconds);
  $('taxiLoadingStatus').textContent='Trasferimento in corso';
  if(seconds<1.35)return;
  const p=taxi.destination,c=taxi.car;Object.assign(c,{x:p.x,z:p.z,y:p.y??terrain.height(p.x,p.z),yaw:p.yaw,speed:0,health:Math.max(1,c.health),parked:true});resetGroundMotion(c);poseVehicle(c);Object.assign(state,{mode:'car',car:c,x:c.x,z:c.z,y:c.y,yaw:c.yaw,speed:0,vy:0,health:c.health,waypoint:null,route:[]});taxi.phase='at-destination';previousPose=null;previousActors.delete(c.mesh);waterRecovery.reset();waterRecovery.remember(state,terrain);followYaw=state.yaw;cameraRig.reset(state.yaw);camera.position.set(state.x-10,state.y+8,state.z-12);$('taxiLoading').hidden=true;toast('Destinazione raggiunta. Premi E per scendere.',5);setTimeout(()=>document.body.classList.remove('taxi-transit'),80);return;
 }
}
function beginTaxiTrip"""
source, n = loading_pattern.subn(loading_replacement, source, count=1)
if n != 1:
    if "wallSeconds=(performance.now()-(taxi.loadingWallAt??performance.now()))/1000" not in source:
        raise SystemExit(f'Taxi patch failed: loading branch replacements={n}')

trip_pattern = re.compile(r"function beginTaxiTrip\(destination,road,price\)\{\n.*?\n\}\nfunction confirmTaxi\(destination\)\{\n.*?\n\}\nfunction openTaxiMap", re.S)
trip_replacement = """function beginTaxiTrip(destination,road,price){
 closeDialogs();state.money-=price;save();keys.clear();const c=taxi.car;taxi.driver.visible=false;taxi.phase='loading';taxi.destination={...road,name:destination.name};taxi.loadingAt=state.elapsed;taxi.loadingWallAt=performance.now();Object.assign(state,{mode:'car',car:c,x:c.x,z:c.z,y:c.y,yaw:c.yaw,speed:0,vy:0,health:c.health,waypoint:null,route:[]});c.parked=true;c.speed=0;player.visible=false;taxiFactIndex=Math.floor((state.elapsed+price)%TAXI_FACTS.length);$('taxiFact').textContent=TAXI_FACTS[taxiFactIndex];$('taxiLoadingStatus').textContent='Trasferimento taxi';$('taxiLoading').hidden=false;document.body.classList.add('taxi-transit');
}
function confirmTaxi(destination){
 const road=taxiFastRoad(destination);if(!road){toast('Destinazione non raggiungibile dalla rete stradale.',5);return;}const price=taxiFare(taxi.car,road);showMenu('Conferma il viaggio','<p class=\"about-copy\"><strong>'+destination.name+'</strong><br>Prezzo calcolato sulla distanza: <strong>€'+price+'</strong> · massimo €100.</p><div class=\"menu-actions\"><button class=\"primary\" id=\"confirmTaxi\">Conferma e parti</button><button id=\"cancelTaxi\">Annulla</button></div>');$('confirmTaxi').onclick=()=>beginTaxiTrip(destination,road,price);$('cancelTaxi').onclick=openTaxiMenu;
}
function openTaxiMap"""
source, n = trip_pattern.subn(trip_replacement, source, count=1)
if n != 1:
    if "const road=taxiFastRoad(destination)" not in source or "taxi.loadingWallAt=performance.now()" not in source:
        raise SystemExit(f'Taxi patch failed: trip replacements={n}')

for forbidden in [
    "world.coreReady(taxi.destination.x,taxi.destination.z,72)",
    "world.update(state.x,state.z,true);followYaw=state.yaw",
    "const road=dryRoad(destination,VEHICLES.taxi,taxi.car)"
]:
    if forbidden in source:
        raise SystemExit('Taxi patch failed: legacy blocking path still present: ' + forbidden)

required = [
    'function taxiFastRoad(pos)',
    'taxi.loadingWallAt=performance.now()',
    "const road=taxiFastRoad(destination)",
    "setTimeout(()=>document.body.classList.remove('taxi-transit'),80)",
]
for token in required:
    if token not in source:
        raise SystemExit('Taxi patch failed: missing ' + token)

if source != original:
    path.write_text(source, encoding='utf-8')
    print('Taxi runtime patched: destination resolution and transfer are non-blocking.')
else:
    print('Taxi runtime already patched.')
