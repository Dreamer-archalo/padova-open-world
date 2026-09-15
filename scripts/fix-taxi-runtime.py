from pathlib import Path
import re

# --- game.js: taxi/UI guards -------------------------------------------------
game_path = Path('dist/game.js')
source = game_path.read_text(encoding='utf-8')
original = source

source = source.replace(
    "import {taxiFare,taxiDestinations,advanceTaxi} from './taxi-service.js';",
    "import {taxiFare,taxiDestinations,advanceTaxi,findTaxiRoad} from './taxi-service.js';",
)

source, n = re.subn(
    r"^function taxiFastRoad\(pos\)\{.*$",
    "function taxiFastRoad(pos){return validTaxiDestination(pos)?findTaxiRoad(pos,graph,terrain,{maxRadius:520,maxCandidates:2500,maxMs:18}):null;}",
    source,
    count=1,
    flags=re.M,
)
if n != 1:
    raise SystemExit(f'Taxi safety patch failed: taxiFastRoad replacements={n}')

safety_helpers = """function validTaxiDestination(pos){return !!pos&&Number.isFinite(pos.x)&&Number.isFinite(pos.z)&&pos.x>=minBounds.x&&pos.x<=minBounds.x+minBounds.w&&pos.z>=minBounds.z&&pos.z<=minBounds.z+minBounds.h;}
function unlockTaxiUI(){
 taxiMapPick=false;try{if($('mapDialog')?.open)$('mapDialog').close();}catch{}try{if($('menu')?.open)$('menu').close();}catch{}try{setPaused(false);}catch{}keys.clear();document.body.classList.remove('taxi-transit');if($('taxiLoading'))$('taxiLoading').hidden=true;
}
function taxiDestinationFailure(error,context='taxi destination'){
 console.warn('[Taxi] '+context+' failed',error);unlockTaxiUI();toast('Destinazione non raggiungibile',5);
}
"""
if 'function validTaxiDestination(pos)' not in source:
    marker = "function taxiCanTalk(){return state.mode==='foot'&&taxi?.phase==='ready'&&taxi.driver.visible&&dist(state,taxi.driver.position)<3;}\n"
    if marker not in source:
        raise SystemExit('Taxi safety patch failed: taxiCanTalk marker not found')
    source = source.replace(marker, marker + safety_helpers, 1)

# Ensure all waypoint pathfinding is bounded and exceptions degrade to marker-only.
source, n = re.subn(
    r"^function routeTo\(target\)\{.*$",
    "function routeTo(target){try{state.route=target?roadRoute(state,target,graph,{maxSteps:30000,maxMs:60}):[];}catch(error){console.warn('[Navigation] route failed',error);state.route=[];}if(target&&!state.route.length)toast('No connected road route here. Follow the destination marker.');}",
    source,
    count=1,
    flags=re.M,
)
if n != 1:
    raise SystemExit(f'Taxi safety patch failed: routeTo replacements={n}')

