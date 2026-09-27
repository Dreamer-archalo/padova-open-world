// Shared grade and chunk-boundary solution for roads OUTSIDE Padova.
// One continuous, capped grade profile per OSM way is sampled by the THREE
// asphalt AND regional vehicle/foot contact: the visual and physical Y agree.
export function regionalGrade(kind=''){
 return /motorway|trunk/.test(kind)?.064:/primary|secondary/.test(kind)?.072:
  /steps/.test(kind)?.35:/footway|pedestrian/.test(kind)?.10:.085;
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hypot=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function smoothRegionalRoadProfile(points,heightAt,kind='',spacing=14){
 if(!Array.isArray(points)||points.length<2)throw Error('A regional road needs two points');
 const samples=[{s:0,p:points[0]}];let total=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],length=hypot(a,b);
  if(length<1e-5)continue;
  const n=Math.ceil(length/Math.max(4,spacing));
  for(let j=1;j<=n;j++){
   const t=j/n;
   samples.push({s:total+length*t,p:[a[0]+(b[0]-a[0])*t,
    a[1]+(b[1]-a[1])*t]});
  }
  total+=length;
 }
 if(total<1e-5){const y=heightAt(...points[0]);return {length:0,
  samples:[{s:0,y}],sample:()=>y,grade:0};}
 const raw=samples.map(v=>heightAt(...v.p)),window=/motorway|trunk/.test(kind)?52:27;
 const desired=raw.map((y,i)=>{
  // Anchored endpoints make two independently imported OSM ways meet flush.
  if(!i||i===raw.length-1)return y;
  let weight=0,sum=0;
  for(let j=Math.max(0,i-Math.ceil(window/spacing)-2);j<Math.min(raw.length,i+Math.ceil(window/spacing)+3);j++){
   const d=Math.abs(samples[i].s-samples[j].s);
   if(d>window)continue;
   const w=(1-d/window)**2;weight+=w;sum+=raw[j]*w;
  }
  // Roads should not be geometrically buried under the old coarse DEM.
  // Smooth noise only by a few centimetres when the raw slope is legal;
  // the hard grade projection below resolves truly unsafe steep stretches.
  return weight?clamp(sum/weight,y-.055,y+.09):y;
 });
 const grade=Math.max(regionalGrade(kind),
  Math.abs(raw.at(-1)-raw[0])/total+.00001);
 // Feasible envelope from BOTH real-road endpoints. Prevents an otherwise
 // beautiful smooth hill ending in an uncrossable vertical seam at a junction.
 const ys=desired.map((y,i)=>{
  const s=samples[i].s,lo=Math.max(raw[0]-grade*s,raw.at(-1)-grade*(total-s)),
   hi=Math.min(raw[0]+grade*s,raw.at(-1)+grade*(total-s));
  return clamp(y,lo,hi);
 });
 ys[0]=raw[0];ys[ys.length-1]=raw.at(-1);
 // Project each interior point into the Lipschitz / vehicle-safe envelope.
 // Anchors never move. Three passes converge for bounded sampled terrain.
 for(let pass=0;pass<3;pass++){
  for(let i=1;i<ys.length-1;i++){
   const d=grade*(samples[i].s-samples[i-1].s);
   ys[i]=clamp(ys[i],ys[i-1]-d,ys[i-1]+d);
  }
  for(let i=ys.length-2;i>0;i--){
   const d=grade*(samples[i+1].s-samples[i].s);
   ys[i]=clamp(ys[i],ys[i+1]-d,ys[i+1]+d);
  }
 }
 const solved=samples.map((v,i)=>({s:v.s,y:ys[i]}));
 const sample=t=>{
  const s=clamp(t,0,1)*total;
  let lo=0,hi=solved.length-1;
  while(hi-lo>1){const mid=(hi+lo)>>>1;
   if(solved[mid].s<=s)lo=mid;else hi=mid;
  }
  const a=solved[lo],b=solved[hi],f=(s-a.s)/Math.max(1e-9,b.s-a.s);
  return a.y+(b.y-a.y)*f;
 };
 return {length:total,samples:solved,sample,grade};
}
// Always cut EXACTLY at every global 320-m chunk edge. Otherwise a long
// strip belongs to one chunk but visually vanishes when crossing into another.
export function regionalChunkCuts(a,b,chunk=320,maxStep=55){
 const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
 if(length<1e-6)return [0,1];
 const cuts=[0,1];
 for(const [start,delta] of [[a[0],dx],[a[1],dz]]){
  if(Math.abs(delta)<1e-8)continue;
  const min=Math.min(start,start+delta),max=Math.max(start,start+delta);
  for(let n=Math.floor(min/chunk)+1;n*chunk<max-1e-6;n++){
   const t=(n*chunk-start)/delta;
   if(t>1e-7&&t<1-1e-7)cuts.push(t);
  }
 }
 cuts.sort((x,y)=>x-y);
 const out=[0];
 for(let i=1;i<cuts.length;i++){
  const a=cuts[i-1],b=cuts[i];if(b-a<1e-8)continue;
  const n=Math.ceil(length*(b-a)/Math.max(8,maxStep));
  for(let j=1;j<=n;j++)out.push(a+(b-a)*j/n);
 }
 return out.filter((v,i)=>!i||v-out[i-1]>1e-8);
}
export const regionalRoadClass=kind=>/motorway|trunk/.test(kind)?'express':
 /primary|secondary/.test(kind)?'arterial':
 /tertiary|unclassified|residential|living_street/.test(kind)?'street':'local';
