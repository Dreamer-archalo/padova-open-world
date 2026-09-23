import fs from 'node:fs';

const file='dist/game.js';
let code=fs.readFileSync(file,'utf8');
const replace=(before,after,label)=>{
 const count=code.split(before).length-1;
 if(count!==1)throw new Error(`${label}: expected exactly one anchor, found ${count}`);
 code=code.replace(before,after);
};

replace(
 "  if(taxi?.phase==='arriving'){toast('Il Taxi sta già arrivando.',4);return;}\n  if(taxi?.phase==='ready'){placeTaxiDriver();state.waypoint={x:taxi.car.x,z:taxi.car.z,name:'Taxi abusivo'};routeTo(state.waypoint);toast('Il Taxi è già arrivato. Avvicinati al guidatore e premi E.',5);return;}",
 `  // A previous taxi can be kilometres away after fast travel or on foot.
  // Reuse it only while its pickup is actually within walking distance.
  if(taxi?.phase==='arriving'&&dist(taxi.target||taxi.car,state)<85){toast('Il Taxi sta già arrivando.',4);return;}
  if(taxi?.phase==='ready'&&taxi.car.mesh.visible&&dist(taxi.car,state)<55){placeTaxiDriver();state.waypoint={x:taxi.car.x,z:taxi.car.z,name:'Taxi abusivo'};routeTo(state.waypoint);toast('Il Taxi è già arrivato. Avvicinati al guidatore e premi E.',5);return;}
  if(taxi&&['arriving','ready'].includes(taxi.phase)){
   // Cancel the stale pickup before planning; never send the player back to Prato.
   taxiDriverNPC?.hide();setTaxiHazards(false);taxi.car.speed=0;taxi.car.parked=true;taxi.car.mesh.visible=false;taxi.phase='gone';
   state.waypoint=null;state.route=[];
  }`,
 'reset stale physical taxi pickup');
replace(
 "if(e.code==='Escape'){e.preventDefault();closeDialogs();}return;}",
 "if(e.code==='Escape'||e.code==='KeyX'&&($('menu')?.open||$('mapDialog')?.open)){e.preventDefault();taxiMenuController?.cancel();closeDialogs();}return;}",
 'keyboard escape/X recovery');
fs.writeFileSync(file,code);
console.log('Applied stale taxi re-dispatch and keyboard X/Escape recovery to dist/game.js');