# Replace the complete taxi interaction flow with guarded, deterministic travel.
taxi_block = """function callTaxi(){
 try{
  if(!state.started)return;
  if(state.mode!=='foot'){toast('Scendi dal veicolo prima di chiamare il taxi.',4);return;}
  const probe={x:state.x+Math.sin(state.yaw)*8,z:state.z+Math.cos(state.yaw)*8},spawn=taxiFastRoad(probe)||taxiFastRoad(state);
  if(!spawn){taxiDestinationFailure(new Error('No bounded road near player'),'call');return;}
  if(!taxi){const car=addCar(spawn.x,spawn.z,spawn.yaw,false,true,'taxi');car.missionUnit=true;car.name='Taxi abusivo';taxi={car,driver:createTaxiDriver(),phase:'ready',path:[],index:0,blocked:0,repathAt:0};}
  else{Object.assign(taxi.car,{x:spawn.x,z:spawn.z,y:spawn.y??terrain.height(spawn.x,spawn.z),yaw:spawn.yaw,speed:0,health:100,parked:true});taxi.car.mesh.visible=true;taxi.driver.visible=false;taxi.phase='ready';}
  taxi.target=null;taxi.path=[];taxi.index=0;taxi.blocked=0;poseVehicle(taxi.car);placeTaxiDriver();state.waypoint=null;state.route=[];toast('Taxi pronto. Scegli la destinazione.',3);openTaxiMenu(true);
 }catch(error){taxiDestinationFailure(error,'call');}
}
function updateTaxi(dt){
 // Destination travel is a deterministic teleport. No taxi AI/pathfinding runs here.
 return;
}
function beginTaxiTrip(destination,road,price){
 try{
  if(!taxi?.car||!validTaxiDestination(destination)||!validTaxiDestination(road))throw new Error('Invalid taxi destination');
  unlockTaxiUI();state.money=Math.max(0,state.money-price);save();
  const p=road,c=taxi.car;taxi.driver.visible=false;taxi.destination={...p,name:destination.name};
  Object.assign(c,{x:p.x,z:p.z,y:p.y??terrain.height(p.x,p.z),yaw:Number.isFinite(p.yaw)?p.yaw:state.yaw,speed:0,health:Math.max(1,c.health),parked:true});resetGroundMotion(c);poseVehicle(c);
  Object.assign(state,{mode:'car',car:c,x:c.x,z:c.z,y:c.y,yaw:c.yaw,speed:0,vy:0,health:c.health,waypoint:null,route:[]});taxi.phase='at-destination';previousPose=null;previousActors.delete(c.mesh);waterRecovery.reset();waterRecovery.remember(state,terrain);followYaw=state.yaw;cameraRig.reset(state.yaw);camera.position.set(state.x-10,state.y+8,state.z-12);player.visible=false;toast('Destinazione raggiunta. Premi E per scendere.',5);
 }catch(error){taxiDestinationFailure(error,'trip confirmation');}
}
function confirmTaxi(destination){
 try{
  if(!validTaxiDestination(destination))throw new Error('Destination coordinates are null/undefined/NaN/outside map');
  if(!taxi?.car)throw new Error('Taxi car missing');
  const road=taxiFastRoad(destination);if(!road)throw new Error('No road found within bounded taxi search');
  const price=taxiFare(taxi.car,road);showMenu('Conferma il viaggio','<p class=\"about-copy\"><strong>'+destination.name+'</strong><br>Prezzo calcolato sulla distanza: <strong>€'+price+'</strong> · massimo €100.</p><div class=\"menu-actions\"><button class=\"primary\" id=\"confirmTaxi\">Conferma e parti</button><button id=\"cancelTaxi\">Annulla</button></div>');
  const confirm=$('confirmTaxi'),cancel=$('cancelTaxi');if(!confirm||!cancel)throw new Error('Taxi confirmation controls missing');
  confirm.onclick=()=>{try{beginTaxiTrip(destination,road,price);}catch(error){taxiDestinationFailure(error,'confirm button');}};
  cancel.onclick=()=>{try{openTaxiMenu();}catch(error){taxiDestinationFailure(error,'cancel button');}};
 }catch(error){taxiDestinationFailure(error,'destination selection');}
}
function openTaxiMap(){
 try{
  if(!taxi?.car)throw new Error('Taxi car missing');taxiMapPick=true;if($('menu')?.open)$('menu').close();setPaused(true);$('mapPlaces').innerHTML='<span class=\"eyebrow\">SCEGLI TU</span><p class=\"about-copy\">Tocca un punto sulla mappa. Vedrai il prezzo prima di confermare.</p>';$('mapDialog').showModal();drawFullMap();
 }catch(error){taxiDestinationFailure(error,'open map');}
}
function openTaxiMenu(force=false){
 try{
  if(!force&&!taxiCanTalk()){unlockTaxiUI();toast('Avvicinati al tassista per parlare.',4);return;}
  if(!taxi?.car)throw new Error('Taxi car missing');
  const destinations=taxiDestinations(PLACES,HOME,AIRPORT_GATE).filter(validTaxiDestination);showMenu('Dove vuoi andare?','<div class=\"activities\">'+destinations.map((p,i)=>'<button class=\"activity\" data-taxi=\"'+i+'\"><span><b>'+p.name+'</b><small>'+p.tag+' · €'+taxiFare(taxi.car,p)+'</small></span></button>').join('')+'<button class=\"activity\" id=\"taxiChoose\"><span><b>SCEGLI TU</b><small>Indica un punto sulla mappa · massimo €100</small></span></button></div>');
  document.querySelectorAll('[data-taxi]').forEach(button=>button.onclick=()=>{try{const destination=destinations[Number(button.dataset.taxi)];if(!validTaxiDestination(destination))throw new Error('Invalid list destination');confirmTaxi(destination);}catch(error){taxiDestinationFailure(error,'list click');}});
  const choose=$('taxiChoose');if(!choose)throw new Error('Custom destination button missing');choose.onclick=()=>{try{openTaxiMap();}catch(error){taxiDestinationFailure(error,'custom destination');}};
 }catch(error){taxiDestinationFailure(error,'open menu');}
}
function beginMission"""
source, n = re.subn(
    r"function callTaxi\(\)\{.*?\n\}\nfunction beginMission",
    taxi_block,
    source,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit(f'Taxi safety patch failed: taxi block replacements={n}')

# Validate map -> world conversion before doing any road lookup/pathfinding.
map_handler = """$('fullmap').onclick=e=>{
 try{
  const r=$('fullmap').getBoundingClientRect(),size=Math.min(r.width,r.height);if(!Number.isFinite(size)||size<=0||!Number.isFinite(e?.clientX)||!Number.isFinite(e?.clientY))throw new Error('Invalid map pointer/geometry');
  const offsetX=(r.width-size)/2,offsetY=(r.height-size)/2,px=e.clientX-r.left-offsetX,py=e.clientY-r.top-offsetY;if(!Number.isFinite(px)||!Number.isFinite(py))throw new Error('Map conversion returned NaN');if(px<0||py<0||px>size||py>size)return;
  if(state.mission){toast('Finish or cancel your activity to set a waypoint.');return;}
  const p={x:minBounds.x+px/size*minBounds.w,z:minBounds.z+py/size*minBounds.h,name:taxiMapPick?'Destinazione personalizzata':'Waypoint'};if(!validTaxiDestination(p))throw new Error('Map click outside valid world bounds');
  if(taxiMapPick){taxiMapPick=false;if($('mapDialog')?.open)$('mapDialog').close();confirmTaxi(p);return;}
  const road=taxiFastRoad(p);if(!road)throw new Error('Waypoint has no bounded road node');state.waypoint={x:road.x,z:road.z,name:p.name};routeTo(state.waypoint);drawFullMap();closeDialogs();
 }catch(error){taxiDestinationFailure(error,'map click');}
};"""
source, n = re.subn(r"^\$\('fullmap'\)\.onclick=.*$", map_handler, source, count=1, flags=re.M)
if n != 1:
    raise SystemExit(f'Taxi safety patch failed: map handler replacements={n}')

for token in [
    'findTaxiRoad',
    'function validTaxiDestination(pos)',
    'function taxiDestinationFailure(error',
    'maxCandidates:2500',
    "taxiDestinationFailure(error,'map click')",
    "roadRoute(state,target,graph,{maxSteps:30000,maxMs:60})",
]:
    if token not in source:
        raise SystemExit('Taxi safety patch failed: missing ' + token)

if source != original:
    game_path.write_text(source, encoding='utf-8')
    print('Taxi runtime patched with bounded destination lookup and UI error guards.')
else:
    print('Taxi runtime safety patch already present.')

# --- core.js: hard-stop navigation search -----------------------------------
core_path = Path('dist/core.js')
core = core_path.read_text(encoding='utf-8')
core_original = core
nearest_safe = """export function nearestRoad(pos,g,connectedOnly=false,{maxRadius=100,fallback=true,maxCandidates=Infinity,maxMs=Infinity}={}){if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.z)||!g?.index||!g?.nodes)return null;const now=()=>globalThis.performance?.now?.()??Date.now(),started=now();let best=null,dd=Infinity,count=0,candidates=g.index.near(pos.x,pos.z,maxRadius);if(!candidates.size&&fallback)candidates=g.segments||[];for(const s of candidates){if(++count>maxCandidates||now()-started>maxMs)break;if(connectedOnly&&!s.connected)continue;const a=g.nodes[s.a],b=g.nodes[s.b];if(!a||!b)continue;const p=nearestOnSegment(pos.x,pos.z,[a.x,a.z],[b.x,b.z]);const d=dist(p,pos);if(d<dd){dd=d;best={...p,d,segment:s,yaw:Math.atan2(b.x-a.x,b.z-a.z)+(s.road.oneway===-1?Math.PI:0)};}}return best;}"""
core, n = re.subn(r"export function nearestRoad\(pos,g,connectedOnly=false\)\{.*?\}\nexport function roadRoute", nearest_safe + "\nexport function roadRoute", core, count=1, flags=re.S)
if n != 1:
    # Already-patched signatures are allowed; normalize them too.
    core, n = re.subn(r"export function nearestRoad\(pos,g,connectedOnly=false,\{.*?\}\s*=\s*\{\}\)\{.*?\}\nexport function roadRoute", nearest_safe + "\nexport function roadRoute", core, count=1, flags=re.S)
if n != 1:
    raise SystemExit(f'Navigation safety patch failed: nearestRoad replacements={n}')

route_safe = """export function roadRoute(from,to,g,{maxSteps=50000,maxMs=90}={}){if(!g?.nodes?.length||!from||!to||!Number.isFinite(from.x)||!Number.isFinite(from.z)||!Number.isFinite(to.x)||!Number.isFinite(to.z))return [];const now=()=>globalThis.performance?.now?.()??Date.now(),started=now(),a=nearestRoad(from,g,true),b=nearestRoad(to,g,true);if(!a||!b)return [];const direction=s=>s.road.oneway??(s.road.one?1:0),ad=direction(a.segment),bd=direction(b.segment);if(a.segment===b.segment&&(!ad||ad*(b.t-a.t)>=0))return [{x:a.x,z:a.z},{x:b.x,z:b.z}];const start=ad===1?a.segment.b:ad===-1?a.segment.a:dist(from,g.nodes[a.segment.a])<dist(from,g.nodes[a.segment.b])?a.segment.a:a.segment.b,goal=bd===1?b.segment.a:bd===-1?b.segment.b:dist(to,g.nodes[b.segment.a])<dist(to,g.nodes[b.segment.b])?b.segment.a:b.segment.b;const open=new Heap(),came=new Map(),scores=new Map([[start,0]]),closed=new Set();open.push({id:start,f:0});let found=false,steps=0;while(open.length&&steps++<maxSteps){if((steps&127)===0&&now()-started>maxMs)return [];const item=open.pop();if(!item)break;const n=item.id;if(closed.has(n))continue;if(n===goal){found=true;break;}closed.add(n);const node=g.nodes[n];if(!node)continue;for(const e of node.edges){const s=(scores.get(n)??Infinity)+e.d;if(s<(scores.get(e.id)??Infinity)){scores.set(e.id,s);came.set(e.id,n);open.push({id:e.id,f:s+dist(g.nodes[e.id],g.nodes[goal])});}}}if(!found)return [];const path=[goal];let rebuild=0;while(path[0]!==start&&rebuild++<maxSteps){const prev=came.get(path[0]);if(prev===undefined)return [];path.unshift(prev);}if(path[0]!==start)return [];return [{x:a.x,z:a.z},...path.map(i=>({x:g.nodes[i].x,z:g.nodes[i].z})),{x:b.x,z:b.z}];}"""
core, n = re.subn(r"export function roadRoute\(from,to,g(?:,\{.*?\}\s*=\s*\{\})?\)\{.*?\n\}\nexport function safeRoadPoint", route_safe + "\nexport function safeRoadPoint", core, count=1, flags=re.S)
if n != 1:
    raise SystemExit(f'Navigation safety patch failed: roadRoute replacements={n}')
if core != core_original:
    core_path.write_text(core, encoding='utf-8')
    print('Navigation pathfinding now has coordinate, step and wall-clock guards.')

# --- taxi-map-ui.js: guard zoom coordinate remapping -------------------------
ui_path = Path('dist/taxi-map-ui.js')
ui = ui_path.read_text(encoding='utf-8')
ui_original = ui
ui = ui.replace(
    "function mapPointFromPointer(e){const r=wrap.getBoundingClientRect(),width=canvas.clientWidth||wrap.clientWidth,height=canvas.clientHeight||wrap.clientHeight;return {u:clamp((e.clientX-r.left-tx)/(Math.max(1,width)*scale),0,1),v:clamp((e.clientY-r.top-ty)/(Math.max(1,height)*scale),0,1)};}",
    "function mapPointFromPointer(e){const r=wrap.getBoundingClientRect(),width=canvas.clientWidth||wrap.clientWidth,height=canvas.clientHeight||wrap.clientHeight;if(!Number.isFinite(e?.clientX)||!Number.isFinite(e?.clientY)||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||!Number.isFinite(scale)||scale<=0)return null;const u=(e.clientX-r.left-tx)/(width*scale),v=(e.clientY-r.top-ty)/(height*scale);return Number.isFinite(u)&&Number.isFinite(v)?{u:clamp(u,0,1),v:clamp(v,0,1)}:null;}",
)
old_click = """ if(typeof nativeMapClick==='function')canvas.onclick=e=>{
  if(scale<=1)return nativeMapClick.call(canvas,e);
  const {u,v}=mapPointFromPointer(e),r=canvas.getBoundingClientRect(),size=Math.min(r.width,r.height),offsetX=(r.width-size)/2,offsetY=(r.height-size)/2;
  return nativeMapClick.call(canvas,{clientX:r.left+offsetX+u*size,clientY:r.top+offsetY+v*size});
 };"""
new_click = """ if(typeof nativeMapClick==='function')canvas.onclick=e=>{
  try{
   if(scale<=1)return nativeMapClick.call(canvas,e);
   const point=mapPointFromPointer(e);if(!point)throw new Error('Invalid zoomed map coordinates');
   const {u,v}=point,r=canvas.getBoundingClientRect(),size=Math.min(r.width,r.height);if(!Number.isFinite(size)||size<=0)throw new Error('Invalid map dimensions');const offsetX=(r.width-size)/2,offsetY=(r.height-size)/2,clientX=r.left+offsetX+u*size,clientY=r.top+offsetY+v*size;if(!Number.isFinite(clientX)||!Number.isFinite(clientY))throw new Error('Map remap produced NaN');
   return nativeMapClick.call(canvas,{clientX,clientY});
  }catch(error){console.warn('[Taxi map] click guard',error);try{mapDialog?.dispatchEvent(new Event('cancel',{cancelable:true}));}catch{}try{if(mapDialog?.open)mapDialog.close();}catch{}const toast=document.getElementById('toast');if(toast){toast.textContent='Destinazione non raggiungibile';toast.hidden=false;}return null;}
 };"""
if old_click not in ui:
    raise SystemExit('Taxi map UI safety patch failed: click wrapper marker not found')
ui = ui.replace(old_click, new_click, 1)
if ui != ui_original:
    ui_path.write_text(ui, encoding='utf-8')
    print('Taxi map zoom/click remapping now validates coordinates and catches errors.')

# --- cache-buster -------------------------------------------------------------
index_path = Path('dist/index.html')
index = index_path.read_text(encoding='utf-8')
versioned = '<script type="module" src="./game.js?v=taxi-20260915-4"></script>'
index = re.sub(r'<script type="module" src="\./game\.js(?:\?v=[^\"]+)?"></script>', versioned, index, count=1)
if versioned not in index:
    raise SystemExit('Taxi safety patch failed: game.js cache-buster not applied')
index_path.write_text(index, encoding='utf-8')
print('Taxi safety refactor cache-buster set for GitHub Pages.')
