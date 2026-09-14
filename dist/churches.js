import * as THREE from './vendor/three.module.js';
import {box,bake} from './landmarks.js';

const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/\s+/g,' ').trim();
const majorAlias={
 santo:['basilica di santantonio','basilica del santo','santantonio di padova'],
 giustina:['santa giustina','basilica di santa giustina'],
 duomo:['duomo di padova','basilica cattedrale','cattedrale di santa maria assunta','cattedrale di padova']
};
export const CHURCH_TARGETS=[
 ['eremitani','Chiesa degli Eremitani'],['santa sofia','Santa Sofia'],['san francesco','San Francesco Grande'],['carmine','Basilica del Carmine'],['servi','Santa Maria dei Servi'],['san gaetano','San Gaetano'],['san nicolo','San Nicolò'],['san canziano','San Canziano'],['san clemente','San Clemente'],['santandrea','Sant’Andrea'],['san benedetto','San Benedetto'],['santa croce','Santa Croce'],['san daniele','San Daniele'],['san tomaso','San Tomaso Becket'],['torresino','Torresino'],['ognissanti','Ognissanti'],['immacolata','Immacolata'],['san massimo','San Massimo'],['san leopoldo','San Leopoldo Mandić'],['san prosdocimo','San Prosdocimo'],['santa lucia','Santa Lucia'],['san luca','San Luca'],['santuario dellarcella','Santuario dell’Arcella'],['santantonio da padova allarcella','Santuario dell’Arcella'],['san carlo','San Carlo'],['san bellino','San Bellino'],['santissima trinita','Santissima Trinità'],['san filippo neri','San Filippo Neri'],['buon pastore','Buon Pastore'],['san gregorio barbarigo','San Gregorio Barbarigo'],['san lorenzo da brindisi','San Lorenzo da Brindisi'],['sacro cuore','Sacro Cuore'],['santi fabiano e sebastiano','Brusegana · Santi Fabiano e Sebastiano'],['san giuseppe','San Giuseppe'],['sacra famiglia','Sacra Famiglia'],['madonna pellegrina','Madonna Pellegrina'],['cuore immacolato di maria','Madonna Pellegrina'],['santa rita da cascia','Santa Rita'],['san camillo de lellis','Forcellini · San Camillo'],['san camillo','Forcellini · San Camillo'],['spirito santo','Forcellini · Spirito Santo'],['cristo re','Cristo Re'],['san paolo','San Paolo'],['san gregorio magno','San Gregorio Magno']
];
const targetMap=new Map(CHURCH_TARGETS.map(([a,label])=>[norm(a),label]));
const excluded=/scuola|istituto|ospedale|casa|centro|collegio|via |piazza /;
const explicit=/basilica|duomo|cattedrale|chiesa|santuario|abbazia|parrocch|eremitani|carmine|servi|torresino|ognissanti/;
const knownName=n=>[...targetMap.keys()].find(a=>n.includes(a));

