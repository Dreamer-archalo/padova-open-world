import * as THREE from './vendor/three.module.js';
import {coachMaterial} from './car-coachwork.js';

// Fictional collector cars. Metres and m/s, using the ordinary ground controller.
const catalogue=[
 ['ametista','Ametista 01','Coupé a cuneo · viola e ciano','wedge',2.08,4.65,1.22,2.74,72,'#8246cc','#3ce8dd'],
 ['ruggine','Ruggine 32','Hot rod · rame, motore a vista','hotrod',1.91,4.32,1.56,2.72,53,'#bd6435','#ead7aa'],
 ['nebula','Nebula','Canopy panoramico · fucsia e blu notte','canopy',2.16,4.92,1.3,2.89,77,'#e24c9a','#172346'],
 ['zebra','Zebra Safari','Fuoristrada rialzato · bianco e nero','safari',2.23,4.68,2.16,2.8,43,'#e8e5d8','#24272d'],
 ['mandarino','Mandarino R','Rally largo · arancio, fari supplementari','rally',2.12,4.12,1.61,2.48,59,'#f58a21','#f5edda'],
 ['azzurra','Azzurra Barchetta','Spider aperta · turchese e avorio','barchetta',1.88,4.18,1.18,2.53,61,'#32bdb9','#f5e0b4'],
 ['cobalto','Cobalto 6','Pick-up a sei ruote · blu e giallo','sixwheel',2.3,5.95,1.94,3.53,46,'#255ec6','#f0c632'],
 ['limone','Limone Bubble','Microcar ovale · giallo limone','bubble',1.58,2.82,1.63,1.74,34,'#e7ee37','#283140'],
 ['velluto','Velluto 38','Gran turismo rétro · bordeaux e oro','deco',2.05,5.27,1.51,3.21,57,'#782644','#d7af69'],
 ['sale','Sale Surf','Familiare woody · menta, legno e tavola','woody',1.97,4.83,1.77,2.91,45,'#79b9a1','#956239'],
 ['prisma','Prisma E','Elettrica geometrica · pannelli multicolore','prism',2.11,4.59,1.42,2.78,67,'#bfcbd7','#656ad5'],
 ['bruma','Bruma Rat','Rat rod · grigio, ruggine, scarichi esterni','rat',2.01,4.67,1.36,2.95,54,'#6e7977','#a35c3e'],
 ['fiamma','Fiamma Drag','Muso lungo · rosso, compressore e spoiler','drag',2.16,5.56,1.31,3.54,81,'#d93a32','#252730'],
 ['perla','Perla Imperiale','Limousine a sei ruote · perla e ottone','limo',2.17,6.54,1.75,4.27,50,'#ece4d4','#bd914a'],
 ['magnete','Magnete Mono','Monoposto da circuito · lime e carbonio','mono',2.02,4.42,1.09,2.74,75,'#bce43c','#293039']
];
export const COLLECTOR_CARS=Object.fromEntries(catalogue.map(([key,name,description,shape,width,length,height,wheelbase,max,color,accent])=>[
 'collector-'+key,{name,description,shape,width,length,height,wheelbase,max,color,accent,
  family:'collector',collector:true,accel:shape==='safari'||shape==='limo'?8:shape==='bubble'?7:14,
  boost:max*1.12,reverse:8,brake:25,steer:Math.min(1.45,3.35/wheelbase),mass:shape==='limo'?2.1:shape==='bubble'?.6:1.2}
]));
export const COLLECTOR_IDS=Object.freeze(Object.keys(COLLECTOR_CARS));
export const COLLECTOR_CHANCE=.015;
export function rareCollectorStyle(random=Math.random,road=null){
 // One roll for rarity, one independent roll for the model; no first-ID bias.
 if(random()>=COLLECTOR_CHANCE||road&&(/footway|path|steps|cycleway|pedestrian|construction/.test(road.k)||['no','private'].includes(road.access)))return null;
 const eligible=COLLECTOR_IDS.filter(id=>!road||COLLECTOR_CARS[id].width+1.1<=road.w);
 return eligible.length?eligible[Math.min(eligible.length-1,Math.floor(random()*eligible.length))]:null;
}

