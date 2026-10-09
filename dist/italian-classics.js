import * as THREE from './vendor/three.module.js';
import {coachMaterial,compactCoachwork,coachSurface,WHEEL_COLOURS} from './car-coachwork.js';

// Original game models inspired by the 1966 Spider and the 1967 33 Stradale.
// The cabin uses separate roof, pillars and glass; the Spider has an open cockpit.
const cube=new THREE.BoxGeometry(),sphere=new THREE.SphereGeometry(1,16,10),disk=new THREE.CylinderGeometry(1,1,1,16),holeDisk=new THREE.CylinderGeometry(1,1,1,8);
export function createItalianClassic(id,s,color=s.color,finish='standard'){
 const spider=s.shape==='spider66',g=new THREE.Group(),w=s.width,l=s.length,h=s.height,r=spider?.285:.29;
 g.userData={collectorCar:id,vehicleType:id,modelRevision:36,wheelCount:4,wheelMounts:[],roadFinish:{wheels:finish}};
 const add=(geo,kind,c,x,y,z,sx=1,sy=1,sz=1,part=0)=>{const o=new THREE.Mesh(geo,coachMaterial(kind,c));o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.userData.coachPaint=kind==='paint';o.userData.optionPart=part;g.add(o);return o;};
 const box=(kind,c,x,y,z,sx,sy,sz,part=0)=>add(cube,kind,c,x,y,z,sx,sy,sz,part);
 const bulb=(kind,c,x,y,z,sx,sy,sz,part=0)=>add(sphere,kind,c,x,y,z,sx,sy,sz,part);
 const poly=(kind,c,points,part=0)=>{const p=[];for(let i=1;i<points.length-1;i++)p.push(...points[0],...points[i],...points[i+1]);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.computeVertexNormals();geo.userData.coachTransient=true;return add(geo,kind,c,0,0,0,1,1,1,part);};
 const sample=(rows,t,column)=>{let i=1;while(i<rows.length-1&&rows[i][0]<t)i++;const a=rows[i-1],b=rows[i],u=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0])));return a[column]+(b[column]-a[column])*u;};
 const rows=spider?[[-.5,.38,.48],[-.46,.68,.65],[-.34,.90,.75],[-.2,.96,.77],[.05,.96,.74],[.25,.95,.76],[.39,.81,.64],[.48,.49,.48],[.5,.30,.43]]:[[-.5,.52,.40],[-.44,.84,.56],[-.28,.98,.65],[-.10,.96,.59],[.13,.94,.58],[.30,.98,.65],[.42,.82,.53],[.49,.51,.32],[.5,.40,.30]];
 const cockpitRear=spider?-.24:-.20,cockpitFront=spider?.14:.13,halfCockpit=w*.325;
 const ts=new Set(Array.from({length:49},(_,i)=>i/48-.5));ts.add(cockpitRear);ts.add(cockpitFront);
 for(const z of [-s.wheelbase/2,s.wheelbase/2])for(let i=0;i<=14;i++)ts.add((z+Math.cos(i*Math.PI/14)*(r+.045))/l);
 const rings=[...ts].filter(t=>t>=-.5&&t<=.5).sort((a,b)=>a-b).map(t=>{
  const half=w*.49*sample(rows,t,1),top=sample(rows,t,2),inside=t>=cockpitRear&&t<=cockpitFront;
  let low=.20;for(const z of [-s.wheelbase/2,s.wheelbase/2]){const d=t*l-z;if(Math.abs(d)<r+.045)low=Math.max(low,r+Math.sqrt((r+.045)**2-d*d));}
  low=Math.min(low,top-(spider?.075:.040));
  // Raised wheel shoulders and a lowered cockpit floor give the 33 its flowing wings.
  const crown=spider?.028:.045,floor=inside?.48:top+crown;
  return [[-half*.94,.20,t*l],[-half,low,t*l],[-half,top-.10,t*l],[-half*.85,top+.01,t*l],[-halfCockpit,top+crown,t*l],[-halfCockpit,floor,t*l],[halfCockpit,floor,t*l],[halfCockpit,top+crown,t*l],[half*.85,top+.01,t*l],[half,top-.10,t*l],[half,low,t*l],[half*.94,.20,t*l]];
 });
 for(let i=1;i<rings.length;i++)for(let j=0;j<12;j++){const k=(j+1)%12;poly('paint',color,[rings[i-1][j],rings[i][j],rings[i][k],rings[i-1][k]]);}
 poly('paint',color,rings[0]);poly('paint',color,[...rings.at(-1)].reverse());
 const seatY=spider?.53:.45,seatZ=-l*.095,backY=spider?.72:.64;
 for(const side of [-1,1]){box('trim','#24272a',side*w*.19,seatY,seatZ,w*.25,.11,.43,5);const back=box('trim','#24272a',side*w*.19,backY,seatZ-.20,w*.25,.40,.10,5);back.rotation.x=-.14;for(let i=-3;i<=3;i++)box('trim','#41403b',side*w*.19+i*.038,backY+.01,seatZ-.143,.012,.30,.012,5);}
 box('trim','#24292d',0,spider?.70:.62,l*(cockpitFront-.012),w*.61,.12,.10);
 const steering=add(new THREE.TorusGeometry(.125,.015,8,20),'alloy',spider?'#805f35':'#343a3d',-w*.19,spider?.80:.72,l*.085);steering.rotation.x=.38;
 box('alloy','#b7bcc0',0,.62,-l*.015,.023,.17,.025);
 const rearRoof=-l*.13,frontRoof=l*.055,windBottom=l*.18,roofY=h-.015,roofHalf=w*.29;
 if(spider){
  const glass=[[-w*.34,.80,windBottom],[w*.34,.80,windBottom],[w*.30,h-.035,l*.085],[-w*.30,h-.035,l*.085]];poly('glass','#344d57',glass);poly('glass','#344d57',[...glass].reverse());
  for(const side of [-1,1]){const post=box('alloy','#c4c8c9',side*w*.32,(h+.77)/2,l*.13,.026,h-.76,.026);post.rotation.x=.37;}
  box('alloy','#c4c8c9',0,h-.025,l*.085,w*.62,.023,.024);box('alloy','#c4c8c9',0,.80,windBottom,w*.68,.025,.025);
  box('trim','#282a2a',0,.80,-l*.26,w*.59,.095,.18); // folded soft top
 }else{
  // A painted domed roof bounded by metal pillars, with four distinct windows.
  for(let i=0;i<8;i++){const x1=(-1+i/4)*roofHalf,x2=(-1+(i+1)/4)*roofHalf,y=x=>roofY-.12*(x/roofHalf)**2;poly('paint',color,[[x1,y(x1),rearRoof],[x1,y(x1),frontRoof],[x2,y(x2),frontRoof],[x2,y(x2),rearRoof]]);}
  poly('glass','#334b55',[[-w*.34,.65,windBottom],[w*.34,.65,windBottom],[roofHalf,roofY-.12,frontRoof],[-roofHalf,roofY-.12,frontRoof]]);
  poly('glass','#334b55',[[-w*.33,.66,-l*.26],[-roofHalf,roofY-.12,rearRoof],[roofHalf,roofY-.12,rearRoof],[w*.33,.66,-l*.26]]);
  for(const side of [-1,1]){const points=[[side*w*.33,.66,-l*.245],[side*w*.33,.64,l*.155],[side*roofHalf,roofY-.12,frontRoof],[side*roofHalf,roofY-.12,rearRoof]];if(side>0)points.reverse();poly('glass','#334b55',points);for(const z of [rearRoof,frontRoof]){const o=box('paint',color,side*w*.309,(.65+roofY-.12)/2,z,.022,roofY-.76,.037);o.rotation.z=side*.15;}box('paint',color,side*w*.335,.65,-l*.04,.024,.030,l*.41);}
  for(let i=0;i<7;i++)box('trim','#293034',0,.68,-l*(.32+i*.014),w*.47,.012,.019);
  for(const side of [-1,1]){box('trim','#263137',side*w*.46,.54,-l*.085,.015,.11,.38);box('alloy','#9eaaad',side*w*.465,.60,-l*.10,.012,.018,.27);}
 }
 for(const side of [-1,1]){
  const x=side*w*(spider?.29:.32),lampY=spider?.55:.60,at=coachSurface(g,[x,lampY,l],[0,0,-1]),front=at?.z||l*.46;
  if(spider){const bezel=add(disk,'alloy','#c3c6c6',x,lampY,front+.014,.090,.026,.090);bezel.rotation.x=Math.PI/2-.20;const lens=add(disk,'glass','#ede4c9',x,lampY,front+.032,.071,.018,.071);lens.rotation.x=Math.PI/2-.20;}
  else{
   // Elliptical covers follow the wing surface; fixed heights buried the lamps.
   const skin=(kind,c,factor,offset)=>{const points=[];for(let i=12;i>=0;i--){const a=i*Math.PI*2/12,px=x+Math.cos(a)*.17*factor,pz=l*.35+Math.sin(a)*.24*factor,y=coachSurface(g,[px,h+1,pz],[0,-1,0])?.y||.75;points.push([px,y+offset,pz]);}const y=coachSurface(g,[x,h+1,l*.35],[0,-1,0])?.y||.75;poly(kind,c,[[x,y+offset,l*.35],...points]);};skin('trim','#343d42',1,.005);skin('glass','#607981',.91,.009);
   for(const z of [l*.32,l*.37]){const y=coachSurface(g,[x,h+1,z],[0,-1,0])?.y||.75,lamp=add(disk,'glass','#e6dfc5',x,y+.020,z,.060,.014,.060);lamp.rotation.x=.35;}
  }
  const rear=coachSurface(g,[side*w*.29,.55,-l],[0,0,1])?.z||-l*.46;
  if(spider)box('glass','#9c3433',side*w*.29,.56,rear-.012,.16,.07,.025);else for(const xOffset of [-.045,.045]){const lamp=add(disk,'glass','#a93b33',side*w*.29+xOffset,.56,rear-.018,.041,.025,.041);lamp.rotation.x=Math.PI/2;}
  box('alloy','#c1c7c9',side*w*.17,.50,front-.01,w*.22,.029,.031);
  box('alloy','#c1c7c9',side*w*.17,.48,rear-.015,w*.22,.031,.029);
  const mirror=bulb('alloy','#c1c7c9',side*w*.472,spider?.84:.73,l*.11,.055,.033,.062,2);box('alloy','#a5adb0',side*w*.452,spider?.80:.69,l*.11,.014,.060,.013);bulb('glass','#314954',mirror.position.x,spider?.842:.732,l*.11-.044,.044,.025,.015);
  box('alloy','#bbc2c4',side*w*.465,spider?.68:.56,-l*.035,.010,.020,.110);
 }
 const grilleZ=coachSurface(g,[0,.46,l],[0,0,-1])?.z||l*.49;
 bulb('trim','#263038',0,.455,grilleZ+.007,w*.22,.055,.02);
 for(let i=-3;i<=3;i++)box('alloy','#b4bec2',i*w*.047,.45,grilleZ+.029,.015,.07,.012,3);
 poly('alloy','#c1c7c9',[[-.055,.54,grilleZ+.030],[0,.44,grilleZ+.034],[.055,.54,grilleZ+.030]],3);
 for(const z of [-s.wheelbase/2,s.wheelbase/2])for(const side of [-1,1]){
  const x=side*w*.427,width=.18,face=x+side*width*.51,alloy=WHEEL_COLOURS[finish]||'#b7bfc2';g.userData.wheelMounts.push({x,y:r,z,r,width,sides:[side]});
  const tyre=add(new THREE.TorusGeometry(.80,.20,8,24),'trim','#191e22',x,r,z,r,r,width/.4);tyre.rotation.y=Math.PI/2;
  const barrel=add(disk,'alloy',alloy,face,r,z,r*.66,.020,r*.66,1);barrel.rotation.z=Math.PI/2;
  for(let i=0;i<(spider?12:5);i++){const a=i*Math.PI*2/(spider?12:5);if(spider){const hole=add(holeDisk,'trim','#30383c',face+side*.018,r+Math.cos(a)*r*.43,z+Math.sin(a)*r*.43,.023,.009,.023);hole.rotation.z=Math.PI/2;}else{const spoke=box('alloy',alloy,face+side*.025,r+Math.cos(a)*r*.33,z+Math.sin(a)*r*.33,.019,r*.55,.034,1);spoke.rotation.x=-a;}}
  const hub=add(disk,'alloy',alloy,face+side*.027,r,z,r*.18,.018,r*.18,1);hub.rotation.z=Math.PI/2;
 }
 g.name=s.name;compactCoachwork(g);
 const bounds=new THREE.Box3().setFromObject(g),size=bounds.getSize(new THREE.Vector3()),cx=(bounds.min.x+bounds.max.x)/2,cz=(bounds.min.z+bounds.max.z)/2,sx=Math.min(1,w/size.x),sy=Math.min(1,h/size.y),sz=Math.min(1,l/size.z);
 for(const o of g.children){o.geometry.translate(-cx,-bounds.min.y,-cz);o.geometry.scale(sx,sy,sz);}
 for(const m of g.userData.wheelMounts){m.x=(m.x-cx)*sx;m.y=(m.y-bounds.min.y)*sy;m.z=(m.z-cz)*sz;m.r*=sy;m.width*=sx;}
 return g;
}
