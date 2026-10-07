import * as THREE from './vendor/three.module.js';

const panelGeometry=new THREE.BoxGeometry(1,1,1);
const wheelGeometry=new THREE.CylinderGeometry(1,1,1,10);
const smokeGeometry=new THREE.SphereGeometry(1,5,4);
const crackGeometry=(()=>{
 const points=[0,0,0,.18,.22,0,.18,.22,0,.43,.37,0,.18,.22,0,-.05,.46,0,.18,.22,0,.3,.03,0,0,0,0,-.28,.28,0,-.28,.28,0,-.42,.09,0,-.28,.28,0,-.12,.48,0];
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));return geometry;
})();
const crackMaterial=new THREE.LineBasicMaterial({color:'#d9eef0',transparent:true,opacity:.72,depthWrite:false});
const dentMaterial=new THREE.MeshBasicMaterial({color:'#302f31'});
const brokenLampMaterial=new THREE.MeshBasicMaterial({color:'#151a1d'});
const bumperMaterial=new THREE.MeshStandardMaterial({color:'#4a4946',roughness:.92});
const hoodMaterial=new THREE.MeshStandardMaterial({color:'#3d3838',roughness:.88});
const tyreMaterial=new THREE.MeshStandardMaterial({color:'#202527',roughness:1});
const smokeMaterials=[.22,.14,.08].map(opacity=>new THREE.MeshBasicMaterial({color:'#4b5051',transparent:true,opacity,depthWrite:false}));

export function damageStage(health=100){return health<18?3:health<42?2:health<72?1:0;}

export function vehiclePerformanceFactor(health=100){
 const value=Math.max(0,Math.min(100,Number.isFinite(health)?health:100));
 if(value>=35)return 1;
 if(value>=15)return .88+(value-15)*.006;
 return .76+value*.008;
}

export function installVehicleDamage(actor){
 if(actor.damageVisual)return actor.damageVisual;
 const {spec,mesh}=actor;if(!spec||!mesh||spec.aircraft||spec.tracked)return null;
 const root=new THREE.Group();root.name='vehicle-damage';root.userData.damageDetail=true;
 const bike=spec.bike||spec.width<1.2;

 // Stage 1: glass star + a visibly dark/broken front lamp. Both are grouped so
 // the damage layer remains one cheap visibility toggle.
 const crack=new THREE.Group();crack.name='damaged-glass';
 const glass=new THREE.LineSegments(crackGeometry,crackMaterial);glass.position.set(0,spec.height*(bike?.78:.73),spec.length*(bike?.22:.28));glass.scale.set(spec.width*(bike?.42:.58),spec.height*(bike?.2:.32),1);glass.rotation.x=bike?0:.72;crack.add(glass);
 const lamp=new THREE.Mesh(panelGeometry,brokenLampMaterial);lamp.position.set(-spec.width*.28,spec.height*(bike?.46:.42),spec.length*.495);lamp.scale.set(spec.width*.16,spec.height*.08,.025);lamp.rotation.z=.08;crack.add(lamp);root.add(crack);

 // Stage 2: panels stop looking like a flat overlay. The bumper hangs, one
 // corner receives a visible dent and a proxy wheel is slightly misaligned.
 const dent=new THREE.Group();dent.name='damaged-body';
 const sideDent=new THREE.Mesh(panelGeometry,dentMaterial);sideDent.position.set(-spec.width*.47,spec.height*(bike?.42:.40),spec.length*.17);sideDent.scale.set(bike?.035:.025,spec.height*(bike?.16:.21),spec.length*(bike?.18:.16));sideDent.rotation.z=.16;dent.add(sideDent);
 const frontBumper=new THREE.Mesh(panelGeometry,bumperMaterial);frontBumper.position.set(0,spec.height*.23,spec.length*.505);frontBumper.scale.set(spec.width*(bike?.32:.74),spec.height*.055,spec.length*.035);frontBumper.rotation.set(.05,0,-.08);dent.add(frontBumper);
 const rearBumper=new THREE.Mesh(panelGeometry,bumperMaterial);rearBumper.position.set(spec.width*.16,spec.height*.22,-spec.length*.505);rearBumper.scale.set(spec.width*(bike?.26:.63),spec.height*.05,spec.length*.032);rearBumper.rotation.set(-.04,.04,.13);dent.add(rearBumper);
 const wheel=new THREE.Mesh(wheelGeometry,tyreMaterial);wheel.position.set(-spec.width*.47,spec.height*.22,spec.length*.30);wheel.scale.set(spec.height*.18,spec.width*.05,spec.height*.18);wheel.rotation.set(0,0,Math.PI/2+.18);dent.add(wheel);root.add(dent);

 const hood=new THREE.Mesh(panelGeometry,hoodMaterial);hood.name='lifted-hood';hood.position.set(0,spec.height*(bike?.53:.48),spec.length*(bike?.13:.31));hood.scale.set(spec.width*(bike?.38:.68),spec.height*.035,spec.length*(bike?.16:.22));hood.rotation.x=-.16;hood.rotation.z=.035;root.add(hood);

 const smoke=new THREE.Group();smoke.name='damage-smoke';for(let i=0;i<3;i++){const puff=new THREE.Mesh(smokeGeometry,smokeMaterials[i]);puff.position.set((i-1)*spec.width*.08,i*spec.height*.11,0);puff.scale.setScalar(spec.height*(.07+i*.02));smoke.add(puff);}smoke.position.set(0,spec.height*(bike?.62:.56),spec.length*(bike?.28:.31));root.add(smoke);
 for(const object of [crack,dent,hood,smoke])object.visible=false;
 const scuff=new THREE.Group();scuff.name='side-scuff';for(let i=0;i<3;i++){const mark=new THREE.Mesh(panelGeometry,bumperMaterial);mark.position.set(0,spec.height*(.34+i*.025),spec.length*(.07-i*.055));mark.scale.set(.012,.018,spec.length*(.22+i*.025));mark.rotation.x=.04;scuff.add(mark);}scuff.visible=false;crack.add(scuff);
 mesh.add(root);actor.damageVisual={root,crack,dent,hood,smoke,scuff,glass,lamp,stage:-1};return actor.damageVisual;
}

