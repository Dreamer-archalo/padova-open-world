import {createShowroomLife} from './dealer-showroom-life.js';
import {SPECIAL_VEHICLES,createSpecialVehicle} from './special-vehicles.js';
import * as THREE from './vendor/three.module.js';
import {project,dist,pointInside,nearestOnSegment} from './core.js';
import {VEHICLES,createVehicle,createRider} from './vehicles.js';
import {createRoadFleet} from './road-fleet-coachwork.js';
import {COLLECTOR_CARS,createCollectorCar} from './collector-cars.js';
import {DEALER_OPTIONS,dealerCapabilities,normalizeDealerOptions,dealerBuildSpec,applyDealerUpgrades} from './dealer-customization.js';
import {compactCoachwork,coachSurface,COACHWORK} from './car-coachwork.js';
import {installVehicleDamage} from './vehicle-damage.js';
import {vehicleFootprint,polygonsOverlap} from './movement.js';
export {DEALER_OPTIONS,dealerCapabilities,dealerBuildSpec};
import {NPC_VEHICLES,createNPCCar} from './modern-vehicles.js';

// Approximate game placements around real mainland dealers. The physical displays
// snap to nearby open ground at runtime; no real trademark or shopfront is copied.
export const DEALER_SITES=[
 {id:'padova-lusso',city:'Padova',name:'Pescarotto Prestige',tier:'lusso',address:'Via del Pescarotto 7',lat:45.4119806,lon:11.8963513},
 {id:'padova-auto',city:'Padova',name:'Venezia Motori',tier:'normale',address:'Via Venezia 69/A',lat:45.4096184,lon:11.8996471},
 {id:'dolo-auto',city:'Dolo',name:'Riviera Auto',tier:'normale',address:'Via F.lli Bandiera 2',lat:45.4275545,lon:12.0936791},
 {id:'mirano-auto',city:'Mirano',name:'Cavin Motori',tier:'normale',address:'Via Cavin di Sala 74/B',lat:45.4949474,lon:12.0905977},
 {id:'mestre-lusso',city:'Mestre',name:'Orlanda Prestige',tier:'lusso',address:'Via Orlanda 8',lat:45.4813969,lon:12.2741985},
 {id:'mestre-auto',city:'Mestre',name:'Mestre Auto',tier:'normale',address:'Zona Via Orlanda, Mestre',lat:45.48175,lon:12.2756},
 {id:'zip-uruguay',city:'Padova ZIP',name:'Uruguay Mobilità',tier:'industriale',address:'Via Uruguay 32',lat:45.3999322,lon:11.9282364},
 {id:'zip-nona',city:'Padova ZIP',name:'Nona Strada Diesel',tier:'industriale',address:'Nona Strada 41',lat:45.4132272,lon:11.9343780},
 {id:'zip-germania',city:'Padova ZIP',name:'Germania Veicoli',tier:'industriale',address:'Via Germania 31',lat:45.3942728,lon:11.9574092},
 {id:'zip-stati-uniti',city:'Padova ZIP',name:'Stati Uniti GT',tier:'industriale',address:'Corso Stati Uniti 35',lat:45.3895117,lon:11.9522912}
].map(site=>({...site,...project(site.lat,site.lon),tag:'Concessionario · '+site.tier}));

