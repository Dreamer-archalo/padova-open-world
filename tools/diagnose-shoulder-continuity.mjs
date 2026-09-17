import fs from 'node:fs';
import {Terrain} from '../dist/terrain.js';
import {applyCityData} from '../dist/districts.js';
import {prepareGameplayMap} from '../dist/gameplay-areas.js';
globalThis.window=globalThis;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){}})})};
const {SHOULDER_FEATHER}=await import('../dist/phase4-terrain-fixes.js');
const read=n=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+n+'.json',import.meta.url)));
const map=read('padova');applyCityData(map,read('city'));prepareGameplayMap(map);
const terrain=new Terrain(read('terrain'),map,{modern:true});
const excluded=/motorway|trunk|footway|path|cycleway|steps|pedestrian|tram/;
const kinds=new Map(),roads=new Map(),severe=[],summary={samples:0,failed:0,gapFailures:0,transitionFailures:0,both:0,waterSkipped:0};
function record(group,key,reason){let v=group.get(key);if(!v){v={samples:0,failed:0,gap:0,transition:0,maxGap:0,maxTransition:0};group.set(key,v);}v.samples++;if(reason){v.failed++;v.gap+=Number(reason.gap);v.transition+=Number(reason.transition);v.maxGap=Math.max(v.maxGap,reason.rawGap);v.maxTransition=Math.max(v.maxTransition,reason.rawTransition);}}
for(const profile of terrain.roads.profiles.values())for(let i=1;i<profile.points.length;i++){
 const a=profile.points[i-1],b=profile.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),road=profile.road;
 if(length<.01||road.crossing||road.tunnel||excluded.test(road.k||''))continue;
 const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2,yaw=Math.atan2(dx,dz),nx=Math.cos(yaw),nz=-Math.sin(yaw),deck=terrain.roads.sample(road,mx,mz);
 for(const side of [-1,1]){
  const near=road.w/2+1.25,far=road.w/2+Math.min(SHOULDER_FEATHER-.5,6.5),x1=mx+nx*near*side,z1=mz+nz*near*side,x2=mx+nx*far*side,z2=mz+nz*far*side;
  const w1=terrain.waterDistance(x1,z1),w2=terrain.waterDistance(x2,z2);if(w1<1.5||w2<1.5){summary.waterSkipped++;continue;}
  const h1=terrain.groundHeight(x1,z1),h2=terrain.groundHeight(x2,z2),gap=Math.abs(h1-deck),transition=Math.abs(h2-h1),badGap=gap>.55,badTransition=transition>1.35,bad=badGap||badTransition;
  summary.samples++;if(bad){summary.failed++;summary.gapFailures+=Number(badGap);summary.transitionFailures+=Number(badTransition);summary.both+=Number(badGap&&badTransition);}
  const reason=bad?{gap:badGap,transition:badTransition,rawGap:gap,rawTransition:transition}:null;
  record(kinds,road.k||'unknown',reason);record(roads,road.n||'(unnamed '+(road.k||'unknown')+')',reason);
  if(bad&&severe.length<45)severe.push({road:road.n||road.k,kind:road.k,bridge:!!road.b,crossing:!!road.crossing,layer:road.layer||0,roadW:road.w,segmentLen:length,side,x:+mx.toFixed(1),z:+mz.toFixed(1),deck:+deck.toFixed(3),nearHeight:+h1.toFixed(3),farHeight:+h2.toFixed(3),nearNative:+terrain.elevation(x1,z1).toFixed(3),farNative:+terrain.elevation(x2,z2).toFixed(3),nearWaterDist:+w1.toFixed(2),farWaterDist:+w2.toFixed(2),gap:+gap.toFixed(3),transition:+transition.toFixed(3)});
 }
}
const sorted=group=>[...group].map(([name,stats])=>({name,...stats,maxGap:+stats.maxGap.toFixed(3),maxTransition:+stats.maxTransition.toFixed(3)})).sort((a,b)=>b.failed-a.failed);
console.log(JSON.stringify({summary,kinds:sorted(kinds),topRoads:sorted(roads).slice(0,35),firstFailures:severe},null,2));
