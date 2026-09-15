from pathlib import Path
import re

GAME = Path('dist/game.js')
INDEX = Path('dist/index.html')
INPUT = Path('dist/InputManager.js')
DISPATCHER = Path('dist/TaxiDispatcher.js')

input_manager = r'''export class InputManager {
  constructor(target=globalThis.window??globalThis, keys=new Set()){
    this.target=target;
    this.keys=keys;
    this.enabled=true;
    this.started=false;
    this.onKeyDown=null;
    this._down=e=>{
      if(!this.enabled)return;
      this.onKeyDown?.(e,this);
    };
    this._up=e=>this.keys.delete(e.code);
  }
  start(handler){
    if(this.started)return;
    this.started=true;
    this.onKeyDown=handler;
    this.target.addEventListener?.('keydown',this._down);
    this.target.addEventListener?.('keyup',this._up);
  }
  enable(){this.enabled=true;}
  disable(){this.enabled=false;this.keys.clear();}
  clear(){this.keys.clear();}
  isDown(code){return this.keys.has(code);}
}
'''

# TaxiDispatcher is the dedicated physical taxi AI adapter. It deliberately
# uses only bounded road lookups/routes, so dispatch can never fall back to an
# unbounded full-graph scan on the UI thread.
taxi_dispatcher = r'''import {dist,roadRoute} from './core.js';
import {advanceTaxi,findTaxiRoad} from './taxi-service.js';

export class TaxiDispatcher {
  constructor({graph,terrain,collision,taxiSpec,vehicleBlocked}){
    this.graph=graph;
    this.terrain=terrain;
    this.collision=collision;
    this.taxiSpec=taxiSpec;
    this.vehicleBlocked=vehicleBlocked;
  }
  roadNear(pos,radius=180){
    return findTaxiRoad(pos,this.graph,this.terrain,{maxRadius:radius,maxCandidates:1400,maxMs:12});
  }
  safe(point){
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.z)||!Number.isFinite(point.y))return false;
    const spec=this.taxiSpec;
    return this.terrain.dry(point.x,point.z,spec.width/2,point.y)&&
      !this.vehicleBlocked(point.x,point.z,point.yaw,this.collision,spec,point.y);
  }
  pickup(player){
    for(const metres of [10,7,4,0]){
      const p={x:player.x+Math.sin(player.yaw)*metres,z:player.z+Math.cos(player.yaw)*metres};
      const road=this.roadNear(p,220);
      if(this.safe(road))return road;
    }
    return null;
  }
  route(from,to){
    if(!from||!to)return [];
    return roadRoute(from,to,this.graph,{maxSteps:12000,maxMs:20});
  }
  planDispatch(player){
    const target=this.pickup(player);
    if(!target)return null;
    const radii=[34,40,46,52,62,72];
    const rearAngles=[Math.PI,Math.PI*.84,-Math.PI*.84,Math.PI*.68,-Math.PI*.68];
    let best=null;
    for(const radius of radii){
      for(const offset of rearAngles){
        const yaw=player.yaw+offset;
        const probe={x:player.x+Math.sin(yaw)*radius,z:player.z+Math.cos(yaw)*radius};
        const spawn=this.roadNear(probe,140);
        if(!this.safe(spawn))continue;
        const straight=dist(spawn,player);
        if(straight<28||straight>82)continue;
        const path=this.route(spawn,target);
        if(path.length<2)continue;
        let metres=0;
        for(let i=1;i<path.length&&i<2500;i++)metres+=dist(path[i-1],path[i]);
        if(!Number.isFinite(metres)||metres<=0)continue;
        if(!best||metres<best.metres)best={spawn,target,path,metres};
      }
      if(best&&radius<=52)return best;
    }
    return best;
  }
  step(car,path,index,dt){
    return advanceTaxi(car,path,index,dt,this.terrain,this.collision);
  }
}
'''

if not INPUT.exists() or INPUT.read_text(encoding='utf-8') != input_manager:
    INPUT.write_text(input_manager, encoding='utf-8')
if not DISPATCHER.exists() or DISPATCHER.read_text(encoding='utf-8') != taxi_dispatcher:
    DISPATCHER.write_text(taxi_dispatcher, encoding='utf-8')

source = GAME.read_text(encoding='utf-8')
original = source

# Imports and runtime singletons.
if "import {InputManager} from './InputManager.js';" not in source:
    source = source.replace("import {PerformanceOverlay} from './performance-overlay.js';\n", "import {PerformanceOverlay} from './performance-overlay.js';\nimport {InputManager} from './InputManager.js';\nimport {TaxiDispatcher} from './TaxiDispatcher.js';\n", 1)
