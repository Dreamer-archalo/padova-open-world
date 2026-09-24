import * as THREE from './vendor/three.module.js';

const $=id=>document.getElementById(id);
const canvas=$('world');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true;

const scene=new THREE.Scene();
scene.background=new THREE.Color('#9eb8b6');
scene.fog=new THREE.Fog('#9eb8b6',750,3300);
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,4500);
scene.add(new THREE.HemisphereLight('#dce9e5','#6d6656',2.25));
const sun=new THREE.DirectionalLight('#ffe2b5',3.1);sun.position.set(-600,900,450);sun.castShadow=true;scene.add(sun);

const MAT={
 wall:new THREE.MeshStandardMaterial({color:'#d5b88e',roughness:.96,side:THREE.DoubleSide}),
 roof:new THREE.MeshStandardMaterial({color:'#9b5f48',roughness:1,side:THREE.DoubleSide}),
 stone:new THREE.MeshStandardMaterial({color:'#b7ac94',roughness:1,side:THREE.DoubleSide}),
 bridge:new THREE.MeshStandardMaterial({color:'#d0c1a1',roughness:1,side:THREE.DoubleSide}),
 water:new THREE.MeshStandardMaterial({color:'#4f929d',roughness:.42,metalness:.03,transparent:true,opacity:.94,side:THREE.DoubleSide}),
 park:new THREE.MeshStandardMaterial({color:'#728d62',roughness:1,side:THREE.DoubleSide})
};

let data=null,player=null,playerYaw=0,toastUntil=0,lastTime=performance.now();
const keys=new Set();
const state={x:0,z:0,speed:0};
const buildingGrid=new Map(),waterGrid=new Map(),bridgeGrid=new Map();
const CELL=70;

