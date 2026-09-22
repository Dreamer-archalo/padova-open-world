// V11: smooth only the existing mapped-road bypass, keeping both junctions fixed.
// Every candidate is checked as a road-width ribbon against the estate, water and buildings.
import {nearestOnSegment,pointInside} from './core.js';
import {VILLA} from './gameplay-areas-implementation.js';
import {segmentEntersMandria} from './villa-mandria-road-privacy.js';
const hypot=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const turn=(a,b,c)=>{const u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]],d=Math.hypot(...u)*Math.hypot(...v);return d<.001?0:Math.acos(Math.max(-1,Math.min(1,dot(u,v)/d)));};
const metrics=points=>{let max=0,energy=0,len=0;for(let i=1;i<points.length;i++)len+=hypot(points[i-1],points[i]);for(let i=1;i<points.length-1;i++){const t=turn(points[i-1],points[i],points[i+1]);max=Math.max(max,t);energy+=t*t;}return {maxTurnDeg:max*180/Math.PI,turnEnergy:energy,length:len};};
function obstacles(map){const objects=[...(map.buildings||[]),...(map.water||[]),...(map.areas||[]).filter(o=>['water','cemetery','grave_yard'].includes(o.k))];const local=[];
 for(const o of objects){if(!Array.isArray(o.p)||o.p.length<3)continue;let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const p of o.p){minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minZ=Math.min(minZ,p[1]);maxZ=Math.max(maxZ,p[1]);}
  if(minX>VILLA.x+480||maxX<VILLA.x-480||minZ>VILLA.z+480||maxZ<VILLA.z-480)continue;
  local.push({p:o.p,minX,maxX,minZ,maxZ});
 }return local;
}
function free(p,r,objects){for(const o of objects){if(p[0]+r<o.minX||p[0]-r>o.maxX||p[1]+r<o.minZ||p[1]-r>o.maxZ)continue;
  if(pointInside(p[0],p[1],o.p))return false;
  for(let i=0;i<o.p.length;i++){const q=nearestOnSegment(p[0],p[1],o.p[i],o.p[(i+1)%o.p.length]);if(Math.hypot(p[0]-q.x,p[1]-q.z)<r)return false;}
 }return true;}
function valid(points,width,objects){const radius=Math.max(2.5,width*.5+1.4);
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],distance=hypot(a,b);if(distance<.045||segmentEntersMandria(a,b))return false;
  const n=Math.ceil(distance/1.2);for(let j=0;j<=n;j++){if(i===1&&j===0||i===points.length-1&&j===n)continue;
   const t=j/n,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];if(!free(p,radius,objects))return false;
  }
 }return true;}
// Endpoint preservation prevents microscopic gaps in the public road graph.
function chaikin(points){const result=[points[0]];for(let i=0;i<points.length-1;i++){
 const a=points[i],b=points[i+1];result.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);
 }result.push(points.at(-1));return result;}
export function refineMandriaRoads(map){const roads=map.roads.filter(r=>r.estateBypass),objects=obstacles(map),report={examined:roads.length,smoothed:0,retained:0,unsafeRejected:0,beforeMaxTurn:0,afterMaxTurn:0};
 for(const road of roads){const before=metrics(road.p);report.beforeMaxTurn=Math.max(report.beforeMaxTurn,before.maxTurnDeg);let best=null;
  for(let pass=1,points=road.p;pass<=2;pass++){points=chaikin(points);if(!valid(points,road.w||5,objects)){report.unsafeRejected++;continue;}
   const after=metrics(points);if(after.length>before.length*1.065||after.maxTurnDeg>before.maxTurnDeg+.01||after.turnEnergy>=before.turnEnergy)continue;
   if(!best||after.turnEnergy<best.metrics.turnEnergy)best={points,metrics:after};
  }
  if(best){road.p=best.points;road.estateV11Curved=true;road.estateV11Before=before.maxTurnDeg;road.estateV11After=best.metrics.maxTurnDeg;report.smoothed++;report.afterMaxTurn=Math.max(report.afterMaxTurn,best.metrics.maxTurnDeg);}
  else{report.retained++;report.afterMaxTurn=Math.max(report.afterMaxTurn,before.maxTurnDeg);}
 }
 map.gameplay.mandriaRoadQuality=report;return report;
}
export {metrics as mandriaRoadMetrics};