const mats=new Map();
function mat(c){if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.9}));return mats.get(c);}
function mesh(g,geo,c,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
function cylinder(g,c,x,y,z,r,h,sides=16){return mesh(g,new THREE.CylinderGeometry(r,r,h,sides),c,x,y,z);}
function sphere(g,c,x,y,z,rx,ry,rz){const m=mesh(g,new THREE.SphereGeometry(1,16,10),c,x,y,z);m.scale.set(rx,ry,rz);return m;}
function cone(g,c,x,y,z,r,h,sides=8){return mesh(g,new THREE.ConeGeometry(r,h,sides),c,x,y,z);}
function cross(g,x,y,z,scale=1,c='#5e5b50'){box(g,c,x,y,z,.18*scale,1.65*scale,.18*scale);box(g,c,x,y+.35*scale,z,.95*scale,.16*scale,.18*scale);}
function rose(g,x,y,z,r){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.15,8,24),mat('#d8cab0'));ring.position.set(x,y,z);ring.rotation.x=Math.PI/2;g.add(ring);const glass=mesh(g,new THREE.CircleGeometry(r*.78,24),'#425c62',x,y,z+.02);return glass;}
function gable(g,w,l,y,rise,color='#965f49'){
 const p=[-w/2,y,l/2,w/2,y,l/2,0,y+rise,l/2,-w/2,y,-l/2,0,y+rise,-l/2,w/2,y,-l/2,
 -w/2,y,l/2,0,y+rise,l/2,0,y+rise,-l/2,-w/2,y,l/2,0,y+rise,-l/2,-w/2,y,-l/2,
 0,y+rise,l/2,w/2,y,l/2,w/2,y,-l/2,0,y+rise,l/2,w/2,y,-l/2,0,y+rise,-l/2];
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.computeVertexNormals();return mesh(g,geo,color);
}
function bellTower(g,x,z,h=27,w=5,color='#aa7357',spire=false){box(g,color,x,h/2,z,w,h,w);box(g,'#d7c5a3',x,h*.72,z,w+.45,.42,w+.45);for(const [dx,dz,rot] of [[0,w/2+.02,0],[0,-w/2-.02,Math.PI],[w/2+.02,0,Math.PI/2],[-w/2-.02,0,-Math.PI/2]]){const a=box(g,'#34484a',x+dx,h-5,z+dz,w*.34,3.7,.08);a.rotation.y=rot;}if(spire)cone(g,'#747b72',x,h+4,z,w*.72,8,8);else{box(g,'#c6ad85',x,h+.35,z,w+.8,.7,w+.8);cross(g,x,h+2,z,.75);}}
function dome(g,x,z,r,y=11,color='#8eaaa0'){cylinder(g,'#c8b48d',x,y,z,r*.83,2.2,16);sphere(g,color,x,y+r*.46,z,r,r*.7,r);cylinder(g,'#d9c9a8',x,y+r*.92,z,r*.16,2.2,12);cone(g,'#7d8278',x,y+r*1.35,z,r*.2,1.8,8);cross(g,x,y+r*1.7,z,.55);}
function frame(b){
 const pts=b.p||[];let best=[0,1],bestD=0;for(let i=0;i<pts.length;i++){const a=pts[i],q=pts[(i+1)%pts.length],d=Math.hypot(q[0]-a[0],q[1]-a[1]);if(d>bestD){bestD=d;best=[i,(i+1)%pts.length];}}
 const a=pts[best[0]]||[b.minX,b.minZ],q=pts[best[1]]||[b.maxX,b.maxZ],yaw=Math.atan2(q[0]-a[0],q[1]-a[1]),sx=Math.sin(yaw),sz=Math.cos(yaw),px=Math.cos(yaw),pz=-Math.sin(yaw),cx=Number.isFinite(b.cx)?b.cx:(b.minX+b.maxX)/2,cz=Number.isFinite(b.cz)?b.cz:(b.minZ+b.maxZ)/2;
 let minL=Infinity,maxL=-Infinity,minW=Infinity,maxW=-Infinity;for(const v of pts){const dx=v[0]-cx,dz=v[1]-cz,l=dx*sx+dz*sz,w=dx*px+dz*pz;minL=Math.min(minL,l);maxL=Math.max(maxL,l);minW=Math.min(minW,w);maxW=Math.max(maxW,w);}return {cx,cz,yaw,length:Math.max(14,maxL-minL||bestD),width:Math.max(8,maxW-minW||Math.min(18,bestD*.45))};
}
function classic(g,w,l,style='historic'){
 const modern=style==='modern',brick=style==='romanesque'?'#a96e55':modern?'#c9c6b9':'#cdbb9d',roof=modern?'#626f72':'#965f49',h=modern?8:11;
 box(g,brick,0,h/2,0,w,h,l);if(modern){box(g,'#a69f8f',0,h+1.3,0,w*.9,2.6,l*.58);box(g,'#3f555b',0,4,l/2+.05,w*.46,4.8,.12);bellTower(g,w*.62,-l*.22,Math.min(31,l*.72),Math.max(3.8,w*.22),'#b7b1a3',false);}else{gable(g,w+.25,l+.35,h,Math.min(5.5,w*.32),roof);box(g,'#d8c9ae',0,h*.5,l/2+.08,w*.92,h*.92,.18);rose(g,0,h*.69,l/2+.19,Math.min(2,w*.12));box(g,'#403f38',0,2.15,l/2+.2,Math.min(3.2,w*.24),4.3,.16);bellTower(g,w*.58,-l*.28,Math.min(36,Math.max(23,l*.58)),Math.max(3.6,w*.2),brick,style==='gothic');}
}
function santo(g,w,l){w=Math.max(w,38);l=Math.max(l,72);box(g,'#a86650',0,8,0,w,16,l);gable(g,w,l,16,7,'#9a604b');box(g,'#d9c9ae',0,8,l/2+.08,w*.92,16,.22);for(const x of [-w*.26,0,w*.26])rose(g,x,10.5,l/2+.2,1.7);for(const [x,z,r] of [[0,-5,10],[0,18,8],[0,-26,8],[-14,-5,7.3],[14,-5,7.3],[-13,20,6.5],[13,20,6.5]])dome(g,x,z,r,16,'#91a79d');for(const x of [-w*.43,w*.43])bellTower(g,x,l*.28,40,3.8,'#bd9975',true);}
function giustina(g,w,l){w=Math.max(w,48);l=Math.max(l,102);box(g,'#b77b5d',0,9,0,w,18,l);gable(g,w,l,18,6,'#8f654f');box(g,'#d7c5a6',0,8.3,l/2+.09,w*.92,16.5,.2);for(const [x,z,r] of [[0,0,11.5],[0,29,8.5],[0,-30,8.5],[-16,0,7.5],[16,0,7.5],[-16,30,6.6],[16,30,6.6],[0,48,6.8]])dome(g,x,z,r,18,'#91aaa0');bellTower(g,w*.62,-l*.34,48,6.4,'#aa7156',false);}
function duomo(g,w,l){w=Math.max(w,28);l=Math.max(l,58);box(g,'#b98d70',0,8.5,0,w,17,l);gable(g,w,l,17,4.8,'#8e6550');box(g,'#d8d0bf',0,7.7,l/2+.09,w*.94,15.4,.22);for(const x of [-w*.25,w*.25])box(g,'#a6a092',x,4,l/2+.22,.35,8,.3);dome(g,0,-l*.08,10.5,17,'#9aa7a0');const bapt=new THREE.Group();bapt.position.set(-w*.72,0,l*.23);g.add(bapt);cylinder(bapt,'#b68465',0,6,0,7,12,8);cone(bapt,'#8f6652',0,14,0,7.6,4.2,8);rose(bapt,0,7,7.02,1.25);}
function arcella(g,w,l){w=Math.max(w,22);l=Math.max(l,42);box(g,'#c3aa8c',0,7.5,0,w,15,l);gable(g,w,l,15,8,'#8f5d47');box(g,'#d9c8aa',0,8,l/2+.1,w*.9,16,.18);rose(g,0,10,l/2+.22,2.4);bellTower(g,0,-l*.38,44,5,'#a86c51',true);}
function styleFor(name){const n=norm(name);if(Object.values(majorAlias).flat().some(a=>n.includes(a)))return Object.entries(majorAlias).find(([,a])=>a.some(v=>n.includes(v)))?.[0];if(/arcella/.test(n))return 'arcella';if(/madonna pellegrina|cuore immacolato|santa rita|san camillo|spirito santo|san carlo|san bellino|san filippo|buon pastore|gregorio barbarigo|sacro cuore|sacra famiglia/.test(n))return 'modern';if(/santa sofia|ognissanti|san nicolo|san benedetto|san massimo/.test(n))return 'romanesque';if(/eremitani/.test(n))return 'gothic';return 'historic';}
function chooseBuildings(data){const chosen=new Map();for(const b of data.buildings||[]){const n=norm(b.n);if(!n||excluded.test(n)||Math.hypot(b.cx||0,b.cz||0)>4300)continue;const alias=knownName(n),isExplicit=explicit.test(n);if(!alias&&!isExplicit)continue;const key=alias||n,area=Math.max(1,(b.maxX-b.minX)*(b.maxZ-b.minZ)),prev=chosen.get(key);if(!prev||area>prev.area)chosen.set(key,{b,area,label:targetMap.get(alias)||b.n});}return [...chosen.values()];}
export function createChurchLayer(data,terrain){const root=new THREE.Group();root.userData.poi='churches';root.userData.churchCount=0;root.userData.names=[];const entries=chooseBuildings(data);
 for(const {b,label} of entries){const f=frame(b),g=new THREE.Group();g.position.set(f.cx,terrain.elevation(f.cx,f.cz),f.cz);g.rotation.y=f.yaw;g.userData.churchName=label||b.n;g.userData.poi='church';const style=styleFor(b.n);if(style==='santo')santo(g,f.width,f.length);else if(style==='giustina')giustina(g,f.width,f.length);else if(style==='duomo')duomo(g,f.width,f.length);else if(style==='arcella')arcella(g,f.width,f.length);else classic(g,Math.max(9,f.width*1.03),Math.max(17,f.length*1.02),style);b.authoredChurch=true;b.h=Math.max(b.h||0,style==='modern'?10:18);bake(g);root.add(g);root.userData.names.push(g.userData.churchName);}
 root.userData.churchCount=root.children.length;return {root,update(x,z){for(const g of root.children)g.visible=Math.hypot(x-g.position.x,z-g.position.z)<1100;}};
}
