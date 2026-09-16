import {vehicleFootprint} from './movement.js';
import {nearestOnSegment} from './core.js';

// These same boxes render in CityWorld and supply collision for people, cars and camera.
export function roadStructures(terrain){
 const boxes=[],portals=new Set();
 const add=(x,z,y,w,h,length,yaw,kind,road,extra={})=>{if(!(h>0))return null;const p=vehicleFootprint(x,z,yaw,w,length),xs=p.map(v=>v[0]),zs=p.map(v=>v[1]);const item={x,z,y,w,h,length,yaw,kind,road,p,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:y,...extra};boxes.push(item);return item;};
 const roadConflict=(road,x,z,base,top,radius=1)=>terrain.roads.candidates(x,z,Math.max(1,radius)).some(s=>{
  if(s.road===road||/footway|path|steps|cycleway|tram|pedestrian/.test(s.road.k))return false;
  // Never put a physical column in the envelope of a road underneath or beside the bridge.
  const close=s.d<=s.road.w/2+radius+.15;
  return close&&s.height>=base-2&&s.height<top+2;
 });
 const support=(road,x,z,yaw,base,deckBottom,edge)=>{
  if(!(deckBottom-base>2.25))return 0;
  let added=0;
  for(const side of [-1,1])for(const extra of [0,1.6,3.5,6.5,9.5,13]){
   const offset=(edge+extra)*side,px=x+Math.cos(yaw)*offset,pz=z-Math.sin(yaw)*offset;
   if(roadConflict(road,px,pz,base,deckBottom,1.05))continue;
   // One pier per bank is preferable to a fake arch across the lower carriageway.
   add(px,pz,base-.22,1.02,deckBottom-base+.24,1.02,yaw,'pier',road,{color:'#8f918b'});
   added++;break;
  }
  return added;
 };
 const underpassPortal=(road,x,z,upperYaw,deckBottom)=>{
  if(!terrain.modern)return;
  const candidates=terrain.roads.candidates(x,z,Math.max(6,road.w/2+5)).filter(s=>{
   if(s.road===road||/footway|path|steps|cycleway|tram|pedestrian/.test(s.road.k)||['no','private'].includes(s.road.access))return false;
   const a=s.segment.a,b=s.segment.b,yaw=Math.atan2(b[0]-a[0],b[1]-a[1]);
   return Math.abs(Math.sin(upperYaw-yaw))>.20&&s.d<=s.road.w/2+2.2&&s.height<deckBottom-2.8&&s.height>deckBottom-11;
  }).sort((a,b)=>b.height-a.height||a.d-b.d);
  const lower=candidates[0];if(!lower)return;
  const q=nearestOnSegment(x,z,lower.segment.a,lower.segment.b),lowerYaw=Math.atan2(lower.segment.b[0]-lower.segment.a[0],lower.segment.b[1]-lower.segment.a[1]),lowerY=lower.height+.05;
  if(deckBottom-lowerY<3.2)return;
  const key=(lower.road.surfaceId??lower.road.k)+':'+Math.round(q.x/9)+','+Math.round(q.z/9);
  if(portals.has(key))return;portals.add(key);
  const opening=Math.max(7.4,lower.road.w+3.2),depth=Math.max(2,Math.min(3.6,road.w*.3)),pierW=.62,side=opening/2+pierW/2;
  for(const sign of [-1,1]){
   const px=q.x+Math.cos(lowerYaw)*side*sign,pz=q.z-Math.sin(lowerYaw)*side*sign;
   if(roadConflict(road,px,pz,lowerY-.05,deckBottom, pierW*.5))continue;
   add(px,pz,lowerY-.05,pierW,deckBottom-lowerY+.08,depth,lowerYaw,'underpass-pier',road,{color:'#8f918b'});
  }
 };
 for(const profile of terrain.roads.profiles.values()){
  const road=profile.road;if(!(road.crossing||road.b||Number(road.layer)>0)||road.k==='tram')continue;
  let raisedRun=0, supports=0,possible=[];
  for(let i=1;i<profile.points.length;i++){
   const a=profile.points[i-1],b=profile.points[i],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
   if(terrain.prato(x,z))continue;
   const h=terrain.roads.sample(road,x,z),base=terrain.elevation(x,z),len=Math.hypot(b[0]-a[0],b[1]-a[1]);
   if(![h,base,len].every(Number.isFinite)||len<.05)continue;
   if(h-base<.7&&!profile.wet[i]&&!profile.wet[i-1]&&!road.b&&Number(road.layer)<=0)continue;
   const yaw=Math.atan2(b[0]-a[0],b[1]-a[1]),edge=road.w/2+(terrain.modern?(/motorway|trunk/.test(road.k)?1.5:1.05):.7);
   for(const side of [-1,1]){
    const px=x+Math.cos(yaw)*edge*side,pz=z-Math.sin(yaw)*edge*side;
    if(!terrain.roads.candidates(px,pz,terrain.modern?1.9:.25).some(s=>s.road!==road&&Math.abs(s.height-h)<(terrain.modern?3:1.5)))add(px,pz,h,.24,1.02,len+.04,yaw,'parapet',road);
   }
   const deckTop=terrain.modern?Math.min(terrain.roads.sample(road,...a),terrain.roads.sample(road,...b),h)-.12:h-.05;
   const thickness=terrain.modern?.62:.35,deckBottom=deckTop-thickness;
   const deck=add(x,z,deckBottom,road.w+1,thickness,len+.05,yaw,'deck',road);
   if(terrain.modern&&deck){deck.driveTopMin=deckTop+.12;underpassPortal(road,x,z,yaw,deckBottom);}
   if(h-base>2.8){
    raisedRun+=len;possible.push({x,z,yaw,base,deckBottom,edge});
    if(raisedRun>=13||profile.points.length===2&&len>=4){supports+=support(road,x,z,yaw,base,deckBottom,edge);raisedRun=0;}
   }else raisedRun=0;
  }
  // A bridge made of individually short spans must never end with a floating deck.
  if(!supports&&possible.length){for(const p of possible.sort((a,b)=>(b.deckBottom-b.base)-(a.deckBottom-a.base))){supports+=support(road,p.x,p.z,p.yaw,p.base,p.deckBottom,p.edge);if(supports)break;}}
 }
 if(terrain.modern)return boxes.filter(b=>{
  if(/^underpass-/.test(b.kind))return true;
  const candidates=[];
  for(const t of [-.5,-.25,0,.25,.5]){
   const x=b.x+Math.sin(b.yaw)*b.length*t,z=b.z+Math.cos(b.yaw)*b.length*t;
   for(const s of terrain.roads.candidates(x,z,b.kind==='deck'?0:1.3))if(s.road!==b.road&&!/footway|path|steps|cycleway|tram|pedestrian/.test(s.road.k))candidates.push(s);
  }
  // Supports have already been placed outside actual lower-road envelopes. Do not
  // discard them merely because a road lies a few metres away from the column.
  if(b.kind==='pier')return !roadConflict(b.road,b.x,b.z,b.minY,b.minY+b.h,Math.max(.5,b.w/2));
  if(b.kind!=='deck')return !candidates.some(s=>s.height+2>b.minY&&s.height<b.minY+b.h+.2);
  const adjacent=candidates.filter(s=>Math.abs(s.height-b.driveTopMin)<2);
  if(adjacent.length){b.driveTopMin=Math.min(b.driveTopMin,...adjacent.map(s=>s.height));b.minY=b.y=b.driveTopMin-.74;}
  return true;
 });
 return boxes;
}
