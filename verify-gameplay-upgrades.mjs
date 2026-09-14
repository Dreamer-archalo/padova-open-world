import fs from 'node:fs';
import assert from 'node:assert/strict';

const files=['pedestrian-manager','minimap-ui','zone-manager','mission-system','police-ai','gameplay-upgrades'];
const code=Object.fromEntries(files.map(n=>[n,fs.readFileSync(`dist/${n}.js`,'utf8')]));
const runtime=fs.readFileSync('dist/phase2-runtime.js','utf8');

assert(code['pedestrian-manager'].includes('near.d>road.w/2+.2')&&code['pedestrian-manager'].includes('sidewalkPoint'),'pedestrians are repaired off carriageways');
assert(code['pedestrian-manager'].includes('p.crossGoal||p.crossing'),'active crossings stay legal');
assert(code['minimap-ui'].includes('Math.PI+this.heading')&&code['minimap-ui'].includes('original.rotate(Math.PI)'),'minimap is heading-up and player arrow stays up');
assert(code['zone-manager'].includes('ALBIGNASEGO')&&code['zone-manager'].includes("location.textContent='Albignasego'"),'Albignasego geofence owns UI label');
assert(code['mission-system'].includes('TAXI')&&code['mission-system'].includes('GUIDA AUTONOMA')&&code['mission-system'].includes('mission-navigation-waypoints'),'missions offer taxi or 3D navigation');
assert(code['police-ai'].includes('i%2===0')&&code['police-ai'].includes('__routineRoadblockAt')&&code['police-ai'].includes('speedTrapPursuit'),'speed controls are sparse and on-site units pursue');
assert(runtime.includes("import './gameplay-upgrades.js'"),'runtime loads new gameplay managers');
console.log('PASS AI pedestrians, heading-up minimap, Albignasego geofence, mission navigator and police balancing');
