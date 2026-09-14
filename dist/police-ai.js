import {SpeedCameras} from './speed-cameras.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VEHICLES} from './vehicles.js';
import {dist,roadRoute} from './core.js';
import {vehicleBlocked} from './movement.js';
import {followRoad} from './chase-routing.js';

let violationSeq=0;
export function installPoliceAIHooks(){
 if(!SpeedCameras.prototype.__balancedPoliceAI){
  SpeedCameras.prototype.__balancedPoliceAI=true;
  const base=SpeedCameras.prototype.update;
  SpeedCameras.prototype.update=function(){
   if(!this.__sparseSites){
    this.__sparseSites=true;this.__allSites=[...this.sites];
    const active=this.__allSites.filter((_,i)=>i%2===0);
    for(const s of this.__allSites)if(!active.includes(s)&&s.mesh)s.mesh.visible=false;
    this.sites=active;globalThis.__padovaActiveSpeedSites=active;
   }
   const before=this.state.money;base.call(this);
   if(this.state.money<before){
    const hit=this.sites.filter(s=>s.cooldownUntil>this.state.elapsed).sort((a,b)=>dist(a,this.state)-dist(b,this.state))[0];
    if(hit)globalThis.__padovaSpeedViolation={seq:++violationSeq,siteId:hit.id,at:this.state.elapsed};
   }
  };
 }
 if(!ModernGameplay.prototype.__sparseRoadblocks){
  ModernGameplay.prototype.__sparseRoadblocks=true;
  const base=ModernGameplay.prototype.updateRoadblocks;
  ModernGameplay.prototype.updateRoadblocks=function(){
   const s=this.state;
   if(s.wanted===0&&!this.roadblocks.length){
    this.__routineRoadblockAt??=Math.max(90,this.nextRoadblock||0);
    if(s.elapsed<this.__routineRoadblockAt){this.nextRoadblock=Math.max(this.nextRoadblock||0,this.__routineRoadblockAt);return;}
    this.__routineRoadblockAt=s.elapsed+170;
   }
   base.call(this);
   if(s.wanted===0)this.nextRoadblock=Math.max(this.nextRoadblock,s.elapsed+120);
   else if(s.wanted>=3&&s.wanted<5)this.nextRoadblock=Math.max(this.nextRoadblock,s.elapsed+48);
  };
 }
}
function shoulderPoint(game,site,side,along){
 const fx=Math.sin(site.yaw),fz=Math.cos(site.yaw),nx=Math.cos(site.yaw),nz=-Math.sin(site.yaw),offset=site.road.w/2+2.55;
 const p={x:site.x+fx*along+nx*offset*side,z:site.z+fz*along+nz*offset*side,yaw:site.yaw};
 p.y=game.terrain.height(p.x,p.z);
 if(!game.terrain.dry(p.x,p.z,VEHICLES.sedan.width/2,p.y)||vehicleBlocked(p.x,p.z,p.yaw,game.collision,VEHICLES.sedan,p.y))return null;
 return p;
}
function policeParkingPair(game,site){
 const candidates=[[-1,-10],[-1,-18],[1,-10],[1,-18],[-1,-27],[1,-27]]
  .map(([side,along])=>shoulderPoint(game,site,side,along)).filter(Boolean);
 const pair=[];
 for(const p of candidates){
  if(pair.some(q=>dist(p,q)<6.5))continue;
  pair.push(p);if(pair.length===2)break;
 }
 return pair.length===2?pair:null;
}

export class PoliceAI{
 constructor(){this.pairs=new Map();this.lastViolation=0;this.arrest=0;}
 spawnPair(game,site){
  if(this.pairs.has(site.id))return this.pairs.get(site.id);
  const parking=policeParkingPair(game,site);if(!parking)return null;
  const units=parking.map((p,i)=>{const c=game.addCar(p.x,p.z,p.yaw,false,true,'sedan');Object.assign(c,{y:p.y,speed:0,parked:true,missionUnit:true,fixedSpawn:true,speedTrapPolice:true,speedTrapHome:{...p},name:'Polizia · Controllo velocità'});game.decorateRoadblock(c,i,true);c.roadblock=false;c.routineCheck=false;game.pose(c);return c;});
  this.pairs.set(site.id,{site,units,pursuit:false,startedAt:0});return this.pairs.get(site.id);
 }
 retireFar(game){
  for(const [id,pair] of [...this.pairs]){if(pair.pursuit)continue;if(dist(game.state,pair.site)<720)continue;for(const c of pair.units)if(c!==game.state.car)game.retire(c);this.pairs.delete(id);}
 }
 beginPursuit(game,pair){
  if(!pair||pair.pursuit)return;pair.pursuit=true;pair.startedAt=game.state.elapsed;this.arrest=0;
  game.state.wanted=Math.max(1,game.state.wanted);game.wantedLevel=Math.max(1,game.wantedLevel||0);
  for(const c of pair.units){c.parked=false;c.speedTrapPursuit=true;c.routeAt=0;c.path=[];c.pathIndex=1;}
  game.toast('Velocità rilevata · le pattuglie del controllo iniziano l’inseguimento.',4);
 }
 resetPair(game,pair){
  pair.pursuit=false;this.arrest=0;
  for(const c of pair.units){const h=c.speedTrapHome;Object.assign(c,{x:h.x,z:h.z,y:h.y,yaw:h.yaw,speed:0,parked:true,speedTrapPursuit:false,path:[],pathIndex:0});game.pose(c);}
 }
 chase(game,pair,dt){
  let nearest=Infinity;
  for(const c of pair.units){
   nearest=Math.min(nearest,dist(c,game.state));
   if(c.routeAt<game.state.elapsed){c.path=roadRoute(c,game.state,game.graph);c.pathIndex=1;c.routeAt=game.state.elapsed+1.15;}
   followRoad(c,dt,game.graph,game.terrain,game.collision,{max:35,accel:11,turnRate:1.7,traffic:game.cars.filter(o=>o!==c&&o!==game.state.car&&!o.speedTrapPolice)});game.pose(c);
  }
  if(nearest<7&&Math.abs(game.state.speed)<3)this.arrest+=dt;else this.arrest=Math.max(0,this.arrest-dt*.5);
  if(this.arrest>2.2){game.state.wanted=0;game.wantedLevel=0;game.toast('Controllo concluso · inseguimento terminato.',3);this.resetPair(game,pair);return;}
  if(game.state.elapsed-pair.startedAt>55||nearest>950){game.state.wanted=0;game.wantedLevel=0;this.resetPair(game,pair);}
 }
 update(game,dt){
  const sites=globalThis.__padovaActiveSpeedSites||[];
  for(const site of sites)if(dist(game.state,site)<390)this.spawnPair(game,site);
  this.retireFar(game);
  const violation=globalThis.__padovaSpeedViolation;
  if(violation&&violation.seq!==this.lastViolation){this.lastViolation=violation.seq;this.beginPursuit(game,this.pairs.get(violation.siteId));}
  for(const pair of this.pairs.values()){
   if(pair.pursuit)this.chase(game,pair,dt);
   for(const c of pair.units)if(c.roadblockLamp)c.roadblockLamp.visible=Math.sin(game.state.elapsed*9+(c.x+c.z)*.01)>0;
  }
 }
}
