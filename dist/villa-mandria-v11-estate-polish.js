// V11 private estate polish. No change to city AI, missions, online, or vehicle controls.
import * as THREE from './vendor/three.module.js';
import {VILLA,areaPoint,areaLocal} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
const at=(u,v)=>areaPoint(VILLA,u,v),dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const free=(g,u,v,r=1.1)=>u>-124&&u<124&&v>-89&&v<54&&mandriaFree(g,u,v,r,3.1);
function line(g,a,b,r=1.1){const d=dist(a,b),n=Math.max(1,Math.ceil(d/1.05));let last=null;
 for(let i=0;i<=n;i++){const t=i/n,u=a[0]+(b[0]-a[0])*t,v=a[1]+(b[1]-a[1])*t;if(!free(g,u,v,r))return false;
  const p=at(u,v),y=g.terrain.height(p.x,p.z);if(last!==null&&Math.abs(y-last)>.44)return false;last=y;
 }return true;}
const pathSafe=(g,p,r=1.1)=>p.length>1&&p.every((v,i)=>i===0?free(g,...v,r):line(g,p[i-1],v,r));
function makeServiceLanes(g,s){const cars=g.villaV3.patrols.filter(c=>c.mandriaPatrol==='ape'&&c.route?.length>40),alternate=[];let sections=0;
 // Offset only short, validated stretches; unchanged endpoints preserve each
 // car's original approved perimeter route and avoid snapping a moving car.
 for(const [index,c] of cars.entries()){
  if(c===g.state.car)continue;
  const original=c.route.slice(0,-1),N=original.length,route=original.map(p=>[...p]),changed=new Set();let accepted=0;
  for(const fraction of [.17,.43,.69]){
   const center=Math.floor(N*fraction+(index%3-1)*7),radius=11;
   for(const amount of [index%2?3.2:-3.2,index%2?2.0:-2.0,index%2?1.2:-1.2]){
    const candidate=route.map(p=>[...p]);
    for(let j=Math.max(1,center-radius);j<=Math.min(N-2,center+radius);j++){
     const a=original[(j-1+N)%N],b=original[(j+1)%N],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;
     const f=Math.sin(Math.PI*(j-(center-radius))/(radius*2));const shift=amount*Math.max(0,f*f);
     candidate[j]=[original[j][0]-dz/l*shift,original[j][1]+dx/l*shift];
    }
    const low=Math.max(1,center-radius-1),high=Math.min(N-1,center+radius+1);
    if(!pathSafe(g,candidate.slice(low-1,high+1),1.12))continue;
    for(let j=low;j<high;j++)if(dist(candidate[j],original[j])>.08){route[j]=candidate[j];changed.add(j);}
    accepted++;break;
   }
  }
  if(accepted){c.route=[...route,[...route[0]]];alternate.push({car:c,points:route,changed});sections+=accepted;}
 }
 s.report.serviceCars=alternate.length;s.report.separatedSections=sections;
 if(alternate.length)gravel(g,s.root,alternate);
}
function gravel(g,root,lanes){const vertices=[];
 for(const {points,changed} of lanes)for(let j=1;j<points.length;j++){
  if(!changed.has(j)&&!changed.has(j-1))continue;
  const a=at(...points[j-1]),b=at(...points[j]),dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
  if(len<.08)continue;const nx=-dz/len*.87,nz=dx/len*.87;
  const ya=g.terrain.height(a.x,a.z)+.045,yb=g.terrain.height(b.x,b.z)+.045;
  const A=[a.x+nx,ya,a.z+nz],B=[a.x-nx,ya,a.z-nz],C=[b.x+nx,yb,b.z+nz],D=[b.x-nx,yb,b.z-nz];vertices.push(...A,...B,...C,...C,...B,...D);
 }
 if(!vertices.length)return;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:'#856e50',roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const lane=new THREE.Mesh(geometry,material);lane.name='Mandria v11 · sentieri di servizio sterrati validati';lane.receiveShadow=false;lane.castShadow=false;root.add(lane);
}
const ZONES={carriola:[[-104,-69],[-106,30]],aratro:[[100,-74],[-87,-77]],raccolta:[[100,-27],[94,-62]],casse:[[-69,-72],[83,-42]],pecore:[[-101,-27],[-93,-61]],irrigazione:[[104,18]],cavalli:[[71,-57]],gruppo:[[-57,-71]],ronda:[[54,-69]],fieno:[[-91,13]],gioco:[[47,-72]]};
function zoneFor(actor){const candidates=ZONES[actor.kind]||[],n=actor.kind==='raccolta'?actor.index===12?1:0:actor.kind==='casse'?actor.index===11?1:0:actor.kind==='carriola'?actor.index===13?1:0:actor.kind==='aratro'?actor.index===16?1:0:actor.kind==='pecore'?actor.index===17?1:0:0;return candidates[Math.min(n,candidates.length-1)]||null;}
function workZones(g,s){let zoned=0;for(const actor of g.villaV9.actors){const zone=zoneFor(actor);if(!zone)continue;
  const radius=actor.kind==='cavalli'?1.3:.72,starts=[[zone[0]-7,zone[1]-3],[zone[0]+4,zone[1]+2],[zone[0]-2,zone[1]-7],[...zone]];
  let choice=null;for(const start of starts){const goals=[[start[0]+11,start[1]+3],[start[0]-10,start[1]+2],[start[0]+3,start[1]+9]];
   choice=goals.map(b=>[start,b]).find(pair=>line(g,...pair,radius));if(choice)break;
  }if(!choice)continue;
  const current=areaLocal(VILLA,actor.root.position.x,actor.root.position.z),far=Math.hypot(g.state.x-actor.root.position.x,g.state.z-actor.root.position.z)>65;
  if(dist([current.u,current.v],choice[0])>18&&!far)continue;
  if(dist([current.u,current.v],choice[0])>18){const p=at(...choice[0]);actor.root.position.set(p.x,g.terrain.height(p.x,p.z),p.z);}
  actor.route=choice;actor.target=1;actor.phase='travel';actor.v11Zone=zone;actor.v11Home=choice;actor.v11Cycle=actor.cycle;zoned++;
 }s.report.zonedWorkers=zoned;}
