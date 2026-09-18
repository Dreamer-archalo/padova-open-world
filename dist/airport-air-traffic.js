// Deterministic airport traffic. Coordinates are airport-local metres; no WebGL or DOM.
// Aircraft retain their positions when outside the rendering range: no visible teleport.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const distance=(a,b)=>Math.hypot(a.u-b.u,a.v-b.v);
const CYCLE=[[0,1670],[1800,2450],[3300,700],[1800,-2150],[-1300,-2500],[-1650,450],[0,-2400]];
export const AIRPORT_FLEET=[
 {id:'cargo-a',type:'cargo',slot:[100,155],start:'cruise',initial:[1800,2450],speed:82,width:33},
 {id:'cargo-b',type:'cargo',slot:[100,245],start:'cruise',initial:[-1300,-2500],speed:78,width:33},
 {id:'cargo-c',type:'cargo',slot:[100,325],start:'parked',initial:[100,325],speed:82,width:33,delay:16},
 {id:'cargo-d',type:'cargo',slot:[100,405],start:'parked',initial:[100,405],speed:78,width:33,delay:54},
 {id:'jet-a',type:'jet',slot:[174,-228],start:'parked',initial:[174,-228],speed:117,width:12,delay:35},
 {id:'jet-b',type:'jet',slot:[174,-295],start:'parked',initial:[174,-295],speed:112,width:12,delay:115},
 {id:'civil-a',type:'rondone',slot:[158,42],start:'parked',initial:[158,42],speed:75,width:9,delay:70},
 {id:'civil-b',type:'libellula',slot:[158,110],start:'parked',initial:[158,110],speed:70,width:10,delay:92},
 {id:'civil-c',type:'rondone',slot:[183,55],start:'parked',initial:[183,55],speed:74,width:9,delay:145},
 {id:'civil-d',type:'libellula',slot:[183,122],start:'parked',initial:[183,122],speed:67,width:10,delay:190}
];
const local=(p)=>({u:p[0],v:p[1]});
const TAXI=(a)=>[local([Math.min(a.u,130),a.slot[1]]),local([80,a.slot[1]]),local([65,a.slot[1]]),local([65,-475]),local([40,-475])];
const RETURN=(a)=>[local([65,340]),local([65,a.slot[1]]),local([80,a.slot[1]]),local(a.slot)];
export function createAirportTraffic(){return {time:0,runway:null,taxiway:null,aircraft:AIRPORT_FLEET.map((spec,index)=>({
  ...spec,index,slot:[...spec.slot],u:spec.initial[0],v:spec.initial[1],yAbove:spec.start==='cruise'?205+index*18:0,
  speedNow:spec.start==='cruise'?spec.speed:0,phase:spec.start,routeIndex:spec.start==='cruise'?Math.max(0,CYCLE.findIndex(p=>Math.hypot(p[0]-spec.initial[0],p[1]-spec.initial[1])<1)+1):0,
  waitUntil:spec.delay||0,heading:0,completed:0,collisionAt:-Infinity
 }))};}
