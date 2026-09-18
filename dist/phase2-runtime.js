import './phase4-terrain-fixes.js';
import './historic-terrain-level.js';
import './historic-plaza-alignment.js';
import './roof-upgrades.js';
import './taxi-map-ui.js';
import './taxi-confirmation-runtime.js';
import './ambient-pursuits.js';
import './phase3-runtime.js';
import './phase3-city-systems.js';
import './phase3-tram-fix.js';
// road-reality-pass and road-reality-audit are intentionally not imported here.
// Their global Terrain/RoadSurfaces monkey patches caused severe height discontinuities
// (roads/buildings/ground separating and actors sinking) on the live streamed world.
// The safer direct PR #28 fixes in the individual road/pedestrian modules remain active.
import './phase3-polish.js';
import './geometry-audit-runtime.js';
import './gameplay-upgrades.js';
import './city-micromobility.js';
import './historic-architecture-alignment.js';
import './villa-spawn-alignment.js';
import './airport-operations.js';
import './airport-traffic-enhancement.js';
import './airport-interactivity.js';
import './airport-flight-extras.js';
import './airport-combat-flight.js';
import './airport-ejection-state.js';
import './airport-dogfight-v2.js';
import './airport-dogfight-jet-models.js';
import './airport-golf-arcade.js';
import './airport-cargo-yard.js';
import './airport-flight-refinement.js';
import './airport-lock-upgrade.js';
import './airport-life-v3.js';

// UI-only Phase 2 feedback. It does not own gameplay state: it observes the
// existing HUD, so it cannot interfere with saves, physics or streaming.
const playing=document.getElementById('playingUI');
const healthValue=document.getElementById('healthValue');
const vehicleName=document.getElementById('vehicleName');

const cameraBanner=document.createElement('div');cameraBanner.id='cameraBanner';cameraBanner.className='camera-banner';cameraBanner.hidden=true;document.body.appendChild(cameraBanner);
const damageEdge=document.createElement('div');damageEdge.id='damageEdge';damageEdge.className='damage-edge';damageEdge.hidden=true;document.body.appendChild(damageEdge);
let cameraMode=0,cameraTimer=0;
const cameraNames=['DINAMICA','RAVVICINATA','ALTA'];
function showCamera(){
 cameraBanner.textContent='CAMERA · '+cameraNames[cameraMode];
 cameraBanner.hidden=false;
 cameraBanner.classList.remove('camera-banner-show');
 void cameraBanner.offsetWidth;
 cameraBanner.classList.add('camera-banner-show');
 clearTimeout(cameraTimer);
 cameraTimer=setTimeout(()=>{
  cameraBanner.classList.remove('camera-banner-show');
  cameraTimer=setTimeout(()=>cameraBanner.hidden=true,240);
 },1250);
}
function updateDamage(){const value=parseFloat(healthValue?.textContent||'100'),inVehicle=(vehicleName?.textContent||'ON FOOT').trim()!=='ON FOOT',damage=inVehicle?Math.max(0,100-value):0;damageEdge.hidden=damage<8;document.body.dataset.vehicleDamage=damage>=65?'critical':damage>=35?'damaged':damage>=8?'scratched':'none';damageEdge.style.setProperty('--damage',String(Math.min(.48,damage/150)));}
document.addEventListener('keydown',event=>{if(event.code!=='KeyC'||event.repeat||playing?.hidden||document.querySelector('dialog[open]'))return;cameraMode=(cameraMode+1)%3;showCamera();});
const observer=new MutationObserver(updateDamage);if(healthValue)observer.observe(healthValue,{childList:true,subtree:true,characterData:true});if(vehicleName)observer.observe(vehicleName,{childList:true,subtree:true,characterData:true});updateDamage();