function keepWorkersZoned(g,s){for(const actor of g.villaV9.actors){if(!actor.v11Zone||actor.cycle===actor.v11Cycle)continue;
  actor.v11Cycle=actor.cycle;if(dist(actor.route[1],actor.v11Zone)>17){
   const endpoint=actor.v11Home[1];if(line(g,actor.route[0],endpoint,actor.kind==='cavalli'?1.3:.72))actor.route[1]=[...endpoint];
  }
 }}
function separateHorses(g,s){const herd=g.villaV10.roaming||[],apes=g.villaV3.patrols.filter(c=>c.mandriaPatrol==='ape'&&c.route?.length>30);let reviewed=0,rerouted=0;
 for(const h of herd){const minToCars=p=>Math.min(...apes.flatMap(c=>c.route.filter((_,i)=>i%5===0).map(a=>dist(p,a))));
  if(h.route.every(p=>minToCars(p)>5.3)){reviewed++;continue;}
  let improved=null;for(const inset of [7,11,15]){
   const route=h.route.map(([u,v])=>{const dx=-u,dv=-15-v,l=Math.hypot(dx,dv)||1;return [u+dx/l*inset,v+dv/l*inset];});
   if(route.every(p=>minToCars(p)>5.3)&&pathSafe(g,route,1.1)){improved=route;break;}
  }
  if(improved){h.route=improved;const p=at(...improved[0]);h.model.position.set(p.x,g.terrain.height(p.x,p.z),p.z);h.target=1;rerouted++;}
  reviewed++;
 }s.report.horseRoutesReviewed=reviewed;s.report.horseRoutesSeparated=rerouted;
}
function shadows(root,enabled){root.traverse(o=>{if(!o.isMesh)return;if(o.userData.v11OriginalShadow===undefined)o.userData.v11OriginalShadow=!!o.castShadow;
  o.castShadow=enabled&&o.userData.v11OriginalShadow;});}
