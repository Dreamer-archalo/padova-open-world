import assert from 'node:assert/strict';
import fs from 'node:fs';
import {UnifiedMap,mapWheelZoomFactor} from './dist/unified-map.js';

const map=Object.create(UnifiedMap.prototype);
map.canvas={width:1200,height:800};
map.bounds={x:0,z:0,w:40000,h:20000};
map.center={x:20000,z:10000};
map.zoomLevel=5;
const cursor={x:850,y:310};
const before=map.fromCanvas(cursor.x,cursor.y);
for(const [delta,mode] of [[-120,0],[-3,1],[-1,2]]){
 const factor=mapWheelZoomFactor(delta,mode,800);
 assert(factor>1&&factor<1.5,'wheel and trackpad zoom must advance smoothly');
 map.zoomAt(cursor.x,cursor.y,factor,{factor:true});
 const after=map.fromCanvas(cursor.x,cursor.y);
 assert(Math.hypot(before.x-after.x,before.z-after.z)<.001,'zoom stays under the pointer');
}
const zoomBefore=map.zoomLevel;
map.zoomAt(cursor.x,cursor.y,1.3,{factor:true});
assert(map.zoomLevel>zoomBefore,'two-finger pinch can zoom in');
map.pan(120,-80);
assert(Math.hypot(before.x-map.fromCanvas(cursor.x,cursor.y).x,before.z-map.fromCanvas(cursor.x,cursor.y).z)>1,
 'drag moves the shared map viewport');
assert(mapWheelZoomFactor(0)===1,'idle wheel input changes nothing');

const game=fs.readFileSync(new URL('./dist/game.js',import.meta.url),'utf8');
const helper=fs.readFileSync(new URL('./dist/taxi-map-ui.js',import.meta.url),'utf8');
assert(game.includes("if(!place.open)return;ev.preventDefault()")&&game.includes('unifiedMap.pan('),
 'taxi selection must use the same wheel and drag viewport as the normal map');
assert(!helper.includes('canvas.style.transform')&&!helper.includes('canvas.addEventListener(\'wheel\''),
 'a second CSS transform must not compete with the geographical map');
console.log('PASS wheel, trackpad, pinch and drag share one bounded map viewport');
