import {CityWorld} from './world.js';
import {MAX_TERRAIN_GRADE,MIN_ADJACENT_DELTA,ROAD_WATER_CLEARANCE} from './phase4-terrain-fixes.js';

const finite=n=>Number.isFinite(n);
const DEFAULTS={dense:true,sampleStep:32,probe:4,warnLimit:Infinity,meshWarnings:true};
function reporter(options,report){
 let emitted=0;
 return (type,data)=>{report.issues++;report.byType[type]=(report.byType[type]||0)+1;if(emitted++<options.warnLimit)console.warn('[Padova geometry audit] '+type,data);};
}
function auditNativeGrid(terrain,options,report,warn){
 const g=terrain.grid;terrain.rawElevation(g.x0,g.z0);const h=terrain.__phase4HarmonisedGrid||g.heights,limit=terrain.__phase4NativeMaxDelta??Math.max(MIN_ADJACENT_DELTA,g.step*MAX_TERRAIN_GRADE);
 for(let y=0;y<g.height;y++)for(let x=0;x<g.width;x++){
  const i=y*g.width+x,a=h[i];if(!finite(a)){warn('terrain-nonfinite',{x,y,value:a});continue;}report.gridVertices++;
  for(const [nx,ny] of [[x+1,y],[x,y+1]]){if(nx>=g.width||ny>=g.height)continue;const b=h[ny*g.width+nx],dy=Math.abs(b-a),grade=dy/g.step;report.gridEdges++;report.maxGridDelta=Math.max(report.maxGridDelta,dy);report.maxGridGrade=Math.max(report.maxGridGrade,grade);if(!finite(b)||dy>limit+1e-4)warn('terrain-delta',{x:g.x0+x*g.step,z:g.z0+y*g.step,dx:nx-x,dz:ny-y,dy:+dy.toFixed(3),grade:+grade.toFixed(4),limit:+limit.toFixed(3)});}
 }
}
function auditRoads(terrain,options,report,warn){
 for(const profile of terrain.roads.profiles.values())for(let i=1;i<profile.ids.length;i++){
  const a=terrain.roads.nodes[profile.ids[i-1]],b=terrain.roads.nodes[profile.ids[i]],pa=profile.points[i-1],pb=profile.points[i],length=Math.hypot(pb[0]-pa[0],pb[1]-pa[1]);if(length<1e-6)continue;report.roadSegments++;
  if(![a.h,b.h].every(finite)){warn('road-nonfinite',{road:profile.road.n||profile.road.k,index:i});continue;}
  const grade=Math.abs(b.h-a.h)/length,limit=profile.road.k==='steps'?.66:.061;report.maxRoadGrade=Math.max(report.maxRoadGrade,grade);if(grade>limit)warn('road-grade',{road:profile.road.n||profile.road.k,grade:+grade.toFixed(4),x:+((a.x+b.x)/2).toFixed(1),z:+((a.z+b.z)/2).toFixed(1)});
  const lo=Math.min(a.h,b.h)-1e-5,hi=Math.max(a.h,b.h)+1e-5,s={a:pa,b:pb,ia:profile.ids[i-1],ib:profile.ids[i],profile,i:i-1};for(const t of [.25,.5,.75]){const h=terrain.roads.segmentHeight(s,t);if(!finite(h)||h<lo||h>hi)warn('road-hermite-overshoot',{road:profile.road.n||profile.road.k,t,h,lo,hi});}
  const x=(pa[0]+pb[0])/2,z=(pa[1]+pb[1])/2,wd=terrain.waterDistance(x,z);if(wd<0){const deck=terrain.roads.sample(profile.road,x,z),water=terrain.waterHeight(x,z),clearance=deck-water;report.waterRoadSamples++;report.minWaterRoadClearance=Math.min(report.minWaterRoadClearance,clearance);if(!profile.road.crossing)warn('road-inside-water-without-crossing',{road:profile.road.n||profile.road.k,x:+x.toFixed(1),z:+z.toFixed(1)});if(clearance<ROAD_WATER_CLEARANCE)warn('road-water-clearance',{road:profile.road.n||profile.road.k,clearance:+clearance.toFixed(3),x:+x.toFixed(1),z:+z.toFixed(1)});}
 }
}
function auditDenseElevation(terrain,options,report,warn){
 const g=terrain.grid,step=Math.max(8,options.sampleStep),probe=Math.max(1,options.probe),limit=Math.max(MIN_ADJACENT_DELTA,probe*MAX_TERRAIN_GRADE);
 const maxX=g.x0+g.step*(g.width-1),maxZ=g.z0+g.step*(g.height-1);
 for(let z=g.z0;z<maxZ-probe;z+=step)for(let x=g.x0;x<maxX-probe;x+=step){const a=terrain.elevation(x,z),e=terrain.elevation(x+probe,z),s=terrain.elevation(x,z+probe);report.denseSamples++;if(![a,e,s].every(finite)){warn('dense-nonfinite',{x,z,a,e,s});continue;}for(const [axis,b] of [['x',e],['z',s]]){const dy=Math.abs(b-a);report.maxDenseDelta=Math.max(report.maxDenseDelta,dy);if(dy>limit+1e-4)warn('dense-elevation-delta',{x:+x.toFixed(1),z:+z.toFixed(1),axis,probe,dy:+dy.toFixed(3),limit:+limit.toFixed(3)});}}
}
function triangleIndices(g){const index=g.index;if(index){const out=[];for(let i=0;i+2<index.count;i+=3)out.push([index.getX(i),index.getX(i+1),index.getX(i+2)]);return out;}const n=g.attributes.position?.count||0,out=[];for(let i=0;i+2<n;i+=3)out.push([i,i+1,i+2]);return out;}
function auditMesh(mesh,world,meta,options,report,warn){
 const g=mesh.geometry,p=g?.attributes?.position;if(!p)return;report.meshes++;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(![x,y,z].every(finite)){warn('mesh-nonfinite-position',{...meta,mesh:mesh.name||mesh.type,vertex:i,x,y,z});break;}}
 const n=g.attributes.normal;if(n)for(let i=0;i<n.count;i++){const x=n.getX(i),y=n.getY(i),z=n.getZ(i),l=Math.hypot(x,y,z);if(![x,y,z,l].every(finite)||l<1e-5){warn('mesh-invalid-normal',{...meta,mesh:mesh.name||mesh.type,vertex:i,x,y,z});break;}}
 const surface=mesh.material===world.groundMat||mesh.userData.streamRoads;for(const [ia,ib,ic] of triangleIndices(g)){const ax=p.getX(ia),ay=p.getY(ia),az=p.getZ(ia),bx=p.getX(ib),by=p.getY(ib),bz=p.getZ(ib),cx=p.getX(ic),cy=p.getY(ic),cz=p.getZ(ic),abx=bx-ax,aby=by-ay,abz=bz-az,acx=cx-ax,acy=cy-ay,acz=cz-az,nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx,area2=Math.hypot(nx,ny,nz);report.triangles++;if(area2<1e-8){warn('mesh-degenerate-triangle',{...meta,mesh:mesh.name||mesh.type,triangle:[ia,ib,ic]});continue;}if(surface&&ny<-1e-5)warn('surface-inverted-winding',{...meta,mesh:mesh.name||mesh.type,triangle:[ia,ib,ic],normalY:+(ny/area2).toFixed(4)});}
}
function auditGroup(world,g,key,stage,options){const report={issues:0,byType:{},meshes:0,triangles:0},warn=reporter(options,report);g.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)auditMesh(o,world,{key,stage},options,report,warn);});if(report.issues)console.warn('[Padova geometry audit] streamed chunk issues',key,stage,report);return report;}

