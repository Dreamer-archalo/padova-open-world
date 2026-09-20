// Integrate estate horses with the game's existing E-to-mount interaction.
// The patrol guard yields the saddle while the player is mounted.
import {ModernGameplay} from './modern-gameplay.js';
import {createRider} from './vehicles.js';
const previous=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaHorseRider){
 ModernGameplay.prototype.__mandriaHorseRider=true;
 ModernGameplay.prototype.update=function(dt){
  previous.call(this,dt);
  for(const horse of this.villaV3?.patrols||[]){
   if(horse.mandriaPatrol!=='mounted')continue;
   if(!horse.rider){horse.rider=createRider();horse.rider.position.y=.84;horse.mesh.add(horse.rider);}
   const mounted=this.state.car===horse;
   horse.rider.visible=mounted;
   if(horse.guardModel)horse.guardModel.visible=!mounted&&horse.mesh.visible;
   if(mounted&&horse.mesh.userData.horseLegs){const amount=Math.min(1,Math.abs(this.state.speed)/8);
    horse.mesh.userData.horseLegs.forEach((leg,i)=>{leg.rotation.x=Math.sin(this.state.elapsed*(7+Math.abs(this.state.speed))+(i%2)*Math.PI)*.52*amount;});
   }
  }
 };
}