const cube=new THREE.BoxGeometry(),sphere=new THREE.SphereGeometry(1,12,8),cylinder=new THREE.CylinderGeometry(1,1,1,12),templates=new Map();
const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.47,metalness:.24});
function model(id,finish='standard'){
 const s=COLLECTOR_CARS[id],w=s.width,l=s.length,h=s.height,C=s.color,A=s.accent,
  p=[],n=[],colors=[],paint=[],buckets=[],uv=[],v=new THREE.Vector3(),normal=new THREE.Vector3();
 function geometry(g,color,matrix,paintable=false){
  const col=new THREE.Color(color),nm=new THREE.Matrix3().getNormalMatrix(matrix),indices=g.index?.array;
  for(let j=0;j<(indices?.length||g.attributes.position.count);j++){
   const i=indices?indices[j]:j;v.fromBufferAttribute(g.attributes.position,i).applyMatrix4(matrix);
   normal.fromBufferAttribute(g.attributes.normal,i).applyMatrix3(nm).normalize();
   p.push(v.x,v.y,v.z);n.push(normal.x,normal.y,normal.z);colors.push(col.r,col.g,col.b);paint.push(paintable?1:0);uv.push(g.attributes.uv?.getX(i)||v.x,g.attributes.uv?.getY(i)||v.z);
   buckets.push(paintable?'paint':(/^#(?:26|21|29|33|46|2d|24|3b)/.test(color)||['#fff0ca','#e3f5ed','#ffefd1','#da414d'].includes(color))?'glass':col.r+col.g+col.b>.50?'alloy':'trim');
  }
 }
 function part(g,color,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,paintable=false){
  geometry(g,color,new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(sx,sy,sz)),paintable);
 }
 const box=(c,x,y,z,sx,sy,sz,paintable=false,rx=0,ry=0,rz=0)=>part(cube,c,x,y,z,sx,sy,sz,rx,ry,rz,paintable);
 const round=(c,x,y,z,sx,sy,sz,paintable=false)=>part(sphere,c,x,y,z,sx,sy,sz,0,0,0,paintable);
 function shell(c,sections,paintable=true){
  const vertices=[];
  const ring=([z,w,y,h])=>[[-w*.86,y,z],[w*.86,y,z],[w,y+h*.15,z],[w,y+h*.80,z],[w*.74,y+h,z],[-w*.74,y+h,z],[-w,y+h*.80,z],[-w,y+h*.15,z]];
  for(let i=1;i<sections.length;i++){const a=ring(sections[i-1]),b=ring(sections[i]);for(let j=0;j<8;j++){const k=(j+1)%8;vertices.push(...a[j],...a[k],...b[k],...a[j],...b[k],...b[j]);}if(i===1)for(let j=1;j<7;j++)vertices.push(...a[0],...a[j+1],...a[j]);if(i===sections.length-1)for(let j=1;j<7;j++)vertices.push(...b[0],...b[j],...b[j+1]);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();geometry(g,c,new THREE.Matrix4(),paintable);g.dispose();
 }
 function wheels(radius=.32,axles=[-s.wheelbase/2,s.wheelbase/2],wide=false){
  const alloy=({bronze:'#997743',gold:'#b79b54',white:'#d8dbd5',black:'#343d43',graphite:'#606d76'})[finish]||(s.shape==='deco'||s.shape==='limo'?A:'#aebbc3');
  const torus=new THREE.TorusGeometry(.80,.20,6,18),ring=new THREE.TorusGeometry(radius*.70,.016,4,12);
  for(const z of axles)for(const side of [-1,1]){
   const x=side*w*.425,depth=wide?.28:.20;
   part(torus,'#20272c',x,radius,z,radius,radius,depth/.4,0,Math.PI/2);
   part(cylinder,'#727f86',x,radius,z,radius*.62,depth*.92,radius*.62,0,0,Math.PI/2);
   part(ring,alloy,x+side*depth*.51,radius,z,1,1,1,0,Math.PI/2);
   part(cylinder,alloy,x+side*depth*.53,radius,z,radius*.17,.026,radius*.17,0,0,Math.PI/2);
   for(let i=0;i<7;i++){const a=i*Math.PI*2/7;box(alloy,x+side*depth*.52,radius+Math.cos(a)*radius*.40,z+Math.sin(a)*radius*.40,.022,radius*.55,.024,false,a,0,0);}
  }torus.dispose();ring.dispose();
 }
 function lamps(y=.64,roundLamp=false){
  const body=[];for(let i=0;i<paint.length;i+=3)if(paint[i]&&paint[i+1]&&paint[i+2])body.push(...p.slice(i*3,i*3+9));const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(body,3));const mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(geo,mat),ray=new THREE.Raycaster();mesh.updateMatrixWorld(true);
  const mounted=(x,height,direction)=>{for(let at=height;at>=.34;at-=.025){ray.set(new THREE.Vector3(x,at,direction*l),new THREE.Vector3(0,0,-direction));const hit=ray.intersectObject(mesh,false)[0];if(hit)return [at,hit.point.z+direction*.016];}return [height,direction*l*.46];};
  for(const side of [-1,1]){
   const x=side*w*(roundLamp?.33:.32),[frontY,frontZ]=mounted(x,y,1),[rearY,rearZ]=mounted(side*w*.32,y,-1);
   if(roundLamp)part(cylinder,'#ffefd1',x,frontY,frontZ,.105,.04,.105,Math.PI/2);
   else box('#e3f5ed',x,frontY,frontZ,w*.15,.07,.035);
   box('#da414d',side*w*.32,rearY,rearZ,w*.14,.065,.04);
  }geo.dispose();mat.dispose();
 }
 function cabin(y,roofLength=l*.46,z=-l*.09,open=false){
  shell('#263f50',[[-roofLength*.5+z,w*.37,y,.07],[-roofLength*.31+z,w*.35,y,h-y-.10],[roofLength*.28+z,w*.33,y,h-y-.14],[roofLength*.5+z,w*.35,y,.03]],false);
  if(!open)box(C,0,h-.09,z,w*.66,.12,roofLength*.61,true);
  else{box(A,-w*.21,y+.04,z,.28,.18,.44);box(A,w*.21,y+.04,z,.28,.18,.44);}
 }
 // Wheels, cabin placement, aero and decorative structures differ per model.
 switch(s.shape){
 case 'wedge':
  shell(C,[[-l*.49,w*.4,.30,.46],[-l*.31,w*.48,.28,.5],[l*.34,w*.47,.28,.31],[l*.49,w*.30,.29,.17]]);cabin(.66,l*.5,-l*.10);
  for(const side of [-1,1]){box(A,side*w*.43,.53,-.16,.09,.07,l*.72);box('#17232d',side*w*.40,.63,-l*.24,.22,.13,.47);}
  box(A,0,.82,-l*.41,w*.83,.09,.26);for(const side of [-1,1])box('#414c56',side*w*.26,.72,-l*.41,.045,.20,.09);wheels(.29);lamps(.48);break;
 case 'hotrod':case 'rat':{
  const rat=s.shape==='rat';
  shell(C,[[-l*.46,w*.37,.32,.55],[-l*.28,w*.39,.32,.54],[l*.11,w*.26,.36,.35],[l*.40,w*.22,.36,.29]]);
  box('#293b44',0,h*.74,-l*.18,w*.55,h*.28,l*.24);box(C,0,h-.06,-l*.18,w*.57,.10,l*.25,true);
  box('#78858c',0,.80,l*.21,w*.34,.38,l*.23);
  for(const side of [-1,1]){round(A,side*w*.39,.56,-l*.30,w*.14,.19,l*.18);box(A,side*w*.33,.51,l*.25,.10,.10,l*.43);for(let j=0;j<3;j++)box('#b7bec1',side*w*.30,.90,l*.10+j*.13,.08,.28,.07);}
  if(rat){box(A,0,.67,-l*.39,w*.71,.10,.17);box('#202b30',0,.61,l*.41,w*.40,.46,.08);}
  else box(A,0,.67,l*.41,w*.44,.5,.10);
  wheels(.36);lamps(.82,true);break;
 }
 case 'canopy':
  round(C,0,.52,0,w*.48,.38,l*.48,true);round('#213b52',0,.86,-l*.09,w*.36,.40,l*.31);
  box(A,0,.90,l*.31,.11,.04,l*.24);for(const side of [-1,1])box(A,side*w*.47,.39,0,.05,.075,l*.7);
  box(A,0,.46,-l*.47,w*.80,.07,.17);wheels(.3);lamps(.52);break;
 case 'safari':
  shell(C,[[-l*.47,w*.39,.61,.59],[-l*.40,w*.43,.61,.61],[l*.38,w*.43,.61,.59],[l*.47,w*.35,.67,.46]]);cabin(1.16,l*.55,-.18);
  for(const side of [-1,1]){for(let j=0;j<5;j++)box(A,side*w*.433,1.02,-l*.34+j*l*.16,.04,.62,.18,false,0,0,j%2?.25:-.25);box(A,side*w*.38,h-.20,-.2,.05,.07,l*.48);}
  box(A,0,h-.18,-.2,w*.78,.06,l*.48);box(A,0,.94,l*.49,w*.89,.15,.07);
  for(const side of [-1,1])part(cylinder,'#f8edd3',side*.43,1.15,l*.50,.10,.04,.10,Math.PI/2);
  part(cylinder,A,0,1.27,-l*.485,.36,.16,.36,Math.PI/2);wheels(.46);lamps(.99);break;
 case 'rally':
  shell(C,[[-l*.49,w*.36,.35,.49],[-l*.30,w*.47,.34,.57],[l*.3,w*.46,.35,.51],[l*.49,w*.38,.36,.30]]);cabin(.9,l*.51,-.07);
  for(const side of [-1,1]){box(A,side*w*.43,.55,0,.10,.15,l*.81);round(A,side*w*.442,1.04,-.2,.012,.21,.28);}
  for(const x of [-.46,-.15,.15,.46])part(cylinder,'#fff0ca',x,.86,l*.48,.11,.05,.11,Math.PI/2);
  box('#222b33',0,h-.12,-l*.43,w*.9,.08,.26);for(const side of [-1,1])box('#414c56',side*w*.26,(h-.12+.85)/2,-l*.43,.045,h-.12-.85,.09);wheels(.33);lamps(.75);break;
 case 'barchetta':
  round(C,0,.51,0,w*.48,.33,l*.49,true);box('#252b30',0,.80,-.22,w*.68,.04,l*.43);
  for(const side of [-1,1]){box(A,side*w*.2,.91,-.25,.36,.28,.42);round(C,side*w*.19,.83,-l*.26,w*.2,.19,.52,true);}
  box('#466779',0,1.01,l*.12,w*.65,.31,.035,false,.28);box(A,0,.74,l*.34,.25,.045,l*.21);wheels(.30);lamps(.61,true);break;
 case 'sixwheel':
  shell(C,[[-l*.46,w*.40,.59,.57],[-l*.38,w*.43,.59,.63],[l*.34,w*.43,.59,.58],[l*.46,w*.35,.65,.43]]);box('#334d60',0,1.44,l*.18,w*.70,.56,l*.30);box(C,0,1.80,l*.18,w*.74,.14,l*.3,true);
  box('#253642',0,1.22,-l*.27,w*.67,.06,l*.33);for(const side of [-1,1]){box(C,side*w*.4,1.35,-l*.24,.11,.49,l*.43,true);box(A,side*w*.425,1.12,0,.02,.11,l*.84);}
  box(A,0,1.12,l*.46,w*.72,.20,.05);wheels(.40,[-l*.31,-l*.10,l*.30],true);lamps(1.21);break;
 case 'bubble':
  round(C,0,.75,-.06,w*.48,.74,l*.48,true);round('#2d4654',0,1.08,.03,w*.39,.43,l*.32);
  round(C,0,h-.08,-.04,w*.40,.10,l*.3,true);box(A,0,.69,l*.46,w*.6,.06,.05);wheels(.27);lamps(.83,true);break;
 case 'deco':
  round(C,0,.67,-.05,w*.38,.40,l*.49,true);cabin(.95,l*.39,-l*.10);
  for(const side of [-1,1]){round(C,side*w*.34,.56,0,w*.16,.29,l*.47,true);box(A,side*w*.44,.64,0,.035,.035,l*.75);box(A,side*w*.23,.90,l*.34,.035,.04,l*.21);}
  box(A,0,.85,l*.48,w*.27,.56,.07);wheels(.34);lamps(.9,true);break;
 case 'woody':
  shell(C,[[-l*.47,w*.40,.44,.51],[-l*.39,w*.44,.44,.55],[l*.32,w*.44,.44,.52],[l*.47,w*.33,.49,.42]]);cabin(.94,l*.63,-.23);
  for(const side of [-1,1]){box(A,side*w*.45,.84,-.35,.028,.30,l*.72);for(let j=0;j<4;j++)box('#d4aa73',side*w*.468,.84,-l*.35+j*l*.20,.018,.3,.035);}
  round('#edd6a2',0,h-.05,-.08,.27,.07,l*.34);box('#d0764c',0,h-.002,-.08,.045,.015,l*.58);wheels(.32);lamps(.70,true);break;
 case 'prism':
  shell(C,[[-l*.49,w*.40,.34,.52],[-l*.34,w*.47,.32,.57],[l*.22,w*.45,.32,.40],[l*.49,w*.32,.32,.19]]);cabin(.79,l*.57,-.05);
  for(const [j,col] of ['#54c9c3','#e389c6','#eac858','#7188e3'].entries())for(const side of [-1,1])box(col,side*w*.445,.62,-l*.33+j*l*.20,.025,.27,l*.17);
  box('#aaf7ef',0,.61,l*.48,w*.66,.05,.03);wheels(.31);lamps(.55);break;
 case 'drag':
  shell(C,[[-l*.49,w*.44,.29,.46],[-l*.18,w*.47,.29,.51],[l*.36,w*.35,.31,.34],[l*.49,w*.25,.32,.20]]);cabin(.77,l*.30,-l*.22);
  box('#a5b4bc',0,.85,l*.21,.53,.47,.70);box('#202a30',0,1.10,l*.22,.61,.12,.35);box(A,0,.66,l*.39,.35,.04,l*.19);
  for(const side of [-1,1])box('#35424a',side*w*.36,.86,-l*.39,.07,.35,.09);box(A,0,1.07,-l*.43,w*.95,.10,.29);
  wheels(.34,[-s.wheelbase/2,s.wheelbase/2],true);lamps(.52);break;
 case 'limo':
  shell(C,[[-l*.475,w*.39,.41,.55],[-l*.40,w*.44,.41,.62],[l*.36,w*.44,.41,.57],[l*.475,w*.34,.47,.42]]);cabin(1.03,l*.67,-.18);
  for(const side of [-1,1]){box(A,side*w*.447,.79,0,.02,.065,l*.85);for(const z of [-l*.27,-l*.05,l*.16])box(C,side*w*.365,1.37,z,.06,.45,.09,true);}
  box(A,0,.86,l*.48,w*.55,.32,.06);wheels(.33,[-l*.33,-l*.13,l*.32]);lamps(.83);break;
 case 'mono':
  shell(C,[[-l*.43,w*.22,.22,.44],[-l*.18,w*.29,.22,.46],[l*.21,w*.16,.24,.32],[l*.49,w*.07,.24,.10]]);
  round('#24394a',0,.78,-.28,.28,.23,.55);for(const side of [-1,1]){box(A,side*w*.28,.47,-.10,w*.22,.29,l*.43);box('#48555c',side*w*.30,.29,0,w*.55,.065,l*.65);}
  box(C,0,.33,l*.38,w*.92,.065,.39,true);box(C,0,.86,-l*.39,w*.88,.08,.30,true);wheels(.31,[-s.wheelbase/2,s.wheelbase/2],true);lamps(.39);break;
 }
 const geometryOut=new THREE.BufferGeometry();geometryOut.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometryOut.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));geometryOut.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometryOut.setAttribute('collectorPaint',new THREE.Float32BufferAttribute(paint,1));
 geometryOut.computeBoundingBox();
 // Declared physics bounds enclose every lamp, spoiler and wheel.
 const b=geometryOut.boundingBox,size=b.getSize(new THREE.Vector3());
 geometryOut.translate(-(b.min.x+b.max.x)*.5,-b.min.y,-(b.min.z+b.max.z)*.5);
 geometryOut.scale(Math.min(1,w/size.x),Math.min(1,h/size.y),Math.min(1,l/size.z));geometryOut.computeBoundingBox();geometryOut.computeBoundingSphere();
 const root=new THREE.Group(),positions=geometryOut.attributes.position.array,normals=geometryOut.attributes.normal.array;
 for(const kind of ['paint','glass','alloy','trim']){
  const data={position:[],normal:[],color:[],collectorPaint:[],uv:[]};
  for(let i=0;i<buckets.length;i++)if(buckets[i]===kind){data.position.push(...positions.slice(i*3,i*3+3));data.normal.push(...normals.slice(i*3,i*3+3));data.color.push(...colors.slice(i*3,i*3+3));data.collectorPaint.push(paint[i]);data.uv.push(...uv.slice(i*2,i*2+2));}
  if(!data.position.length)continue;
  const geo=new THREE.BufferGeometry();for(const [key,array] of Object.entries(data))geo.setAttribute(key,new THREE.Float32BufferAttribute(array,key==='collectorPaint'?1:key==='uv'?2:3));
  const mat=coachMaterial(kind,'#ffffff').clone();mat.vertexColors=true;const mesh=new THREE.Mesh(geo,mat);mesh.name='coachwork-'+kind;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
 }geometryOut.dispose();
 root.name=s.name;root.userData={collectorCar:id,signatureColor:C,modelRevision:36,roadFinish:{wheels:finish},wheelCount:['limo','sixwheel'].includes(s.shape)?6:4};return root;
}
export function createCollectorCar(id,color=null,finish='standard'){
 if(!COLLECTOR_CARS[id])throw new Error('Unknown collector car: '+id);
 const key=id+'/'+finish;if(!templates.has(key))templates.set(key,model(id,finish));const root=templates.get(key).clone(true);
 if(color){const paint=new THREE.Color(color);root.traverse(o=>{if(!o.isMesh)return;const mask=o.geometry.attributes.collectorPaint;if(!mask?.array.some(v=>v))return;o.geometry=o.geometry.clone();const a=o.geometry.attributes.color;for(let i=0;i<mask.count;i++)if(mask.getX(i))a.setXYZ(i,paint.r,paint.g,paint.b);});}
 return root;
}
