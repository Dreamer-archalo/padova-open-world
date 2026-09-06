import {SpatialIndex, nearestOnSegment, pointInside, clamp, safeRoadPoint} from './core.js';
import {vehicleBlocked} from './movement.js';

const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export const PRATO={x:-35,z:858,yaw:-.23,outer:[90,135],inner:[81,126]};
export function pratoLocal(x,z){const dx=x-PRATO.x,dz=z-PRATO.z,c=Math.cos(PRATO.yaw),s=Math.sin(PRATO.yaw);return {x:c*dx-s*dz,z:s*dx+c*dz};}

// Heights are metres, without vertical exaggeration. Hydrology is a continuous
// regional approximation; the source map has no surveyed water levels / locks.
export class Terrain {
  constructor(grid, map){
    if(!grid||grid.version!==1||grid.width<2||grid.height<2||!(grid.step>0)||grid.heights.length!==grid.width*grid.height||!grid.heights.every(Number.isFinite)||grid.waterPlane?.length!==3||!grid.waterPlane.every(Number.isFinite))throw new Error('Invalid terrain data');
    this.grid=grid;this.waterIndex=new SpatialIndex(80);this.bridgeIndex=new SpatialIndex(80);
    const add=(index,item,p,pad=0)=>{const xs=p.map(v=>v[0]),zs=p.map(v=>v[1]);index.add(item,Math.min(...xs)-pad,Math.min(...zs)-pad,Math.max(...xs)+pad,Math.max(...zs)+pad);};
    for(const r of map.water)for(let i=1;i<r.p.length;i++){
      const a=r.p[i-1],b=r.p[i],count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/80));
      for(let j=0;j<count;j++){const p=[a[0]+(b[0]-a[0])*j/count,a[1]+(b[1]-a[1])*j/count],q=[a[0]+(b[0]-a[0])*(j+1)/count,a[1]+(b[1]-a[1])*(j+1)/count];add(this.waterIndex,{a:p,b:q,w:r.w},[p,q],r.w/2+12);}
    }
    for(const a of map.areas)if(a.k==='water')add(this.waterIndex,{p:a.p},a.p,12);
    for(const road of map.roads)if(road.b){
      const lengths=road.p.slice(1).map((p,i)=>Math.hypot(p[0]-road.p[i][0],p[1]-road.p[i][1])),total=lengths.reduce((a,b)=>a+b,0);let offset=0;
      for(let i=1;i<road.p.length;i++){const a=road.p[i-1],b=road.p[i];add(this.bridgeIndex,{a,b,w:road.w,offset,length:lengths[i-1],total},[a,b],road.w/2+2);offset+=lengths[i-1];}
    }
    this.pratoHeight=this.elevation(PRATO.x,PRATO.z);
  }
  elevation(x,z){const g=this.grid,u=clamp((x-g.x0)/g.step,0,g.width-1),v=clamp((z-g.z0)/g.step,0,g.height-1),i=Math.min(g.width-2,Math.floor(u)),j=Math.min(g.height-2,Math.floor(v)),a=u-i,b=v-j,h=(i,j)=>g.heights[j*g.width+i];return h(i,j)*(1-a)*(1-b)+h(i+1,j)*a*(1-b)+h(i,j+1)*(1-a)*b+h(i+1,j+1)*a*b;}
  waterHeight(x,z){const p=this.grid.waterPlane;return p[0]+p[1]*x+p[2]*z-1.8;}
  prato(x,z){const p=pratoLocal(x,z);if((p.x/115)**2+(p.z/163)**2>1)return null;const canal=(p.x/90)**2+(p.z/135)**2<1&&(p.x/81)**2+(p.z/126)**2>1;return {canal,bridge:Math.abs(p.x)<5.5||Math.abs(p.z)<4.5};}
  waterDistance(x,z){let distance=Infinity;for(const r of this.waterIndex.near(x,z)){
    if(r.p){if(pointInside(x,z,r.p))return -2;for(let i=0;i<r.p.length;i++){const q=nearestOnSegment(x,z,r.p[i],r.p[(i+1)%r.p.length]);distance=Math.min(distance,Math.hypot(q.x-x,q.z-z));}}
    else{const q=nearestOnSegment(x,z,r.a,r.b);distance=Math.min(distance,Math.hypot(q.x-x,q.z-z)-r.w/2);}
  }return distance;}
  bridge(x,z,margin=0){let best=null;for(const b of this.bridgeIndex.near(x,z)){
    const q=nearestOnSegment(x,z,b.a,b.b),distance=Math.hypot(x-q.x,z-q.z);
    if(distance<=Math.max(0,b.w/2-margin)){const t=(b.offset+b.length*q.t)/Math.max(1,b.total),height=this.elevation(q.x,q.z)+1.2*Math.sin(Math.PI*t);if(!best||height>best.height)best={height};}
  }return best;}
  waterAt(x,z,margin=0){const prato=this.prato(x,z);if(prato)return prato.canal&&!prato.bridge?this.pratoHeight-1.5:null;if(this.bridge(x,z,margin))return null;return this.waterDistance(x,z)<margin?this.waterHeight(x,z):null;}
  groundHeight(x,z){const prato=this.prato(x,z);if(prato)return this.pratoHeight+(prato.canal?-3:0);const raw=this.elevation(x,z),d=this.waterDistance(x,z);if(d>10)return raw;const channel=this.waterHeight(x,z)-1.5;return channel+(Math.max(raw,this.waterHeight(x,z)+.8)-channel)*smooth((d+1)/11);}
  height(x,z){const prato=this.prato(x,z);if(prato)return this.pratoHeight+(prato.bridge?.36:prato.canal?-3:.18);const bridge=this.bridge(x,z);return bridge?bridge.height:this.groundHeight(x,z)+.05;}
  slope(x,z,yaw,wheelbase=2.5){const dx=Math.sin(yaw)*wheelbase/2,dz=Math.cos(yaw)*wheelbase/2;return -Math.atan2(this.height(x+dx,z+dz)-this.height(x-dx,z-dz),wheelbase);}
  dry(x,z,radius=.4){for(const [dx,dz] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]])if(this.waterAt(x+dx,z+dz)!==null)return false;return true;}
}

export function safeDryRoad(pos,graph,collision,terrain,spec=null,allowed=()=>true){
  const radius=spec?spec.width/2:.4;
  return safeRoadPoint(pos,graph,collision,radius,p=>allowed(p)&&p.x>-5960&&p.x<7240&&p.z>-6470&&p.z<6220&&terrain.dry(p.x,p.z,spec?spec.length/2+.3:1)&&(!spec||!vehicleBlocked(p.x,p.z,p.yaw,collision,spec)));
}

// Independent from rendering, so falling/recovery remains deterministic at 60 Hz.
export class WaterRecovery {
  constructor(){this.active=false;this.lastDry=null;this.elapsed=0;}
  remember(pose,terrain){if(!this.active&&terrain.dry(pose.x,pose.z,3))this.lastDry={x:pose.x,z:pose.z,yaw:pose.yaw};}
  enter(y,waterY){if(this.active)return false;this.active=true;this.elapsed=0;this.y=Math.max(y,waterY+.6);this.waterY=waterY;this.vy=0;return true;}
  step(dt){this.elapsed+=dt;this.vy-=12*dt;this.y+=this.vy*dt;return this.elapsed>=1.35;}
  reset(){this.active=false;this.elapsed=0;}
}
