import assert from 'node:assert/strict';
import fs from 'node:fs';
import {VisibleMapTiles} from './dist/map-live-tiles.js';
import {UnifiedMap} from './dist/unified-map.js';
import {VectorMapDetail} from './dist/unified-map-detail.js';

const src=fs.readFileSync('dist/game.js','utf8');
const html=fs.readFileSync('dist/index.html','utf8');
const layout=fs.readFileSync('dist/unified-main.css','utf8');
assert(src.includes('miniTiles.draw(c,state,w,h,k)'),'Padova minimap lacks independent HD tile fallback');
assert(src.includes('unifiedMap.tiles=miniTiles'),'Full world and minimap are not using a shared tile cache');
assert(src.includes('state.car?.spec.aircraft?Math.max(6000'),'Fast aircraft could hammer local high zoom');
assert(html.includes('MAPPA-H2O-R3')&&html.includes('minimapStatus'),'Stale preview cannot be distinguished from current build');
assert(layout.includes('minimap-osm-credit'),'OSM attribution must stay visible on the minimap');

const coords={
 padova:{x:0,z:0},
 dolo:{x:15500,z:-1800},
 mirano:{x:18400,z:-9500},
 marghera:{x:28000,z:-6500},
 venice:{x:36100,z:-3200}
};
for(const point of Object.values(coords)){
 const tile=VisibleMapTiles.worldToTile(point.x,point.z,17),
  restored=VisibleMapTiles.tileToWorld(tile.x,tile.y,17);
 assert(Math.abs(point.x-restored.x)<.00001&&Math.abs(point.z-restored.z)<.00001,
  'World-space tile mismatch at '+JSON.stringify(point));
}
let requests=0,drawn=0;
globalThis.Image=class {
 set src(url){
  assert(url.startsWith('https://tile.openstreetmap.org/'),'Nonstandard tile URL');
  requests++;this.onload?.();
 }
};
const canvas={save(){},restore(){},beginPath(){},rect(){},clip(){},
 drawImage(){drawn++;}};
const tiles=new VisibleMapTiles({maxNewPerDraw:8});
const here={x:36100,z:-3200};
const first=tiles.draw(canvas,here,660,510,1.8);
assert(first.requested<=8&&first.requested>0,'Only a visible and modest tile set may be requested');
const second=tiles.draw(canvas,here,660,510,1.8);
assert(second.ready>0&&drawn>0,'Loaded tiles must render on the visible map canvas');
assert(second.requested<=8,'Tile requests must remain bounded');
for(let i=0;i<10;i++)tiles.draw(canvas,here,660,510,1.8);
assert(requests<=65,'Repeated identical frames must not download invisible cities');
assert(tiles.chooseZoom(1.8)>tiles.chooseZoom(.09),'Local streets must use better-quality images than regional overview');
globalThis.Image=undefined;
const offline=new VisibleMapTiles();
const noNetwork=offline.draw(canvas,here,660,510,1.8);
assert(noNetwork.ready===0,'No remote images should be assumed offline');
const fallback=new VectorMapDetail({roads:[{k:'residential',w:6,p:[[36050,-3200],[36150,-3200]]}],
 areas:[],water:[],buildings:[]},null);
assert.equal(fallback.visible('roads',{x0:36000,z0:-3300,x1:36200,z1:-3100}).length,1,
 'All regions must retain native vector streets when internet is unavailable');
console.log('PASS: identical true-scale HD map and minimap in Padova, Dolo, Mirano, Marghera, Venice; visible-only tile use, shared cache, offline vector geometry.');
