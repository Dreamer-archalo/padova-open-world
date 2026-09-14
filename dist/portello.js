import * as THREE from './vendor/three.module.js';
import {vehicleFootprint} from './movement.js';
import {box,bake} from './landmarks.js';
import {clamp,dist} from './core.js';

export const PORTELLO_GATE={x:1240.7,z:-365.4,yaw:.17};
export const PORTELLO_BRIDGE={x:1244.8,z:-395.2,yaw:.17,length:39,width:8.2};
export const PORTELLO_ZONE={x:1237,z:-414,radius:175,name:'PORTELLO',subtitle:'QUARTIERE UNIVERSITARIO'};
export const insidePortello=(x,z)=>Math.hypot(x-PORTELLO_ZONE.x,z-PORTELLO_ZONE.z)<PORTELLO_ZONE.radius;

const GATE_CLEAR=6.2,GATE_DEPTH=8.4,GATE_WING=4.6,GATE_OFFSET=GATE_CLEAR/2+GATE_WING/2;
const structure=(terrain,x,z,yaw,width,length,height,kind,color,minY=null)=>{
 const y=minY??terrain.height(x,z);const p=vehicleFootprint(x,z,yaw,width,length),xs=p.map(v=>v[0]),zs=p.map(v=>v[1]);
 return {x,z,y,yaw,w:width,length,h:height,kind,color,p,minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:y};
};

// The OSM footprint is a solid rectangle. The authored landmark replaces it
// with two masonry shoulders plus a high lintel, leaving the arch genuinely
// driveable and walkable instead of faking a doorway on a blocking building.
export function preparePortello(data){
 const gate=data.buildings.find(b=>b.n==='Porta Ognissanti');
 if(gate){gate.authoredLandmark=true;gate.passableGateway=true;gate.name='Porta Portello / Porta Ognissanti';}
 return gate;
}

export function portelloStructures(terrain){
 const g=PORTELLO_GATE,b=PORTELLO_BRIDGE,out=[],base=terrain.height(g.x,g.z);
 for(const side of [-1,1])out.push(structure(terrain,g.x+Math.cos(g.yaw)*side*GATE_OFFSET,g.z-Math.sin(g.yaw)*side*GATE_OFFSET,g.yaw,GATE_WING,GATE_DEPTH,11.2,'portello-gate','#a8664f'));
 // Simplified overhead collision begins well above trucks; the curved visual
 // arch below is hollow and never receives a solid blocking footprint.
 out.push(structure(terrain,g.x,g.z,g.yaw,GATE_CLEAR,GATE_DEPTH,4.4,'portello-lintel','#c39b70',base+5.25));
 for(const side of [-1,1]){
  const x=b.x+Math.cos(b.yaw)*side*(b.width/2+.34),z=b.z-Math.sin(b.yaw)*side*(b.width/2+.34);
  out.push(structure(terrain,x,z,b.yaw,.46,b.length,1.35,'portello-parapet','#c5b18e'));
 }
 return out;
}

