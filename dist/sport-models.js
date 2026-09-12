import * as THREE from './vendor/three.module.js';
import {box,shape,material} from './scene-primitives.js';
export function createWedgeCar(color,w=2,l=4.5,h=1.18,bigWing=false){
 const g=new THREE.Group(),rows=[[-l/2,w*.47,.36,.7],[-l*.25,w*.5,.31,.72],[l*.12,w*.47,.29,.67],[l*.49,w*.43,.28,.38]],p=[];
 for(let i=1;i<rows.length;i++){const rings=[rows[i-1],rows[i]].map(([z,r,lo,hi])=>[[-r,lo,z],[r,lo,z],[r*.88,hi,z],[-r*.88,hi,z]]);for(let j=0;j<4;j++){const k=(j+1)%4;p.push(...rings[0][j],...rings[1][j],...rings[1][k],...rings[0][j],...rings[1][k],...rings[0][k]);}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.computeVertexNormals();const shell=new THREE.Mesh(geo,material(color));shell.name='wedge body';g.add(shell);
 box(g,'#1f353e',0,(h+.65)/2,-l*.1,w*.64,h-.65,l*.34);box(g,color,0,h,-l*.12,w*.67,.065,l*.27);
 const wind=box(g,'#34555d',0,(h+.66)/2,l*.1,w*.68,.05,l*.2);wind.rotation.x=.52;
 for(const side of [-1,1]){
  box(g,'#162e34',side*w*.46,.54,-l*.12,.03,.2,l*.27);
  box(g,'#162a30',side*w*.28,.33,l*.49,w*.29,.13,.04);
  box(g,'#eef5d9',side*w*.34,.45,l*.465,w*.21,.07,.055);
  box(g,'#c54135',side*w*.32,.61,-l*.502,w*.25,.07,.05);
  for(const z of [-l*.31,l*.29])shape(g,'cylinder','#1a2327',side*w*.445,.275,z,.29,.22,.29).rotation.z=Math.PI/2;
  if(bigWing)box(g,'#252f36',side*w*.3,.89,-l*.36,.08,.6,.15);
 }
 box(g,'#253035',0,.25,l*.47,w*.98,.055,.32);
 if(bigWing){box(g,'#222e35',0,1.21,-l*.39,w*1.08,.1,.6);for(const side of [-1,1])box(g,color,side*w*.54,1.27,-l*.39,.055,.32,.65);}
 g.userData.sportsSilhouette=true;g.userData.bigWing=bigWing;return g;
}
