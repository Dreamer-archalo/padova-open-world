import {project,clamp,pointInside} from './core.js';

// Original gameplay layouts. LIPU's published ARP and 04/22, 1122 x 30 m
// runway fix the airport frame; buildings are deliberately fictional.
export const AIRPORT={...project(45.3966667,11.8483333),yaw:Math.PI-40*Math.PI/180,minU:-90,maxU:220,minV:-585,maxV:585};
export const VILLA={...project(45.40208,11.88539),yaw:0,minU:-47,maxU:47,minV:-47,maxV:52,platform:{minU:-44.35,maxU:44.35,minV:-43.35,maxV:49.35}};
export const CHARACTERS=[
 {id:'fede',name:'Fede',color:'#444879',variant:0,outfit:'Cappello da Merlino e abito da mago'},
 {id:'mattia',name:'Mattia',color:'#526144',variant:1,outfit:'Completo militare e mimetica'},
 {id:'marchese',name:'Marchese',color:'#273745',variant:2,outfit:'Giacca, camicia bianca e cravatta'},
 {id:'milo',name:'Milo',color:'#f0eee5',variant:3,outfit:'Pantaloni corti rossi e maglietta bianca smanicata'},
 {id:'nino',name:'Nino',color:'#16191c',variant:4,outfit:'Abbigliamento interamente nero'}
];
export function normalizeCharacter(id){id=({scando:'fede',nico:'nino'})[id]||id;return CHARACTERS.some(c=>c.id===id)?id:'fede';}
export function areaPoint(area,u,v){const c=Math.cos(area.yaw),s=Math.sin(area.yaw);return {x:area.x+c*u+s*v,z:area.z-s*u+c*v};}
export function areaLocal(area,x,z){const dx=x-area.x,dz=z-area.z,c=Math.cos(area.yaw),s=Math.sin(area.yaw);return {u:c*dx-s*dz,v:s*dx+c*dz};}
export function insideArea(area,x,z,margin=0){const p=areaLocal(area,x,z);return p.u>=area.minU-margin&&p.u<=area.maxU+margin&&p.v>=area.minV-margin&&p.v<=area.maxV+margin;}
export const HOME={...areaPoint(VILLA,0,26),yaw:Math.PI,name:'Villa · Parco Treves',tag:'Casa / respawn'};
export const AIRPORT_GATE={...areaPoint(AIRPORT,205,250),yaw:AIRPORT.yaw-Math.PI/2,name:'Aeroporto · ingresso',tag:'Pista, hangar, aerei, elicotteri'};
const smooth=t=>{t=clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
export function gameplayElevation(x,z,raw,patches=[]){
 for(const a of patches){const p=areaLocal(a,x,z),edge=Math.max(a.minU-p.u,p.u-a.maxU,a.minV-p.v,p.v-a.maxV,0);if(edge>=30)continue;const blend=1-smooth(edge/30);raw=raw*(1-blend)+a.height*blend;}
 return raw;
}
function outsidePaths(points,area){
 const paths=[];let current=[];
 const append=(a,b)=>{if(Math.hypot(a[0]-b[0],a[1]-b[1])<.01)return;if(current.length&&Math.hypot(current.at(-1)[0]-a[0],current.at(-1)[1]-a[1])>.01){paths.push(current);current=[];}if(!current.length)current.push(a);current.push(b);};
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],p=areaLocal(area,...a),q=areaLocal(area,...b);let lo=0,hi=1;
  for(const [start,delta,min,max] of [[p.u,q.u-p.u,area.minU,area.maxU],[p.v,q.v-p.v,area.minV,area.maxV]]){if(Math.abs(delta)<1e-9){if(start<min||start>max){lo=1;hi=0;break;}}else{const x=(min-start)/delta,y=(max-start)/delta;lo=Math.max(lo,Math.min(x,y));hi=Math.min(hi,Math.max(x,y));}}
  if(lo>=hi){append(a,b);continue;}const at=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];if(lo>0)append(a,at(lo));if(current.length){paths.push(current);current=[];}if(hi<1)append(at(hi),b);
 }
 if(current.length)paths.push(current);return paths;
}
export function prepareGameplayMap(map){
 if(map.gameplay)return map;
 const zones=[AIRPORT,VILLA],inside=p=>zones.some(a=>insideArea(a,p[0],p[1]));
 // Only replace footprints actually in the two authored areas. Everything else,
 // including the historical loader's source data, remains untouched.
 map.buildings=map.buildings.filter(b=>!b.p.some(inside)&&!zones.some(a=>pointInside(a.x,a.z,b.p)));
 // Clip crossing footpaths at the authored perimeter as well. Removing only
 // wholly internal paths leaves dangling nodes inside the villa/park pond.
 map.roads=map.roads.flatMap(r=>{if(!['footway','path','steps','cycleway'].includes(r.k))return r.p.every(inside)?[]:[r];let paths=[r.p];for(const a of zones)paths=paths.flatMap(p=>outsidePaths(p,a));return paths.map(p=>({...r,p}));});
 const roads=[];
 const road=(name,points,w=9)=>{const r={n:name,p:points.map(p=>[p.x,p.z]),w,k:'service',access:'private',layer:0,gameplay:true};roads.push(r);return r;};
 function connect(area,entry,name){
  let best=null,d=Infinity;
  for(const r of map.roads){if(!['service','residential','unclassified','tertiary','secondary','primary'].includes(r.k)||r.tunnel||r.b)continue;
   for(const p of r.p){if(insideArea(area,...p,2))continue;const n=Math.hypot(entry.x-p[0],entry.z-p[1]);if(n<d){best=p;d=n;}}
  }
  if(best)road(name,[{x:best[0],z:best[1]},entry],8);
 }
 connect(AIRPORT,AIRPORT_GATE,'Ingresso aeroporto');
 connect(VILLA,areaPoint(VILLA,0,51),'Accesso villa Treves');
 road('Viale della villa',[areaPoint(VILLA,0,51),HOME],8);
 road('Servizi aeroportuali',[AIRPORT_GATE,areaPoint(AIRPORT,65,250),areaPoint(AIRPORT,65,-470)],12);
 map.roads.push(...roads);
 map.gameplay={areas:zones,roads};return map;
}
export function gameplaySpawns(){return [
 ...[[-10,22,'tank'],[10,22,'tank'],[0,-15,'tank']].map(([u,v,style])=>({...areaPoint(AIRPORT,149+u,-245+v),yaw:AIRPORT.yaw-Math.PI/2,style,name:'Hangar militari'})),
 ...[[112,120,'libellula'],[114,175,'rondone'],[114,218,'albatros']].map(([u,v,style])=>({...areaPoint(AIRPORT,u,v),yaw:AIRPORT.yaw,style,name:'Piazzale aerei'})),
 {...areaPoint(AIRPORT,125,360),yaw:AIRPORT.yaw,style:'airone',name:'Eliporto civile'},
 {...areaPoint(AIRPORT,115,-345),yaw:AIRPORT.yaw,style:'levante',name:'Eliporto utility'},
 {...areaPoint(AIRPORT,112,305),yaw:AIRPORT.yaw,style:'falco',name:'Piazzale scout'},
 ...[[-13,17,'falco'],[15,17,'levante'],[-13,35,'saetta'],[-19,35,'fulmine'],[18,35,'tank'],[-12,41,'motorcycle'],[-16,41,'cruiser']].map(([u,v,style])=>({...areaPoint(VILLA,u,v),yaw:Math.PI,style,name:'Villa Treves'})),
 {...areaPoint(AIRPORT,174,310),yaw:AIRPORT.yaw,style:'utility',name:'Servizi aeroporto'},
 {...areaPoint(AIRPORT,180,-185),yaw:AIRPORT.yaw,style:'truck',name:'Deposito aeroporto'}
 ];}

