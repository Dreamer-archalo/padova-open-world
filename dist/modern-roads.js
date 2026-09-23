import {Color} from './vendor/three.module.js';
import {nearestOnSegment} from './core.js';
import {surfaceBatch} from './surface-layers.js';

// A radial asphalt vertex can project onto another piece of the same OSM way.
// Keep true junction fans within the solved road's physical maximum grade:
// they join the intersection but cannot become a steep triangular roof.
export function junctionFanHeight(centre,sampled,radius){
 if(!Number.isFinite(sampled))return centre;
 const change=Math.max(0,radius)*.061;
 return Math.max(centre-change,Math.min(centre+change,sampled));
}

// Every paving vertex uses the same world-space height as vehicle contact.
// Paint is a thin decorative offset; sidewalks have no physical kerb step.
export function buildModernRoads(batch,segments,terrain){for(const _ of modernRoadSteps(batch,segments,terrain)){} }
export function* modernRoadSteps(batch,segments,terrain,{coarse=false}={}){
 const colours=new Map(),colour=hex=>{if(!colours.has(hex))colours.set(hex,new Color(hex));return colours.get(hex);};
 const joins=new Set();
 for(const s of segments){
  const road=s.road,ped=/^(pedestrian|footway|path|cycleway|steps)$/.test(road.k),rail=road.k==='tram',urban=!/motorway|trunk|track|path/.test(road.k);
  const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],length=Math.hypot(dx,dz);if(length<.01)continue;
  const nx=-dz/length,nz=dx/length,central=Math.hypot(...s.a)<1550,asphalt=colour(ped?(central?'#bdae91':'#aaa799'):rail?'#8c8980':central?'#535b5b':'#586164');
  const heights=new Map(),height=p=>{const key=p.join(',');if(!heights.has(key))heights.set(key,terrain.roads.sample(road,...p));return heights.get(key);};
  const writer=ped?surfaceBatch(batch,terrain,{pedestrian:true,exclude:road}):batch;
  const section=(a,b,left,right,offset,c)=>{const vertex=(p,side)=>{const x=p[0]+nx*side,z=p[1]+nz*side;return [x,terrain.roads.sample(road,x,z)+offset,z];};const vertices=[vertex(a,right),vertex(b,right),vertex(b,left),vertex(a,left)];if(vertices.every(p=>p.every(Number.isFinite)))writer.quad(...vertices,c);};
  const junctions=new Set();if(!coarse)for(const e of terrain.roads.index.near((s.a[0]+s.b[0])/2,(s.a[1]+s.b[1])/2,length/2+Math.max(12,road.w)))for(const id of [e.ia,e.ib])if(terrain.roads.nodes[id].degree>2)junctions.add(terrain.roads.nodes[id]);
  const junction=(x,z,radius=Math.max(6,road.w))=>[...junctions].some(n=>Math.hypot(x-n.x,z-n.z)<radius);
  const count=Math.ceil(length/(coarse?6:3));
  for(let i=0;i<count;i++){
   const a=[s.a[0]+dx*i/count,s.a[1]+dz*i/count],b=[s.a[0]+dx*(i+1)/count,s.a[1]+dz*(i+1)/count],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],atJunction=junction(...mid);
   section(a,b,-road.w/2-.3,road.w/2+.3,.025,colour('#969b95'));
   section(a,b,-road.w/2,road.w/2,.075,asphalt);
   // Elevated/inferred bridge decks need physical visual thickness. A thin pair
   // of fascias prevents the camera from reading the asphalt as a zero-thickness
   // floating plane while the continuous terrain/water remains visible below.
   if(road.crossing&&!ped)for(const side of [-1,1]){const thickness=.58,off=side*(road.w/2+.3),ax=a[0]+nx*off,az=a[1]+nz*off,bx=b[0]+nx*off,bz=b[1]+nz*off,t0=terrain.roads.sample(road,ax,az)+.025,t1=terrain.roads.sample(road,bx,bz)+.025;if([t0,t1].every(Number.isFinite))batch.quad([ax,t0,az],[bx,t1,bz],[bx,t1-thickness,bz],[ax,t0-thickness,az],colour('#8f918b'));}
   if(!coarse&&!ped&&!rail&&!atJunction){
    for(const side of [-1,1]){
     const edge=side*(road.w/2-.25);section(a,b,edge-.055,edge+.055,.082,colour('#d7d4c2'));
     if(urban){const off=side*(road.w/2+.65),x=mid[0]+nx*off,z=mid[1]+nz*off;
      // A bridge at a different height is not a junction: it must not erase
      // the sidewalk beneath it. Suppress pavement only for roads sharing the
      // actual walking/driving level, so it does not cover their intersection.
      const intersectingAtGrade=terrain.roads.candidates(x,z).some(c=>c.road!==road&&Math.abs(c.height-height(mid))<1.2);
      if(!intersectingAtGrade&&(road.crossing||terrain.waterDistance(x,z)>1))section(a,b,Math.min(side*road.w/2,side*(road.w/2+1.2)),Math.max(side*road.w/2,side*(road.w/2+1.2)),.075,colour('#b7b5a8'));
     }
    }
    if(road.w>=6.5&&!road.oneway&&Math.floor((i/count*length)/5)%2===0)section(a,b,-.06,.06,.09,colour('#d7d4c2'));
   }
   // At motorway/trunk merges and exits lane markings stop briefly instead of
   // drawing two incompatible lines through one another.
   if(!coarse&&!atJunction&&/motorway|trunk/.test(road.k)&&road.w>=7&&Math.floor((i/count*length)/6)%2===0){const offsets=road.oneway||road.one?[0]:[-road.w/4,road.w/4];for(const o of offsets)section(a,b,o-.075,o+.075,.09,colour('#ece5cd'));}
   if(i%4===0)yield;
   if(rail)for(const offset of [-.7,.7])section(a,b,offset-.055,offset+.055,.081,colour('#bdc8c9'));
  }
  // Old fan caps were emitted at EVERY 3–9 m segment end, producing circular
  // overlapping asphalt and stray upward triangles. Close only real graph
  // junctions, and only once per road / junction, not straight road seams.
  for(const p of [s.a,s.b]){if(coarse||!junction(p[0],p[1],.3))continue;const key=road.surfaceId+':'+p.join(',');if(joins.has(key))continue;joins.add(key);const y=terrain.roads.sample(road,...p)+.077;
   for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6,r=road.w/2+.15;const vertex=t=>{const x=p[0]+Math.cos(t)*r,z=p[1]+Math.sin(t)*r;return [x,junctionFanHeight(y,terrain.roads.sample(road,x,z)+.077,r),z];};writer.tri([p[0],y,p[1]],vertex(b),vertex(a),asphalt);}
  }
  yield;
 }
}
