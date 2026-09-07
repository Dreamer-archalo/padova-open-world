import {cityDetails} from './city-details.js';
import {roadStructures} from './road-structures.js';
import {DISTRICTS} from './districts.js';
import {detailedLandmarks} from './landmarks.js';
import {nearestOnSegment} from './core.js';
import * as THREE from './vendor/three.module.js';
import {PRATO} from './terrain.js';
import {SpatialIndex,pointInside,clamp,project,dist} from './core.js';
export const CHUNK=320;
export const PLACES=[
  {name:'Prato della Valle',tag:'The island & the open road',x:-115,z:960},
  {name:'Basilica del Santo',tag:'Piazza del Santo',x:235,z:545},
  {name:'Piazza delle Erbe',tag:'Palazzo della Ragione',x:-150,z:-49},
  {name:'Piazza dei Signori',tag:'Under the clock tower',x:-278,z:-137},
  {name:'Duomo',tag:'Piazza del Duomo',x:-346,z:-12},
  {name:'Cappella degli Scrovegni',tag:'Giardini dell’Arena',x:169,z:-535},
  {name:'La Specola',tag:'The observatory',x:-613,z:529},
  {name:'Stazione',tag:'Piazzale della Stazione',...project(45.4168,11.8805)},
  {name:'Portello',tag:'The university district',...project(45.4108,11.8918)},
  {name:'Stadio Euganeo',tag:'Out of the centre',...project(45.4352,11.8564)},
  {name:'Aeroporto',tag:'Padova ovest',...project(45.3964,11.8494)},
  {name:'Guizza',tag:'South of the river',...project(45.3822,11.8709)},
  {name:'Arcella',tag:'North of the station',...project(45.4291,11.8828)},
  {name:'Via dei Tadi',tag:'Detailed historic street',x:-565,z:-55},
  {name:'Municipio',tag:'Palazzo Moroni',x:-45,z:-60},
  {name:'Porta Savonarola',tag:'Renaissance city gate',x:-958,z:-650}
];
const wallColors=['#d7c3a1','#c69c7b','#e3d0ad','#d9b889','#b5b4a1','#cd926f','#d5c5b4'].map(c=>new THREE.Color(c));
const roofColors=['#995f48','#b07553','#9c694d','#a58166','#7b817a','#b17a58','#a2674d'].map(c=>new THREE.Color(c));
const col=c=>new THREE.Color(c);
export class GeometryBatch{
  constructor(){this.p=[];this.c=[];this.uv=[];this.baseY=0;}
  tri(a,b,c,color,uv=[[0,0],[1,0],[1,1]]){this.p.push(a[0],a[1]+this.baseY,a[2],b[0],b[1]+this.baseY,b[2],c[0],c[1]+this.baseY,c[2]);for(let i=0;i<3;i++){this.c.push(color.r,color.g,color.b);this.uv.push(...uv[i]);}}
  quad(a,b,c,d,color,u=1,v=1){this.tri(a,b,c,color,[[0,0],[u,0],[u,v]]);this.tri(a,c,d,color,[[0,0],[u,v],[0,v]]);}
  mesh(mat){if(!this.p.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.uv,2));g.computeVertexNormals();g.computeBoundingSphere();return new THREE.Mesh(g,mat);}
}
function surface(batch,p,y,color){if(p.length<3)return;let pp=p;if(pp[0][0]===pp[pp.length-1][0]&&pp[0][1]===pp[pp.length-1][1])pp=pp.slice(0,-1);const contour=pp.map(v=>new THREE.Vector2(v[0],v[1]));const tris=THREE.ShapeUtils.triangulateShape(contour,[]);
 const height=typeof y==='function'?y:()=>y;
 function triangle(a,b,c,depth=0){const edges=[[a,b,c],[b,c,a],[c,a,b]].sort((u,v)=>Math.hypot(v[0][0]-v[1][0],v[0][1]-v[1][1])-Math.hypot(u[0][0]-u[1][0],u[0][1]-u[1][1])),[u,v,w]=edges[0];if(typeof y==='function'&&depth<12&&Math.hypot(u[0]-v[0],u[1]-v[1])>32){const m=[(u[0]+v[0])/2,(u[1]+v[1])/2];triangle(u,m,w,depth+1);triangle(m,v,w,depth+1);}else batch.tri([a[0],height(...a),a[1]],[b[0],height(...b),b[1]],[c[0],height(...c),c[1]],color);}
 for(const t of tris)triangle(pp[t[0]],pp[t[2]],pp[t[1]]);
}
function strip(batch,a,b,w,y,color){const dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz);if(d<.01)return;const nx=-dz/d*w/2,nz=dx/d*w/2,height=typeof y==='function'?y:()=>y,count=typeof y==='function'?Math.max(1,Math.ceil(d/8)):1;for(let i=0;i<count;i++){const ax=a[0]+dx*i/count,az=a[1]+dz*i/count,bx=a[0]+dx*(i+1)/count,bz=a[1]+dz*(i+1)/count;batch.quad([ax+nx,height(ax+nx,az+nz),az+nz],[bx+nx,height(bx+nx,bz+nz),bz+nz],[bx-nx,height(bx-nx,bz-nz),bz-nz],[ax-nx,height(ax-nx,az-nz),az-nz],color);}}
function portico(batch,p){let edge=null,best=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],d=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d>best&&d<75){best=d;edge=[a,b];}}if(!edge||best<14)return;const [a,b]=edge,dx=(b[0]-a[0])/best,dz=(b[1]-a[1])/best,out=pointInside((a[0]+b[0])/2-dz*.1,(a[1]+b[1])/2+dx*.1,p)?-1:1,nx=-dz*.04*out,nz=dx*.04*out,count=Math.min(10,Math.floor(best/4.2)),span=best/count,dark=col('#443f38'),stone=col('#c4aa84');for(let i=0;i<count;i++){const t0=i*span+.35,t1=(i+1)*span-.35,x0=a[0]+dx*t0+nx,z0=a[1]+dz*t0+nz,x1=a[0]+dx*t1+nx,z1=a[1]+dz*t1+nz;batch.quad([x0,.18,z0],[x1,.18,z1],[x1,3.15,z1],[x0,3.15,z0],dark,1,1);batch.quad([x0,.18,z0],[x0+dx*.28,.18,z0+dz*.28],[x0+dx*.28,3.45,z0+dz*.28],[x0,3.45,z0],stone,1,1);} }
function facadeTexture(kind='historic'){const c=document.createElement('canvas');c.width=128;c.height=128;const t=c.getContext('2d'),modern=kind==='modern',industrial=kind==='industrial';t.fillStyle=industrial?'#cbc8bc':modern?'#deddd4':'#e6dcc8';t.fillRect(0,0,128,128);t.fillStyle=industrial?'#b8b8b0':modern?'#d2d1c9':'#d3c3aa';for(let i=0;i<18;i++)t.fillRect((i*53)%128,(i*37)%128,industrial?42:24,1);if(industrial){t.fillStyle='#5b696b';t.fillRect(12,38,104,55);t.fillStyle='#839395';for(let x=18;x<112;x+=23)t.fillRect(x,43,16,30);t.fillStyle='#9e9b91';t.fillRect(0,112,128,16);}else{const cols=modern?3:2,rows=modern?3:2,ww=modern?22:18,wh=modern?18:25,xgap=128/(cols+1),ygap=92/(rows+1);for(let y=1;y<=rows;y++)for(let x=1;x<=cols;x++){const px=Math.round(x*xgap-ww/2),py=Math.round(8+y*ygap-wh/2);t.fillStyle=modern?'#51666a':'#405653';t.fillRect(px-3,py-3,ww+6,wh+7);t.fillStyle=modern?'#789397':'#78908b';t.fillRect(px,py,ww,wh);t.fillStyle='#b9c5bd';t.fillRect(px+ww/2-1,py,2,wh);if(!modern){t.fillStyle='#d5bd98';t.fillRect(px-5,py+wh+4,ww+10,4);}}t.fillStyle=modern?'#b7b6ad':'#bca17e';t.fillRect(0,118,128,10);}const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;return tex;}
const boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.SphereGeometry(1,12,8),cylinderGeo=new THREE.CylinderGeometry(1,1,1,12),coneGeo=new THREE.ConeGeometry(1,1,12);
const matCache=new Map();function material(c,rough=1){const k=c+','+rough;if(!matCache.has(k))matCache.set(k,new THREE.MeshStandardMaterial({color:c,roughness:rough}));return matCache.get(k);}
function primitive(g,geo,c,x,y,z,sx,sy,sz){const m=new THREE.Mesh(geo,material(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function box(g,c,x,y,z,w,h,d){return primitive(g,boxGeo,c,x,y,z,w,h,d);}
function dome(g,x,y,z,r,h,color='#bdc0af'){primitive(g,cylinderGeo,'#ceb999',x,y-1.5,z,r*.86,3,r*.86);primitive(g,sphereGeo,color,x,y,z,r,h,r);primitive(g,cylinderGeo,'#d9cdb4',x,y+h+1,z,1.1,3,1.1);box(g,'#6c7262',x,y+h+3.3,z,.3,2,.3);box(g,'#6c7262',x,y+h+3.4,z,1.5,.2,.2);}
function tower(g,x,z,height,w,color='#b88965'){box(g,color,x,height/2,z,w,height,w);box(g,'#dbc9a6',x,height*.77,z,w+1.6,1.4,w+1.6);for(let a=0;a<4;a++){const rot=a*Math.PI/2;const win=box(g,'#384d4d',x+Math.sin(rot)*(w/2+.05),height-6,z+Math.cos(rot)*(w/2+.05),w*.33,6,.12);win.rotation.y=rot;}primitive(g,coneGeo,'#897464',x,height+4,z,w*.85,8,w*.85);}
function makeLandmarks(scene,data){const g=new THREE.Group(),root=g;
  // Architectural silhouettes are interpretive; footprints below remain OSM geometry.
  const saint=data.buildings.find(b=>b.n.toLowerCase().includes("basilica di sant'antonio"));
  if(saint){const g=new THREE.Group();g.userData.buildingName=saint.n;root.add(g);const minX=saint.minX,maxX=saint.maxX,minZ=saint.minZ,maxZ=saint.maxZ,cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;saint.h=22;for(const [dx,dz,r,h] of [[0,-6,15,13],[0,23,12,10],[0,-34,12,10],[-23,-6,11,10],[23,-6,11,10],[-20,24,10,10],[20,24,10,10],[0,46,10,9]])dome(g,cx+dx,26,cz+dz,r,h);tower(g,cx-26,cz+48,54,5);tower(g,cx+26,cz+48,54,5);}
  const spec=data.buildings.find(b=>b.n==='La Specola');if(spec){const g=new THREE.Group();g.userData.buildingName=spec.n;root.add(g);tower(g,(spec.minX+spec.maxX)/2,(spec.minZ+spec.maxZ)/2,46,11,'#b38a64');}
  const duomo=data.buildings.find(b=>b.n==='Duomo di Padova');if(duomo){const g=new THREE.Group();g.userData.buildingName=duomo.n;root.add(g);duomo.h=21;dome(g,(duomo.minX+duomo.maxX)/2,27,(duomo.minZ+duomo.maxZ)/2,13,10,'#9faa9f');}
  detailedLandmarks(root,data);
  // Santa Giustina, east of Prato: distinctive clustered copper domes.
  const sj=project(45.3982,11.88025);for(const [dx,dz,r] of [[0,0,17],[-24,0,11],[24,0,11],[0,-30,12],[0,30,12],[-23,30,10],[23,30,10],[0,53,10]])dome(g,sj.x+dx,29,sj.z+dz,r,r*.85,'#9daba0');tower(g,sj.x+44,sj.z+44,58,8);
  // Torre dell'Orologio and its clock face at Piazza dei Signori.
  tower(g,-336,-162,28,8,'#c9af87');const face=new THREE.Mesh(new THREE.CircleGeometry(2.5,24),material('#eee3c5'));face.position.set(-331.9,20,-162);face.rotation.y=Math.PI/2;g.add(face);box(g,'#283d42',-331.7,20.9,-162,.12,2,.15);box(g,'#283d42',-331.7,20,-161.1,.12,.15,2);
  // Prato's elliptical island, ring canal and statues. It overlays the extract's multipolygon parts.
  const prato=new THREE.Group();prato.position.set(PRATO.x,0,PRATO.z);prato.rotation.y=PRATO.yaw;
  const ellipse=(color,rx,rz,y)=>{const m=new THREE.Mesh(new THREE.CircleGeometry(1,96),material(color));m.rotation.x=-Math.PI/2;m.scale.set(rx,rz,1);m.position.y=y;prato.add(m);};
  const ringShape=new THREE.Shape();ringShape.absellipse(0,0,115,163,0,Math.PI*2,false,0);const hole=new THREE.Path();hole.absellipse(0,0,90,135,0,Math.PI*2,true,0);ringShape.holes.push(hole);const outer=new THREE.Mesh(new THREE.ShapeGeometry(ringShape,96),material('#c6b99c'));outer.rotation.x=-Math.PI/2;outer.position.y=.12;prato.add(outer);ellipse('#7bb3b0',90,135,-1.5);ellipse('#d6c5a2',81,126,.16);ellipse('#899e5c',72,117,.18);
  box(prato,'#d4c4a4',0,.25,0,11,.2,249);box(prato,'#d4c4a4',0,.26,0,159,.2,9);
  // Four separate canal crossings, aligned with the collision passages in Terrain.
  for(const [x,z,yaw,width] of [[0,130.5,0,11],[0,-130.5,0,11],[85.5,0,Math.PI/2,9],[-85.5,0,Math.PI/2,9]]){const bridge=new THREE.Group();bridge.position.set(x,0,z);bridge.rotation.y=yaw;prato.add(bridge);box(bridge,'#d4c4a4',0,.23,0,width,.26,14);
   for(const side of [-1,1]){for(let j=-6;j<=6;j+=2)box(bridge,'#e2d7bd',side*(width/2+.2),.85,j,.35,1.0,.35);box(bridge,'#d5c7aa',side*(width/2+.2),1.4,0,.5,.2,14);box(bridge,'#c5b497',side*(width/2+.2),-.35,0,.65,.9,14);}}
  primitive(prato,cylinderGeo,'#d0c2a5',0,.5,0,5,1,5);primitive(prato,cylinderGeo,'#78a6a1',0,1.03,0,4.4,.05,4.4);primitive(prato,cylinderGeo,'#c3bba5',0,1.7,0,.7,1.6,.7);
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2,x=Math.cos(a)*60,z=Math.sin(a)*103;primitive(prato,cylinderGeo,'#746b50',x,2.5,z,.4,5,.4);primitive(prato,sphereGeo,'#527a4a',x,6,z,4.5,5,4.5);}

  for(let i=0;i<78;i++){const a=(i%39+.5)/39*Math.PI*2,x=Math.cos(a)*(i<39?95:76),z=Math.sin(a)*(i<39?140:121);if(Math.abs(x)<7||Math.abs(z)<6)continue;box(prato,'#d7d3b9',x,1.5,z,2.2,3,2.2);primitive(prato,cylinderGeo,'#e2dfca',x,3.7,z,.5,1.8,.5);primitive(prato,sphereGeo,'#e2dfca',x,4.9,z,.42,.5,.42);}
  g.add(prato);scene.add(g);return g;
}
export class CityWorld{
 constructor(scene,data,terrain=null){this.terrain=terrain;this.scene=scene;this.data=data;this.chunks=new Map();this.collision=new SpatialIndex(60);this.loaded=new Map();this.queue=[];this.lastKey='';this.radius=1050;
  this.wallMats={historic:new THREE.MeshStandardMaterial({map:facadeTexture('historic'),vertexColors:true,roughness:1,side:THREE.DoubleSide}),modern:new THREE.MeshStandardMaterial({map:facadeTexture('modern'),vertexColors:true,roughness:.92,side:THREE.DoubleSide}),industrial:new THREE.MeshStandardMaterial({map:facadeTexture('industrial'),vertexColors:true,roughness:1,side:THREE.DoubleSide})};this.roofMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});this.groundMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});
  if(!terrain){const ground=new THREE.Mesh(new THREE.PlaneGeometry(45000,45000),material('#8c9b73'));ground.rotation.x=-Math.PI/2;ground.position.y=-.05;scene.add(ground);}
  else for(let x=-6400;x<7680;x+=CHUNK)for(let z=-7040;z<6720;z+=CHUNK)this.chunk(x,z);
  for(const b of data.buildings){b.minX=Math.min(...b.p.map(p=>p[0]));b.maxX=Math.max(...b.p.map(p=>p[0]));b.minZ=Math.min(...b.p.map(p=>p[1]));b.maxZ=Math.max(...b.p.map(p=>p[1]));b.cx=(b.minX+b.maxX)/2;b.cz=(b.minZ+b.maxZ)/2;b.minY=terrain?terrain.elevation(b.cx,b.cz):0;this.collision.add(b,b.minX,b.minZ,b.maxX,b.maxZ);this.chunk(b.cx,b.cz).buildings.push(b);}
  this.landmarks=makeLandmarks(scene,data);
  if(terrain)for(const o of this.landmarks.children){const b=data.buildings.find(b=>b.n===o.userData.buildingName);o.position.y+=b?b.minY:terrain.elevation(o.position.x,o.position.z);}

  for(const r of data.roads)for(let i=1;i<r.p.length;i++)this.addSegments(r.p[i-1],r.p[i],r.w,'road',r);
  for(const r of data.water.filter(r=>!r.tunnel&&!(r.layer<0)))for(let i=1;i<r.p.length;i++)this.addSegments(r.p[i-1],r.p[i],r.w,'water',r);
  for(const a of data.areas){const xs=a.p.map(p=>p[0]),zs=a.p.map(p=>p[1]);a.cx=(Math.min(...xs)+Math.max(...xs))/2;a.cz=(Math.min(...zs)+Math.max(...zs))/2;this.chunk(a.cx,a.cz).areas.push(a);}
  if(terrain){
   // Stone balustrades of the four Prato bridges use the same local frame as the water mask.
   for(const [x,z,yaw,width] of [[0,130.5,0,11],[0,-130.5,0,11],[85.5,0,Math.PI/2,9],[-85.5,0,Math.PI/2,9]])for(const side of [-1,1]){const px=x+Math.cos(yaw)*(width/2+.2)*side,pz=z-Math.sin(yaw)*(width/2+.2)*side,c=Math.cos(PRATO.yaw),s=Math.sin(PRATO.yaw),wx=PRATO.x+c*px+s*pz,wz=PRATO.z-s*px+c*pz,a=yaw+PRATO.yaw,points=[[-.25,-7],[.25,-7],[.25,7],[-.25,7]].map(([u,v])=>[wx+Math.cos(a)*u+Math.sin(a)*v,wz-Math.sin(a)*u+Math.cos(a)*v]),xs=points.map(p=>p[0]),zs=points.map(p=>p[1]),b={p:points,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:terrain.pratoHeight+.3,h:1.2};this.collision.add(b,b.minX,b.minZ,b.maxX,b.maxZ);}
   this.structures=roadStructures(terrain);for(const b of this.structures){this.collision.add(b,b.minX,b.minZ,b.maxX,b.maxZ);this.chunk(b.x,b.z).structures.push(b);}this.details=cityDetails(scene,data,terrain);}
 }
 chunk(x,z){const i=Math.floor(x/CHUNK),j=Math.floor(z/CHUNK),key=i+','+j;if(!this.chunks.has(key))this.chunks.set(key,{i,j,buildings:[],roads:[],water:[],areas:[],structures:[]});return this.chunks.get(key);}
 addSegments(a,b,w,k,road){const d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(d/120));for(let i=0;i<n;i++){const p=[a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n],q=[a[0]+(b[0]-a[0])*(i+1)/n,a[1]+(b[1]-a[1])*(i+1)/n];this.chunk((p[0]+q[0])/2,(p[1]+q[1])/2)[k==='road'?'roads':'water'].push({a:p,b:q,w,road});}}
 build(key){const ch=this.chunks.get(key);if(!ch)return;const g=new THREE.Group(),wallBatches={historic:new GeometryBatch(),modern:new GeometryBatch(),industrial:new GeometryBatch()},roofs=new GeometryBatch(),surfaces=new GeometryBatch();
  for(const b of ch.buildings){if(b.modelActive||b.authoredLandmark)continue;const p=b.p,h=b.h,zone=this.terrain?.districts?.at(b.cx,b.cz),central=zone?zone==='historic':Math.hypot(b.cx*.82,b.cz)<1550,historic=central||['church','chapel','basilica','historic','civic','museum','theatre'].includes(b.t),industrial=zone==='industrial'||['industrial','warehouse','hangar','commercial','retail','supermarket','mall'].includes(b.t),walls=industrial?wallBatches.industrial:historic?wallBatches.historic:wallBatches.modern,color=zone==='wild'?col(['#777965','#909080','#726d61'][b.c%3]):industrial?col(['#aaaba3','#969b99','#b2afa4'][b.c%3]):wallColors[b.c];walls.baseY=roofs.baseY=b.minY;for(let i=0;i<p.length;i++){const a=p[i],q=p[(i+1)%p.length],len=Math.hypot(q[0]-a[0],q[1]-a[1]);walls.quad([a[0],this.terrain?Math.min(.15,this.terrain.groundHeight(a[0],a[1])-b.minY-.15):.15,a[1]],[q[0],this.terrain?Math.min(.15,this.terrain.groundHeight(q[0],q[1])-b.minY-.15):.15,q[1]],[q[0],h,q[1]],[a[0],h,a[1]],color,Math.max(1,Math.round(len/(industrial?7:historic?6.6:13.8))),Math.max(1,Math.round(h/(industrial?5:historic?6.2:9.3))));}surface(roofs,p,h+.08,industrial?col('#8b8c86'):roofColors[b.c]);if(central&&b.c===0&&h>8)portico(roofs,p);
   if(p.length===4&&b.h<18&&b.t!=='industrial'&&b.t!=='warehouse'){let a=p[0],q=p[1],c=p[2],d=p[3];if(Math.hypot(q[0]-a[0],q[1]-a[1])>Math.hypot(c[0]-q[0],c[1]-q[1]))[a,q,c,d]=[q,c,d,a];const m=[(a[0]+q[0])/2,h+2,(a[1]+q[1])/2],n=[(c[0]+d[0])/2,h+2,(c[1]+d[1])/2];roofs.quad([a[0],h,a[1]],m,n,[d[0],h,d[1]],roofColors[b.c]);roofs.quad(m,[q[0],h,q[1]],[c[0],h,c[1]],n,roofColors[b.c]);roofs.tri([a[0],h,a[1]],[q[0],h,q[1]],m,wallColors[b.c]);roofs.tri([c[0],h,c[1]],[d[0],h,d[1]],n,wallColors[b.c]);}
  }
  const terrain=this.terrain,height=(x,z)=>terrain?terrain.height(x,z):0,water=(x,z)=>terrain?terrain.waterHeight(x,z):.012;
  if(terrain){const ground=new GeometryBatch(),color=col(Math.hypot(ch.i*CHUNK*.82,ch.j*CHUNK)<1550?'#b4aa91':'#8c9b73');
   const tile=(x,z,size)=>{const half=size/2;if(size>4&&terrain.waterDistance(x+half,z+half)<size){for(const dx of [0,half])for(const dz of [0,half])tile(x+dx,z+dz,half);return;}ground.quad([x,terrain.groundHeight(x,z)-.08,z],[x,terrain.groundHeight(x,z+size)-.08,z+size],[x+size,terrain.groundHeight(x+size,z+size)-.08,z+size],[x+size,terrain.groundHeight(x+size,z)-.08,z],color);};
   for(let x=ch.i*CHUNK;x<(ch.i+1)*CHUNK;x+=16)for(let z=ch.j*CHUNK;z<(ch.j+1)*CHUNK;z+=16)tile(x,z,16);
   const mesh=ground.mesh(this.groundMat);mesh.receiveShadow=true;g.add(mesh);
  }
  for(const a of ch.areas)surface(surfaces,a.p,a.k==='water'&&!a.fountain?water:(x,z)=>height(x,z)-.02,col(a.k==='water'?'#639b9c':a.k==='pitch'?'#7d9e72':'#789961'));
  for(const r of ch.water)strip(surfaces,r.a,r.b,r.w,water,col('#659b9e'));
  const roadJoins=new Set();for(const s of ch.roads){const k=s.road.k,ped=['pedestrian','footway','path','cycleway','steps'].includes(k),mx=(s.a[0]+s.b[0])/2,mz=(s.a[1]+s.b[1])/2,central=Math.hypot(mx*.82,mz)<1550,bridge=s.road.crossing,edge=bridge?'#c2b49a':ped&&central?'#d0c2a4':'#c3bca8',road=ped?(central?'#bdae91':'#b7b09a'):(central?'#696d69':'#6c7472');
   const roadY=(x,z)=>terrain?terrain.roads.sample(s.road,x,z)+.075:.075;
   strip(surfaces,s.a,s.b,s.w+(bridge?3:1.5),(x,z)=>roadY(x,z)-.02,col(edge));strip(surfaces,s.a,s.b,s.w,roadY,col(road));
   for(const p of [s.a,s.b]){const key=s.road.surfaceId+','+p.join(',');if(roadJoins.has(key))continue;roadJoins.add(key);for(const [radius,color,offset] of [[s.w/2+(bridge?1.5:.75),edge,.002],[s.w/2,road,.004]]){const y=roadY(...p)+offset;for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;surfaces.tri([p[0],y,p[1]],[p[0]+Math.cos(a)*radius,y,p[1]+Math.sin(a)*radius],[p[0]+Math.cos(b)*radius,y,p[1]+Math.sin(b)*radius],col(color));}}}
   if(bridge&&!terrain){const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],length=Math.hypot(dx,dz),count=Math.max(1,Math.ceil(length/8));if(length>.01)for(const side of [-1,1])for(let i=0;i<count;i++){const nx=-dz/length*(s.w/2+1)*side,nz=dx/length*(s.w/2+1)*side,ax=s.a[0]+dx*i/count+nx,az=s.a[1]+dz*i/count+nz,bx=s.a[0]+dx*(i+1)/count+nx,bz=s.a[1]+dz*(i+1)/count+nz,ay=roadY(ax,az),by=roadY(bx,bz);surfaces.quad([ax,ay,az],[bx,by,bz],[bx,by+1.1,bz],[ax,ay+1.1,az],col(central?'#bbab91':'#a7aaa6'));}}
   if(k==='tram')strip(surfaces,s.a,s.b,.13,(x,z)=>roadY(x,z)+.03,col('#c8cfca'));
   if(s.w>=8&&!ped){const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],d=Math.hypot(dx,dz);for(let t=0;t<d-3;t+=13){const a=[s.a[0]+dx*t/d,s.a[1]+dz*t/d],b=[s.a[0]+dx*Math.min(t+4,d)/d,s.a[1]+dz*Math.min(t+4,d)/d];strip(surfaces,a,b,.14,(x,z)=>roadY(x,z)+.007,col('#c7c6ae'));}}}
  for(const type of Object.keys(wallBatches)){const mesh=wallBatches[type].mesh(this.wallMats[type]);if(mesh){mesh.receiveShadow=true;g.add(mesh);}}for(const [b,m] of [[roofs,this.roofMat],[surfaces,this.groundMat]]){const mesh=b.mesh(m);if(mesh){mesh.receiveShadow=true;g.add(mesh);}}
  const structureBatch=new GeometryBatch();for(const b of ch.structures){const color=col(b.kind==='parapet'?'#bdb29d':'#a8a79b'),bottom=b.p.map(p=>[p[0],b.y,p[1]]),top=b.p.map(p=>[p[0],b.y+b.h,p[1]]);for(let i=0;i<4;i++){const j=(i+1)%4;structureBatch.quad(bottom[i],bottom[j],top[j],top[i],color);}structureBatch.quad(...top,color);structureBatch.quad(...bottom.slice().reverse(),color);}const structures=structureBatch.mesh(this.roofMat);if(structures)g.add(structures);
  // Deterministic candidates are pooled in chunk-level instances. The same exclusion
  // query checks footprints, all road classes, tram tracks, bridges and water.
  const trees=[],districts=terrain?.districts,hash=n=>{const v=Math.sin(n*127.1+ch.i*311.7+ch.j*74.7)*43758.5453;return v-Math.floor(v);};
  for(let i=0;i<220;i++){const x=(ch.i+hash(i*3+1))*CHUNK,z=(ch.j+hash(i*3+2))*CHUNK,zone=DISTRICTS[districts?.at(x,z)||'residential'],river=terrain&&terrain.waterDistance(x,z)<18;
   if(hash(i*3+3)>Math.min(.85,zone.trees*.12+(river?.2:0)))continue;
   if(districts&&!districts.canPlant(x,z,terrain))continue;
   if(!districts&&(!terrain?.dry(x,z,2)||[...this.collision.near(x,z,2)].some(b=>pointInside(x,z,b.p))))continue;
   trees.push({x,z,s:hash(i+700)>.3?4+hash(i+800)*4:1.1+hash(i+900)});
  }
  g.userData.vegetation=trees;
  if(trees.length){const trunks=new THREE.InstancedMesh(cylinderGeo,material('#7b7250'),trees.length),tops=new THREE.InstancedMesh(sphereGeo,material('#496e48'),trees.length);const o=new THREE.Object3D();trees.forEach((t,i)=>{o.position.set(t.x,t.s*.4+height(t.x,t.z),t.z);o.scale.set(.38,t.s*.8,.38);o.updateMatrix();trunks.setMatrixAt(i,o.matrix);o.position.y=t.s+height(t.x,t.z);o.scale.set(t.s*.56,t.s*.7,t.s*.56);o.updateMatrix();tops.setMatrixAt(i,o.matrix);});g.add(trunks,tops);}
  this.scene.add(g);this.loaded.set(key,g);
 }
 update(x,z,force=false){this.details?.update(x,z);const i=Math.floor(x/CHUNK),j=Math.floor(z/CHUNK),sig=i+','+j+','+this.radius;if(sig!==this.lastKey||force){this.lastKey=sig;const r=Math.ceil(this.radius/CHUNK),keys=[];for(let a=i-r;a<=i+r;a++)for(let b=j-r;b<=j+r;b++){const key=a+','+b;if(this.chunks.has(key))keys.push({key,d:Math.hypot((a+.5)*CHUNK-x,(b+.5)*CHUNK-z)});}keys.sort((a,b)=>a.d-b.d);this.queue=keys.filter(k=>!this.loaded.has(k.key)).map(k=>k.key);for(const [key,g] of this.loaded){const ch=this.chunks.get(key);g.visible=Math.abs(ch.i-i)<=r&&Math.abs(ch.j-j)<=r;if(Math.abs(ch.i-i)>r+2||Math.abs(ch.j-j)>r+2){this.scene.remove(g);g.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)o.geometry.dispose();if(o.isInstancedMesh)o.dispose();});this.loaded.delete(key);}}}const count=force?12:1;for(let k=0;k<count&&this.queue.length;k++)this.build(this.queue.shift());}
 refreshBuilding(b){const key=Math.floor(b.cx/CHUNK)+','+Math.floor(b.cz/CHUNK),g=this.loaded.get(key);if(!g)return;this.scene.remove(g);g.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)o.geometry.dispose();if(o.isInstancedMesh)o.dispose();});this.loaded.delete(key);this.build(key);}
 setQuality(q){this.radius=q==='low'?680:q==='high'?1450:1050;this.lastKey='';}
}
export function createCar(color='#e6c97f',police=false,style='sedan'){const g=new THREE.Group();box(g,'#222f32',0,.45,0,1.8,.35,4.05);box(g,color,0,.85,0,1.85,.62,3.95);box(g,color,0,1.33,-.25,1.65,.64,2.18);box(g,'#334e59',0,1.38,.88,1.48,.49,.035).rotation.x=.2;box(g,'#344e59',0,1.38,-1.37,1.45,.44,.035).rotation.x=-.18;for(const side of [-1,1]){box(g,'#3c5860',side*.835,1.38,-.25,.03,.44,1.98);box(g,color,side*.86,1.37,-.23,.05,.58,.085);for(const z of [-1.29,1.25]){const wheel=primitive(g,cylinderGeo,'#20282a',side*.94,.43,z,.37,.19,.37);wheel.rotation.z=Math.PI/2;const hub=primitive(g,cylinderGeo,'#a7b2b0',side*1.045,.43,z,.2,.012,.2);hub.rotation.z=Math.PI/2;}}
 for(const x of [-.59,.59]){box(g,'#fff6c8',x,.9,1.99,.48,.2,.025);box(g,'#c34436',x,.9,-1.99,.45,.18,.025);}box(g,'#bfc0a8',0,.65,2.01,.54,.18,.025);box(g,'#8a9692',0,.53,2.02,1.65,.12,.05);box(g,'#8a9692',0,.53,-2.02,1.65,.12,.05);
 if(style==='sport'){g.scale.set(1.03,.88,1.08);box(g,color,0,1.15,-2.02,1.6,.08,.3);box(g,'#252d30',0,1.28,-2.02,1.25,.08,.12);}else if(style==='compact'){g.scale.set(.93,1.02,.88);}else if(style==='wagon'){box(g,color,0,1.36,-1.05,1.64,.68,1.25);box(g,'#344e59',0,1.42,-1.69,1.45,.5,.035).rotation.x=-.08;}else if(style==='utility'){g.scale.set(1.04,1.06,1.1);box(g,color,0,1.42,-.85,1.7,.88,1.5);box(g,'#2e454d',0,1.46,-1.62,1.48,.62,.035);}
 if(police){box(g,'#e1e6e3',0,.89,0,1.89,.28,3.3);box(g,'#163946',0,.96,0,1.92,.13,3.35);box(g,'#29383e',0,1.71,-.15,1.1,.1,.3);const blue=box(g,'#348dff',-.36,1.84,-.15,.35,.19,.3),red=box(g,'#e96b54',.36,1.84,-.15,.35,.19,.3);g.userData.lights=[blue,red];}
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.6,4.6),new THREE.MeshBasicMaterial({color:'#172022',transparent:true,opacity:.21,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.075;g.add(shadow);return g;}
export function createPerson(color='#c6ad82',variant=0){const g=new THREE.Group(),skins=['#ceaa87','#a8785e','#e0b99a','#805944'],hair=['#403d31','#6b4c32','#242a2b','#9b8059'],pants=['#394749','#3d4965','#564a43','#26383c'],skin=skins[variant%4];g.scale.setScalar(.92+(variant%5)*.035);const hips=new THREE.Group();for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.16,.82,0);box(leg,pants[variant%4],0,-.34,0,.22,.68,.25);box(leg,'#273033',0,-.72,.065,.24,.12,.4);hips.add(leg);}g.add(hips);const shirt=box(g,color,0,1.12,0,.55,.62,.34);shirt.material=shirt.material.clone();shirt.userData.clothing=true;primitive(g,sphereGeo,skin,0,1.64,0,.19,.23,.2);primitive(g,sphereGeo,hair[variant%4],0,1.8,-.015,.2,.10,.2);const arms=new THREE.Group();for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.36,1.36,0);const sleeve=box(arm,color,0,-.25,0,.17,.49,.2);sleeve.material=sleeve.material.clone();sleeve.userData.clothing=true;primitive(arm,sphereGeo,skin,0,-.56,0,.09,.12,.1);arms.add(arm);}g.add(arms);if(variant%4===0)box(g,'#5b4035',0,1.12,-.24,.36,.43,.16);if(variant%7===0)primitive(g,cylinderGeo,'#38464c',0,1.91,0,.24,.08,.24);g.userData.hips=hips;g.userData.arms=arms;return g;}