const luxury=[
 ['doge','Doge Grand','berlina','limo',7900,'#182e3d'],
 ['aurora','Aurora Royale','berlina lunga','limo',9900,'#e9e4d6'],
 ['sestante','Sestante Executive','berlina','limo',7200,'#3b444e'],
 ['altavia','Altavia Imperiale','SUV','suv',9200,'#aa9c81'],
 ['familia','Familia Signature','familiare','wagon',6900,'#213e46'],
 ['meridiana','Meridiana Eclisse','elettrica','ev',8000,'#d8e0df'],
 ['zenit','Zenit V','gran turismo','gt',12800,'#6d2434'],
 ['vortice','Vortice GT','coupé','gt',10400,'#1c4b68'],
 ['fulmine','Fulmine R','supercar','sport',14600,'#d3a154'],
 ['campo','Campo Grand','pick-up','suv',7600,'#30473d'],
 ['lido','Lido Riviera','spider arrotondata','spider',11800,'#d9ddd4'],
 ['saetta','Saetta Touring','coupé classica','coupe',10900,'#7d3547'],
 ['ambra','Ambra Gran Coupé','gran turismo rétro','classic',8900,'#537570']
];
const normal=[
 ['nido','Nido Mini',750,'#dbb45a'],['tessera','Tessera E',1100,'#d2e4e0'],
 ['rondine','Rondine',1250,'#ad4550'],['botanica','Botanica Hybrid',1600,'#729480'],
 ['porto','Porto 80',1050,'#536d8a'],['argine','Argine',1900,'#5b626b'],
 ['viaggio','Viaggio',1700,'#b8af9d'],['selva','Selva',2200,'#687456'],
 ['comitiva','Comitiva',2100,'#c3cbd2'],['meridiana','Meridiana EV',2800,'#3d6675']
];
// Four extra bodies share established NPC driving, damage and collision rules.
const industrialNew=[
 ['officina-e','Officina E-Cargo','officina','furgone elettrico',3600,'#448a91'],
 ['pianale-6','Pianale 6','corriere','autocarro a pianale',4300,'#b98043'],
 ['campo-4x4','Campo 4x4','campo','pick-up fuoristrada',3900,'#526744'],
 ['fresco-xl','Fresco XL','officina','furgone refrigerato',4100,'#d3e0e3']
];
const industrialExisting=[
 ['officina','Officina Van',2300,'#718087'],['corriere','Corriere L',3100,'#bdad91'],
 ['campo','Campo Pickup',2550,'#7d8b76'],['altavia','Altavia SUV',3450,'#404a54'],
 ['familia','Familia XL',2800,'#b4b9b2'],['doge','Doge Grand',5900,'#2b414b']
];
const roadStock=[
 ['scooter','scooter classico',950,'#9cb6a6'],['motorcycle','moto stradale',2400,'#54798b'],['naked','moto naked',4100,'#578d7d'],['supersport','moto sportiva',6900,'#ae394a'],['enduro','moto enduro',3700,'#c37d40'],['trail','moto trail',3300,'#a69c65'],['touring','moto touring',5700,'#456e8e'],['cruiser','moto cruiser',4800,'#3d4650'],['ape','tre ruote tradizionale',1800,'#587969'],
 ['truck','camion furgonato',6500,'#637f8b'],['cisterna','camion cisterna',8400,'#72898f'],['cantiere','camion ribaltabile',7900,'#b08942'],['betoniera','betoniera',9300,'#b48942'],['soccorso','carro attrezzi',8200,'#b68b45'],['tir','autoarticolato',14900,'#587181'],['autotreno','autotreno',18900,'#758674'],['portavalori','furgone blindato',15900,'#627e78'],['taxi','taxi classico',3300,'#c5b576']
];
const industrialStock={
 'zip-uruguay':['ape','scooter','officina-e','fresco-xl','campo-4x4','officina','campo','nido','botanica','familia','meridiana','selva','truck','soccorso'],
 'zip-nona':['truck','cisterna','pianale-6','corriere','officina','fresco-xl','campo-4x4','campo','viaggio','familia','altavia','argine','tir','autotreno','portavalori'],
 'zip-germania':['cantiere','betoniera','soccorso','ape','pianale-6','officina-e','corriere','fresco-xl','campo','officina','campo-4x4','familia','selva','altavia','truck','cisterna'],
 'zip-stati-uniti':['salone_6','salone_7','salone_8','supersport','naked','touring','cruiser','enduro','trail','salone_3','salone_9','doge','altavia','campo-4x4','meridiana','salone_5',...Object.keys(COLLECTOR_CARS)]
};
const detailCube=new THREE.BoxGeometry(),luxuryGold=new THREE.MeshStandardMaterial({color:'#d1b780',metalness:.82,roughness:.19}),luxuryDark=new THREE.MeshStandardMaterial({color:'#242b2e',metalness:.75,roughness:.22}),luxuryGlass=new THREE.MeshStandardMaterial({color:'#192934',metalness:.45,roughness:.16});
export const DEALER_CATALOG=Object.fromEntries(luxury.map(([base,name,kind,trim,price,color],i)=>{
 const id='salone_'+i,s=NPC_VEHICLES[base];
 // Each catalogue entry has its own silhouette, trim, dimensions and handling.
 const scale=Math.max(1,5.05/s.length)*(base==='aurora'?1.03:1);
 VEHICLES[id]={...s,name,width:s.width*scale,length:s.length*scale,height:s.height*scale,wheelbase:s.wheelbase*scale,accel:s.accel+1,boost:s.boost+4,npcOnly:true,family:'luxury'};
 return [id,{id,base,name,kind,trim,price,color,luxury:true}];
}).concat(normal.map(([base,name,price,color])=>[base,{id:base,base,name,kind:'auto',price,color,luxury:false}]),
 industrialExisting.map(([base,name,price,color])=>[base,{id:base,base,name,kind:'mezzo da lavoro',price,color,luxury:false}]),
 industrialNew.map(([id,name,base,kind,price,color])=>{const s=NPC_VEHICLES[base];VEHICLES[id]={...s,name,accel:s.accel+1,boost:s.boost+2,npcOnly:true,family:'work'};return [id,{id,base,name,kind,price,color,custom:true,luxury:false}];})));