export function auditPadovaGeometry(world,opts={}){
 if(!world?.terrain)throw new Error('Padova world not ready');const options={...DEFAULTS,...opts},report={issues:0,byType:{},gridVertices:0,gridEdges:0,maxGridDelta:0,maxGridGrade:0,roadSegments:0,maxRoadGrade:0,waterRoadSamples:0,minWaterRoadClearance:Infinity,denseSamples:0,maxDenseDelta:0,meshes:0,triangles:0},warn=reporter(options,report);
 auditNativeGrid(world.terrain,options,report,warn);auditRoads(world.terrain,options,report,warn);if(options.dense)auditDenseElevation(world.terrain,options,report,warn);
 for(const [key,root] of world.loaded)root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)auditMesh(o,world,{key,stage:'loaded'},options,report,warn);});
 if(!Number.isFinite(report.minWaterRoadClearance))report.minWaterRoadClearance=null;for(const k of ['maxGridDelta','maxGridGrade','maxRoadGrade','maxDenseDelta','minWaterRoadClearance'])if(Number.isFinite(report[k]))report[k]=+report[k].toFixed(4);report.ok=report.issues===0;console.log('[Padova geometry audit] complete',report);return report;
}

const originalInstall=CityWorld.prototype.installStage;
if(!CityWorld.prototype.__runtimeGeometryAudit){
 CityWorld.prototype.__runtimeGeometryAudit=true;
 CityWorld.prototype.installStage=function(key,g,stage){const result=originalInstall.call(this,key,g,stage);globalThis.__padovaWorld=this;if(DEFAULTS.meshWarnings)auditGroup(this,g,key,stage,{...DEFAULTS,dense:false,warnLimit:30});if(!this.__geometryAuditScheduled){this.__geometryAuditScheduled=true;const run=()=>{try{auditPadovaGeometry(this,{dense:false,warnLimit:50});}catch(e){console.warn('[Padova geometry audit] failed',e);}};(globalThis.requestIdleCallback||((fn)=>setTimeout(fn,250)))(run,{timeout:2500});}return result;};
}
if(typeof window!=='undefined')window.auditPadovaGeometry=opts=>auditPadovaGeometry(window.__padovaWorld,opts);
