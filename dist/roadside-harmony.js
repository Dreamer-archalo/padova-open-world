// Build one continuous ground field from road corridors instead of choosing a
// different nearest road independently at adjacent mesh vertices. A single
// abrupt ownership switch used to produce 1–5 m berms beside carriageways.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const EMBANKMENT_REACH=36;
const aboveGround=road=>road.crossing||road.b||road.tunnel||(Number(road.layer)||0)!==0;
const pedestrian=road=>/^(footway|path|cycleway|pedestrian|steps)$/.test(road.k||'');
export function roadsideHarmony(terrain,x,z,natural){
 if(!terrain.modern||!terrain.roads)return natural;
 const candidates=terrain.roads.candidates(x,z,EMBANKMENT_REACH).filter(s=>
  !aboveGround(s.road)&&s.road.k!=='tram'&&s.road.k!=='steps');
 if(!candidates.length)return natural;
 // An elevated pedestrian shortcut must not lift a neighbouring car lane into
 // a wall. Use pedestrian profiles for terrain only where there is no nearby
 // ordinary carriageway to own the ground; the path's own mesh/collision stays
 // at its independent designed level in either case.
 const hasCarriageway=candidates.some(s=>!pedestrian(s.road)&&s.d<=s.road.w/2+8);
 const roads=hasCarriageway?candidates.filter(s=>!pedestrian(s.road)):candidates;
 if(!roads.length)return natural;
 let weight=0,target=0,influence=0;
 for(const s of roads){
  const outside=Math.max(0,s.d-s.road.w/2);
  const blend=1-smooth(outside/EMBANKMENT_REACH);
  if(blend<=0)continue;
  // Gradual cross-street transitions without the discontinuity of a nearest
  // road selector at a carriageway edge.
  const w=blend/(1+(outside/4)**2);
  target+=s.height*w;weight+=w;influence=Math.max(influence,blend);
 }
 if(!weight)return natural;
 return natural*(1-influence)+(target/weight-.05)*influence;
}
