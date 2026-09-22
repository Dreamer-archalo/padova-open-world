// One continuous, grade-bounded surface for all ordinary urban paving.
// River beds are carved below it by Terrain; water does not change the height
// of the street above a bridge. Real grade-separated structures keep profiles.
export class StreetHeightField {
 constructor(roads){
  const terrain=roads.terrain,g=terrain.grid;
  this.step=16;this.x0=g.x0;this.z0=g.z0;
  this.width=Math.ceil((g.width-1)*g.step/this.step)+1;
  this.height=Math.ceil((g.height-1)*g.step/this.step)+1;
  const w=this.width,h=this.height,step=this.step,values=this.values=new Float64Array(w*h),ceilings=new Float64Array(w*h).fill(Infinity);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)values[j*w+i]=terrain.elevation(this.x0+i*step,this.z0+j*step);
  // Each shared road node constrains the four corners enclosing it. Propagate
  // those floors spatially, so adjacent roads cannot have different datums.
  const constrain=(x,z,target,ceiling=Infinity)=>{
   const i=Math.floor((x-this.x0)/step),j=Math.floor((z-this.z0)/step);
   for(let dz=0;dz<2;dz++)for(let dx=0;dx<2;dx++){const xx=i+dx,zz=j+dz;if(xx>=0&&xx<w&&zz>=0&&zz<h){values[zz*w+xx]=Math.max(values[zz*w+xx],target);ceilings[zz*w+xx]=Math.min(ceilings[zz*w+xx],ceiling);}}
  };
  for(const p of roads.profiles.values())if(roads.shared(p.road))for(let i=0;i<p.ids.length;i++){
   const n=roads.nodes[p.ids[i]],distance=terrain.waterDistance(n.x,n.z);
   constrain(n.x,n.z,Math.max(n.h,distance<12?terrain.waterHeight(n.x,n.z)+(distance<0?2.2:1):-Infinity),n.h<terrain.elevation(n.x,n.z)-.15?n.h:Infinity);
   if(i){const prev=roads.nodes[p.ids[i-1]],x=(prev.x+n.x)/2,z=(prev.z+n.z)/2;
    // A narrow canal can fall BETWEEN two nine-metre graph nodes.
    if(terrain.waterDistance(x,z)<1.2)constrain(x,z,terrain.waterHeight(x,z)+2.2);
   }
  }
  // Exact separable maximum of cones in the Manhattan metric: each axis has
  // <=2.5% grade, so the maximum grade in ANY direction is below 3.6%.
  const delta=step*.025;
  for(let j=0;j<h;j++){
   for(let i=1;i<w;i++){const k=j*w+i;values[k]=Math.max(values[k],values[k-1]-delta);}
   for(let i=w-2;i>=0;i--){const k=j*w+i;values[k]=Math.max(values[k],values[k+1]-delta);}
  }
  for(let i=0;i<w;i++){
   for(let j=1;j<h;j++){const k=j*w+i;values[k]=Math.max(values[k],values[k-w]-delta);}
   for(let j=h-2;j>=0;j--){const k=j*w+i;values[k]=Math.max(values[k],values[k+w]-delta);}
  }
  // Underground approaches are also surface streets. Propagate their ceilings
  // outward with the same grade bound, instead of restoring the natural ground
  // above them and leaving a five-metre step at each tunnel entrance.
  for(let j=0;j<h;j++){
   for(let i=1;i<w;i++){const k=j*w+i;ceilings[k]=Math.min(ceilings[k],ceilings[k-1]+delta);}
   for(let i=w-2;i>=0;i--){const k=j*w+i;ceilings[k]=Math.min(ceilings[k],ceilings[k+1]+delta);}
  }
  for(let i=0;i<w;i++){
   for(let j=1;j<h;j++){const k=j*w+i;ceilings[k]=Math.min(ceilings[k],ceilings[k-w]+delta);}
   for(let j=h-2;j>=0;j--){const k=j*w+i;ceilings[k]=Math.min(ceilings[k],ceilings[k+w]+delta);}
  }
  for(let k=0;k<values.length;k++)values[k]=Math.min(values[k],ceilings[k]);
  // The authored Prato island, quays and its four crossings share one platform.
  // A nearby underground passage cannot pull this fixed landmark into a basin.
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
   const x=this.x0+i*step,z=this.z0+j*step,d=Math.max(0,Math.hypot(x+35,z-858)-175);
   values[j*w+i]=Math.max(values[j*w+i],terrain.pratoHeight+.12-d*.025);
  }


 }
 sample(x,z){
  const u=Math.max(0,Math.min(this.width-1,(x-this.x0)/this.step)),v=Math.max(0,Math.min(this.height-1,(z-this.z0)/this.step));
  const i=Math.min(this.width-2,Math.floor(u)),j=Math.min(this.height-2,Math.floor(v)),a=u-i,b=v-j,k=j*this.width+i,h=this.values,w=this.width;
  return h[k]*(1-a)*(1-b)+h[k+1]*a*(1-b)+h[k+w]*(1-a)*b+h[k+w+1]*a*b;
 }
}