if 'speedCameras,taxi=null,taxiMapPick=false,taxiDispatcher=null' not in source:
    source = source.replace('speedCameras,taxi=null,taxiMapPick=false;', 'speedCameras,taxi=null,taxiMapPick=false,taxiDispatcher=null;', 1)
if 'const inputManager=new InputManager(window,keys);' not in source:
    source = source.replace("const keys=new Set(),cars=[],people=[],cops=[],micromobility=[];", "const keys=new Set(),cars=[],people=[],cops=[],micromobility=[];const inputManager=new InputManager(window,keys);", 1)

# Keep destination and UI failure handling, but restore physical dispatch.
physical_taxi = r'''function taxiCanBoard(){return state.mode==='foot'&&taxi?.phase==='ready'&&taxi?.car?.mesh?.visible&&vehicleReach(state,taxi.car)<3.2;}
function validTaxiDestination(pos){return !!pos&&Number.isFinite(pos.x)&&Number.isFinite(pos.z)&&pos.x>=minBounds.x&&pos.x<=minBounds.x+minBounds.w&&pos.z>=minBounds.z&&pos.z<=minBounds.z+minBounds.h;}
function unlockTaxiUI(){
 taxiMapPick=false;try{if($('mapDialog')?.open)$('mapDialog').close();}catch{}try{if($('menu')?.open)$('menu').close();}catch{}try{setPaused(false);}catch{}inputManager.enable();keys.clear();document.body.classList.remove('taxi-transit');if($('taxiLoading'))$('taxiLoading').hidden=true;
}
function taxiDestinationFailure(error,context='taxi destination'){
 console.warn('[Taxi] '+context+' failed',error);unlockTaxiUI();toast('Destinazione non raggiungibile',5);
}
function setTaxiHazards(on){
 if(!taxi?.car?.mesh)return;const mesh=taxi.car.mesh;let lamps=mesh.userData.taxiHazards;
 if(!lamps){lamps=[];const mat=new THREE.MeshBasicMaterial({color:'#ff9d16'}),w=Math.max(.7,taxi.car.spec.width*.42),l=Math.max(1.2,taxi.car.spec.length*.38),y=Math.max(.55,taxi.car.spec.height*.42);for(const [x,z] of [[w,l],[-w,l],[w,-l],[-w,-l]]){const lamp=new THREE.Mesh(new THREE.BoxGeometry(.12,.1,.16),mat.clone());lamp.position.set(x,y,z);mesh.add(lamp);lamps.push(lamp);}mesh.userData.taxiHazards=lamps;}
 taxi.hazards=!!on;for(const lamp of lamps)lamp.visible=!!on;
}
function updateTaxiHazards(){const lamps=taxi?.car?.mesh?.userData?.taxiHazards;if(!lamps)return;const visible=!!taxi.hazards&&Math.floor(state.elapsed*3.5)%2===0;for(const lamp of lamps)lamp.visible=visible;}
function taxiArrivalChime(){
 try{if(!state.sound)return;initAudio();const ctx=engineAudio?.ctx;if(!ctx)return;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(740,ctx.currentTime);osc.frequency.setValueAtTime(930,ctx.currentTime+.12);gain.gain.setValueAtTime(.08,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.32);osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.34);}catch(error){console.warn('[Taxi] arrival chime failed',error);}
}
function dispatchPhysicalTaxi(){
 try{
  if(!state.started)return;
  if(state.mode!=='foot'){toast('Scendi dal veicolo prima di chiamare il taxi.',4);return;}
  if(!taxiDispatcher)throw new Error('TaxiDispatcher not initialized');
  if(taxi?.phase==='arriving'){toast('Il Taxi sta già arrivando.',4);return;}
  if(taxi?.phase==='ready'){state.waypoint={x:taxi.car.x,z:taxi.car.z,name:'Taxi abusivo'};routeTo(state.waypoint);toast('Il Taxi è già arrivato. Avvicinati e premi E.',5);return;}
  const plan=taxiDispatcher.planDispatch(state);if(!plan)throw new Error('No safe 3D taxi dispatch route near player');
  const {spawn,target,path}=plan;
  if(!taxi){const car=addCar(spawn.x,spawn.z,spawn.yaw,false,false,'taxi');car.missionUnit=true;car.name='Taxi abusivo';taxi={car,driver:createTaxiDriver(),phase:'arriving',path:[],index:0,blocked:0,repathAt:0,hazards:false};}
  else{Object.assign(taxi.car,{x:spawn.x,z:spawn.z,y:spawn.y,yaw:spawn.yaw,speed:0,health:100,parked:false});taxi.car.mesh.visible=true;taxi.phase='arriving';}
  taxi.driver.visible=false;taxi.target=target;taxi.path=path;taxi.index=Math.min(1,Math.max(0,path.length-1));taxi.blocked=0;taxi.repathAt=state.elapsed+2.5;setTaxiHazards(false);poseVehicle(taxi.car);previousActors.delete(taxi.car.mesh);
  state.waypoint={x:target.x,z:target.z,name:'Taxi abusivo'};routeTo(state.waypoint);toast('Taxi abusivo chiamato: sta arrivando.',5);
 }catch(error){taxiDestinationFailure(error,'physical dispatch');}
}
function updateTaxi(dt){
 if(!taxi)return;updateTaxiHazards();
 if(taxi.phase!=='arriving')return;
 try{
  if(state.elapsed>taxi.repathAt&&dist(taxi.target,state)>20){const target=taxiDispatcher.pickup(state);if(target){const path=taxiDispatcher.route(taxi.car,target);if(path.length){taxi.target=target;taxi.path=path;taxi.index=Math.min(1,path.length-1);}}taxi.repathAt=state.elapsed+2.5;}
  const result=taxiDispatcher.step(taxi.car,taxi.path,taxi.index,dt);taxi.index=result.index;taxi.blocked=result.blocked?taxi.blocked+dt:Math.max(0,taxi.blocked-dt);poseVehicle(taxi.car);
  if(result.arrived||dist(taxi.car,taxi.target)<6.5){taxi.phase='ready';taxi.car.speed=0;taxi.car.parked=true;taxi.driver.visible=false;setTaxiHazards(true);state.waypoint=null;state.route=[];taxiArrivalChime();toast('Il Taxi è arrivato. Avvicinati e premi E per salire.',6);return;}
  if(taxi.blocked>2.5){const path=taxiDispatcher.route(taxi.car,taxi.target);if(path.length){taxi.path=path;taxi.index=Math.min(1,path.length-1);}taxi.blocked=0;}
 }catch(error){console.warn('[Taxi] physical AI recovered from error',error);const plan=taxiDispatcher?.planDispatch(state);if(plan){Object.assign(taxi.car,{x:plan.spawn.x,z:plan.spawn.z,y:plan.spawn.y,yaw:plan.spawn.yaw,speed:0,parked:false});taxi.target=plan.target;taxi.path=plan.path;taxi.index=Math.min(1,plan.path.length-1);poseVehicle(taxi.car);}else{taxiDestinationFailure(error,'physical taxi AI');}}
}
function boardTaxiAndChoose(){
 try{
  if(!taxiCanBoard())return;
  const c=taxi.car;state.mode='car';state.car=c;resetGroundMotion(c);state.x=c.x;state.z=c.z;state.y=c.y??terrain.height(c.x,c.z);state.yaw=c.yaw;state.speed=0;state.vy=0;state.health=c.health;c.parked=true;c.speed=0;taxi.driver.visible=false;taxi.phase='boarded';setTaxiHazards(false);player.visible=false;camOrbit=0;followYaw=state.yaw;cameraRig.reset(state.yaw);openTaxiMenu(true);
 }catch(error){taxiDestinationFailure(error,'boarding');}
}
function beginTaxiTrip(destination,road,price){
 try{
  if(!taxi?.car||state.car!==taxi.car||!validTaxiDestination(destination)||!validTaxiDestination(road))throw new Error('Invalid taxi destination or player is not aboard');
  unlockTaxiUI();state.money=Math.max(0,state.money-price);save();const p=road,c=taxi.car;taxi.destination={...p,name:destination.name};taxi.driver.visible=false;setTaxiHazards(false);
  Object.assign(c,{x:p.x,z:p.z,y:p.y??terrain.height(p.x,p.z),yaw:Number.isFinite(p.yaw)?p.yaw:state.yaw,speed:0,health:Math.max(1,c.health),parked:true});resetGroundMotion(c);poseVehicle(c);
  Object.assign(state,{mode:'car',car:c,x:c.x,z:c.z,y:c.y,yaw:c.yaw,speed:0,vy:0,health:c.health,waypoint:null,route:[]});taxi.phase='at-destination';previousPose=null;previousActors.delete(c.mesh);waterRecovery.reset();waterRecovery.remember(state,terrain);followYaw=state.yaw;cameraRig.reset(state.yaw);camera.position.set(state.x-10,state.y+8,state.z-12);player.visible=false;setTaxiHazards(true);toast('Destinazione raggiunta. Premi E per scendere.',5);
 }catch(error){taxiDestinationFailure(error,'trip confirmation');}
}
function confirmTaxi(destination){
 try{
  if(!validTaxiDestination(destination))throw new Error('Destination coordinates are invalid');if(!taxi?.car||state.car!==taxi.car)throw new Error('Player is not aboard taxi');
  const road=taxiFastRoad(destination);if(!road)throw new Error('No bounded road found near destination');const price=taxiFare(taxi.car,road);showMenu('Conferma il viaggio','<p class="about-copy"><strong>'+destination.name+'</strong><br>Prezzo calcolato sulla distanza: <strong>€'+price+'</strong> · massimo €100.</p><div class="menu-actions"><button class="primary" id="confirmTaxi">Conferma e parti</button><button id="cancelTaxi">Annulla</button></div>');
  const confirm=$('confirmTaxi'),cancel=$('cancelTaxi');if(!confirm||!cancel)throw new Error('Taxi confirmation controls missing');confirm.onclick=()=>beginTaxiTrip(destination,road,price);cancel.onclick=()=>openTaxiMenu(true);
 }catch(error){taxiDestinationFailure(error,'destination selection');}
}
function openTaxiMap(){
 try{if(!taxi?.car||state.car!==taxi.car)throw new Error('Player is not aboard taxi');taxiMapPick=true;if($('menu')?.open)$('menu').close();setPaused(true);$('mapPlaces').innerHTML='<span class="eyebrow">SCEGLI TU</span><p class="about-copy">Tocca un punto sulla mappa. Vedrai il prezzo prima di confermare.</p>';$('mapDialog').showModal();drawFullMap();}catch(error){taxiDestinationFailure(error,'open taxi map');}
}
function openTaxiMenu(force=false){
 try{
  if(!taxi?.car||state.car!==taxi.car||state.mode!=='car'||(!force&&taxi.phase!=='boarded'&&taxi.phase!=='at-destination'))throw new Error('Enter the taxi before choosing a destination');
  const destinations=taxiDestinations(PLACES,HOME,AIRPORT_GATE).filter(validTaxiDestination);taxi.phase='boarded';showMenu('Dove vuoi andare?','<div class="activities">'+destinations.map((p,i)=>'<button class="activity" data-taxi="'+i+'"><span><b>'+p.name+'</b><small>'+p.tag+' · €'+taxiFare(taxi.car,p)+'</small></span></button>').join('')+'<button class="activity" id="taxiChoose"><span><b>SCEGLI TU</b><small>Indica un punto sulla mappa · massimo €100</small></span></button></div>');
  document.querySelectorAll('[data-taxi]').forEach(button=>button.onclick=()=>{try{const destination=destinations[Number(button.dataset.taxi)];if(!validTaxiDestination(destination))throw new Error('Invalid list destination');confirmTaxi(destination);}catch(error){taxiDestinationFailure(error,'list click');}});$('taxiChoose').onclick=openTaxiMap;
 }catch(error){taxiDestinationFailure(error,'open taxi menu');}
}
function beginMission'''