function advance(a,target,dt,wanted,accel=9){
 const dx=target.u-a.u,dz=target.v-a.v,d=Math.hypot(dx,dz);
 a.speedNow=clamp(a.speedNow+Math.sign(wanted-a.speedNow)*Math.min(Math.abs(wanted-a.speedNow),accel*dt),0,a.speed);
 if(d<.01)return true;
 a.heading=Math.atan2(dx,dz);
 const step=Math.min(d,a.speedNow*dt);a.u+=dx/d*step;a.v+=dz/d*step;
 return d-step<.4;
}
function gotoRoute(a,route,dt,speed,accel=8){
 if(a.routeIndex>=route.length)return true;
 if(advance(a,Array.isArray(route[a.routeIndex])?local(route[a.routeIndex]):route[a.routeIndex],dt,speed,accel))a.routeIndex++;
 return a.routeIndex>=route.length;
}
function reserve(sim,a){if(sim.runway&&sim.runway!==a.id)return false;sim.runway=a.id;return true;}
const release=(sim,a)=>{if(sim.runway===a.id)sim.runway=null;};
const reserveTaxi=(sim,a)=>{if(sim.taxiway&&sim.taxiway!==a.id)return false;sim.taxiway=a.id;return true;};
const releaseTaxi=(sim,a)=>{if(sim.taxiway===a.id)sim.taxiway=null;};
export function tickAirportTraffic(sim,dt){
 if(!Number.isFinite(dt)||dt<=0)return sim;
 // Stable simulations even if a tab is throttled; no giant position jumps.
 dt=clamp(dt,0,.12);sim.time+=dt;
 for(const a of sim.aircraft){
  if(a.phase==='wrecked'){release(sim,a);releaseTaxi(sim,a);if(sim.time>=a.waitUntil){a.u=a.slot[0];a.v=a.slot[1];a.phase='parked';a.yAbove=0;a.speedNow=0;a.waitUntil=sim.time+45;}continue;}
  if(a.phase==='parked'){
   a.speedNow=0;a.yAbove=0;
   const taxiing=sim.aircraft.filter(b=>b!==a&&['taxi','hold','lineup'].includes(b.phase)).length;
   if(sim.time>=a.waitUntil&&taxiing<2&&reserveTaxi(sim,a)){a.phase='taxi';a.routeIndex=0;}continue;
  }
  if(a.phase==='taxi'){
   // Hold behind any aircraft already occupying the same taxi lane.
   const target=TAXI(a)[Math.min(a.routeIndex,4)],dx=target.u-a.u,dz=target.v-a.v;
   const blocked=sim.aircraft.some(b=>b!==a&&['taxi','hold','lineup','return','exit'].includes(b.phase)
     &&distance(a,b)<Math.max(19,(a.width+b.width)*.7)&&dx*(b.u-a.u)+dz*(b.v-a.v)>0);
   if(blocked){a.speedNow=0;continue;}
   if(gotoRoute(a,TAXI(a),dt,a.type==='cargo'?7:9,3.8)){a.phase='hold';a.speedNow=0;}continue;
  }
  if(a.phase==='hold'){
   a.speedNow=0;if(reserve(sim,a)){a.phase='lineup';a.routeIndex=0;}continue;
  }
  if(a.phase==='lineup'){
   if(advance(a,{u:0,v:-475},dt,7,4)){a.phase='takeoff';a.speedNow=13;releaseTaxi(sim,a);}
   continue;
  }
  if(a.phase==='takeoff'){
   advance(a,{u:0,v:545},dt,Math.min(a.speed,75),a.type==='cargo'?6:11);
   a.yAbove=clamp((a.v+150)*.095,0,75);
   if(a.v>=543){a.phase='departure';release(sim,a);}continue;
  }
  if(a.phase==='departure'){
   advance(a,{u:0,v:1670},dt,a.speed,8);
   a.yAbove=clamp(66+(a.v-545)*(.123+a.index*18/1125),66,390);
   if(a.v>=1669){a.phase='cruise';a.routeIndex=1;}continue;
  }
  if(a.phase==='cruise'){
   a.yAbove=205+a.index*18+2*Math.sin(sim.time*.022+a.index);
   if(gotoRoute(a,CYCLE,dt,a.speed,9)){
    a.phase='arrival-hold';a.routeIndex=0;
   }continue;
  }
  if(a.phase==='arrival-hold'){
   a.yAbove+=clamp(205+a.index*18-a.yAbove,-8*dt,8*dt);
   if((!sim.runway||sim.runway===a.id)&&reserveTaxi(sim,a)&&reserve(sim,a)){a.phase='approach';a.routeIndex=0;}
   else{
    const theta=sim.time*.12+a.index,r=180;
    advance(a,{u:1250+Math.cos(theta)*r,v:-2900+Math.sin(theta)*r},dt,a.speed*.68);
   }continue;
  }
  if(a.phase==='approach'){
   const route=[{u:0,v:-2400},{u:0,v:-800},{u:0,v:-520}];
   gotoRoute(a,route,dt,Math.min(a.speed,62),5);
   const desired=clamp(20+(-520-a.v)*.09,20,235);
   a.yAbove+=clamp(desired-a.yAbove,-8*dt,8*dt);
   if(a.routeIndex>=route.length){a.phase='landing';a.speedNow=Math.min(a.speedNow,50);}
   continue;
  }
  if(a.phase==='landing'){
   advance(a,{u:0,v:-200},dt,44,6);
   a.yAbove=clamp((-200-a.v)*.0625,0,20);
   if(a.v>=-201){a.phase='rollout';a.yAbove=0;}continue;
  }
  if(a.phase==='rollout'){
   advance(a,{u:0,v:340},dt,a.v<230?24:7,8);a.yAbove=0;
   if(a.v>=339){a.phase='exit';}continue;
  }
  if(a.phase==='exit'){
   advance(a,{u:65,v:340},dt,7,8);a.yAbove=0;
   if(a.u>=64){release(sim,a);a.phase='return';a.routeIndex=0;}continue;
  }
  if(a.phase==='return'){
   a.yAbove=0;
   if(gotoRoute(a,RETURN(a),dt,a.type==='cargo'?7:9,4)){
    a.phase='parked';a.speedNow=0;a.waitUntil=sim.time+25+(a.index%4)*20;a.completed++;releaseTaxi(sim,a);
   }
  }
 }
 return sim;
}
export function destroyAirportAircraft(sim,a){release(sim,a);a.phase='wrecked';a.speedNow=0;a.waitUntil=sim.time+65;a.yAbove=0;}