for(const [id,kind,price,color] of roadStock)DEALER_CATALOG[id]={id,base:id,name:VEHICLES[id].name,kind,price,color,luxury:false,roadFleet:true};
for(const [id,spec] of Object.entries(COLLECTOR_CARS))DEALER_CATALOG[id]={id,base:id,name:spec.name,kind:'auto da collezione',price:id==='collector-stradale33'?250000:Math.round(16000+spec.max*170),color:spec.color,luxury:true,collector:true};

export function createDealerVehicle(id,paint=null,wheels=null,build=null){
 const v=DEALER_CATALOG[id],s=VEHICLES[id];if(!v)throw Error('Unknown dealer model '+id);
 const finish=build?{wheels:build.wheels||'standard',livery:'plain',roof:build.roof==='black'?'#2b343b':build.roof==='ivory'?'#dcd5c1':build.livery==='two-tone'?'#dcd5c1':null}:wheels&&typeof wheels==='object'?wheels:{wheels:wheels||'standard'};
 if(build){const base=createDealerVehicle(id,paint,finish);return applyDealerUpgrades(compactCoachwork(base),s,build);}
 const g=v.collector?createCollectorCar(id,paint||v.color,finish.wheels):v.roadFleet?createRoadFleet(id,s,paint||v.color,finish):id==='pianale-6'||id==='fresco-xl'?createRoadFleet(id,s,paint||v.color,finish):createNPCCar(v.base,paint||v.color,finish);
 if(v.collector||v.roadFleet||id==='pianale-6'||id==='fresco-xl')return g;
 if(v.custom){
  const s=VEHICLES[id],dark=luxuryDark,light=luxuryGlass;
  const block=(x,y,z,w,h,d,mat)=>{const m=new THREE.Mesh(detailCube,mat);m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);};
  if(id==='officina-e'){block(0,s.height*.56,s.length*.48,s.width*.61,.16,.08,light);for(const side of [-1,1])block(side*s.width*.4,1.6,-.3,.04,.07,s.length*.57,dark);}
  if(id==='pianale-6'){block(0,.97,-1.05,s.width*.94,.16,s.length*.54,dark);for(const side of [-1,1]){block(side*s.width*.43,1.26,-1.05,.09,.55,s.length*.5,dark);block(side*s.width*.4,1.28,-s.length*.47,.18,.5,.12,luxuryGold);}}
  if(id==='campo-4x4'){block(0,s.height+.09,-s.length*.34,s.width*.87,.12,.31,dark);for(const side of [-1,1])block(side*s.width*.4,.74,0,.14,.12,s.length*.65,luxuryGold);}
  if(id==='fresco-xl'){block(0,s.height+.05,-.48,s.width*.86,.1,s.length*.54,light);block(0,s.height*.56,-s.length*.49,s.width*.68,.52,.1,dark);}
  return g;
 }
 if(!v.luxury)return g;
 const spec=VEHICLES[id],base=NPC_VEHICLES[v.base];g.scale.set(spec.width/base.width,spec.height/base.height,spec.length/base.length);
 const gold=v.trim==='sport'?luxuryDark:luxuryGold,glass=luxuryGlass;
 const box=(x,y,z,w,h,d,mat)=>{const m=new THREE.Mesh(detailCube,mat);m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);};
 const w=base.width,l=base.length,h=base.height;
 const bumperY=Math.min(.58,(COACHWORK[v.base]?.[5]||.75)-.14),frontZ=coachSurface(g,[0,bumperY,l],[0,0,-1])?.z||l*.49,rearZ=coachSurface(g,[0,.51,-l],[0,0,1])?.z||-l*.49;
 box(0,bumperY,frontZ+.018,w*.53,.055,.04,gold);box(0,.51,rearZ-.018,w*.60,.055,.04,gold);
 for(const side of [-1,1]){box(side*w*.43,.6,0,.04,.07,l*.73,gold);box(side*w*.34,h*.72,l*.16,.28,.08,.23,glass);}
 if(v.trim==='suv')box(0,h+.06,-l*.18,w*.62,.09,l*.43,glass);
 if(v.trim==='gt'||v.trim==='sport'){const z=-l*.43,deck=coachSurface(g,[0,h+1,z],[0,-1,0])?.y||h*.50,wing=deck+.16;box(0,wing,z,w*.83,.065,.24,gold);for(const side of [-1,1]){const at=coachSurface(g,[side*w*.27,h+1,z],[0,-1,0])?.y||deck;box(side*w*.27,(at+wing)/2,z,.035,wing-at,.09,luxuryDark);}}
 if(v.trim==='limo')box(0,h+.035,-l*.10,w*.44,.035,l*.42,gold);
 if(v.trim==='ev')box(0,.73,l*.499,w*.45,.14,.04,glass);
 return g;
}

