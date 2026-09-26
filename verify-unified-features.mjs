import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LocalRespawn} from './dist/local-respawn.js';
import {VectorMapDetail} from './dist/unified-map-detail.js';

const read=p=>fs.readFileSync(p,'utf8');
const game=read('dist/game.js'),map=read('dist/unified-map.js'),html=read('dist/index.html');
const region=JSON.parse(read('dist/data/region-padova-venice.json'));
const roadTypes=new Set(['residential','living_street','unclassified','service','track']);
const spans=[[8500,14500],[14500,23500],[23500,33500]];
for(const [x0,x1] of spans){
 const found=region.roads.filter(r=>roadTypes.has(r.k)&&r.p.some(p=>p[0]>=x0&&p[0]<x1));
 assert(found.length>12,'Missing rural/local connecting roads between '+x0+' and '+x1);
}
assert(game.includes('requestRecover()')&&game.includes('localRespawn.choose('),'R and incident recovery not on one local-spawn path');
assert(game.includes('unifiedMap.drawMini(c,state,range,w,h)'),'Minimap must use vectors in Padova and all regional towns');
assert(game.includes('Math.max(11,unifiedMap.zoomLevel)'),'Opening M must zoom into actual position');
assert(map.includes('this.detail.draw(c,this.center,w,h,this.scale,'),'High-zoom M map still uses a stretched raster');
assert(map.includes('this.detail.draw(ctx,position,width,height,width/range,'),'Minimap still uses a stretched raster');
assert(html.includes('id="minimap" width="660" height="510"')&&html.includes('id="fullmap" width="1920" height="1280"'),'Both map canvas resolutions are too low');
assert(game.includes('state.respawnHospitalRoof=roof;return respawnAtHospitalRoof()'),'Manual rooftop R fallback missing');

const terrain={
 height:(x,z)=>Math.abs(x-40)<4?-3:2,
 dry:(x,z,r)=>Math.abs(x-40)>=r+4
};
const clear=()=>true;
const checkpoint=new LocalRespawn();
const start={x:8,z:3,y:2,yaw:.6,health:100,mode:'foot',car:null,parachuting:false};
assert(checkpoint.remember(start,terrain,clear,0,true));
const drowned={...start,x:40,y:-3};
const returned=checkpoint.choose(drowned,terrain,clear,null,{water:true,nearRoad:()=>null});
assert(returned&&Math.hypot(returned.x-start.x,returned.z-start.z)<.1,'Drowning returned to wrong region');
const onDry={...start,x:22,z:0};
const current=checkpoint.choose(onDry,terrain,clear);
assert(current&&Math.abs(current.x-22)<.01,'Manual R failed to use safe current position');
assert(!checkpoint.remember({...start,x:60,y:200,car:{spec:{aircraft:true}}},terrain,clear,1,true),'Mid-air plane may not overwrite dry checkpoint');
const blocked=new LocalRespawn();
assert(blocked.choose({...drowned,y:0},{height:()=>0,dry:()=>false},clear,null,{water:true,nearRoad:()=>null})===null,'No safe local spawn may fabricate a remote teleporter');

const roads=[{p:[[0,0],[70,0]],k:'residential',w:6},{p:[[1200,0],[1300,0]],k:'primary',w:9}];
const detail=new VectorMapDetail({roads,buildings:[],water:[],areas:[]},null);
assert.equal(detail.visible('roads',{x0:-100,x1:100,z0:-60,z1:60}).length,1);
let paths=0,strokes=0;
const ctx={beginPath(){paths++;},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){strokes++;},fillRect(){},save(){},rect(){},clip(){},restore(){}};
detail.draw(ctx,{x:0,z:0},660,510,1.2);
assert(strokes===1&&paths>=2,'Vector minimap draws wrong subset of roads');
console.log('PASS: all three corridor connector spans, regional respawn/water/R/aircraft checks and crisp vector viewport tests.');
