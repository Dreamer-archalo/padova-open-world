import assert from 'node:assert/strict';
import fs from 'node:fs';
import {roadTier,roadVisibleAtZoom,lagoonBackdropEdge,VectorMapDetail} from './dist/unified-map-detail.js';
import {RegionalWorld} from './dist/regional-world.js';

// Road hierarchy uses CSS-space zoom and must not vary between mobile DPRs.
const shown=(css,dpr=1,mini=false)=>['motorway','primary','secondary','tertiary','residential','footway'].filter(
 k=>roadVisibleAtZoom(k,css*dpr,{mini,pixelRatio:dpr}));
for(const dpr of [1,2,3]){
 assert.deepEqual(shown(.02,dpr),['motorway','primary']);
 assert.deepEqual(shown(.07,dpr),['motorway','primary','secondary']);
 assert.deepEqual(shown(.13,dpr),['motorway','primary','secondary','tertiary']);
 assert.deepEqual(shown(.23,dpr),['motorway','primary','secondary','tertiary','residential']);
 assert.equal(shown(.55,dpr).length,6);
}
assert.equal(roadTier('motorway_link'),4);
assert.equal(roadTier('secondary_link'),2);
assert(!shown(.55,2,true).includes('footway')&&shown(.80,2,true).includes('footway'));

// Map-only backdrop cannot become a hard rectangular sea boundary.
for(let z=-13000;z<12500;z+=300){
 const a=lagoonBackdropEdge(z),b=lagoonBackdropEdge(z+50);
 assert(a>31000&&a<40000&&Math.abs(a-b)<550,'Sharp or rectangular coast edge');
}
assert(Math.abs(lagoonBackdropEdge(-12000)-lagoonBackdropEdge(2000))>500);
const html=fs.readFileSync('dist/index.html','utf8'),css=fs.readFileSync('dist/unified-main.css','utf8');
assert(!/testa ville F8|mappa GTA vettoriale HD tutti i comuni|mappa GTA R8|MAPPA-GTA-R8|map-diagnostics/i.test(html));
assert(!css.includes('.map-diagnostics'));
const strokes=[];let current;
const ctx={save(){},restore(){},setTransform(){},beginPath(){},closePath(){},
 moveTo(){},lineTo(){},fillRect(){},rect(){},clip(){},fill(){},
 set strokeStyle(value){current=value;},get strokeStyle(){return current;},stroke(){strokes.push(current);}};
const map=new VectorMapDetail({roads:[
 {k:'motorway',p:[[0,0],[80,0]],w:12},
 {k:'primary',p:[[0,10],[80,10]],w:10},
 {k:'secondary',p:[[0,20],[80,20]],w:8},
 {k:'residential',p:[[0,30],[80,30]],w:6},
 {k:'footway',p:[[0,40],[80,40]],w:2}],areas:[],water:[],buildings:[]},null);
map.draw(ctx,{x:40,z:20},640,480,.02,{pixelRatio:1,labels:false});
assert.equal(strokes.length,2,'Overview should draw only motorway and primary roads');
const reg=fs.readFileSync('dist/regional-world.js','utf8');
assert(reg.includes('bridgeUndersides')&&reg.includes('shutterFaces')&&reg.includes('tMid'));
const grid={x0:33000,z0:-3700,width:4,height:4,step:160,heights:Array(16).fill(1)};
const world=new RegionalWorld({add(){}},{roads:[],water:[],areas:[],buildings:[]},grid,{add(){}});
const group={userData:{},add(){}};
world.ambient(group,{roads:[{a:[35000,-3400],b:[35020,-3400],w:2,k:'footway',yA:1,yB:1}]});
assert(group.userData.ambient?.some(a=>a.person),'Pedestrian-only Venice calli must spawn lightweight NPCs');
console.log('PASS: progressive high-DPI map roads, no debug UI, organic lagoon, facade/bridge batches and footpath NPCs.');
