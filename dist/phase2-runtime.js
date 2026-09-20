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
// Must precede legacy key listeners: Tab is throttle, Ctrl brake, G missile.
import './airport-air-controls.js';
import './airport-combat-flight.js';
import './airport-ejection-state.js';
import './airport-dogfight-v2.js';
import './airport-dogfight-jet-models.js';
import './airport-golf-arcade.js';
import './airport-cargo-yard.js';
import './airport-flight-refinement.js';
import './airport-lock-upgrade.js';
import './airport-life-v3.js';
import './airport-blast-ballistics.js';
// Installed last so its enemy arrows, mission HUD and control hints win visually.
import './airport-air-hunt.js';
// Decorative estate details are separate from the collision-aware hangar shell.
import './villa-treves-estate.js';
// Poplars follow the access road; optional plots and staff are proximity-loaded.
import './villa-mandria-life.js';
// Existing estate life owns its NPCs; this adds safe farm structures, lanes,
// low-cost patrol routes and a moving escort without replacing original logic.
import './villa-mandria-estate-v2.js';
// When old gate parking coordinates intersect real buildings, search for clear
// alternate locations instead of placing black cars inside colliders.
import './villa-mandria-security-placement.js';
import './villa-mandria-respawn-label.js';
// All models registered before the hangar catalogue is first opened.
import './villa-mandria-hangar.js';
// Final populate/addCar wrapper creates distinct military models both at the
// airport and when selecting one from the Mandria hangar.
import './airport-military-fleet.js';
// Home screen groups air, ground and urban vehicles. Boat slot is future-only;
// actual vehicle previews render lazily from 3-D meshes, not generic icons.
import './villa-mandria-catalog-ui.js';
// Protect the aircraft cards from displaying stale ground placeholders while
// their per-model GPU thumbnails are still being generated.
import './villa-mandria-air-preview-guard.js';
// High-visibility H/E controls, estate border, speech bubbles, horses and Ape patrols.
import './villa-mandria-estate-v3.js';
import './villa-mandria-horse-rider.js';
// SpatialIndex.near returns bucket candidates: confirm exact polygon collisions
// before rejecting a house, a poplar or a moving patrol.
import './villa-mandria-placement-fix.js';
// v4 is strictly estate-scoped. The public city and aircraft catalog stay intact.
import './villa-mandria-v4-grounds.js';
import './villa-mandria-v4-roof.js';
import './villa-mandria-v4-vehicles.js';
import './villa-mandria-v4-range.js';
import './villa-mandria-v4-polish.js';
// Post-publication feedback: optional dialogues and estate-only input/visual changes.
import './villa-mandria-v5-dialogues.js';
import './villa-mandria-v5-controls.js';
// Additional collision-aware estate refinements, never modify the airport.
import './villa-mandria-v5-estate-polish.js';
import './villa-mandria-v5-greetings.js';

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
function updateDamage(){const value=parseFloat(healthValue?.textContent||'100'),inVehicle=(vehicleName?.textContent||'ON FOOT').trim()!=='ON FOOT',damage=inVehicle?Math.max(0,100-value):0;document.body.dataset.vehicleDamage=damage>=65?'critical':damage>=35?'damaged':damage>=8?'scratched':'none';damageEdge.hidden=damage<8;damageEdge.style.setProperty('--damage',String(Math.min(.48,damage/150)));}
document.addEventListener('keydown',event=>{if(event.code!=='KeyC'||event.repeat||playing?.hidden||document.querySelector('dialog[open]'))return;cameraMode=(cameraMode+1)%3;showCamera();});
const observer=new MutationObserver(updateDamage);if(healthValue)observer.observe(healthValue,{childList:true,subtree:true,characterData:true});if(vehicleName)observer.observe(vehicleName,{childList:true,subtree:true,characterData:true});updateDamage();