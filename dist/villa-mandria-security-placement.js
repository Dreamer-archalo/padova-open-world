// The old fixed car coordinates intersect real mapped structures in parts of
// Mandria. Find clear alternative placements instead of deleting OSM buildings.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint} from './gameplay-areas.js';
import {safeEstateSegments} from './villa-mandria-estate-v2.js';
const unit=new THREE.BoxGeometry(1,1,1),materials=new Map();
function mesh(parent,color,x,y,z,w,h,d){let m=materials.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.82});materials.set(color,m);}const o=new THREE.Mesh(unit,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=false;o.receiveShadow=false;parent.add(o);return o;}
function good(g,u,v,r=2){const p=areaPoint(VILLA,u,v),y=g.terrain.height(p.x,p.z);if(!Number.isFinite(y)||!g.terrain.dry(p.x,p.z,Math.min(2,r),y))return false;for(const o of g.collision?.near?.(p.x,p.z,r)||[])if(o.solid!==false&&o.kind!=='road')return false;return true;}
function placed(g,u,v){const p=areaPoint(VILLA,u,v);return [p.x,g.terrain.height(p.x,p.z),p.z];}
function blackCar(g,root,u,v){const o=new THREE.Group();o.position.set(...placed(g,u,v));o.rotation.y=VILLA.yaw;mesh(o,'#111318',0,.62,0,2,.6,4.65);mesh(o,'#1c2229',0,1.15,-.28,1.64,.77,2.6);mesh(o,'#485860',0,1.24,.9,1.46,.37,.055);for(const sx of [-1,1])for(const z of [-1.5,1.5])mesh(o,'#1a1e20',sx*.99,.35,z,.2,.65,.67);for(const x of [-.73,.73])mesh(o,'#e8dbaf',x,.68,2.32,.34,.19,.07);o.name='Mandria · auto nera sicurezza privata';root.add(o);return o;}
function suited(g,root,u,v,route){const o=new THREE.Group();o.position.set(...placed(g,u,v));o.rotation.y=VILLA.yaw;mesh(o,'#1c2027',0,1.2,0,.57,.75,.34);mesh(o,'#ece8e2',0,1.34,.18,.18,.30,.035);mesh(o,'#262529',0,1.34,.21,.07,.3,.035);mesh(o,'#be9e86',0,1.7,0,.32,.34,.3);mesh(o,'#16191e',-.16,.38,0,.18,.74,.21);mesh(o,'#16191e',.16,.38,0,.18,.74,.21);const left=new THREE.Group(),right=new THREE.Group();left.position.set(-.38,1.4,0);right.position.set(.38,1.4,0);mesh(left,'#1c2027',0,-.30,0,.19,.63,.21);mesh(right,'#1c2027',0,-.30,0,.19,.63,.21);o.add(left,right);o.name='Mandria · bodyguard in abito e cravatta';root.add(o);return {obj:o,left,right,role:'bodyguard',home:{x:o.position.x,z:o.position.z},u,v,helloAt:-100,until:0,lastText:'',phase:0,patrolRoute:route,patrolIndex:1};}
function candidates(side,forCar=false){const desired=side<0?-1:1,items=[];for(const v of [55,61,70,79,48,42,90,101,113,30,18,0,-15,-32,-50,125,140])for(const u of [6,9,12,16,20,25,30,36,44,52,63,78,94,110])items.push([desired*u,v]);if(forCar)for(const v of [66,75,87,100,113,128,150])items.push([desired*3,v]);return items;}
function patchedSecurity(g){const life=g.villaLife,e=life?.expansion;if(!e||e.securityPlaced)return; e.securityPlaced=true;
 const reserved=[];for(const c of life.cars){const p=c.position;reserved.push([p.x,p.z]);}
 for(const side of [-1,1]){
  if(life.cars.length>=2)break;
  for(const [u,v] of candidates(side,true)){
   if(!good(g,u,v,2.7))continue;
   const [x,,z]=placed(g,u,v);if(reserved.some(([px,pz])=>Math.hypot(px-x,pz-z)<8))continue;
   const car=blackCar(g,e.root,u,v);life.cars.push(car);reserved.push([x,z]);break;
  }
 }
 // Each route is sampled along its entire length, not just endpoints.
 for(const side of [-1,1]){
  if(e.recruits.length>=2)break;
  for(const [u,v] of candidates(side)){
   const route=[[u,v],[u,v+6]];
   if(!good(g,u,v,.8)||!good(g,u,v+6,.8)||safeEstateSegments(g,route,1.15).length<2)continue;
   const p=placed(g,u,v);if(e.recruits.some(a=>Math.hypot(a.obj.position.x-p[0],a.obj.position.z-p[2])<7))continue;
   const npc=suited(g,e.root,u,v,route);e.recruits.push(npc);life.people.push(npc);break;
  }
 }
 if(!e.escort){
  for(const v of [35,45,55,65,75,85,105,120,-20,-40,15,135]){
   for(const u of [0,3,-3,6,-6,10,-10,15,-15,22,-22,30,-30,50,-50,75,-75]){
    const route=[[u,v],[u,v+12]];
    if(!good(g,u,v,1.65)||!good(g,u,v+12,1.65)||safeEstateSegments(g,route,2.8).length<3)continue;
    const [x,,z]=placed(g,u,v);if(reserved.some(([px,pz])=>Math.hypot(px-x,pz-z)<6))continue;
    const car=blackCar(g,e.root,u,v);e.escort={car,route,index:1,speed:2.9};break;
   }
   if(e.escort)break;
  }
 }
}
const previous=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaSecurityPlacement){ModernGameplay.prototype.__mandriaSecurityPlacement=true;ModernGameplay.prototype.update=function(dt){previous.call(this,dt);if(this.villaLife?.expansion)patchedSecurity(this);};}
