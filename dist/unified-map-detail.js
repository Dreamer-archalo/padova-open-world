// One geographic renderer for Padova, all Riviera/Marghera towns and Venice.
// Geometry is drawn from real world-metre OSM vectors at the DESTINATION canvas
// resolution, independently of the simplified 3D rendering LOD.
const KINDS=['areas','water','buildings','roads'];
const GRID=240;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const roadTier=k=>/motorway|trunk|primary|secondary/.test(k||'')?2:/tertiary|residential|unclassified|living_street/.test(k||'')?1:0;
export class VectorMapDetail {
 constructor(regional,padova,extras=null){
  this.grid=new Map();this.large={areas:[],water:[],buildings:[],roads:[]};
  this.total={areas:0,water:0,buildings:0,roads:0};
  // Preserve Padova's own surveyed dense map rather than rendering the
  // regional overlap above it. Add map-only (never 3D) Mestre/route detail.
  for(const source of [regional,padova,extras].filter(Boolean))this.addSource(source);
 }
 addSource(source){
  for(const kind of KINDS)for(const feature of source[kind]||[])this.index(kind,feature);
 }
 index(kind,feature){
  const p=feature?.p;if(!Array.isArray(p)||p.length<(kind==='roads'||kind==='water'?2:3))return;
  let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
  for(const [x,z] of p){if(!Number.isFinite(x)||!Number.isFinite(z))return;x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);}
  const e={f:feature,x0,x1,z0,z1},ax=Math.floor(x0/GRID),bx=Math.floor(x1/GRID),az=Math.floor(z0/GRID),bz=Math.floor(z1/GRID);
  // A lagoon outline covering many cells should be tested once per viewport.
  if((bx-ax+1)*(bz-az+1)>160){this.large[kind].push(e);this.total[kind]++;return;}
  for(let x=ax;x<=bx;x++)for(let z=az;z<=bz;z++){
   const k=x+','+z;if(!this.grid.has(k))this.grid.set(k,{areas:[],water:[],buildings:[],roads:[]});
   this.grid.get(k)[kind].push(e);
  }
  this.total[kind]++;
 }
 visible(kind,frame){
  const seen=new Set(),list=[];
  const add=e=>{if(seen.has(e)||e.x1<frame.x0||e.x0>frame.x1||e.z1<frame.z0||e.z0>frame.z1)return;seen.add(e);list.push(e.f);};
  for(let x=Math.floor(frame.x0/GRID);x<=Math.floor(frame.x1/GRID);x++)
   for(let z=Math.floor(frame.z0/GRID);z<=Math.floor(frame.z1/GRID);z++)
    for(const e of this.grid.get(x+','+z)?.[kind]||[])add(e);
  for(const e of this.large[kind])add(e);
  return list;
 }
 draw(ctx,center,width,height,scale,{pixelRatio=1,mini=false,labels=true}={}){
  const x0=center.x-width/(2*scale),z0=center.z-height/(2*scale),
   frame={x0,z0,x1:x0+width/scale,z1:z0+height/scale};
  const px=clamp(pixelRatio,1,4),minimum=mini?1.25*px:1.0*px;
  const layers=Object.fromEntries(KINDS.map(k=>[k,this.visible(k,frame)]));
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#414b4d';ctx.fillRect(0,0,width,height);
  // Sea overview in the Venezia region; real OSM parcels and building/road
  // silhouettes are then laid over it at full resolution.
  if(frame.x1>=30000&&frame.z1>=-10000&&frame.z0<=9600){
   const left=clamp((30000-x0)*scale,0,width),top=clamp((-10000-z0)*scale,0,height),
    right=clamp((40500-x0)*scale,0,width),bottom=clamp((9600-z0)*scale,0,height);
   if(right>left&&bottom>top){ctx.fillStyle='#386a7d';ctx.fillRect(left,top,right-left,bottom-top);}
  }
  ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();ctx.lineCap='round';ctx.lineJoin='round';
  const path=f=>{
   ctx.beginPath();
   f.p.forEach(([x,z],i)=>i?ctx.lineTo((x-x0)*scale,(z-z0)*scale):ctx.moveTo((x-x0)*scale,(z-z0)*scale));
  };
  // Draw land before water. Repeated polygons from overlapping extracts are
  // harmless at town scale and never require a blown-up raster.
  for(const a of layers.areas.filter(a=>a.k!=='water')){
   path(a);ctx.closePath();ctx.fillStyle=a.k==='park'||a.k==='garden'?'#515e56':'#485251';ctx.fill();
  }
  for(const a of layers.areas.filter(a=>a.k==='water')){
   path(a);ctx.closePath();ctx.fillStyle='#386a7d';ctx.fill();
   if(scale>.23){ctx.lineWidth=Math.max(minimum*.6,.65);ctx.strokeStyle='#386a7d';ctx.stroke();}
  }
  for(const w of layers.water){
   path(w);ctx.strokeStyle='#386a7d';ctx.lineWidth=Math.max(minimum*.9,(w.w||3)*scale);ctx.stroke();
  }
  // Detailed shapes remain legible even when buildings are "energy" boxes
  // in the 3D transit performance mode.
  const buildingDetail=!mini&&scale>=.45; // suppress building cost at overview scales
  if(buildingDetail)for(const b of layers.buildings){
   path(b);ctx.closePath();ctx.fillStyle='#535e60';ctx.fill();
   if(scale>.36){ctx.lineWidth=Math.max(.5,px*.45);ctx.strokeStyle='#535e60';ctx.stroke();}
  }
  const named=[];
  // Draw roads in order: major arteries first and local footpaths on top,
  // using a dark casing at street-level zoom rather than thin grey hairlines.
  const sorted=layers.roads.sort((a,b)=>roadTier(b.k)-roadTier(a.k));
  for(const r of sorted){
   path(r);
   const tier=roadTier(r.k),walk=/footway|path|steps|cycleway|pedestrian/.test(r.k||''),
    roadWidth=Math.max(minimum,(r.w||2)*scale);
   if(scale>.24&&!walk){ctx.lineWidth=roadWidth+Math.max(px*.7,scale*.75);ctx.strokeStyle='#2e373c';ctx.stroke();}
   ctx.lineWidth=roadWidth;
   ctx.strokeStyle=walk?'#c4cbca':tier===2?'#f3f1e8':'#dee1db';
   ctx.stroke();
   if(labels&&r.n&&scale>(mini?.8:.4)&&(tier>=1||(!mini&&walk&&scale>=.8))&&named.length<(mini?60:180))named.push(r);
  }
  if(labels&&scale>(mini?.8:.4))this.drawRoadLabels(ctx,named,x0,z0,width,height,scale,px,mini);
  ctx.restore();
  return {visible:Object.fromEntries(KINDS.map(k=>[k,layers[k].length])),vector:true};
 }
 // Raster map tiles contain fine streets/water but bake their own labels
 // too small for high-DPI phone screens. These real OSM road/calle names are
 // deliberately redrawn ON TOP of loaded tiles at true CSS font sizes.
 drawTileLabels(ctx,center,width,height,scale,{pixelRatio=1,mini=false}={}){
  if(scale<.18)return;
  const x0=center.x-width/(2*scale),z0=center.z-height/(2*scale),
   frame={x0,z0,x1:x0+width/scale,z1:z0+height/scale},
   roads=this.visible('roads',frame).filter(r=>r.n&&
    (!/footway|path|steps|cycleway|pedestrian/.test(r.k||'')||scale>.36));
  ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
  this.drawRoadLabels(ctx,roads,x0,z0,width,height,scale,clamp(pixelRatio,1,4),mini);
  ctx.restore();
 }
 drawRoadLabels(ctx,roads,x0,z0,width,height,scale,px,mini){
  const occupied=new Set(),cell=mini?74*px:92*px,
   font=Math.round((mini?10:12)*px),max=mini?5:36;
  ctx.font='600 '+font+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  let count=0;
  for(const r of roads){
   if(count>=max||!r.n||r.p.length<2)break;
   // Choose the longest named segment VISIBLE in this viewport, not the
   // first OSM node which can be kilometres off-screen.
   let best=null,score=0;
   for(let i=1;i<r.p.length;i++){
    const a=r.p[i-1],b=r.p[i],x=(a[0]+b[0])*.5,z=(a[1]+b[1])*.5,
     sx=(x-x0)*scale,sy=(z-z0)*scale,len=Math.hypot(b[0]-a[0],b[1]-a[1])*scale;
    if(sx<font||sx>width-font||sy<font||sy>height-font||len<12*px||len<score)continue;
    best={sx,sy,a,b};score=len;
   }
   if(!best)continue;
   const column=Math.floor(best.sx/cell),row=Math.floor(best.sy/cell),
    key=column+','+row,name=r.n.trim();
   if(!name||occupied.has(key)||ctx.measureText&&ctx.measureText(name).width>Math.max(score*3.3,80*px))continue;
   occupied.add(key);count++;
   let angle=Math.atan2((best.b[1]-best.a[1]),(best.b[0]-best.a[0]));
   if(angle>Math.PI*.5)angle-=Math.PI;if(angle<-Math.PI*.5)angle+=Math.PI;
   ctx.save();ctx.translate(best.sx,best.sy);ctx.rotate(angle);
   ctx.lineWidth=Math.max(2,px*2.3);ctx.strokeStyle='#28424c';
   ctx.strokeText?.(name,0,0);ctx.fillStyle='#edf0dd';ctx.fillText(name,0,0);ctx.restore();
  }
 }
}
