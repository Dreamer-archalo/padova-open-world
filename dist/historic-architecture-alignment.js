import {CityWorld} from './world.js';
import {project} from './core.js';

const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/\s+/g,' ').trim();
const finite=Number.isFinite;
function centreOf(b){return {x:finite(b?.cx)?b.cx:(b.minX+b.maxX)/2,z:finite(b?.cz)?b.cz:(b.minZ+b.maxZ)/2};}
function foundationY(terrain,b){const c=centreOf(b),centre=terrain.elevation(c.x,c.z),values=[centre];for(const p of b?.p||[]){const y=terrain.groundHeight?.(p[0],p[1]);if(finite(y)&&Math.abs(y-centre)<1.2)values.push(y);}return Math.min(...values)-.025;}
function nearestBuilding(world,x,z,predicate=()=>true,max=90){let best=null,bestD=max;for(const b of world.data?.buildings||[]){if(!predicate(b))continue;const c=centreOf(b),d=Math.hypot(c.x-x,c.z-z);if(d<bestD){best=b;bestD=d;}}return best;}
function byName(world,pattern,near=null){let best=null,bestD=Infinity;for(const b of world.data?.buildings||[]){if(!pattern.test(norm(b.n)))continue;const c=centreOf(b),d=near?Math.hypot(c.x-near.x,c.z-near.z):0;if(d<bestD){best=b;bestD=d;}}return best;}

const buildStageSteps=CityWorld.prototype.buildStageSteps;
if(!CityWorld.prototype.__historicAuthoredShells){CityWorld.prototype.__historicAuthoredShells=true;CityWorld.prototype.buildStageSteps=function*(key,stage){const ch=this.chunks.get(key);if(ch)for(const b of ch.buildings)if(b.authoredChurch){b.modelActive=true;b.authoredLandmark=true;}yield* buildStageSteps.call(this,key,stage);};}

function removeLegacyDuplicates(world){
 const root=world.landmarks;if(!root)return;const remove=[];const major=/basilica di sant.?antonio|basilica del santo|duomo di padova|cattedrale di padova/;
 for(const child of [...root.children])if(major.test(norm(child.userData?.buildingName)))remove.push(child);
 const sj=project(45.3982,11.88025);for(const child of [...root.children]){const c=child.userData?.lodCentre;if(c&&Math.hypot(c.x-sj.x,c.z-sj.z)<95)remove.push(child);}
 for(const child of new Set(remove))root.remove(child);
}
function seatChurches(world){const layer=world.details?.churches?.root;if(!layer)return;for(const g of [...layer.children]){const b=nearestBuilding(world,g.position.x,g.position.z,x=>x.authoredChurch,75);if(!b)continue;g.position.y=foundationY(world.terrain,b);b.modelActive=true;b.authoredLandmark=true;}}
function seatHistoricMonuments(world){const h=world.details?.historic;if(!h)return;for(const [g,pattern] of [[h.pedrocchi,/pedrocchi/],[h.cityHall,/palazzo moroni|municipio/],[h.bo,/palazzo del bo|palazzo bo|universita degli studi di padova/]]){if(!g)continue;const c=g.userData?.centre||g.position,b=byName(world,pattern,c);if(!b)continue;g.position.y=foundationY(world.terrain,b);b.modelActive=true;b.authoredLandmark=true;}}
function alignArchitecture(world){if(world.__historicArchitectureAligned)return;const churches=world.details?.churches?.root,historic=world.details?.historic;if(!churches&&!historic)return;world.__historicArchitectureAligned=true;removeLegacyDuplicates(world);seatChurches(world);seatHistoricMonuments(world);}
const update=CityWorld.prototype.update;
if(!CityWorld.prototype.__historicArchitectureAlignmentRuntime){CityWorld.prototype.__historicArchitectureAlignmentRuntime=true;CityWorld.prototype.update=function(...args){const result=update.apply(this,args);alignArchitecture(this);return result;};}
