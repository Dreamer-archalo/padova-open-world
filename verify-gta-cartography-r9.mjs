import assert from 'node:assert/strict';
import fs from 'node:fs';
import {roadTier,roadVisibleAtZoom,VectorMapDetail} from './dist/unified-map-detail.js';
const source=p=>fs.readFileSync(p,'utf8');
assert.equal(roadTier('motorway'),3);
assert.equal(roadTier('primary'),2);
assert.equal(roadTier('tertiary'),1);
assert.equal(roadTier('residential'),0);
assert.equal(roadTier('footway'),-1);
for(const mini of [false,true]){
 const opts={mini};
 assert(roadVisibleAtZoom('motorway',.035,opts));
 assert(roadVisibleAtZoom('primary',.035,opts));
 assert(!roadVisibleAtZoom('residential',.035,opts),'Overview should not be covered by tiny roads');
 assert(!roadVisibleAtZoom('footway',.2,opts),'Footpaths must not invade regional overview');
 assert(roadVisibleAtZoom('tertiary',mini?.3:.13,opts),'Zoom must reveal local connections');
 assert(roadVisibleAtZoom('residential',mini?.75:.3,opts),'Zoom must reveal residential roads');
 assert(roadVisibleAtZoom('footway',mini?2.3:.7,opts),'High zoom must reveal alleys');
}
const map=new VectorMapDetail({areas:[{k:'land',p:[[36500,-2000],[37000,-2000],[37000,0],[36500,0]]}],
 roads:[
 {k:'motorway',w:10,p:[[0,0],[10,0]]},
 {k:'primary',w:7,p:[[0,1],[10,1]]},
 {k:'tertiary',w:5,p:[[0,2],[10,2]]},
 {k:'residential',w:3,p:[[0,3],[10,3]]},
 {k:'footway',w:2,p:[[0,4],[10,4]]}
]},null);
function draw(scale,mini=false,x=5,z=2){
 const strokes=[];let fills=0,rectFills=0,lines=0;
 const ctx={canvas:{clientWidth:400},lineWidth:1,fillStyle:'',
  strokeStyle:'',save(){},restore(){},setTransform(){},
  fillRect(){rectFills++},beginPath(){},rect(){},clip(){},
  moveTo(){},lineTo(){lines++},closePath(){},
  fill(){fills++},stroke(){strokes.push(this.strokeStyle)},
  fillText(){},strokeText(){},translate(){},rotate(){},
  measureText(){return {width:10}}};
 const result=map.draw(ctx,{x,z},400,300,scale,{pixelRatio:1,mini,labels:false});
 return {strokes,fills,rectFills,lines,result};
}
const broad=draw(.045),town=draw(.28),street=draw(.8);
assert(broad.strokes.includes('#f3f1e8'),'Major routes missing at overview');
assert(!broad.strokes.includes('#97a9a7'),'Overview still contains local white road clutter');
assert(town.strokes.includes('#97a9a7'),'Local roads must appear after zoom');
assert(street.strokes.includes('#a7b5b3'),'Walkable alleys must appear at high zoom');
const sea=draw(.02,false,45000,0);
assert(sea.fills>=1&&sea.lines>=2,'Open lagoon backdrop must be a vector polygon');
assert.equal(sea.rectFills,1,'Never draw a hard-edged rectangle of lagoon water');
const html=source('dist/index.html'),css=source('dist/unified-main.css'),mapSrc=source('dist/unified-map.js');
const villa=source('dist/villa-mandria-v11-estate-polish.js');
assert(html.includes('MAPPA-GTA-R8')&&html.includes('map-diagnostics" hidden'),
 'Hide tester diagnostic UI but retain current version compatibility');
assert(css.includes('.map-diagnostics, #minimapStatus{display:none!important}'));
assert(!villa.includes('COLLAUDO VILLA')&&!villa.includes("e.code==='F8'"),
 'Outdated Villa F8 QA control still injected into gameplay');
assert(mapSrc.includes('w:x1-x+8700'),'Map must show non-playable offshore water east of Venice');
console.log('PASS R9: zoom-revealed GTA arteries, local streets + alleys, vector sea outside playable region, hidden tester labels and removed villa F8 overlay');
