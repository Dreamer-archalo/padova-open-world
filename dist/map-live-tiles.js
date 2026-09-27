// Visible-only OpenStreetMap cartographic tiles. The complete vector OSM
// map is always drawn underneath: offline, blocked or missing tiles simply
// fall back to the existing map, never to scaled-up 45 km pixels.
// Requests only tiles needed on screen, no prefetch, no bulk downloading.
// Browser image cache honours OSM HTTP caching; show permanent attribution.
const ORIGIN_LAT=45.4064,ORIGIN_LON=11.8768;
const KZ=111320,KX=111320*Math.cos(ORIGIN_LAT*Math.PI/180);
const PI=Math.PI,TILE=256,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const latToY=lat=>(1-Math.asinh(Math.tan(lat*PI/180))/PI)/2;
const yToLat=t=>Math.atan(Math.sinh(PI*(1-2*t)))*180/PI;
const lonToX=lon=>(lon+180)/360;
export class VisibleMapTiles {
 constructor({onLoad=null,maxEntries=180,maxNewPerDraw=8}={}){
  this.onLoad=onLoad;this.cache=new Map();this.maxEntries=maxEntries;
  this.maxNewPerDraw=maxNewPerDraw;this.source='https://tile.openstreetmap.org';
  this.disabled=false;this.lastZoom=0;
 }
 static worldToTile(x,z,zoom){
  const n=2**zoom,lat=ORIGIN_LAT-z/KZ,lon=ORIGIN_LON+x/KX;
  return {x:lonToX(lon)*n,y:latToY(clamp(lat,-85,85))*n};
 }
 static tileToWorld(tx,ty,zoom){
  const n=2**zoom,lon=tx/n*360-180,lat=yToLat(ty/n);
  return {x:(lon-ORIGIN_LON)*KX,z:(ORIGIN_LAT-lat)*KZ};
 }
 chooseZoom(scale,pixelRatio=1){
  // OSM raster is designed for 256 CSS pixels, not 256 HD backing pixels.
  // Choosing from the CSS viewport keeps street labels readable and avoids
  // requesting 100+ extremely high-zoom tiles for one desktop canvas.
  const metresPerTileAtZero=2*PI*6378137*Math.cos(ORIGIN_LAT*PI/180);
  const cssScale=scale/clamp(pixelRatio,1,4);
  const zoom=Math.round(Math.log2(cssScale*metresPerTileAtZero/TILE));
  return clamp(zoom,5,19);
 }
 request(zoom,x,y){
  const n=2**zoom;if(x<0||x>=n||y<0||y>=n)return null;
  const key=zoom+'/'+x+'/'+y;
  const previous=this.cache.get(key);
  if(previous){this.cache.delete(key);this.cache.set(key,previous);return previous;}
  if(this.disabled||typeof Image==='undefined')return null;
  const image=new Image(),entry={image,state:'loading'};
  this.cache.set(key,entry);
  // Raster OSM tiles are normal <img> loads: never use fetch/no-store
  // and never bypass the browser's standard HTTP cache.
  image.decoding='async';image.referrerPolicy='strict-origin-when-cross-origin';
  image.onload=()=>{entry.state='ready';this.onLoad?.();};
  image.onerror=()=>{entry.state='failed';};
  image.src=this.source+'/'+key+'.png';
  while(this.cache.size>this.maxEntries){
   const oldest=this.cache.keys().next().value;
   this.cache.delete(oldest);
  }
  return entry;
 }
 draw(ctx,center,width,height,scale,pixelRatio=1){
  if(!Number.isFinite(scale)||scale<=0||!Number.isFinite(center.x)||!Number.isFinite(center.z))return {ready:0,pending:0};
  const zoom=this.chooseZoom(scale,pixelRatio);this.lastZoom=zoom;
  const x0=center.x-width/(2*scale),x1=center.x+width/(2*scale),
   z0=center.z-height/(2*scale),z1=center.z+height/(2*scale);
  const nw=VisibleMapTiles.worldToTile(x0,z0,zoom),
   se=VisibleMapTiles.worldToTile(x1,z1,zoom);
  const ix0=Math.floor(Math.min(nw.x,se.x)),ix1=Math.floor(Math.max(nw.x,se.x)),
   iy0=Math.floor(Math.min(nw.y,se.y)),iy1=Math.floor(Math.max(nw.y,se.y));
  // A very large fullscreen overview should not retrieve hundreds of
  // remote tiles. It continues using the native 45 km vector overview.
  if((ix1-ix0+1)*(iy1-iy0+1)>65)return {ready:0,pending:0,zoom,overview:true};
  let ready=0,pending=0,newRequests=0;
  ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
  for(let y=iy0;y<=iy1;y++)for(let x=ix0;x<=ix1;x++){
   let entry=this.cache.get(zoom+'/'+x+'/'+y);
   if(!entry&&newRequests<this.maxNewPerDraw){entry=this.request(zoom,x,y);if(entry)newRequests++;}
   if(!entry||entry.state==='failed')continue;
   if(entry.state!=='ready'){pending++;continue;}
   const p=VisibleMapTiles.tileToWorld(x,y,zoom),
    q=VisibleMapTiles.tileToWorld(x+1,y+1,zoom),
    sx=(p.x-x0)*scale,sy=(p.z-z0)*scale,sw=(q.x-p.x)*scale,sh=(q.z-p.z)*scale;
   // Each adjacent tile shares the same projected edge; fractional edge
   // extension hides seams without shifting any geometry or player marker.
   ctx.drawImage(entry.image,sx,sy,sw+.35,sh+.35);ready++;
  }
  ctx.restore();
  this.lastStats={ready,pending,zoom,requested:newRequests,source:'OpenStreetMap'};
  return this.lastStats;
 }
}
