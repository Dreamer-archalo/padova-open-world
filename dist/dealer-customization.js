import * as THREE from './vendor/three.module.js';
import {coachMaterial,compactCoachwork,coachSurface} from './car-coachwork.js';

// A single catalogue drives compatibility, prices, saved builds and the UI.
export const DEALER_OPTIONS={
 wheels:{label:'Cerchi',values:[['standard','Argento',0],['graphite','Grafite',180],['black','Nero',230],['bronze','Bronzo',340],['white','Bianco',390],['gold','Oro',590]]},
 livery:{label:'Livrea',values:[['plain','Di serie',0],['coach-stripe','Filetto laterale',180],['two-tone','Bicolore',420],['twin-stripe','Doppia striscia',360]]},
 roof:{label:'Tetto',values:[['standard','Colore carrozzeria',0],['black','Nero',240],['ivory','Avorio',240]]},
 bodykit:{label:'Carrozzeria',values:[['standard','Di serie',0],['touring','Modanature Touring',390],['sport','Splitter e spoiler Sport',790]]},
 exhaust:{label:'Scarico',values:[['standard','Di serie',0],['chrome','Terminale cromato',190],['dual','Doppio terminale',360]]},
 interior:{label:'Selleria',values:[['standard','Di serie',0],['premium','Cuoio e cuciture',490]]},
 suspension:{label:'Assetto',values:[['standard','Di serie',0],['sport','Sport · risposta sterzo +5%',460],['raised','Rialzato · +5 cm',380]]},
 brakes:{label:'Freni',values:[['standard','Di serie',0],['sport','Sport · frenata +12%',390],['race','Performance · frenata +25%',890]]},
 response:{label:'Ripresa',values:[['standard','Di serie',0],['street','Street · accelerazione +10%',450],['sport','Sport · accelerazione +20%',980]]},
 cargo:{label:'Attrezzatura',values:[['standard','Di serie',0],['rails','Barre e scaletta',330],['toolbox','Cassette porta attrezzi',290]]}
};
export function dealerCapabilities(spec){
 const bike=!!spec.bike||spec.width<1.15,work=['work','freight','van'].includes(spec.family)||['truck','ape','portavalori'].includes(spec.vehicleType),open=spec.family==='convertible'||['barchetta','mono'].includes(spec.shape);
 const keys=['wheels','livery',...(!bike&&!work&&!open?['roof']:[]),...(!bike&&!work?['bodykit']:[]),...(!work?['exhaust']:[]),'interior',...(!bike?['suspension']:[]),'brakes','response',...(work?['cargo']:[])];
 return Object.fromEntries(keys.map(key=>{let values=DEALER_OPTIONS[key].values;if(key==='livery'&&(bike||work))values=values.filter(v=>['plain','coach-stripe'].includes(v[0]));if(key==='cargo'&&['cisterna','betoniera','soccorso'].includes(spec.vehicleType))values=values.filter(v=>v[0]!=='rails');if(key==='suspension'&&!['suv','pickup','work','freight','van'].includes(spec.family)&&!['safari','sixwheel'].includes(spec.shape))values=values.filter(v=>v[0]!=='raised');return [key,{...DEALER_OPTIONS[key],values}];}));
}
export function normalizeDealerOptions(spec,options={}){
 const definitions=dealerCapabilities(spec),selected={},prices={};
 for(const [key,def] of Object.entries(definitions)){const row=def.values.find(v=>v[0]===options[key])||def.values[0];selected[key]=row[0];prices[key]=row[2];}
 return {selected,prices};
}
export function dealerBuildSpec(base,build){
 if(!build)return base;
 const response=build.response==='sport'?1.20:build.response==='street'?1.10:1,brakes=build.brakes==='race'?1.25:build.brakes==='sport'?1.12:1;
 return {...base,max:Number.isFinite(build.max)?build.max:base.max,boost:Math.max(base.boost,(Number.isFinite(build.max)?build.max:base.max)*1.1),accel:base.accel*response,brake:base.brake*brakes,steer:base.steer*(build.suspension==='sport'?1.05:1)};
}
const cube=new THREE.BoxGeometry(),cylinder=new THREE.CylinderGeometry(1,1,1,12),sphere=new THREE.SphereGeometry(1,10,6);
function add(g,geo,kind,color,x,y,z,w,h,l){const o=new THREE.Mesh(geo,coachMaterial(kind,color));o.position.set(x,y,z);o.scale.set(w,h,l);o.castShadow=o.receiveShadow=true;o.userData.coachPaint=false;g.add(o);return o;}
const box=(g,k,c,x,y,z,w,h,l)=>add(g,cube,k,c,x,y,z,w,h,l);
function surfaceDecoration(root,s,livery){
 if(!['coach-stripe','twin-stripe'].includes(livery))return;
 const out=[],bike=s.bike||s.width<1.15,clip=(poly,axis,bound,greater)=>{const result=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],inside=v=>greater?v[axis]>=bound:v[axis]<=bound,ia=inside(a),ib=inside(b);if(ia)result.push(a);if(ia!==ib){const t=(bound-a[axis])/(b[axis]-a[axis]);result.push(a.map((x,j)=>x+(b[j]-x)*t));}}return result;};
 root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,n=o.geometry.attributes.normal,mask=o.geometry.attributes.collectorPaint;if(!mask)return;
  for(let i=0;i<p.count;i+=3){if(![0,1,2].every(j=>mask.getX(i+j)))continue;
   const normal=new THREE.Vector3().fromBufferAttribute(n,i).add(new THREE.Vector3().fromBufferAttribute(n,i+1)).add(new THREE.Vector3().fromBufferAttribute(n,i+2)).normalize();
   if(livery==='twin-stripe'?normal.y<.45:Math.abs(normal.x)<.4)continue;
   const triangle=[0,1,2].map(j=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j)]);
   for(const side of livery==='twin-stripe'?[-1,1]:[1]){
    let poly=triangle;const boundaries=livery==='twin-stripe'?[[0,side>0?s.width*.07:-s.width*.115,true],[0,side>0?s.width*.115:-s.width*.07,false],[2,s.length*.23,true],[2,s.length*.46,false]]:[[1,bike?.78:s.height*.45,true],[1,(bike?.78:s.height*.45)+.026,false],[2,-s.length*(bike?.15:.33),true],[2,s.length*(bike?.15:.33),false]];
    for(const [axis,bound,greater] of boundaries)poly=clip(poly,axis,bound,greater);
    for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]])out.push(v[0]+normal.x*.004,v[1]+normal.y*.004,v[2]+normal.z*.004);
   }
  }
 });
 if(out.length){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(out,3));geo.computeVertexNormals();geo.userData.coachTransient=true;add(root,geo,'trim','#dfd6bf',0,0,0,1,1,1);}
}
export function applyDealerUpgrades(root,s,build={}){
 if(root.scale.x!==1||root.scale.y!==1||root.scale.z!==1){root.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.geometry.scale(root.scale.x,root.scale.y,root.scale.z);}});root.scale.set(1,1,1);}
 const selected=normalizeDealerOptions({...s,vehicleType:root.userData.vehicleType},build).selected,w=s.width,l=s.length,h=s.height,bike=!!s.bike||w<1.15,work=['work','freight','van'].includes(s.family),ape=root.userData.vehicleType==='ape';
 if(selected.bodykit==='touring')for(const side of [-1,1])box(root,'alloy','#c8c3ad',side*w*.46,.47,0,.02,.035,l*.72);
 if(selected.bodykit==='sport'){
  box(root,'trim','#303a41',0,.31,l*.467,w*.83,.048,.16);
  for(const side of [-1,1])box(root,'trim','#303a41',side*w*.43,.32,0,.045,.055,l*.69);
  const deck=coachSurface(root,[0,h+1,-l*.41],[0,-1,0])?.y||h*.48,wing=deck+.14;
  box(root,'trim','#303a41',0,wing,-l*.41,w*.82,.056,.19);
  for(const side of [-1,1]){const mount=coachSurface(root,[side*w*.30,h+1,-l*.41],[0,-1,0])?.y||deck;box(root,'alloy','#6e7e87',side*w*.30,(mount+wing)/2,-l*.41,.025,wing-mount,.035);}
 }
 if(selected.exhaust&&selected.exhaust!=='standard')for(const side of selected.exhaust==='dual'?[-1,1]:[1]){
  const o=add(root,cylinder,'alloy','#aeb9bd',side*w*(bike?.25:.30),bike?.41:.30,-l*.44,.057,.18,.057);o.rotation.x=Math.PI/2;
  const cap=add(root,cylinder,'trim','#273039',side*w*(bike?.25:.30),bike?.41:.30,-l*.476,.043,.012,.043);cap.rotation.x=Math.PI/2;
 }
 if(selected.interior==='premium'){
  // Open cars and motorcycles visibly show their upholstery. Closed cars keep
  // real seat geometry inside the cabin, with the same finish when viewed close.
  const seatZ=ape?.61:work?l*.5-1.50:-l*.07,seatLength=work?.45:l*.13;
  for(const side of bike?[0]:[-1,1]){box(root,'trim','#9b6746',side*w*.20,bike?(root.userData.riderSeat?.y||.88)+.028:h*.51,bike?-l*.07:seatZ,bike?w*.50:w*.21,.055,bike?l*.20:seatLength);if(!bike){const back=box(root,'trim','#9b6746',side*w*.20,h*.64,seatZ-seatLength*.5,w*.22,h*.24,.095);back.rotation.x=-.14;}box(root,'trim','#d8b994',side*w*.20,bike?(root.userData.riderSeat?.y||.88)+.062:h*.54,bike?-l*.07:seatZ,bike?w*.38:w*.16,.008,bike?l*.18:seatLength*.85);}
 }
 surfaceDecoration(root,s,selected.livery);
 if(selected.roof&&selected.roof!=='standard'||selected.livery==='two-tone'){
  const color=new THREE.Color(selected.roof==='black'?'#2b343b':'#dcd5c1');
  root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,mask=o.geometry.attributes.collectorPaint;if(!mask?.array.some(v=>v))return;o.geometry=o.geometry.clone();const c=o.geometry.attributes.color,m=o.geometry.attributes.collectorPaint;for(let i=0;i<p.count;i++)if(mask.getX(i)&&p.getY(i)>h*.9&&Math.abs(p.getX(i))<w*.39&&p.getZ(i)>-l*.35&&p.getZ(i)<l*.23){c.setXYZ(i,color.r,color.g,color.b);m.setX(i,0);}c.needsUpdate=true;});
 }
 if(selected.cargo==='rails'){const pickup=s.family==='pickup'||root.userData.vehicleType==='campo',open=ape||pickup||['cantiere','pianale-6'].includes(root.userData.vehicleType),railX=w*(pickup?.41:open?.46:.31);let railY=h;for(const side of [-1,1]){const at=coachSurface(root,[side*railX,h+1,-l*.24],[0,-1,0]);railY=(at?.y||h-.08)+.065;box(root,'alloy','#a0afb3',side*railX,railY,-l*.24,.035,.036,l*.38);for(const z of [-l*.39,-l*.09]){const mount=coachSurface(root,[side*railX,h+1,z],[0,-1,0])?.y||railY-.065;box(root,'alloy','#a0afb3',side*railX,(mount+railY)/2,z,.04,Math.max(.04,railY-mount),.04);}}for(let i=0;i<4;i++)box(root,'alloy','#a0afb3',w*.48,Math.min(railY-.12,.62+i*(open?.12:.25)),-l*.40,.04,.021,.20);}
 if(selected.cargo==='toolbox')for(const side of [-1,1]){const x=side*w*(ape?.32:.43),z=-l*(ape?.31:.12);box(root,'alloy','#838f92',x,.71,z,w*.16,.24,l*.20);box(root,'trim','#39484e',x,.85,z,w*.16,.02,l*.20);}
 if(selected.brakes&&selected.brakes!=='standard')for(const side of [-1,1])for(const z of [-s.wheelbase/2,s.wheelbase/2])box(root,'trim',selected.brakes==='race'?'#b44f36':'#a79d68',side*(bike?.101:ape&&z>0?.089:w*.443),ape?.37:.40,z+.12,.015,.10,.06);
 if(selected.suspension&&selected.suspension!=='standard'){
  const amount=selected.suspension==='raised'?.05:-.035;
  // Shift body vertices only: tyres stay on the road and wheelbase is unchanged.
  root.traverse(o=>{if(!o.isMesh||o.userData.damageDetail)return;const p=o.geometry.attributes.position,mask=o.geometry.attributes.collectorPaint;if(!mask)return;o.geometry=o.geometry.clone();const q=o.geometry.attributes.position;for(let i=0;i<q.count;i++)if(q.getY(i)>.65&&(mask.getX(i)||o.material.userData.coachBucket==='glass'||q.getY(i)>h*.65&&o.material.userData.coachBucket!=='paint'))q.setY(i,p.getY(i)+amount);q.needsUpdate=true;});
 }
 root.userData.dealerBuild={...build,...selected};return compactCoachwork(root);
}
