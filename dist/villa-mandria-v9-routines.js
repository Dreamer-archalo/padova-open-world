// Secondary estate-only choreography: routines evolve without entering city AI.
import * as THREE from './vendor/three.module.js';
import {VILLA,areaPoint} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
const at=(u,v)=>areaPoint(VILLA,u,v),sphere=new THREE.SphereGeometry(1,8,6),cylinder=new THREE.CylinderGeometry(1,1,1,7);
const fruit=new THREE.MeshStandardMaterial({color:'#ba5137',roughness:.72}),leaf=new THREE.MeshStandardMaterial({color:'#476c35',roughness:.91}),wood=new THREE.MeshStandardMaterial({color:'#77573d',roughness:.91});
function safe(g,u,v,r=.75){return u>-121&&u<121&&v>-87&&v<51&&mandriaFree(g,u,v,r,2.7);}
function line(g,a,b,r=.75){const steps=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])));let previous=null;
 for(let i=0;i<=steps;i++){const u=a[0]+(b[0]-a[0])*i/steps,v=a[1]+(b[1]-a[1])*i/steps;
  if(!safe(g,u,v,r))return false;const p=at(u,v),h=g.terrain.height(p.x,p.z);
  if(previous!==null&&Math.abs(previous-h)>.43)return false;previous=h;
 }return true;}
function orchard(g,root,actor){const [u,v]=actor.route[1],trials=[[u+4,v+3],[u-4,v+3],[u+3,v-4],[u-3,v-4]];
 for(const [x,z] of trials){if(!safe(g,x,z,2))continue;
  const p=at(x,z),tree=new THREE.Group();tree.name='Mandria · albero da frutto · raccolta attiva';tree.position.set(p.x,g.terrain.height(p.x,p.z),p.z);
  const trunk=new THREE.Mesh(cylinder,wood);trunk.position.y=1.48;trunk.scale.set(.24,2.95,.24);tree.add(trunk);
  const canopy=new THREE.Mesh(sphere,leaf);canopy.position.y=3.5;canopy.scale.set(1.66,1.55,1.66);tree.add(canopy);
  const apples=[];for(let i=0;i<6;i++){
   const a=i*2.39996,m=new THREE.Mesh(sphere,fruit);m.position.set(Math.cos(a)*1.12,3.25+Math.sin(a*1.9)*.66,Math.sin(a)*1.13);m.scale.set(.15,.16,.15);tree.add(m);apples.push(m);
  }
  root.add(tree);return {tree,apples,lastPick:-1,regrow:0};
 }return null;
}
function init(g,s){const root=new THREE.Group();root.name='Mandria v9 · frutteti e routine variabili';s.root.add(root);
 const orchards=new Map();for(const actor of s.actors.filter(a=>a.kind==='raccolta')){
  const trees=orchard(g,root,actor);if(trees)orchards.set(actor,trees);
 }
 for(const actor of s.actors){actor.v9Routines={lastCycle:-1,lastRespect:-100,loaded:true};
  // Two colleagues can playfully chase one another without leaving clear farm lanes.
  if(actor.kind==='gioco')actor.speed=actor.index%2===0?1.42:1.97;
 }
 s.report.orchards=orchards.size;s.report.variableRoutes=0;s.report.fruitCollected=0;
 return {source:s,root,orchards,lastRespect:-50,lastTruck:null};
}
function newRoute(g,s,actor){const a=actor.route[0],b=actor.route[1],n=actor.cycle,seed=n*1.91+actor.index*2.37;
 for(const amount of [5,3,1.7]){
  const next=[b[0]+Math.sin(seed)*amount,b[1]+Math.cos(seed*1.13)*amount];
  if(Math.hypot(next[0]-a[0],next[1]-a[1])<5||!line(g,a,next,actor.kind==='cavalli'?1.2:.7))continue;
  actor.route[1]=next;s.report.variableRoutes++;return;
 }
}
function cargo(actor){if(!['casse','fieno'].includes(actor.kind))return;
 // Deliver outbound and return with empty hands; refill at the supply origin.
 actor.prop.visible=actor.target===1;
}
function harvest(g,extra,s,actor){const tree=extra.orchards.get(actor);if(!tree)return;
 if(actor.phase==='work'&&actor.target===1&&tree.lastPick!==actor.cycle){
  tree.lastPick=actor.cycle;const apple=tree.apples.find(a=>a.visible);
  if(apple){apple.visible=false;tree.regrow=g.state.elapsed+60;s.report.fruitCollected++;}
 }
 if(g.state.elapsed>tree.regrow&&tree.apples.every(a=>!a.visible)){
  tree.apples.forEach(a=>a.visible=true);tree.regrow=g.state.elapsed+60;
 }
}
function deliveryBeacons(g,extra){const d=g.villaV8Delivery?.active;
 if(!d?.v9Load)return;
 const parts=d.v9Load.children,blink=Math.floor(g.state.elapsed*3)%2===0;
 for(const [i,lamp] of parts.slice(-2).entries())lamp.visible=(d.phase==='enter'||d.phase==='exit')&&(i?blink:!blink)||d.phase==='permission';
 extra.lastTruck=d;
}
export function mandriaV9Routines(g){const s=g.villaV9;if(!s?.actors||!g.state?.started)return;
 if(g.villaV9Extras?.source!==s)g.villaV9Extras=init(g,s);
 const extra=g.villaV9Extras;
 for(const actor of s.actors){const tracker=actor.v9Routines;
  if(actor.cycle!==tracker.lastCycle){tracker.lastCycle=actor.cycle;
   if(actor.cycle>0&&actor.cycle%2===0&&actor.target===1&&actor.phase==='travel')newRoute(g,s,actor);
  }
  cargo(actor);harvest(g,extra,s,actor);
  if(actor.lastBow>=0&&actor.lastBow>tracker.lastRespect&&g.state.elapsed-extra.lastRespect>14){
   tracker.lastRespect=actor.lastBow;extra.lastRespect=g.state.elapsed;
   g.toast?.('Con su permiso, patrón. A sus órdenes.',2.2);
  }
 }
 deliveryBeacons(g,extra);
}
