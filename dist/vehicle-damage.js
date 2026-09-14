import * as THREE from './vendor/three.module.js';

const panelGeometry=new THREE.BoxGeometry(1,1,1);
const smokeGeometry=new THREE.SphereGeometry(1,5,4);
const crackGeometry=(()=>{
 const points=[0,0,0,.18,.22,0,.18,.22,0,.43,.37,0,.18,.22,0,-.05,.46,0,.18,.22,0,.3,.03,0,0,0,0,-.28,.28,0,-.28,.28,0,-.42,.09,0,-.28,.28,0,-.12,.48,0];
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));return geometry;
})();
const crackMaterial=new THREE.LineBasicMaterial({color:'#d9eef0',transparent:true,opacity:.72,depthWrite:false});
const dentMaterial=new THREE.MeshBasicMaterial({color:'#302f31'});
const hoodMaterial=new THREE.MeshStandardMaterial({color:'#3d3838',roughness:.88});
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
 const crack=new THREE.LineSegments(crackGeometry,crackMaterial);crack.name='damaged-glass';crack.position.set(0,spec.height*(bike?.78:.73),spec.length*(bike?.22:.28));crack.scale.set(spec.width*(bike?.42:.58),spec.height*(bike?.2:.32),1);crack.rotation.x=bike?0:.72;root.add(crack);
 const dent=new THREE.Mesh(panelGeometry,dentMaterial);dent.name='damaged-body';dent.position.set(-spec.width*.47,spec.height*(bike?.42:.40),spec.length*.17);dent.scale.set(bike?.035:.025,spec.height*(bike?.16:.21),spec.length*(bike?.18:.16));dent.rotation.z=.13;root.add(dent);
 const hood=new THREE.Mesh(panelGeometry,hoodMaterial);hood.name='lifted-hood';hood.position.set(0,spec.height*(bike?.53:.48),spec.length*(bike?.13:.31));hood.scale.set(spec.width*(bike?.38:.68),spec.height*.035,spec.length*(bike?.16:.22));hood.rotation.x=-.12;root.add(hood);
 const smoke=new THREE.Group();smoke.name='damage-smoke';for(let i=0;i<3;i++){const puff=new THREE.Mesh(smokeGeometry,smokeMaterials[i]);puff.position.set((i-1)*spec.width*.08,i*spec.height*.11,0);puff.scale.setScalar(spec.height*(.07+i*.02));smoke.add(puff);}smoke.position.set(0,spec.height*(bike?.62:.56),spec.length*(bike?.28:.31));root.add(smoke);
 for(const object of [crack,dent,hood,smoke])object.visible=false;
 mesh.add(root);actor.damageVisual={root,crack,dent,hood,smoke,stage:-1};return actor.damageVisual;
}

export function updateVehicleDamage(actor,health=actor.health,time=0){
 const visual=actor.damageVisual||installVehicleDamage(actor);if(!visual)return 0;
 const stage=damageStage(health),detail=!actor.simple;
 if(stage!==visual.stage||detail!==visual.detail){visual.stage=stage;visual.detail=detail;visual.crack.visible=detail&&stage>=1;visual.dent.visible=detail&&stage>=2;visual.hood.visible=detail&&stage>=2;visual.smoke.visible=detail&&stage>=3;}
 if(visual.smoke.visible){visual.smoke.position.y=actor.spec.height*.56+Math.sin(time*2.2+(actor.mesh.id||0))*.035;visual.smoke.rotation.y=time*.18;}
 return stage;
}
