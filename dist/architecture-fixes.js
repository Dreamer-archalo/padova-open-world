import {CityWorld} from './world.js';
import {project} from './core.js';

const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/\s+/g,' ').trim();
const finite=n=>Number.isFinite(n);

function foundationY(terrain,b){
 const cx=finite(b?.cx)?b.cx:(b?.minX+b?.maxX)/2,cz=finite(b?.cz)?b.cz:(b?.minZ+b?.maxZ)/2;
 const centre=terrain.elevation(cx,cz),values=[centre];
 for(const p of b?.p||[]){
  const y=terrain.groundHeight?.(p[0],p[1]);
  if(finite(y)&&Math.abs(y-centre)<2.5)values.push(y);
 }
 // Authored walls are seated a few centimetres into the lowest plausible local
 // surface. This closes daylight gaps without dragging a whole monument down an
 // unrelated canal/bridge level.
 return Math.min(...values)-.035;
}
function nearestBuilding(world,x,z,predicate=()=>true,max=90){let best=null,bestD=max;for(const b of world.data?.buildings||[]){if(!predicate(b))continue;const bx=finite(b.cx)?b.cx:(b.minX+b.maxX)/2,bz=finite(b.cz)?b.cz:(b.minZ+b.maxZ)/2,d=Math.hypot(bx-x,bz-z);if(d<bestD){best=b;bestD=d;}}return best;}
function byName(world,pattern,centre){let best=null,bestScore=Infinity;for(const b of world.data?.buildings||[]){if(!pattern.test(norm(b.n)))continue;const bx=finite(b.cx)?b.cx:(b.minX+b.maxX)/2,bz=finite(b.cz)?b.cz:(b.minZ+b.maxZ)/2,d=centre?Math.hypot(bx-centre.x,bz-centre.z):0;if(d<bestScore){best=b;bestScore=d;}}return best;}

// The streamed OSM shell used to be drawn on top of the authored church shell.
// Mark authored churches before the real generator sees the chunk, while keeping
// the original footprint collision as the physical envelope. Preserve whether a
// more specific landmark system already owned the building before this patch.
const buildSteps=CityWorld.prototype.buildStageSteps;
if(!CityWorld.prototype.__authoredArchitectureShellFix){
 CityWorld.prototype.__authoredArchitectureShellFix=true;
 CityWorld.prototype.buildStageSteps=function*(key,stage){
  const ch=this.chunks.get(key);
  if(ch)for(const b of ch.buildings)if(b.authoredChurch){
   if(b.__landmarkOwnedBeforeChurchFix===undefined)b.__landmarkOwnedBeforeChurchFix=!!b.authoredLandmark;
   b.modelActive=true;b.authoredLandmark=true;
  }
  yield* buildSteps.call(this,key,stage);
 };
}

function removeLegacyDuplicates(world){
 const landmarks=world.landmarks;if(!landmarks)return;
 const remove=[];
 const major=/basilica di sant.?antonio|basilica del santo|duomo di padova|cattedrale di padova/;
 for(const child of [...landmarks.children]){
  if(major.test(norm(child.userData?.buildingName))){remove.push(child);continue;}
 }
 // Santa Giustina's older procedural domes were not tagged by name. In modern
 // mode they are batched into their own landmark chunk, whose LOD centre is a
 // reliable locator. Remove that legacy batch so only churches.js owns it.
 const sj=project(45.3982,11.88025);
 for(const child of [...landmarks.children]){
  const c=child.userData?.lodCentre;
  if(c&&Math.hypot(c.x-sj.x,c.z-sj.z)<95)remove.push(child);
 }
 for(const child of new Set(remove))landmarks.remove(child);
}
function seatChurches(world){
 const layer=world.details?.churches?.root;if(!layer)return;
 for(const g of [...layer.children]){
  const b=nearestBuilding(world,g.position.x,g.position.z,x=>x.authoredChurch,75);if(!b)continue;
  if(b.__landmarkOwnedBeforeChurchFix===undefined)b.__landmarkOwnedBeforeChurchFix=!!b.authoredLandmark;
  // If landmarks.js already owns this exact building (for example Eremitani),
  // keep the more specific landmark and discard the second generic church model.
  if(b.__landmarkOwnedBeforeChurchFix){layer.remove(g);continue;}
  g.position.y=foundationY(world.terrain,b);
  b.modelActive=true;b.authoredLandmark=true;
 }
 layer.userData.churchCount=layer.children.length;
}
function seatHistoricMonuments(world){
 const h=world.details?.historic;if(!h)return;
 const targets=[
  [h.pedrocchi,/pedrocchi/],
  [h.cityHall,/palazzo moroni|municipio/],
  [h.bo,/palazzo del bo|palazzo bo|universita degli studi di padova/]
 ];
 for(const [g,pattern] of targets){if(!g)continue;const c=g.userData?.centre||g.position,b=byName(world,pattern,c);if(!b)continue;g.position.y=foundationY(world.terrain,b);b.modelActive=true;b.authoredLandmark=true;}
}
function fixArchitecture(world){
 if(world.__architectureWallsFixed)return;
 const churchLayer=world.details?.churches?.root,historic=world.details?.historic;if(!churchLayer&&!historic)return;
 world.__architectureWallsFixed=true;
 removeLegacyDuplicates(world);
 seatChurches(world);
 seatHistoricMonuments(world);
}

const update=CityWorld.prototype.update;
if(!CityWorld.prototype.__architectureWallRuntimeFix){
 CityWorld.prototype.__architectureWallRuntimeFix=true;
 CityWorld.prototype.update=function(...args){const result=update.apply(this,args);fixArchitecture(this);return result;};
}