// A fixed, small belt of trees screens the villa without planting in its drive
// or buildings. It shares the existing chunk-level vegetation instances.
export function gameplayVegetation(terrain){
 if(!terrain?.modern||!terrain.gameplayPatches?.length)return [];
 const trees=[],tree=(u,v,s)=>trees.push({...areaPoint(VILLA,u,v),s,authored:true});
 for(const u of [-40.5,40.5])for(let v=-35;v<=42;v+=7)tree(u,v,6.4+(v+35)%3*.25);
 for(let u=-32;u<=32;u+=8)tree(u,-38,6.8);
 for(const u of [-32,-24,-16,16,24,32])tree(u,44,6.5);
 return trees;
}

// Box descriptors enter the world's existing chunk batches, not independent
// meshes. Floors/paint have no collider; hangar walls and overhead roofs do.
export function gameplayStructures(terrain){
 if(!terrain.modern||!terrain.gameplayPatches?.length)return [];
 const result=[];
 function box(a,u,v,w,d,h,color,base=0,solid=true){
  const centre=areaPoint(a,u,v),y=terrain.elevation(centre.x,centre.z)+base,p=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([du,dv])=>{const q=areaPoint(a,u+du,v+dv);return [q.x,q.z];});
  result.push({x:centre.x,z:centre.z,p,y,minY:y,h,color,solid,kind:'gameplay',minX:Math.min(...p.map(p=>p[0])),maxX:Math.max(...p.map(p=>p[0])),minZ:Math.min(...p.map(p=>p[1])),maxZ:Math.max(...p.map(p=>p[1]))});
 }
 function floor(a,u,v,w,d,color='#737b7c'){const paint=['#ece8d3','#f0ecda','#e5bc51','#f3e7af','#e8e3cd'].includes(color),top=paint?.085:color==='#454e54'?.065:color==='#596963'?.07:color==='#737b7c'?.06:.045;box(a,u,v,w,d,.02,color,top-.02,false);}
 function building(a,u,v,w,d,h,color){box(a,u,v,w,d,h,color);box(a,u,v,w+1,d+1,.4,'#525d60',h);for(let x=-w/2+3;x<w/2;x+=5)box(a,u+x,v+d/2+.03,2.3,.08,1.8,'#416173',h*.52,false);}
 function hangar(u,v,w,d,h,military=false){const a=AIRPORT,color=military?'#5b6950':'#a8b5b3';floor(a,u,v,w,d,'#999d98');
  // Open towards the taxiway (-u): a full width 10–12 m high portal.
  box(a,u+w/2,v,.65,d,h,color);box(a,u,v-d/2,w,.65,h,color);box(a,u,v+d/2,w,.65,h,color);
  box(a,u,v,w+1,d+1,.6,military?'#475342':'#617882',h);box(a,u-w/2,v,.6,d,1.1,color,h-1.1);
  for(const z of [-d/2+1,d/2-1])box(a,u-w/2,v+z,.7,1.2,h,'#dfc477');
 }
 // Full runway, with short pieces so distance-based chunk unloading stays exact.
 for(let v=-531;v<=531;v+=59){floor(AIRPORT,0,v,30,59,'#454e54');floor(AIRPORT,-14.2,v,.3,59,'#ece8d3');floor(AIRPORT,14.2,v,.3,59,'#ece8d3');floor(AIRPORT,0,v,.6,18,'#f0ecda');}
 for(const v of [-530,530])for(const u of [-10,-6,-2,2,6,10])floor(AIRPORT,u,v,1.6,18,'#f0ecda');
 const digits={'0':['111','101','101','101','111'],'2':['111','001','111','100','111'],'4':['101','101','111','001','001']};
 for(const [label,v,sign] of [['04',-498,1],['22',498,-1]])for(let digit=0;digit<2;digit++)for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(digits[label[digit]][row][col]==='1')floor(AIRPORT,sign*((digit*4+col)-3)*1.5,v+sign*(row-2)*2,1.25,1.8,'#f0ecda');
 for(let v=-430;v<=430;v+=86){floor(AIRPORT,65,v,14,86);floor(AIRPORT,65,v,.25,60,'#e5bc51');}
 for(const v of [-430,0,430])floor(AIRPORT,33,v,65,14);
 floor(AIRPORT,-58,0,30,450,'#819364');
 for(const [u,v,w,d] of [[135,215,136,410],[141,-258,126,235]])floor(AIRPORT,u,v,w,d,'#8f9590');
 hangar(174,42,57,56,12);hangar(173,110,55,42,11);hangar(174,-228,52,50,10,true);hangar(174,-295,52,48,10,true);
 building(AIRPORT,180,441,50,24,8,'#d8d5c4');building(AIRPORT,175,488,37,25,10,'#bebbae');
 building(AIRPORT,193,-152,28,22,7,'#818b80');building(AIRPORT,184,294,30,22,6,'#999b90');
 building(AIRPORT,190,365,10,10,25,'#c9c9b9');box(AIRPORT,190,365,18,16,4,'#426772',25);box(AIRPORT,190,365,20,18,.7,'#d0c7ad',29);
 // Fuel storage, parking, helipads, service lighting (emissive paint, no lights).
 for(const v of [-110,-93,-76])box(AIRPORT,183,v,18,10,5,'#b7b9ae');
 for(const v of [360,-345]){floor(AIRPORT,125,v,27,27,'#596963');for(const u of [120,130])floor(AIRPORT,u,v,1.1,15,'#f3e7af');floor(AIRPORT,125,v,10,1.1,'#f3e7af');}
 for(let v=470;v<545;v+=7){floor(AIRPORT,116,v,15,.22,'#e8e3cd');}
 // Perimeter with a 26 m gate at the road entrance. Low rails, widely spaced posts.
 for(const u of [-85,215])for(let v=-560;v<560;v+=20){if(u>0&&Math.abs(v-250)<26)continue;box(AIRPORT,u,v,.2,18,.15,'#76867f',1.7);box(AIRPORT,u,v,.25,.25,2,'#596862');}
 for(const v of [-575,575])for(let u=-75;u<214;u+=20){box(AIRPORT,u,v,19,.2,.15,'#76867f',1.7);box(AIRPORT,u,v,.25,.25,2,'#596862');}
 for(let v=-510;v<520;v+=85)for(const u of [-18,18])box(AIRPORT,u,v,.5,.5,.35,'#eedfb0',0,false);
 for(const v of [230,270]){box(AIRPORT,210,v,1,1,6,'#555e60');box(AIRPORT,210,v,2,1,.3,'#fff2bc',6,false);}
 for(const v of [-360,-145])for(const u of [83,100,190])box(AIRPORT,u,v,8,1,1.2,'#707e59');
 // Treves villa: invented mansion with colonnade, open driveway and garage.
 floor(VILLA,0,27,61,47,'#b7ada0');building(VILLA,0,-19,44,22,13,'#d4bf96');
 building(VILLA,-29,-10,14,36,9,'#d7c5a5');building(VILLA,29,-10,14,36,9,'#d7c5a5');
 for(let u=-18;u<=18;u+=6)box(VILLA,u,-3,.8,.8,7.5,'#f0e5ce');box(VILLA,0,-3,41,8,.6,'#e7d8b8',7.5);
 // Closed stone-and-timber perimeter, including the previously open back and
 // corners. The front keeps a 16 m gate, clear of the driveway and respawn.
 function fence(u,v,w,d){
  const level=terrain.elevation(VILLA.x,VILLA.z),samples=[areaPoint(VILLA,u-w/2-1,v-d/2-1),areaPoint(VILLA,u+w/2+1,v+d/2+1)],bottom=Math.min(level,...samples.map(p=>terrain.groundHeight(p.x,p.z)));
  box(VILLA,u,v,w,d,level-bottom+.8,'#bfb497',bottom-level);
  for(const base of [1.1,1.85])box(VILLA,u,v,w>d?w:w*.65,w>d?d*.65:d,.17,'#72553c',base);
  const alongU=w>d,length=alongU?w:d,count=Math.ceil(length/4);
  for(let i=0;i<=count;i++){const offset=(i/count-.5)*length;box(VILLA,u+(alongU?offset:0),v+(alongU?0:offset),.3,.3,2.2,'#634b37');}
 }
 for(const u of [-44,44])fence(u,3,.6,92);
 fence(0,-43,88,.6);for(const u of [-26,26])fence(u,49,36,.6);
 for(const u of [-8,8]){box(VILLA,u,49,1.4,1.4,2.8,'#c8b99c');box(VILLA,u,49,1.65,1.65,.18,'#e2d5bb',2.8);}
 for(const u of [-42,42])box(VILLA,u,2,1.2,84,1.8,'#3c5e40');
 box(VILLA,0,-41,82,1.2,1.8,'#3c5e40');for(const u of [-27,27])box(VILLA,u,47,30,1.2,1.8,'#3c5e40');
 // Small reflective ornamental basin outside the driving line; no water hazard.
 floor(VILLA,-27,29,9,16,'#496f79');box(VILLA,-27,29,1.3,1.3,2.2,'#c8c3ad');
 return result;
}
