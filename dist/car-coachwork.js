import * as THREE from './vendor/three.module.js';

// Hand-authored body proportions: bonnet / rear glass / roof / windscreen,
// belt height, nose height, body crown, shoulder roundness and lamp identity.
// Coordinates are relative to each existing physical footprint; +Z is forward.
export const COACHWORK={
 nido:[-.45,-.29,.07,.27,.82,.64,.08,.10,'round'],
 tessera:[-.46,-.36,.13,.33,.87,.76,.04,.07,'blade'],
 goccia:[-.45,-.25,.09,.30,.84,.63,.13,.14,'round'],
 rondine:[-.44,-.30,.02,.25,.82,.67,.06,.07,'swept'],
 botanica:[-.45,-.27,.06,.31,.81,.61,.07,.10,'blade'],
 cortile:[-.44,-.32,-.02,.25,.80,.69,.04,.06,'swept'],
 porto:[-.31,-.20,.08,.24,.84,.80,.025,.035,'round'],
 ambra:[-.34,-.24,.00,.19,.79,.66,.11,.12,'round'],
 argine:[-.33,-.21,.08,.25,.86,.75,.04,.06,'split'],
 meridiana:[-.39,-.24,.04,.30,.80,.61,.07,.11,'blade'],
 linea:[-.43,-.21,.03,.28,.78,.63,.07,.08,'blade'],
 viaggio:[-.46,-.37,.06,.25,.87,.75,.03,.055,'split'],
 familia:[-.47,-.39,.09,.28,.94,.78,.04,.07,'split'],
 brina:[-.45,-.34,-.02,.24,.82,.66,.06,.08,'swept'],
 selva:[-.44,-.31,.06,.29,1.02,.84,.05,.10,'split'],
 altavia:[-.45,-.37,.12,.30,1.10,1.00,.025,.04,'split'],
 roccia:[-.43,-.24,.04,.30,.99,.79,.09,.10,'blade'],
 officina:[-.48,-.43,.29,.43,1.06,.91,.045,.07,'split'],
 corriere:[-.48,-.43,.31,.44,1.09,.96,.03,.055,'split'],
 comitiva:[-.46,-.36,.16,.38,.92,.70,.08,.11,'swept'],
 campo:[-.05,.04,.22,.34,1.02,.90,.035,.065,'split'],
 saetta:[-.33,-.23,-.03,.20,.72,.57,.065,.065,'round'],
 vortice:[-.38,-.25,-.04,.23,.74,.55,.10,.12,'swept'],
 fulmine:[-.30,-.19,.06,.30,.63,.43,.035,.045,'blade'],
 zenit:[-.36,-.24,.01,.28,.67,.46,.07,.085,'blade'],
 doge:[-.34,-.22,.10,.26,.84,.78,.025,.045,'split'],
 aurora:[-.40,-.29,.13,.29,.90,.82,.035,.06,'round'],
 sestante:[-.36,-.23,.04,.25,.81,.66,.08,.10,'swept'],
 lido:[-.31,-.20,.03,.22,.72,.59,.09,.11,'round'],
 targa:[-.34,-.24,.04,.23,.69,.54,.07,.085,'swept']
};
COACHWORK.mito=[-.44,-.30,.055,.27,.84,.66,.065,.08,'round'];
COACHWORK.cinquecento=[-.43,-.29,.10,.32,.89,.73,.10,.12,'round'];
const cube=new THREE.BoxGeometry(),disk=new THREE.CylinderGeometry(1,1,1,16),tyre=new THREE.TorusGeometry(.78,.22,6,18);
const chrome='#bec6ca',black='#202529',glass='#263f4b';
const mats=new Map(),geometryCache=new Map();
function grainTexture(){
 const size=64,data=new Uint8Array(size*size*4);let n=317;
 for(let i=0;i<size*size;i++){n=(Math.imul(n,1664525)+1013904223)>>>0;const v=242+(n%14);data.set([v,v,v,255],i*4);}
 const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.needsUpdate=true;t.colorSpace=THREE.SRGBColorSpace;return t;
}
const paintGrain=grainTexture();
export function coachMaterial(kind,color){
 const key=kind+'/'+color;if(!mats.has(key)){
  const p=kind==='paint'?{roughness:.31,metalness:.42,map:paintGrain}:kind==='glass'?{roughness:.19,metalness:.42}:kind==='alloy'?{roughness:.27,metalness:.78}:{roughness:.82,metalness:.03};
  const m=new THREE.MeshStandardMaterial({color,...p});m.userData.coachBucket=kind;mats.set(key,m);
 }return mats.get(key);
}
function mesh(g,geo,kind,color,x,y,z,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geo,coachMaterial(kind,color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.userData.coachPaint=kind==='paint';m.castShadow=m.receiveShadow=true;g.add(m);return m;}
function box(g,kind,c,x,y,z,w,h,d){return mesh(g,cube,kind,c,x,y,z,w,h,d);}
function polygon(g,kind,c,vertices){const a=[];for(let i=1;i<vertices.length-1;i++)a.push(...vertices[0],...vertices[i],...vertices[i+1]);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(a,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(a.flatMap((_,i)=>i%3===0?[a[i],a[i+2]]:[]),2));geo.computeVertexNormals();geo.userData.coachTransient=true;const o=mesh(g,geo,kind,c,0,0,0);return o;}
function insetFace(g,kind,c,points,factor=.87){const center=points.reduce((v,p)=>v.map((n,i)=>n+p[i]/points.length),[0,0,0]);polygon(g,kind,c,points.map(p=>p.map((v,i)=>center[i]+(v-center[i])*factor)));}
const mix=(a,b,t)=>a+(b-a)*t;
function sample(points,t){let i=1;while(i<points.length-1&&t>points[i][0])i++;const a=points[i-1],b=points[i],u=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0])));return mix(a[1],b[1],u);}
function radius(s){return ['suv','pickup'].includes(s.family)?.37:['van','mpv'].includes(s.family)?.35:['sport','supercar','convertible'].includes(s.family)?.29:.31;}
function bodyGeometry(type,s,p){
 const key='body/'+type;if(geometryCache.has(key))return geometryCache.get(key);
 const w=s.width,l=s.length,r=radius(s),belt=p[4],nose=p[5],round=p[7];
 const outline=[[-.5,.77],[-.44,.90],[-.30,1],[-.07,.99],[.23,.98],[.39,.91],[.5,.71]],tops=[[-.5,belt-.12],[-.39,belt],[-.20,belt+.025],[.15,belt+.02],[.32,belt-.025],[.5,nose]];
 const ts=new Set(Array.from({length:25},(_,i)=>i/24-.5));
 for(const z of [-s.wheelbase/2,s.wheelbase/2])for(let i=0;i<=10;i++){const a=Math.PI*i/10;ts.add((z+Math.cos(a)*(r+.055))/l);}
 const list=[...ts].filter(t=>t>=-.5&&t<=.5).sort((a,b)=>a-b),pos=[],uv=[],index=[];
 for(const t of list){
  const half=w*.47*sample(outline,t),top=sample(tops,t),bottom=.22;
  let low=bottom;for(const z of [-s.wheelbase/2,s.wheelbase/2]){const d=t*l-z,R=r+.048;if(Math.abs(d)<R)low=Math.max(low,Math.min(top-.075,r+Math.sqrt(R*R-d*d)));}
  const ring=[[0,top+p[6]],[half*(1-round*1.4),top+.015],[half,top-.07],[half,Math.max(low,top-.24)],[half*.99,low],[half*.71,bottom],[0,bottom],[-half*.71,bottom],[-half*.99,low],[-half,Math.max(low,top-.24)],[-half,top-.07],[-half*(1-round*1.4),top+.015]];
  for(const [x,y] of ring){pos.push(x,y,t*l);uv.push(x/w+.5,t+.5);}
 }
 // Ring order is clockwise as seen from +Z. Adjacent strips face outwards.
 for(let i=1;i<list.length;i++)for(let j=0;j<12;j++){const a=(i-1)*12+j,b=(i-1)*12+(j+1)%12,c=i*12+j,d=i*12+(j+1)%12;index.push(a,c,d,a,d,b);}
 for(let j=1;j<11;j++){index.push(0,j,j+1);const b=(list.length-1)*12;index.push(b,b+j+1,b+j);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(index);geo.computeVertexNormals();geometryCache.set(key,geo);return geo;
}
export const ROAD_PALETTE=['#ece9df','#bdc4c8','#535c67','#233744','#242829','#944237','#375e57','#587b8d','#c9b58f','#a67a41','#67776b','#733d50'];
export const WHEEL_COLOURS={standard:chrome,silver:chrome,black:'#343941',bronze:'#b1905d',white:'#e1dfd2',graphite:'#737b87',gold:'#c4a65f'};
export function chooseRoadFinish(spec,random=Math.random){
 const n=random(),sport=['sport','supercar','convertible'].includes(spec.family),classic=spec.family==='classic',commercial=['van','freight','work'].includes(spec.family);
 const wheels=n<.70?'standard':n<.92?'graphite':n<.975?'black':n<.994?'bronze':n<.998?'white':'gold';
 const l=random(),livery=commercial?'plain':l<.91?'plain':l<.967&&['city','compact','classic','luxury'].includes(spec.family)?'two-tone':l<.99&&sport?'coach-stripe':l>=.99&&sport?'twin-stripe':'plain';
 return {wheels,livery,roof:livery==='two-tone'?(classic?'#e9dfc9':'#232c32'):null,rare:wheels==='bronze'||wheels==='white'||wheels==='gold'||livery==='twin-stripe'};
}
function normalFinish(s,finish){const f=typeof finish==='string'?{wheels:finish}:finish||{};return {wheels:f.wheels||'standard',livery:f.livery||'plain',roof:f.roof||null};}
function detailedWheel(g,x,z,r,finish,family,variant){
 const side=Math.sign(x),kind=finish.wheels,c=WHEEL_COLOURS[kind]||chrome,style=kind==='gold'||kind==='white'?10:kind==='bronze'?6:family==='classic'?12:family==='van'?8:5+(variant%2);
 const t=mesh(g,tyre,'trim','#171b1e',x,r,z,r,r,r);t.rotation.y=Math.PI/2;
 const face=x+side*r*.19;
 const barrel=mesh(g,disk,'alloy',c,face,r,z,r*.67,.035,r*.67);barrel.rotation.z=Math.PI/2;
 const recess=mesh(g,disk,'trim',black,face+side*.021,r,z,r*.54,.038,r*.54);recess.rotation.z=Math.PI/2;
 for(let j=0;j<style;j++){const a=j*Math.PI*2/style,o=box(g,'alloy',c,face+side*.048,r+Math.cos(a)*r*.33,z+Math.sin(a)*r*.33,.025,r*.61,r*(style>8?.06:.11));o.rotation.x=a;}
 const hub=mesh(g,disk,'alloy',c,face+side*.065,r,z,r*.19,.022,r*.19);hub.rotation.z=Math.PI/2;
 // Shallow tread ribs are geometry, so they survive vertex batching and mipmapping.
 for(let j=0;j<12;j++){const a=j*Math.PI*2/12,o=box(g,'trim','#252a2c',x,r+Math.cos(a)*r*.994,z+Math.sin(a)*r*.994,r*.22,.007,r*.035);o.rotation.x=a;}
}
function cabin(g,s,p,paint,finish){
 const w=s.width,l=s.length,h=s.height,b=p[4],open=s.family==='convertible';
 const points=[[p[0],b+.02,w*.405],[p[1],h-.065,w*.345],[p[2],h-.075,w*.343],[p[3],b+.035,w*.397]];
 if(open){
  box(g,'trim','#283033',0,b-.045,-.15,w*.67,.07,l*.23);
  for(const side of [-1,1]){box(g,'trim','#a28b6d',side*w*.20,b+.15,-.15,w*.23,.35,.16);box(g,'trim','#a28b6d',side*w*.20,b+.015,.00,w*.23,.10,.35);}
 }else{
  const a=points[1],c=points[2];polygon(g,finish.roof?'trim':'paint',finish.roof||paint,[[-a[2],a[1],a[0]*l],[-c[2],c[1],c[0]*l],[c[2],c[1],c[0]*l],[a[2],a[1],a[0]*l]]);
  for(const side of [-1,1])for(let i=0;i<3;i++){
   const a=points[i],c=points[i+1],face=[[side*a[2],a[1],a[0]*l],[side*c[2],c[1],c[0]*l],[side*w*.418,b,a[0]*l+(c[0]-a[0])*l],[side*w*.418,b,a[0]*l]];
   if(side<0)face.reverse();polygon(g,'paint',paint,face);insetFace(g,'glass',glass,face.map(v=>[v[0]+side*.004,v[1]+.002,v[2]]),.86);
  }
  // B/C pillars give long passenger cabins separate, correctly sized windows.
  const start=p[1]*l,end=p[2]*l,count=['wagon','mpv','suv'].includes(s.family)?2:1;
  for(const side of [-1,1])for(let i=1;i<=count;i++){const z=mix(start,end,i/(count+1));box(g,'trim',black,side*w*.414,(b+h-.075)/2,z,.012,h-b-.075,.043);}
  const ra=points[0],rc=points[1];insetFace(g,'glass',glass,[[-ra[2],ra[1]+.005,ra[0]*l],[-rc[2],rc[1]+.005,rc[0]*l],[rc[2],rc[1]+.005,rc[0]*l],[ra[2],ra[1]+.005,ra[0]*l]],.90);
 }
 const a=points[2],c=points[3],wind=[[-a[2],a[1],a[0]*l],[-c[2],c[1],c[0]*l],[c[2],c[1],c[0]*l],[a[2],a[1],a[0]*l]];
 polygon(g,'paint',paint,wind);insetFace(g,'glass',glass,wind.map(v=>[v[0],v[1]+.007,v[2]+.008]),.9);
 if(open&&s.name.includes('Targa')){box(g,'alloy',chrome,0,h-.07,p[1]*l,w*.72,.065,.10);for(const side of [-1,1])box(g,'alloy',chrome,side*w*.35,(b+h)/2,p[1]*l,.045,h-b,.06);}
}
function lampsAndTrim(g,s,p,paint,finish){
 const w=s.width,l=s.length,b=p[4],front=p[5],classic=s.family==='classic',low=['sport','supercar','convertible'].includes(s.family),lamp=p[8],r=radius(s);
 const noseZ=l*.492,noseWidth=w*.36;
 box(g,'trim',black,0,front-.17,noseZ,noseWidth,.12,.032);
 if(classic||s.family==='luxury')for(let i=-2;i<=2;i++)box(g,'alloy',chrome,i*w*.065,front-.15,noseZ+.019,.022,.14,.02);
 for(const side of [-1,1]){
  const x=side*w*.255,y=front-.035;
  if(lamp==='round'){
   const bezel=mesh(g,disk,'alloy',chrome,x,y,noseZ,.10,.032,.10);bezel.rotation.x=Math.PI/2;
   const light=mesh(g,disk,'glass','#eee9d5',x,y,noseZ+.022,.079,.020,.079);light.rotation.x=Math.PI/2;
  }else{
   box(g,'trim',black,x,y,noseZ,w*.20,.12,.035);
   box(g,'glass','#e4edef',x,y+.018,noseZ+.022,w*(lamp==='blade'?.19:.15),lamp==='blade'?.026:.052,.02);
   if(lamp==='split')box(g,'glass','#eee7d3',x,y-.041,noseZ+.025,w*.16,.025,.018);
  }
  box(g,'trim',black,side*w*.27,b-.08,-l*.493,w*.19,.105,.04);
  box(g,'glass','#a73130',side*w*.27,b-.066,-l*.499,w*.17,.038,.025);
  box(g,'glass','#d66b42',side*w*.27,b-.097,-l*.501,w*.065,.023,.025);
  const mirror=box(g,'paint',paint,side*w*.475,b+.22,p[3]*l-.13,.10,.075,.16);mirror.rotation.y=side*.12;
  box(g,'glass',glass,side*w*.478,b+.224,p[3]*l-.205,.082,.044,.014);
  // Handles and panel seams follow the actual side, below the shoulder.
  const doors=['sport','supercar','convertible','classic','city'].includes(s.family)?1:2;
  for(let i=0;i<doors;i++){const z=mix(p[1]*l,p[3]*l,(i+.5)/doors);box(g,'alloy',classic?chrome:'#858e91',side*w*.465,b-.11,z,.015,.025,.125);}
  if(['suv','pickup'].includes(s.family))for(const z of [-s.wheelbase/2,s.wheelbase/2]){const arch=mesh(g,new THREE.TorusGeometry(r+.055,.025,4,16,Math.PI),'trim',black,side*w*.465,r,z);arch.rotation.y=Math.PI/2;}
  if(['wagon','suv'].includes(s.family)){box(g,'alloy','#899499',side*w*.30,s.height+.009,-l*.07,.026,.032,l*(s.family==='wagon'?.50:.43));}
  if(low){box(g,'trim',black,side*w*.335,.31,-l*.482,w*.115,.06,.045);}
 }
 // License plate backing, bumper insert and realistic lower rocker line.
 for(const side of [-1,1])box(g,'trim','#30373b',side*w*.449,.30,-.01,.025,.043,l*.71);
 box(g,'trim','#d7dace',0,b-.23,-l*.501,.30,.072,.016);box(g,'glass','#4c638e',-.134,b-.23,-l*.512,.025,.065,.007);
 if(finish.livery==='coach-stripe')for(const side of [-1,1])box(g,'alloy','#c5c2ac',side*w*.467,b-.185,0,.01,.022,l*.67);
 if(finish.livery==='twin-stripe')for(const side of [-1,1]){
  // Stripes sit on the authored bonnet surface, with a matching slope.
  const rear=p[3]*l,start=Math.max(rear,.28*l),end=.44*l,z=(start+end)/2,y=mix(b,front,(z/l-.32)/.18)+p[6]+.018;
  const o=box(g,'trim',paint==='#ece9df'?'#29353d':'#e4dcc5',side*w*.085,y,z,w*.055,.006,end-start);o.rotation.x=Math.atan2(b-front,l*.18);
 }
}
export function createCoachwork(type,s,paint='#738493',requested=null){
 const p=COACHWORK[type]||COACHWORK[{ 'legacy-sedan':'argine','legacy-compact':'rondine','legacy-wagon':'viaggio','legacy-utility':'altavia','legacy-sport':'vortice'}[type]]||COACHWORK.argine,finish=normalFinish(s,requested),g=new THREE.Group();
 mesh(g,bodyGeometry(type,s,p),'paint',paint,0,0,0);cabin(g,s,p,paint,finish);
 if(s.family==='van'){
  const bottom=p[4],rear=-s.length*.47,front=s.length*.25;
  box(g,'paint',paint,0,(bottom+s.height-.08)/2,(rear+front)/2,s.width*.88,s.height-bottom-.08,front-rear);
  box(g,'trim','#343c3f',0,(bottom+s.height-.08)/2,rear-.005,.014,s.height-bottom-.14,.015);
  for(const side of [-1,1]){box(g,'trim','#59656c',side*s.width*.444,(bottom+s.height)/2,-s.length*.12,.006,.013,s.length*.50);box(g,'alloy','#899399',side*s.width*.449,bottom+.10,-s.length*.28,.012,.029,.13);}
 }
 if(s.family==='pickup'){
  box(g,'trim','#303b3c',0,p[4]-.06,-s.length*.285,s.width*.72,.025,s.length*.30);
  for(const side of [-1,1])box(g,'paint',paint,side*s.width*.41,p[4]+.08,-s.length*.28,.08,.23,s.length*.33);
  box(g,'paint',paint,0,p[4]+.08,-s.length*.45,s.width*.85,.23,.075);
 }
 for(const side of [-1,1])for(const z of [-s.wheelbase/2,s.wheelbase/2])detailedWheel(g,side*s.width*.428,z,radius(s),finish,s.family,s.variant||0);
 lampsAndTrim(g,s,p,paint,finish);g.userData={vehicleType:type,modelRevision:35,roadFinish:finish};return g;
}

// Preserve the four surface classes, UVs, authored vertex colour and the paint mask.
// Shared materials/textures + cached traffic templates keep the draw budget bounded.
const batchMaterials=new Map();
export function compactCoachwork(group){
 const buckets=new Map(),remove=[],v=new THREE.Vector3(),n=new THREE.Vector3();group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert();
 group.traverse(o=>{
  if(!o.isMesh||o.material.transparent)return;const geo=o.geometry,kind=o.material.userData.coachBucket||'trim';
  if(!buckets.has(kind))buckets.set(kind,{p:[],n:[],c:[],uv:[],mask:[]});const a=buckets.get(kind),m=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld),nm=new THREE.Matrix3().getNormalMatrix(m),ix=geo.index?.array,p=geo.attributes.position,normal=geo.attributes.normal,col=geo.attributes.color,mask=geo.attributes.collectorPaint;
  for(let j=0;j<(ix?.length||p.count);j++){
   const i=ix?ix[j]:j;v.fromBufferAttribute(p,i).applyMatrix4(m);n.fromBufferAttribute(normal,i).applyMatrix3(nm).normalize();a.p.push(v.x,v.y,v.z);a.n.push(n.x,n.y,n.z);
   a.c.push(col?col.getX(i):o.material.color.r,col?col.getY(i):o.material.color.g,col?col.getZ(i):o.material.color.b);a.uv.push(geo.attributes.uv?.getX(i)||0,geo.attributes.uv?.getY(i)||0);a.mask.push(mask?mask.getX(i):kind==='paint'?1:0);
  }remove.push(o);
 });
 for(const o of remove){o.parent?.remove(o);if(o.geometry.userData.coachTransient)o.geometry.dispose();}
 for(const [kind,a] of buckets){
  const geo=new THREE.BufferGeometry();for(const [key,data,size] of [['position',a.p,3],['normal',a.n,3],['color',a.c,3],['uv',a.uv,2],['collectorPaint',a.mask,1]])geo.setAttribute(key,new THREE.Float32BufferAttribute(data,size));
  if(!batchMaterials.has(kind)){const m=coachMaterial(kind,'#ffffff').clone();m.vertexColors=true;batchMaterials.set(kind,m);}const out=new THREE.Mesh(geo,batchMaterials.get(kind));out.castShadow=out.receiveShadow=true;out.name='coachwork-'+kind;group.add(out);
 }
 return group;
}

const lodCache=new WeakMap();
export function coachworkLOD(root){
 const first=root.children.find(o=>o.isMesh)?.geometry;if(first&&lodCache.has(first))return lodCache.get(first).clone();
 const p=[],c=[];root.updateMatrixWorld(true);const inv=root.matrixWorld.clone().invert(),v=new THREE.Vector3();
 root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,ix=g.index?.array,m=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);for(let j=0;j<(ix?.length||g.attributes.position.count);j++){const i=ix?ix[j]:j;v.fromBufferAttribute(g.attributes.position,i).applyMatrix4(m);p.push(v.x,v.y,v.z);const col=g.attributes.color;c.push(col?col.getX(i):o.material.color.r,col?col.getY(i):o.material.color.g,col?col.getZ(i):o.material.color.b);}});
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(c,3));
 const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true}));mesh.userData.sharedRenderProxy=true;if(first)lodCache.set(first,mesh);return mesh.clone();
}
