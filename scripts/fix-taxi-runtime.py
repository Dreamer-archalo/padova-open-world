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

source, n = re.subn(
    r"function callTaxi\(\)\{.*?\n\}\nfunction updateTaxi",
    """function callTaxi(){
 if(!state.started)return;
 if(state.mode!=='foot'){toast('Scendi dal veicolo prima di chiamare il taxi.',4);return;}
 const probe={x:state.x+Math.sin(state.yaw)*8,z:state.z+Math.cos(state.yaw)*8},spawn=taxiFastRoad(probe)||taxiFastRoad(state);
 if(!spawn){toast('Taxi non disponibile qui. Riprova dalla mappa.',4);return;}
 if(!taxi){const car=addCar(spawn.x,spawn.z,spawn.yaw,false,true,'taxi');car.missionUnit=true;car.name='Taxi abusivo';taxi={car,driver:createTaxiDriver(),phase:'ready',path:[],index:0,blocked:0,repathAt:0};}
 else{Object.assign(taxi.car,{x:spawn.x,z:spawn.z,y:spawn.y??terrain.height(spawn.x,spawn.z),yaw:spawn.yaw,speed:0,health:100,parked:true});taxi.car.mesh.visible=true;taxi.driver.visible=false;taxi.phase='ready';}
 taxi.target=null;taxi.path=[];taxi.index=0;taxi.blocked=0;poseVehicle(taxi.car);placeTaxiDriver();state.waypoint=null;state.route=[];toast('Taxi pronto. Scegli la destinazione.',3);openTaxiMenu(true);
}
function updateTaxi""",
    source,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit(f'Taxi patch failed: callTaxi replacements={n}')

source, n = re.subn(
    r"function updateTaxi\(dt\)\{.*?\n\}\nfunction beginTaxiTrip",
    """function updateTaxi(dt){
 // Taxi travel is deterministic: no arrival AI, chunk readiness or streaming wait.
 return;
}
function beginTaxiTrip""",
    source,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit(f'Taxi patch failed: updateTaxi replacements={n}')

source, n = re.subn(
    r"function beginTaxiTrip\(destination,road,price\)\{.*?\n\}\nfunction confirmTaxi",
    """function beginTaxiTrip(destination,road,price){
 if(!taxi?.car)return;
 closeDialogs();keys.clear();state.money=Math.max(0,state.money-price);save();
 const p=road,c=taxi.car;taxi.driver.visible=false;taxi.destination={...p,name:destination.name};
 Object.assign(c,{x:p.x,z:p.z,y:p.y??terrain.height(p.x,p.z),yaw:p.yaw??state.yaw,speed:0,health:Math.max(1,c.health),parked:true});resetGroundMotion(c);poseVehicle(c);
 Object.assign(state,{mode:'car',car:c,x:c.x,z:c.z,y:c.y,yaw:c.yaw,speed:0,vy:0,health:c.health,waypoint:null,route:[]});taxi.phase='at-destination';previousPose=null;previousActors.delete(c.mesh);waterRecovery.reset();waterRecovery.remember(state,terrain);followYaw=state.yaw;cameraRig.reset(state.yaw);camera.position.set(state.x-10,state.y+8,state.z-12);player.visible=false;$('taxiLoading').hidden=true;document.body.classList.remove('taxi-transit');toast('Destinazione raggiunta. Premi E per scendere.',5);
}
function confirmTaxi""",
    source,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit(f'Taxi patch failed: beginTaxiTrip replacements={n}')

source, n = re.subn(
    r"function openTaxiMenu\(\)\{.*?\n\}\nfunction beginMission",
    """function openTaxiMenu(force=false){
 if(!force&&!taxiCanTalk()){closeDialogs();toast('Avvicinati al tassista per parlare.',4);return;}
 if(!taxi?.car){toast('Chiama prima il taxi dalla mappa.',4);return;}
 const destinations=taxiDestinations(PLACES,HOME,AIRPORT_GATE);showMenu('Dove vuoi andare?','<div class=\"activities\">'+destinations.map((p,i)=>'<button class=\"activity\" data-taxi=\"'+i+'\"><span><b>'+p.name+'</b><small>'+p.tag+' · €'+taxiFare(taxi.car,p)+'</small></span></button>').join('')+'<button class=\"activity\" id=\"taxiChoose\"><span><b>SCEGLI TU</b><small>Indica un punto sulla mappa · massimo €100</small></span></button></div>');document.querySelectorAll('[data-taxi]').forEach(button=>button.onclick=()=>confirmTaxi(destinations[Number(button.dataset.taxi)]));$('taxiChoose').onclick=openTaxiMap;
}
function beginMission""",
    source,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit(f'Taxi patch failed: openTaxiMenu replacements={n}')

for forbidden in [
    "taxi.phase='loading'",
    "world.coreReady(taxi.destination.x,taxi.destination.z,72)",
    "advanceTaxi(taxi.car",
    "const target=taxiPickupRoad({x:state.x+Math.sin(state.yaw)*12"
]:
    if forbidden in source:
        raise SystemExit('Taxi patch failed: legacy taxi path still present: ' + forbidden)

required = [
    'function taxiFastRoad(pos)',
    "openTaxiMenu(true)",
    "Taxi travel is deterministic",
    "taxi.phase='at-destination'",
    "document.body.classList.remove('taxi-transit')",
]
for token in required:
    if token not in source:
        raise SystemExit('Taxi patch failed: missing ' + token)

if source != original:
    path.write_text(source, encoding='utf-8')
    print('Taxi runtime patched: instant call and instant deterministic travel.')
else:
    print('Taxi runtime already patched.')

index_path = Path('dist/index.html')
index = index_path.read_text(encoding='utf-8')
versioned = '<script type="module" src="./game.js?v=taxi-20260915-3"></script>'
index = re.sub(r'<script type="module" src="\./game\.js(?:\?v=[^\"]+)?"></script>', versioned, index, count=1)
if versioned not in index:
    raise SystemExit('Taxi patch failed: game.js cache-buster not applied')
index_path.write_text(index, encoding='utf-8')
print('Taxi cache-buster set for GitHub Pages.')
