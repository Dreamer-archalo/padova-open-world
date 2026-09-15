import {vehicleFootprint} from './movement.js';
import {nearestOnSegment} from './core.js';

// The same boxes feed rendering, vehicle/foot collision, and camera collision.
export function roadStructures(terrain){const boxes=[],portals=new Set();
 const add=(x,z,y,w,h,length,yaw,kind,road,extra={})=>{if(h<=0)return null;const p=vehicleFootprint(x,z,yaw,w,length),xs=p.map(p=>p[0]),zs=p.map(p=>p[1]),item={x,z,y,w,h,length,yaw,kind,road,p,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:y,...extra};boxes.push(item);return item;};
 const underpassPortal=(upperRoad,x,z,upperYaw,deckBottom)=>{
  if(!terrain.modern)return;
  const candidates=terrain.roads.candidates(x,z,Math.max(6,upperRoad.w/2+5)).filter(s=>{
   if(s.road===upperRoad||/footway|path|steps|cycleway|tram|pedestrian/.test(s.road.k)||['no','private'].includes(s.road.access))return false;
   const a=s.segment.a,b=s.segment.b,yaw=Math.atan2(b[0]-a[0],b[1]-a[1]),angle=Math.abs(Math.sin(upperYaw-yaw));
   return angle>.20&&s.d<=s.road.w/2+2.2&&s.height<deckBottom-2.8&&s.height>deckBottom-11;
  }).sort((a,b)=>b.height-a.height||a.d-b.d);
  const lower=candidates[0];if(!lower)return;
  const q=nearestOnSegment(x,z,lower.segment.a,lower.segment.b),lowerYaw=Math.atan2(lower.segment.b[0]-lower.segment.a[0],lower.segment.b[1]-lower.segment.a[1]),lowerY=lower.height+.05,clearance=deckBottom-lowerY;
  if(clearance<3.2)return;
  const key=(lower.road.surfaceId??lower.road.k)+':'+Math.round(q.x/9)+','+Math.round(q.z/9);if(portals.has(key))return;portals.add(key);
  // Keep the carriageway physically and visually open. The old faux arch used
  // collisionless blocks across the road, so cars visibly passed through them.
  // Real bridge mass is already supplied by the deck above; here we only add
  // side piers well outside the lower road envelope.
  const opening=Math.max(7.4,lower.road.w+3.2),depth=Math.max(2.0,Math.min(3.6,upperRoad.w*.30)),pierW=.62,side=opening/2+pierW/2,archTop=deckBottom+.03,pierH=archTop-lowerY;
  for(const sign of [-1,1]){const px=q.x+Math.cos(lowerYaw)*side*sign,pz=q.z-Math.sin(lowerYaw)*side*sign;add(px,pz,lowerY-.05,pierW,pierH+.05,depth,lowerYaw,'underpass-pier',upperRoad,{color:'#8f918b'});}
 };
 for(const profile of terrain.roads.profiles.values()){const road=profile.road;if(!(road.crossing||road.b||Number(road.layer)>0)||road.k==='tram')continue;let run=0;
  for(let i=1;i<profile.points.length;i++){const a=profile.points[i-1],b=profile.points[i],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;if(terrain.prato(x,z))continue;const h=terrain.roads.sample(road,x,z),base=terrain.elevation(x,z),len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(h-base<.7&&!profile.wet[i]&&!profile.wet[i-1]&&!road.b&&Number(road.layer)<=0)continue;
   const yaw=Math.atan2(b[0]-a[0],b[1]-a[1]),edge=road.w/2+(terrain.modern?(/motorway|trunk/.test(road.k)?1.5:1.05):.7);
   for(const side of [-1,1]){const px=x+Math.cos(yaw)*edge*side,pz=z-Math.sin(yaw)*edge*side;
    // Keep barriers outside the usable carriageway, especially on fast motorway
    // bridges, and suppress them where another same-level road joins.
    if(terrain.roads.candidates(px,pz,terrain.modern?1.9:.25).some(s=>s.road!==road&&Math.abs(s.height-h)<(terrain.modern?3:1.5)))continue;
    add(px,pz,h,.24,1.02,len+.04,yaw,'parapet',road);
    if(run>=24&&h-base>3&&!terrain.roads.candidates(px,pz,terrain.modern?2.4:1).some(s=>s.road!==road&&(terrain.modern||s.height<h-2))){add(px,pz,base-.2,.9,h-base+.2,.9,yaw,'pier',road);}
   }run+=len;if(run>=30)run=0;
   // A thin deck has height-aware collision: actors below it can pass underneath.
   const deckTop=terrain.modern?Math.min(terrain.roads.sample(road,...a),terrain.roads.sample(road,...b),h)-.12:h-.05,deck=add(x,z,deckTop-.35,road.w+1.0,.35,len+.05,yaw,'deck',road);if(terrain.modern&&deck){deck.driveTopMin=deckTop+.12;underpassPortal(road,x,z,yaw,deckTop-.35);}
  }
 }
 if(terrain.modern)return boxes.filter(b=>{
  if(/^underpass-/.test(b.kind))return true;
  const candidates=[];for(const t of [-.5,-.25,0,.25,.5]){const x=b.x+Math.sin(b.yaw)*b.length*t,z=b.z+Math.cos(b.yaw)*b.length*t;for(const s of terrain.roads.candidates(x,z,b.kind==='deck'?0:1.3))if(s.road!==b.road&&!/footway|path|steps|cycleway|tram|pedestrian/.test(s.road.k))candidates.push(s);}
  if(b.kind!=='deck')return !candidates.some(s=>s.height+2>b.minY&&s.height<b.minY+b.h+.2);
  const adjacent=candidates.filter(s=>Math.abs(s.height-b.driveTopMin)<2);
  if(adjacent.length){b.driveTopMin=Math.min(b.driveTopMin,...adjacent.map(s=>s.height));b.minY=b.y=b.driveTopMin-.47;}
  return true;
 });
 return boxes;
}
