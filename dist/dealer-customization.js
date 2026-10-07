import * as THREE from './vendor/three.module.js';
import {coachMaterial,compactCoachwork,coachSurface} from './car-coachwork.js';

// A single catalogue drives compatibility, prices, saved builds and the UI.
export const DEALER_OPTIONS={
 wheels:{label:'Cerchi',values:[['standard','Argento',0],['graphite','Grafite',180],['black','Nero',230],['bronze','Bronzo',340],['white','Bianco',390],['gold','Oro',590]]},
 livery:{label:'Livrea',values:[['plain','Di serie',0],['coach-stripe','Filetto laterale',180],['two-tone','Bicolore',420],['twin-stripe','Doppia striscia',360]]},
 roof:{label:'Tetto',values:[['standard','Colore carrozzeria',0],['black','Nero',240],['ivory','Avorio',240],['blue','Blu',320],['green','Verde',320],['burgundy','Bordeaux',320]]},
 bodykit:{label:'Carrozzeria',values:[['standard','Di serie',0],['touring','Modanature Touring',390],['sport','Splitter e spoiler Sport',790]]},
 exhaust:{label:'Scarico',values:[['standard','Di serie',0],['chrome','Terminale cromato',190],['dual','Doppio terminale',360]]},
 interior:{label:'Selleria',values:[['standard','Di serie',0],['premium','Cuoio e cuciture',490]]},
 suspension:{label:'Assetto',values:[['standard','Di serie',0],['sport','Sport · risposta sterzo +5%',460],['raised','Rialzato · +5 cm',380]]},
 brakes:{label:'Freni',values:[['standard','Di serie',0],['sport','Sport · frenata +12%',390],['race','Performance · frenata +25%',890]]},
 response:{label:'Ripresa',values:[['standard','Di serie',0],['street','Street · accelerazione +10%',450],['sport','Sport · accelerazione +20%',980]]},
 cargo:{label:'Attrezzatura',values:[['standard','Di serie',0],['rails','Barre e scaletta',330],['toolbox','Cassette porta attrezzi',290]]}
};
export const WORKSHOP_OPTIONS={
 tune:{label:'Preparazione officina',section:'Prestazioni',values:[['standard','Di serie',0],['stage1','Stage 1 · +36 km/h',3500],['stage2','Stage 2 · +79 km/h',8000],['stage3','Stage 3 · +130 km/h',16000]]},
 frontGuard:{label:'Protezione anteriore',section:'Sicurezza',values:[['standard','Di serie',0],['reinforced','Traversa rinforzata · +35 vita',1200],['pushbar','Push bar · +75 vita',3200],['heavy','Push bar pesante · +120 vita',6500]]},
 rearGuard:{label:'Protezione posteriore',section:'Sicurezza',values:[['standard','Di serie',0],['reinforced','Paraurti rinforzato · +30 vita',1100],['heavy','Protezione pesante · +70 vita',3000]]},
 tyreGuard:{label:'Protezione gomme',section:'Sicurezza',values:[['standard','Di serie',0],['reinforced','Fianchi rinforzati · +25 vita',1000],['runflat','Run-flat protette · +55 vita',2600]]},
 safetyGlass:{label:'Vetri di sicurezza',section:'Sicurezza',values:[['standard','Di serie',0],['laminated','Laminati · +25 vita',1500],['ballistic','Antiproiettile · +70 vita',4800]]},
 chassis:{label:'Telaio e protezioni laterali',section:'Sicurezza',values:[['standard','Di serie',0],['reinforced','Rinforzato · +50 vita',2500],['armored','Blindato · +110 vita',7000]]},
 skirts:{label:'Minigonne',section:'Estetica',values:[['standard','Di serie',0],['street','Street',650],['wide','Sport larghe',1200]]},
 bumper:{label:'Paraurti estetici',section:'Estetica',values:[['standard','Di serie',0],['street','Street',700],['sport','Sport con prese aria',1500]]},
 spoiler:{label:'Spoiler',section:'Estetica',values:[['standard','Di serie',0],['lip','Labbro posteriore',450],['wing','Alettone con supporti',1300]]},
 arches:{label:'Passaruota',section:'Estetica',values:[['standard','Di serie',0],['sport','Modanature Sport',800]]}
};
const CHROME_VALUES=[['standard','Di serie',0],['polished','Cromo lucido',280],['satin','Cromo satinato',320],['black','Cromo nero',400],['bronze','Bronzo',470]];
Object.assign(DEALER_OPTIONS,{
 paintFinish:{label:'Finitura vernice',values:[['standard','Di serie',0],['metallic','Metallizzata',450],['pearl','Perlata',850],['matte','Opaca',650]]},
 chromeMirrors:{label:'Finitura specchietti laterali',values:CHROME_VALUES},chromeGrille:{label:'Finitura griglia anteriore',values:CHROME_VALUES},chromeExhaust:{label:'Finitura terminale di scarico',values:CHROME_VALUES},
 wheelDesign:{label:'Disegno dei cerchi',values:[['standard','Di serie',0],['mesh','Multirazza',450],['sport','Cinque razze Sport',650]]},
 tyres:{label:'Pneumatici',values:[['standard','Stradali',0],['sport','Sportivi',650],['offroad','Fuoristrada',800]]},
 upholstery:{label:'Colore selleria',values:[['standard','Di serie',0],['tan','Cuoio',350],['red','Rosso',400],['cream','Avorio',450]]},
 steering:{label:'Volante',values:[['standard','Di serie',0],['sport','Sportivo',450]]},
 windscreen:{label:'Cupolino moto',values:[['standard','Di serie',0],['short','Corto',300],['touring','Turismo',550]]},
 saddlebags:{label:'Borse moto',values:[['standard','Di serie',0],['soft','Morbide',450],['hard','Rigide',950]]},
 cabVisor:{label:'Visiera cabina',values:[['standard','Di serie',0],['touring','Visiera Touring',550]]},
 auxiliaryLights:{label:'Fari supplementari',values:[['standard','Di serie',0],['pair','Coppia fari',600]]}
});
export function protectionCapacity(build={}){
 return 100+({reinforced:35,pushbar:75,heavy:120}[build.frontGuard]||0)+({reinforced:30,heavy:70}[build.rearGuard]||0)+({reinforced:25,runflat:55}[build.tyreGuard]||0)+({laminated:25,ballistic:70}[build.safetyGlass]||0)+({reinforced:50,armored:110}[build.chassis]||0);
}
export function dealerCapabilities(spec,{workshop=false}={}){
 const bike=!!spec.bike||spec.width<1.15,work=['work','freight','van'].includes(spec.family)||['truck','ape','portavalori'].includes(spec.vehicleType),open=spec.family==='convertible'||['barchetta','mono'].includes(spec.shape);
 const keys=['wheels','wheelDesign','tyres','paintFinish','chromeMirrors','chromeExhaust',...(!bike?['chromeGrille','steering']:['windscreen','saddlebags']),'upholstery',...(work?['cabVisor','auxiliaryLights']:[]),'livery',...(!bike&&!work&&!open?['roof']:[]),...(!bike&&!work?['bodykit']:[]),...(!work?['exhaust']:[]),'interior',...(!bike?['suspension']:[]),'brakes','response',...(work?['cargo']:[])];
 const all={...DEALER_OPTIONS,...WORKSHOP_OPTIONS};if(workshop)keys.push('tune','frontGuard','rearGuard','tyreGuard','chassis',...(!bike?['safetyGlass','skirts','bumper','spoiler','arches']:[]));
 return Object.fromEntries(keys.map(key=>{let values=all[key].values;if(key==='bodykit'&&!workshop)values=values.filter(v=>v[0]!=='sport');if(key==='tyres'&&!['suv','pickup','work','freight'].includes(spec.family)&&!bike)values=values.filter(v=>v[0]!=='offroad');if(key==='livery'&&(bike||work))values=values.filter(v=>['plain','coach-stripe'].includes(v[0]));if(key==='cargo'&&['cisterna','betoniera','soccorso'].includes(spec.vehicleType))values=values.filter(v=>v[0]!=='rails');if(key==='suspension'&&!['suv','pickup','work','freight','van'].includes(spec.family)&&!['safari','sixwheel'].includes(spec.shape))values=values.filter(v=>v[0]!=='raised');return [key,{...all[key],values}];}));
}
export function normalizeDealerOptions(spec,options={},workshop=true){
 const definitions=dealerCapabilities(spec,{workshop}),selected={},prices={};
 for(const [key,def] of Object.entries(definitions)){const row=def.values.find(v=>v[0]===options[key])||def.values[0];selected[key]=row[0];prices[key]=row[2];}
 return {selected,prices};
}
export function dealerBuildSpec(base,build){
 if(!build)return base;
 const capacity=protectionCapacity(build),tune={stage1:10,stage2:22,stage3:36}[build.tune]||0,top=(Number.isFinite(build.max)?build.max:base.max)+tune;
 const response=build.response==='sport'?1.20:build.response==='street'?1.10:1,brakes=build.brakes==='race'?1.25:build.brakes==='sport'?1.12:1;
 return {...base,max:top,boost:Math.max(base.boost,top*1.1),maxHealth:capacity,armor:(base.armor||1)*100/capacity,accel:base.accel*response*(1+tune/180),brake:base.brake*brakes,steer:base.steer*(build.tyres==='sport'?1.04:1)*(build.suspension==='sport'?1.05:1)};
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
  const x=side*w*(bike?.25:.30),y=bike?.41:.30,rear=coachSurface(root,[x,y,-l],[0,0,1])?.z??-l*.47,z=Math.max(-l*.51,rear-.045);
  const finish={polished:'#dbe4e8',satin:'#9ca9ad',black:'#28333b',bronze:'#aa8555'}[selected.chromeExhaust]||'#aeb9bd';
  const o=add(root,cylinder,'alloy',finish,x,y,z,.057,.13,.057);o.rotation.x=Math.PI/2;
  const cap=add(root,cylinder,'trim','#273039',x,y,z-.055,.043,.012,.043);cap.rotation.x=Math.PI/2;
 }
 if(selected.interior==='premium'){
  // Open cars and motorcycles visibly show their upholstery. Closed cars keep
  // real seat geometry inside the cabin, with the same finish when viewed close.
  const seatZ=ape?.61:work?l*.5-1.50:-l*.07,seatLength=work?.45:l*.13;
  for(const side of bike?[0]:[-1,1]){box(root,'trim','#9b6746',side*w*.20,bike?(root.userData.riderSeat?.y||.88)+.028:h*.51,bike?-l*.07:seatZ,bike?w*.50:w*.21,.055,bike?l*.20:seatLength);if(!bike){const back=box(root,'trim','#9b6746',side*w*.20,h*.64,seatZ-seatLength*.5,w*.22,h*.24,.095);back.rotation.x=-.14;}box(root,'trim','#d8b994',side*w*.20,bike?(root.userData.riderSeat?.y||.88)+.062:h*.54,bike?-l*.07:seatZ,bike?w*.38:w*.16,.008,bike?l*.18:seatLength*.85);}
 }
 surfaceDecoration(root,s,selected.livery);
 if(selected.roof&&selected.roof!=='standard'||selected.livery==='two-tone'){
  const color=new THREE.Color(({black:'#2b343b',ivory:'#dcd5c1',blue:'#315979',green:'#527561',burgundy:'#702e40'}[selected.roof]||'#dcd5c1'));
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
 applyExtraEquipment(root,s,selected);
 root.userData.dealerBuild={...build,...selected};compactCoachwork(root);
 const finish=selected.paintFinish;root.userData.paintFinish=finish;for(const mesh of root.children)if(mesh.isMesh&&mesh.material.userData.coachBucket==='paint'&&finish!=='standard'){mesh.material=mesh.material.clone();mesh.material.roughness=finish==='matte'?.9:finish==='pearl'?.18:.25;mesh.material.metalness=finish==='matte'?.06:finish==='pearl'?.65:.7;mesh.material.userData.privateFinish=true;}
 return root;
}

