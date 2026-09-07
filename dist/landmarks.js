import * as THREE from './vendor/three.module.js';

// Authored from OSM orientation and photographic references in docs/mobility-terrain.md.
// These are lightweight exterior interpretations, not scans or photographic textures.
const stone='#d5c3a2',brick='#ae7055',dark='#394443',roof='#788584';
function add(g,geometry,color,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide}));m.position.set(x,y,z);g.add(m);return m;}
function box(g,c,x,y,z,w,h,d){return add(g,new THREE.BoxGeometry(w,h,d),c,x,y,z);}
function panel(g,points,c,x=0,y=0,z=0){const s=new THREE.Shape();points.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();return add(g,new THREE.ShapeGeometry(s),c,x,y,z);}
function arch(g,x,y,z,w,h,color=stone){const r=w/2,s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(-r,h-r);s.absarc(0,h-r,r,Math.PI,0,true);s.lineTo(r,0);s.closePath();add(g,new THREE.ShapeGeometry(s,12),color,x,y,z);}
function windowArch(g,x,y,z,w,h){arch(g,x,y,z,w+.35,h+.18,stone);arch(g,x,y+.12,z+.015,w,h,dark);}
function gable(g,w,l,y,rise){const geometry=new THREE.BufferGeometry();const p=[-w/2,y,l/2,w/2,y,l/2,0,y+rise,l/2,-w/2,y,-l/2,0,y+rise,-l/2,w/2,y,-l/2,-w/2,y,l/2,0,y+rise,l/2,0,y+rise,-l/2,-w/2,y,l/2,0,y+rise,-l/2,-w/2,y,-l/2,0,y+rise,l/2,w/2,y,l/2,w/2,y,-l/2,0,y+rise,l/2,w/2,y,-l/2,0,y+rise,-l/2];geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.computeVertexNormals();add(g,geometry,'#9c644d');}
function round(g,x,y,z,r,rose=false){add(g,new THREE.CircleGeometry(r,32),stone,x,y,z);add(g,new THREE.CircleGeometry(r*.87,32),dark,x,y,z+.015);if(rose)for(let i=0;i<12;i++){const a=i*Math.PI/6;const m=box(g,stone,x+Math.sin(a)*r*.42,y+Math.cos(a)*r*.42,z+.035,.10,r*.84,.05);m.rotation.z=-a;}}
function bake(g){g.updateMatrixWorld(true);const p=[],n=[],c=[],v=new THREE.Vector3(),normal=new THREE.Vector3(),inverse=g.matrixWorld.clone().invert();g.traverse(o=>{if(!o.isMesh)return;const m=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld),nm=new THREE.Matrix3().getNormalMatrix(m),geom=o.geometry,a=geom.attributes.position,no=geom.attributes.normal,indices=geom.index?.array,color=o.material.color;for(let k=0;k<(indices?.length||a.count);k++){const i=indices?indices[k]:k;v.fromBufferAttribute(a,i).applyMatrix4(m);normal.fromBufferAttribute(no,i).applyMatrix3(nm).normalize();p.push(v.x,v.y,v.z);n.push(normal.x,normal.y,normal.z);c.push(color.r,color.g,color.b);}});g.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});g.clear();const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(c,3));const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide}));m.castShadow=m.receiveShadow=true;g.add(m);}
function frame(root,b,front,rear){const g=new THREE.Group();g.userData.buildingName=b.n;g.position.set((front[0]+rear[0])/2,0,(front[1]+rear[1])/2);g.rotation.y=Math.atan2(front[0]-rear[0],front[1]-rear[1]);b.authoredLandmark=true;root.add(g);return g;}
export function detailedLandmarks(root,data){
 const rag=data.buildings.find(b=>b.n==='Palazzo della Ragione');if(rag){
  const g=frame(root,rag,[-122.8,-96.3],[-122.8,-96.3]);g.rotation.y=.075;rag.h=35;
  box(g,brick,0,10.7,0,76,21.4,31);box(g,stone,0,1,0,82,2,39);
  // Two loggia tiers and a continuous balustrade facing the Erbe and Frutta squares.
  for(const side of [-1,1]){const facade=new THREE.Group();facade.position.z=side*19.6;if(side<0)facade.rotation.y=Math.PI;g.add(facade);
   box(facade,stone,0,11.0,0,82,.65,1);box(facade,stone,0,20.8,-1,80,.65,1);
   for(let i=0;i<17;i++){const x=-38.4+i*4.8;for(const [y,h] of [[1.2,8.8],[12,8]]){arch(facade,x,y,.04,4.3,h,stone);arch(facade,x,y+.05,.065,3.6,h-.5,dark);box(facade,stone,x-2.06,y+(h-2.15)/2,.14,.37,h-2.15,.4);}for(let j=0;j<4;j++)box(facade,stone,x-1.6+j*1.05,12.9,.24,.12,1.45,.20);round(facade,x,10.2,.08,.36);}
   box(facade,stone,0,13.65,.24,81,.2,.38);
  }
  // A pointed ship-hull profile, closed ends and longitudinal ribs.
  const profile=[[-16,21.5],[-15,25],[-11,29.5],[-6,33],[0,35],[6,33],[11,29.5],[15,25],[16,21.5]];
  for(let i=1;i<profile.length;i++){const [z0,y0]=profile[i-1],[z1,y1]=profile[i],geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute([-39,y0,z0,39,y0,z0,39,y1,z1,-39,y0,z0,39,y1,z1,-39,y1,z1],3));geom.computeVertexNormals();add(g,geom,roof);}
  for(const side of [-1,1]){const end=panel(g,profile.map(([z,y])=>[z,y]),roof);end.rotation.y=Math.PI/2;end.position.x=side*39;}
  for(let i=-7;i<=7;i++)for(let j=1;j<profile.length;j++){const [z0,y0]=profile[j-1],[z1,y1]=profile[j],rib=box(g,'#607171',i*5.3,(y0+y1)/2+.04,(z0+z1)/2,.10,Math.hypot(y1-y0,z1-z0),.12);rib.rotation.x=Math.atan2(z1-z0,y1-y0);}
  bake(g);
 }
 const sc=data.buildings.find(b=>b.n==='Cappella degli Scrovegni');if(sc){
  const g=frame(root,sc,[197,-600.35],[219,-610.5]);const w=10.1,l=24.25;sc.h=14;
  box(g,brick,0,5.5,0,w,11,l);gable(g,w+.5,l+.4,11,3);panel(g,[[-w/2,11],[0,14],[w/2,11]],brick,0,0,l/2+.03);
  windowArch(g,0,.2,l/2+.05,2.45,4.2);
  for(const [x,h] of [[-1.2,2.5],[0,3.0],[1.2,2.5]])windowArch(g,x,7.0,l/2+.06,.78,h);
  for(const side of [-1,1]){const face=new THREE.Group();face.position.x=side*w/2;face.rotation.y=side*Math.PI/2;g.add(face);for(let i=0;i<6;i++)windowArch(face,-9.7+i*3.8,5.3,.04,.82,3.7);}
  box(g,stone,0,11.05,l/2+.1,w+.3,.22,.3);box(g,'#77756b',0,14.6,l/2,.13,1.3,.13);box(g,'#77756b',0,14.9,l/2,.65,.13,.13);bake(g);
 }
 const er=data.buildings.find(b=>b.n==='Chiesa degli Eremitani');if(er){
  const g=frame(root,er,[194.1,-469.9],[260,-437]);const w=26,l=73.65;er.h=27;
  box(g,brick,0,10.4,0,w,20.8,l);gable(g,w+.5,l,20.8,6.2);panel(g,[[-w/2,20.8],[0,27],[w/2,20.8]],brick,0,0,l/2+.03);
  box(g,'#d8cbb5',0,5.4,l/2+.08,w,10.8,.18);
  for(const x of [-10.4,-6.1,6.1,10.4]){arch(g,x,.1,l/2+.19,3.3,9.6,stone);arch(g,x,.1,l/2+.21,2.6,9.0,brick);}
  windowArch(g,0,.1,l/2+.22,3.4,6.6);round(g,0,16.1,l/2+.06,3.45,true);
  for(const x of [-5.4,5.4])for(const y of [12.2,21.1])round(g,x,y,l/2+.06,1.0);
  for(const x of [-12.8,-8.5,-4.2,0,4.2,8.5,12.8]){const top=27-Math.abs(x)*.48;box(g,'#b77e61',x,(10.9+top)/2,l/2+.08,.25,top-10.9,.15);}
  for(let i=-12;i<=12;i++)arch(g,i,21.0+(12-Math.abs(i))*.47,l/2+.10,.55,1.05,dark);
  // South wall blind arcades, read from the diocesan restoration photograph.
  const wall=new THREE.Group();wall.position.x=-w/2;wall.rotation.y=-Math.PI/2;g.add(wall);for(let i=0;i<15;i++){arch(wall,-32+i*4.5,.1,.08,3.6,10.6,stone);arch(wall,-32+i*4.5,.1,.10,3,10,brick);}
  bake(g);
 }
}

export {box,arch,windowArch,bake};
