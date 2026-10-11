import {registerRoofMesh} from './roof-surfaces.js?v=villa-performance-r43-1';
import * as THREE from './vendor/three.module.js';

const asphalt=new THREE.MeshStandardMaterial({color:'#343f43',roughness:.94}),line=new THREE.MeshBasicMaterial({color:'#f3e8c6'}),wall=new THREE.MeshStandardMaterial({color:'#d9d9cf',roughness:.85}),trim=new THREE.MeshStandardMaterial({color:'#174251',roughness:.65}),glass=new THREE.MeshStandardMaterial({color:'#7997a1',roughness:.3,metalness:.25}),light=new THREE.MeshBasicMaterial({color:'#ffd889'}),rubber=new THREE.MeshStandardMaterial({color:'#202728',roughness:.95}),tools=new THREE.MeshStandardMaterial({color:'#bb533b',roughness:.62});
const point=(road,along,out,side)=>({x:road.x+Math.sin(road.yaw)*along+Math.cos(road.yaw)*out*side,z:road.z+Math.cos(road.yaw)*along-Math.sin(road.yaw)*out*side});
const height=(terrain,p,reference)=>terrain.height(p.x,p.z,reference);

// Only build on a clear, dry verge. The first paving strip touches the road
// edge, so the player can turn in directly from the signed carriageway.
export function planWorkshopYard(road,terrain,clear,site){
 if(!road||!Number.isFinite(road.x)||!Number.isFinite(road.z))return null;
 const width=road.road?.w||6,base=road.y??height(terrain,road),towards=(site.x-road.x)*Math.cos(road.yaw)-(site.z-road.z)*Math.sin(road.yaw);
 const sides=towards<0?[-1,1]:[1,-1],shifts=[0,22,-22,44,-44,68,-68];
 for(const shift of shifts)for(const side of sides){
  const entrance={...point(road,shift,0,side),yaw:road.yaw},roadY=height(terrain,entrance,base),surface=(along,out)=>{const p=point(entrance,along,out,side);return {...p,y:height(terrain,p,roadY)};};
  const probe=[[0,width/2+2,2.5],[0,9,2.2],[0,16,2.2],[-6,10,2],[6,10,2],[-6,20,1.5],[6,20,1.5],[0,23,2],[-3,27,1.2],[3,27,1.2]];
  if(probe.some(([a,o,r])=>{const p=surface(a,o);return Math.abs(p.y-roadY)>1.05||!terrain.dry(p.x,p.z,r,p.y)||!clear(p.x,p.z,p.y,r);}))continue;
  return {road:{...entrance,y:roadY,yaw:road.yaw,kind:road.road?.k||road.segment?.road?.k},side,width,surface,
   parking:surface(-5,12),display:surface(6,12),service:surface(0,19),staff:surface(3,24),
   name:site.name};
 }
 return null;
}

export function findWorkshopYard(site,safeRoad,terrain,clear){
 const tried=new Set();
 for(const radius of [0,75,150,250,350])for(let i=0;i<(radius?8:1);i++){
  const p=radius?{x:site.x+Math.cos(i*Math.PI/4)*radius,z:site.z+Math.sin(i*Math.PI/4)*radius}:site,
   road=safeRoad(p);if(!road||Math.hypot(road.x-site.x,road.z-site.z)>650)continue;
  const key=Math.round(road.x/10)+','+Math.round(road.z/10);if(tried.has(key))continue;tried.add(key);
  const yard=planWorkshopYard(road,terrain,clear,site);if(yard)return yard;
 }
 return null;
}

export function registerWorkshopWalls(layout,collision){
 if(!collision?.add)return;
 for(const [a0,a1,o0,o1] of [[-6.2,6.2,27.8,28.2],[-6.2,-5.85,18,28.2],[5.85,6.2,18,28.2]]){
  const corners=[[a0,o0],[a1,o0],[a1,o1],[a0,o1]].map(([a,o])=>layout.surface(a,o)),xs=corners.map(p=>p.x),zs=corners.map(p=>p.z),ys=corners.map(p=>p.y),
   wall={p:corners.map(p=>[p.x,p.z]),minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:Math.min(...ys),h:5+Math.max(...ys)-Math.min(...ys)};
  collision.add(wall,wall.minX,wall.minZ,wall.maxX,wall.maxZ);
 }
}

function box(group,material,w,h,d,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.receiveShadow=true;group.add(m);return m;}
function paving(group,terrain,layout,along,out,w,d,material=asphalt){const p=layout.surface(along,out),roadY=layout.road.y;
 return box(group,material,d,.09,w,out*layout.side,p.y-roadY+.025,along);}
