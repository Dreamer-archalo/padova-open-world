import * as THREE from './vendor/three.module.js';
import {coachMaterial,compactCoachwork,createCoachwork,coachSurface} from './car-coachwork.js';

// All dimensions remain inside the existing handling/collision footprint.
// +Z is forward. The wheel, chassis and cabin are built independently: a bike
// cannot become a scaled car, and equipment defines each commercial silhouette.
export const ROAD_FLEET_IDS=['motorcycle','scooter','truck','taxi','ape','cisterna','camionrampa','tir','autotreno','cantiere','betoniera','soccorso','portavalori','supersport','enduro','naked','touring','trail','cruiser','club_naked','club_enduro','club_supersport','tank'];
const cube=new THREE.BoxGeometry(),sphere=new THREE.SphereGeometry(1,12,8),cylinder=new THREE.CylinderGeometry(1,1,1,12),rodGeometry=new THREE.CylinderGeometry(1,1,1,6),rim=new THREE.TorusGeometry(.82,.18,6,20),metal='#b3bdc2',rubber='#20282b',glass='#294752';
const geometries=new Map();
function mesh(g,geo,kind,c,x,y,z,sx=1,sy=1,sz=1,paintable=kind==='paint'){
 const o=new THREE.Mesh(geo,coachMaterial(kind,c));o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;o.userData.coachPaint=paintable;g.add(o);return o;
}
const box=(g,k,c,x,y,z,w,h,l,p=k==='paint')=>mesh(g,cube,k,c,x,y,z,w,h,l,p);
const bulb=(g,k,c,x,y,z,w,h,l,p=k==='paint')=>mesh(g,sphere,k,c,x,y,z,w,h,l,p);
function rod(g,k,c,a,b,r=.025){const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),o=mesh(g,rodGeometry,k,c,...new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5).toArray(),r,delta.length(),r);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;}
function panel(g,k,c,points,paintable=k==='paint'){
 const p=[];for(let i=1;i<points.length-1;i++)p.push(...points[0],...points[i],...points[i+1]);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(p.flatMap((_,i)=>i%3===0?[p[i],p[i+2]]:[]),2));geo.computeVertexNormals();geo.userData.coachTransient=true;return mesh(g,geo,k,c,0,0,0,1,1,1,paintable);
}
// Rounded octagonal sections keep cab shoulders, noses and tanks smooth while
// retaining a closed shell with correctly wound front and rear caps.
function loft(g,key,k,c,sections,paintable=k==='paint'){
 if(!geometries.has(key)){
  const p=[],uv=[],ix=[];
  for(const [z,w,lo,hi] of sections){const h=hi-lo;for(const [x,y] of [[-.38,0],[.38,0],[.5,.13],[.5,.84],[.37,1],[-.37,1],[-.5,.84],[-.5,.13]]){p.push(x*w,lo+y*h,z);uv.push(x+.5,z);}}
  for(let i=1;i<sections.length;i++)for(let j=0;j<8;j++){const a=(i-1)*8+j,b=(i-1)*8+(j+1)%8,d=i*8+j,e=i*8+(j+1)%8;ix.push(a,b,e,a,e,d);}
  for(let j=1;j<7;j++){ix.push(0,j+1,j);const a=(sections.length-1)*8;ix.push(a,a+j,a+j+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();geometries.set(key,geo);
 }return mesh(g,geometries.get(key),k,c,0,0,0,1,1,1,paintable);
}
function loftSide(sections,z,y){let i=1;while(i<sections.length-1&&z>sections[i][0])i++;const a=sections[i-1],b=sections[i],t=(z-a[0])/(b[0]-a[0]),w=a[1]+(b[1]-a[1])*t,lo=a[2]+(b[2]-a[2])*t,hi=a[3]+(b[3]-a[3])*t,v=(y-lo)/(hi-lo);return w*(v>.84?.5-.13*Math.min(1,(v-.84)/.16):v<.13?.38+.12*Math.max(0,v/.13):.5)+.006;}
function wheel(g,x,z,r,width=.20,finish='standard',bike=false,offroad=false){
 const color=({bronze:'#997743',gold:'#b79b54',white:'#d8dbd5',black:'#333b41',graphite:'#5c6871'})[finish]||metal;
 const tyre=mesh(g,rim,'trim',rubber,x,r,z,r,r,width/.36);tyre.rotation.y=Math.PI/2;
 for(const side of bike?[-1,1]:[Math.sign(x)||1]){
  const face=x+side*width*.48,hub=mesh(g,cylinder,'alloy',color,face,r,z,r*.20,.018,r*.20);hub.rotation.z=Math.PI/2;
  const disc=mesh(g,cylinder,'alloy','#737e83',x+side*width*.30,r,z,r*.66,.012,r*.66);disc.rotation.z=Math.PI/2;
  const ring=mesh(g,new THREE.TorusGeometry(r*.72,.016,4,12),'alloy',color,face,r,z);ring.rotation.y=Math.PI/2;ring.geometry.userData.coachTransient=true;
  const count=bike?(offroad?12:6):8;
  for(let i=0;i<count;i++){const a=i*2*Math.PI/count;rod(g,'alloy',color,[face,r+Math.cos(a)*r*.18,z+Math.sin(a)*r*.18],[face,r+Math.cos(a+.12)*r*.71,z+Math.sin(a+.12)*r*.71],bike?.011:.022);}
  if(bike)box(g,'paint','#a54c35',face,r+.09,z+.12,.018,.09,.075,false);
 }
 if(offroad)for(let i=0;i<14;i++){const a=i*2*Math.PI/14,o=box(g,'trim',rubber,x,r+Math.cos(a)*r*.96,z+Math.sin(a)*r*.96,width*.9,.038,.075);o.rotation.x=-a;}
}
function plate(g,z,y=.65){box(g,'trim','#d9dfd8',0,y,z,.32,.08,.018,false);box(g,'glass','#49658a',-.14,y,z+(z>0?.011:-.011),.024,.07,.012,false);}
function lights(g,w,l,y,round=false){
 for(const side of [-1,1]){
  if(round){const o=mesh(g,cylinder,'glass','#f4e7c6',side*w*.29,y,l*.495,.10,.025,.10,false);o.rotation.x=Math.PI/2;}
  else box(g,'glass','#e8ecdb',side*w*.30,y,l*.494,w*.16,.10,.028,false);
  box(g,'glass','#b33c37',side*w*.34,y*.83,-l*.49,w*.12,.065,.025,false);
  box(g,'glass','#c17f3e',side*w*.35,y+.12,l*.485,w*.08,.026,.018,false);
 }plate(g,-l*.494,y*.71);
}
const glyphs={P:['110','101','110','100','100'],O:['010','101','101','101','010'],L:['100','100','100','100','111'],I:['111','010','010','010','111'],Z:['111','001','010','100','111'],A:['010','101','111','101','101'],T:['111','010','010','010','010'],X:['101','101','010','101','101']};
function label(g,text,x,y,z,scale=.022,color='#e2e7df'){
 for(const side of [-1,1])for(const [i,ch] of [...text].entries())for(const [row,bits] of (glyphs[ch]||[]).entries())for(let col=0;col<3;col++)if(bits[col]==='1'){
  const b=y+(2-row)*scale,c=z+(i*4+col-text.length*2)*scale,at=coachSurface(g,[side*(x+.5),b,c],[-side,0,0]),a=at?at.x+side*.006:side*x;
  panel(g,'trim',color,side>0?[[a,b,c],[a,b+scale*.9,c],[a,b+scale*.9,c+scale*.9],[a,b,c+scale*.9]]:[[a,b,c+scale*.9],[a,b+scale*.9,c+scale*.9],[a,b+scale*.9,c],[a,b,c]],false);
 }
}
function bike(g,id,s,c,finish){
 const base=s.clubBase||id,classic=base==='cruiser',offroad=['enduro','trail'].includes(base),sport=base==='supersport',tour=base==='touring',scooter=base==='scooter',l=s.length,w=s.width,front=s.wheelbase/2,rear=-front,r=scooter?.25:offroad?.345:classic?.31:.32,seat=scooter?.86:classic?.79:offroad?.94:.89;
 for(const z of [rear,front])wheel(g,0,z,r,sport?.23:scooter?.16:.19,finish.wheels,true,offroad);
 // Tubular frame, visible swingarm, cylinder block and exhaust are structural.
 for(const side of [-1,1]){
  rod(g,'alloy','#4e5d62',[side*.13,r,rear],[side*.15,.58,.04],.035);
  rod(g,'alloy','#515f64',[side*.13,.54,-.22],[side*.13,.92,.29],.026);
  rod(g,'alloy',metal,[side*.10,r,front],[side*.13,offroad?1.17:1.08,front-.18],.027);
  rod(g,'alloy',metal,[side*.13,.52,-.30],[side*.15,seat-.08,-.53],.024);
  for(let i=0;i<4;i++)box(g,'alloy','#818b8e',side*.16,.49+i*.045,.02,.19,.019,.28,false);
  rod(g,'alloy',metal,[side*.23,.43,-.10],[side*.25,.40,-l*.37],classic?.055:.047);
  box(g,'trim',rubber,side*.21,.42,-l*.38,.12,.10,.025,false);
  box(g,'trim',rubber,side*w*.31,.55,-.15,.14,.04,.11,false);
 }
 bulb(g,'alloy','#5c696b',0,.52,0,.19,.19,.24,false);
 if(scooter){
  bulb(g,'paint',c,0,.60,-.40,w*.39,.31,l*.27);
  loft(g,base+'/legshield','paint',c,[[front-.16,w*.52,.35,1.03],[front+.01,w*.73,.40,1.02],[front+.10,w*.55,.55,.95]]);
  box(g,'trim','#3c4548',0,.32,-.04,w*.62,.06,l*.50,false);
  bulb(g,'paint',c,0,1.05,front-.09,w*.28,.10,.12);bulb(g,'glass','#efe8d0',0,1.06,front+.025,.09,.075,.025,false);
 }else{
  bulb(g,'paint',c,0,seat-.035,.14,w*(classic?.26:.29),classic?.14:.19,l*.17);
  loft(g,base+'/tail','paint',c,[[rear-.10,w*.18,seat-.17,seat-.06],[rear+.16,w*.45,seat-.12,seat+.10],[-.18,w*.40,seat-.09,seat+.04]]);
  bulb(g,'paint',c,0,r+.21,front,w*.18,.055,offroad?.29:.20);
 }
 bulb(g,'trim','#272e32',0,seat,-.32,w*.27,.057,l*.18,false);
 const barY=scooter?1.12:classic?1.09:offroad?1.21:sport?1.00:1.13,barZ=front-.16;
 rod(g,'alloy',metal,[-w*.39,barY,barZ],[w*.39,barY,barZ],.022);
 for(const side of [-1,1]){box(g,'trim',rubber,side*w*.40,barY,barZ,.13,.038,.048,false);rod(g,'alloy',metal,[side*w*.34,barY,barZ],[side*w*.37,barY+.13,barZ-.05],.012);bulb(g,'glass',glass,side*w*.37,barY+.14,barZ-.06,.062,.035,.024,false);}
 if(sport){
  loft(g,base+'/fairing','paint',c,[[.14,w*.65,.39,.87],[front-.15,w*.69,.48,1.06],[front+.18,w*.40,.65,.93]]);
  panel(g,'glass',glass,[[-w*.19,1.0,front+.16],[w*.19,1.0,front+.16],[w*.17,1.23,front-.09],[-w*.17,1.23,front-.09]],false);
  for(const side of [-1,1])box(g,'glass','#f0efda',side*.105,.92,front+.17,.14,.033,.025,false);
 }else if(!scooter){
  const lamp=mesh(g,cylinder,'alloy',metal,0,offroad?1.00:.99,front-.015,.12,.14,.12,false);lamp.rotation.x=Math.PI/2;
  const light=mesh(g,cylinder,'glass','#efe8d0',0,offroad?1.00:.99,front+.063,.096,.012,.096,false);light.rotation.x=Math.PI/2;
  if(offroad)loft(g,base+'/mask','paint',c,[[front-.09,w*.30,.84,1.23],[front+.025,w*.36,.83,1.18]]);
 }
 if(tour){for(const side of [-1,1])loft(g,base+'/bag/'+side,'paint',c,[[rear-.04,.29,.54,.92],[rear+.51,.32,.54,.96]]).position.x=side*w*.32;box(g,'trim','#3c484f',0,1.08,rear+.03,w*.62,.16,.36,false);panel(g,'glass',glass,[[-.27,1.08,front+.03],[.27,1.08,front+.03],[.22,1.48,front-.12],[-.22,1.48,front-.12]],false);}
 if(classic){for(const side of [-1,1])bulb(g,'alloy',metal,side*.16,.58,.08,.105,.15,.21,false);bulb(g,'paint',c,0,.64,rear,w*.31,.12,.30);}
 rod(g,'trim','#364248',[0,seat-.09,rear+.02],[0,seat-.19,-l*.46],.019);rod(g,'trim','#364248',[0,seat-.19,-l*.46],[0,seat-.27,-l*.465],.018);
 box(g,'glass','#b83f37',0,seat-.13,-l*.46,.15,.04,.025,false);plate(g,-l*.465,seat-.23);
 if(s.clubReward)for(const side of [-1,1])box(g,'alloy','#eadfbc',side*w*.25,seat-.035,.11,.012,.024,l*.25,false);
 g.userData.riderSeat={y:seat,z:-.28};g.userData.wheelCount=2;
}
function cab(g,id,s,c,front,cabLength,finish){
 const w=s.width,top=s.height*.87,base=.62,nose=front+cabLength/2;
 const sections=[[front-cabLength*.50,w*.83,base,top],[front+cabLength*.26,w*.88,base,top],[nose-.04,w*.76,base,top*.94]];loft(g,id+'/cab','paint',c,sections);
 panel(g,'glass',glass,[[-w*.32,top*.59,nose+.008],[w*.32,top*.59,nose+.008],[w*.27,top*.88,nose+.008],[-w*.27,top*.88,nose+.008]],false);
 box(g,'trim','#293337',0,top*.51,nose+.012,w*.53,.30,.032,false);
 for(let i=0;i<4;i++)box(g,'alloy','#6d7c83',0,top*.47+i*.055,nose+.035,w*.48,.018,.014,false);
 box(g,'trim','#48565b',0,.58,nose,w*.90,.16,.075,false);plate(g,nose+.045,.63);
 for(const side of [-1,1]){
  const x=side*w*.445;
  const window=[[top*.60,front-cabLength*.30],[top*.60,front+cabLength*.26],[top*.82,front+cabLength*.18],[top*.82,front-cabLength*.30]].map(([y,z])=>[side*loftSide(sections,z,y),y,z]);panel(g,'glass',glass,side>0?window.reverse():window,false);
  box(g,'alloy','#97a3a8',side*w*.44,top*.55,front-cabLength*.28,.012,.031,.14,false);
  box(g,'trim','#36424a',side*w*.47,top*.66,nose-.20,w*.055,.31,.14,false);
  box(g,'glass',glass,side*w*.495,top*.67,nose-.20,.012,.24,.10,false);
  box(g,'alloy',metal,side*w*.44,.70,front-.13,.09,.038,.64,false);
  box(g,'glass','#e7e8d6',side*w*.29,.91,nose+.018,w*.16,.12,.025,false);
  box(g,'glass','#c68a40',side*w*.35,1.08,nose+.02,w*.09,.034,.018,false);
 }return {top,nose};
}
function bed(g,id,w,lo,hi,rear,front,c,closed=false){
 const mid=(rear+front)/2,len=front-rear;
 box(g,'trim','#566266',0,lo,mid,w*.88,.09,len,false);
 if(closed){loft(g,id+'/cargo','paint',c,[[rear,w*.94,lo,hi],[rear+.10,w*.98,lo,hi],[front-.1,w*.98,lo,hi],[front,w*.93,lo,hi]]);for(const side of [-1,1])box(g,'alloy','#c7ccbf',side*w*.493,lo+.12,mid,.012,.046,len*.96,false);box(g,'trim','#536065',0,(lo+hi)/2,rear-.008,.016,hi-lo-.09,.02,false);for(const x of [-w*.16,w*.16])box(g,'alloy',metal,x,(lo+hi)/2,rear-.015,.026,hi-lo-.15,.026,false);}
 else{for(const side of [-1,1]){box(g,'paint',c,side*w*.46,(lo+hi)/2,mid,.075,hi-lo,len);for(let i=0;i<5;i++)box(g,'alloy','#7c8784',side*w*.478,lo+.14,mid-len*.40+i*len*.20,.019,.25,.040,false);}box(g,'paint',c,0,(lo+hi)/2,rear,w*.95,hi-lo,.08);}
}
function commercial(g,id,s,c,finish){
 const l=s.length,w=s.width,front=l*.5-1.25,heavy=['tir','autotreno'].includes(id),r=.43,closed=['truck','tir','autotreno','portavalori','fresco-xl'].includes(id);
 const cabLength=Math.min(2.40,l*.33),info=cab(g,id,s,c,front,cabLength,finish),cargoFront=front-cabLength*.54,rear=-l*.48;
 box(g,'trim','#37434a',0,.55,id==='camionrampa'?l*.23:0,w*.69,.18,id==='camionrampa'?l*.38:l*.92,false);
 const axles=heavy?[s.wheelbase/2,-s.wheelbase/2+.70,-s.wheelbase/2-.35,...(id==='autotreno'?[-l*.13,-l*.13-.82]:[])]:[s.wheelbase/2,-s.wheelbase/2,...(['truck','cisterna','betoniera','cantiere'].includes(id)?[-s.wheelbase/2+.86]:[])];
 for(const z of axles)for(const side of [-1,1]){wheel(g,side*w*.425,z,r,.30,finish.wheels);box(g,'trim','#303b42',side*w*.422,r+.42,z,w*.15,.11,.95,false);}
 box(g,'alloy',metal,-w*.32,.75,-.08,.42,.38,.80,false);
 if(id==='cisterna'){
  const span=cargoFront-rear,shape=new THREE.CylinderGeometry(w*.405,w*.405,span*.90,16),tank=mesh(g,shape,'alloy','#b6bfc1',0,1.85,(rear+cargoFront)/2);tank.rotation.x=Math.PI/2;shape.userData.coachTransient=true;
  for(const z of [rear+span*.20,rear+span*.77]){const strap=mesh(g,new THREE.TorusGeometry(w*.412,.025,4,16),'alloy','#75848a',0,1.85,z);strap.geometry.userData.coachTransient=true;box(g,'alloy','#8d9da3',0,2.94,z,.28,.12,.30,false);}
  for(const side of [-1,1])box(g,'trim','#c0793d',side*w*.419,1.85,(rear+cargoFront)/2,.019,.09,span*.8,false);
  for(let i=0;i<6;i++)rod(g,'alloy',metal,[w*.43,.9+i*.31,rear+.32],[w*.43,1+i*.31,rear+.32],.016);
 }else if(id==='betoniera'){
  const drumGeo=new THREE.LatheGeometry([new THREE.Vector2(.32,-1.7),new THREE.Vector2(.64,-1.32),new THREE.Vector2(1.02,-.65),new THREE.Vector2(1.02,.54),new THREE.Vector2(.71,1.13),new THREE.Vector2(.32,1.62)],16),drum=mesh(g,drumGeo,'paint','#d6d1b8',0,2.05,-.83,1,1,1,false);drum.rotation.x=Math.PI/2-.23;drumGeo.userData.coachTransient=true;
  for(const z of [-1.65,.02])box(g,'alloy','#74858a',0,1.0,z,w*.64,.30,.19,false);
  rod(g,'alloy','#a2aca7',[0,1.1,rear+.1],[0,1.65,rear+.88],.20);
 }else if(id==='camionrampa'){
  // These four vertices match the established drivable ramp surface exactly.
  panel(g,'alloy','#637b89',[[-1.12,.12,-3.6],[-1.12,3.05,1.6],[1.12,3.05,1.6],[1.12,.12,-3.6]],false);
  for(const side of [-1,1])rod(g,'trim','#d6b956',[side*.91,.16,-3.6],[side*.91,3.09,1.6],.025);
 }else if(id==='soccorso'){
  bed(g,id,w,.85,1.01,rear,cargoFront,'#707f86');
  rod(g,'paint',c,[0,1.05,rear+.85],[0,2.3,rear+1.15],.13);
  rod(g,'alloy','#969f99',[0,2.3,rear+1.15],[0,2.07,rear+.12],.09);
  rod(g,'trim','#39464c',[0,2.03,rear+.15],[0,1.27,rear+.15],.012);
  const hook=mesh(g,new THREE.TorusGeometry(.10,.026,4,10,Math.PI*1.55),'alloy',metal,0,1.2,rear+.15);hook.geometry.userData.coachTransient=true;
  box(g,'glass','#d49c40',0,info.top+.03,front,.63,.10,.22,false);
 }else if(heavy){
  const count=id==='autotreno'?2:1,span=(cargoFront-rear)/count;
  for(let i=0;i<count;i++){const a=rear+i*span+.13,b=rear+(i+1)*span-.13;bed(g,id+'/'+i,w,1.05,s.height*.98,a,b,i?'#adb9b3':'#d0d1c4',true);for(const side of [-1,1])for(let j=0;j<7;j++)box(g,'alloy','#a2aca6',side*w*.493,2.2,a+(b-a)*(j+.5)/7,.015,1.75,.03,false);}
 }else if(closed){bed(g,id,w,.85,s.height*.98,rear,cargoFront,id==='portavalori'?'#718784':'#d6d8c9',true);if(id==='portavalori'){for(const side of [-1,1]){box(g,'trim','#293c43',side*w*.495,1.86,-.75,.024,.05,l*.39,false);box(g,'alloy','#91a9a6',side*w*.493,2.2,-.1,.017,.18,.18,false);}}if(id==='fresco-xl'){box(g,'trim','#dae3da',0,s.height-.16,cargoFront+.08,w*.55,.52,.22,false);for(let i=0;i<5;i++)box(g,'alloy','#76898b',0,s.height-.16+i*.06-.12,cargoFront+.2,w*.4,.018,.02,false);}}
 else bed(g,id,w,.95,id==='cantiere'?2.10:1.35,rear,cargoFront,c);
 for(const side of [-1,1])box(g,'glass','#b44138',side*w*.35,.72,-l*.49,w*.14,.08,.035,false);plate(g,-l*.494,.66);
 g.userData.wheelCount=axles.length*2;
}
function ape(g,s,c,finish){
 const l=s.length,w=s.width;
 const sections=[[.12,w*.79,.35,s.height*.94],[.80,w*.75,.36,s.height*.94],[l*.46,w*.50,.50,1.47]];loft(g,'ape/cab','paint',c,sections);
 panel(g,'glass',glass,[[-w*.24,1.12,l*.462],[w*.24,1.12,l*.462],[w*.21,1.72,1.025],[-w*.21,1.72,1.025]],false);
 for(const side of [-1,1]){const x=side*w*.389,window=[[1.17,.20],[1.17,.77],[1.60,.73],[1.62,.20]].map(([y,z])=>[side*loftSide(sections,z,y),y,z]);panel(g,'glass',glass,side>0?window.reverse():window,false);box(g,'alloy',metal,x,1.04,.29,.014,.025,.11,false);rod(g,'alloy',metal,[side*loftSide(sections,.79,1.32),1.32,.79],[side*w*.455,1.32,.79],.016);box(g,'trim','#354447',side*w*.455,1.32,.79,.10,.10,.14,false);}
 bed(g,'ape',w,.53,.95,-l*.46,.07,c);wheel(g,0,s.wheelbase/2,.28,.17,finish.wheels);for(const side of [-1,1])wheel(g,side*w*.385,-s.wheelbase/2,.28,.18,finish.wheels);
 box(g,'trim','#354347',0,.45,l*.45,w*.61,.09,.12,false);lights(g,w,l,.73,true);g.userData.wheelCount=3;
}
export function createPoliceCoachwork(s){
 const g=createCoachwork('legacy-sedan',{...s,family:'sedan'},'#25475c',{wheels:'graphite'}),w=s.width,l=s.length;
 // The white band is clipped onto the actual side triangles, including curved doors.
 const shell=g.children.filter(o=>o.isMesh&&o.userData.coachPaint);for(const o of shell){const geo=o.geometry,p=geo.attributes.position,n=geo.attributes.normal,ix=geo.index?.array;for(let j=0;j<(ix?.length||p.count);j+=3){const ids=[0,1,2].map(k=>ix?ix[j+k]:j+k),normal=new THREE.Vector3();for(const i of ids)normal.add(new THREE.Vector3().fromBufferAttribute(n,i));normal.normalize();if(Math.abs(normal.x)<.45)continue;let vertices=ids.map(i=>[p.getX(i),p.getY(i),p.getZ(i)]);for(const [axis,bound,greater] of [[1,.615,true],[1,.795,false],[2,-l*.295,true],[2,l*.295,false]]){const clipped=[];for(let k=0;k<vertices.length;k++){const a=vertices[k],b=vertices[(k+1)%vertices.length],inside=v=>greater?v[axis]>=bound:v[axis]<=bound,ia=inside(a),ib=inside(b);if(ia)clipped.push(a);if(ia!==ib){const t=(bound-a[axis])/(b[axis]-a[axis]);clipped.push(a.map((v,i)=>v+(b[i]-v)*t));}}vertices=clipped;}if(vertices.length>=3)panel(g,'trim','#d6dfd6',vertices.map(v=>v.map((c,i)=>c+normal.getComponent(i)*.004)),false);}}
 label(g,'POLIZIA',w*.478,.71,0,.022,'#24465b');
 box(g,'trim','#35494d',0,s.height+.016,-.15,w*.58,.04,.25,false);
 for(const side of [-1,1])box(g,'glass','#5095c0',side*w*.22,s.height+.075,-.15,w*.20,.09,.18,false);
 g.userData.modelRevision=36;g.userData.vehicleType='police';return g;
}
export function createEmergencyCoachwork(s,kind){
 const fire=kind==='fire',color=fire?'#aa4237':'#e1e4dc',stripe=fire?'#d9c65e':'#b83e3b';
 const g=fire?createRoadFleet('truck',s,color):compactCoachwork(createCoachwork('officina',{...s,family:'van'},color));
 for(const side of [-1,1]){
  box(g,'trim',stripe,side*s.width*(fire?.498:.473),s.height*.44,-s.length*.08,.014,.10,s.length*.70,false);
  if(fire){box(g,'alloy','#a4b0b0',side*s.width*.495,s.height*.55,-s.length*.17,.018,s.height*.43,s.length*.39,false);for(let i=0;i<7;i++)box(g,'trim','#63757a',side*s.width*.502,s.height*.34+i*.15,-s.length*.17,.010,.012,s.length*.38,false);}
  else{box(g,'trim',stripe,side*s.width*.474,s.height*.60,-s.length*.18,.016,.28,.075,false);box(g,'trim',stripe,side*s.width*.475,s.height*.60,-s.length*.18,.017,.075,.28,false);}
 }
 compactCoachwork(g);const flashers=[];
 for(const side of [-1,1]){const light=box(g,'glass','#439be2',side*.26,s.height+.075,s.length*.17,.23,.10,.18,false);flashers.push(light);}
 g.userData.modelRevision=36;g.userData.emergencyFlashers=flashers;return g;
}
export function createTransitCoachwork(){
 const g=new THREE.Group(),w=2.35,l=8.5,h=2.63;
 loft(g,'tram/body','paint','#7396a8',[[-l*.49,w*.83,.18,h*.93],[-l*.43,w,.12,h],[l*.43,w,.12,h],[l*.49,w*.83,.18,h*.93]]);
 for(const side of [-1,1]){
  for(let i=0;i<7;i++){const z=-l*.36+i*l*.12;box(g,'glass',glass,side*w*.498,1.79,z,.016,.76,l*.095,false);box(g,'alloy','#bdcbc8',side*w*.5,1.26,z+l*.052,.018,1.62,.028,false);}
  for(const z of [-l*.23,l*.23]){box(g,'trim','#31484f',side*w*.501,1.20,z,.017,1.96,.056,false);box(g,'alloy','#aebbb8',side*w*.502,.30,z,.019,.12,.68,false);}
 }
 for(const direction of [-1,1]){box(g,'glass',glass,0,1.81,direction*l*.488,w*.73,.91,.022,false);box(g,'trim','#303f48',0,2.38,direction*l*.489,1.04,.17,.025,false);for(const side of [-1,1])bulb(g,'glass',direction>0?'#f1ecd5':'#b84740',side*.64,.72,direction*l*.491,.14,.052,.03,false);}
 for(const side of [-1,1])for(const z of [-l*.27,l*.27])wheel(g,side*.96,z,.25,.14,'graphite');
 box(g,'trim','#485f6d',0,h+.015,-.45,1.25,.06,1.0,false);box(g,'alloy','#a8b7b7',0,.17,0,1.79,.13,7.97,false);
 g.userData={vehicleType:'tram',modelRevision:36,wheelCount:4};return compactCoachwork(g);
}
function tank(g,s,c){
 loft(g,'tank/hull','paint',c,[[-2.8,2.75,.65,1.53],[-2.40,2.87,.52,1.65],[1.9,2.75,.57,1.62],[2.8,2.30,.77,1.16]]);
 for(const side of [-1,1]){
  box(g,'trim','#303b32',side*1.34,.62,0,.47,.85,5.45,false);
  for(let i=0;i<6;i++){const z=-2.12+i*.84,o=mesh(g,cylinder,'alloy','#596b4d',side*1.34,.66,z,.35,.39,.35,false);o.rotation.z=Math.PI/2;}
  for(let i=0;i<24;i++)for(const y of [.22,1.035])box(g,'alloy','#56624d',side*1.34,y,-2.6+i*.225,.52,.06,.085,false);
  box(g,'paint',c,side*1.40,1.19,0,.42,.10,5.65);
 }
 const turret=new THREE.Group();loft(turret,'tank/turret','paint',c,[[-1.1,1.66,.06,.65],[-.70,2.02,0,.83],[.53,1.91,.04,.67],[1.08,1.28,.12,.48]]);turret.position.y=1.75;
 rod(turret,'alloy','#52644c',[0,.33,.72],[0,.33,3.88],.11);box(turret,'trim','#303d30',0,.33,3.95,.30,.23,.24,false);
 const hatch=mesh(turret,cylinder,'alloy','#758462',0,.82,-.38,.32,.09,.32,false);box(turret,'glass',glass,0,.75,.4,.33,.06,.12,false);turret.name='turret';compactCoachwork(turret);g.add(turret);g.userData.turret=turret;g.userData.wheelCount=12;
}
export function createRoadFleet(id,s,paint=null,requested=null){
 if(!s)throw Error('Missing road fleet specification '+id);
 const finish=typeof requested==='string'?{wheels:requested}:requested||{wheels:'standard'},color=s.clubColor||paint||({supersport:'#ab3546',enduro:'#bd763f',trail:'#aaa063',naked:'#5d8e7e',touring:'#436d89',cruiser:'#343e49',scooter:'#a2b6a6',truck:'#728b98',cisterna:'#738b91',cantiere:'#b58d47',betoniera:'#b58b45',soccorso:'#ba8741',camionrampa:'#738890',portavalori:'#617e79',ape:'#597c6d',tank:'#6c7b56'})[id]||'#597583';
 if(id==='taxi'){const g=createCoachwork('legacy-sedan',{...s,family:'sedan'},paint||'#c5b576',finish);box(g,'trim','#e4d177',0,s.height+.015,-.15,.56,.12,.26,false);label(g,'TAXI',.275,s.height+.019,-.15,.017,'#293b44');g.userData.modelRevision=36;g.userData.vehicleType=id;return compactCoachwork(g);}
 const g=new THREE.Group();g.userData={vehicleType:id,modelRevision:36,roadFinish:finish};
 if(s.bike||['motorcycle','scooter'].includes(id))bike(g,id,s,color,finish);
 else if(id==='ape')ape(g,s,color,finish);
 else if(id==='tank')tank(g,s,color);
 else commercial(g,id,s,color,finish);
 // The turret stays independently movable; all other surfaces fit four draws.
 const moving=g.userData.turret;if(moving)g.remove(moving);compactCoachwork(g);if(moving)g.add(moving);
 return g;
}
