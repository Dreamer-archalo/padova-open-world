// High-resolution, demand-driven vector detail for both the full M map and
// its minimap. Keeps the 45 km overview bitmap as a cheap zoomed-out layer.
const KINDS=['areas','water','buildings','roads'];
export class VectorMapDetail {
 constructor(regional,padova){
  this.cell=260;this.grid=new Map();
  this.large={areas:[],water:[],buildings:[],roads:[]};
  for(const source of [regional,padova].filter(Boolean))
   for(const kind of KINDS)for(const feature of source[kind]||[])this.index(kind,feature);
 }
 index(kind,feature){
  const p=feature?.p;if(!p?.length)return;
  let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
  for(const v of p){x0=Math.min(x0,v[0]);x1=Math.max(x1,v[0]);z0=Math.min(z0,v[1]);z1=Math.max(z1,v[1]);}
  if(!Number.isFinite(x0))return;
  const entry={feature,x0,x1,z0,z1},ax=Math.floor(x0/this.cell),
   bx=Math.floor(x1/this.cell),az=Math.floor(z0/this.cell),bz=Math.floor(z1/this.cell);
  if((bx-ax+1)*(bz-az+1)>180){this.large[kind].push(entry);return;}
  for(let x=ax;x<=bx;x++)for(let z=az;z<=bz;z++){
   const key=x+','+z;
   if(!this.grid.has(key))this.grid.set(key,{areas:[],water:[],buildings:[],roads:[]});
   this.grid.get(key)[kind].push(entry);
  }
 }
 visible(kind,frame){
  const seen=new Set(),list=[];
  const collect=e=>{
   if(seen.has(e)||e.x1<frame.x0||e.x0>frame.x1||e.z1<frame.z0||e.z0>frame.z1)return;
   seen.add(e);list.push(e.feature);
  };
  for(let x=Math.floor(frame.x0/this.cell);x<=Math.floor(frame.x1/this.cell);x++)
   for(let z=Math.floor(frame.z0/this.cell);z<=Math.floor(frame.z1/this.cell);z++)
    for(const e of this.grid.get(x+','+z)?.[kind]||[])collect(e);
  for(const e of this.large[kind])collect(e);
  return list;
 }
 draw(ctx,center,width,height,scale){
  const x0=center.x-width/(2*scale),z0=center.z-height/(2*scale);
  const frame={x0,z0,x1:x0+width/scale,z1:z0+height/scale};
  ctx.fillStyle='#294b49';ctx.fillRect(0,0,width,height);
  ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
  ctx.lineCap='round';ctx.lineJoin='round';
  for(const kind of KINDS){
   const features=this.visible(kind,frame);
   for(const feature of features){
    ctx.beginPath();
    feature.p.forEach(([x,z],i)=>i?ctx.lineTo((x-x0)*scale,(z-z0)*scale):
     ctx.moveTo((x-x0)*scale,(z-z0)*scale));
    if(kind==='water'){
     ctx.strokeStyle='#3a899e';ctx.lineWidth=Math.max(1.25,(feature.w||5)*scale);ctx.stroke();
    }else if(kind==='roads'){
     ctx.strokeStyle=/motorway|trunk|primary|secondary/.test(feature.k)?'#c0c4b7':
      /footway|path|steps|pedestrian|cycleway/.test(feature.k)?'#a1b9ae':'#849b97';
     ctx.lineWidth=Math.max(.9,(feature.w||2)*scale);ctx.stroke();
    }else{
     ctx.closePath();
     ctx.fillStyle=kind==='areas'?(feature.k==='water'?'#326b7c':'#456c54'):
      feature.lod==='energy'?'#477c86':'#b5aa94';
     ctx.fill();
    }
   }
  }
  ctx.restore();
 }
}
