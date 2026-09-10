import {collides, nearestOnSegment, pointInside, clamp} from './core.js';

// Rendering may run at any refresh rate. Simulation always advances in 1/60 s steps.
export class FixedClock {
  constructor(step = 1 / 60, maxSteps = 8) { this.step = step; this.maxSteps = maxSteps; this.accumulator = 0; }
  reset() { this.accumulator = 0; }
  advance(delta, tick) {
    this.accumulator += clamp(Number.isFinite(delta) ? delta : 0, 0, this.step * this.maxSteps);
    let count = 0;
    while (this.accumulator + 1e-10 >= this.step && count < this.maxSteps) {
      tick(this.step); this.accumulator = Math.max(0, this.accumulator - this.step); count++;
    }
    return this.accumulator / this.step;
  }
}

// Conservative substeps prevent crossing even thin walls; contact projection allows
// walking along angled façades without the old axis-dependent stopping/stuttering.
export function slideMove(pos, dx, dz, radius, index, y=undefined) {
  let x = pos.x, z = pos.z, hit = false;
  const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (radius * .45)));
  for (let step = 0; step < count; step++) {
    let vx = dx / count, vz = dz / count;
    for (let contact = 0; contact < 3; contact++) {
      const obstacle = collides(x + vx, z + vz, radius, index, y);
      if (!obstacle) { x += vx; z += vz; break; }
      hit = true;
      let lo = 0, hi = 1;
      for (let k = 0; k < 10; k++) {
        const t = (lo + hi) / 2;
        if (collides(x + vx * t, z + vz * t, radius, index, y)) hi = t; else lo = t;
      }
      x += vx * lo; z += vz * lo;
      let best = null, distance = Infinity;
      for (let j = 0; j < obstacle.p.length; j++) {
        const q = nearestOnSegment(x, z, obstacle.p[j], obstacle.p[(j + 1) % obstacle.p.length]);
        const d = Math.hypot(x - q.x, z - q.z);
        if (d < distance) { distance = d; best = q; }
      }
      if (!best || distance < 1e-8) break;
      const nx = (x - best.x) / distance, nz = (z - best.z) / distance;
      vx *= 1 - lo; vz *= 1 - lo;
      const into = Math.min(0, vx * nx + vz * nz);
      vx -= into * nx; vz -= into * nz;
      if (Math.hypot(vx, vz) < 1e-6) break;
    }
  }
  return {x, z, hit};
}

export function vehicleFootprint(x,z,yaw,width,length){
  const s=Math.sin(yaw),c=Math.cos(yaw);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([side,end])=>[x+c*side*width/2+s*end*length/2,z-s*side*width/2+c*end*length/2]);
}
export function polygonsOverlap(a,b){
  if(a.some(p=>pointInside(...p,b))||b.some(p=>pointInside(...p,a)))return true;
  const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
    const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length];
    if(Math.max(p[0],q[0])+1e-8<Math.min(r[0],s[0])||Math.max(r[0],s[0])+1e-8<Math.min(p[0],q[0])||Math.max(p[1],q[1])+1e-8<Math.min(r[1],s[1])||Math.max(r[1],s[1])+1e-8<Math.min(p[1],q[1]))continue;
    if(cross(p,q,r)*cross(p,q,s)<=1e-8&&cross(r,s,p)*cross(r,s,q)<=1e-8)return true;
  }
  return false;
}
export function vehicleBlocked(x, z, yaw, index, spec = 1, y=undefined) {
  const width=typeof spec==='number'?1.92*spec:spec.width;
  const length=typeof spec==='number'?4.22*spec:spec.length;
  const footprint=vehicleFootprint(x,z,yaw,width,length);
  for(const b of index.near(x,z,Math.hypot(width,length)/2))if(!(b.driveTopMin!==undefined&&y!==undefined&&y>=b.driveTopMin-length*.045-.15)&&(y===undefined||y+(spec.height||1.6)>(b.minY||0)&&y<(b.minY||0)+b.h)&&polygonsOverlap(footprint,b.p))return true;
  return false;
}

