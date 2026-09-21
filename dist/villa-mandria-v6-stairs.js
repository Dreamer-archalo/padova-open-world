// Visible external staircase, separate from the original E-operated wall ladder.
// An E-operated ascent traces the steps; the already installed rooftop E descent remains.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint} from './gameplay-areas.js';
const local=(u,v)=>areaPoint(VILLA,u,v),BOX=new THREE.BoxGeometry(1,1,1),materials=new Map();
function mat(c){if(!materials.has(c))materials.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.86}));return materials.get(c);}
function box(parent,c,x,y,z,w,h,d){const o=new THREE.Mesh(BOX,mat(c));o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=false;parent.add(o);return o;}
let active=null,button=null;
const route=[[38,-4],[38,-39],[15,-39],[15,-11.2]];
function build(g){const roof=g.villaRoof,root=new THREE.Group();root.name='Mandria · scala esterna visibile e percorso di ritorno';g.scene.add(root);
 const base=roof.base,top=roof.top,legs=[],total=route.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-route[i][0],p[1]-route[i][1]),0);let travelled=0;
 for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/1.1),yaw=Math.atan2(b[0]-a[0],b[1]-a[1]);
  for(let j=0;j<n;j++){const t=(j+.5)/n,along=travelled+t*length,p=local(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t),y=base+(top-base)*along/total;
   const stair=box(root,j%2?'#c6ad82':'#dfc9a1',p.x,y,p.z,2.6,.24,length/n+.08);stair.rotation.y=yaw;
   if(j%5===0){for(const side of [-1,1]){const ux=side*Math.cos(yaw)*1.4,uz=-side*Math.sin(yaw)*1.4;
    box(root,'#6b5940',p.x+ux,y+.82,p.z+uz,.10,1.65,.10);
    const rail=box(root,'#e2ca9d',p.x+ux,y+1.61,p.z+uz,.12,.12,length/n*5+.22);rail.rotation.y=yaw;
   }}
  }
  const end=local(...b),height=base+(top-base)*(travelled+length)/total;box(root,'#a57e57',end.x,height,end.z,3.35,.26,3.35);
  legs.push({from:local(...a),to:end,start:travelled/total,end:(travelled+length)/total});travelled+=length;
 }
 const bottom=local(...route[0]),pTop=local(...route.at(-1));
 for(const [p,y,caption] of [[bottom,base,'SALITA · E'],[pTop,top,'DISCESA · E']]){
  const post=box(root,'#e1c28c',p.x,y+1.05,p.z,.15,2.1,.15);post.name=caption;
  box(root,'#192f2c',p.x,y+2.05,p.z,3.6,.57,.16).name=caption;
 }
 return {root,bottom,pTop,base,top,legs,travel:null};
}
function setupButton(){if(button)return;const css=document.createElement('style');css.textContent='#mandriaV6StairButton:not([hidden]){position:fixed;left:50%;top:38%;transform:translateX(-50%);z-index:79;background:#193932f5;color:#ffebc0;border:2px solid #f1cb79;border-radius:12px;font:800 15px system-ui;padding:12px 21px;cursor:pointer}';document.head.appendChild(css);
 button=document.createElement('button');button.id='mandriaV6StairButton';button.type='button';button.textContent='E · SALI LA SCALA ESTERNA';button.hidden=true;button.onclick=()=>begin(active);document.body.appendChild(button);}
function nearBottom(g){const e=g.villaV6Stairs,s=g.state;return !!e&&s.started&&!s.paused&&s.mode==='foot'&&!e.travel&&Math.abs(s.y-e.base)<3&&Math.hypot(s.x-e.bottom.x,s.z-e.bottom.z)<4.3;}
function begin(g){if(!nearBottom(g)||document.querySelector('dialog[open]'))return false;const e=g.villaV6Stairs;e.travel={start:g.state.elapsed};g.state.speed=0;g.state.vy=0;g.toast?.('Eliporto · scala esterna. Il ritorno è segnalato sul tetto.',3);return true;}
function step(g,dt){if(!g.state?.started||!g.villaRoof||!g.villaV4||!Number.isFinite(dt)||dt<=0)return;
 if(!g.villaV6Stairs)g.villaV6Stairs=build(g);const e=g.villaV6Stairs;
 e.root.visible=Math.hypot(g.state.x-VILLA.x,g.state.z-VILLA.z)<410;setupButton();button.hidden=!nearBottom(g)||!!document.querySelector('dialog[open]');
 if(!e.travel)return;if(g.state.mode!=='foot'){e.travel=null;return;}
 const t=Math.min(1,(g.state.elapsed-e.travel.start)/7.4),smooth=t*t*(3-2*t),leg=e.legs.find(l=>smooth<=l.end)||e.legs.at(-1),fraction=Math.min(1,Math.max(0,(smooth-leg.start)/(leg.end-leg.start)));
 g.state.x=leg.from.x+(leg.to.x-leg.from.x)*fraction;g.state.z=leg.from.z+(leg.to.z-leg.from.z)*fraction;
 g.state.y=e.base+(e.top-e.base)*smooth+.18;g.state.vy=0;g.state.speed=0;
 if(t>=1){g.state.x=e.pTop.x;g.state.z=e.pTop.z;g.state.y=e.top+.18;e.travel=null;g.toast?.('Sei sul tetto. Premi E vicino alla scala per scendere.',3);}
}
const previousPopulate=ModernGameplay.prototype.populate,previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV6Stairs){ModernGameplay.prototype.__mandriaV6Stairs=true;
 ModernGameplay.prototype.populate=function(...args){if(this.villaV6Stairs){this.villaV6Stairs.root.parent?.remove(this.villaV6Stairs.root);this.villaV6Stairs=null;}return previousPopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){previousUpdate.call(this,dt);active=this;step(this,dt);};
}
window.addEventListener('keydown',event=>{if(event.code!=='KeyE'||event.repeat||!nearBottom(active)||document.querySelector('dialog[open]'))return;
 if(begin(active)){event.preventDefault();event.stopImmediatePropagation();}},true);
