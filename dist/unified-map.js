// High-resolution unified geographical map. The same spatially indexed
// vectors drive detailed Padova, the Brenta towns, Mestre and Venice.
import {REGIONAL_ZONES} from './unified-regions.js';
import {VectorMapDetail} from './unified-map-detail.js?v=coast3';

export class UnifiedMap {
 constructor(canvas,padovaCanvas,padovaBounds,region,padovaData=null){
  this.canvas=canvas;this.padova=padovaCanvas;this.padovaBounds=padovaBounds;this.region=region;
  const [x,z,x1,z1]=region.bounds;this.bounds={x,z,w:x1-x,h:z1-z};
  this.zoomLevel=1;this.center={x:x+this.bounds.w/2,z:z+this.bounds.h/2};
  this.base=document.createElement('canvas');this.base.width=3072;
  this.detail=new VectorMapDetail(region,padovaData);
  this.base.height=Math.ceil(this.base.width*this.bounds.h/this.bounds.w);
  this.baseScale=this.base.width/this.bounds.w;
  this.prepare();
 }
 addMapDetail(source){if(source)this.detail.addSource(source);}
 get uiScale(){const displayed=this.canvas.getBoundingClientRect?.().width||this.canvas.clientWidth||this.canvas.width;return Math.max(1,Math.min(3.5,this.canvas.width/displayed));}
 get scale(){return Math.min(this.canvas.width/this.bounds.w,this.canvas.height/this.bounds.h)*this.zoomLevel;}
 centerOn(x,z,zoom=this.zoomLevel){this.center={x,z};this.zoomLevel=zoom;this.limit();}
 reset(){this.zoomLevel=1;this.center={x:this.bounds.x+this.bounds.w/2,z:this.bounds.z+this.bounds.h/2};}
 zoom(delta){this.zoomAt(this.canvas.width/2,this.canvas.height/2,delta);}
 zoomAt(screenX,screenY,delta,{factor=false}={}){
  const before=this.fromCanvas(screenX,screenY);
  this.zoomLevel=Math.max(1,Math.min(55,this.zoomLevel*(factor?delta:(delta>0?1.45:1/1.45))));
  const after=this.fromCanvas(screenX,screenY);
  this.center.x+=before.x-after.x;this.center.z+=before.z-after.z;this.limit();
 }
 pan(screenDx,screenDz){this.center.x-=screenDx/this.scale;this.center.z-=screenDz/this.scale;this.limit();}
 limit(){const halfW=Math.min(this.bounds.w/2,this.canvas.width/(2*this.scale)),halfH=Math.min(this.bounds.h/2,this.canvas.height/(2*this.scale));
 this.center.x=Math.max(this.bounds.x+halfW,Math.min(this.bounds.x+this.bounds.w-halfW,this.center.x));
 this.center.z=Math.max(this.bounds.z+halfH,Math.min(this.bounds.z+this.bounds.h-halfH,this.center.z));}
 toScreen(p){const s=this.scale;return {x:this.canvas.width/2+(p.x-this.center.x)*s,y:this.canvas.height/2+(p.z-this.center.z)*s};}
 fromCanvas(x,y){const s=this.scale;return {x:this.center.x+(x-this.canvas.width/2)/s,z:this.center.z+(y-this.canvas.height/2)/s};}
 isVisible(p,margin=25){const q=this.toScreen(p);return q.x>=-margin&&q.y>=-margin&&q.x<=this.canvas.width+margin&&q.y<=this.canvas.height+margin;}
 prepare(){
  const c=this.base.getContext('2d',{alpha:false}),s=this.baseScale,b=this.bounds;
  c.fillStyle='#1d333c';c.fillRect(0,0,this.base.width,this.base.height);
  const drawPath=(p,close=false)=>{c.beginPath();p.forEach((a,i)=>{const x=(a[0]-b.x)*s,y=(a[1]-b.z)*s;i?c.lineTo(x,y):c.moveTo(x,y);});if(close)c.closePath();};
  for(const a of this.region.areas||[]){if(!a.p?.length)continue;drawPath(a.p,true);c.fillStyle=a.k==='water'?'#315862':'#315447';c.fill();}
  for(const w of this.region.water||[]){drawPath(w.p);c.lineWidth=Math.max(.7,(w.w||5)*s);c.strokeStyle='#367587';c.stroke();}
  for(const bld of this.region.buildings||[]){if(!bld.p?.length)continue;drawPath(bld.p,true);c.fillStyle=bld.lod==='energy'?'#416d73':'#708080';c.fill();}
  for(const r of this.region.roads||[]){if(!r.p?.length)continue;drawPath(r.p);c.lineWidth=Math.max(.75,(r.w||3)*s);c.strokeStyle=/motorway|trunk|primary|secondary/.test(r.k)?'#a0a7a2':'#677d80';c.stroke();}
  const p=this.padovaBounds;
  c.drawImage(this.padova,(p.x-b.x)*s,(p.z-b.z)*s,p.w*s,p.h*s);
  // City tile is inserted last to prevent oversimplified corridor artefacts
  // from painting over existing Padova details and its road markings.
 }
 draw({position,places=[],target=null,route=[]}){
  const c=this.canvas.getContext('2d'),w=this.canvas.width,h=this.canvas.height,pixelRatio=this.uiScale,
   unit=n=>n*pixelRatio;
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);
  // Only the fully zoomed-out 45 km overview is rasterized. Any user-visible
  // zoom into a municipality uses OSM polylines/polygons at native resolution.
  if(this.zoomLevel>=1.65){
   this.detail.draw(c,this.center,w,h,this.scale,{pixelRatio,labels:this.zoomLevel>=3});
  }else{
   c.fillStyle='#152b35';c.fillRect(0,0,w,h);
   const ratio=this.scale/this.baseScale;
   c.translate(w/2,h/2);c.scale(ratio,ratio);
   c.drawImage(this.base,-(this.center.x-this.bounds.x)*this.baseScale,-(this.center.z-this.bounds.z)*this.baseScale);
   c.setTransform(1,0,0,1,0,0);
  }
  if(route.length){
   c.beginPath();route.forEach((p,i)=>{const a=this.toScreen(p);i?c.lineTo(a.x,a.y):c.moveTo(a.x,a.y);});
   c.lineWidth=unit(2.4);c.strokeStyle='#f7ca74';c.stroke();
  }
  const dot=(p,size,color)=>{
   if(!this.isVisible(p))return;const q=this.toScreen(p);
   c.fillStyle=color;c.beginPath();c.arc(q.x,q.y,unit(size),0,Math.PI*2);c.fill();
  };
  const labels=this.zoomLevel>=2?REGIONAL_ZONES:REGIONAL_ZONES.filter(p=>
   ['Dolo','Mira Porte','Oriago','Marghera','Piazzale Roma','Venezia - San Marco'].includes(p.name));
  c.font='650 '+Math.round(unit(13))+'px system-ui';
  c.textAlign='left';c.textBaseline='alphabetic';
  for(const p of labels){
   if(!this.isVisible(p))continue;dot(p,4,p.lod==='detailed'?'#ffc778':'#9ed5d4');
   const q=this.toScreen(p);c.lineWidth=unit(2.7);c.strokeStyle='#243f48';
   c.strokeText?.(p.name,q.x+unit(8),q.y-unit(7));c.fillStyle='#fff6e5';
   c.fillText(p.name,q.x+unit(8),q.y-unit(7));
  }
  if(this.zoomLevel>=3)for(const p of places)dot(p,2.8,'#ffce84');
  if(target&&this.isVisible(target)){
   dot(target,6,'#ffc56a');const q=this.toScreen(target);c.strokeStyle='#ffc56a';c.lineWidth=unit(2);
   c.beginPath();c.arc(q.x,q.y,unit(11),0,Math.PI*2);c.stroke();
  }
  if(this.isVisible(position)){
   const q=this.toScreen(position);
   c.strokeStyle='#152f3d';c.lineWidth=unit(3);c.fillStyle='#fff';
   c.beginPath();c.arc(q.x,q.y,unit(8),0,Math.PI*2);c.fill();c.stroke();
   c.strokeStyle='#fff';c.lineWidth=unit(1.4);c.beginPath();c.arc(q.x,q.y,unit(12),0,Math.PI*2);c.stroke();
  }
  const line=unit(94),metres=line/this.scale;
  const label=metres>=1000?(metres/1000).toFixed(1)+' km':Math.round(metres)+' m';
  c.fillStyle='#f5f3de';c.fillRect(unit(14),h-unit(29),line,unit(2.5));
  c.font='650 '+Math.round(unit(12))+'px system-ui';c.fillText(label,unit(14),h-unit(11));
 }
 drawMini(ctx,position,range,width,height){
  const display=ctx.canvas?.getBoundingClientRect?.().width||ctx.canvas?.clientWidth||width/2.5;
  const pixelRatio=Math.max(1,Math.min(4,width/display));
  return this.detail.draw(ctx,position,width,height,width/range,{pixelRatio,mini:true,labels:true});

 }
}