// Reserve actual OSM footprints once, before their ordinary collision/extrusion is built.
// A showroom keeps the original polygon; only its facade and an entrance replace the shell.
const suitable=new Set(['industrial','commercial','retail','office','warehouse','yes']);
function interiorSlots(b){
 const slots=[],step=6.8;
 for(let z=b.minZ+3.7;z<=b.maxZ-3.7;z+=step)for(let x=b.minX+3.7;x<=b.maxX-3.7;x+=step){
  if(!pointInside(x,z,b.p)||b.p.some((a,i)=>{const q=nearestOnSegment(x,z,a,b.p[(i+1)%b.p.length]);return Math.hypot(x-q.x,z-q.z)<3.4;}))continue;
  slots.push({x,z});
 }
 return slots;
}
function entrance(b,site){let best=null,score=Infinity;
 for(let i=0;i<b.p.length;i++){const a=b.p[i],c=b.p[(i+1)%b.p.length],length=Math.hypot(c[0]-a[0],c[1]-a[1]);if(length<8)continue;
  const x=(a[0]+c[0])/2,z=(a[1]+c[1])/2,d=dist({x,z},site);if(d<score){score=d;best={edge:i,x,z,length};}}
 if(!best)return null;
 const a=b.p[best.edge],c=b.p[(best.edge+1)%b.p.length],dx=(c[0]-a[0])/best.length,dz=(c[1]-a[1])/best.length;
 let nx=-dz,nz=dx;if(pointInside(best.x+nx,best.z+nz,b.p)){nx=-nx;nz=-nz;}
 return {...best,dx,dz,outside:{x:best.x+nx*2,z:best.z+nz*2},inside:{x:best.x-nx*2.5,z:best.z-nz*2.5}};
}
export function reserveDealerBuildings(buildings,sites=DEALER_SITES){
 const reserved=new Map();
 for(const site of sites){let best=null,score=Infinity,reach=site.city==='Mirano'?650:260;
  const neighbors=buildings.filter(b=>b.p?.length&&Math.abs(b.p[0][0]-site.x)<reach+120&&Math.abs(b.p[0][1]-site.z)<reach+120);
  for(const b of neighbors){if(b.dealerSite||b.authoredLandmark||b.modelActive||!suitable.has(b.t)||b.p.length<4)continue;
   const xs=b.p.map(p=>p[0]),zs=b.p.map(p=>p[1]),w=Math.max(...xs)-Math.min(...xs),d=Math.max(...zs)-Math.min(...zs);
   if(w<21||d<19||w>100||d>100)continue;
   const cx=(Math.max(...xs)+Math.min(...xs))/2,cz=(Math.max(...zs)+Math.min(...zs))/2,distance=dist({x:cx,z:cz},site);
   if(distance>reach||distance>score+150)continue;
   const candidate={...b,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),cx,cz};
   const slots=interiorSlots(candidate).filter(p=>!neighbors.some(other=>{if(other===b)return false;
    const xs=other.p.map(q=>q[0]),zs=other.p.map(q=>q[1]);if(p.x<Math.min(...xs)-2||p.x>Math.max(...xs)+2||p.z<Math.min(...zs)-2||p.z>Math.max(...zs)+2)return false;
    return pointInside(p.x,p.z,other.p)||other.p.some((a,i)=>{const q=nearestOnSegment(p.x,p.z,a,other.p[(i+1)%other.p.length]);return Math.hypot(p.x-q.x,p.z-q.z)<2.2;});})).slice(0,10),door=entrance(candidate,site);
   if(slots.length<(site.tier==='lusso'?8:4)||!door)continue;
   const rank=distance+(site.tier==='lusso'&&slots.length<10?45:0)+(b.t==='yes'?25:0)+(b.n?15:0);
   if(rank<score){best={b,slots,door,geometry:{minX:candidate.minX,maxX:candidate.maxX,minZ:candidate.minZ,maxZ:candidate.maxZ,cx,cz}};score=rank;}
  }
  if(best){Object.assign(best.b,best.geometry,{dealerSite:site.id,dealerSlots:best.slots,dealerDoor:best.door});reserved.set(site.id,best.b);}
 }
 return reserved;
}
export function dealerWallParts(b){
 const walls=[],door=b.dealerDoor;
 for(let i=0;i<b.p.length;i++){const a=b.p[i],q=b.p[(i+1)%b.p.length],len=Math.hypot(q[0]-a[0],q[1]-a[1]);
  const spans=i===door.edge&&len>6?[[0,(len-4.6)/2],[(len+4.6)/2,len]]:[[0,len]];
  for(const [from,to] of spans){if(to-from<.2)continue;const lerp=t=>[a[0]+(q[0]-a[0])*t/len,a[1]+(q[1]-a[1])*t/len],v=lerp(from),u=lerp(to),nx=-(q[1]-a[1])/len*.14,nz=(q[0]-a[0])/len*.14,p=[[v[0]-nx,v[1]-nz],[u[0]-nx,u[1]-nz],[u[0]+nx,u[1]+nz],[v[0]+nx,v[1]+nz]],xs=p.map(t=>t[0]),zs=p.map(t=>t[1]);
   walls.push({p,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:b.minY,h:b.h});}}
 return walls;
}
const floorMat=new THREE.MeshStandardMaterial({color:'#505458',roughness:.88,side:THREE.DoubleSide}),frameMat=new THREE.MeshStandardMaterial({color:'#c4a66c',metalness:.65,roughness:.33}),windowMat=new THREE.MeshStandardMaterial({color:'#8fc0c6',transparent:true,opacity:.25,depthWrite:false,side:THREE.DoubleSide});
function showroom(site,b){
 const g=new THREE.Group(),y=b.minY,wallHeight=Math.max(3.8,b.h),shape=new THREE.Shape();
 b.p.forEach(([x,z],i)=>i?shape.lineTo(x-b.cx,z-b.cz):shape.moveTo(x-b.cx,z-b.cz));shape.closePath();
 const floor=new THREE.Mesh(new THREE.ShapeGeometry(shape),floorMat);floor.rotation.x=Math.PI/2;floor.position.y=.06;g.add(floor);
 const roof=new THREE.Mesh(new THREE.ShapeGeometry(shape),windowMat);roof.rotation.x=Math.PI/2;roof.position.y=wallHeight;g.add(roof);
 const box=(x,z,w,h,d,mat,angle=0,height=wallHeight/2)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x-b.cx,height,z-b.cz);m.rotation.y=angle;g.add(m);};
 for(let i=0;i<b.p.length;i++){const a=b.p[i],c=b.p[(i+1)%b.p.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<.1)continue;
  const angle=Math.atan2(c[0]-a[0],c[1]-a[1]);
  const parts=i===b.dealerDoor.edge&&len>6?[[0,(len-4.6)/2],[(len+4.6)/2,len]]:[[0,len]];
  for(const [from,to] of parts){const t=(from+to)/2/len,x=a[0]+(c[0]-a[0])*t,z=a[1]+(c[1]-a[1])*t;box(x,z,.12,wallHeight-.55,to-from,windowMat,angle,(wallHeight-.55)/2);}
  box((a[0]+c[0])/2,(a[1]+c[1])/2,.18,.2,len,frameMat,angle,wallHeight-.12);
  box(a[0],a[1],.25,wallHeight,.25,frameMat,0,wallHeight/2);
 }
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;const ctx=canvas.getContext('2d');ctx.fillStyle=site.tier==='lusso'?'#604935':'#31576a';ctx.fillRect(0,0,768,160);ctx.fillStyle='#f7e8c9';ctx.font='bold 42px sans-serif';ctx.textAlign='center';ctx.fillText(site.name.toUpperCase(),384,96,720);
 const texture=new THREE.CanvasTexture(canvas),sign=new THREE.Mesh(new THREE.PlaneGeometry(6,1.2),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));sign.position.set(b.dealerDoor.x-b.cx,Math.min(4,wallHeight-.85),b.dealerDoor.z-b.cz);sign.rotation.y=Math.atan2(b.dealerDoor.dx,b.dealerDoor.dz)+Math.PI/2;g.add(sign);g.userData.signTexture=texture;g.position.set(b.cx,y,b.cz);return g;
}
export const DEALER_COLORS=[['Bianco','#e8e5dc'],['Nero','#252b31'],['Rosso','#aa3442'],['Blu','#315979'],['Verde','#527561'],['Oro','#a89162']];
export const DEALER_SPEEDS=[['Di serie',0,0],['Sport',6,850],['Pista',12,2200],['Preparazione estrema',null,4400]];
export function dealerQuote(id,options={}){const c=DEALER_CATALOG[id];if(!c)return null;
 const s={...VEHICLES[id],vehicleType:id},speed=Math.max(0,Math.min(3,Math.floor(Number(options.speed)||0))),color=DEALER_COLORS.some(v=>v[1]===options.color)?options.color:c.color,{selected,prices}=normalizeDealerOptions(s,options,false);
 const name=String(options.name||'').trim().replace(/[<>"'&]/g,'').slice(0,24),extras={verniciatura:color===c.color?0:220,velocita:DEALER_SPEEDS[speed][2],cerchi:prices.wheels||0,interni:prices.interior||0,nome:name?120:0};
 for(const [key,price] of Object.entries(prices))if(!['wheels','interior'].includes(key))extras[key]=price;
 return {id,color,...selected,speed,name,extras,total:c.price+Object.values(extras).reduce((a,b)=>a+b,0),max:speed===3?(VEHICLES[id].max+12)*1.12:VEHICLES[id].max+DEALER_SPEEDS[speed][1]};
}
export function dealerDisplayLayout(building,stock){
 const layout=[],occupied=[];
 for(const id of stock){if(layout.length>=building.dealerSlots.length)break;const s=VEHICLES[id];if(!s||s.height>(building.h||4)+.05)continue;
  let selected=null;for(const slot of building.dealerSlots){for(const yaw of [0,Math.PI/2]){const footprint=vehicleFootprint(slot.x,slot.z,yaw,s.width+.7,s.length+.7);if(footprint.every(p=>pointInside(...p,building.p))&&!occupied.some(p=>polygonsOverlap(footprint,p))){selected={id,...slot,yaw,footprint};break;}}if(selected)break;}
  if(selected){layout.push(selected);occupied.push(selected.footprint);}
 }return layout;
}

const profiles={hyper:2,low:4,medium:7,high:10};
export class Dealerships{
 constructor({scene,terrain,collision,addCar,cars,state,regionalWorld,roadAt,pose,buildings=[],createPerson=null,forget=null}){
  Object.assign(this,{scene,terrain,collision,addCar,cars,state,regionalWorld,roadAt,pose,createPerson,forget});this.buildings=new Map(buildings.filter(b=>b.dealerSite).map(b=>[b.dealerSite,b]));this.active=new Map();this.employees=new Map();this.consumed=new Set();this.owned=new Set();this.purchased=new Set();this.builds=new Map();
  try{const saved=JSON.parse(localStorage.getItem('padova-dealer-owned-v1')||'{}');for(const id of (Array.isArray(saved)?saved:saved.owned)||[])if(DEALER_CATALOG[id])this.owned.add(id);for(const token of saved.purchased||[])this.purchased.add(token);for(const [id,build] of Object.entries(saved.builds||{}))if(DEALER_CATALOG[id])this.builds.set(id,build);}catch{}
 }
 stock(site){return industrialStock[site.id]||(site.tier==='lusso'?[...luxury.map((_,i)=>'salone_'+i),...Object.keys(COLLECTOR_CARS),'supersport','touring','cruiser']:[...normal.map(row=>row[0]),'scooter','motorcycle','naked','enduro','trail','ape','taxi']);}
 register(buildings){for(const b of buildings)if(b.dealerSite)this.buildings.set(b.dealerSite,b);}
 locate(site){return this.buildings.get(site.id)||null;}
 load(site,b){if(!b?.dealerSlots?.length)return;
  const structure=showroom(site,b),units=[];this.scene.add(structure);
  dealerDisplayLayout(b,this.stock(site)).forEach(({id,x,z,yaw},i)=>{const token=site.id+':'+i;if(this.consumed.has(token)||this.purchased.has(token))return;
   const car=this.addCar(x,z,yaw,false,true,id);Object.assign(car,{dealershipStock:token,dealerPrice:DEALER_CATALOG[id].price,dealerSite:site.id,fixedSpawn:true,missionUnit:true});car.mesh.visible=i<(profiles[this.state.quality]||4);this.pose(car);units.push(car);
  });const entry={site,at:{x:b.cx,z:b.cz},building:b,structure,units};entry.life=createShowroomLife(entry,this.createPerson,this.scene);entry.person=entry.life?.actors.find(a=>a.role==='staff')?.mesh||null;this.active.set(site.id,entry);
 }
 unload(entry){this.scene.remove(entry.structure);entry.structure.userData.signTexture.dispose();entry.structure.traverse(o=>{if(!o.isMesh)return;o.geometry.dispose();if(o.material!==floorMat&&o.material!==frameMat&&o.material!==windowMat)o.material.dispose();});entry.life?.dispose();
  for(const car of entry.units)if(car.dealershipStock){this.scene.remove(car.mesh);car.mesh.traverse(o=>{if(o.isMesh&&o.geometry?.attributes?.color){o.geometry.dispose();}});const j=this.cars.indexOf(car);if(j>=0)this.cars.splice(j,1);}this.active.delete(entry.site.id);
 }
 update(){if(!this.state.started)return;
  for(const site of DEALER_SITES){const entry=this.active.get(site.id),distance=dist(site,this.state);
   if(!entry&&distance<540&&(site.city.startsWith('Padova')||this.regionalWorld()?.contains(site.x,site.z))){const b=this.locate(site);if(b)this.load(site,b);}
   else if(entry&&distance>720&&dist(entry.at,this.state)>720)this.unload(entry);
   else if(entry){const count=profiles[this.state.quality]||4;entry.units.filter(c=>c.dealershipStock).forEach((c,i)=>c.mesh.visible=i<count);}
  }
 }
 animate(){for(const entry of this.active.values())entry.life?.animate(this.state.elapsed,this.state);}
 nearest(range=8){if(this.state.mode!=='foot')return null;let found=null,nearest=range;
  for(const entry of this.active.values()){const door=entry.building.dealerDoor,d=dist(door.outside,this.state);if(d<nearest){found={dealerSite:entry.site.id,employee:true};nearest=d;}
   for(const a of entry.life?.actors||[]){const ad=dist(a,this.state);if(a.role==='staff'&&ad<nearest){found={dealerSite:entry.site.id,employee:true};nearest=ad;}}
   for(const car of entry.units){const cd=dist(car,this.state);if(car.dealershipStock&&car.mesh.visible&&cd<nearest){found=car;nearest=cd;}}}
  return found;
 }
 persist(){try{localStorage.setItem('padova-dealer-owned-v1',JSON.stringify({owned:[...this.owned],purchased:[...this.purchased],builds:Object.fromEntries(this.builds)}));}catch{}}
 quote(id,options={}){
  const quote=dealerQuote(id,options);if(!quote)return null;let amountDue=quote.total;
  if(this.owned.has(id)){const old=this.builds.get(id)||dealerQuote(id),same=(key)=>quote[key]===old[key];amountDue=0;
   for(const [key,price] of Object.entries(quote.extras)){const field={verniciatura:'color',velocita:'speed',cerchi:'wheels',interni:'interior',nome:'name'}[key]||key;if(!same(field))amountDue+=field==='color'||field==='name'?price:Math.max(0,price-(old.extras?.[key]||0));}
  }return {...quote,amountDue};
 }
 purchase(site,id,options={}){if(!site||!this.active.has(site.id)||!this.stock(site).includes(id))return null;
  const quote=this.quote(id,options);if(!quote||this.state.money<quote.amountDue)return null;
  this.state.money-=quote.amountDue;this.owned.add(id);this.builds.set(id,quote);this.persist();
  for(const car of this.cars.filter(c=>c.style===id&&c.requestedByPlayer))this.applyBuild(car,{...car.mesh.userData.dealerBuild,...quote});
  return quote;
 }
 deliveryPlan(site,id){
  const entry=this.active.get(site.id),spec=VEHICLES[id];if(!entry?.building||!spec)return null;
  const b=entry.building;if(spec.height>(b.h||4)+.05)return null;
  const player={x:this.state.x,z:this.state.z},inside=(x,z,yaw)=>vehicleFootprint(x,z,yaw,spec.width+.65,spec.length+.65).every(p=>pointInside(...p,b.p));
  const clear=(x,z,yaw,ignore=null)=>{const footprint=vehicleFootprint(x,z,yaw,spec.width+.6,spec.length+.6);return dist({x,z},player)>spec.width/2+1&&!this.cars.some(c=>c!==ignore&&(c.mesh.visible||c.dealershipStock)&&dist(c,{x,z})<spec.length+c.spec.length&&polygonsOverlap(footprint,vehicleFootprint(c.x,c.z,c.yaw,c.spec.width+.6,c.spec.length+.6)));};
  const matching=entry.units.find(c=>c.style===id&&c.dealershipStock&&inside(c.x,c.z,c.yaw)&&clear(c.x,c.z,c.yaw,c));if(matching)return {entry,x:matching.x,z:matching.z,yaw:matching.yaw,reuse:matching};
  const points=[...b.dealerSlots];for(let z=b.minZ+3;z<b.maxZ-3;z+=2.5)for(let x=b.minX+3;x<b.maxX-3;x+=2.5)points.push({x,z});points.sort((a,c)=>dist(a,b.dealerDoor.inside)-dist(c,b.dealerDoor.inside));
  for(const p of points)for(const yaw of [0,Math.PI/2])if(inside(p.x,p.z,yaw)&&clear(p.x,p.z,yaw))return {entry,...p,yaw};
  for(const c of entry.units.filter(c=>c.dealershipStock))for(const yaw of [c.yaw,Math.PI/2-c.yaw])if(inside(c.x,c.z,yaw)&&clear(c.x,c.z,yaw,c))return {entry,x:c.x,z:c.z,yaw,replace:c};
  return null;
 }
 purchaseAndDeliver(site,id,options={}){
  const existing=this.cars.find(c=>c.style===id&&c.requestedByPlayer&&c.health>0&&!c.permanentlyDestroyed&&!c.testingVehicle);
  if(this.owned.has(id)&&(!existing||dist(existing,this.state)>50))return null;
  const plan=existing?null:this.deliveryPlan(site,id);if(!existing&&!plan)return null;
  const quote=this.purchase(site,id,options);if(!quote)return null;let car=existing;
  if(plan){const {entry,replace,reuse}=plan;
   if(replace){this.purchased.add(replace.dealershipStock);this.consumed.add(replace.dealershipStock);this.scene.remove(replace.mesh);this.forget?.(replace);replace.mesh.traverse(o=>{if(o.isMesh&&o.geometry?.attributes?.color)o.geometry.dispose();if(o.material?.userData.privateFinish)o.material.dispose();});const index=this.cars.indexOf(replace);if(index>=0)this.cars.splice(index,1);entry.units=entry.units.filter(c=>c!==replace);}
   car=reuse||this.addCar(plan.x,plan.z,plan.yaw,false,true,id,quote);
   if(reuse){this.purchased.add(car.dealershipStock);this.consumed.add(car.dealershipStock);this.applyBuild(car,quote);}
   Object.assign(car,{dealershipStock:null,missionUnit:false,requestedByPlayer:true,fixedSpawn:true,parked:true,budgetSleeping:false,speed:0,x:plan.x,z:plan.z,y:entry.building.minY+.08,yaw:plan.yaw});car.mesh.visible=true;this.pose(car);car.y=entry.building.minY+.08;car.mesh.position.y=car.y;
   if(!entry.units.includes(car))entry.units.push(car);this.garage?.register(car,'purchase');this.garage?.sync();this.persist();
  }
  this.active.get(site.id)?.life?.greet(car,this.state.elapsed);return {quote,car};
 }
 buy(car,options={}){if(!car?.dealershipStock)return false;const quote=dealerQuote(car.style,options);if(!quote||this.state.money<quote.total)return false;
  this.state.money-=quote.total;this.owned.add(car.style);this.builds.set(car.style,quote);this.purchased.add(car.dealershipStock);this.consumed.add(car.dealershipStock);this.persist();this.applyBuild(car,quote);car.dealershipStock=null;car.missionUnit=false;car.requestedByPlayer=true;return true;
 }
 applyBuild(car,quote){
  const old=car.mesh;this.scene.remove(old);this.forget?.(car);car.mesh=DEALER_CATALOG[car.style]?compactCoachwork(createDealerVehicle(car.style,quote.color,quote.wheels,quote)):applyDealerUpgrades(compactCoachwork(SPECIAL_VEHICLES[car.style]?createSpecialVehicle(car.style):NPC_VEHICLES[car.style]?createNPCCar(car.style,quote.color):createVehicle(car.style,quote.color)),VEHICLES[car.style],quote);car.spec=dealerBuildSpec(VEHICLES[car.style],quote);car.name=quote.name||car.spec.name;car.damageVisual=null;car.rider=null;
  if(car.spec.bike||['motorcycle','scooter'].includes(car.style)){car.rider=createRider();car.rider.visible=false;const seat=car.mesh.userData.riderSeat;if(seat){car.rider.position.y=seat.y-.86;car.rider.position.z=seat.z+.28;}car.mesh.add(car.rider);}this.scene.add(car.mesh);installVehicleDamage(car);this.pose(car);if(this.state.car===car)this.state.health=car.health;this.garage?.sync();
 }
 steal(car){if(!car?.dealershipStock)return false;this.consumed.add(car.dealershipStock);car.dealershipStock=null;car.missionUnit=false;return true;}
}
