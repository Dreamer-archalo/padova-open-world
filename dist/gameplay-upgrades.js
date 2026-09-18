import {ModernGameplay} from './modern-gameplay.js';
import {PedestrianManager} from './pedestrian-manager.js';
import {MinimapUI} from './minimap-ui.js';
import {ZoneManager} from './zone-manager.js';
import {MissionSystem} from './mission-system.js';
import {PoliceAI,installPoliceAIHooks} from './police-ai.js';
import './tangenziale-race.js';
import './tangenziale-race-polish.js';
import './tangenziale-race-short-sprint.js';
import './tangenziale-race-second.js';
import './tangenziale-race-runtime-fixes.js';
import './tangenziale-race-v2-polish.js';
import './tangenziale-race-final-fixes.js';
import './hospital-rooftop-easter-egg.js';
import './hospital-helipad-exit.js';
import './monoblocco-spectators.js';
import './monoblocco-course-polish.js';
import './monoblocco-raised-bridges.js';
import './monoblocco-course-visuals.js';
import './monoblocco-trial-paddock.js';
import './monoblocco-roof-exploration.js';
import './monoblocco-island-bridges.js';
import './taxi-loading-guard.js';
// Must precede online ownership hooks so remote human cars are never AI-driven.
import './tangenziale-race-difficulty.js';
import './online-race-v2.js';
import './online-race-second-fix.js';

// Exact Ospedale Civile Monoblocco footprint, not the former Treves-side roof.
installPoliceAIHooks();
const managers=new WeakMap();
function suite(game){
 if(!managers.has(game))managers.set(game,{
  pedestrians:new PedestrianManager(),
  minimap:new MinimapUI(),
  zones:new ZoneManager(),
  missions:new MissionSystem(),
  police:new PoliceAI()
 });
 return managers.get(game);
}
const basePopulate=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__pedestrianSpawnValidation){
 ModernGameplay.prototype.__pedestrianSpawnValidation=true;
 ModernGameplay.prototype.populate=function(...args){
  const out=basePopulate.apply(this,args),m=suite(this);
  m.pedestrians.update(this,.25);
  return out;
 };
}
const base=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__aiUiGameplayUpgrade){
 ModernGameplay.prototype.__aiUiGameplayUpgrade=true;
 ModernGameplay.prototype.update=function(dt){
  base.call(this,dt);const m=suite(this);
  m.pedestrians.update(this,dt);m.minimap.update(this,dt);m.zones.update(this,dt);m.missions.update(this,dt);m.police.update(this,dt);
 };
}
