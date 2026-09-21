// Main entrance staircase: a short readable climb, dedicated return and roof walkway.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint} from './gameplay-areas.js';
const at=(u,v)=>areaPoint(VILLA,u,v),GEO=new THREE.BoxGeometry(1,1,1),COLORS=new Map();
function material(hex){if(!COLORS.has(hex))COLORS.set(hex,new THREE.MeshStandardMaterial({color:hex,roughness:.84}));return COLORS.get(hex);}
function cube(root,hex,x,y,z,w,h,d){const m=new THREE.Mesh(GEO,material(hex));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=false;m.receiveShadow=false;root.add(m);return m;}
const FOOT={u:-9,v:13},TOP={u:-9,v:-7.3};let active=null,prompt=null;
function build(g){const root=new THREE.Group();root.name='Mandria · scalone principale accanto ingresso';g.scene.add(root);
 const bottom=at(FOOT.u,FOOT.v),top=at(TOP.u,TOP.v),base=g.terrain.height(bottom.x,bottom.z),height=g.villaRoof.top-base,steps=29;
 // Keep all steps outside the front wall: its footprint begins at local v=-8.
 for(let n=0;n<steps;n++){
  const t=(n+.5)/steps,p=at(FOOT.u,FOOT.v+(TOP.v-FOOT.v)*t),elevation=base+height*t;
  cube(root,n%2?'#ddc69d':'#c5ab7c',p.x,elevation,p.z,3.9,.31,Math.abs(TOP.v-FOOT.v)/steps+.09);
  for(const side of [-1,1])if(n%3===0){cube(root,'#8c7453',p.x+side*2.08,elevation+.72,p.z,.16,1.42,.17);}
 }
 for(const side of [-1,1]){const x=bottom.x+side*2.08,midZ=(bottom.z+top.z)/2,rail=cube(root,'#debd7d',x,base+height*.5+1.46,midZ,.13,.14,Math.abs(bottom.z-top.z)+.35);
  rail.rotation.x=-Math.atan2(height,Math.abs(bottom.z-top.z));}
 cube(root,'#ebd8ac',bottom.x,base+.09,bottom.z,5.5,.2,4.8);
 cube(root,'#ead1a1',top.x,g.villaRoof.top+.03,top.z,5.5,.2,4.2);
 // Elevated bridge from the staircase landing to the actual rooftop/helipad.
 const heli=at(16,-11.2),midX=(top.x+heli.x)/2,midZ=(top.z+heli.z)/2,length=Math.hypot(heli.x-top.x,heli.z-top.z);
 const path=cube(root,'#d9c49d',midX,g.villaRoof.top+.04,midZ,2.8,.16,length);path.rotation.y=Math.atan2(heli.x-top.x,heli.z-top.z);
 for(const side of [-1,1]){const x=midX+side*1.47*Math.cos(path.rotation.y),z=midZ-side*1.47*Math.sin(path.rotation.y);
  const rail=cube(root,'#826c4a',x,g.villaRoof.top+.94,z,.10,.13,length);rail.rotation.y=path.rotation.y;}
 for(const [p,y,color] of [[bottom,base,'#f5d07b'],[top,g.villaRoof.top,'#98d4aa']]){
  cube(root,'#564732',p.x-2.8,y+1.5,p.z,.16,3,.16);cube(root,color,p.x-2.8,y+3,p.z,3.3,.75,.2);
 }
 return {root,bottom,top,base,high:g.villaRoof.top,travel:null};
}
function setup(){if(prompt)return;const style=document.createElement('style');style.textContent=`#mandriaV7EntryStairs:not([hidden]){position:fixed;left:50%;top:31%;transform:translateX(-50%);z-index:83;border:2px solid #ffde8a;border-radius:11px;background:#1c3935f5;color:#fff3d6;padding:12px 21px;font:800 15px system-ui;cursor:pointer}`;document.head.appendChild(style);
 prompt=document.createElement('button');prompt.type='button';prompt.id='mandriaV7EntryStairs';prompt.hidden=true;prompt.addEventListener('click',()=>begin(active));document.body.appendChild(prompt);}
function nearPoint(g){const e=g?.villaV7Stairs,s=g?.state;if(!e||!s.started||s.mode!=='foot'||s.paused||e.travel||document.querySelector('dialog[open]'))return null;
 if(Math.hypot(s.x-e.bottom.x,s.z-e.bottom.z)<4&&Math.abs(s.y-e.base)<2.6)return 'up';
 if(Math.hypot(s.x-e.top.x,s.z-e.top.z)<4&&Math.abs(s.y-e.high)<2.6)return 'down';return null;}
function begin(g){if(!g)return false;const direction=nearPoint(g);if(!direction)return false;
 g.villaV7Stairs.travel={direction,start:g.state.elapsed};g.state.speed=0;g.state.vy=0;prompt.hidden=true;return true;}
function tick(g,dt){if(!g.state?.started||!g.villaRoof||!g.villaV6Stairs||!Number.isFinite(dt)||dt<=0)return;
 if(!g.villaV7Stairs)g.villaV7Stairs=build(g);const e=g.villaV7Stairs;
 e.root.visible=Math.hypot(g.state.x-VILLA.x,g.state.z-VILLA.z)<330;setup();const direction=nearPoint(g);
 prompt.hidden=!direction;if(direction)prompt.textContent=direction==='up'?'E · SCALONE PRINCIPALE · SALI':'E · SCALONE PRINCIPALE · SCENDI';
 if(!e.travel)return;if(g.state.mode!=='foot'){e.travel=null;return;}
 const t=Math.min(1,Math.max(0,(g.state.elapsed-e.travel.start)/5.4)),ease=t*t*(3-2*t),up=e.travel.direction==='up',along=up?ease:1-ease;
 g.state.x=e.bottom.x+(e.top.x-e.bottom.x)*along;g.state.z=e.bottom.z+(e.top.z-e.bottom.z)*along;
 g.state.y=e.base+(e.high-e.base)*along+.16;g.state.vy=0;g.state.speed=0;
 if(t>=1){g.state.y=(up?e.high:e.base)+.16;e.travel=null;g.toast?.(up?'Eliporto raggiunto: segui la passerella. E vicino alla scala per scendere.':'Sei tornato all’ingresso della villa.',3);}
}
const previousPopulate=ModernGameplay.prototype.populate,previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV7EntryStairs){ModernGameplay.prototype.__mandriaV7EntryStairs=true;
 ModernGameplay.prototype.populate=function(...args){if(this.villaV7Stairs)this.villaV7Stairs.root.parent?.remove(this.villaV7Stairs.root);this.villaV7Stairs=null;return previousPopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){previousUpdate.call(this,dt);active=this;tick(this,dt);};
}
window.addEventListener('keydown',event=>{if(event.code!=='KeyE'||event.repeat||!active||!nearPoint(active))return;
 if(begin(active)){event.preventDefault();event.stopImmediatePropagation();}},true);
