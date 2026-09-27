// The existing PR #60 Michelangelo visual/spec, integrated into the unified world.
// No separate-page automatic transfer: the continuous regional game stays loaded.
import * as THREE from './vendor/three.module.js';
import {VEHICLES} from './vehicles.js';
export const MICHELANGELO='airport-michelangelo',MAX_KMH=1000,MAX_SPEED=MAX_KMH/3.6;
export const MICHELANGELO_SPEC=Object.freeze({
 ...VEHICLES['airport-interceptor'],name:'MICHELANGELO · Venezia 1000',
 family:'aircraft',width:17,length:25.8,height:5.7,wheelbase:10.5,
 aircraft:true,plane:true,accel:23,brake:27,steer:.38,max:MAX_SPEED,boost:MAX_SPEED,
 civilian:true,veniceLink:true
});
VEHICLES[MICHELANGELO]=MICHELANGELO_SPEC;

const cube=new THREE.BoxGeometry(1,1,1),colors=new Map();
function part(g,c,x,y,z,w,h,l,yaw=0){
 if(!colors.has(c))colors.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.44,metalness:.25}));
 const m=new THREE.Mesh(cube,colors.get(c));m.position.set(x,y,z);m.scale.set(w,h,l);m.rotation.y=yaw;m.castShadow=m.receiveShadow=true;g.add(m);return m;
}
export function createMichelangeloModel(){
 const g=new THREE.Group();g.name='Michelangelo · M1000';
 part(g,'#ebe7db',0,2.36,0,2.35,1.73,20.3);
 part(g,'#e0e0d6',0,2.27,11.2,1.18,.90,3.5);
 part(g,'#46667d',0,3.02,5.1,1.52,.49,4.2);
 // Two swept wings with distinctive blue-gold trim.
 for(const side of [-1,1]){
  part(g,'#e7e3d7',side*3.35,2.12,-1.8,7.2,.27,7.5,side*.11);
  part(g,'#1a526a',side*6.35,2.21,-2.35,1.1,.07,5.2,side*.15);
  part(g,'#e9e3d4',side*2.6,2.40,-9.15,4.1,.18,3.1);
  part(g,'#213e54',side*2.85,1.86,-9.9,1.08,1.05,2.7);
  part(g,'#d7b776',side*.76,2.83,4.3,.08,.16,5);
  part(g,'#283d4c',side*.76,.49,-.15,.30,.88,.62);
  part(g,'#203947',side*2.25,1.75,-9.4,1.28,1.05,1.7);
 }
 part(g,'#173e5d',0,3.66,-9.15,.25,3.10,4.0);
 part(g,'#e0b76a',0,4.88,-9.4,.30,.15,1.7);
 for(const z of [-3.8,-.9,2.1])for(const side of [-1,1])part(g,'#476779',side*1.08,2.78,z,.07,.18,.72);
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=112;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#123f5d';ctx.fillRect(0,0,640,112);ctx.fillStyle='#e8c884';ctx.font='bold 64px system-ui';ctx.textAlign='center';ctx.fillText('MICHELANGELO',320,75);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const badge=new THREE.Mesh(new THREE.PlaneGeometry(8.2,1.4),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true}));
  badge.position.set(0,4.19,0);badge.rotation.x=-Math.PI/2;g.add(badge);
 }
 g.userData.previewCategory='air';return g;
}