function label(text){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#174251';ctx.fillRect(0,0,512,128);ctx.fillStyle='#ffe0a0';ctx.textAlign='center';ctx.font='bold 32px sans-serif';ctx.fillText('OFFICINA · E',256,54);ctx.font='22px sans-serif';ctx.fillText(text,256,94,490);return new THREE.CanvasTexture(canvas);}

export function createWorkshopYard(layout,scene,terrain,createPerson,site){
 const group=new THREE.Group(),{road,side,width}=layout;group.position.set(road.x,road.y,road.z);group.rotation.y=road.yaw;scene.add(group);
 // Local +Z is along the road. Rotate the workshop frontage toward the lane.
 // Each paving section follows the underlying surface instead of using a
 // building minimum Y, which previously submerged staff on uneven plots.
 for(const depth of [width/2+1,9,14,19,23])paving(group,terrain,layout,0,depth,14,5);
 const back=layout.surface(0,26),floor=back.y-road.y;
 box(group,wall,.3,4.3,12,28*side,floor+2.15,0);
 for(const a of [-6,6])box(group,trim,10,4.8,.35,23*side,floor+2.4,a);
 const roof=box(group,trim,10,.4,12.5,23*side,floor+4.8,0);roof.name=site.name+' · tetto';registerRoofMesh(terrain,roof);
 box(group,glass,.12,.65,11,18*side,floor+4.25,0);
 box(group,light,.12,.10,10,18*side,floor+3.91,0);
 for(const a of [-5,5])for(const o of [8,15]){
  const p=layout.surface(a,o),dy=p.y-road.y;
  box(group,line,4.8,.014,.09,o*side,dy+.08,a);
 }
 for(const o of [8,15]){const p=layout.surface(0,o);box(group,line,.08,.014,10,o*side,p.y-road.y+.08,0);}
 const arrow=layout.surface(0,width/2+1.8);box(group,line,.14,.02,1.8,(width/2+1.8)*side,arrow.y-road.y+.09,0);
 const signTexture=label(site.name),sign=new THREE.Mesh(new THREE.PlaneGeometry(5.8,1.45),new THREE.MeshBasicMaterial({map:signTexture,side:THREE.DoubleSide}));sign.position.set(19*side,floor+5.55,0);sign.rotation.y=side>0?-Math.PI/2:Math.PI/2;group.add(sign);group.userData.signTexture=signTexture;
 const way=layout.surface(-8,width/2+3),roadside=new THREE.Mesh(new THREE.PlaneGeometry(3.1,.78),new THREE.MeshBasicMaterial({map:signTexture,side:THREE.DoubleSide}));roadside.position.set((width/2+3)*side,way.y-road.y+3.1,-8);roadside.rotation.y=sign.rotation.y;group.add(roadside);
 box(group,trim,.13,3,.13,(width/2+3)*side,way.y-road.y+1.5,-8);
 for(const a of [-5.2,5.2]){const p=layout.surface(a,25),y=p.y-road.y;
  box(group,tools,1.05,1.1,.9,25*side,y+.55,a);
  for(let i=0;i<2;i++){const tyre=new THREE.Mesh(new THREE.TorusGeometry(.43,.16,8,12),rubber);tyre.rotation.x=Math.PI/2;tyre.position.set(26.3*side,y+.2+i*.31,a);group.add(tyre);}
 }
 const people=[];
 const add=(role,a,o,color,variant)=>{const p=layout.surface(a,o),mesh=createPerson(color,variant);mesh.position.set(p.x,p.y+.035,p.z);scene.add(mesh);const actor={role,a,o,mesh,base:mesh.position.y,variant};people.push(actor);return actor;};
 if(createPerson){add('mechanic',-2,22,'#246a79',2);add('mechanic',3,24,'#25576b',5);add('customer',-3,16,'#b99371',1);add('customer',4,16,'#887e9c',3);}
 return {group,people,layout};
}

export function animateWorkshopYard(entry,time,terrain){
 const {layout,people,group}=entry,near=entry.visible!==false;group.visible=near;
 for(const p of people){p.mesh.visible=near;if(!near)continue;
  const walk=p.role==='mechanic'&&p.variant===2,phase=time*.52+p.variant;
  const a=p.a+(walk?Math.sin(phase)*2.4:Math.sin(phase*.55)*.17),o=p.o+(walk?Math.cos(phase)*1.2:0),pos=layout.surface(a,o);
  p.mesh.position.set(pos.x,pos.y+.035,pos.z);p.mesh.rotation.y=walk?layout.road.yaw+(Math.cos(phase)<0?Math.PI:0):layout.road.yaw+(p.role==='customer'?layout.side:-layout.side)*Math.PI/2;
  const swing=walk?Math.cos(phase)*.42:Math.sin(time*1.4+p.variant)*.15;
  for(const [i,leg] of [...(p.mesh.userData.hips?.children||[])].entries())leg.rotation.x=(i?1:-1)*swing;
  for(const [i,arm] of [...(p.mesh.userData.arms?.children||[])].entries())arm.rotation.x=(i?-1:1)*swing+(p.role==='mechanic'&&p.variant===5&&i===0?-.35:0);
 }
}
