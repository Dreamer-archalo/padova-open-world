import {vehicleFootprint} from './movement.js';

// The same boxes feed rendering, vehicle/foot collision, and camera collision.
export function roadStructures(terrain){const boxes=[];
 const add=(x,z,y,w,h,length,yaw,kind,road)=>{if(h<=0)return;const p=vehicleFootprint(x,z,yaw,w,length),xs=p.map(p=>p[0]),zs=p.map(p=>p[1]);boxes.push({x,z,y,w,h,length,yaw,kind,road,p,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:y});};
 for(const profile of terrain.roads.profiles.values()){const road=profile.road;if(!road.crossing||road.k==='tram')continue;let run=0;
  for(let i=1;i<profile.points.length;i++){const a=profile.points[i-1],b=profile.points[i],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;if(terrain.prato(x,z))continue;const h=terrain.roads.sample(road,x,z),base=terrain.elevation(x,z),len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(h-base<.7&&!profile.wet[i]&&!profile.wet[i-1])continue;
   const yaw=Math.atan2(b[0]-a[0],b[1]-a[1]);
   for(const side of [-1,1]){const px=x+Math.cos(yaw)*(road.w/2+.7)*side,pz=z-Math.sin(yaw)*(road.w/2+.7)*side;
    // Do not put a parapet across a connected approach or a parallel carriageway.
    if(terrain.roads.candidates(px,pz,.25).some(s=>s.road!==road&&Math.abs(s.height-h)<1.5))continue;
    add(px,pz,h,.28,1.1,len+.04,yaw,'parapet',road);
    if(run>=24&&h-base>3&&!terrain.roads.candidates(px,pz,1).some(s=>s.road!==road&&s.height<h-2)){add(px,pz,base-.2,1.0,h-base+.2,1.0,yaw,'pier',road);}
   }run+=len;if(run>=30)run=0;
   // A thin deck has height-aware collision: actors below it can pass underneath.
   add(x,z,h-.4,road.w+.8,.35,len+.05,yaw,'deck',road);
  }
 }
 return boxes;
}
