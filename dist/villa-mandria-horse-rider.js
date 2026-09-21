// Integrate estate horses with the game's existing E-to-mount interaction.
// Synchronize at the input event as well as during the next render tick: otherwise
// the guard briefly remains on the horse while the new player is already mounted.
import {ModernGameplay} from './modern-gameplay.js';
import {createRider} from './vehicles.js';
let activeGame=null;
function syncHorseRiders(g){
 for(const horse of g.villaV3?.patrols||[]){
  if(horse.mandriaPatrol!=='mounted')continue;
  if(!horse.rider){horse.rider=createRider();horse.rider.position.y=.84;horse.mesh.add(horse.rider);}
  const mounted=g.state.car===horse;
  horse.rider.visible=mounted;
  if(horse.guardModel)horse.guardModel.visible=!mounted&&horse.mesh.visible;
  if(mounted&&horse.mesh.userData.horseLegs){const amount=Math.min(1,Math.abs(g.state.speed)/8);
   horse.mesh.userData.horseLegs.forEach((leg,i)=>{leg.rotation.x=Math.sin(g.state.elapsed*(7+Math.abs(g.state.speed))+(i%2)*Math.PI)*.52*amount;});
  }
 }
}
// Bubble phase runs after the prompt's click handler, which delegates to the
// original touchCar action. The actual mount remains owned by the base game.
document.addEventListener('click',event=>{
 if(event.target?.id==='mandriaMountPrompt'&&activeGame)syncHorseRiders(activeGame);
});
const previous=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaHorseRider){
 ModernGameplay.prototype.__mandriaHorseRider=true;
 ModernGameplay.prototype.update=function(dt){
  previous.call(this,dt);
  activeGame=this;
  syncHorseRiders(this);
 };
}