// Sweep from the character's shoulder, including interpolated positions. Height
// testing permits a camera above a roof. The radius protects the near clip plane.
export function cameraBoomContinuous(anchor, desired, index, radius = .3) {
  const dx=desired.x-anchor.x,dy=desired.y-anchor.y,dz=desired.z-anchor.z,length=Math.hypot(dx,dy,dz);
  if(length<1e-8)return {...desired};
  let safe=1;
  // Clip a moving point to a slab. A polygon expanded by the camera radius is
  // the union of its interior and finite edge capsules; no ray-length sampling.
  const clip=(start,delta,min,max,range)=>{
    if(Math.abs(delta)<1e-10)return start>=min&&start<=max;
    const a=(min-start)/delta,b=(max-start)/delta;
    range[0]=Math.max(range[0],Math.min(a,b));range[1]=Math.min(range[1],Math.max(a,b));return range[0]<=range[1];
  };
  const hitCircle=(x,z,range)=>{
    const ox=anchor.x-x,oz=anchor.z-z,a=dx*dx+dz*dz,b=2*(ox*dx+oz*dz),c=ox*ox+oz*oz-radius*radius;
    if(a<1e-12)return c<=0?range[0]:Infinity;
    const disc=b*b-4*a*c;if(disc<0)return Infinity;
    const root=Math.sqrt(disc),lo=Math.max(range[0],(-b-root)/(2*a)),hi=Math.min(range[1],(-b+root)/(2*a));return lo<=hi?lo:Infinity;
  };
  for(const b of index.near((anchor.x+desired.x)/2,(anchor.z+desired.z)/2,Math.hypot(dx,dz)/2+radius)){
    const vertical=[0,safe];if(!clip(anchor.y,dy,(b.minY||0)-radius,(b.minY||0)+b.h+radius,vertical))continue;
    if(pointInside(anchor.x+dx*vertical[0],anchor.z+dz*vertical[0],b.p)){safe=Math.min(safe,vertical[0]);continue;}
    for(let i=0;i<b.p.length;i++){
      const a=b.p[i],q=b.p[(i+1)%b.p.length],ex=q[0]-a[0],ez=q[1]-a[1],len=Math.hypot(ex,ez);
      safe=Math.min(safe,hitCircle(...a,vertical));if(len<1e-8)continue;
      const ux=ex/len,uz=ez/len,ox=anchor.x-a[0],oz=anchor.z-a[1],range=[vertical[0],Math.min(safe,vertical[1])];
      if(clip(ox*ux+oz*uz,dx*ux+dz*uz,0,len,range)&&clip(-ox*uz+oz*ux,-dx*uz+dz*ux,-radius,radius,range))safe=Math.min(safe,range[0]);
    }
  }
  if(safe<1)safe=Math.max(0,safe-.01/length);
  return {x:anchor.x+dx*safe,y:anchor.y+dy*safe,z:anchor.z+dz*safe};
}

// Retained for the independently loaded Padova 1500 controller.
export function cameraBoom(anchor, desired, index, radius = .3) {
  const dx = desired.x - anchor.x, dy = desired.y - anchor.y, dz = desired.z - anchor.z;
  const length = Math.hypot(dx, dy, dz);
  const candidates = [...index.near((anchor.x + desired.x) / 2, (anchor.z + desired.z) / 2, Math.hypot(dx, dz) / 2 + radius)];
  const blocked = t => {
    const x = anchor.x + dx * t, y = anchor.y + dy * t, z = anchor.z + dz * t;
    for (const b of candidates) {
      if (y - radius > b.h + (b.minY || 0) || y + radius < (b.minY || 0)) continue;
      if (pointInside(x, z, b.p)) return true;
      for (let i = 0; i < b.p.length; i++) {
        const n = nearestOnSegment(x, z, b.p[i], b.p[(i + 1) % b.p.length]);
        if (Math.hypot(x - n.x, z - n.z) < radius) return true;
      }
    }
    return false;
  };
  const steps = Math.max(1, Math.ceil(length / .12));
  let safe = 0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (blocked(t)) break;
    safe = t;
  }
  return {x:anchor.x + dx * safe, y:anchor.y + dy * safe, z:anchor.z + dz * safe};
}
