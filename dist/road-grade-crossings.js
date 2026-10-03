// Crossing OSM centre lines are only a junction when they share a mapped vertex.
// Find missing overpass tags once while the map loads, never during a frame.
const express=k=>/^(motorway|trunk)(?:_link)?$/.test(k||'');
const drive=k=>!/^(footway|path|steps|cycleway|pedestrian|tram|construction)$/.test(k||'');
const rank=r=>/cavalcavia|viadotto|sopraelevat/i.test(r.n||'')?8:
 /^(motorway|trunk)$/.test(r.k||'')?6:/^(motorway|trunk)_link$/.test(r.k||'')?4:
 /^(primary|secondary)$/.test(r.k||'')?3:1;
const explicit=r=>r.b||r.bridge||Number(r.layer)>0;
const shared=(a,b)=>a.p?.some(p=>b.p?.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<.25));
export function findGradeCrossings(roads,{cell=90,minimumAngle=.23}={}){
 const cells=new Map(),segments=[];
 for(const road of roads){if(!drive(road.k)||!road.p?.length)continue;
  for(let i=1;i<road.p.length;i++){
   const a=road.p[i-1],b=road.p[i],dx=b[0]-a[0],dz=b[1]-a[1];
   if(Math.hypot(dx,dz)<1)continue;
   const s={road,i,a,b,dx,dz},minX=Math.floor(Math.min(a[0],b[0])/cell),maxX=Math.floor(Math.max(a[0],b[0])/cell),minZ=Math.floor(Math.min(a[1],b[1])/cell),maxZ=Math.floor(Math.max(a[1],b[1])/cell);
   s.id=segments.length;segments.push(s);
   for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){
    const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(s);
   }
  }
 }
 const found=[],pairs=new Set(),connected=new Map();
 for(const s of segments){if(!express(s.road.k)&&!explicit(s.road)&&rank(s.road)<=6)continue;
  const minX=Math.floor(Math.min(s.a[0],s.b[0])/cell),maxX=Math.floor(Math.max(s.a[0],s.b[0])/cell),minZ=Math.floor(Math.min(s.a[1],s.b[1])/cell),maxZ=Math.floor(Math.max(s.a[1],s.b[1])/cell);
  for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++)for(const t of cells.get(x+','+z)||[]){
   if(t.id===s.id||t.road===s.road||(!express(t.road.k)&&!express(s.road.k)&&!explicit(t.road)&&!explicit(s.road)))continue;
   const key=Math.min(s.id,t.id)+','+Math.max(s.id,t.id);if(pairs.has(key))continue;pairs.add(key);
   const den=s.dx*t.dz-s.dz*t.dx,angle=Math.abs(den)/(Math.hypot(s.dx,s.dz)*Math.hypot(t.dx,t.dz));if(angle<minimumAngle)continue;
   const ox=t.a[0]-s.a[0],oz=t.a[1]-s.a[1],u=(ox*t.dz-oz*t.dx)/den,v=(ox*s.dz-oz*s.dx)/den;
   if(u<=.001||u>=.999||v<=.001||v>=.999)continue;
   const px=s.a[0]+s.dx*u,pz=s.a[1]+s.dz*u;
   // Merge lanes and real slip-road junctions keep their shared OSM node.
   const a=s.road,b=t.road;
   let joins=connected.get(a)?.get(b);if(joins===undefined){joins=shared(a,b);if(!connected.has(a))connected.set(a,new Map());connected.get(a).set(b,joins);}
   if(joins)continue;
   const aExplicit=explicit(a),bExplicit=explicit(b);
   if(aExplicit&&bExplicit&&Number(a.layer)===Number(b.layer))continue;
   let upper,lower;if(aExplicit!==bExplicit){upper=aExplicit?a:b;lower=aExplicit?b:a;}
   else if(rank(a)!==rank(b)){upper=rank(a)>rank(b)?a:b;lower=upper===a?b:a;}
   else continue;
   // Without an overpass tag or named bridge, two expressway slip roads may
   // merge in the same plane. Their crossing alone does not establish a deck.
   if(!explicit(upper)&&express(lower.k)&&express(upper.k)&&
      (/_link$/.test(lower.k)||/_link$/.test(upper.k))&&
      !/cavalcavia|viadotto|sopraelevat/i.test(upper.n||''))continue;
   if(!express(upper.k)&&!explicit(upper)&&!/cavalcavia|viadotto|sopraelevat/i.test(upper.n||''))continue;
   found.push({upper,lower,x:px,z:pz,upperSegment:upper===a?s.i:t.i,
    lowerSegment:lower===a?s.i:t.i});
  }
 }
 return found;
}

// The imported bridge tag often covers only a short deck. Its road continues
// through untagged OSM ways; keep those approaches on the same vertical graph
// until there is room for a driveable rise or fall.
export function extendGradeApproaches(roads,crossings,reach=130){
 const key=p=>p[0].toFixed(1)+','+p[1].toFixed(1),ends=new Map();
 for(const r of roads)if(r.p?.length>1)for(const p of [r.p[0],r.p.at(-1)]){
  const k=key(p);if(!ends.has(k))ends.set(k,[]);ends.get(k).push(r);
 }
 for(const c of crossings){if(express(c.upper.k))continue;c.upper.gradeSeparated=true;
  for(const start of [0,1]){
   const r=c.upper,side=start,remaining=reach-Math.hypot(r.p[side?r.p.length-1:0][0]-c.x,r.p[side?r.p.length-1:0][1]-c.z);
   const queue=[{r,side,remaining}],seen=new Set([r]);
   while(queue.length){
    const {r,side,remaining}=queue.shift();if(remaining<=0)continue;
    const p=r.p[side?r.p.length-1:0],prev=r.p[side?r.p.length-2:1],dx=p[0]-prev[0],dz=p[1]-prev[1],d=Math.hypot(dx,dz)||1;
    const choices=(ends.get(key(p))||[]).filter(v=>!seen.has(v)&&v!==c.lower).map(v=>{
     const nextSide=key(v.p[0])===key(p)?0:1,q=v.p[nextSide? v.p.length-2:1],vx=q[0]-p[0],vz=q[1]-p[1],vd=Math.hypot(vx,vz)||1;
     const cosine=(dx*vx+dz*vz)/d/vd,sameName=!!r.n&&r.n===v.n,expressMatch=express(r.k)&&express(v.k);
     return {v,nextSide,cosine,score:cosine+(sameName?.5:0)+(expressMatch?.2:0)};
    }).filter(v=>v.cosine>.65&&((!!r.n&&v.v.n===r.n)||(express(v.v.k)&&express(r.k))));
    choices.sort((a,b)=>b.score-a.score);
    for(const next of choices){if(seen.has(next.v))continue;seen.add(next.v);next.v.gradeSeparated=true;
     let left=remaining;for(let i=1;i<next.v.p.length;i++)left-=Math.hypot(next.v.p[i][0]-next.v.p[i-1][0],next.v.p[i][1]-next.v.p[i-1][1]);
     queue.push({r:next.v,side:1-next.nextSide,remaining:left});
    }
   }
  }
 }
}
