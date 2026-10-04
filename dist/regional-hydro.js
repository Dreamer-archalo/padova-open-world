// Polygon clipping for streamed 320 m coastal tiles. No THREE dependency,
// so the same shoreline rules can be tested before the game is downloaded.
export function clipPolygon(p,x0,z0,x1,z1){
 if(!p||p.length<3)return [];
 let out=p;
 const cut=(inside,intersect)=>{
  const next=[];if(!out.length)return;
  let prev=out[out.length-1],was=inside(prev);
  for(const curr of out){
   const yes=inside(curr);
   if(yes!==was)next.push(intersect(prev,curr));
   if(yes)next.push(curr);
   prev=curr;was=yes;
  }
  out=next;
 };
 cut(p=>p[0]>=x0,(a,b)=>[x0,a[1]+(b[1]-a[1])*(x0-a[0])/(b[0]-a[0])]);
 cut(p=>p[0]<=x1,(a,b)=>[x1,a[1]+(b[1]-a[1])*(x1-a[0])/(b[0]-a[0])]);
 cut(p=>p[1]>=z0,(a,b)=>[a[0]+(b[0]-a[0])*(z0-a[1])/(b[1]-a[1]),z0]);
 cut(p=>p[1]<=z1,(a,b)=>[a[0]+(b[0]-a[0])*(z1-a[1])/(b[1]-a[1]),z1]);
 const valid=out.filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
 return valid.length>=3?valid:[];
}
export const coastalBand=(x,z)=>x>=30000&&x<40500&&z>-10000&&z<9600;
// Existing harbor water polygons (including basins west of the causeway)
// take precedence over the broad lagoon estimate.
export const harborBand=x=>x>=27000;
