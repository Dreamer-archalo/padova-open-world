// Michelangelo: dedicated 1,000 km/h Venetian-link aircraft, separate from combat jets.
// Parked at Padova airport. Flight continues in the existing Padova-Venezia
// continuous-world prototype, never beyond the legacy Padova map's hard limits.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VEHICLES} from './vehicles.js';
import {AIRPORT,areaPoint} from './gameplay-areas.js';
import {vehicleBlocked} from './movement.js';
import {airControlHeld,flightCommand,controlSpeed} from './airport-air-controls.js';
import {aircraftControlStep} from './airport-combat-flight.js';

export const MICHELANGELO='airport-michelangelo',MAX_KMH=1000,MAX_SPEED=MAX_KMH/3.6;
export const MICHELANGELO_SPEC=Object.freeze({
 ...VEHICLES['airport-interceptor'],name:'MICHELANGELO · Venezia 1000',
 family:'aircraft',width:17,length:25.8,height:5.7,wheelbase:10.5,
 aircraft:true,plane:true,accel:23,brake:27,steer:.38,max:MAX_SPEED,boost:MAX_SPEED,
 civilian:true,veniceLink:true
});
VEHICLES[MICHELANGELO]=MICHELANGELO_SPEC;

const cube=new THREE.BoxGeometry(1,1,1),colors=new Map();
function part(g,c,x,y,z,w,h,l,yaw=0){
 if(!colors.has(c))colors.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.44,metalness:.25}));
 const m=new THREE.Mesh(cube,colors.get(c));m.position.set(x,y,z);m.scale.set(w,h,l);m.rotation.y=yaw;m.castShadow=m.receiveShadow=true;g.add(m);return m;
}
export function createMichelangeloModel(){
 const g=new THREE.Group();g.name='Michelangelo · M1000';
 part(g,'#ebe7db',0,2.36,0,2.35,1.73,20.3);
 part(g,'#e0e0d6',0,2.27,11.2,1.18,.90,3.5);
 part(g,'#46667d',0,3.02,5.1,1.52,.49,4.2);
 // Two swept wings with distinctive blue-gold trim.
 for(const side of [-1,1]){
  part(g,'#e7e3d7',side*3.35,2.12,-1.8,7.2,.27,7.5,side*.11);
  part(g,'#1a526a',side*6.35,2.21,-2.35,1.1,.07,5.2,side*.15);
  part(g,'#e9e3d4',side*2.6,2.40,-9.15,4.1,.18,3.1);
  part(g,'#213e54',side*2.85,1.86,-9.9,1.08,1.05,2.7);
  part(g,'#d7b776',side*.76,2.83,4.3,.08,.16,5);
  part(g,'#283d4c',side*.76,.49,-.15,.30,.88,.62);
  part(g,'#203947',side*2.25,1.75,-9.4,1.28,1.05,1.7);
 }
 part(g,'#173e5d',0,3.66,-9.15,.25,3.10,4.0);
 part(g,'#e0b76a',0,4.88,-9.4,.30,.15,1.7);
 for(const z of [-3.8,-.9,2.1])for(const side of [-1,1])part(g,'#476779',side*1.08,2.78,z,.07,.18,.72);
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=112;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#123f5d';ctx.fillRect(0,0,640,112);ctx.fillStyle='#e8c884';ctx.font='bold 64px system-ui';ctx.textAlign='center';ctx.fillText('MICHELANGELO',320,75);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const badge=new THREE.Mesh(new THREE.PlaneGeometry(8.2,1.4),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true}));
 badge.position.set(0,4.19,0);badge.rotation.x=-Math.PI/2;g.add(badge);g.userData.previewCategory='air';return g;
}
let live=null,button=null,transitioning=false;
export function veniceFlightUrl(s){
 const q=new URLSearchParams({spawn:'padova',vehicle:'michelangelo',x:String(Math.round(s.x)),z:String(Math.round(s.z)),y:String(Math.round(Math.max(85,s.y))),yaw:String(Math.PI/2),speed:String(Math.max(75,Math.min(MAX_SPEED,s.speed||75)))});
 return './continuous-world.html?'+q.toString();
}
function transfer(g){
 const s=g.state;if(!s.started||s.mode!=='car'||s.car?.style!==MICHELANGELO||transitioning)return false;
 transitioning=true;location.href=veniceFlightUrl(s);return true;
}
function ensureButton(){
 if(button||typeof document==='undefined')return;
 button=document.createElement('button');button.id='michelangeloVeniceTransfer';button.type='button';button.hidden=true;button.textContent='V · VOLO CONTINUO VERSO VENEZIA';
 Object.assign(button.style,{position:'fixed',left:'50%',bottom:'76px',transform:'translateX(-50%)',zIndex:'60',padding:'12px 18px',borderRadius:'12px',color:'#152a39',background:'#e9c87c',border:'2px solid #fff3bd',font:'800 14px system-ui',cursor:'pointer'});
 document.body.appendChild(button);button.onclick=()=>live&&transfer(live);
 window.addEventListener('keydown',e=>{if(e.code==='KeyV'&&!e.repeat&&live&&!document.querySelector('dialog[open]')&&live.state.car?.style===MICHELANGELO){e.preventDefault();e.stopImmediatePropagation();transfer(live);}},true);
}
function park(g){
 if(g.michelangelo||!g.interactiveAirport||Math.hypot(g.state.x-AIRPORT.x,g.state.z-AIRPORT.z)>1100)return;
 for(const [u,v] of [[135,-555],[165,-555],[110,-585],[174,-620],[155,-475]]){
  const p=areaPoint(AIRPORT,u,v),y=g.terrain.height(p.x,p.z),yaw=AIRPORT.yaw-Math.PI/2,s=VEHICLES[MICHELANGELO];
  if(!g.terrain.dry(p.x,p.z,s.width*.5,y)||vehicleBlocked(p.x,p.z,yaw,g.collision,s,y))continue;
  if(g.cars.some(c=>c.mesh.visible&&Math.hypot(c.x-p.x,c.z-p.z)<(c.spec.length+s.length)*.5+3))continue;
  const c=g.addCar(p.x,p.z,yaw,false,true,MICHELANGELO),previous=c.mesh;
  g.scene.remove(previous);c.mesh=createMichelangeloModel();g.scene.add(c.mesh);
  Object.assign(c,{x:p.x,y,z:p.z,yaw,health:100,speed:0,parked:true,missionUnit:true,fixedSpawn:true,airportClaimed:true,airCruise:215,airBoost:MAX_SPEED,airControlBaseCruise:215,name:s.name,damageVisual:null});
  g.pose(c);g.interactiveAirport.extras.push(c);g.michelangelo=c;g.toast?.('MICHELANGELO pronto sul piazzale: 1.000 km/h · collegamento Venezia.',5);return;
 }
}
const populate=ModernGameplay.prototype.populate,update=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__veniceMichelangelo){
 ModernGameplay.prototype.__veniceMichelangelo=true;
 ModernGameplay.prototype.populate=function(...args){const out=populate.apply(this,args);live=this;ensureButton();return out;};
 ModernGameplay.prototype.update=function(dt){
  update.call(this,dt);const s=this.state;if(!s?.started||!Number.isFinite(dt)||dt<=0)return;live=this;park(this);
  const flying=s.mode==='car'&&s.car?.style===MICHELANGELO;
  if(button)button.hidden=!flying;
  if(!flying)return;
  const cmd=flightCommand(airControlHeld),c=s.car;
  aircraftControlStep(s,dt,{climb:cmd.climb,dive:cmd.dive,boost:cmd.throttle},this.terrain.height(s.x,s.z,s.y));
  if(cmd.brake)s.speed=controlSpeed(s.speed,{brake:true},dt,0,47,MAX_SPEED);
  s.speed=Math.min(MAX_SPEED,s.speed);c.speed=s.speed;c.y=s.y;c.yaw=s.yaw;this.pose(c);c.mesh.rotation.x=-(s.flightPitch||0);
  const note=document.getElementById('fcControls');
  if(note)note.textContent='MICHELANGELO · TAB ACCELERA · CTRL FRENA · ↑/↓ QUOTA · V VENEZIA · MAX 1.000 KM/H';
  const help=document.getElementById('flightPanel');if(help)help.textContent='MICHELANGELO · '+Math.round(s.speed*3.6)+' / 1.000 km/h · V per Venezia';
  // Before crossing the finite original Padova world boundary, enter the
  // streamed continuous world, keeping flight coordinates and velocity.
  if(s.x>6050&&s.y>this.terrain.height(s.x,s.z,s.y)+24&&Math.sin(s.yaw)>.15)transfer(this);
 };
}
