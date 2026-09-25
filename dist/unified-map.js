// Padova's own minimap is untouched. This renderer only extends the full M map
// horizontally into the same coordinates and implements genuine zoom/pan.
import {REGIONAL_ZONES} from './unified-regions.js';
import {VectorMapDetail} from './unified-map-detail.js';

export class UnifiedMap {
 constructor(canvas,padovaCanvas,padovaBounds,region,padovaData=null){
  this.canvas=canvas;this.padova=padovaCanvas;this.padovaBounds=padovaBounds;this.region=region;
  const [x,z,x1,z1]=region.bounds;this.bounds={x,z,w:x1-x,h:z1-z};
  this.zoomLevel=1;this.center={x:x+this.bounds.w/2,z:z+this.bounds.h/2};
  this.base=document.createElement('canvas');this.base.width=3072;
  this.detail=new VectorMapDetail(region,padovaData);
  this.base.height=Math.ceil(2300*this.bounds.h/this.bounds.w);
  this.baseScale=this.base.width/this.bounds.w;
  this.prepare();
 }
 get scale(){return Math.min(this.canvas.width/this.bounds.w,this.canvas.height/this.bounds.h)*this.zoomLevel;}
 centerOn(x,z,zoom=this.zoomLevel){this.center={x,z};this.zoomLevel=zoom;this.limit();}
 reset(){this.zoomLevel=1;this.center={x:this.bounds.x+this.bounds.w/2,z:this.bounds.z+this.bounds.h/2};}
 zoom(delta){this.zoomLevel=Math.max(1,Math.min(32,this.zoomLevel*(delta>0?1.6:1/1.6)));this.limit();}
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
  const c=this.canvas.getContext('2d'),w=this.canvas.width,h=this.canvas.height;
  c.setTransform(1,0,0,1,0,0);c.fillStyle='#152b35';c.fillRect(0,0,w,h);
  if(this.zoomLevel>=2.1){
   // At town scale draw directly from indexed OSM geometry; avoid wasting a
   // frame drawing a blurry full-world bitmap underneath the vectors.
   this.detail.draw(c,this.center,w,h,this.scale);
  }else{
   const ratio=this.scale/this.baseScale;
   c.translate(w/2,h/2);c.scale(ratio,ratio);
   c.drawImage(this.base,-(this.center.x-this.bounds.x)*this.baseScale,-(this.center.z-this.bounds.z)*this.baseScale);
   c.setTransform(1,0,0,1,0,0);
  }
  if(route.length){c.beginPath();route.forEach((p,i)=>{const a=this.toScreen(p);i?c.lineTo(a.x,a.y):c.moveTo(a.x,a.y);});c.lineWidth=2.6;c.strokeStyle='#edbb65';c.stroke();}
  const dot=(p,size,color)=>{const q=this.toScreen(p);if(!this.isVisible(p))return;c.fillStyle=color;c.beginPath();c.arc(q.x,q.y,size,0,Math.PI*2);c.fill();};
  // All named regional stops exist in the same map. Secondary Padova pins are
  // visible when zooming rather than covering the wide-area view with labels.
  const labels=this.zoomLevel>=1.55?REGIONAL_ZONES:REGIONAL_ZONES.filter(p=>['Dolo','Mira Porte','Oriago','Marghera','Piazzale Roma','Venezia - San Marco'].includes(p.name));
  for(const p of labels){if(!this.isVisible(p))continue;dot(p,4,p.lod==='detailed'?'#f6bd69':'#77b9c3');const q=this.toScreen(p);c.fillStyle='#e6e4d7';c.font='600 13px system-ui';c.fillText(p.name,q.x+7,q.y-8);}
  for(const p of places)if(this.zoomLevel>=2.5)dot(p,3,'#ffc56a');
  if(target){dot(target,8,'#ffc56a');const q=this.toScreen(target);c.strokeStyle='#ffc56a';c.lineWidth=2;c.beginPath();c.arc(q.x,q.y,12,0,Math.PI*2);c.stroke();}
  dot(position,7,'white');const q=this.toScreen(position);c.strokeStyle='#172e38';c.lineWidth=3;c.beginPath();c.arc(q.x,q.y,8,0,Math.PI*2);c.stroke();
  c.fillStyle='#f5f3de';c.fillRect(15,h-29,105,2);c.font='600 12px system-ui';c.fillText(Math.round(105/this.scale/1000*10)/10+' km',15,h-12);
 }
 drawMini(ctx,position,range,width,height){
  this.detail.draw(ctx,position,width,height,width/range);
 }
}
