// Cross-region civilian flights and lightweight fictional private helipads.
// All paths are world-metre trajectories, independent of streamed 3-D chunks.
// Air traffic is ambient (not a new collision/AI dogfight subsystem).
import * as THREE from './vendor/three.module.js';
import {REGIONAL_ZONES} from './unified-regions.js';
import {AIRPORT,areaPoint} from './gameplay-areas.js';
import {createSpecialVehicle} from './special-vehicles.js';
import {vehicleBlocked} from './movement.js';
const find=name=>REGIONAL_ZONES.find(z=>z.name===name);
const padova=areaPoint(AIRPORT,0,-100);
const dol=find('Dolo'),ori=find('Oriago'),mar=find('Marghera'),
 port=find('Porto Marghera'),ven=find('Venezia - San Marco'),
 mir=find('Mirano'),caz=find('Cazzago');
const LOOP=[
 [padova.x,padova.z],[4300,padova.z-950],
 [caz.x,caz.z-850],[dol.x,dol.z-1150],
 [ori.x,ori.z-1100],[mar.x,mar.z-1100],
 [port.x+900,port.z-550],[ven.x+1600,ven.z-2600],
 [ven.x+3200,ven.z-5400],[mar.x-300,mar.z-5300],
 [mir.x,mir.z-2500],[9000,padova.z-2450]
];
const HELIPORT_TOWNS=['Dolo','Mirano','Marghera','Porto Marghera','Oriago'];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function heliPosition(pad,phase,radius=550){
 const t=((phase%1)+1)%1;
 let k=0,angle=0,alt=0;
 if(t<.14){k=smooth(t/.14);angle=0;alt=105*k;}
 else if(t<.76){k=1;angle=2*Math.PI*(t-.14)/.62;alt=105+15*Math.sin(angle*1.8);}
 else if(t<.91){k=1-smooth((t-.76)/.15);angle=2*Math.PI;alt=105*k;}
 return {x:pad.x+radius*k*Math.cos(angle),z:pad.z+radius*k*Math.sin(angle),
  y:pad.y+Math.max(.9,alt+2)};
}
function clearPad(terrain,collision,zone){
 const spec={width:5.2,length:7.5};
 for(let radius=480;radius<=1200;radius+=180){
  for(let j=0;j<12;j++){
   const t=(j/12)*Math.PI*2,x=zone.x+radius*Math.cos(t),
    z=zone.z+radius*Math.sin(t),y=terrain.height(x,z);
   if(!Number.isFinite(y)||!terrain.dry(x,z,5,y)||
     vehicleBlocked(x,z,0,collision,spec,y))continue;
   return {x,z,y,name:zone.name};
  }
 }
 return null; // Never put an artificial private landing pad inside a real building.
}
function rotorStep(mesh,elapsed){
 const rot=mesh.userData?.rotor,tail=mesh.userData?.tailRotor,
  prop=mesh.userData?.propeller;
 if(rot)rot.rotation.y=elapsed*24;
 if(tail)tail.rotation.x=elapsed*27;
 if(prop){const parts=prop.children.filter(o=>o.name==='engine-prop');
  if(parts.length)for(const p of parts)p.rotation.z=elapsed*24;
  else prop.rotation.z=elapsed*24;
 }
}
export class RegionalAirTraffic{
 constructor(scene,terrain,collision){
  this.scene=scene;this.terrain=terrain;
  this.aircraft=[];this.pads=[];this.lastTime=0;
  this.curve=new THREE.CatmullRomCurve3(
   LOOP.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'catmullrom',.24);
  this.length=this.curve.getLength();
  for(const [index,style] of ['rondone','albatros','libellula','rondone'].entries()){
   const mesh=createSpecialVehicle(style);
   mesh.name='Traffico aereo regionale · '+style+' #'+(index+1);
   mesh.visible=false;scene.add(mesh);
   this.aircraft.push({kind:'plane',mesh,style,speed:[76,87,68,85][index],
    offset:index/4,altitude:[275,380,220,345][index]});
  }
  for(const [index,name] of HELIPORT_TOWNS.entries()){
   const zone=find(name),pad=zone&&clearPad(terrain,collision,zone);
   if(!pad)continue;
   const marker=new THREE.Group();
   const disk=new THREE.Mesh(new THREE.CylinderGeometry(6.4,6.4,.13,16),
    new THREE.MeshStandardMaterial({color:'#5d6868',roughness:.94}));
   disk.position.set(pad.x,pad.y+.07,pad.z);marker.add(disk);
   for(const offset of [-1.7,1.7]){
    const bar=new THREE.Mesh(new THREE.BoxGeometry(.6,.03,4.8),
     new THREE.MeshBasicMaterial({color:'#d5d2ba'}));
    bar.position.set(pad.x+offset,pad.y+.16,pad.z);marker.add(bar);
   }
   marker.visible=false;marker.name='Piazzola elicotteri fittizia · '+name;
   scene.add(marker);this.pads.push({marker,...pad});
   const mesh=createSpecialVehicle(index%2?'levante':'falco');
   mesh.name='Elicottero regionale · '+name;
   mesh.visible=false;scene.add(mesh);
   this.aircraft.push({kind:'helicopter',mesh,pad,offset:index*.23,
    period:175+index*16,radius:440+index*72});
  }
 }
 update(state,quality='low'){
  const elapsed=Math.max(0,state?.elapsed||0),dt=Math.min(.12,Math.max(0,elapsed-this.lastTime));
  this.lastTime=elapsed;
  const maxVisible={hyper:2,low:3,medium:5,high:7}[quality]||3,
   range={hyper:850,low:1150,medium:1520,high:1900}[quality]||1150;
  const nearby=[];
  for(const a of this.aircraft){
   let pose,yaw;
   if(a.kind==='plane'){
    const t=((elapsed*a.speed/this.length+a.offset)%1+1)%1,
     p=this.curve.getPointAt(t),v=this.curve.getTangentAt(t);
    pose={x:p.x,z:p.z,y:Math.max(0,this.terrain.elevation(p.x,p.z))+
     a.altitude+14*Math.sin(t*6.28)};
    yaw=Math.atan2(v.x,v.z);
   }else{
    const phase=elapsed/a.period+a.offset,now=heliPosition(a.pad,phase,a.radius),
     next=heliPosition(a.pad,phase+.001,a.radius);
    pose=now;
    const vx=next.x-now.x,vz=next.z-now.z;
    yaw=Math.hypot(vx,vz)>.05?Math.atan2(vx,vz):a.mesh.rotation.y;
   }
   a.mesh.position.set(pose.x,pose.y,pose.z);a.mesh.rotation.set(0,yaw,0);
   rotorStep(a.mesh,elapsed);
   const distance=Math.hypot(pose.x-state.x,pose.z-state.z);
   a.mesh.visible=false;
   if(distance<range&&Math.abs(pose.y-state.y)<range+200)nearby.push({a,distance});
  }
  // Keep a bounded set of genuinely nearby aircraft even at hyper settings.
  nearby.sort((a,b)=>a.distance-b.distance);
  for(const {a} of nearby.slice(0,maxVisible))a.mesh.visible=true;
  for(const p of this.pads){
   p.marker.visible=quality!=='hyper'&&
    Math.hypot(p.x-state.x,p.z-state.z)<380;
  }
  return {visible:Math.min(nearby.length,maxVisible),
   aircraft:this.aircraft.length,privatePads:this.pads.length};
 }
}