function distanceDetail(g,s){if(g.state.elapsed<s.nextLOD)return;s.nextLOD=g.state.elapsed+.38;
 for(const actor of g.villaV9.actors){const d=Math.hypot(g.state.x-actor.root.position.x,g.state.z-actor.root.position.z),level=d<80?'near':d<185?'mid':'far';
  if(actor.v11Detail===level)continue;actor.v11Detail=level;shadows(actor.root,level==='near');s.report.lodChanges++;
 }
 for(const patch of g.villaLife.pastures||[])for(const animal of patch.animals){const d=Math.hypot(g.state.x-animal.a.position.x,g.state.z-animal.a.position.z),level=d<95?'near':'far';
  if(animal.v11Detail===level)continue;animal.v11Detail=level;shadows(animal.a,level==='near');s.report.lodChanges++;
 }
}
function testLocation(g,options){for(const [u,v] of options){const p=at(u,v);if(mandriaFree(g,u,v,.85,2.3)&&Number.isFinite(g.terrain.height(p.x,p.z)))return p;}return null;}
function showMenu(g,s){if(typeof document==='undefined'||s.menu)return;
 const allowed=location.pathname.includes('/preview/')||new URLSearchParams(location.search).has('estateDebug');if(!allowed)return;
 const css=document.createElement('style');css.textContent=`#mandriaV11Qa{position:fixed;z-index:91;right:12px;bottom:12px;max-width:min(290px,92vw);font:13px/1.35 system-ui;color:#f7edce}#mandriaV11Qa button{cursor:pointer;background:#19322e;color:#f7edce;border:1px solid #c4a46e;padding:8px;border-radius:7px}#mandriaV11Qa [data-panel]{margin-top:4px;background:#132721ed;border:1px solid #c4a46e;padding:10px;border-radius:8px;display:grid;gap:6px}#mandriaV11Qa [hidden]{display:none}`;document.head.append(css);
 const box=document.createElement('div');box.id='mandriaV11Qa';box.innerHTML='<button type="button" data-toggle>COLLAUDO VILLA · F8</button><div data-panel hidden><strong>Teletrasporto di prova (a piedi)</strong><button data-site="road">Strada esterna</button><button data-site="horses">Circuito cavalli</button><button data-site="store">Magazzino / camion</button><button data-site="rear">Retro della villa</button><button data-site="farm">Fattoria e lavoratori</button><small>Solo anteprima: non altera i salvataggi.</small></div>';document.body.append(box);
 const panel=box.querySelector('[data-panel]'),toggle=()=>{panel.hidden=!panel.hidden;};box.querySelector('[data-toggle]').addEventListener('click',toggle);
 const destinations={road:[[0,91],[12,95],[-12,91],[0,110]],horses:()=>{const c=g.villaV4.corral;return [[c.u+13,c.v],[c.u-13,c.v],[c.u,c.v+13]];},store:[[-8,38],[-15,32],[-7,29]],rear:[[0,-48],[-31,-50],[28,-48]],farm:[[-90,-65],[92,-65],[-97,-23]]};
 box.addEventListener('click',e=>{const id=e.target?.dataset?.site;if(!id||!g.state?.started)return;
  let opts=typeof destinations[id]==='function'?destinations[id]():destinations[id];if(id==='road'){
   const road=(g.map?.roads||g.city?.roads||[]).find(r=>r.estateBypass);if(road?.p?.length)opts=[...road.p.slice(Math.floor(road.p.length/2),Math.floor(road.p.length/2)+2).map(p=>{const c=areaLocal(VILLA,...p);return [c.u,c.v];}),...opts];
  }const p=testLocation(g,opts);if(!p){g.toast?.('Nessun punto di collaudo libero per questa destinazione.',3);return;}
  const state=g.state;if(state.car)state.car.speed=0;Object.assign(state,{mode:'foot',car:null,x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),speed:0,vy:0});g.toast?.('Collaudo: '+e.target.textContent,2);panel.hidden=true;
 });
 const key=e=>{if(e.code==='F8'&&!e.repeat){e.preventDefault();toggle();}};window.addEventListener('keydown',key);
 s.menu=box;s.cleanup=()=>{window.removeEventListener('keydown',key);box.remove();css.remove();};
}
export function mandriaV11Update(g,dt){if(!g.state?.started||!g.villaV10||!g.villaV9||!Number.isFinite(dt)||dt<=0)return;
 if(!g.villaV11||g.villaV11.life!==g.villaLife){g.villaV11?.cleanup?.();g.villaV11?.root?.parent?.remove(g.villaV11.root);
  const root=new THREE.Group();root.name='Mandria v11 · corsie sterrate di servizio';g.villaV10.root.add(root);
  const s={root,life:g.villaLife,report:{serviceCars:0,separatedSections:0,zonedWorkers:0,horseRoutesReviewed:0,horseRoutesSeparated:0,lodChanges:0},nextLOD:0,menu:null};g.villaV11=s;
  makeServiceLanes(g,s);separateHorses(g,s);workZones(g,s);
 }
 const s=g.villaV11;keepWorkersZoned(g,s);distanceDetail(g,s);showMenu(g,s);
}
