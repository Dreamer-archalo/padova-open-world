import {vehicleBlocked} from './movement.js';
import {SpatialIndex,clamp} from './core.js';

const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};

// A broad earth embankment, flat at both ends and feathered sideways. The same
// function supplies the visible terrain and contact for cars, bikes and feet.
export function earthAccessHeight(r,x,z,base){
 const dx=x-r.x,dz=z-r.z,u=dx*Math.cos(r.yaw)-dz*Math.sin(r.yaw),v=dx*Math.sin(r.yaw)+dz*Math.cos(r.yaw);
 if(v<0||v>r.length)return base;
 const edge=Math.max(0,Math.abs(u)-r.width/2);if(edge>=r.feather)return base;
 const top=r.fromY+(r.toY-r.fromY)*smooth(v/r.length),side=1-smooth(edge/r.feather);
 // End blending has zero derivative: no wall even where the natural terrain
 // varies slightly across the width at the foot of the ramp.
 const ends=smooth(v/5)*smooth((r.length-v)/5);
 return base+Math.max(0,top-base)*side*ends;
}

export function installEarthAccess(terrain,collision,structures){
 if(!terrain.modern||terrain.earthAccess)return [];
 const fastStartup=globalThis.__padovaFastStartup;
 globalThis.__padovaFastStartup=false;
 try{
 const index=new SpatialIndex(60);
 for(const b of structures)if(b.solid!==false)index.add(b,b.minX,b.minZ,b.maxX,b.maxZ);
 const ramps=[],audit={gaps:terrain.motorwayAudit?.gaps?.length||0,flatOrTall:0,obstructed:0,steep:0,accepted:0,examples:[]};
 for(const gap of terrain.motorwayAudit?.gaps||[]){
  if(ramps.length>=6)break;
  const profile=[...terrain.roads.profiles.values()].find(p=>p.id===gap.roadId);
  if(!profile||profile.road.crossing||profile.road.tunnel)continue;
  candidate: for(const side of [-1,1])for(const skew of [-.6,0,.6])for(const trialLength of [32,44,56]){
   const nx=Math.cos(gap.yaw)*side,nz=-Math.sin(gap.yaw)*side;
   const normal=Math.sqrt(1-skew*skew),toward={x:-nx*normal+Math.sin(gap.yaw)*skew,z:-nz*normal+Math.cos(gap.yaw)*skew};
   const yaw=Math.atan2(toward.x,toward.z),width=5;
   const end={x:gap.x+nx*(profile.road.w/2-.5),z:gap.z+nz*(profile.road.w/2-.5)};
   // Start beyond the road's normal ground feather, then size the approach to
   // keep its maximum smoothstep grade below 18 percent.
   let length=trialLength,start={x:end.x-toward.x*length,z:end.z-toward.z*length};
   let fromY=terrain.groundHeight(start.x,start.z),toY=terrain.roads.sample(profile.road,end.x,end.z)-.05;
   const rise=toY-fromY;if(rise<.3||rise>6){audit.flatOrTall++;continue;}
   length=Math.max(length,rise*9);start={x:end.x-toward.x*length,z:end.z-toward.z*length};
   fromY=terrain.groundHeight(start.x,start.z);
   const r={x:start.x,z:start.z,yaw,width,length,fromY,toY,feather:Math.max(8,(toY-fromY)*8),name:'Raccordo sterrato · '+gap.road};
   let clear=true,previous=null,maxGrade=0;
   for(let at=-6;at<=length+6;at+=1){
    const x=start.x+toward.x*at,z=start.z+toward.z*at,base=terrain.groundHeight(x,z),y=Math.max(terrain.height(x,z),earthAccessHeight(r,x,z,base)+.05);
    if(previous!==null)maxGrade=Math.max(maxGrade,Math.abs(y-previous));previous=y;
    if(x<-5930||x>7220||z<-6430||z>6180||terrain.waterDistance(x,z)<r.feather+width/2
     ||!terrain.dry(x,z,width/2,y)||vehicleBlocked(x,z,yaw,collision,{width,length:5,height:2},y)||vehicleBlocked(x,z,yaw,index,{width,length:5,height:2},y)){clear=false;break;}
   }
   if(!clear||maxGrade>.22){audit[clear?'steep':'obstructed']++;if(audit.examples.length<8)audit.examples.push({road:gap.road,x:start.x,z:start.z,rise,maxGrade,clear});continue;}
   ramps.push(r);break candidate;
  }
 }
 terrain.earthAccess=ramps;
 audit.accepted=ramps.length;terrain.earthAccessAudit=audit;
 const ground=terrain.groundHeight.bind(terrain),height=terrain.height.bind(terrain);
 const raised=(x,z,base)=>ramps.reduce((h,r)=>earthAccessHeight(r,x,z,h),base);
 terrain.groundHeight=(x,z)=>raised(x,z,ground(x,z));
 terrain.height=(x,z,reference=null)=>{
  const current=height(x,z,reference),base=ground(x,z),top=raised(x,z,base);
  return top>base+.001?Math.max(current,top+.05):current;
 };
 return ramps;
 }finally{globalThis.__padovaFastStartup=fastStartup;}
}
