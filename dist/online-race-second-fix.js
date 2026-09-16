// Repair race-two setup ordering and the guest's last countdown frame.
// Import after online-race-v2.js so its session and networking remain authoritative.
import {TangenzialeRace} from './tangenziale-race.js';
import './online-race-v2.js';

const previousStart=TangenzialeRace.prototype.start;
TangenzialeRace.prototype.start=function(...args){
  const onlineSecond=this.__nextRaceMode==='second'&&window.PadovaOnline?.connected&&!this.race;
  const result=previousStart.apply(this,args);
  if(onlineSecond&&this.race?.onlineId){
    const originalRace=this.race,id=originalRace.onlineId;
    // The existing second-race confirmation calls configureSecond() AFTER start().
    // Allow that synchronous setup to finish before locking the grid in the lobby.
    queueMicrotask(()=>{
      if(this.race!==originalRace||originalRace.onlineId!==id)return;
      if(originalRace.__secondRace&&originalRace.phase==='countdown'){
        originalRace.phase='lobby';
        if(this.game?.state){this.game.state.paused=false;this.game.state.speed=0;}
        if(originalRace.playerCar)originalRace.playerCar.speed=0;
        if(document.getElementById('menu')?.open)document.getElementById('menu').close();
      }
    });
  }
  return result;
};

const previousUpdate=TangenzialeRace.prototype.update;
TangenzialeRace.prototype.update=function(dt){
  const race=this.race;
  const finalGuestTick=!!(race?.onlineId&&race.onlineSlot>0&&race.phase==='countdown');
  const result=previousUpdate.call(this,dt);
  // The base countdown freezes the whole grid on its final frame. The v2 wrapper
  // repositions guests only while phase is 'countdown'; restore their slot on GO.
  if(finalGuestTick&&this.race===race&&race.phase==='running'){
    const other=race.ai?.[race.onlineSlot-1],player=race.playerCar,s=this.game?.state;
    if(other&&player&&s){
      const old={x:player.x,y:player.y,z:player.z,yaw:player.yaw};
      for(const k of ['x','y','z','yaw'])player[k]=other[k];
      Object.assign(other,old);
      this.game.pose(player);this.game.pose(other);
      Object.assign(s,{x:player.x,y:player.y,z:player.z,yaw:player.yaw,speed:0,vy:0});
    }
  }
  return result;
};