export function updateVehicleDamage(actor,health=actor.health,time=0){
 const visual=actor.damageVisual||installVehicleDamage(actor);if(!visual)return 0;
 if(health>=100)actor.contactScuff=null;
 const stage=damageStage(health),detail=!actor.simple,scuffSide=actor.contactScuff?.side||0;
 if(stage!==visual.stage||detail!==visual.detail||scuffSide!==visual.scuffSide){visual.stage=stage;visual.detail=detail;visual.scuffSide=scuffSide;visual.crack.visible=detail&&(stage>=1||!!scuffSide);visual.glass.visible=visual.lamp.visible=stage>=1;visual.scuff.visible=detail&&!!scuffSide;visual.scuff.position.x=scuffSide*actor.spec.width*.478;visual.dent.visible=detail&&stage>=2;visual.hood.visible=detail&&stage>=2;visual.smoke.visible=detail&&stage>=3;}
 if(visual.hood.visible)visual.hood.rotation.x=-.16+Math.sin(time*5+(actor.mesh.id||0))*.012;
 if(visual.smoke.visible){visual.smoke.position.y=actor.spec.height*.56+Math.sin(time*2.2+(actor.mesh.id||0))*.035;visual.smoke.rotation.y=time*.18;}
 if(actor.wreckFire){for(const [i,flame] of actor.wreckFire.children.entries()){flame.scale.y=.75+Math.sin(time*8+i*2)*.22;flame.rotation.z=Math.sin(time*5+i)*.10;}actor.wreckFire.visible=actor.burning&&(time-(actor.wreckBorn||0)<75);}
 return stage;
}

export function recordVehicleScrape(car,normal,yaw=car.yaw){if(!normal||!car.spec||car.spec.aircraft||car.spec.watercraft)return;const side=-Math.sign(normal.x*Math.cos(yaw)-normal.z*Math.sin(yaw));if(side)car.contactScuff={side};}

// The shell remains in the world. Fire is reserved for a catastrophic crash,
// a fuel explosion or a weapon; reaching zero through small impacts is a wreck.
export function markVehicleWreck(actor,time=0,burning=false){
 if(!actor?.mesh)return false;actor.health=0;actor.speed=0;actor.parked=true;actor.crashDisabled=true;
 if(!actor.testingVehicle&&!actor.raceOneRules)actor.permanentlyDestroyed=true;
 actor.mesh.visible=true;actor.burning=!!(actor.burning||burning);actor.wreckBorn??=time;
 updateVehicleDamage(actor,0,time);
 if(actor.burning&&!actor.wreckFire){const fire=new THREE.Group();fire.name='wreck-fire';fire.userData.damageDetail=true;
  for(let i=0;i<5;i++){const material=new THREE.MeshBasicMaterial({color:i%2?'#ffbb3f':'#e94e16',transparent:true,opacity:.82,depthWrite:false}),flame=new THREE.Mesh(new THREE.ConeGeometry(.13,.6,5),material);flame.position.set((i-2)*actor.spec.width*.10,actor.spec.height*.65,actor.spec.length*.25+(i%2)*.10);fire.add(flame);}actor.mesh.add(fire);actor.wreckFire=fire;
  for(const mesh of actor.mesh.children)if(mesh.isMesh&&mesh.geometry?.attributes.collectorPaint){mesh.geometry=mesh.geometry.clone();const colors=mesh.geometry.attributes.color,mask=mesh.geometry.attributes.collectorPaint;for(let i=0;i<mask.count;i++)if(mask.getX(i))colors.setXYZ(i,.07,.075,.08);colors.needsUpdate=true;}
 }
 return true;
}
