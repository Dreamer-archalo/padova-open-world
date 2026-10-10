// The building volume ends at its local roof, including authored sloping roofs.
export function roofClearance(b,x,z,y){
 if(!b.roofAt||!Number.isFinite(y))return false;
 let roof=b.roofAt(x,z);
 if(!roof){let best=null,d=Infinity;for(let i=0;i<b.p.length;i++){
  const a=b.p[i],q=b.p[(i+1)%b.p.length],dx=q[0]-a[0],dz=q[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1))),px=a[0]+dx*t,pz=a[1]+dz*t,n=Math.hypot(x-px,z-pz);
  if(n<d){d=n;best=b.roofAt(px,pz);}
 }roof=best;}
 return !!roof&&y>=roof.y-.02;
}