function applyExtraEquipment(g,s,b){
 const w=s.width,l=s.length,h=s.height,bike=!!s.bike||w<1.15,work=['work','freight','van'].includes(s.family)||l>7,c={polished:'#dbe4e8',satin:'#9ca9ad',black:'#28333b',bronze:'#aa8555'};
 if(b.chromeMirrors!=='standard')for(const side of [-1,1]){const x=side*w*.44,y=h*.7,z=l*.10;box(g,'alloy',c[b.chromeMirrors],x,y,z,.11,.065,.14);}
 if(b.chromeGrille&&b.chromeGrille!=='standard')for(let i=-2;i<=2;i++){const x=i*w*.09,y=h*.36,z=(coachSurface(g,[x,y,l],[0,0,-1])?.z??l*.47)+.013;box(g,'alloy',c[b.chromeGrille],x,y,z,.025,.12,.018);}
 if(b.chromeExhaust!=='standard'&&b.exhaust==='standard'){const x=w*.26,y=.3,rear=coachSurface(g,[x,y,-l],[0,0,1])?.z??-l*.47,z=Math.max(-l*.51,rear-.045);const o=add(g,cylinder,'alloy',c[b.chromeExhaust],x,y,z,.06,.10,.06);o.rotation.x=Math.PI/2;}
 if(b.wheelDesign!=='standard')for(const side of bike?[-1,1]:[-1,1])for(const z of [-s.wheelbase/2,s.wheelbase/2]){
  const r=bike?.30:work?.40:.32,face=side*(bike?.12:w*.46),count=b.wheelDesign==='mesh'?10:5;
  const disc=add(g,cylinder,'trim','#27323a',face,r,z,r*.69,.028,r*.69);disc.rotation.z=Math.PI/2;
  for(let n=0;n<count;n++){const a=n*Math.PI*2/count,o=box(g,'alloy','#b8c4c8',face+side*.023,r+Math.cos(a)*r*.33,z+Math.sin(a)*r*.33,.022,r*.55,b.wheelDesign==='mesh'?.022:.046);o.rotation.x=-a;}
  const hub=add(g,cylinder,'alloy','#d7e0e1',face+side*.032,r,z,r*.15,.035,r*.15);hub.rotation.z=Math.PI/2;
 }
 if(b.tyres==='offroad')for(const side of bike?[0]:[-1,1])for(const z of [-s.wheelbase/2,s.wheelbase/2])for(let n=0;n<14;n++){const a=n*Math.PI*2/14,o=box(g,'trim','#263039',side*(bike?0:w*.46),.34+Math.sin(a)*.32,z+Math.cos(a)*.32,bike?.13:.20,.065,.05);o.rotation.x=-a;}
 if(b.upholstery!=='standard')for(const side of bike?[0]:[-1,1])box(g,'trim',{tan:'#a76e49',red:'#8e3540',cream:'#e3d3b7'}[b.upholstery],side*w*.20,bike?(g.userData.riderSeat?.y||.88)+.04:h*.53,work?l*.5-1.50:-l*.07,bike?w*.44:w*.22,.055,l*.16);
 if(b.steering==='sport'){const o=add(g,new THREE.TorusGeometry(.13,.023,6,12),'trim','#35424b',-w*.20,h*.65,l*.06,1,1,1);o.rotation.x=-.45;}
 if(b.windscreen&&b.windscreen!=='standard'){const o=box(g,'glass','#517784',0,h*.86,l*.19,w*.50,b.windscreen==='touring'?.35:.20,.025);o.rotation.x=-.2;}
 if(b.saddlebags&&b.saddlebags!=='standard')for(const side of [-1,1])box(g,b.saddlebags==='hard'?'paint':'trim','#3d4f55',side*w*.35,h*.51,-l*.23,w*.20,.25,l*.20);
 if(b.cabVisor==='touring')box(g,'trim','#35444c',0,h*.91,l*.36,w*.77,.055,.22);
 if(b.auxiliaryLights==='pair')for(const side of [-1,1])box(g,'alloy','#fff0c8',side*w*.24,h*.8,l*.43,.15,.11,.07);
 const guard=(value,front)=>{if(value==='standard'||!value)return;const z=(front?1:-1)*l*.49,y=h*(work?.28:.30),heavy=['pushbar','heavy'].includes(value),width=w*(bike?.45:.77);box(g,'alloy','#43515a',0,y,z,width,heavy?.11:.07,.075);if(heavy){box(g,'alloy','#43515a',0,y+.26,z,width*.75,.075,.075);for(const side of [-1,1])box(g,'alloy','#43515a',side*width*.30,y+.13,z,.065,.38,.07);}};guard(b.frontGuard,true);guard(b.rearGuard,false);
 if(b.chassis&&b.chassis!=='standard')for(const side of [-1,1])box(g,'alloy','#52616b',side*w*.455,.38,0,.065,b.chassis==='armored'?.20:.08,l*.65);
 if(b.tyreGuard&&b.tyreGuard!=='standard')for(const side of bike?[0]:[-1,1])for(const z of [-s.wheelbase/2,s.wheelbase/2])box(g,'alloy','#65767e',side*(bike?.11:w*.465),.35,z,.02,.18,.18);
 if(b.safetyGlass&&b.safetyGlass!=='standard')for(const side of [-1,1])box(g,'alloy','#687b84',side*w*.37,h*.78,0,.018,.025,l*.32);
 if(b.skirts&&b.skirts!=='standard')for(const side of [-1,1])box(g,'trim','#35414a',side*w*.45,.28,0,b.skirts==='wide'?.09:.04,.075,l*.66);
 if(b.bumper&&b.bumper!=='standard')for(const sign of [-1,1]){box(g,'trim','#36464e',0,.30,sign*l*.483,w*.75,b.bumper==='sport'?.14:.07,.075);if(b.bumper==='sport')for(const side of [-1,1])box(g,'trim','#1d262e',side*w*.24,.39,sign*l*.49,w*.17,.06,.023);}
 if(b.spoiler&&b.spoiler!=='standard'){const z=-l*.40,deck=coachSurface(g,[0,h+1,z],[0,-1,0])?.y||h*.50,y=deck+(b.spoiler==='wing'?.19:.04);box(g,'trim','#35444d',0,y,z,w*.78,.05,.14);if(b.spoiler==='wing')for(const side of [-1,1])box(g,'alloy','#7d8d96',side*w*.25,(deck+y)/2,z,.035,y-deck,.07);}
 if(b.arches==='sport')for(const side of [-1,1])for(const z of [-s.wheelbase/2,s.wheelbase/2])box(g,'trim','#46555c',side*w*.46,.66,z,.035,.045,.51);
}
