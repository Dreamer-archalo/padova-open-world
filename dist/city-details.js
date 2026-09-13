import * as THREE from './vendor/three.module.js';
import {nearestOnSegment,pointInside} from './core.js';
import {box,arch,windowArch,bake} from './landmarks.js';
import {createPortelloDetails,PORTELLO_GATE} from './portello.js';
import {createChurchLayer} from './churches.js';

// Modular exterior additions. Geometry is authored, never a copied photograph.
export const POI_REGISTRY=[
 {id:'moroni',name:'Palazzo Moroni',kind:'civic'},
 {id:'savonarola',name:'Porta Savonarola',kind:'gate'},
 {id:'bo',name:'Palazzo del Bo',kind:'university',pending:true}
];
const stone='#d3c2a3',dark='#334942';
function facade(root,b,a,q,detail=false){const dx=q[0]-a[0],dz=q[1]-a[1],w=Math.hypot(dx,dz);if(w<3)return;
 const x=(a[0]+q[0])/2,z=(a[1]+q[1])/2,out=pointInside(x-dz/w*.1,z+dx/w*.1,b.p)?-1:1;
 const g=new THREE.Group();g.position.set(x-dz/w*.07*out,b.minY,z+dx/w*.07*out);g.rotation.y=Math.atan2(-dz*out,dx*out);root.add(g);
 const bays=Math.max(1,Math.floor(w/(detail?3.6:4.8))),span=w/bays;
 for(let i=0;i<bays;i++){const px=-w/2+span*(i+.5);
  for(let y=4.9;y<b.h-1.2;y+=3.1){windowArch(g,px,y,0,Math.min(1.15,span*.5),1.85);if(detail){for(const side of [-1,1])box(g,i%3?'#526651':'#756e5c',px+side*.82,y+.9,.14,.39,1.85,.11);box(g,stone,px,y-.08,.2,1.9,.15,.4);box(g,'#aab7b1',px,y+.93,.1,.055,1.5,.06);}}
  if(detail){arch(g,px,.1,.03,Math.min(2.8,span-.2),3.9,stone);arch(g,px,.1,.06,Math.min(2.3,span-.5),3.5,'#544d40');box(g,stone,px-span/2+.16,1.5,.25,.3,3,.35);
   if(i%3===0){box(g,'#4f493a',px,.95,.12,1.05,1.85,.08);box(g,'#c4a165',px+.3,.95,.19,.09,.09,.08);}else{box(g,'#627b75',px,1.2,.12,1.3,2,.06);box(g,'#c3b394',px,2.7,.15,1.7,.3,.11);}
  }
 }
 for(const y of [3.95,b.h-.15])box(g,stone,0,y,.16,w,.2,.3);
 if(detail){box(g,'#826b52',-w/2+.24,b.h/2,.22,.11,b.h,.12);for(let i=0;i<Math.ceil(w/.45);i++)box(g,'#ad7254',-w/2+i*.45,b.h+.13,.25,.35,.2,.55);}
}
function streetDetail(data){const root=new THREE.Group(),roads=data.roads.filter(r=>r.n?.toLowerCase()==='via dei tadi');root.userData.detailStreet='Via dei Tadi';let count=0;
 for(const b of data.buildings){if(b.cx< -740||b.cx> -440||b.cz< -130||b.cz>10)continue;
  for(let i=0;i<b.p.length;i++){const a=b.p[i],q=b.p[(i+1)%b.p.length],x=(a[0]+q[0])/2,z=(a[1]+q[1])/2;let nearest=null,d=Infinity;
   for(const r of roads)for(let j=1;j<r.p.length;j++){const p=nearestOnSegment(x,z,r.p[j-1],r.p[j]),dd=Math.hypot(p.x-x,p.z-z);if(dd<d){d=dd;nearest=p;}}
   if(d<3||d>15||!nearest)continue;const dx=q[0]-a[0],dz=q[1]-a[1],length=Math.hypot(dx,dz);if(length<4||Math.abs((nearest.x-x)*dx+(nearest.z-z)*dz)/length>d*.45)continue;
   facade(root,b,a,q,true);count++;
  }
 }
 root.userData.facades=count;if(root.children.length)bake(root);return root;
}
function streetLamp(root,terrain,x,z){const y=terrain.elevation(x,z);box(root,'#29373a',x,y+1.8,z,.1,3.6,.1);box(root,'#e6c47b',x,y+3.65,z,.32,.18,.32);}
function marketStall(root,terrain,x,z,color='#b7644e'){const y=terrain.elevation(x,z);box(root,'#695844',x,y+.58,z,3.4,.12,1.8);for(const sx of [-1,1])for(const sz of [-1,1])box(root,'#5a4a3c',x+sx*1.45,y+.3,z+sz*.7,.08,.6,.08);box(root,color,x,y+1.72,z,3.7,.16,2.15);for(const sx of [-1,1])box(root,'#8b765f',x+sx*1.58,y+1.16,z,.07,1.15,.07);}
function centralSquares(terrain){const root=new THREE.Group();root.userData.poi='central-squares';
 // Piazza dei Signori: restrained stone furniture and lamp rhythm around the clock-tower square.
 for(const [x,z] of [[-318,-118],[-300,-112],[-282,-112],[-264,-118],[-320,-157],[-298,-163],[-275,-163],[-254,-154]])streetLamp(root,terrain,x,z);
 for(const [x,z,yaw] of [[-306,-140,0],[-275,-145,0],[-291,-121,Math.PI/2]]){const y=terrain.elevation(x,z),bench=new THREE.Group();bench.position.set(x,y,z);bench.rotation.y=yaw;root.add(bench);box(bench,'#6f5741',0,.52,0,2.4,.12,.42);box(bench,'#3b4645',0,.27,0,2.15,.5,.08);}
 // Erbe / Frutta: small market islands so the area reads as a lived-in piazza instead of a bare road polygon.
 const stalls=[[-132,-30,'#a95a4c'],[-114,-31,'#c99b55'],[-96,-31,'#5d7d6b'],[-181,-66,'#b46a4c'],[-198,-66,'#597a85'],[-215,-66,'#c49c58']];for(const [x,z,c] of stalls)marketStall(root,terrain,x,z,c);
 return root;
}
function venetianWalls(terrain){const root=new THREE.Group();root.userData.poi='venetian-walls';const cx=-958,cz=-650,y=terrain.elevation(cx,cz);
 // Visual shoulders around Porta Savonarola. They deliberately do not register collision, so existing roads remain open.
 for(const side of [-1,1]){const x=cx+side*28;box(root,'#9a604d',x,y+2.15,cz,48,4.3,2.6);box(root,'#c2a078',x,y+4.42,cz,48.5,.22,2.9);for(let dx=-21;dx<=21;dx+=6)box(root,'#865243',x+dx,y+4.88,cz,.78,.92,2.7);}
 return root;
}
function padovaHill(terrain){const root=new THREE.Group();root.userData.poi='padova-hill';const x=-4050,z=3220,y=terrain.elevation(x,z),mat=new THREE.MeshStandardMaterial({color:'#536c47',roughness:1});
 for(const [dx,dz,sx,sy,sz] of [[0,0,95,15,72],[-70,15,60,9,46],[72,25,66,10,50]]){const mound=new THREE.Mesh(new THREE.SphereGeometry(1,18,10),mat);mound.position.set(x+dx,y-sy*.58,z+dz);mound.scale.set(sx,sy,sz);mound.receiveShadow=true;root.add(mound);}
 if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#f1ead9';c.font='900 172px Arial Black, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('PADOVA',512,132);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(48,12),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,toneMapped:false}));sign.position.set(x,y+16,z-8);sign.rotation.y=-.28;root.add(sign);for(let i=-2;i<=2;i++)box(root,'#6f6655',x+i*10,y+7,z-8,0.45,14,.45);}
 return root;
}
export function cityDetails(scene,data,terrain){const root=new THREE.Group();root.userData.poiRegistry=POI_REGISTRY;
 for(const entry of POI_REGISTRY){if(entry.pending)continue;const b=data.buildings.find(b=>b.n===entry.name);if(!b)continue;const g=new THREE.Group();g.userData.poi=entry.id;
  for(let i=0;i<b.p.length;i++)facade(g,b,b.p[i],b.p[(i+1)%b.p.length]);
  if(entry.kind==='gate'){const w=b.maxX-b.minX;box(g,stone,b.cx,b.minY+b.h+.35,b.cz,w+1,.7,b.maxZ-b.minZ+1);}
  bake(g);root.add(g);
 }
 const f=new THREE.Group();f.userData.poi='erbe-fountain';f.position.set(-77.6,terrain.elevation(-77.6,-41.7),-41.7);
 box(f,'#92918a',0,.55,0,1.1,1.1,.7);box(f,'#afaba0',0,1.16,0,1.3,.16,.85);
 for(const side of [-1,1]){box(f,'#77776e',side*.66,.65,0,.25,.14,.1);box(f,'#969389',side*.92,.28,0,.6,.38,.7);box(f,'#75a3a0',side*.92,.48,0,.45,.035,.54);box(f,'#adc9c0',side*.76,.57,0,.025,.16,.025);}bake(f);root.add(f);
 const tadi=streetDetail(data);root.add(tadi);const portello=createPortelloDetails(terrain);portello.userData.poi='portello';root.add(portello);const squares=centralSquares(terrain);root.add(squares);const walls=venetianWalls(terrain);root.add(walls);const hill=padovaHill(terrain);root.add(hill);const churches=createChurchLayer(data,terrain);root.add(churches.root);scene.add(root);
 return {root,tadi,portello,squares,walls,hill,churches,update(x,z){tadi.visible=Math.hypot(x+570,z+60)<550;portello.visible=Math.hypot(x-PORTELLO_GATE.x,z-PORTELLO_GATE.z)<650;squares.visible=Math.hypot(x+180,z+80)<850;walls.visible=Math.hypot(x+958,z+650)<850;hill.visible=Math.hypot(x+4050,z-3220)<1500;churches.update(x,z);for(const g of root.children)if(![tadi,portello,squares,walls,hill,churches.root].includes(g)){if(g.userData.poi==='erbe-fountain')g.visible=Math.hypot(x+77.6,z+41.7)<600;}}};
}