source, n = re.subn(r"function taxiCanTalk\(\).*?\nfunction beginMission", physical_taxi, source, count=1, flags=re.S)
if n != 1:
    # Accept a previously partially converted name on reruns.
    source, n = re.subn(r"function taxiCanBoard\(\).*?\nfunction beginMission", physical_taxi, source, count=1, flags=re.S)
if n != 1:
    raise SystemExit(f'Physical taxi patch failed: taxi block replacements={n}')

# M is exclusively the global map. Taxi dispatch is only the explicit map/UI action.
source = source.replace("$('callTaxi').onclick=()=>{closeDialogs();callTaxi();};", "$('callTaxi').onclick=()=>{closeDialogs();dispatchPhysicalTaxi();};")
source = source.replace("function interact(){if(taxiCanTalk())openTaxiMenu();else toggleVehicle();}", "function interact(){if(taxiCanBoard())boardTaxiAndChoose();else toggleVehicle();}")
source = source.replace("function interact(){if(taxiCanBoard())openTaxiMenu();else toggleVehicle();}", "function interact(){if(taxiCanBoard())boardTaxiAndChoose();else toggleVehicle();}")
source = source.replace("if(taxiCanTalk())hint='E · PARLA';", "if(taxiCanBoard())hint='E · SALI SUL TAXI';")
source = source.replace("if(taxiCanBoard())hint='E · PARLA';", "if(taxiCanBoard())hint='E · SALI SUL TAXI';")
source = source.replace("if(c===taxi?.car){taxi.phase='ready';placeTaxiDriver();}", "if(c===taxi?.car){taxi.phase='ready';taxi.driver.visible=false;setTaxiHazards(true);}")

