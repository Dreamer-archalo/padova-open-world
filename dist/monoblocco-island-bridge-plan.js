import {roofClear} from './monoblocco-track.js';
import {pointInside} from './core.js';
const GRID=4;
function safeSegment(poly,a,b,clear=2.35){const length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(4,Math.ceil(length));for(let i=0;i<=n;i++){const t=i/n;if(!roofClear(poly,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,clear))return false;}return true;}
function groupsFor(poly,b,layout){const cells=new Map();for(let i=0;b.minX+2+GRID*i<b.maxX-2;i++)for(let j=0;b.minZ+2+GRID*j<b.maxZ-2;j++){const x=b.minX+2+GRID*i,z=b.minZ+2+GRID*j;if(roofClear(poly,x,z,4.6))cells.set(i+','+j,{i,j,x,z,key:i+','+j});}
 const remaining=new Set(cells.keys()),groups=[];
 while(remaining.size){const queue=[remaining.values().next().value];remaining.delete(queue[0]);for(let k=0;k<queue.length;k++){const c=cells.get(queue[k]);for(const [di,dj] of [[0,1],[0,-1],[1,0],[-1,0]]){const key=(c.i+di)+','+(c.j+dj),p=cells.get(key);if(p&&remaining.has(key)&&safeSegment(poly,c,p,3.5)){remaining.delete(key);queue.push(key);}}}groups.push(queue.map(key=>cells.get(key)));}
 return groups.sort((a,b)=>b.length-a.length);
}
function roofApproach(poly,layout,p,v,direction){for(let i=0;i<=16;i++){
 const d=i/16*5.8;
 for(const lateral of [-1,0,1]){
  const x=p.x+v.x*d*direction+v.z*lateral*1.75,z=p.z+v.z*d*direction-v.x*lateral*1.75;
  if(!roofClear(poly,x,z,1.2)||Math.hypot(x-layout.helipad.x,z-layout.helipad.z)<18)return false;
 }
 }return true;
}
function nearestOnNetwork(network,p){let best=null,dist=Infinity;for(const q of network){const d=Math.hypot(q.x-p.x,q.z-p.z);if(d<dist){dist=d;best=q;}}return {point:best,dist};}
export function planIslandSpans(poly,b,layout,roofNetwork){
 const groups=groupsFor(poly,b,layout),lane=[...layout.points,...roofNetwork.branches.flatMap(branch=>branch.points)],islands=[];
 for(let wing=1;wing<groups.length;wing++){
  const targets=groups[wing];if(targets.length<8)continue;
  const candidates=[];
  for(const a of groups[0])for(const end of targets){
   const dx=end.x-a.x,dz=end.z-a.z,length=Math.hypot(dx,dz);if(length<9||length>45)continue;
   const n=Math.max(12,Math.ceil(length)),v={x:dx/length,z:dz/length};
   let largestVoid=0,run=0,totalVoid=0;
   for(let k=1;k<n;k++){const t=k/n,x=a.x+dx*t,z=a.z+dz*t;if(!pointInside(x,z,poly)){totalVoid++;run++;largestVoid=Math.max(largestVoid,run);}else run=0;}
   if(largestVoid<4||totalVoid<4)continue;
   if(!roofApproach(poly,layout,a,v,-1)||!roofApproach(poly,layout,end,v,1))continue;
   const enter={x:a.x-v.x*5.8,z:a.z-v.z*5.8},exit={x:end.x+v.x*5.8,z:end.z+v.z*5.8},nearest=nearestOnNetwork(lane,enter);
   if(nearest.dist>10||!safeSegment(poly,nearest.point,enter,2.3))continue;
   const yaw=Math.atan2(dx,dz),p={a:{x:a.x,z:a.z},b:{x:end.x,z:end.z},x:(a.x+end.x)/2,z:(a.z+end.z)/2,yaw,length,wing,void:largestVoid,totalVoid,entry:enter,exit,networkAnchor:{x:nearest.point.x,z:nearest.point.z},networkDistance:nearest.dist};
   const cost=nearest.dist*3+length*.45-largestVoid*.18;
   candidates.push({...p,cost});
  }
  candidates.sort((a,b)=>a.cost-b.cost||b.void-a.void);
  islands.push({wing,cells:targets.length,points:targets.map(p=>({x:p.x,z:p.z})),candidates:candidates.slice(0,35),totalCandidates:candidates.length});
 }
 return {groups:groups.map(g=>g.length),islands};
}
export {safeSegment};