function archRing(root,width,height,depth,color,thickness=.88){
 const r=width/2,outer=new THREE.Shape();outer.moveTo(-r,0);outer.lineTo(-r,height-r);outer.absarc(0,height-r,r,Math.PI,0,true);outer.lineTo(r,0);outer.closePath();
 const ir=Math.max(.7,r-thickness),inner=new THREE.Path();inner.moveTo(-ir,.04);inner.lineTo(-ir,height-r);inner.absarc(0,height-r,ir,Math.PI,0,false);inner.lineTo(ir,.04);inner.closePath();outer.holes.push(inner);
 const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(outer,{depth,bevelEnabled:false,curveSegments:18}),new THREE.MeshStandardMaterial({color,roughness:.94}));mesh.position.z=-depth/2;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;
}
function pediment(root,width,height,depth,color,y,z=0){
 const s=new THREE.Shape();s.moveTo(-width/2,0);s.lineTo(width/2,0);s.lineTo(0,height);s.closePath();
 const m=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false}),new THREE.MeshStandardMaterial({color,roughness:.94}));m.position.set(0,y,z-depth/2);m.castShadow=m.receiveShadow=true;root.add(m);return m;
}
function labelBoard(root,text,x,y,z,yaw=0,width=5.8,height=1.15){
 const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;root.add(g);
 box(g,'#172832',0,0,0,width,height,.09);box(g,'#e3b94e',-width*.43,0,.055,.12,height*.82,.025);
 if(typeof document==='undefined')return g;
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;const c=canvas.getContext('2d');c.fillStyle='#172832';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#e3b94e';c.fillRect(0,0,28,canvas.height);c.fillStyle='#f3eee2';c.font='700 70px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,530,99,920);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const p=new THREE.Mesh(new THREE.PlaneGeometry(width*.91,height*.78),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}));p.position.z=.061;g.add(p);return g;
}
function light(root,x,y,z){const mat=new THREE.MeshStandardMaterial({color:'#f4d89c',emissive:'#f1ad45',emissiveIntensity:.75,roughness:.5});const m=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),mat);m.position.set(x,y,z);root.add(m);}
function bike(root,x,z,yaw,color='#486f75',scooter=false){
 const g=new THREE.Group();g.position.set(x,.08,z);g.rotation.y=yaw;root.add(g);const dark='#263235';
 if(scooter){box(g,color,0,.32,0,.16,.10,1.02);box(g,dark,0,.26,-.36,.23,.16,.23);box(g,dark,0,.26,.36,.23,.16,.23);box(g,color,0,.85,.36,.08,1.08,.08);box(g,dark,0,1.35,.34,.54,.07,.08);}
 else{for(const zz of [-.48,.48]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.31,.045,6,12),new THREE.MeshStandardMaterial({color:dark}));wheel.position.set(0,.36,zz);wheel.rotation.y=Math.PI/2;g.add(wheel);}box(g,color,0,.55,0,.08,.08,.82);const frame=box(g,color,0,.65,0,.08,.7,.08);frame.rotation.x=Math.PI/4;box(g,dark,0,.91,-.06,.36,.08,.13);box(g,dark,0,.94,.42,.5,.06,.08);}
 return g;
}
function student(root,x,z,terrain,color='#708fa0',sitting=false,yaw=0){
 const g=new THREE.Group(),y=terrain.height(x,z);g.position.set(x,y,z);g.rotation.y=yaw;root.add(g);
 box(g,color,0,sitting?.93:1.18,0,.44,.62,.28);const head=new THREE.Mesh(new THREE.SphereGeometry(.17,8,6),new THREE.MeshStandardMaterial({color:'#c99f7e',roughness:.9}));head.position.set(0,sitting?1.38:1.68,0);g.add(head);
 if(sitting){for(const side of [-1,1]){const leg=box(g,'#35424b',side*.12,.52,.2,.14,.56,.16);leg.rotation.x=-.55;}}else for(const side of [-1,1])box(g,'#35424b',side*.12,.48,0,.15,.72,.17);
 return g;
}
function tableSet(root,x,z,terrain){const y=terrain.height(x,z);box(root,'#765c40',x,y+.75,z,1.15,.08,1.15);box(root,'#4a5352',x,y+.37,z,.11,.74,.11);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){box(root,'#4a5352',x+dx*.82,y+.43,z+dz*.82,.48,.08,.48);box(root,'#4a5352',x+dx*.82,y+.21,z+dz*.82,.08,.42,.08);}}
function cafe(root,terrain,{x,z,yaw,name,color}){
 const g=new THREE.Group(),y=terrain.height(x,z);g.position.set(x,y,z);g.rotation.y=yaw;g.userData.portelloCafe=name;root.add(g);
 box(g,'#28373b',0,1.25,0,4.4,2.5,2.5);box(g,color,0,2.64,0,4.9,.28,3.0);box(g,'#18272e',0,1.05,1.29,3.7,1.15,.08);box(g,'#d2bd8f',0,.94,1.37,3.2,.11,.54);
 for(const side of [-1,1]){box(g,color,side*1.55,2.2,1.46,1.45,.14,.9).rotation.x=-.22;light(g,side*1.55,2.32,1.5);}labelBoard(g,name,0,2.05,1.58,0,3.5,.68);
 tableSet(root,x+Math.cos(yaw)*4.6,z-Math.sin(yaw)*4.6,terrain);tableSet(root,x+Math.cos(yaw)*6.5,z-Math.sin(yaw)*6.5,terrain);return g;
}
function stairFlight(root,terrain,x,z,yaw,width=9,count=8){
 const g=new THREE.Group(),base=terrain.height(x,z);g.position.set(x,base,z);g.rotation.y=yaw;root.add(g);
 for(let i=0;i<count;i++){const run=i*1.02,rise=i*.16;box(g,'#cbb99a',0,rise+.08,-run,width,.16,1.12);box(g,'#a99679',0,rise+.015,-run-.53,width,.05,.08);}return g;
}

