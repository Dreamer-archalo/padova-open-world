import * as THREE from './vendor/three.module.js';
import {project,dist,collides} from './core.js';
import {VEHICLES} from './vehicles.js';
import {NPC_VEHICLES,createNPCCar} from './modern-vehicles.js';
import {vehicleBlocked} from './movement.js';

// Approximate game placements around real mainland dealers. The physical displays
// snap to nearby open ground at runtime; no real trademark or shopfront is copied.
export const DEALER_SITES=[
 {id:'padova-lusso',city:'Padova',name:'Pescarotto Prestige',tier:'lusso',address:'Via del Pescarotto 7',lat:45.4119806,lon:11.8963513},
 {id:'padova-auto',city:'Padova',name:'Venezia Motori',tier:'normale',address:'Via Venezia 69/A',lat:45.4096184,lon:11.8996471},
 {id:'dolo-auto',city:'Dolo',name:'Riviera Auto',tier:'normale',address:'Via F.lli Bandiera 2',lat:45.4275545,lon:12.0936791},
 {id:'mirano-auto',city:'Mirano',name:'Cavin Motori',tier:'normale',address:'Via Cavin di Sala 74/B',lat:45.4949474,lon:12.0905977},
 {id:'mestre-lusso',city:'Mestre',name:'Orlanda Prestige',tier:'lusso',address:'Via Orlanda 8',lat:45.4813969,lon:12.2741985},
 {id:'mestre-auto',city:'Mestre',name:'Goretti Auto',tier:'normale',address:'Via S. Maria Goretti 8/3',lat:45.5069342,lon:12.2673671},
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
 ['campo','Campo Grand','pick-up','suv',7600,'#30473d']
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
const industrialStock={
 'zip-uruguay':['officina-e','fresco-xl','campo-4x4','officina','campo','nido','botanica','familia','meridiana','selva'],
 'zip-nona':['pianale-6','corriere','officina','fresco-xl','campo-4x4','campo','viaggio','familia','altavia','argine'],
 'zip-germania':['pianale-6','officina-e','corriere','fresco-xl','campo','officina','campo-4x4','familia','selva','altavia'],
 'zip-stati-uniti':['salone_6','salone_7','salone_8','salone_3','salone_9','doge','altavia','campo-4x4','meridiana','salone_5']
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

export function createDealerVehicle(id){
 const v=DEALER_CATALOG[id],g=createNPCCar(v.base,v.color);
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
 box(0,.58,l*.495,w*.62,.085,.08,gold);box(0,.58,-l*.495,w*.68,.07,.08,gold);
 for(const side of [-1,1]){box(side*w*.43,.6,0,.04,.07,l*.73,gold);box(side*w*.34,h*.72,l*.16,.28,.08,.23,glass);}
 if(v.trim==='suv')box(0,h+.06,-l*.18,w*.62,.09,l*.43,glass);
 if(v.trim==='gt'||v.trim==='sport')box(0,h+.08,-l*.43,w*.83,.09,.28,gold);
 if(v.trim==='limo')box(0,h+.035,-l*.10,w*.44,.035,l*.42,gold);
 if(v.trim==='ev')box(0,.73,l*.499,w*.45,.14,.04,glass);
 return g;
}

const concrete=new THREE.MeshStandardMaterial({color:'#394348',roughness:.9}),frame=new THREE.MeshStandardMaterial({color:'#c4a66c',metalness:.66,roughness:.3}),glass=new THREE.MeshStandardMaterial({color:'#88b6bd',transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide});
function display(site,at,terrain){
 const g=new THREE.Group(),y=terrain.height(at.x,at.z)+.02;
 g.position.set(at.x,y,at.z);
 const add=(x,h,z,w,t,d,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,t,d),mat);m.position.set(x,h,z);g.add(m);};
 add(0,-.045,0,56,.09,19,concrete);
 for(const x of [-27.7,27.7])for(const z of [-9.3,9.3])add(x,2.1,z,.18,4.2,.18,frame);
 for(const z of [-9.3,9.3]){add(0,4.2,z,55.5,.18,.18,frame);add(0,2.2,z,55.5,4.0,.035,glass);}
 add(0,4.25,0,55.5,.055,18.7,glass);
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.13,.18,4,8),frame);pole.position.set(-29,2,0);g.add(pole);
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;const ctx=canvas.getContext('2d');ctx.fillStyle=site.tier==='lusso'?'#604935':'#31576a';ctx.fillRect(0,0,768,160);ctx.fillStyle='#f7e8c9';ctx.font='bold 42px sans-serif';ctx.textAlign='center';ctx.fillText(site.name.toUpperCase(),384,96,720);
 const texture=new THREE.CanvasTexture(canvas),sign=new THREE.Mesh(new THREE.BoxGeometry(6,1.2,.20),[frame,frame,frame,frame,new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide})]);sign.position.set(-29,4.2,0);sign.rotation.y=Math.PI/2;g.add(sign);g.userData.signTexture=texture;
 return g;
}
const profiles={low:5,medium:10,high:10,hyper:3};
export class Dealerships {
 constructor({scene,terrain,collision,addCar,cars,state,regionalWorld,roadAt,pose}){
  Object.assign(this,{scene,terrain,collision,addCar,cars,state,regionalWorld,roadAt,pose});this.active=new Map();this.pending=new Map();this.failed=new Set();this.consumed=new Set();this.owned=new Set();this.purchased=new Set();
  try{const saved=JSON.parse(localStorage.getItem('padova-dealer-owned-v1')||'{}');for(const id of (Array.isArray(saved)?saved:saved.owned)||[])if(DEALER_CATALOG[id])this.owned.add(id);for(const token of saved.purchased||[])this.purchased.add(token);}catch{}
 }
 stock(site){return industrialStock[site.id]|| (site.tier==='lusso'?luxury.map((_,i)=>'salone_'+i):normal.map(row=>row[0]));}
 slot(at,i){return {x:at.x+(i%5-2)*10.5,z:at.z+(i<5?-4.5:4.5)};}
 clear(at,stock){const y=this.terrain.height(at.x,at.z);
  if(!this.terrain.dry(at.x,at.z,2,y))return false;
  for(let i=0;i<10;i++){const p=this.slot(at,i),spec=VEHICLES[stock[i]],h=this.terrain.height(p.x,p.z);
   if(Math.abs(h-y)>.65||!this.terrain.dry(p.x,p.z,spec.width/2,h)||vehicleBlocked(p.x,p.z,0,this.collision,spec,h))return false;
  }
  for(const z of [-9.3,9.3])for(let x=-27;x<=27;x+=9){const px=at.x+x,pz=at.z+z;if(collides(px,pz,.3,this.collision,this.terrain.height(px,pz)))return false;}
  return true;
 }
 *candidates(site){
  const stock=this.stock(site);
  // Bounded batches allow the real footprint search to run over several frames.
  for(let radius=0;radius<=270;radius+=18)for(let a=0;a<16;a++){
   const theta=a*Math.PI/8,p={x:site.x+Math.cos(theta)*radius,z:site.z+Math.sin(theta)*radius};
   if(this.clear(p,stock)){const road=this.roadAt(p),roadDistance=road?dist(road,p):Infinity;if(roadDistance>=18&&roadDistance<85){yield p;return;}}
   yield null;
  }
 }
 locate(site){for(const p of this.candidates(site))if(p)return p;return null;}
 load(site,at){if(!at)return;
  const structure=display(site,at,this.terrain),units=[];this.scene.add(structure);
  this.stock(site).forEach((id,i)=>{const token=site.id+':'+i;if(this.consumed.has(token)||this.purchased.has(token))return;
   const p=this.slot(at,i),car=this.addCar(p.x,p.z,0,false,true,id);
   Object.assign(car,{dealershipStock:token,dealerPrice:DEALER_CATALOG[id].price,dealerSite:site.id,fixedSpawn:true,missionUnit:true});
   car.mesh.visible=i<profiles[this.state.quality];this.pose(car);units.push(car);
  });this.active.set(site.id,{site,at,structure,units});
 }
 unload(entry){this.scene.remove(entry.structure);entry.structure.userData.signTexture.dispose();entry.structure.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(Array.isArray(o.material))for(const mat of o.material)if(mat!==frame)mat.dispose();}});
  for(const car of entry.units)if(car.dealershipStock){this.scene.remove(car.mesh);car.mesh.traverse(o=>{if(o.isMesh&&o.geometry?.attributes?.color){o.geometry.dispose();o.material.dispose();}});const j=this.cars.indexOf(car);if(j>=0)this.cars.splice(j,1);}
  this.active.delete(entry.site.id);
 }
 update(){if(!this.state.started)return;
  for(const site of DEALER_SITES){const entry=this.active.get(site.id),distance=dist(site,this.state);
   if(!entry&&distance<540&&!this.failed.has(site.id)&&(site.city==='Padova'||site.city==='Padova ZIP'||this.regionalWorld()?.contains(site.x,site.z))){
    let iterator=this.pending.get(site.id);if(!iterator){iterator=this.candidates(site);this.pending.set(site.id,iterator);}
    for(let i=0;i<8;i++){const step=iterator.next();if(step.value){this.load(site,step.value);this.pending.delete(site.id);break;}if(step.done){this.pending.delete(site.id);this.failed.add(site.id);break;}}
   }
   else if(entry&&distance>720&&dist(entry.at,this.state)>720)this.unload(entry);
   else if(entry){const count=profiles[this.state.quality],stock=entry.units.filter(c=>c.dealershipStock);for(let i=0;i<stock.length;i++)stock[i].mesh.visible=i<count;}
   else if(distance>720)this.pending.delete(site.id);
  }
 }
 nearest(range=7){if(this.state.mode!=='foot')return null;let found=null,nearest=range;
  for(const entry of this.active.values())for(const car of entry.units){const d=dist(car,this.state);if(car.dealershipStock&&car.mesh.visible&&d<nearest){found=car;nearest=d;}}
  return found;
 }
 buy(car){if(!car?.dealershipStock||this.state.money<car.dealerPrice)return false;
  this.state.money-=car.dealerPrice;this.owned.add(car.style);this.purchased.add(car.dealershipStock);this.consumed.add(car.dealershipStock);
  try{localStorage.setItem('padova-dealer-owned-v1',JSON.stringify({owned:[...this.owned],purchased:[...this.purchased]}));}catch{}
  car.dealershipStock=null;car.missionUnit=false;car.requestedByPlayer=true;return true;
 }
 steal(car){if(!car?.dealershipStock)return false;this.consumed.add(car.dealershipStock);car.dealershipStock=null;car.missionUnit=false;return true;}
}