# Centralise keyboard handling. No other M handler is introduced.
keyboard = r'''inputManager.start(e=>{if(e.code==='F3'){e.preventDefault();if(!e.repeat)performanceOverlay.toggle();return;}if(e.code==='Tab'&&state.started&&!state.paused&&(state.car?.style==='cinquecento'||state.car?.spec.tracked))e.preventDefault();if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)&&state.started&&!state.paused)e.preventDefault();if(e.repeat)return;if(state.paused){if(e.code==='KeyM'&&$('mapDialog')?.open&&!taxiMapPick){e.preventDefault();closeDialogs();return;}if(e.code==='Escape'){e.preventDefault();closeDialogs();}return;}if(e.code==='Escape'){if(state.started)pauseMenu();return;}if(e.code==='Enter'&&!state.started){start();return;}if(!state.started)return;keys.add(e.code);if(e.code==='KeyM'){openMap();return;}if(e.code==='KeyE')interact();if(e.code==='KeyC'){state.camera=(state.camera+1)%3;toast(['Chase camera','Close camera','Aerial camera'][state.camera],1.5);}if(e.code==='KeyV')vehiclesMenu();if(e.code==='KeyJ')activities();if(e.code==='KeyR')recover();if(e.code==='KeyF')ejectParachute();});'''
source, n = re.subn(r"window\.addEventListener\('keydown',e=>\{.*?\}\);\nwindow\.addEventListener\('keyup',e=>keys\.delete\(e\.code\)\);", keyboard, source, count=1, flags=re.S)
if n != 1 and keyboard not in source:
    raise SystemExit(f'InputManager patch failed: keyboard replacements={n}')

