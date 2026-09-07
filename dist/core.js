// Geometry and navigation use metres in a local equirectangular projection.
export const ORIGIN=[45.4064,11.8768];
export const project=(lat,lon)=>({x:(lon-ORIGIN[1])*111320*Math.cos(ORIGIN[0]*Math.PI/180),z:(ORIGIN[0]-lat)*111320});
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function pointInside(x,z,p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if(((a[1]>z)!==(b[1]>z))&&(x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]))c=!c;}return c;}
export function nearestOnSegment(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],d=dx*dx+dz*dz;const t=d?clamp(((x-a[0])*dx+(z-a[1])*dz)/d,0,1):0;return {x:a[0]+dx*t,z:a[1]+dz*t,t};}
export class SpatialIndex{
  constructor(size=60){this.size=size;this.cells=new Map();}
  add(item,minX,minZ,maxX,maxZ){for(let x=Math.floor(minX/this.size);x<=Math.floor(maxX/this.size);x++)for(let z=Math.floor(minZ/this.size);z<=Math.floor(maxZ/this.size);z++){const key=x+','+z;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(item);}}
  near(x,z,r=0){const a=new Set();for(let i=Math.floor((x-r)/this.size);i<=Math.floor((x+r)/this.size);i++)for(let j=Math.floor((z-r)/this.size);j<=Math.floor((z+r)/this.size);j++)for(const o of this.cells.get(i+','+j)||[])a.add(o);return a;}
}
export function collides(x,z,r,index,y=undefined){for(const b of index.near(x,z,r+1)){if(y!==undefined&&(y+1.7<=(b.minY||0)||y>=(b.minY||0)+b.h))continue;if(x+r<b.minX||x-r>b.maxX||z+r<b.minZ||z-r>b.maxZ)continue;if(pointInside(x,z,b.p))return b;for(let i=0;i<b.p.length;i++){const n=nearestOnSegment(x,z,b.p[i],b.p[(i+1)%b.p.length]);if(Math.hypot(x-n.x,z-n.z)<r)return b;}}return null;}
class Heap{constructor(){this.a=[];}push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p].f<=v.f)break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}pop(){const top=this.a[0],v=this.a.pop();if(this.a.length){let i=0;while(2*i+1<this.a.length){let j=2*i+1;if(j+1<this.a.length&&this.a[j+1].f<this.a[j].f)j++;if(this.a[j].f>=v.f)break;this.a[i]=this.a[j];i=j;}this.a[i]=v;}return top;}get length(){return this.a.length;}}
export function makeRoadGraph(roads){const nodes=[],lookup=new Map(),segments=[],index=new SpatialIndex(90);function node(p){const k=p[0].toFixed(1)+','+p[1].toFixed(1);if(!lookup.has(k)){lookup.set(k,nodes.length);nodes.push({x:p[0],z:p[1],edges:[]});}return lookup.get(k);}
  for(const road of roads){if(['footway','path','cycleway','steps','track','tram'].includes(road.k))continue;for(let i=1;i<road.p.length;i++){const a=node(road.p[i-1]),b=node(road.p[i]);const d=dist(nodes[a],nodes[b]);if(d<.1)continue;const direction=road.oneway??(road.one?1:0);if(direction>=0)nodes[a].edges.push({id:b,d,road});if(direction<=0)nodes[b].edges.push({id:a,d,road});const s={a,b,road};segments.push(s);index.add(s,Math.min(nodes[a].x,nodes[b].x),Math.min(nodes[a].z,nodes[b].z),Math.max(nodes[a].x,nodes[b].x),Math.max(nodes[a].z,nodes[b].z));}}
  // Select the connected street network; plaza outlines can be isolated rings.
  const undirected=nodes.map(()=>[]);for(const s of segments){undirected[s.a].push({id:s.b});undirected[s.b].push({id:s.a});}
  const component=new Int32Array(nodes.length).fill(-1),sizes=[];
  for(let i=0;i<nodes.length;i++){if(component[i]>=0)continue;const id=sizes.length,q=[i];component[i]=id;for(let j=0;j<q.length;j++)for(const e of undirected[q[j]])if(component[e.id]<0){component[e.id]=id;q.push(e.id);}sizes.push(q.length);}
  let main=0;for(let i=1;i<sizes.length;i++)if(sizes[i]>sizes[main])main=i;
  for(const s of segments)s.connected=component[s.a]===main;
  return {nodes,segments,index};
}
export function nearestRoad(pos,g,connectedOnly=false){let best=null,dd=Infinity;let candidates=g.index.near(pos.x,pos.z,100);if(!candidates.size)candidates=g.segments;for(const s of candidates){if(connectedOnly&&!s.connected)continue;const a=g.nodes[s.a],b=g.nodes[s.b];const p=nearestOnSegment(pos.x,pos.z,[a.x,a.z],[b.x,b.z]);const d=dist(p,pos);if(d<dd){dd=d;best={...p,d,segment:s,yaw:Math.atan2(b.x-a.x,b.z-a.z)+(s.road.oneway===-1?Math.PI:0)};}}return best;}
export function roadRoute(from,to,g){if(!g.nodes.length)return [];const a=nearestRoad(from,g,true),b=nearestRoad(to,g,true);if(!a||!b)return [];const direction=s=>s.road.oneway??(s.road.one?1:0),ad=direction(a.segment),bd=direction(b.segment);if(a.segment===b.segment&&(!ad||ad*(b.t-a.t)>=0))return [{x:a.x,z:a.z},{x:b.x,z:b.z}];const start=ad===1?a.segment.b:ad===-1?a.segment.a:dist(from,g.nodes[a.segment.a])<dist(from,g.nodes[a.segment.b])?a.segment.a:a.segment.b;const goal=bd===1?b.segment.a:bd===-1?b.segment.b:dist(to,g.nodes[b.segment.a])<dist(to,g.nodes[b.segment.b])?b.segment.a:b.segment.b;
  const open=new Heap(),came=new Map(),scores=new Map([[start,0]]),closed=new Set();open.push({id:start,f:0});let found=false;while(open.length){const n=open.pop().id;if(closed.has(n))continue;if(n===goal){found=true;break;}closed.add(n);for(const e of g.nodes[n].edges){const s=scores.get(n)+e.d;if(s<(scores.get(e.id)??Infinity)){scores.set(e.id,s);came.set(e.id,n);open.push({id:e.id,f:s+dist(g.nodes[e.id],g.nodes[goal])});}}}if(!found)return [];
  const path=[goal];while(path[0]!==start){const prev=came.get(path[0]);if(prev===undefined)return [];path.unshift(prev);}return [{x:a.x,z:a.z},...path.map(i=>({x:g.nodes[i].x,z:g.nodes[i].z})),{x:b.x,z:b.z}];
}
export function safeRoadPoint(pos,g,index,r=1.3,allowed=()=>true,heightAt=null){
  const n=nearestRoad(pos,g,true);if(!n)return null;if(!collides(n.x,n.z,r,index,heightAt?.(n))&&allowed(n))return n;
  let best=null,distance=Infinity;
  for(const s of g.index.near(pos.x,pos.z,200)){if(!s.connected)continue;const a=g.nodes[s.a],b=g.nodes[s.b],ab=[a.x,a.z],bb=[b.x,b.z];const p=nearestOnSegment(pos.x,pos.z,ab,bb);const length=dist(a,b);for(const offset of [0,-3,3,-7,7]){const t=clamp(p.t+offset/Math.max(length,1),0,1),q={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,yaw:Math.atan2(b.x-a.x,b.z-a.z)+(s.road.oneway===-1?Math.PI:0),segment:s};const d=dist(q,pos);if(d<distance&&!collides(q.x,q.z,r,index,heightAt?.(q))&&allowed(q)){best=q;distance=d;}}}
  return best;
}