function progress(value,text){$('loadingBar').style.width=value+'%';$('loadingStatus').textContent=text;}
function keyFor(x,z){return Math.floor(x/CELL)+','+Math.floor(z/CELL);}
function addGrid(grid,obj,minX,minZ,maxX,maxZ){
 for(let ix=Math.floor(minX/CELL);ix<=Math.floor(maxX/CELL);ix++)for(let iz=Math.floor(minZ/CELL);iz<=Math.floor(maxZ/CELL);iz++){
  const k=ix+','+iz;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(obj);
 }
}
function pointIn(x,z,p){
 let inside=false;
 for(let i=0,j=p.length-1;i<p.length;j=i++){
  const xi=p[i][0],zi=p[i][1],xj=p[j][0],zj=p[j][1];
  if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi||1e-9)+xi))inside=!inside;
 }
 return inside;
}
function segDist(x,z,a,b){
 const dx=b[0]-a[0],dz=b[1]-a[1],den=dx*dx+dz*dz;
 const t=den?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/den)):0;
 return Math.hypot(x-(a[0]+t*dx),z-(a[1]+t*dz));
}
function nearby(grid,x,z){
 const out=[];for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const a=grid.get((Math.floor(x/CELL)+dx)+','+(Math.floor(z/CELL)+dz));if(a)out.push(...a);}
 return out;
}
function blocked(x,z){
 for(const b of nearby(buildingGrid,x,z))if(x>b.minX-.35&&x<b.maxX+.35&&z>b.minZ-.35&&z<b.maxZ+.35&&pointIn(x,z,b.p))return true;
 return false;
}
function inWater(x,z){
 for(const b of nearby(bridgeGrid,x,z))if(segDist(x,z,b.a,b.b)<b.w*.55)return false;
 for(const w of nearby(waterGrid,x,z)){
  if(w.type==='area'){if(x>=w.minX&&x<=w.maxX&&z>=w.minZ&&z<=w.maxZ&&pointIn(x,z,w.p))return true;}
  else if(segDist(x,z,w.a,w.b)<w.w*.47)return true;
 }
 return false;
}
function triPush(arr,a,b,c){arr.push(...a,...b,...c);}
function makeGeometry(positions){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();g.computeBoundingSphere();return g;
}
function polygonSurfacePositions(poly,y){
 const shape=poly.map(v=>new THREE.Vector2(v[0],v[1]));
 const tris=THREE.ShapeUtils.triangulateShape(shape,[]);
 const out=[];for(const t of tris)triPush(out,[poly[t[0]][0],y,poly[t[0]][1]],[poly[t[2]][0],y,poly[t[2]][1]],[poly[t[1]][0],y,poly[t[1]][1]]);
 return out;
}
function stripPositions(a,b,w,y){
 const dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz);if(d<.01)return [];
 const nx=-dz/d*w/2,nz=dx/d*w/2;
 const p1=[a[0]+nx,y,a[1]+nz],p2=[b[0]+nx,y,b[1]+nz],p3=[b[0]-nx,y,b[1]-nz],p4=[a[0]-nx,y,a[1]-nz];
 const out=[];triPush(out,p1,p2,p3);triPush(out,p1,p3,p4);return out;
}
function buildWorld(){
 progress(54,'Costruisco edifici e corti…');
 const walls=[],roofs=[],walks=[],bridges=[],waters=[],parks=[];
 const [minX,minZ,maxX,maxZ]=data.bounds;
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(maxX-minX,maxZ-minZ),MAT.stone);ground.rotation.x=-Math.PI/2;ground.position.set((minX+maxX)/2,-.04,(minZ+maxZ)/2);ground.receiveShadow=true;scene.add(ground);

 for(const b of data.buildings){
  const p=b.p;if(p.length<3)continue;
  const xs=p.map(v=>v[0]),zs=p.map(v=>v[1]);b.minX=Math.min(...xs);b.maxX=Math.max(...xs);b.minZ=Math.min(...zs);b.maxZ=Math.max(...zs);b.cx=(b.minX+b.maxX)/2;b.cz=(b.minZ+b.maxZ)/2;
  addGrid(buildingGrid,b,b.minX,b.minZ,b.maxX,b.maxZ);
  for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length];triPush(walls,[a[0],.12,a[1]],[c[0],.12,c[1]],[c[0],b.h,c[1]]);triPush(walls,[a[0],.12,a[1]],[c[0],b.h,c[1]],[a[0],b.h,a[1]]);}
  roofs.push(...polygonSurfacePositions(p,b.h+.03));
 }
 progress(70,'Disegno calli, ponti e canali…');
 for(const r of data.roads){
  if(r.tunnel)continue;const y=r.bridge?.56:.18;
  for(let i=1;i<r.p.length;i++){
   const a=r.p[i-1],b=r.p[i],width=r.w+(r.bridge?.45:0),out=stripPositions(a,b,width,y);(r.bridge?bridges:walks).push(...out);
   if(r.bridge){const pad=width/2+1;addGrid(bridgeGrid,{a,b,w:width},Math.min(a[0],b[0])-pad,Math.min(a[1],b[1])-pad,Math.max(a[0],b[0])+pad,Math.max(a[1],b[1])+pad);}
  }
 }
 for(const w of data.water){
  for(let i=1;i<w.p.length;i++){
   const a=w.p[i-1],b=w.p[i];waters.push(...stripPositions(a,b,w.w,.22));
   const minx=Math.min(a[0],b[0])-w.w/2,maxx=Math.max(a[0],b[0])+w.w/2,minz=Math.min(a[1],b[1])-w.w/2,maxz=Math.max(a[1],b[1])+w.w/2;
   addGrid(waterGrid,{type:'line',a,b,w:w.w},minx,minz,maxx,maxz);
  }
 }
 for(const a of data.areas){
  const xs=a.p.map(v=>v[0]),zs=a.p.map(v=>v[1]),box={type:'area',p:a.p,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};
  if(a.k==='water'){waters.push(...polygonSurfacePositions(a.p,.215));addGrid(waterGrid,box,box.minX,box.minZ,box.maxX,box.maxZ);}
  else parks.push(...polygonSurfacePositions(a.p,.19));
 }
 const specs=[[walls,MAT.wall,true],[roofs,MAT.roof,true],[walks,MAT.stone,false],[bridges,MAT.bridge,false],[waters,MAT.water,false],[parks,MAT.park,false]];
 for(const [positions,mat,shadow] of specs){if(!positions.length)continue;const m=new THREE.Mesh(makeGeometry(positions),mat);m.castShadow=shadow;m.receiveShadow=true;scene.add(m);}
}
function makePlayer(){
 const g=new THREE.Group();
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.32,.85,4,8),new THREE.MeshStandardMaterial({color:'#1b2730',roughness:.9}));body.position.y=.85;body.castShadow=true;g.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),new THREE.MeshStandardMaterial({color:'#d0aa83',roughness:1}));head.position.y=1.7;head.castShadow=true;g.add(head);
 scene.add(g);return g;
}
function safePlace(p){
 if(!p)return null;
 if(!blocked(p.x,p.z)&&!inWater(p.x,p.z))return p;
 for(let radius=3;radius<=30;radius+=3)for(let a=0;a<Math.PI*2;a+=Math.PI/8){const q={...p,x:p.x+Math.cos(a)*radius,z:p.z+Math.sin(a)*radius};if(!blocked(q.x,q.z)&&!inWater(q.x,q.z))return q;}
 return p;
}
function teleport(p){
 const q=safePlace(p);state.x=q.x;state.z=q.z;player.position.set(state.x,.2,state.z);camera.position.set(state.x-8,7,state.z+10);$('location').textContent=p.name||'Venezia';toast('Benvenuto a '+(p.name||'Venezia'));closeMap();
}
function toast(message){
 const el=$('toast');el.textContent=message;el.hidden=false;toastUntil=performance.now()+2600;
}
function nearestPlace(){
 let best=data.places[0],bd=Infinity;for(const p of data.places){const d=Math.hypot(state.x-p.x,state.z-p.z);if(d<bd){bd=d;best=p;}}
 return bd<190?best:null;
}
function move(dt){
 let f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
 let t=(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)-(keys.has('KeyD')||keys.has('ArrowRight')?1:0);
 if(t)playerYaw+=t*dt*2.25;
 const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight'))?7.2:4.2;
 const dx=Math.sin(playerYaw)*f*speed*dt,dz=Math.cos(playerYaw)*f*speed*dt;
 if(f){
  const nx=state.x+dx,nz=state.z+dz;
  if(!blocked(nx,nz)&&!inWater(nx,nz)){state.x=nx;state.z=nz;}else if(inWater(nx,nz)&&performance.now()>toastUntil)toast('Canale: qui servirà una barca.');
 }
 player.position.set(state.x,.2,state.z);player.rotation.y=playerYaw;
 const desired=new THREE.Vector3(state.x-Math.sin(playerYaw)*8,6,state.z-Math.cos(playerYaw)*8);camera.position.lerp(desired,1-Math.exp(-dt*5));camera.lookAt(state.x,1.15,state.z);
 const near=nearestPlace();$('location').textContent=near?near.name:'Venezia';
}
function mapTransform(x,z){
 const [minX,minZ,maxX,maxZ]=data.bounds,c=$('mapCanvas'),pad=28,w=c.width-pad*2,h=c.height-pad*2,s=Math.min(w/(maxX-minX),h/(maxZ-minZ)),ox=(c.width-(maxX-minX)*s)/2,oy=(c.height-(maxZ-minZ)*s)/2;
 return {x:ox+(x-minX)*s,y:oy+(z-minZ)*s,s};
}
function drawMap(){
 const c=$('mapCanvas'),ctx=c.getContext('2d');ctx.fillStyle='#17313a';ctx.fillRect(0,0,c.width,c.height);
 ctx.lineCap='round';
 ctx.strokeStyle='#6eb2bb';for(const w of data.water){ctx.beginPath();w.p.forEach((p,i)=>{const q=mapTransform(p[0],p[1]);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.lineWidth=Math.max(1.2,w.w*mapTransform(0,0).s);ctx.stroke();}
 ctx.strokeStyle='#cabd9f';ctx.lineWidth=1;for(const r of data.roads.filter(r=>!r.tunnel)){ctx.beginPath();r.p.forEach((p,i)=>{const q=mapTransform(p[0],p[1]);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.stroke();}
 for(const p of data.places){const q=mapTransform(p.x,p.z);ctx.fillStyle='#ffc56a';ctx.beginPath();ctx.arc(q.x,q.y,4,0,Math.PI*2);ctx.fill();}
 const me=mapTransform(state.x,state.z);ctx.fillStyle='white';ctx.strokeStyle='#10232c';ctx.lineWidth=3;ctx.beginPath();ctx.arc(me.x,me.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();
}
function openMap(){
 drawMap();$('places').innerHTML=data.places.map((p,i)=>'<button data-i="'+i+'"><b>'+p.name+'</b><small>'+p.tag+'</small></button>').join('');
 $('places').querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>teleport(data.places[Number(b.dataset.i)]));
 $('mapDialog').showModal();keys.clear();
}
function closeMap(){if($('mapDialog').open)$('mapDialog').close();}
function animate(now){
 requestAnimationFrame(animate);const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;if(!$('mapDialog').open)move(dt);renderer.render(scene,camera);if(performance.now()>toastUntil)$('toast').hidden=true;
}
async function init(){
 try{
  progress(10,'Scarico la geometria OpenStreetMap di Venezia…');
  const response=await fetch('./data/venice.json');if(!response.ok)throw new Error('Dati Venezia non disponibili ('+response.status+')');
  data=await response.json();progress(32,'Preparo la scena 3D…');
  await new Promise(r=>requestAnimationFrame(r));buildWorld();
  player=makePlayer();const spawn=safePlace(data.spawn);state.x=spawn.x;state.z=spawn.z;player.position.set(state.x,.2,state.z);camera.position.set(state.x-8,7,state.z+10);
  $('buildingCount').textContent=data.buildings.length.toLocaleString('it-IT');$('canalCount').textContent=data.water.length.toLocaleString('it-IT');
  globalThis.__veniceWorld={data,state,buildingGrid,waterGrid,bridgeGrid,teleport};
  progress(100,'Venezia pronta.');setTimeout(()=>{$('loading').hidden=true;$('hud').hidden=false;},300);
  requestAnimationFrame(animate);
 }catch(error){$('loadingStatus').textContent='ERRORE: '+error.message;$('loadingBar').style.width='100%';console.error(error);}
}
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();if(e.code==='KeyM'&&!e.repeat){e.preventDefault();$('mapDialog').open?closeMap():openMap();return;}if(e.code==='Escape'&&$('mapDialog').open){e.preventDefault();closeMap();return;}keys.add(e.code);});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());
$('mapBtn').onclick=openMap;$('closeMap').onclick=closeMap;$('goPadova').onclick=()=>{location.href='./index.html';};$('mapDialog').addEventListener('cancel',e=>{e.preventDefault();closeMap();});
init();
