// The ground mesh must follow the same continuous support used by movement.
// A 16 m quad can hide a narrow bank or cut through an otherwise smooth ramp.
export function groundTileNeedsSplit(terrain,x,z,size,height){
 if(size<=2)return false;
 const half=size/2;
 if(terrain.waterDistance(x+half,z+half)<size)return size>4;
 const a=height(x,z),b=height(x,z+size),c=height(x+size,z+size),d=height(x+size,z);
 const probes=[
  [x+half,z+half,(a+c)/2],
  [x,z+half,(a+b)/2],[x+half,z+size,(b+c)/2],
  [x+size,z+half,(c+d)/2],[x+half,z,(a+d)/2]
 ];
 return probes.some(([px,pz,linear])=>Math.abs(height(px,pz)-linear)>.10);
}
