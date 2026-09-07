import fs from 'node:fs';
import {Terrain} from '../dist/terrain.js';
import {applyCityData} from '../dist/districts.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+n,import.meta.url)));
export function auditMap(map,terrain){const r=terrain.roads,issues={unsupportedWater:[],deadEndsInWater:[],steep:[],lowDecks:[],clearance:[],junctionSteps:[]};let waterSamples=0,bridgeSegments=0,maxGrade=0,maxVehicleGrade=0;
 const sourceVertices=new Map();
 for(const p of r.profiles.values()){
  for(const endpoint of [0,p.points.length-1]){const n=r.nodes[p.ids[endpoint]],degree=n.degree;if(p.wet[endpoint]&&degree===1)issues.deadEndsInWater.push({road:p.id,name:p.road.n,x:n.x,z:n.z});}
  for(let i=0;i<p.points.length;i++){const [x,z]=p.points[i],h=r.sample(p.road,x,z);if(!Number.isFinite(h))throw Error('Nonfinite road '+p.id);
   if(p.wet[i]&&!p.tunnel){waterSamples++;if(!p.road.crossing)issues.unsupportedWater.push({road:p.id,x,z});if(h<terrain.waterHeight(x,z)+1.8)issues.lowDecks.push({road:p.id,x,z,height:h});}
   if(i){const a=p.points[i-1],ah=r.sample(p.road,...a),d=Math.hypot(x-a[0],z-a[1]),grade=d>.01?Math.abs(h-ah)/d:0;maxGrade=Math.max(maxGrade,grade);if(!['steps','footway','path','cycleway','track'].includes(p.road.k))maxVehicleGrade=Math.max(maxVehicleGrade,grade);if(grade>(p.road.k==='steps'?.656:.091))issues.steep.push({road:p.id,x,z,grade});if(p.road.crossing)bridgeSegments++;}
  }
  for(const point of p.road.p){const key=point.join(','),h=r.sample(p.road,...point);if(sourceVertices.has(key)&&Math.abs(sourceVertices.get(key)-h)>.1)issues.junctionSteps.push({road:p.id,point,height:h,other:sourceVertices.get(key)});sourceVertices.set(key,h);}
 }
 // True segment crossings, not just coincident bounding boxes. Distinct OSM
 // vertices preserve separate levels; report insufficient headroom for review.
 const seen=new Set();for(const p of r.profiles.values()){if(!(p.layer>0||p.road.b)||p.road.k==='tram')continue;
  for(let i=1;i<p.points.length;i++){const a=p.points[i-1],b=p.points[i],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
   for(const s of r.index.near(x,z,8)){const q=s.profile;if(q===p||(q.layer||(q.road.b?1:0))>=(p.layer||(p.road.b?1:0))||q.road.k==='tram')continue;const c=s.a,d=s.b,dx=b[0]-a[0],dz=b[1]-a[1],ex=d[0]-c[0],ez=d[1]-c[1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-6)continue;const u=((c[0]-a[0])*ez-(c[1]-a[1])*ex)/den,v=((c[0]-a[0])*dz-(c[1]-a[1])*dx)/den;if(u<=.001||u>=.999||v<=.001||v>=.999)continue;
    const key=[p.id,q.id].sort((a,b)=>a-b).join(',');if(seen.has(key))continue;seen.add(key);const px=a[0]+dx*u,pz=a[1]+dz*u,clearance=r.sample(p.road,px,pz)-r.sample(q.road,px,pz)-.4;if(clearance<(['footway','path','cycleway','steps'].includes(q.road.k)?2.2:4.2))issues.clearance.push({upper:p.id,lower:q.id,x:px,z:pz,clearance});
   }
  }
 }
 const areas={};for(const [name,x,z,radius] of [['Sacra Famiglia',-1300,1300,900],['Bassanello',-450,2050,700],['Guizza / south',-450,2850,950],['Prato',-35,858,200],['Via dei Tadi',-570,-55,130],['Piazza delle Erbe',-150,-49,150]]){areas[name]={roads:[...r.profiles.values()].filter(p=>p.points.some(p=>Math.hypot(p[0]-x,p[1]-z)<radius)).length,issues:Object.fromEntries(Object.entries(issues).map(([k,list])=>[k,list.filter(p=>p.x!==undefined&&Math.hypot(p.x-x,p.z-z)<radius).length]))};}
 return {sourceDate:map.cityDate,roads:r.profiles.size,sampledNodes:r.nodes.length,waterSamples,bridgeSegments,inferredBridges:r.report.inferred.length,layeredRoads:r.report.layers,maxGrade,maxVehicleGrade,fountains:terrain.fountains.length,counts:Object.fromEntries(Object.entries(issues).map(([k,v])=>[k,v.length])),areas,issues};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const map=read('padova.json'),city=read('city.json');applyCityData(map,city);map.cityDate=city.date;const terrain=new Terrain(read('terrain.json'),map),report=auditMap(map,terrain);fs.mkdirSync(new URL('../docs/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../docs/map-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,issues:undefined,areas:undefined},null,2));if(report.counts.unsupportedWater||report.counts.steep||report.counts.junctionSteps)process.exitCode=1;}