export function createPortelloDetails(terrain){
 const root=new THREE.Group();root.userData.portelloIdentity='PORTELLO / QUARTIERE UNIVERSITARIO';
 const g=PORTELLO_GATE,gate=new THREE.Group(),base=terrain.height(g.x,g.z);gate.position.set(g.x,base,g.z);gate.rotation.y=g.yaw;gate.userData.portelloGate=true;root.add(gate);
 // Compact Venetian gate: one deep, real arch instead of two decorative faces
 // on a huge solid block. The opening remains visible all the way through.
 for(const side of [-1,1]){
  box(gate,'#a8664f',side*GATE_OFFSET,5.6,0,GATE_WING,11.2,GATE_DEPTH);
  box(gate,'#c3a27a',side*GATE_OFFSET,.42,0,GATE_WING+.35,.84,GATE_DEPTH+.35);
  box(gate,'#d2b88f',side*GATE_OFFSET,10.45,0,GATE_WING+.45,.42,GATE_DEPTH+.5);
  box(gate,'#b57b5e',side*GATE_OFFSET,7.0,side*4.24,.64,5.9,.22);
 }
 archRing(gate,GATE_CLEAR+1.8,9.35,GATE_DEPTH,'#caa77b',.92);
 for(const side of [-1,1]){const face=new THREE.Group();face.position.z=side*(GATE_DEPTH/2+.07);face.rotation.y=side<0?Math.PI:0;gate.add(face);archRing(face,GATE_CLEAR+2.15,9.65,.18,'#dec49b',.56);box(face,'#dec49b',0,10.05,0,14.9,.48,.22);}
 box(gate,'#8f5b46',0,10.9,0,15.8,1.35,GATE_DEPTH+.65);box(gate,'#d4b98e',0,11.72,0,14.3,.32,GATE_DEPTH+.85);pediment(gate,12.6,2.2,GATE_DEPTH+.25,'#b97457',11.88);
 box(gate,'#d9c097',0,12.35,GATE_DEPTH/2+.22,2.0,1.35,.16);box(gate,'#7d684f',0,12.35,GATE_DEPTH/2+.32,.75,.68,.08);
 for(const side of [-1,1])light(gate,side*3.85,5.2,GATE_DEPTH/2+.18);

 // Bridge: visible deck, stone curbs, continuous parapets and repeated posts.
 const b=PORTELLO_BRIDGE,bridge=new THREE.Group(),bridgeY=terrain.height(b.x,b.z);bridge.position.set(b.x,bridgeY,b.z);bridge.rotation.y=b.yaw;bridge.userData.portelloBridge=true;root.add(bridge);
 box(bridge,'#a99578',0,-.08,0,b.width+.85,.34,b.length);box(bridge,'#82786d',0,.08,0,b.width-.65,.10,b.length-.5);
 for(const side of [-1,1]){
  box(bridge,'#c7b491',side*(b.width/2+.12),.72,0,.38,1.42,b.length);box(bridge,'#d3c3a4',side*(b.width/2+.12),1.47,0,.52,.18,b.length+.25);
  box(bridge,'#b29e7e',side*(b.width/2-.43),.18,0,.75,.26,b.length-.4);
  for(let z=-b.length/2+1.5;z<b.length/2;z+=4.5)box(bridge,'#d4c4a4',side*(b.width/2+.12),1.42,z,.62,1.7,.62);
 }
 for(const z of [-b.length/2,b.length/2])for(const side of [-1,1]){box(bridge,'#c5ae88',side*(b.width/2+.35),1.1,z,1.05,2.2,1.05);light(bridge,side*(b.width/2+.35),2.35,z);}

 // Venetian-wall shoulders tie Porta Portello into the defensive system rather
 // than leaving it as an isolated prop. They are visual only so existing road
 // and pedestrian collision cannot be accidentally closed.
 const walls=new THREE.Group();walls.userData.venetianWalls=true;root.add(walls);
 for(const side of [-1,1]){const x=g.x+side*17.2,z=g.z+2.0,y=terrain.height(x,z);box(walls,'#9c604d',x,y+2.05,z,22.5,4.1,2.4);box(walls,'#c29a70',x,y+4.18,z,23.1,.22,2.75);for(let dx=-9;dx<=9;dx+=4.5)box(walls,'#8c5545',x+dx,y+4.65,z,.65,.9,2.55);}

 // Retaining walls make both canal banks read as actual embankments.
 const banks=new THREE.Group();banks.userData.portelloBanks=true;root.add(banks);
 for(const bankZ of [-420.5,-448.5])for(const x of [1192,1226,1260,1294]){const top=terrain.height(x,bankZ),h=3.0;box(banks,'#958873',x,top-h/2+.15,bankZ,32,h,.72);box(banks,'#c2b08f',x,top+.22,bankZ,32.3,.24,.92);}

 // Wide stair flights on both banks: the terrain remains the walkable surface,
 // while the stone treads make the access visually obvious from the bridge.
 const steps=new THREE.Group();steps.userData.portelloSteps=true;root.add(steps);
 stairFlight(steps,terrain,1212,-418.8,0,9.5,8);stairFlight(steps,terrain,1271,-418.8,0,9.5,8);stairFlight(steps,terrain,1212,-450.0,Math.PI,9.5,8);stairFlight(steps,terrain,1271,-450.0,Math.PI,9.5,8);

 // Student waterfront: cheap furniture, bikes, scooters, bars and groups. The
 // names are original and intentionally generic, not real protected venues.
 const campus=new THREE.Group();campus.userData.portelloCampus=true;root.add(campus);
 for(const [x,z] of [[1206,-426],[1220,-429],[1266,-428],[1280,-424],[1203,-454],[1266,-454]]){const y=terrain.height(x,z);box(campus,'#705a42',x,y+.43,z,2.2,.12,.7);for(const side of [-1,1])box(campus,'#4d5552',x+side*.78,y+.2,z,.10,.4,.55);}
 for(const [i,p] of [[0,[1205,-432,.2]],[1,[1208,-434,.2]],[2,[1263,-435,.1]],[3,[1266,-437,.1]],[4,[1197,-452,.2]],[5,[1200,-454,.2]],[6,[1280,-445,.1]],[7,[1283,-447,.1]]])bike(campus,p[0],p[1],p[2],i%2?'#c17b51':'#527b82',i>=5);
 const studentColors=['#708fa0','#b96f58','#d1ae65','#657d66','#826f9a','#b38452'];let si=0;
 for(const [x,z,sitting,yaw] of [[1205,-425,true,.2],[1208,-425,true,-.2],[1218,-432,false,.7],[1221,-433,false,-.4],[1258,-431,true,.2],[1261,-431,true,-.2],[1273,-426,false,.4],[1276,-427,false,-.5],[1204,-451,false,.1],[1210,-453,true,.1],[1265,-452,false,-.2],[1271,-454,true,.1],[1234,-418,false,.6],[1248,-419,false,-.6]])student(campus,x,z,terrain,studentColors[si++%studentColors.length],sitting,yaw);
 cafe(campus,terrain,{x:1188,z:-426,yaw:Math.PI/2,name:'NAVIGLIO',color:'#d7aa55'});cafe(campus,terrain,{x:1290,z:-426,yaw:-Math.PI/2,name:'PORTELLO 21',color:'#b9654d'});cafe(campus,terrain,{x:1194,z:-454,yaw:Math.PI/2,name:'SOTTOPORTELLO',color:'#5d8380'});

 // Strong wayfinding: arriving players should immediately read the university
 // identity even before opening the map.
 const signs=new THREE.Group();signs.userData.portelloWayfinding=true;root.add(signs);
 labelBoard(signs,'PORTELLO · UNIVERSITÀ',1224,terrain.height(1224,-351)+2.45,-351,g.yaw,7.2,1.25);
 labelBoard(signs,'PORTELLO · NAVIGLI',1272,terrain.height(1272,-442)+2.2,-442,-Math.PI/2,6.2,1.1);

 bake(steps);bake(walls);bake(banks);return root;
}

