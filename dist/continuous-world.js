import * as THREE from './vendor/three.module.js';

const $=id=>document.getElementById(id),CHUNK=320,LOAD_RADIUS=4,UNLOAD_RADIUS=6;
const canvas=$('world'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene();scene.background=new THREE.Color('#abc4c3');scene.fog=new THREE.Fog('#abc4c3',700,2500);
const camera=new THREE.PerspectiveCamera(59,innerWidth/innerHeight,.1,4200);
scene.add(new THREE.HemisphereLight('#e4efeb','#6f6859',2.15));
const sun=new THREE.DirectionalLight('#ffe3b0',2.8);sun.position.set(-250,650,380);scene.add(sun);

const mats={
 ground:new THREE.MeshStandardMaterial({color:'#829173',roughness:1}),
 road:new THREE.MeshStandardMaterial({color:'#4e5556',roughness:1,side:THREE.DoubleSide}),
 motorway:new THREE.MeshStandardMaterial({color:'#474f51',roughness:.95,side:THREE.DoubleSide}),
 water:new THREE.MeshStandardMaterial({color:'#4a929e',roughness:.38,transparent:true,opacity:.92,side:THREE.DoubleSide}),
 building:new THREE.MeshStandardMaterial({color:'#cdb38e',roughness:1})
};
let data,terrain,last=performance.now(),toastUntil=0,currentChunk='',nearVeniceShown=false;
const chunks=new Map(),loaded=new Map();
const state={x:-150,z:-49,y:0,yaw:Math.PI/2,speed:0,pitch:0,vehicle:'car'};
const MICHELANGELO_LIMIT=1000/3.6;
const PADOVA={x:-150,z:-49,name:'Padova'},VENICE_FALLBACK={x:34450,z:-3500,name:'Venezia'};
const LAGOON={minX:30000,maxX:39000,minZ:-8500,maxZ:1500,y:.15};

function progress(v,t){$('loadingBar').style.width=v+'%';$('loadingText').textContent=t;}
function keyAt(x,z){return Math.floor(x/CHUNK)+','+Math.floor(z/CHUNK);}
function bucket(key){if(!chunks.has(key))chunks.set(key,{buildings:[],roads:[],water:[],areas:[]});return chunks.get(key);}
function centroid(p){let x=0,z=0;for(const q of p){x+=q[0];z+=q[1];}return {x:x/p.length,z:z/p.length};}
function addSegment(kind,src,a,b){const cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2;bucket(keyAt(cx,cz))[kind].push({a,b,w:src.w||4,k:src.k||'',b:!!src.b});}
function indexWorld(){
 for(const b of data.buildings||[]){if(b.p?.length<3)continue;const c=centroid(b.p);bucket(keyAt(c.x,c.z)).buildings.push(b);}
 for(const r of data.roads||[])for(let i=1;i<r.p.length;i++)addSegment('roads',r,r.p[i-1],r.p[i]);
 for(const w of data.water||[])for(let i=1;i<w.p.length;i++)addSegment('water',w,w.p[i-1],w.p[i]);
 for(const a of data.areas||[]){if(a.p?.length<3)continue;const c=centroid(a.p);bucket(keyAt(c.x,c.z)).areas.push(a);}
}
function terrainHeight(x,z){
 const g=terrain,u=Math.max(0,Math.min(g.width-1,(x-g.x0)/g.step)),v=Math.max(0,Math.min(g.height-1,(z-g.z0)/g.step));
 const i=Math.min(g.width-2,Math.floor(u)),j=Math.min(g.height-2,Math.floor(v)),a=u-i,b=v-j,h=(ix,jz)=>g.heights[jz*g.width+ix];
 return h(i,j)*(1-a)*(1-b)+h(i+1,j)*a*(1-b)+h(i,j+1)*(1-a)*b+h(i+1,j+1)*a*b;
}
function installLagoon(){
 const width=LAGOON.maxX-LAGOON.minX,depth=LAGOON.maxZ-LAGOON.minZ;
 const water=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),mats.water);
 water.rotation.x=-Math.PI/2;water.position.set((LAGOON.minX+LAGOON.maxX)/2,LAGOON.y,(LAGOON.minZ+LAGOON.maxZ)/2);
 water.renderOrder=1;scene.add(water);
}
function strip(out,a,b,w,yA,yB){
 const dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz);if(d<.05)return;
 const nx=-dz/d*w/2,nz=dx/d*w/2,p1=[a[0]+nx,yA,a[1]+nz],p2=[b[0]+nx,yB,b[1]+nz],p3=[b[0]-nx,yB,b[1]-nz],p4=[a[0]-nx,yA,a[1]-nz];
 out.push(...p1,...p2,...p3,...p1,...p3,...p4);
}
function geom(pos){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();g.computeBoundingSphere();return g;}
function terrainTile(ix,iz){
 const steps=8,size=CHUNK,verts=[],indices=[];
 for(let z=0;z<=steps;z++)for(let x=0;x<=steps;x++){const wx=ix*size+x/steps*size,wz=iz*size+z/steps*size;verts.push(wx,terrainHeight(wx,wz)-.08,wz);}
 for(let z=0;z<steps;z++)for(let x=0;x<steps;x++){const a=z*(steps+1)+x,b=a+1,c=a+steps+1,d=c+1;indices.push(a,c,b,b,c,d);}
 const g=geom(verts);g.setIndex(indices);g.computeVertexNormals();const m=new THREE.Mesh(g,mats.ground);m.receiveShadow=true;return m;
}
function buildChunk(key){
 if(loaded.has(key))return;const src=chunks.get(key);if(!src)return;
 const [ix,iz]=key.split(',').map(Number),group=new THREE.Group();group.userData.key=key;group.add(terrainTile(ix,iz));
 const road=[],motorway=[],water=[];
 for(const r of src.roads){const bridgeBase=r.b&&(r.a[0]>LAGOON.minX||r.b[0]>LAGOON.minX)?LAGOON.y+2.8:-Infinity,yA=Math.max(terrainHeight(r.a[0],r.a[1])+.08,bridgeBase),yB=Math.max(terrainHeight(r.b[0],r.b[1])+.08,bridgeBase);strip(/motorway|trunk/.test(r.k)?motorway:road,r.a,r.b,r.w,yA,yB);}
 for(const w of src.water){const yA=terrainHeight(w.a[0],w.a[1])-.25,yB=terrainHeight(w.b[0],w.b[1])-.25;strip(water,w.a,w.b,w.w,yA,yB);}
 if(road.length)group.add(new THREE.Mesh(geom(road),mats.road));if(motorway.length)group.add(new THREE.Mesh(geom(motorway),mats.motorway));if(water.length)group.add(new THREE.Mesh(geom(water),mats.water));
 if(src.buildings.length){
   const geo=new THREE.BoxGeometry(1,1,1),inst=new THREE.InstancedMesh(geo,mats.building,src.buildings.length),matrix=new THREE.Matrix4();
   src.buildings.forEach((b,i)=>{const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,h=Math.max(2.8,Math.min(75,b.h||7)),y=terrainHeight(cx,cz)+h/2;matrix.compose(new THREE.Vector3(cx,y,cz),new THREE.Quaternion(),new THREE.Vector3(Math.max(1.2,maxX-minX),h,Math.max(1.2,maxZ-minZ)));inst.setMatrixAt(i,matrix);});
   inst.instanceMatrix.needsUpdate=true;group.add(inst);
 }
 scene.add(group);loaded.set(key,group);
}
function stream(force=false){
 const key=keyAt(state.x,state.z);if(!force&&key===currentChunk)return;currentChunk=key;
 const [cx,cz]=key.split(',').map(Number),wanted=new Set();
 for(let dx=-LOAD_RADIUS;dx<=LOAD_RADIUS;dx++)for(let dz=-LOAD_RADIUS;dz<=LOAD_RADIUS;dz++){if(dx*dx+dz*dz>LOAD_RADIUS*LOAD_RADIUS+3)continue;const k=(cx+dx)+','+(cz+dz);if(chunks.has(k)){wanted.add(k);buildChunk(k);}}
 for(const [k,g] of loaded){const [ix,iz]=k.split(',').map(Number);if(Math.hypot(ix-cx,iz-cz)>UNLOAD_RADIUS){scene.remove(g);g.traverse(o=>o.geometry?.dispose?.());loaded.delete(k);}}
}
function makeCar(){
 const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(1.9,.65,4.2),new THREE.MeshStandardMaterial({color:'#24343a',roughness:.8}));body.position.y=.65;g.add(body);
 const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.55,.65,1.9),new THREE.MeshStandardMaterial({color:'#76909a',roughness:.4}));cabin.position.set(0,1.18,-.15);g.add(cabin);
 for(const x of [-.92,.92])for(const z of [-1.25,1.25]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.28,12),new THREE.MeshStandardMaterial({color:'#171a1b'}));w.rotation.z=Math.PI/2;w.position.set(x,.38,z);g.add(w);}
 scene.add(g);return g;
}
const car=makeCar();
function makeMichelangelo(){
 const g=new THREE.Group(),body='#e5e2d6',trim='#1c5570',part=(color,x,y,z,w,h,l,yaw=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),new THREE.MeshStandardMaterial({color,metalness:.18,roughness:.48}));m.position.set(x,y,z);m.scale.set(w,h,l);m.rotation.y=yaw;g.add(m);};
 part(body,0,0,0,2.4,1.6,20);part(body,0,-.15,10.5,1.3,.85,4);part(trim,0,.48,6,1.5,.28,4);
 for(const side of [-1,1]){part(body,side*3,-.25,-1.4,6.5,.25,6.8,side*.12);part(trim,side*5.6,-.09,-2.2,.8,.07,4.9,side*.12);part(body,side*2.2,0,-9,3.9,.16,3);part('#364b59',side*2,-.8,-9,.9,1.3,3.1);}
 part(trim,0,1.35,-8.7,.25,3,3.6);g.name='Michelangelo · Venezia 1.000 km/h';scene.add(g);g.visible=false;return g;
}
const michelangelo=makeMichelangelo();
function nearestPlace(){
 let best={name:'Tra Padova e Venezia'},bd=Infinity;for(const p of data.places||[]){const d=Math.hypot(state.x-p.x,state.z-p.z);if(d<bd){bd=d;best=p;}}
 return bd<2500?best:{name:'Corridoio Padova–Venezia'};
}
function venicePoint(){return (data.places||[]).find(p=>/Piazzale Roma/i.test(p.name))||(data.places||[]).find(p=>/San Marco/i.test(p.name))||VENICE_FALLBACK;}
function teleport(p,msg){state.x=p.x;state.z=p.z;state.speed=0;if(state.vehicle==='michelangelo')state.y=terrainHeight(state.x,state.z)+130;stream(true);toast(msg);drawMap();}
function toast(t,s=3){$('toast').textContent=t;$('toast').hidden=false;toastUntil=performance.now()+s*1000;}
function flightUpdate(dt){
 const f=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),tab=keys.has('Tab'),brake=keys.has('ControlLeft')||keys.has('ControlRight');
 const cap=tab?MICHELANGELO_LIMIT:215;
 state.speed=Math.max(35,Math.min(cap,state.speed+(tab?34:f>0?20:f<0?-36:-.45)*dt-(brake?47*dt:0)));
 const turn=(keys.has('KeyA')?1:0)-(keys.has('KeyD')?1:0),climb=(keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0);
 state.yaw+=turn*dt*.22;state.pitch=Math.max(-.52,Math.min(.42,state.pitch+climb*.5*dt));if(!climb)state.pitch*=Math.exp(-dt*.25);
 state.x+=Math.sin(state.yaw)*state.speed*dt;state.z+=Math.cos(state.yaw)*state.speed*dt;
 state.y=Math.max(terrainHeight(state.x,state.z)+4,state.y+Math.sin(state.pitch)*state.speed*.52*dt);
 michelangelo.position.set(state.x,state.y,state.z);michelangelo.rotation.set(-state.pitch,state.yaw,turn*.06,'YXZ');car.visible=false;michelangelo.visible=true;
 const back=37+state.speed*.09,desired=new THREE.Vector3(state.x-Math.sin(state.yaw)*back,state.y+17+state.speed*.035,state.z-Math.cos(state.yaw)*back);
 camera.position.lerp(desired,1-Math.exp(-dt*4));camera.lookAt(state.x+Math.sin(state.yaw)*60,state.y+Math.sin(state.pitch)*25,state.z+Math.cos(state.yaw)*60);
 stream();const v=venicePoint(),d=Math.hypot(state.x-v.x,state.z-v.z);
 $('distance').textContent='Venezia · '+(d/1000).toFixed(1)+' km';$('speed').textContent='MICHELANGELO · '+Math.round(state.speed*3.6)+' / 1.000 km/h';$('location').textContent=nearestPlace().name;
 const enter=$('enterVenice');if(enter)enter.hidden=d>1800;
 if(d<1800&&!nearVeniceShown){nearVeniceShown=true;toast('Michelangelo: Venezia raggiunta. Premi VAI A VENEZIA per entrare nella mappa dettagliata.',6);}
 if(performance.now()>toastUntil)$('toast').hidden=true;
}
function update(dt){
 if(state.vehicle==='michelangelo'){flightUpdate(dt);return;}
 let throttle=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),steer=(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)-(keys.has('KeyD')||keys.has('ArrowRight')?1:0);
 const max=keys.has('ShiftLeft')||keys.has('ShiftRight')?72:50;state.speed+=throttle*24*dt;state.speed*=Math.pow(.986,dt*60);state.speed=Math.max(-12,Math.min(max,state.speed));
 if(Math.abs(state.speed)>.4)state.yaw+=steer*dt*(1.45*Math.min(1,Math.abs(state.speed)/12))*(state.speed>=0?1:-1);
 state.x+=Math.sin(state.yaw)*state.speed*dt;state.z+=Math.cos(state.yaw)*state.speed*dt;
 const y=terrainHeight(state.x,state.z)+.2;car.position.set(state.x,y,state.z);car.rotation.y=state.yaw;
 const back=11+Math.min(9,Math.abs(state.speed)*.12),target=new THREE.Vector3(state.x-Math.sin(state.yaw)*back,y+7.2,state.z-Math.cos(state.yaw)*back);
 camera.position.lerp(target,1-Math.exp(-dt*5));camera.lookAt(state.x,y+1,state.z);
 stream();
 const v=venicePoint(),d=Math.hypot(state.x-v.x,state.z-v.z);
 $('distance').textContent='Venezia · '+(d/1000).toFixed(1)+' km';$('speed').textContent=Math.round(Math.abs(state.speed)*3.6)+' km/h';$('location').textContent=nearestPlace().name;
 if(d<1800&&!nearVeniceShown){nearVeniceShown=true;toast('Venezia è nello stesso mondo: continua verso Piazzale Roma oppure usa il fast travel.',5);}
 if(performance.now()>toastUntil)$('toast').hidden=true;
}
const keys=new Set();
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.05,(now-last)/1000);last=now;if(!$('mapDialog').open)update(dt);renderer.render(scene,camera);}
function mapXY(x,z){const b=data.bounds,pad=35,w=$('mapCanvas').width-2*pad,h=$('mapCanvas').height-2*pad,s=Math.min(w/(b[2]-b[0]),h/(b[3]-b[1])),ox=($('mapCanvas').width-(b[2]-b[0])*s)/2,oy=($('mapCanvas').height-(b[3]-b[1])*s)/2;return {x:ox+(x-b[0])*s,y:oy+(z-b[1])*s,s};}
function drawMap(){
 const c=$('mapCanvas'),ctx=c.getContext('2d');ctx.fillStyle='#18323a';ctx.fillRect(0,0,c.width,c.height);ctx.lineCap='round';
 ctx.strokeStyle='#72878b';ctx.lineWidth=1;let shown=0;for(const r of data.roads||[]){if(!/motorway|trunk|primary|secondary/.test(r.k)&&shown++%7)continue;ctx.beginPath();r.p.forEach((p,i)=>{const q=mapXY(p[0],p[1]);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.stroke();}
 const a=mapXY(PADOVA.x,PADOVA.z),v=mapXY(venicePoint().x,venicePoint().z),me=mapXY(state.x,state.z);
 for(const [p,color,r] of [[a,'#e7bf78',7],[v,'#6fc2d0',7],[me,'#ffffff',8]]){ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle='#f0e9dc';ctx.font='700 18px system-ui';ctx.fillText('PADOVA',a.x+10,a.y-10);ctx.fillText('VENEZIA',v.x+10,v.y-10);
}
function openMap(){drawMap();$('mapDialog').showModal();keys.clear();}
async function init(){
 try{
  progress(8,'Carico il mondo unico…');const [wr,tr]=await Promise.all([fetch('./data/world-padova-venice.json'),fetch('./data/world-terrain.json')]);if(!wr.ok)throw new Error('world map '+wr.status);if(!tr.ok)throw new Error('terrain '+tr.status);
  data=await wr.json();progress(35,'Indicizzo Padova, corridoio e Venezia…');terrain=await tr.json();installLagoon();await new Promise(r=>requestAnimationFrame(r));indexWorld();progress(68,'Preparo lo streaming dei settori…');
  const q=new URLSearchParams(location.search);if(q.get('spawn')==='venice'){const v=venicePoint();state.x=v.x;state.z=v.z;state.yaw=-Math.PI/2;}
  if(q.get('vehicle')==='michelangelo'){
   state.vehicle='michelangelo';
   for(const key of ['x','z','yaw']){const num=Number(q.get(key));if(q.has(key)&&Number.isFinite(num))state[key]=num;}
   if(!q.has('yaw'))state.yaw=Math.PI/2;
   const [x0,z0,x1,z1]=data.bounds;state.x=Math.max(x0+50,Math.min(x1-50,state.x));state.z=Math.max(z0+50,Math.min(z1-50,state.z));
   const requested=Number(q.get('y'));state.y=Math.max(terrainHeight(state.x,state.z)+90,Number.isFinite(requested)&&requested>0?requested:0);
   const starting=Number(q.get('speed'));state.speed=Number.isFinite(starting)?Math.max(35,Math.min(MICHELANGELO_LIMIT,starting)):75;
   $('speed').textContent='MICHELANGELO · '+Math.round(state.speed*3.6)+' / 1.000 km/h';
   const info=document.querySelector('#hud .controls');if(info)info.textContent='MICHELANGELO · W/S accelera-frena · TAB 1.000 km/h · CTRL frena · A/D curva · ↑/↓ quota · M mappa';
  }
  stream(true);const y=state.vehicle==='michelangelo'?state.y:terrainHeight(state.x,state.z)+.2;car.position.set(state.x,y,state.z);michelangelo.position.set(state.x,y,state.z);car.visible=state.vehicle!=='michelangelo';michelangelo.visible=!car.visible;camera.position.set(state.x-12,y+8,state.z-14);
  globalThis.__continuousWorld={state,scene,car,michelangelo,venicePoint,teleport};
  progress(100,'Mondo continuo pronto.');requestAnimationFrame(animate);setTimeout(()=>{const loading=$('loading');loading.hidden=true;loading.style.display='none';$('hud').hidden=false;},250);
 }catch(error){console.error(error);$('loadingText').textContent='ERRORE: '+error.message;$('loadingBar').style.width='100%';}
}
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Tab','ControlLeft','ControlRight'].includes(e.code))e.preventDefault();if(e.code==='KeyM'&&!e.repeat){e.preventDefault();$('mapDialog').open?$('mapDialog').close():openMap();return;}keys.add(e.code);});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());
$('mapBtn').onclick=openMap;$('closeMap').onclick=()=>$('mapDialog').close();$('mapDialog').addEventListener('cancel',e=>{e.preventDefault();$('mapDialog').close();});
$('fastPadova').onclick=()=>teleport(PADOVA,'Fast travel: Padova.');$('fastVenice').onclick=()=>teleport(venicePoint(),'Fast travel: Venezia.');
$('backFull').onclick=()=>location.href='./index.html';$('veniceFull').onclick=()=>location.href='./venice.html';
$('enterVenice').onclick=()=>{location.href='./venice.html';};
init();