# Instantiate the physical dispatcher after the road graph exists.
init_marker = "signals=new TrafficSignals(graph,data.signals);"
if "taxiDispatcher=new TaxiDispatcher({graph,terrain,collision:world.collision,taxiSpec:VEHICLES.taxi,vehicleBlocked});" not in source:
    if init_marker not in source: raise SystemExit('TaxiDispatcher init marker not found')
    source = source.replace(init_marker, "taxiDispatcher=new TaxiDispatcher({graph,terrain,collision:world.collision,taxiSpec:VEHICLES.taxi,vehicleBlocked});"+init_marker, 1)

# Global map click remains guarded. It may enter taxi destination mode only when
# openTaxiMap explicitly sets taxiMapPick=true after boarding.
if "taxiDestinationFailure(error,'map click')" not in source:
    raise SystemExit('Guarded map click handler missing; refusing unsafe taxi patch')

# Cache bust this runtime explicitly.
index = INDEX.read_text(encoding='utf-8')
index = re.sub(r'<script type="module" src="\./game\.js(?:\?v=[^"]+)?"></script>', '<script type="module" src="./game.js?v=taxi-physical-20260915-1"></script>', index, count=1)
INDEX.write_text(index, encoding='utf-8')

# Sanity checks: M must map to openMap only, physical dispatch must exist, and
# destination UI cannot open before boarding.
required = [
    "function dispatchPhysicalTaxi()",
    "function taxiCanBoard()",
    "function boardTaxiAndChoose()",
    "taxiDispatcher.planDispatch(state)",
    "toast('Il Taxi è arrivato. Avvicinati e premi E per salire.'",
    "if(e.code==='KeyM'){openMap();return;}",
    "const inputManager=new InputManager(window,keys);",
]
for token in required:
    if token not in source: raise SystemExit('Physical taxi patch missing: '+token)
if "if(e.code==='KeyM')openTaxi" in source or "if(e.key==='m')openTaxi" in source:
    raise SystemExit('Unsafe M -> taxi UI binding remains')

if source != original:
    GAME.write_text(source, encoding='utf-8')
    print('Restored physical 3D taxi dispatch; M is global-map only.')
else:
    print('Physical taxi dispatch already installed.')