export const MICROMOBILITY_ROUTES=[
 {kind:'bike',points:[[1100,-447],[1141,-439],[1195,-428],[1236,-421],[1249,-416],[1260,-447],[1276,-487],[1288,-501],[1264,-493],[1226,-501],[1206,-472],[1169,-466],[1142,-472]]},
 {kind:'bike-basket',points:[[1060,-479],[1108,-490],[1146,-490],[1155,-507],[1160,-533],[1127,-540],[1115,-489],[1102,-461]]},
 {kind:'scooter',points:[[1229,-414],[1234,-413],[1243,-403],[1241,-389],[1242,-375],[1239,-356],[1217,-358],[1165,-368],[1098,-383],[1095,-448],[1141,-439],[1212,-417]]}
];

export const micromobilityCount=quality=>({hyper:2,low:4,medium:6,high:8}[quality]??4);

export function createMicromobilityActor(index,terrain){
 const route=MICROMOBILITY_ROUTES[index%MICROMOBILITY_ROUTES.length],root=new THREE.Group();bike(root,0,0,0,index%2?'#c87d53':'#4d7680',route.kind==='scooter');
 const rider=new THREE.Group(),shirt=new THREE.MeshStandardMaterial({color:['#708fa0','#b96f58','#d1ae65','#657d66'][index%4]});
 box(rider,shirt.color,0,1.35,0,.46,.62,.3);box(rider,'#c99f7e',0,1.82,0,.32,.34,.3);for(const side of [-1,1])box(rider,'#39454a',side*.13,.73,0,.16,.72,.2);root.add(rider);
 const p=route.points[index%route.points.length];root.position.set(p[0],terrain.height(...p),p[1]);return {mesh:root,route,index:index%route.points.length,x:p[0],z:p[1],yaw:0,speed:0,seed:index,kind:route.kind};
}

export function stepMicromobility(actor,dt,terrain,obstacles=[]){
 const points=actor.route.points,target=points[(actor.index+1)%points.length],dx=target[0]-actor.x,dz=target[1]-actor.z,d=Math.hypot(dx,dz),wantedYaw=Math.atan2(dx,dz),turn=Math.atan2(Math.sin(wantedYaw-actor.yaw),Math.cos(wantedYaw-actor.yaw));
 if(d<2.2)actor.index=(actor.index+1)%points.length;
 const blocked=obstacles.some(o=>o.mesh?.visible&&dist(actor,o)<2.3),goal=blocked?0:actor.kind==='scooter'?4.3:3.2;
 actor.speed+=clamp(goal-actor.speed,-3.5*dt,2.2*dt);actor.yaw+=clamp(turn,-2.4*dt,2.4*dt);actor.x+=Math.sin(actor.yaw)*actor.speed*dt;actor.z+=Math.cos(actor.yaw)*actor.speed*dt;actor.y=terrain.height(actor.x,actor.z,actor.y);
 actor.mesh.position.set(actor.x,actor.y,actor.z);actor.mesh.rotation.y=actor.yaw;return actor;
}
