import * as THREE from './vendor/three.module.js';

const cube=new THREE.BoxGeometry(),sphere=new THREE.SphereGeometry(1,12,8),cylinder=new THREE.CylinderGeometry(1,1,1,10);
const skins={
 electric:['#dfe9e4','#387d87'],gondola:['#111c23','#aa7844'],fishing:['#785244','#d7c58b'],taxi:['#936347','#eee4cf'],
 rib:['#eef0e5','#343f4a'],patrol:['#eef0e4','#315b8a'],sport:['#e6ece7','#378f96'],jetski:['#e7eddf','#dc7947'],
 vaporetto:['#e5e9da','#417567'],yacht:['#edf0e7','#38596c'],offshore:['#e9ebe4','#d95843'],catamaran:['#e7eae5','#477cb2'],racingjet:['#d9ecdf','#29adba']
};
// Loft a V-bottom around real cross sections, with a full stern and a pointed
// bow. The waterline, deck and keel share one continuous silhouette.
function loft(w,l,draft,deck=.42){
 const sections=[[-.5,.66],[-.43,.88],[-.28,.98],[-.08,1],[.12,.97],[.28,.82],[.40,.55],[.48,.19],[.5,.035]],p=[],index=[];
 for(const [z,f] of sections){const rise=Math.max(0,z-.1)*.45,half=w*f/2;
  for(const [u,y] of [[-1,deck+rise],[-1.02,.12+rise*.3],[-.86,-draft*.4],[-.3,-draft],[.3,-draft],[.86,-draft*.4],[1.02,.12+rise*.3],[1,deck+rise]])p.push(half*u,y,z*l);
 }
 for(let n=0;n<sections.length-1;n++)for(let j=0;j<8;j++){const a=n*8+j,b=n*8+(j+1)%8,c=(n+1)*8+(j+1)%8,d=(n+1)*8+j;index.push(a,b,c,a,c,d);}
 for(const n of [0,sections.length-1])for(let j=1;j<7;j++)index.push(n*8,n*8+j,n*8+j+1);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(index);g.computeVertexNormals();return g;
}
class BoatBuilder{
 constructor(){this.parts={solid:[],glass:[],metal:[]};}
 add(geo,x,y,z,w,h,l,color,bucket='solid',pitch=0,yaw=0,roll=0,paint=false){const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,roll,'YXZ')),matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),q,new THREE.Vector3(w,h,l));this.parts[bucket].push({geo,matrix,color,paint});}
 box(color,x,y,z,w,h,l,paint=false,pitch=0){this.add(cube,x,y,z,w,h,l,color,'solid',pitch,0,0,paint);}
 rail(a,b,r=.028,color='#b7c3bd'){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize()),matrix=new THREE.Matrix4().compose(start.add(end).multiplyScalar(.5),q,new THREE.Vector3(r,direction.length(),r));this.parts.metal.push({geo:cylinder,matrix,color,paint:false});}
 seat(x,z,w=.55,y=.65,color='#e8dfc7'){this.add(sphere,x,y,z,w/2,.10,.32,color);this.add(sphere,x,y+.25,z-.24,w/2,.32,.095,color);this.box('#495964',x,y-.16,z,.13,.25,.16);}
 mesh(root,bucket){const p=[],normals=[],colors=[],mask=[],v=new THREE.Vector3(),n=new THREE.Vector3();
  for(const {geo,matrix,color,paint} of this.parts[bucket]){const nm=new THREE.Matrix3().getNormalMatrix(matrix),c=new THREE.Color(color),indices=geo.index?.array;for(let j=0;j<(indices?.length||geo.attributes.position.count);j++){const i=indices?indices[j]:j;v.fromBufferAttribute(geo.attributes.position,i).applyMatrix4(matrix);n.fromBufferAttribute(geo.attributes.normal,i).applyMatrix3(nm).normalize();p.push(v.x,v.y,v.z);normals.push(n.x,n.y,n.z);colors.push(c.r,c.g,c.b);mask.push(paint?1:0);}}
  if(!p.length)return;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('boatPaint',new THREE.Float32BufferAttribute(mask,1));
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:bucket==='metal'?.28:bucket==='glass'?.18:.45,metalness:bucket==='metal'?.72:.12,transparent:bucket==='glass',opacity:bucket==='glass'?.68:1,side:THREE.DoubleSide});const mesh=new THREE.Mesh(geometry,material);mesh.name='boat-'+bucket;mesh.castShadow=bucket!=='glass';mesh.receiveShadow=true;root.add(mesh);
 }
}
export function buildBoatModel(id,s,color=null){
 const root=new THREE.Group(),b=new BoatBuilder(),[base,accent]=skins[s.kind]||skins.sport,hull=color||base,w=s.width,l=s.length,jet=/jetski|racingjet/.test(s.kind),cat=s.kind==='catamaran',gondola=s.kind==='gondola',big=/vaporetto|yacht/.test(s.kind),deck=jet?.22:gondola?.25:big?.7:.43;
 const h=loft(cat?w*.29:w*.96,l,s.draft*.88,deck);if(cat)for(const side of [-1,1])b.add(h,side*w*.33,0,0,1,1,1,hull,'solid',0,0,0,true);else b.add(h,0,0,0,1,1,1,hull,'solid',0,0,0,true);
 // The teak is inset, leaving the shaped gunwale visible; individual planks
 // stay separate in the batched geometry, without multiplying draw calls.
 if(!jet){const deckW=cat?w*.64:w*.72,deckL=gondola?l*.66:l*.62;b.box('#9c8058',0,deck+.025,-l*.07,deckW,.045,deckL);for(let z=-deckL/2-l*.07;z<deckL/2-l*.07;z+=.36)b.box('#c1a476',0,deck+.052,z,deckW,.012,.018);}
 for(const side of [-1,1]){
  // A contrasting sheer line follows the taper instead of extending a box
  // beyond the bow. Stainless rails remain inside the actual beam.
  const profile=[[-.43,.88],[-.22,1],[.10,.97],[.30,.8],[.45,.37]],y=deck+.10;
  if(!jet&&!gondola)for(let i=1;i<profile.length;i++){const a=profile[i-1],q=profile[i];b.rail([side*w*.47*a[1],y,a[0]*l],[side*w*.47*q[1],y+Math.max(0,q[0]-.1)*.45,q[0]*l],.025,accent);}
  if(big)for(let z=-l*.35;z<l*.35;z+=l*.10){b.rail([side*w*.44,deck+.1,z],[side*w*.44,deck+.55,z],.025);if(z+l*.10<l*.35)b.rail([side*w*.44,deck+.55,z],[side*w*.44,deck+.55,z+l*.10],.025);}
 }
 const windscreen=(x,y,z,ww,hh,zz=.08,pitch=-.3)=>{b.add(cube,x,y,z,ww,hh,zz,'#486f80','glass',pitch);};
 const motor=(x,z,size=1)=>{b.add(sphere,x,.26,z,.22*size,.38*size,.22*size,'#343d45');b.box('#b7c8c8',x,.45,z+.12,.29*size,.16,.025);b.box('#25353e',x,-.26,z,.1,.45,.15);};
 if(gondola){
  for(const z of [-l*.21,-l*.05,l*.17])b.box('#35272a',0,.4,z,w*.69,.12,.47);b.box('#814839',0,.57,-l*.15,w*.59,.30,.67);b.box('#181f29',0,.9,-l*.18,w*.6,.43,.1);
  b.rail([0,.35,l*.42],[0,.76,l*.5],.045,'#c8c4b2');for(let j=0;j<5;j++)b.rail([0,.57+j*.06,l*.48],[0,.57+j*.06,l*.48+.21],.028,'#c8c4b2');b.rail([w*.15,.54,-l*.12],[w*.48,.09,-l*.43],.035,'#987550');
 }else if(jet){
  b.add(sphere,0,.32,l*.16,w*.39,.27,l*.27,hull,'solid',0,0,0,true);b.add(sphere,0,.46,-l*.17,w*.28,.17,l*.27,accent);b.add(sphere,0,.6,-l*.22,w*.21,.09,l*.22,'#293740');windscreen(0,.67,l*.22,w*.45,.22,.075,-.45);b.rail([0,.56,l*.11],[0,.86,l*.08],.043,'#384750');b.rail([-w*.32,.87,l*.08],[w*.32,.87,l*.08],.037,'#343d45');b.box(accent,0,.35,-l*.43,w*.70,.08,.24);
 }else if(s.kind==='rib'){
  for(const side of [-1,1]){const path=[[-.40,.84],[-.2,.95],[.05,.97],[.26,.82],[.42,.35]];for(let i=1;i<path.length;i++){const a=path[i-1],q=path[i];b.rail([side*w*.42*a[1],.31,a[0]*l],[side*w*.42*q[1],.31,q[0]*l],w*.072,'#3c4952');}}
  b.box(hull,0,.73,l*.03,w*.28,.62,.73,true);windscreen(0,1.17,l*.09,w*.31,.49,.07,-.2);for(const side of [-1,1])b.seat(side*w*.19,-l*.10,.57,.64);b.box('#dadcc9',0,.61,-l*.33,w*.67,.22,.77);motor(-.28,-l*.45);motor(.28,-l*.45);
 }else if(s.kind==='sport'||s.kind==='offshore'||cat){
  b.box(hull,0,.56,l*.17,w*.58,.24,l*.32,true);windscreen(0,.86,l*.02,w*.72,.42,.09,-.55);for(const side of [-1,1]){windscreen(side*w*.35,.83,-l*.02,.075,.36,l*.15,0);b.seat(side*w*.19,-l*.14,.58,.65,'#dce3dc');}b.box(accent,0,.46,-l*.37,w*.66,.15,l*.15);b.box('#b89866',0,.3,-l*.47,w*.71,.10,.4);if(cat||s.kind==='offshore')for(const side of [-1,1])motor(side*w*.21,-l*.44,1.1);else motor(0,-l*.45);
 }else if(s.kind==='electric'){
  for(const side of [-1,1])for(const z of [-l*.24,-l*.03,l*.18])b.seat(side*w*.23,z,.60,.57,'#c7d5cd');for(const side of [-1,1])for(const z of [-l*.28,l*.24])b.rail([side*w*.37,.45,z],[side*w*.37,1.24,z],.025);b.box(accent,0,1.29,-l*.03,w*.84,.06,l*.62);b.box('#315865',0,1.325,-l*.03,w*.62,.015,l*.43);
 }else if(s.kind==='vaporetto'){
  const cw=w*.79,cl=l*.65;b.box(hull,0,1.46,-l*.04,cw,1.44,cl,true);b.box(accent,0,.76,-l*.04,cw+.02,.18,cl+.04);b.box(hull,0,2.25,-l*.04,cw*1.08,.14,cl*1.04,true);
  for(const side of [-1,1])for(let z=-cl*.45;z<=cl*.4;z+=1.35)windscreen(side*cw*.503,1.63,z,.035,.62,1.05,0);windscreen(0,1.72,l*.29,cw*.78,.73,.06,0);b.box(hull,0,2.65,l*.20,cw*.48,.64,l*.17,true);windscreen(0,2.7,l*.285,cw*.39,.38,.06,0);for(const side of [-1,1])for(const z of [-l*.41,l*.42])b.box('#475c5e',side*w*.23,.62,z,.59,.10,.75);
 }else if(s.kind==='yacht'){
  b.add(sphere,0,1.4,l*.0,w*.39,.75,l*.32,hull,'solid',0,0,0,true);windscreen(0,1.64,l*.29,w*.64,.91,.12,-.5);for(const side of [-1,1])windscreen(side*w*.37,1.67,0,.05,.7,l*.39,0);b.box(hull,0,2.25,-l*.03,w*.69,.18,l*.43,true);b.box(hull,0,2.74,-l*.05,w*.48,.61,l*.22,true);windscreen(0,2.81,l*.06,w*.45,.37,.06,-.4);b.box('#c9c1ac',0,1.08,-l*.37,w*.61,.3,l*.13);b.box('#b99a6e',0,.65,-l*.48,w*.77,.12,.51);b.rail([0,3,-l*.13],[0,3.5,-l*.13],.033);b.box('#ebefe2',0,3.44,-l*.13,.35,.11,.32);
 }else{
  const taxi=s.kind==='taxi',cw=w*.70,cl=l*(taxi?.39:.32),cy=taxi?.91:1.24,ch=taxi?.75:1.22;b.box(taxi?'#956c4e':hull,0,cy,-l*.09,cw,ch,cl,!taxi);windscreen(0,cy+.08,-l*.09+cl*.49,cw*.83,ch*.58,.075,-.22);for(const side of [-1,1])for(let z=-cl*.35;z<cl*.36;z+=.78)windscreen(side*cw*.505,cy+.10,-l*.09+z,.04,ch*.47,.55,0);b.box(taxi?'#ece3ce':accent,0,cy+ch*.52,-l*.09,cw*1.07,.10,cl*1.07,!taxi);
  if(s.kind==='fishing'){b.box('#685744',0,.72,-l*.33,w*.59,.33,l*.20);b.rail([0,1.9,-l*.08],[0,2.24,-l*.08],.05,'#aa8660');}if(s.kind==='patrol'){b.box('#376c96',0,2.02,-l*.08,.42,.12,.42);b.box('#df7953',0,2.13,-l*.08,.12,.12,.12);}if(taxi)for(const side of [-1,1])b.seat(side*w*.20,l*.15,.66,.67);else motor(0,-l*.45,1.1);
 }
 for(const side of [-1,1]){b.box(side===1?'#df5547':'#59c39c',side*w*.38,deck+.17,l*.19,.06,.07,.15);b.box('#ccd1c2',side*w*.32,deck+.08,-l*.36,.12,.07,.13);}
 for(const bucket of ['solid','metal','glass'])b.mesh(root,bucket);h.dispose();root.name=s.name;root.userData={watercraft:true,airDraft:s.airDraft,vehicleType:id,hullForm:cat?'twin-v':'lofted-v',modelRevision:33};return root;
}
