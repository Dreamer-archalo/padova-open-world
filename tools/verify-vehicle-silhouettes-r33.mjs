import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {NPC_VEHICLES,createNPCCar} from '../dist/modern-vehicles.js';
import {createCar} from '../dist/world.js';

function signature(model){
 model.updateMatrixWorld(true);
 const whole=new THREE.Box3().setFromObject(model),span=whole.getSize(new THREE.Vector3()),parts=[];
 model.traverse(o=>{if(!o.isMesh)return;const box=new THREE.Box3().setFromObject(o),c=box.getCenter(new THREE.Vector3()),s=box.getSize(new THREE.Vector3());
  const n=v=>Math.round(v*20)/20;
  parts.push([n((c.x-(whole.min.x+whole.max.x)/2)/span.x),n((c.y-whole.min.y)/span.y),n((c.z-(whole.min.z+whole.max.z)/2)/span.z),n(s.x/span.x),n(s.y/span.y),n(s.z/span.z)].join(','));
 });
 return parts.sort().join('|');
}
const ids=Object.keys(NPC_VEHICLES),signatures=new Map(ids.map(id=>[id,signature(createNPCCar(id,'#738493'))]));
assert(ids.length>=30,'regular catalogue should contain at least 30 distinct road vehicles');
assert(new Set(signatures.values()).size>=24,'regular traffic must expose many genuinely different normalized silhouettes');
for(const [a,b] of [['nido','tessera'],['rondine','botanica'],['porto','ambra'],['argine','meridiana'],['viaggio','familia'],['selva','altavia'],['officina','corriere'],['comitiva','campo'],['doge','aurora'],['goccia','cortile'],['linea','brina'],['roccia','targa']]){
 assert.notEqual(signatures.get(a),signatures.get(b),a+' and '+b+' must not share the same body silhouette');
}
const legacy=['sedan','compact','wagon','utility','sport'],legacySignatures=legacy.map(id=>signature(createCar('#778899',false,id)));
assert.equal(new Set(legacySignatures).size,legacy.length,'legacy traffic body styles must remain visually distinct');
const hangar=fs.readFileSync('dist/villa-mandria-hangar.js','utf8');
assert.match(hangar,/hangarThumbnail\(v\.category,[^\n]+,v\.spec\)/,'hangar thumbnails must receive each vehicle spec');
assert.match(hangar,/family=spec\.family/,'hangar thumbnails must vary by vehicle family');
console.log('PASS vehicle variety R33:',ids.length,'regular cars,',new Set(signatures.values()).size,'normalized silhouettes, legacy styles distinct and hangar previews model-aware.');
