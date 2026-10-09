import * as THREE from './vendor/three.module.js';
import {coachMaterial,coachSurface,WHEEL_COLOURS} from './car-coachwork.js';

// optionPart is retained through batching: 1 rims, 2 mirror shells,
// 3 grille, 4 exhaust. Finishes recolour existing parts rather than duplicating them.
export function recolorOptionPart(root,part,color){
 let found=false;const tint=new THREE.Color(color);
 root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.optionPart;if(!a?.array.some(v=>v===part))return;found=true;o.geometry=o.geometry.clone();const c=o.geometry.attributes.color,mask=o.geometry.attributes.collectorPaint;for(let i=0;i<a.count;i++)if(a.getX(i)===part){c.setXYZ(i,tint.r,tint.g,tint.b);mask?.setX(i,0);}c.needsUpdate=true;});return found;
}
export function removeOptionPart(root,part){
 root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.optionPart;if(!a?.array.some(v=>v===part))return;const geo=new THREE.BufferGeometry();for(const [key,attr] of Object.entries(o.geometry.attributes)){const values=[];for(let i=0;i<a.count;i++)if(a.getX(i)!==part)for(let j=0;j<attr.itemSize;j++)values.push(attr.array[i*attr.itemSize+j]);geo.setAttribute(key,new THREE.Float32BufferAttribute(values,attr.itemSize));}o.geometry=geo;});
}
const cube=new THREE.BoxGeometry(),cylinder=new THREE.CylinderGeometry(1,1,1,16);
function add(root,geo,kind,color,x,y,z,sx,sy,sz,part){const o=new THREE.Mesh(geo,coachMaterial(kind,color));o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.userData.optionPart=part;o.userData.coachPaint=false;root.add(o);return o;}
export function applyWheelDesign(root,build){
 const mounts=root.userData.wheelMounts||[];if(!mounts.length)return;
 const color=WHEEL_COLOURS[build.wheels]||WHEEL_COLOURS.standard;
 if(build.wheelDesign==='standard'){recolorOptionPart(root,1,color);return;}
 removeOptionPart(root,1);
 for(const {x,y,z,r,width,sides} of mounts)for(const side of sides){
  const face=x+side*(width*.52+.008),ring=add(root,new THREE.TorusGeometry(r*.68,.015,6,20),'alloy',color,face,y,z,1,1,1,1);ring.rotation.y=Math.PI/2;ring.geometry.userData.coachTransient=true;
  const disc=add(root,cylinder,'trim','#22292e',face-side*(build.wheelDesign==='dish'?.065:.017),y,z,r*.64,.010,r*.64,1);disc.rotation.z=Math.PI/2;
  const design=build.wheelDesign,count={mesh:12,sport:5,split:5,six:6,turbine:9,dish:5,aero:0,steel:8,wire:24,rally:4}[design]??5;
  if(['aero','steel'].includes(design)){
   const cover=add(root,cylinder,'alloy',color,face+side*.007,y,z,r*.62,.014,r*.62,1);cover.rotation.z=Math.PI/2;
   for(let i=0;i<(design==='aero'?5:8);i++){const a=i*Math.PI*2/(design==='aero'?5:8),hole=add(root,cylinder,'trim','#22292e',face+side*.018,y+Math.cos(a)*r*.43,z+Math.sin(a)*r*.43,r*(design==='aero'?.09:.07),.006,r*(design==='aero'?.09:.07),1);hole.rotation.z=Math.PI/2;}
  }
  for(let i=0;i<count;i++)for(const split of design==='split'?[-1,1]:[0]){
   const a=i*Math.PI*2/count+split*.12,skew=design==='turbine'?.32:design==='wire'?(i%2?-.22:.22):0;
   const o=add(root,cube,'alloy',color,face+side*(design==='dish'?-.028:.008),y+Math.cos(a)*r*.34,z+Math.sin(a)*r*.34,.021,r*(design==='wire'?.62:.59),r*({mesh:.045,sport:.14,split:.065,six:.16,turbine:.21,dish:.19,wire:.022,rally:.24}[design]||.1),1);o.rotation.x=a+skew;
  }
  if(design==='dish'){const lip=add(root,new THREE.TorusGeometry(r*.60,r*.07,6,24),'alloy',color,face+side*.01,y,z,1,1,1,1);lip.rotation.y=Math.PI/2;lip.geometry.userData.coachTransient=true;}
  const hub=add(root,cylinder,'alloy',color,face+side*.014,y,z,r*.17,.022,r*.17,1);hub.rotation.z=Math.PI/2;
 }root.userData.wheelDesign=build.wheelDesign;
}
export function applyMountedTrim(root,s,b){
 const c={polished:'#dbe4e8',satin:'#9ca9ad',black:'#28333b',bronze:'#aa8555'},w=s.width,l=s.length,h=s.height,bike=!!s.bike||w<1.15;
 if(b.chromeMirrors&&b.chromeMirrors!=='standard')recolorOptionPart(root,2,c[b.chromeMirrors]);
 if(b.grille&&b.grille!=='standard'){
  removeOptionPart(root,3);const y=Math.max(.43,Math.min(.65,h*.4)),hit=coachSurface(root,[0,y,l],[0,0,-1]);
  if(hit){const chrome=c[b.chromeGrille]||'#aeb9bd',count=b.grille==='mesh'?7:5;for(let i=0;i<count;i++){const x=(i-(count-1)/2)*w*.065;add(root,cube,'alloy',chrome,x,y,hit.z+.015,.018,.10,.022,3);}if(b.grille==='mesh')for(const dy of [-.035,0,.035])add(root,cube,'alloy',chrome,0,y+dy,hit.z+.019,w*.40,.013,.018,3);}
 }
 if(b.chromeGrille&&b.chromeGrille!=='standard')recolorOptionPart(root,3,c[b.chromeGrille]);
 if(b.exhaust&&b.exhaust!=='standard'||b.chromeExhaust&&b.chromeExhaust!=='standard'){
  const finish=c[b.chromeExhaust]||'#aeb9bd';
  if(bike){recolorOptionPart(root,4,finish);return;}
  removeOptionPart(root,4);
  const y=.30;for(const side of b.exhaust==='dual'?[-1,1]:[1]){
   const x=side*w*.28;
   // Mount at the actual rear body edge above the tailpipe, not a fraction of length.
   let rear=null;for(const height of [.45,.55,.65,.75]){const hit=coachSurface(root,[x,height,-l],[0,0,1]);if(hit&&(!rear||hit.z<rear.z))rear=hit;}
   if(!rear)continue;
   const lip=rear.z-.020,pipe=add(root,cylinder,'alloy',finish,x,y,lip+.085,.055,.19,.055,4);pipe.rotation.x=Math.PI/2;
   const opening=add(root,cylinder,'trim','#20272c',x,y,lip-.012,.042,.012,.042,4);opening.rotation.x=Math.PI/2;
   // An attached riser joins the silencer to the rear underbody.
   add(root,cube,'trim','#354047',x,(y+rear.y-.035)/2,lip+.095,.06,Math.max(.05,rear.y-y-.035),.09,4);
  }
 }
}
