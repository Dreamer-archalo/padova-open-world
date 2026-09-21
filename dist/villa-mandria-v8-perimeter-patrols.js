// Real private perimeter circuits: no teleporting through the mansion, paddocks,
// shooting range, public streets or fence. Route around obstacles with an A*
// service-path search when none of the simple rectangles is wholly driveable.
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
const point=(u,v)=>areaPoint(VILLA,u,v);
const prohibited=(g,u,v)=>{const r=g.villaRange;return !!(r?.ready&&Math.abs(u-r.u)<12.5&&Math.abs(v-r.v)<19.5);};
function validSegment(g,a,b,r){const length=Math.hypot(a[0]-b[0],a[1]-b[1]),count=Math.max(1,Math.ceil(length/1.35));let previous=null;
 for(let k=0;k<=count;k++){const t=k/count,u=a[0]+(b[0]-a[0])*t,v=a[1]+(b[1]-a[1])*t;
  if(prohibited(g,u,v)||!mandriaFree(g,u,v,r,3.2))return false;
  const p=point(u,v),h=g.terrain.height(p.x,p.z);
  if(!Number.isFinite(h)||previous!==null&&Math.abs(h-previous)>.43)return false;previous=h;
 }return true;}
function rectangle(g,r){for(const [west,east,south,north] of [[-118,118,-85,50],[-114,114,-81,46],[-111,111,-77,44],[-105,105,-70,40],[-97,97,-63,35]]){
 const route=[[west,north],[west,0],[west,south],[0,south],[east,south],[east,0],[east,north],[0,north],[west,north]];
 if(route.slice(1).every((b,i)=>validSegment(g,route[i],b,r)))return route;
 }return null;}
