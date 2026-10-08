import {pointInside} from './core.js';

// Foundations follow the lowest ground sample. The occupied floor must instead
// clear the terrain, with one surface shared by rendering and both controllers.
export function registerDealerSurface(terrain,b){
 if(!terrain||!b?.dealerDoor||globalThis.__padovaFastStartup===true)return;
 terrain.dealerSurfaces??=new Map();
 if(terrain.dealerSurfaces.has(b.dealerSite)){b.dealerFloorY=terrain.dealerSurfaces.get(b.dealerSite).dealerFloorY;return;}
 const height=(x,z)=>terrain.height?.(x,z)??b.minY??0,samples=[height(b.cx,b.cz),...b.p.map(p=>height(...p))];
 for(let z=b.minZ+1;z<b.maxZ;z+=4)for(let x=b.minX+1;x<b.maxX;x+=4)if(pointInside(x,z,b.p))samples.push(height(x,z));
 b.dealerFloorY=Math.max(...samples.filter(Number.isFinite))+.035;
 const d=b.dealerDoor,nx=(d.outside.x-d.x)/2,nz=(d.outside.z-d.z)/2;
 b.dealerApproach={nx,nz,length:10,endY:height(d.x+nx*10,d.z+nz*10)};
 terrain.dealerSurfaces.set(b.dealerSite,b);
}

export function dealerSurfaceHeight(terrain,x,z){
 for(const b of terrain.dealerSurfaces?.values()||[]){
  if(x<b.minX-11||x>b.maxX+11||z<b.minZ-11||z>b.maxZ+11)continue;
  if(pointInside(x,z,b.p))return b.dealerFloorY;
  const d=b.dealerDoor,a=b.dealerApproach,dx=x-d.x,dz=z-d.z,along=dx*a.nx+dz*a.nz,across=dx*d.dx+dz*d.dz;
  if(along>=0&&along<a.length&&Math.abs(across)<2.65)return b.dealerFloorY+(a.endY-b.dealerFloorY)*along/a.length;
 }
 return null;
}
