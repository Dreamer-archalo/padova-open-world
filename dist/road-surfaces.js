import {SpatialIndex,nearestOnSegment,clamp} from './core.js';

export const MAX_GRADE=.085;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
class MaxHeap{constructor(){this.a=[];}push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p].h>=v.h)break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}pop(){const first=this.a[0],v=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let j=i*2+1;if(j+1<this.a.length&&this.a[j+1].h>this.a[j].h)j++;if(this.a[j].h<=v.h)break;this.a[i]=this.a[j];i=j;}this.a[i]=v;}return first;}}

// A sampled road graph propagates approach ramps ACROSS way boundaries. Crossings
// without a shared OSM vertex stay separate, so the lower street remains usable.
export class RoadSurfaces{
 constructor(map,terrain){this.terrain=terrain;this.index=new SpatialIndex(80);this.nodes=[];this.profiles=new Map();this.report={roads:map.roads.length,inferred:[],submergedEnds:[],steep:[],layers:0,culverts:0};const lookup=new Map();
  const node=(p,shared)=>{if(!shared){const base=terrain.prato(...p)?terrain.pratoHeight+.28:terrain.elevation(...p);this.nodes.push({x:p[0],z:p[1],base,h:base,edges:[]});return this.nodes.length-1;}const key=p[0].toFixed(1)+','+p[1].toFixed(1);if(!lookup.has(key)){lookup.set(key,this.nodes.length);const base=terrain.prato(...p)?terrain.pratoHeight+.28:terrain.elevation(...p);this.nodes.push({x:p[0],z:p[1],base,h:base,edges:[]});}return lookup.get(key);};
  for(const [id,road] of map.roads.entries()){
   const ids=[],points=[];for(let i=1;i<road.p.length;i++){const a=road.p[i-1],b=road.p[i],n=Math.max(1,Math.ceil(distance(a,b)/6));for(let j=i===1?0:1;j<=n;j++){const p=[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n];points.push(p);ids.push(node(p,j===0||j===n));}}
   if(ids.length<2)continue;
   const wet=points.map(p=>!terrain.prato(...p)&&terrain.waterDistance(...p)<0),hasWater=wet.some(Boolean),explicit=!!road.b,layer=Number(road.layer)||0,tunnel=!!road.tunnel;
   // Underground waterways are removed from the open-water index by Terrain.
   // A continuous mapped road crossing open water is supported even if bridge is missing.
   const inferred=hasWater&&!explicit&&!tunnel;road.crossing=explicit||inferred;road.surfaceId=id;
   if(inferred)this.report.inferred.push(id);if(wet[0]||wet.at(-1))this.report.submergedEnds.push(id);if(layer||tunnel)this.report.layers++;
   const profile={id,road,ids,points,wet,hasWater,layer,tunnel};this.profiles.set(road,profile);
   for(let i=0;i<ids.length;i++){
    const n=this.nodes[ids[i]];
    // Layer is ordering rather than a measured height. Use urban design clearance.
    const lift=terrain.prato(n.x,n.z)?0:explicit&&!hasWater?Math.max(1,layer)*5.4:layer>0?layer*5.4:0;
    const deck=wet[i]?Math.max(n.base,terrain.waterHeight(n.x,n.z)+2.2):n.base;
    if(!tunnel)n.h=Math.max(n.h,deck+lift);
    if(i){const prev=this.nodes[ids[i-1]],d=distance(points[i-1],points[i]);const grade=road.k==='steps'?.65:MAX_GRADE;n.edges.push({id:ids[i-1],d,grade});prev.edges.push({id:ids[i],d,grade});const s={a:points[i-1],b:points[i],ia:ids[i-1],ib:ids[i],profile};this.index.add(s,Math.min(s.a[0],s.b[0])-road.w,Math.min(s.a[1],s.b[1])-road.w,Math.max(s.a[0],s.b[0])+road.w,Math.max(s.a[1],s.b[1])+road.w);}
   }
  }
  // Depression propagates beyond tunnel way endpoints, creating usable approaches.
  const lower=new MaxHeap();for(const p of this.profiles.values())if(p.tunnel)for(const id of p.ids){const n=this.nodes[id];n.h=Math.min(n.h,n.base-5.4);lower.push({id,h:-n.h});}
  while(lower.a.length){const item=lower.pop(),n=this.nodes[item.id];if(item.h<-n.h-.001)continue;for(const e of n.edges){const q=this.nodes[e.id],h=n.h+e.d*e.grade;if(h<q.h-.001){q.h=h;lower.push({id:e.id,h:-h});}}}
  const heap=new MaxHeap();this.nodes.forEach((n,id)=>heap.push({id,h:n.h}));
  while(heap.a.length){const item=heap.pop(),n=this.nodes[item.id];if(item.h<n.h-.001)continue;for(const edge of n.edges){const q=this.nodes[edge.id],h=n.h-edge.d*edge.grade;if(h>q.h+.001){q.h=h;heap.push({id:edge.id,h});}}}
  // Enforce clearance at geometric crossings, independent of neighbourhood names.
  // Bound the iterations: contradictory map topology is reported by the audit.
  const crossings=[];const order=p=>p.layer||(p.tunnel?-1:p.road.b?1:0);
  for(const p of this.profiles.values()){if(order(p)<=0)continue;for(let i=1;i<p.points.length;i++){
   const a=p.points[i-1],b=p.points[i],dx=b[0]-a[0],dz=b[1]-a[1];
   for(const s of this.index.near((a[0]+b[0])/2,(a[1]+b[1])/2,8)){if(s.profile===p||order(s.profile)>=order(p))continue;const c=s.a,d=s.b,ex=d[0]-c[0],ez=d[1]-c[1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-6)continue;const u=((c[0]-a[0])*ez-(c[1]-a[1])*ex)/den,v=((c[0]-a[0])*dz-(c[1]-a[1])*dx)/den;if(u<=.001||u>=.999||v<=.001||v>=.999)continue;
    crossings.push({maxLift:Math.max(1,order(p))*6+3,ia:p.ids[i-1],ib:p.ids[i],u,other:s,v,clearance:['footway','path','cycleway','steps'].includes(s.profile.road.k)?2.6:4.8});
   }
  }}
  for(let pass=0;pass<4;pass++){const heap=new MaxHeap();for(const c of crossings){const a=this.nodes[c.ia],b=this.nodes[c.ib],required=this.segmentHeight(c.other,c.v)+c.clearance+.4,current=a.h*(1-c.u)+b.h*c.u;if(required>current+.01){const lift=Math.min(2,required-current,a.base+c.maxLift-a.h,b.base+c.maxLift-b.h);if(lift<=.01)continue;a.h+=lift;b.h+=lift;heap.push({id:c.ia,h:a.h});heap.push({id:c.ib,h:b.h});}}
   if(!heap.a.length)break;while(heap.a.length){const item=heap.pop(),n=this.nodes[item.id];if(item.h<n.h-.001)continue;for(const e of n.edges){const q=this.nodes[e.id],h=n.h-e.d*e.grade;if(h>q.h+.001){q.h=h;heap.push({id:e.id,h});}}}
  }
  // Broad elevation noise is grade-limited as well; do not make a road follow a crater.
  for(const profile of this.profiles.values())for(let i=1;i<profile.ids.length;i++){const a=this.nodes[profile.ids[i-1]],b=this.nodes[profile.ids[i]],grade=Math.abs(a.h-b.h)/Math.max(.01,distance(profile.points[i-1],profile.points[i]));if(grade>(profile.road.k==='steps'?.65:MAX_GRADE)+.005)this.report.steep.push({road:profile.id,grade});}
  for(const n of this.nodes){n.degree=new Set(n.edges.map(e=>e.id)).size;delete n.edges;}
 }
 sample(road,x,z){const profile=this.profiles.get(road);if(!profile)return this.terrain.elevation(x,z);let best=null,d=Infinity;for(const s of this.index.near(x,z,road.w+8)){if(s.profile!==profile)continue;const q=nearestOnSegment(x,z,s.a,s.b),dd=Math.hypot(x-q.x,z-q.z);if(dd<d){d=dd;best={s,q};}}if(!best)return this.terrain.elevation(x,z);return this.segmentHeight(best.s,best.q.t);}
 segmentHeight(s,t){const a=this.nodes[s.ia],b=this.nodes[s.ib];return a.h*(1-t)+b.h*t;}
 candidates(x,z,margin=0){const found=[];for(const s of this.index.near(x,z)){const q=nearestOnSegment(x,z,s.a,s.b),d=Math.hypot(x-q.x,z-q.z);if(d<=s.profile.road.w/2+margin)found.push({height:this.segmentHeight(s,q.t),road:s.profile.road,d,segment:s});}return found;}
 at(x,z,referenceY=null,margin=0){const candidates=this.candidates(x,z,margin);if(!candidates.length)return null;const base=referenceY??this.terrain.elevation(x,z);candidates.sort((a,b)=>Math.abs(a.height-base)-Math.abs(b.height-base)||a.d-b.d);return candidates[0];}
 bridge(x,z,referenceY=null){if(referenceY===null)return this.candidates(x,z).find(s=>s.road.crossing)||null;const s=this.at(x,z,referenceY);return s?.road.crossing?s:null;}
}