const GRID=Object.freeze({u:-120,v:-85,step:3,cols:81,rows:46});
const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const local=id=>[GRID.u+id%GRID.cols*GRID.step,GRID.v+Math.floor(id/GRID.cols)*GRID.step];
function searchLoop(g,r){const mask=new Map(),edgeCache=new Map(),W=GRID.cols,H=GRID.rows;
 const allowed=id=>{if(mask.has(id))return mask.get(id);const [u,v]=local(id),band=Math.min(u+133,133-u,v+98,63-v);
  const safe=band>=9&&band<=58&&!prohibited(g,u,v)&&mandriaFree(g,u,v,r,3.2);
  mask.set(id,safe);return safe;};
 const targets=[[-114,44],[114,44],[114,-78],[-114,-78]];
 const anchors=targets.map(([u,v])=>{const options=[];
  for(let id=0;id<W*H;id++){const [x,z]=local(id),d=Math.hypot(x-u,z-v);if(d<=30&&allowed(id))options.push({id,d});}
  options.sort((a,b)=>a.d-b.d);return options[0]?.id??-1;
 });
 if(anchors.some(id=>id<0))return null;
 const edge=(a,b)=>{const key=a<b?a+':'+b:b+':'+a;if(edgeCache.has(key))return edgeCache.get(key);
  const result=allowed(a)&&allowed(b)&&validSegment(g,local(a),local(b),r);edgeCache.set(key,result);return result;};
 const shortest=(from,to,strip)=>{let bestPath=null;
  for(const restricted of [true,false]){
   const dist=new Float64Array(W*H);dist.fill(Infinity);dist[from]=0;
   const previous=new Int32Array(W*H);previous.fill(-1);
   const open=[[Math.hypot(...local(from).map((v,i)=>v-local(to)[i])),0,from]];
   // The nodes are grid-cached and visited only once at their best cost. A
   // binary heap avoids O(n²) sorting and protects the first render frame.
   const push=value=>{open.push(value);let i=open.length-1;while(i>0){const p=(i-1)>>1;if(open[p][0]<=value[0])break;open[i]=open[p];i=p;}open[i]=value;};
   const pop=()=>{const head=open[0],last=open.pop();if(open.length){let i=0;while(true){let child=i*2+1;if(child>=open.length)break;if(child+1<open.length&&open[child+1][0]<open[child][0])child++;if(last[0]<=open[child][0])break;open[i]=open[child];i=child;}open[i]=last;}return head;};
   let visits=0;
   while(open.length&&visits<8000){const [,cost,id]=pop();if(cost>dist[id]+1e-8)continue;visits++;if(id===to)break;
    const x=id%W,y=Math.floor(id/W);
    for(const [dx,dy] of dirs){const nx=x+dx,ny=y+dy;if(nx<0||nx>=W||ny<0||ny>=H)continue;
     const next=ny*W+nx,[u,v]=local(next);
     if(restricted&&(strip==='north'&&v<13||strip==='east'&&u<76||strip==='south'&&v>-40||strip==='west'&&u>-76))continue;
     if(!edge(id,next))continue;
     const penalty=Math.max(0,Math.min(u+133,133-u,v+98,63-v)-25)*.06;
     const step=Math.hypot(dx,dy)*GRID.step*(1+penalty),distance=cost+step;
     if(distance>=dist[next])continue;
     dist[next]=distance;previous[next]=id;
     const [tx,tz]=local(to);push([distance+Math.hypot(tx-u,tz-v),distance,next]);
    }
   }
   if(Number.isFinite(dist[to])){const result=[];for(let p=to;p>=0;p=previous[p]){result.push(local(p));if(p===from)break;}
    result.reverse();if(result.length>1){bestPath=result;break;}}
  }return bestPath;};
 const all=[];for(let i=0;i<4;i++){
  const leg=shortest(anchors[i],anchors[(i+1)%4],['north','east','south','west'][i]);
  if(!leg)return null;
  if(all.length)leg.shift();all.push(...leg);
 }
 if(all.length<30)return null;
 if(Math.hypot(all[0][0]-all.at(-1)[0],all[0][1]-all.at(-1)[1])>.01)all.push([...all[0]]);
 if(!all.slice(1).every((p,i)=>validSegment(g,all[i],p,r)))return null;
 return all;
}
function perimeter(g,r){return rectangle(g,r)||searchLoop(g,r);}
const rotate=(loop,index)=>{const points=loop.slice(0,-1),shift=index*2%points.length;const route=[...points.slice(shift),...points.slice(0,shift)];return [...route,[...route[0]]];};
function install(g){const actors=(g.villaV3?.patrols||[]).filter(c=>c.mandriaPatrol==='mounted'||c.mandriaPatrol==='ape');
 if(!actors.length)return {complete:false,reason:'no actors'};
 const broad=perimeter(g,1.4),horse=broad||perimeter(g,.9);
 if(!broad&&!horse)return {complete:false,reason:'no collision-safe connected circuit',samples:'rectangle and A* both unavailable'};
 let horses=0,apes=0;
 for(const [i,c] of actors.filter(c=>c.mandriaPatrol==='mounted').entries()){
  if(c===g.state.car||!horse)continue;const route=rotate(horse,i),p=point(...route[0]);
  Object.assign(c,{route,routeIndex:1,x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),speed:0,patrolSlot:0,estateAuthorized:true});g.pose(c);horses++;
 }
 for(const [i,c] of actors.filter(c=>c.mandriaPatrol==='ape').entries()){
  if(c===g.state.car||!broad)continue;const route=rotate(broad,i),p=point(...route[0]);
  Object.assign(c,{route,routeIndex:1,x:p.x,z:p.z,y:g.terrain.height(p.x,p.z),speed:0,patrolSlot:0,estateAuthorized:true});g.pose(c);apes++;
 }
 const bounds=(route)=>route&&{west:Math.min(...route.map(p=>p[0])),east:Math.max(...route.map(p=>p[0])),south:Math.min(...route.map(p=>p[1])),north:Math.max(...route.map(p=>p[1]))};
 return {complete:horses>0&&apes>0,horses,apes,horseRoute:horse?.length||0,apeRoute:broad?.length||0,bounds:bounds(broad||horse)};
}
const previousPopulate=ModernGameplay.prototype.populate,previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV8PerimeterPatrols){
 ModernGameplay.prototype.__mandriaV8PerimeterPatrols=true;
 ModernGameplay.prototype.populate=function(...args){this.villaV8PatrolReport=null;return previousPopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){
  const past=new Map((this.villaV3?.patrols||[]).filter(c=>c.mandriaPatrol==='mounted'||c.mandriaPatrol==='ape').map(c=>[c,{x:c.x,z:c.z}]));
  previousUpdate.call(this,dt);
  if(!this.state?.started||!this.villaV7Life||!this.villaV3||Math.hypot(this.state.x-VILLA.x,this.state.z-VILLA.z)>330)return;
  if(!this.villaV8PatrolReport)this.villaV8PatrolReport=install(this);
  for(const [c,p] of past){if(c===this.state.car||!this.cars.includes(c)||!c.route?.length)continue;
   const factor=c.mandriaPatrol==='mounted'?.51:.59,dx=c.x-p.x,dz=c.z-p.z;
   if(Math.hypot(dx,dz)>3.2)continue;
   c.x=p.x+dx*factor;c.z=p.z+dz*factor;c.y=this.terrain.height(c.x,c.z);c.speed=Math.hypot(c.x-p.x,c.z-p.z)/Math.max(.001,dt);this.pose(c);
  }
 };
}
