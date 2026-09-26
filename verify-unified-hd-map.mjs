import assert from 'node:assert/strict';
import fs from 'node:fs';
import {VectorMapDetail} from './dist/unified-map-detail.js';
import {UnifiedMap} from './dist/unified-map.js';

const read=p=>fs.readFileSync(p,'utf8');
const game=read('dist/game.js'),renderer=read('dist/unified-map.js'),style=read('dist/unified-main.css');
const hdPath='dist/data/map-hd-extras.json';
assert(fs.existsSync(hdPath),'Map-only source must be built by preview workflow');
const extra=JSON.parse(read(hdPath));
assert.equal(extra.origin.join(','),'45.4064,11.8768');
assert(extra.mapOnly===true,'HD map data must NEVER be added to expensive regional 3D geometry');
if(extra.buildings.length||extra.roads.length){
 assert(extra.buildings.length>=100,'HD extra source too sparse for its advertised coverage');
 console.log('Additional HD-only OSM geometry:',extra.buildings.length,'buildings,',extra.roads.length,'streets.');
}else console.warn('Extra Overpass source unavailable: high-DPI existing regional vectors remain available.');

const area=(x,z,size=80)=>[[x-size,z-size],[x+size,z-size],[x+size,z+size],[x-size,z+size]];
const sample={bounds:[-6500,-12000,39000,9000],buildings:[],water:[],
 areas:[{k:'land',p:area(37000,-3000)}],
 roads:[{k:'residential',n:'Via Centrale',w:6.5,p:[[14800,100],[14940,100]]},
        {k:'primary',n:'Via Mestre',w:10,p:[[26920,0],[27090,0]]},
        {k:'pedestrian',n:'Calle',w:3,p:[[36920,-3000],[37080,-3000]]}]};
const padova={areas:[],water:[],buildings:[{lod:'detailed',p:area(0,0,12)}],roads:[]};
const detail=new VectorMapDetail(sample,padova);
const vis=(x,z,kind)=>detail.visible(kind,{x0:x-150,z0:z-150,x1:x+150,z1:z+150});
assert.equal(vis(14900,100,'roads').length,1,'Riviera map streets disappear when zoomed');
assert.equal(vis(27000,0,'roads').length,1,'Mestre map streets disappear when zoomed');
assert.equal(vis(37000,-3000,'roads').length,1,'Venice pedestrian geometry disappears when zoomed');
assert.equal(vis(0,0,'buildings').length,1,'Padova details lost while indexing regional extras');
// Exercise native canvas geometry + road-label paths, not just string matches.
function canvas(w=660,h=510){
 const stats={stroke:0,fill:0,labels:0};
 const ctx={canvas:{width:w,height:h,clientWidth:w/2.7,getBoundingClientRect(){return {width:w/2.7,height:h/2.7}}},
 save(){},restore(){},setTransform(){},clearRect(){},beginPath(){},rect(){},clip(){},
 moveTo(){},lineTo(){},closePath(){},fillRect(){},translate(){},rotate(){},
 stroke(){stats.stroke++;},fill(){stats.fill++;},strokeText(){stats.labels++;},
 fillText(){stats.labels++;},measureText(text){return {width:text.length*12};},drawImage(){}};
 return {ctx,stats};
}
const a=canvas(),mini=detail.draw(a.ctx,{x:14900,z:100},660,510,.9,{pixelRatio:2.7,mini:true});
assert(mini.vector&&mini.visible.roads>=1&&a.stats.stroke>0,'Minimap not native vector detail');
const b=canvas(1920,1280);
const full=detail.draw(b.ctx,{x:27000,z:0},1920,1280,.65,{pixelRatio:2.2});
assert(full.visible.roads>=1&&b.stats.stroke>0,'Full Mestre map relies on stretched pixel texture');
const c=canvas(1920,1280);detail.draw(c.ctx,{x:37000,z:-3000},1920,1280,.9,{pixelRatio:2});
assert(c.stats.labels>=1,'Named Venetian pedestrian calli are not drawn at city zoom');
assert(c.stats.fill>=1,'Venice full map land/water geometry missing');
const fullCanvas={width:1920,height:1280,clientWidth:960,getBoundingClientRect:()=>({width:960,height:640}),getContext:()=>canvas(1920,1280).ctx};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>canvas(3072,1450).ctx})};
const map=new UnifiedMap(fullCanvas,{}, {x:-6050,z:-6550,w:13400,h:12900},sample,padova);
map.centerOn(14900,100,9);
const pick={x:1120,y:700},before=map.fromCanvas(pick.x,pick.y);
map.zoomAt(pick.x,pick.y,1);
const after=map.fromCanvas(pick.x,pick.y);
assert(Math.abs(before.x-after.x)<.02&&Math.abs(before.z-after.z)<.02,'Zoom must stay anchored on the target town');
map.addMapDetail({buildings:[{lod:'detailed',p:area(25000,0,24)}]});
assert.equal(map.detail.visible('buildings',{x0:24900,z0:-100,x1:25100,z1:100}).length,1,
 'Lazy HD 2D-only source is not indexed after startup');
assert(game.includes('densityCanvas(mini,2.7,1100)')&&game.includes('densityCanvas($(\'fullmap\'),2.25,3400)'),
 'Map backing resolution must follow high DPI even when WebGL performance mode is active');
assert(game.includes('map-hd-extras.json')&&renderer.includes('Raster-free GTA-inspired vectors'),
 '2D detail streaming/low zoom boundary missing');
assert(style.includes('.hud.minimap #minimap')&&style.includes('image-rendering:auto'),
 'Responsive high-resolution minimap CSS missing');
assert(game.includes("mapTouches")&&game.includes('mapPinchDistance')&&renderer.includes('zoomAt(screenX,screenY'),
 'Mobile pinch zoom is no longer anchored on the actual location');
assert(game.includes("const metres=state.mode==='car'?100:50")&&game.includes('c.scale(density,density)'),
 'Minimap player arrow and accurate distance scale must stay readable on high-density displays');
console.log('PASS: Padova, Riviera, Mestre, Venice at arbitrary native vector zoom; DPR mini/full; optional HD parcels; anchor-preserving zoom.');
