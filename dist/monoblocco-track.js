import {pointInside,nearestOnSegment,clamp} from './core.js';

function edgeDistance(x,z,poly){let result=Infinity;for(let i=0;i<poly.length;i++){const p=nearestOnSegment(x,z,poly[i],poly[(i+1)%poly.length]);result=Math.min(result,Math.hypot(x-p.x,z-p.z));}return result;}
export function roofClear(poly,x,z,margin=3){return pointInside(x,z,poly)&&edgeDistance(x,z,poly)>=margin;}
function safeLine(poly,a,b,margin=3){const length=Math.hypot(b.x-a.x,b.z-a.z);for(let n=0;n<=Math.ceil(length/2);n++){const t=n/Math.max(1,Math.ceil(length/2)),x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(!roofClear(poly,x,z,margin))return false;}return true;}
function sampleLine(a,b,step=2){const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/step));return Array.from({length:count},(_,i)=>{const t=i/count;return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};});}
function farthest(start,allowed,adj){const queue=[start],parent=new Map([[start,null]]);for(let i=0;i<queue.length;i++)for(const next of adj.get(queue[i])||[])if(allowed.has(next)&&!parent.has(next)){parent.set(next,queue[i]);queue.push(next);}return {last:queue.at(-1),parent,size:queue.length};}
function centreLine(poly,nodes,excluded){const valid=new Set(nodes.keys());for(const key of excluded)valid.delete(key);if(valid.size<12)return null;const adj=new Map();for(const [key,node] of nodes){if(!valid.has(key))continue;const neighbours=[];for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const other=nodes.get((node.i+di)+','+(node.j+dj));if(other&&valid.has(other.key)&&safeLine(poly,node,other,3.6))neighbours.push(other.key);}adj.set(key,neighbours);}
 let winner=null;const unseen=new Set(valid);
 while(unseen.size){const seed=unseen.values().next().value,component=farthest(seed,unseen,adj),group=new Set(component.parent.keys());for(const key of group)unseen.delete(key);if(group.size<12)continue;const a=farthest(seed,group,adj).last,b=farthest(a,group,adj),path=[];for(let key=b.last;key!=null;key=b.parent.get(key))path.push(nodes.get(key));path.reverse();if(!winner||path.length>winner.length)winner=path;}
 if(!winner||winner.length<12)return null;
 const simplified=[winner[0]];for(let i=0;i<winner.length-1;){let j=winner.length-1;while(j>i+1&&!safeLine(poly,winner[i],winner[j],4.2))j--;simplified.push(winner[j]);i=j;}
 let smooth=simplified.map(p=>({x:p.x,z:p.z}));for(let pass=0;pass<2;pass++){const candidate=[smooth[0]];for(let i=0;i<smooth.length-1;i++){const a=smooth[i],b=smooth[i+1];candidate.push({x:a.x*.75+b.x*.25,z:a.z*.75+b.z*.25},{x:a.x*.25+b.x*.75,z:a.z*.25+b.z*.75});}candidate.push(smooth.at(-1));if(candidate.every(p=>roofClear(poly,p.x,p.z,3.7))&&candidate.slice(1).every((p,i)=>safeLine(poly,candidate[i],p,3.5)))smooth=candidate;}
 const samples=[];for(let i=0;i<smooth.length-1;i++)samples.push(...sampleLine(smooth[i],smooth[i+1],2));samples.push(smooth.at(-1));return samples.length>=15?samples:null;
}
function circuit(poly,centre,offset=1.35){const tangent=(i)=>{const a=centre[Math.max(0,i-1)],b=centre[Math.min(centre.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,m=Math.hypot(dx,dz)||1;return {dx:dx/m,dz:dz/m};};
 const left=centre.map((p,i)=>{const t=tangent(i);return {x:p.x+t.dz*offset,z:p.z-t.dx*offset};}),right=centre.map((p,i)=>{const t=tangent(i);return {x:p.x-t.dz*offset,z:p.z+t.dx*offset};});
 const end=centre.at(-1),te=tangent(centre.length-1),start=centre[0],ts=tangent(0);
 const turnEnd=Array.from({length:11},(_,i)=>{const a=i/10*Math.PI;return {x:end.x+te.dz*offset*Math.cos(a)+te.dx*offset*Math.sin(a),z:end.z-te.dx*offset*Math.cos(a)+te.dz*offset*Math.sin(a)};});
 const turnStart=Array.from({length:11},(_,i)=>{const a=i/10*Math.PI;return {x:start.x-ts.dz*offset*Math.cos(a)-ts.dx*offset*Math.sin(a),z:start.z+ts.dx*offset*Math.cos(a)-ts.dz*offset*Math.sin(a)};});
 const points=[...left,...turnEnd.slice(1,-1),...right.reverse(),...turnStart.slice(1,-1)];if(!points.every(p=>roofClear(poly,p.x,p.z,2.35)))return null;for(let i=0;i<points.length;i++)if(!safeLine(poly,points[i],points[(i+1)%points.length],2.25))return null;
 const lengths=[0];for(let i=0;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[(i+1)%points.length].x-points[i].x,points[(i+1)%points.length].z-points[i].z));return {points,lengths,total:lengths.at(-1)};
}
export function findLayout(poly,b){const size=4,x0=b.minX+2,z0=b.minZ+2,nodes=new Map(),helis=[];
 for(let i=0;x0+i*size<b.maxX-2;i++)for(let j=0;z0+j*size<b.maxZ-2;j++){const x=x0+i*size,z=z0+j*size,key=i+','+j;if(roofClear(poly,x,z,4.6))nodes.set(key,{i,j,key,x,z});if(roofClear(poly,x,z,16.3))helis.push({x,z});}
 let best=null;
 for(const pad of helis){const excluded=new Set();for(const [key,p] of nodes)if(Math.hypot(p.x-pad.x,p.z-pad.z)<18.5)excluded.add(key);const centre=centreLine(poly,nodes,excluded);if(!centre)continue;const path=circuit(poly,centre);if(!path||path.total<45||path.points.some(p=>Math.hypot(p.x-pad.x,p.z-pad.z)<15.5))continue;const score=path.total;if(!best||score>best.score)best={...path,helipad:pad,score,centerline:centre};}
 return best;
}
export function onTrack(layout,t){const d=(((t%1)+1)%1)*layout.total,ends=layout.lengths;let lo=0,hi=ends.length-2;while(lo<hi){const mid=(lo+hi)>>1;if(ends[mid+1]<d)lo=mid+1;else hi=mid;}const i=lo,points=layout.points,a=points[i],b=points[(i+1)%points.length],f=clamp((d-ends[i])/Math.max(1e-6,ends[i+1]-ends[i]),0,1),dx=b.x-a.x,dz=b.z-a.z;return {x:a.x+dx*f,z:a.z+dz*f,yaw:Math.atan2(dx,dz),dx,dz};}
