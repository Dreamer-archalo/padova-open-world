import {Color} from './vendor/three.module.js';
import {nearestOnSegment} from './core.js';

// Centreline sampling keeps both sides at the same cross-section elevation.
// Paint and pavement use exactly the same smooth profile as vehicle physics.
export function buildModernRoads(batch,segments,terrain){for(const _ of modernRoadSteps(batch,segments,terrain)){} }
export function* modernRoadSteps(batch,segments,terrain){
 const colours=new Map(),colour=hex=>{if(!colours.has(hex))colours.set(hex,new Color(hex));return colours.get(hex);};
 const joins=new Set();
 for(const s of segments){
  const road=s.road,ped=/^(pedestrian|footway|path|cycleway|steps)$/.test(road.k),rail=road.k==='tram',urban=!/motorway|trunk|track|path/.test(road.k);
  const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],length=Math.hypot(dx,dz);if(length<.01)continue;
  const nx=-dz/length,nz=dx/length,central=Math.hypot(...s.a)<1550,asphalt=colour(ped?(central?'#bdae91':'#aaa799'):rail?'#8c8980':central?'#535b5b':'#586164');
  const heights=new Map(),height=p=>{const key=p.join(',');if(!heights.has(key))heights.set(key,terrain.roads.sample(road,...p));return heights.get(key);};
  const section=(a,b,left,right,offset,c)=>{const h0=height(a)+offset,h1=height(b)+offset;batch.quad([a[0]+nx*left,h0,a[1]+nz*left],[b[0]+nx*left,h1,b[1]+nz*left],[b[0]+nx*right,h1,b[1]+nz*right],[a[0]+nx*right,h0,a[1]+nz*right],c);};
  const junctions=new Set();for(const e of terrain.roads.index.near((s.a[0]+s.b[0])/2,(s.a[1]+s.b[1])/2,length/2+Math.max(12,road.w)))for(const id of [e.ia,e.ib])if(terrain.roads.nodes[id].degree>2)junctions.add(terrain.roads.nodes[id]);
  const junction=(x,z)=>[...junctions].some(n=>Math.hypot(x-n.x,z-n.z)<Math.max(6,road.w));
  const count=Math.ceil(length/3);
  for(let i=0;i<count;i++){
   const a=[s.a[0]+dx*i/count,s.a[1]+dz*i/count],b=[s.a[0]+dx*(i+1)/count,s.a[1]+dz*(i+1)/count],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],atJunction=junction(...mid);
   section(a,b,-road.w/2-.3,road.w/2+.3,.025,colour('#969b95'));
   section(a,b,-road.w/2,road.w/2,.075,asphalt);
   if(!ped&&!rail&&!atJunction){
    for(const side of [-1,1]){
     const edge=side*(road.w/2-.25);section(a,b,edge-.055,edge+.055,.086,colour('#d7d4c2'));
     if(urban&&!road.crossing){const off=side*(road.w/2+.65),x=mid[0]+nx*off,z=mid[1]+nz*off;
      if(!terrain.roads.candidates(x,z).some(c=>c.road!==road)&&terrain.waterDistance(x,z)>1)section(a,b,Math.min(side*road.w/2,side*(road.w/2+1.2)),Math.max(side*road.w/2,side*(road.w/2+1.2)),.13,colour('#b7b5a8'));
     }
    }
    if(road.w>=6.5&&!road.oneway&&Math.floor((i/count*length)/5)%2===0)section(a,b,-.06,.06,.09,colour('#d7d4c2'));
   }
   if(rail)for(const offset of [-.7,.7])section(a,b,offset-.055,offset+.055,.1,colour('#bdc8c9'));
  }
  // Bounded fan fills corner wedges; sample the road rather than a horizontal cap.
  for(const p of [s.a,s.b]){const key=road.surfaceId+':'+p.join(',');if(joins.has(key))continue;joins.add(key);const y=terrain.roads.sample(road,...p)+.077;
   for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6,r=road.w/2;const vertex=t=>{const x=p[0]+Math.cos(t)*r,z=p[1]+Math.sin(t)*r,q=nearestOnSegment(x,z,s.a,s.b);return [x,terrain.roads.sample(road,x,z)+.077,z];};batch.tri([p[0],y,p[1]],vertex(a),vertex(b),asphalt);}
  }
  yield;
 }
}
