import {roofClear} from './monoblocco-track.js';
const STEP=4,EDGE=4.3,NEAR=13.5;
function nearLine(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
function nearRoute(p,route){let result=Infinity;for(let i=0;i<route.length;i++)result=Math.min(result,nearLine(p,route[i],route[(i+1)%route.length]));return result;}
function pathSafe(poly,a,b){for(let j=0;j<=5;j++){const t=j/5;if(!roofClear(poly,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,3.1))return false;}return true;}
export function planRoofNetwork(poly,b,layout,{maxBranches=16}={}){
 const cells=new Map();for(let i=0;b.minX+2+STEP*i<b.maxX-2;i++)for(let j=0;b.minZ+2+STEP*j<b.maxZ-2;j++){
  const x=b.minX+2+STEP*i,z=b.minZ+2+STEP*j,key=i+','+j;
  if(roofClear(poly,x,z,EDGE)&&Math.hypot(x-layout.helipad.x,z-layout.helipad.z)>19.5)cells.set(key,{key,i,j,x,z});
 }
 const adj=new Map();for(const c of cells.values()){
  const near=[];for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=cells.get((c.i+di)+','+(c.j+dj));if(n&&pathSafe(poly,c,n))near.push(n.key);}adj.set(c.key,near);
 }
 const source=[...cells.values()].filter(p=>nearRoute(p,layout.points)<3.5);
 if(!source.length)return {branches:[],metres:0,coverage:layout.roofCoverage,reachableCoverage:0,allCells:cells.size,reason:'main lane does not touch safe roof grid'};
 const seen=new Set(source.map(p=>p.key)),parent=new Map(source.map(p=>[p.key,null])),queue=source.map(p=>p.key);
 for(let qi=0;qi<queue.length;qi++)for(const k of adj.get(queue[qi])||[])if(!seen.has(k)){seen.add(k);parent.set(k,queue[qi]);queue.push(k);}
 const network=layout.points.map(p=>({x:p.x,z:p.z})),branches=[],distance=p=>Math.min(...network.map(q=>Math.hypot(p.x-q.x,p.z-q.z)));
 const coverage=()=>[...cells.values()].filter(p=>distance(p)<NEAR).length/Math.max(1,cells.size);
 for(let n=0;n<maxBranches;n++){
  let target=null,score=17.0;
  for(const key of seen){const p=cells.get(key),d=distance(p);if(d<=score)continue;
   const route=[];for(let k=key;k!=null;k=parent.get(k))route.push(cells.get(k));
   if(route.length<4||route.length>75)continue;
   if(!route.every(q=>roofClear(poly,q.x,q.z,3.4)))continue;
   target={path:route.reverse(),distance:d,key};score=d;
  }
  if(!target)break;
  const path=target.path.map(p=>({x:p.x,z:p.z}));
  // The nearest part of the existing circuit is the only join. All following
  // segments stay entirely on roof; gaps never receive imaginary asphalt.
  const start=path[0],entry=layout.points.reduce((best,p)=>Math.hypot(start.x-p.x,start.z-p.z)<Math.hypot(start.x-best.x,start.z-best.z)?p:best,layout.points[0]);
  if(Math.hypot(entry.x-start.x,entry.z-start.z)>5||!pathSafe(poly,start,entry))break;
  path.unshift({x:entry.x,z:entry.z});
  // Smooth 90-degree graph corners only if the interpolated route remains on
  // a motorcycle-width deck. Never round across a courtyard or parapet.
  const smooth=[path[0]];for(let i=1;i<path.length-1;i++){
   const a=path[i-1],p=path[i],b=path[i+1],q={x:p.x*.65+a.x*.35,z:p.z*.65+a.z*.35},r={x:p.x*.65+b.x*.35,z:p.z*.65+b.z*.35};
   if(pathSafe(poly,smooth.at(-1),q)&&pathSafe(poly,q,r)&&pathSafe(poly,r,b))smooth.push(q,r);else smooth.push(p);
  }smooth.push(path.at(-1));
  if(smooth.slice(1).some((p,i)=>!pathSafe(poly,smooth[i],p)))break;
  const length=smooth.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x-smooth[i].x,p.z-smooth[i].z),0);
  if(length<12)break;
  branches.push({points:smooth,length,terminus:smooth.at(-1),join:smooth[0]});
  for(const p of smooth)network.push(p);
  if(coverage()>.87)break;
 }
 return {branches,metres:branches.reduce((s,b)=>s+b.length,0),coverage:coverage(),reachableCoverage:seen.size/Math.max(1,cells.size),allCells:cells.size,reachableCells:seen.size,originalMetres:layout.total};
}
